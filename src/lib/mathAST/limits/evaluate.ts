/**
 * Limit Evaluation
 *
 * Main entry point for evaluating limits symbolically.
 * Integrates multiple strategies:
 * - Known limits matching
 * - Direct substitution
 * - L'Hôpital's rule for indeterminate forms
 * - Algebraic manipulation (factorization, rationalization)
 * - Squeeze theorem
 * - One-sided limit analysis
 *
 * @module mathAST/limits/evaluate
 */

import type { MathNode, LimitNode } from '../types';
import type {
	LimitResult,
	LimitOptions,
	LimitDirection,
	LimitStatus,
	IndeterminateForm,
	LimitRule,
	OneSidedLimitResult
} from './types';
import { LimitError } from './types';
import {
	isLimit,
	isNumber,
	isInfinity,
	isSuperscript,
	isAddition,
	isSubtraction,
	isOpposite,
	isFunction,
	isDelimiter,
	isDivision,
	isMultiplication
} from '../guards';
import {
	divide,
	multiply,
	subtract,
	positiveInfinity,
	negativeInfinity,
	number,
	opposite
} from '../factory';
import { findNodes } from '../transforms';
import { flattenSumShallow, flattenProductShallow, unflattenProduct } from '../flatten';
import { isEulerBase } from '../differentiation/rules';
import { expandEulerPowers } from '../normal/rules/euler-power';
import { expandFunctionPowers } from '../common/function-power';
import { matchKnownLimit, getKnownLimitValue, structurallyEqual } from './known-limits';
import { LimitStepRecorderImpl } from './step-recorder';
import { containsVariable } from '../common/contains-variable';
import { detectIndeterminateForm } from './indeterminate';
import { applyLhopital, isLhopitalApplicable } from './lhopital';
import { tryAlgebraicSimplification, type AlgebraicResult } from './algebraic';
import { trySqueeze } from './squeeze';
import { evaluateOneSidedLimits, needsOneSidedAnalysis, recordOneSidedSteps } from './one-sided';
import { tryCompositionLimit } from './composition';
import { tryPiecewiseFunctionLimit, containsPiecewiseFunction } from './piecewise';
import {
	limitByGeneralizedDegree,
	involvesFractionalPower,
	exactConstantNode,
	exactConstantRational
} from './generalized-degree';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { isNegative, absRational, mulRational, negRational } from '../normal/rational';
import { rewriteIndeterminateSum } from './sum-reduction';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { numericNode } from '../common/numeric';
import { computeDomain } from '../domain/compute';
import { containsValue } from '../domain/algebra';
import {
	tryEvaluateLimitExact,
	resultToFiniteNode,
	resultToNode,
	isIndeterminateResult,
	isInfinityResult
} from './exact-evaluation';
import { getNumericValue, ZERO_TOLERANCE } from '../common';

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<LimitOptions> = {
	verbosity: 'summarized',
	maxLhopitalIterations: 5,
	allowNumeric: false,
	timeout: 5000
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Substitute a value for a variable in an expression.
 * Delegates to the eval module's substitute function.
 */
function substituteValue(expr: MathNode, varName: string, value: MathNode): MathNode {
	return substitute(expr, { [varName]: value });
}

// =============================================================================
// Domain Validation
// =============================================================================

/**
 * French pedagogical messages for domain issues.
 */
const DOMAIN_MESSAGES = {
	'approach-outside-domain':
		"Le point d'approche n'est pas dans le domaine de definition de l'expression",
	'left-undefined': "La fonction n'est pas definie a gauche du point d'approche",
	'right-undefined': "La fonction n'est pas definie a droite du point d'approche",
	'both-undefined': "La fonction n'est pas definie au voisinage du point d'approche"
} as const;

/**
 * Result of domain validation.
 */
interface DomainValidation {
	readonly valid: boolean;
	readonly leftDefined: boolean;
	readonly rightDefined: boolean;
	readonly message?: string;
}

/**
 * Validate that the approach point is accessible from the domain.
 *
 * Returns information about whether the limit can be evaluated from
 * the left, right, or both sides based on the expression's domain.
 */
function validateApproachInDomain(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): DomainValidation {
	// Skip validation for infinity approach (handled differently)
	if (isInfinity(approach)) {
		return { valid: true, leftDefined: true, rightDefined: true };
	}

	const approachVal = getNumericValue(approach);
	if (approachVal === null) {
		return { valid: true, leftDefined: true, rightDefined: true };
	}

	try {
		const { domain } = computeDomain(expr, varName);
		// Small offset to check domain membership near the approach point
		// We check at approach ± epsilon to determine left/right accessibility
		const epsilon = ZERO_TOLERANCE;

		const leftDefined = containsValue(domain, approachVal - epsilon);
		const rightDefined = containsValue(domain, approachVal + epsilon);

		// Check based on direction
		if (direction === 'left' && !leftDefined) {
			return {
				valid: false,
				leftDefined,
				rightDefined,
				message: DOMAIN_MESSAGES['left-undefined']
			};
		}
		if (direction === 'right' && !rightDefined) {
			return {
				valid: false,
				leftDefined,
				rightDefined,
				message: DOMAIN_MESSAGES['right-undefined']
			};
		}
		if (direction === 'both' && !leftDefined && !rightDefined) {
			return {
				valid: false,
				leftDefined,
				rightDefined,
				message: DOMAIN_MESSAGES['both-undefined']
			};
		}

		return { valid: true, leftDefined, rightDefined };
	} catch {
		// If domain computation fails, assume valid (conservative)
		return { valid: true, leftDefined: true, rightDefined: true };
	}
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluate a limit expression.
 *
 * Applies strategies in order:
 * 1. Known limits matching
 * 2. Direct substitution
 * 3. L'Hôpital's rule (for 0/0, ∞/∞)
 * 4. Algebraic simplification (factoring, rationalization, dominant term)
 * 5. Squeeze theorem
 * 6. One-sided limit analysis
 *
 * @param expr - The expression or LimitNode to evaluate
 * @param variable - The variable approaching the limit (optional if expr is LimitNode)
 * @param approach - The point being approached (optional if expr is LimitNode)
 * @param direction - Direction of approach (default: 'both')
 * @param options - Evaluation options
 * @returns The limit result with value and steps
 */
export function evaluateLimit(
	expr: MathNode | LimitNode,
	variable?: string,
	approach?: MathNode,
	direction: LimitDirection = 'both',
	options: LimitOptions = {}
): LimitResult {
	const result = evaluateLimitExactForm(expr, variable, approach, direction, options);
	const expression = isLimit(expr) ? expr.expression : expr;
	return writeLikeInput(result, expression);
}

/**
 * Écriture de la limite selon l'énoncé (décision de David, 2026-10-06) :
 * entrée écrite en décimaux → limite exacte en décimal (0.75), si son écriture
 * décimale est finie ; sinon, et sans décimal dans l'entrée, fraction exacte.
 */
function writeLikeInput(result: LimitResult, expression: MathNode): LimitResult {
	if (result.status !== 'exact' || result.value === null) return result;
	if (isInfinity(result.value) || isNumber(result.value)) return result;
	if (!hasDecimalLiteral(expression)) return result;
	const value = exactConstantRational(result.value);
	if (value === null) return result;
	const text = decimalString(value);
	if (text === null) return result;
	const magnitude = number(text);
	return { ...result, value: isNegative(value) ? opposite(magnitude) : magnitude };
}

/** Calcul de la limite ; valeur exacte en entier ou fraction réduite. */
function evaluateLimitExactForm(
	expr: MathNode | LimitNode,
	variable?: string,
	approach?: MathNode,
	direction: LimitDirection = 'both',
	options: LimitOptions = {}
): LimitResult {
	const opts: Required<LimitOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new LimitStepRecorderImpl();

	// Extract info from LimitNode if provided
	let expression: MathNode;
	let varName: string;
	let approachPoint: MathNode;
	let dir: LimitDirection;

	if (isLimit(expr)) {
		expression = expr.expression;
		varName = expr.variable;
		approachPoint = expr.approach;
		dir = expr.direction;
	} else {
		if (!variable || !approach) {
			throw new LimitError(
				'Variable and approach point required when expression is not a LimitNode',
				'INVALID_VARIABLE'
			);
		}
		expression = expr;
		varName = variable;
		approachPoint = approach;
		dir = direction;
	}

	// `\cos^{-1}(x)` est la réciproque : la limite se calcule sur `arccos(x)`
	// (la substitution directe rendait cos(0) = 1). `\sin^2(x)` → `\sin(x)^2`.
	expression = expandFunctionPowers(expression);

	// Validate domain accessibility
	const domainValidation = validateApproachInDomain(expression, varName, approachPoint, dir);
	if (!domainValidation.valid) {
		return createResult(
			null,
			varName,
			approachPoint,
			dir,
			'does-not-exist',
			'none',
			'direct-substitution',
			recorder,
			opts,
			domainValidation.message
		);
	}

	// Verify variable is used in expression
	if (!containsVariable(expression, varName)) {
		// Constant expression: evaluate numerically (e.g., ln(e) → 1)
		let evaluatedExpr = expression;
		// Constante rationnelle (2/3) : valeur exacte, pas 0.666666666666667
		const exactConstant = isNumber(expression) ? null : exactConstantNode(expression);
		if (exactConstant !== null) {
			evaluatedExpr = exactConstant;
		} else if (!isNumber(expression) && !isInfinity(expression)) {
			try {
				const numValue = evaluateNodeToApproximatedNumber(expression);
				if (Number.isFinite(numValue)) {
					// Convert to integer if it's a whole number
					const intValue = Math.round(numValue);
					evaluatedExpr =
						Math.abs(numValue - intValue) < ZERO_TOLERANCE
							? numericNode(intValue)
							: numericNode(numValue.toPrecision(15));
				}
			} catch {
				// If numeric evaluation fails, return the expression as-is
			}
		}
		return createResult(
			evaluatedExpr,
			varName,
			approachPoint,
			dir,
			'exact',
			'none',
			'direct-substitution',
			recorder,
			opts
		);
	}

	// Strategy 1: Try known limits first
	const knownLimit = matchKnownLimit(expression, approachPoint, varName, dir);
	if (knownLimit) {
		const limitValue = getKnownLimitValue(knownLimit, varName);
		recorder.recordStepByRule(
			'known-limit',
			expression,
			limitValue,
			'summarized',
			undefined,
			knownLimit.descriptionFr
		);
		return createResult(
			limitValue,
			varName,
			approachPoint,
			dir,
			'exact',
			'none',
			'known-limit',
			recorder,
			opts
		);
	}

	// Strategy 1.5: Try piecewise function limits (floor, ceil, sign)
	// Must be before direct substitution to handle direction correctly
	if (!isInfinity(approachPoint) && containsPiecewiseFunction(expression)) {
		const piecewiseResult = tryPiecewiseFunctionLimit(
			expression,
			varName,
			approachPoint,
			dir,
			recorder
		);
		if (piecewiseResult.success && piecewiseResult.value) {
			return createResult(
				piecewiseResult.value,
				varName,
				approachPoint,
				dir,
				'exact',
				'none',
				piecewiseResult.technique,
				recorder,
				opts
			);
		}
	}

	// Strategy 2: Try direct substitution
	if (!isInfinity(approachPoint)) {
		const directResult = tryDirectSubstitution(expression, varName, approachPoint, dir, recorder);
		if (directResult !== null) {
			return createResult(
				directResult,
				varName,
				approachPoint,
				dir,
				isInfinity(directResult) ? 'infinite' : 'exact',
				'none',
				'direct-substitution',
				recorder,
				opts
			);
		}
	}

	// Strategy 2.5: Try composition limits (for infinity, function compositions, divisions by zero)
	const compositionResult = tryCompositionLimit(expression, varName, approachPoint, dir, recorder);
	if (compositionResult.success && compositionResult.value) {
		return createResult(
			compositionResult.value,
			varName,
			approachPoint,
			dir,
			isInfinity(compositionResult.value) ? 'infinite' : 'exact',
			'none',
			compositionResult.technique ?? 'composition',
			recorder,
			opts
		);
	}

	// Stratégie 2.55 : facteur constant, lim k·f = k·lim f. La règle du produit
	// de la composition ne combine que des limites infinies ou nulles : un
	// facteur constant devant une forme que seuls le terme dominant ou
	// L'Hôpital lèvent n'était jamais réduit (2·(x²/(3x²+1)) « non supportée »
	// dans l'atelier, alors que x²/(3x²+1) → 1/3).
	const constantFactor = tryConstantFactor(expression, varName, approachPoint, dir, options);
	if (constantFactor !== null) {
		recorder.recordStepByRule(
			'product',
			expression,
			constantFactor.value,
			'summarized',
			approachPoint,
			'Limite d’un produit par une constante : lim k·f = k·lim f'
		);
		return createResult(
			constantFactor.value,
			varName,
			approachPoint,
			dir,
			isInfinity(constantFactor.value) ? 'infinite' : 'exact',
			'none',
			'product',
			recorder,
			opts
		);
	}

	// Stratégie 2.56 : produit de fonctions non constantes, par les seuls cas
	// sûrs (fini × fini, fini non nul × ∞, ∞ × ∞). La forme 0 × ∞ n'est
	// jamais tranchée ici : réécrite en un seul quotient si un facteur en est
	// un, sinon laissée aux stratégies suivantes (croissances comparées…).
	const productResult = tryProductOfLimits(expression, varName, approachPoint, dir, options);
	if (productResult !== null) {
		recorder.recordStepByRule(
			productResult.technique,
			expression,
			productResult.value,
			'summarized',
			approachPoint,
			productResult.description
		);
		return createResult(
			productResult.value,
			varName,
			approachPoint,
			dir,
			isInfinity(productResult.value) ? 'infinite' : 'exact',
			productResult.form,
			productResult.technique,
			recorder,
			opts
		);
	}

	// Strategy 2.6: somme ou différence en ±∞, limite terme à terme ; la forme
	// ∞ − ∞ est levée en factorisant par le terme dominant (croissances
	// comparées, via les limites de référence du quotient).
	if (isInfinity(approachPoint)) {
		const sumResult = trySumByDominantTerm(expression, varName, approachPoint, dir, options);
		if (sumResult !== null) {
			recorder.recordStepByRule(
				'infinity-analysis',
				expression,
				sumResult.value,
				'summarized',
				approachPoint,
				sumResult.description
			);
			return createResult(
				sumResult.value,
				varName,
				approachPoint,
				dir,
				'infinite',
				sumResult.form,
				'infinity-analysis',
				recorder,
				opts
			);
		}
	}

	// Stratégie 2.7 : racines et puissances non entières en ±∞ — terme dominant
	// c·x^d (degrés généralisés), limite EXACTE : x/√x = √x → +∞. L'Hôpital
	// n'y concluait que par une évaluation numérique (« 200000 »).
	if (isInfinity(approachPoint) && involvesFractionalPower(expression)) {
		const degreeLimit = limitByGeneralizedDegree(expression, varName, approachPoint);
		if (degreeLimit !== null) {
			recorder.recordStepByRule(
				'infinity-analysis',
				expression,
				degreeLimit,
				'summarized',
				approachPoint,
				'Terme dominant (degrés généralisés)'
			);
			return createResult(
				degreeLimit,
				varName,
				approachPoint,
				dir,
				isInfinity(degreeLimit) ? 'infinite' : 'exact',
				'none',
				'infinity-analysis',
				recorder,
				opts
			);
		}
	}

	// Stratégie 2.8 : somme ∞ − ∞ que le terme dominant ne lève pas (termes
	// dominants qui s'annulent) — conjugué, ou même dénominateur et développement.
	if (isInfinity(approachPoint)) {
		const rewritten = tryRewrittenSum(expression, varName, approachPoint, dir, options);
		if (rewritten !== null) {
			recorder.recordStepByRule(
				rewritten.technique,
				expression,
				rewritten.rewritten,
				'summarized',
				approachPoint,
				rewritten.description
			);
			return createResult(
				rewritten.value,
				varName,
				approachPoint,
				dir,
				isInfinity(rewritten.value) ? 'infinite' : 'exact',
				'∞-∞',
				rewritten.technique,
				recorder,
				opts
			);
		}
	}

	// Detect indeterminate form for subsequent strategies
	const indeterminateForm = detectIndeterminateForm(expression, varName, approachPoint, dir);

	// Valeur approchée de L'Hôpital (repli numérique) : gardée pour le cas où
	// aucune autre stratégie ne conclut, et alors rendue 'approximate'.
	let approximateValue: MathNode | null = null;

	// Strategy 3: Try L'Hôpital's rule for 0/0 or ∞/∞
	if (isLhopitalApplicable(expression, varName, approachPoint, dir)) {
		const lhopitalResult = applyLhopital(expression, varName, approachPoint, dir, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value && lhopitalResult.approximate) {
			approximateValue = lhopitalResult.value;
		} else if (lhopitalResult.applicable && lhopitalResult.value) {
			return createResult(
				lhopitalResult.value,
				varName,
				approachPoint,
				dir,
				'exact',
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
		const afterLhopital = limitOfLhopitalQuotient(
			lhopitalResult,
			varName,
			approachPoint,
			dir,
			options
		);
		if (afterLhopital !== null) {
			return createResult(
				afterLhopital.value,
				varName,
				approachPoint,
				dir,
				afterLhopital.status,
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
	}

	// Strategy 4: Try algebraic simplification
	const algebraicResult = tryAlgebraicSimplification(
		expression,
		varName,
		approachPoint,
		dir,
		recorder
	);
	if (algebraicResult.success && algebraicResult.simplified) {
		// If algebraic simplification gave us a direct answer
		if (isNumber(algebraicResult.simplified) || isInfinity(algebraicResult.simplified)) {
			return createResult(
				algebraicResult.simplified,
				varName,
				approachPoint,
				dir,
				isInfinity(algebraicResult.simplified) ? 'infinite' : 'exact',
				indeterminateForm,
				algebraicResult.technique === 'dominant-term'
					? 'infinity-analysis'
					: 'algebraic-simplification',
				recorder,
				opts
			);
		}

		// Valeur absolue levée d'un côté : la limite de l'expression sans |·|
		// est celle du moteur complet (|x|/x² en 0⁺ → x/x² → +∞)
		const absFree = limitOfAbsFreeExpression(algebraicResult, varName, approachPoint, dir, options);
		if (absFree !== null) {
			return createResult(
				absFree.value,
				varName,
				approachPoint,
				dir,
				absFree.status,
				indeterminateForm,
				'algebraic-simplification',
				recorder,
				opts
			);
		}

		// Otherwise, try to evaluate the simplified expression
		const simplifiedResult = tryDirectSubstitution(
			algebraicResult.simplified,
			varName,
			approachPoint,
			dir,
			recorder
		);
		if (simplifiedResult !== null) {
			return createResult(
				simplifiedResult,
				varName,
				approachPoint,
				dir,
				'exact',
				indeterminateForm,
				algebraicResult.technique === 'factorization' ? 'factorization' : 'rationalization',
				recorder,
				opts
			);
		}
	}

	// Strategy 5: Try squeeze theorem
	const squeezeResult = trySqueeze(expression, varName, approachPoint, dir, recorder);
	if (squeezeResult.applicable && squeezeResult.value) {
		return createResult(
			squeezeResult.value,
			varName,
			approachPoint,
			dir,
			'exact',
			indeterminateForm,
			'squeeze',
			recorder,
			opts
		);
	}

	// Strategy 6: For 'both' direction, try one-sided analysis
	if (dir === 'both' && needsOneSidedAnalysis(expression, varName, approachPoint)) {
		const oneSided = evaluateOneSidedLimits(
			(e, v, a, d, o) => evaluateLimitInternal(e, v, a, d, o),
			expression,
			varName,
			approachPoint,
			opts
		);

		recordOneSidedSteps(oneSided, expression, varName, approachPoint, recorder);

		if (oneSided.twoSidedExists && oneSided.left?.value) {
			return createResult(
				oneSided.left.value,
				varName,
				approachPoint,
				dir,
				oneSided.left.status,
				indeterminateForm,
				'one-sided',
				recorder,
				opts
			);
		}

		// Un côté seulement approché : rien ne prouve que les limites diffèrent
		const approximateSide =
			oneSided.left?.status === 'approximate' || oneSided.right?.status === 'approximate';
		if (!oneSided.twoSidedExists && !approximateSide) {
			return createResult(
				null,
				varName,
				approachPoint,
				dir,
				'does-not-exist',
				indeterminateForm,
				'one-sided',
				recorder,
				opts,
				'Les limites à gauche et à droite sont différentes'
			);
		}
	}

	// Stratégie 7 : `e^u` relu comme `exp(u)`. Les règles du moteur — limites
	// de référence, croissances comparées, composition — ne connaissent que la
	// fonction `exp` ; la puissance de la base d'Euler (constante du parseur
	// custom, lettre `e` du parseur LaTeX) passait à côté : `x e^x` en −∞
	// sortait « non supportée ». On ne relit qu'EN DERNIER RECOURS, pour ne
	// rien changer à ce qui aboutissait déjà (une valeur `e` ne devient pas
	// `exp(1)`). Pas de boucle : la relecture ne contient plus de `e^u`.
	if (varName !== 'e' && containsEulerPower(expression)) {
		return evaluateLimit(expandEulerPowers(expression), varName, approachPoint, dir, options);
	}

	// Seule une valeur approchée a été trouvée : rendue comme telle, jamais 'exact'
	if (approximateValue !== null) {
		return createResult(
			approximateValue,
			varName,
			approachPoint,
			dir,
			'approximate',
			indeterminateForm,
			'lhopital',
			recorder,
			opts,
			"Valeur approchée (repli numérique) : la limite n'est pas démontrée"
		);
	}

	// No strategy worked
	return createResult(
		null,
		varName,
		approachPoint,
		dir,
		'unsupported',
		indeterminateForm,
		'direct-substitution',
		recorder,
		opts,
		'Limite non supportée avec les techniques actuelles'
	);
}

// =============================================================================
// Produit par une constante
// =============================================================================

/**
 * Sépare `±k·f` en facteur constant k (sans la variable) et facteur variable f.
 * Le signe de tête et les parenthèses comptent dans k : −(f) = (−1)·f. Null
 * s'il n'y a aucun facteur constant ou aucun facteur variable.
 *
 * ⚠️ `flattenProductShallow` s'arrête aux parenthèses : dans 2·(x·3), le 3
 * reste dans f, et c'est la récursion sur f qui le sortira.
 */
function splitConstantFactor(
	expression: MathNode,
	varName: string
): { constant: MathNode; rest: MathNode } | null {
	const { sign, node } = peelSign(expression);
	const factors = isMultiplication(node) ? flattenProductShallow(node) : [];
	const constants = factors.filter((f) => !containsVariable(f.factor, varName));
	const variables = factors.filter((f) => containsVariable(f.factor, varName));
	let rest = variables.length > 0 ? unflattenProduct(variables) : node;
	const base = constants.length > 0 ? unflattenProduct(constants) : null;
	if (rest === null) return null;
	if (base === null && sign === 1) return null;
	// Les parenthèses autour de f ne se voient pas dans sa limite : le moteur,
	// lui, ne les traverse pas (2·(x²/(3x²+1)) restait « non supportée »)
	while (isDelimiter(rest)) rest = rest.content;
	const signed = base === null ? number('1') : base;
	return { constant: sign === -1 ? opposite(signed) : signed, rest };
}

/**
 * Produit EXACT de deux valeurs finies : rationnel réduit si les deux le sont
 * (2·1/3 → 2/3), sinon la partie irrationnelle garde sa forme (π·1/3 → π/3,
 * −2π·1/3 → −2π/3). Null si la valeur n'est pas lisible.
 */
function exactProduct(k: MathNode, limit: MathNode): MathNode | null {
	const kRational = exactConstantRational(k);
	const limitRational = exactConstantRational(limit);
	if (kRational !== null && limitRational !== null) {
		return exactConstantNode(multiply(k, limit, 'implicit')) ?? number('0');
	}
	// Un seul rationnel : il devient le coefficient de l'autre facteur. Les
	// facteurs rationnels de la partie irrationnelle s'y ajoutent (−2·π lu
	// (−2)·π par le parseur) : −2π/3, pas (−2π)/3.
	const rational = kRational ?? limitRational;
	if (rational === null) return multiply(k, limit, 'implicit');
	const { sign, node } = peelSign(kRational !== null ? limit : k);
	let coefficient = sign === -1 ? negRational(rational) : rational;
	const irrationalFactors = (isMultiplication(node) ? flattenProductShallow(node) : []).filter(
		(f) => {
			const value = exactConstantRational(f.factor);
			if (value === null) return true;
			coefficient = mulRational(coefficient, value);
			return false;
		}
	);
	const irrational = isMultiplication(node) ? unflattenProduct(irrationalFactors) : node;
	if (irrational === null) return exactConstantNode(multiply(k, limit, 'implicit'));
	const scale = absRational(coefficient);
	const numerator =
		scale.n === 1n ? irrational : multiply(number(scale.n.toString()), irrational, 'implicit');
	const magnitude =
		scale.d === 1n ? numerator : divide(numerator, number(scale.d.toString()), 'fraction');
	return isNegative(coefficient) ? opposite(magnitude) : magnitude;
}

/** Plage où un facteur constant non rationnel, évalué en flottant, est sûr. */
const SAFE_FACTOR_MIN = 1e-9;
const SAFE_FACTOR_MAX = 1e9;

/** k exactement rationnel, ou flottant dans la plage sûre (ni ≈ 0, ni ≈ ∞). */
function isSafeFactor(k: MathNode, kValue: number): boolean {
	if (exactConstantRational(k) !== null) return true;
	const magnitude = Math.abs(kValue);
	return magnitude > SAFE_FACTOR_MIN && magnitude < SAFE_FACTOR_MAX;
}

/**
 * Zéro exact écrit comme tel : le nombre 0, ou un produit dont un facteur est
 * 0 et dont les autres sont sûrs (0·tan(π/2) n'est pas défini). Un flottant
 * nul (sin(π) ≈ 1,2e−16) n'en est jamais un.
 */
function isExactZero(k: MathNode): boolean {
	const { node } = peelSign(k);
	if (isNumber(node)) return Number(node.value) === 0;
	if (!isMultiplication(node)) return false;
	const factors = flattenProductShallow(node).map((f) => f.factor);
	if (!factors.some((f) => isExactZero(f))) return false;
	return factors.every((f) => {
		if (isExactZero(f)) return true;
		try {
			return isSafeFactor(f, evaluateNodeToApproximatedNumber(f));
		} catch {
			return false;
		}
	});
}

/**
 * lim k·f = k·lim f pour un facteur constant k non nul ; 0·f est la fonction
 * nulle sur son domaine (déjà validé par l'appelant), sa limite est 0.
 *
 * La limite de f se calcule par le moteur complet (terme dominant, L'Hôpital…).
 * Seules les limites démontrées sont reprises : une valeur approchée ou une
 * limite inexistante laisse la main aux stratégies suivantes.
 */
function tryConstantFactor(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): { value: MathNode } | null {
	const split = splitConstantFactor(expression, varName);
	if (split === null) return null;

	let kValue: number;
	try {
		kValue = evaluateNodeToApproximatedNumber(split.constant);
	} catch {
		return null;
	}
	if (!Number.isFinite(kValue)) return null;
	// k doit être sûr : un rationnel exact, ou un flottant loin de 0 et de
	// l'infini. sin(π)·x vaut 0·x mais sin(π) s'évalue à 1,2e−16 (→ +∞ faux) ;
	// tan(π/2) s'évalue à 1,6e16 alors qu'il n'est pas défini. Dans le doute,
	// on ne conclut pas : « non supportée » vaut mieux qu'une limite fausse.
	// Zéro exact (0, −0, 0·3…) : 0·f est la fonction nulle sur son domaine
	if (isExactZero(split.constant)) return { value: number('0') };
	if (!isSafeFactor(split.constant, kValue)) return null;

	const inner = evaluateLimit(split.rest, varName, approach, dir, options);
	if (inner.value === null || inner.value === undefined) return null;
	if (inner.status !== 'exact' && inner.status !== 'infinite') return null;

	if (isInfinity(inner.value)) {
		const positive = (inner.value.sign === 'positive') === kValue > 0;
		return { value: positive ? positiveInfinity() : negativeInfinity() };
	}
	// k·0 = 0 : sinon « 2 0 » (produit non réduit) ou « −0 »
	if (getNumericValue(inner.value) === 0) return { value: number('0') };
	const value = exactProduct(split.constant, inner.value);
	return value === null ? null : { value };
}

// =============================================================================
// Produit de fonctions non constantes
// =============================================================================

/** Limite d'un facteur, réduite à ce qui permet de conclure sans risque. */
type FactorLimit =
	| { readonly kind: 'infinite'; readonly sign: 1 | -1 }
	| { readonly kind: 'zero' }
	/** Fini, exactement non nul (rationnel ≠ 0, ou flottant loin de 0) */
	| { readonly kind: 'nonzero'; readonly value: MathNode; readonly sign: 1 | -1 }
	/** Fini, non nul NON prouvé (flottant ≈ 0 non rationnel) */
	| { readonly kind: 'finite'; readonly value: MathNode };

/**
 * Garde-fou : la réécriture en quotient rappelle `evaluateLimit`, dont les
 * stratégies peuvent reformer un produit. Pile des produits EN COURS.
 */
const MAX_NESTED_PRODUCTS = 3;
let nestedProducts = 0;

/**
 * Limite d'un facteur pour la règle du produit, ou null : limite approchée,
 * inexistante ou non trouvée — on ne conclut jamais sur elle.
 */
function toFactorLimit(result: LimitResult): FactorLimit | null {
	const value = result.value;
	if (value === null || value === undefined) return null;
	if (result.status !== 'exact' && result.status !== 'infinite') return null;
	if (isInfinity(value)) return { kind: 'infinite', sign: value.sign === 'positive' ? 1 : -1 };
	if (isExactZero(value)) return { kind: 'zero' };
	const rational = exactConstantRational(value);
	if (rational !== null) {
		if (rational.n === 0n) return { kind: 'zero' };
		return { kind: 'nonzero', value, sign: isNegative(rational) ? -1 : 1 };
	}
	let numeric: number;
	try {
		numeric = evaluateNodeToApproximatedNumber(value);
	} catch {
		return null;
	}
	if (!Number.isFinite(numeric)) return null;
	if (isSafeFactor(value, numeric)) {
		return { kind: 'nonzero', value, sign: numeric > 0 ? 1 : -1 };
	}
	return { kind: 'finite', value };
}

/**
 * Combine les limites des facteurs par les cas sûrs : fini × fini → L₁·L₂ ;
 * fini NON NUL × ±∞ → ±∞ selon les signes ; ±∞ × ±∞ → ±∞. Null pour 0 × ∞
 * (forme indéterminée) et pour un fini dont la non-nullité n'est pas prouvée
 * devant un infini.
 */
function combineFactorLimits(limits: readonly FactorLimit[]): MathNode | null {
	const infinite = limits.filter((l) => l.kind === 'infinite');
	if (infinite.length > 0) {
		let sign = 1;
		for (const l of limits) {
			if (l.kind === 'zero' || l.kind === 'finite') return null;
			sign *= l.sign;
		}
		return sign > 0 ? positiveInfinity() : negativeInfinity();
	}
	if (limits.some((l) => l.kind === 'zero')) return number('0');
	let product: MathNode | null = null;
	for (const l of limits) {
		if (l.kind === 'infinite' || l.kind === 'zero') return null;
		product = product === null ? l.value : exactProduct(product, l.value);
		if (product === null) return null;
	}
	return product;
}

/**
 * lim f·g pour des facteurs tous non constants (un facteur constant relève de
 * `tryConstantFactor`). Chaque facteur a sa limite calculée par le moteur
 * complet, dans la même direction. Forme 0 × ∞ ou facteur sans limite
 * bilatérale : si un facteur est un quotient, le produit est réécrit en un
 * seul quotient (identité sur le domaine) et c'est sa limite qui conclut —
 * (x²−1)·1/(x−1) = (x²−1)/(x−1) → 2. Sinon, aucune conclusion.
 */
function tryProductOfLimits(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): {
	value: MathNode;
	technique: LimitRule;
	form: IndeterminateForm;
	description: string;
} | null {
	if (!isMultiplication(expression)) return null;
	const factors = flattenProductShallow(expression).map((f) => f.factor);
	if (factors.some((f) => !containsVariable(f, varName))) return null;
	if (nestedProducts >= MAX_NESTED_PRODUCTS) return null;

	nestedProducts++;
	try {
		const results = factors.map((f) =>
			evaluateLimit(stripDelimiters(f), varName, approach, dir, options)
		);
		const limits = results.map(toFactorLimit);
		if (limits.every((l): l is FactorLimit => l !== null)) {
			const value = combineFactorLimits(limits);
			if (value !== null) {
				return {
					value,
					technique: 'product',
					form: 'none',
					description: 'Limite d’un produit : lim f·g = lim f · lim g'
				};
			}
		}
		// Forme 0 × ∞, ou facteur sans limite bilatérale (1/x en 0) : seul le
		// quotient réécrit peut conclure. Une limite simplement non trouvée
		// (non supportée, approchée) ne déclenche rien.
		// Un fini dont la non-nullité n'est pas prouvée, devant un infini, se
		// traite comme 0 × ∞ : rien n'est conclu sans la réécriture.
		const zeroTimesInfinity =
			limits.some((l) => l?.kind === 'zero' || l?.kind === 'finite') &&
			limits.some((l) => l?.kind === 'infinite');
		const noTwoSidedLimit = results.some((r) => r.status === 'does-not-exist');
		if (!zeroTimesInfinity && !noTwoSidedLimit) return null;
		// Facteur sans limite bilatérale : le produit est calculé à gauche puis
		// à droite, et on ne conclut que si les deux côtés concordent —
		// (x/|x|)·(1/x) en 0 → +∞, (|x|/x)·(x+1)/(x+1) en 0 → rien.
		if (noTwoSidedLimit && dir === 'both') {
			const left = concludedLimit(evaluateLimit(expression, varName, approach, 'left', options));
			const right = concludedLimit(evaluateLimit(expression, varName, approach, 'right', options));
			if (left === null || right === null) return null;
			if (!structurallyEqual(left.value, right.value)) return null;
			return {
				value: left.value,
				technique: 'one-sided',
				form: zeroTimesInfinity ? '0*∞' : 'none',
				description: 'Limites à gauche et à droite égales'
			};
		}
		const quotient = productAsQuotient(factors);
		if (quotient === null) return null;
		const rewritten = evaluateLimit(quotient, varName, approach, dir, options);
		if (rewritten.value === null || rewritten.value === undefined) return null;
		if (rewritten.status !== 'exact' && rewritten.status !== 'infinite') return null;
		// Une conclusion du quotient par l'analyse côté par côté n'est pas
		// reprise : les côtés du PRODUIT seuls font foi (branche ci-dessus)
		if (rewritten.technique === 'one-sided') return null;
		return {
			value: rewritten.value,
			technique: rewritten.technique,
			form: zeroTimesInfinity ? '0*∞' : 'none',
			description: 'Produit réécrit en un seul quotient'
		};
	} finally {
		nestedProducts--;
	}
}

function stripDelimiters(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}

/**
 * f₁·…·(a/b)·…·fₙ réécrit (f₁·…·a·…·fₙ)/b, sur le PREMIER facteur quotient.
 * Null si aucun facteur n'est un quotient.
 */
function productAsQuotient(factors: readonly MathNode[]): MathNode | null {
	const index = factors.findIndex((f) => isDivision(stripDelimiters(f)));
	if (index === -1) return null;
	const fraction = stripDelimiters(factors[index]);
	if (!isDivision(fraction)) return null;
	// a = 1 ne s'écrit pas : (x·1)/x mettait L'Hôpital en échec
	const numeratorFactors = factors.flatMap((f, i) => {
		if (i !== index) return [f];
		const { numerator } = fraction;
		return isNumber(numerator) && numerator.value === '1' ? [] : [numerator];
	});
	const numerator = numeratorFactors.reduce((acc, f) => multiply(acc, f, 'dot'));
	return divide(numerator, fraction.denominator, 'fraction');
}

// =============================================================================
// Somme en ±∞ : terme dominant
// =============================================================================

/** Limite réduite à ce qui sert à combiner deux termes. */
type TermLimit =
	| { readonly kind: 'infinite'; readonly sign: 1 | -1 }
	| { readonly kind: 'finite'; readonly value: number };

/**
 * Garde-fou : la levée de ∞ − ∞ rappelle `evaluateLimit` sur des quotients,
 * qui peuvent eux-mêmes contenir des sommes. Pile des sommes EN COURS
 * d'analyse (incrémentée à l'entrée, décrémentée à la sortie) : elle mesure
 * l'imbrication, pas le nombre de termes — une somme est aplatie d'un coup.
 */
const MAX_NESTED_SUMS = 3;
let nestedSums = 0;

/**
 * Limite exploitable pour combiner des termes, ou null. Une valeur approchée
 * (repli numérique de L'Hôpital, statut 'approximate') n'en est pas une :
 * x/√x valait « 200000 » et faisait conclure −∞ sur x/√x − √x.
 */
function toTermLimit(result: LimitResult): TermLimit | null {
	const value = result.value;
	if (value === null || value === undefined) return null;
	if (result.status === 'approximate') return null;
	if (isInfinity(value)) return { kind: 'infinite', sign: value.sign === 'positive' ? 1 : -1 };
	const numeric = getNumericValue(value);
	if (numeric === null) return null;
	return { kind: 'finite', value: numeric };
}

/** Exposant `u` de `e^u` ou `exp(u)`, sinon null. */
function exponentialArgument(node: MathNode): MathNode | null {
	if (isSuperscript(node) && isEulerBase(node.base)) return node.superscript;
	if (isFunction(node) && node.name.toLowerCase() === 'exp' && node.args.length === 1) {
		return node.args[0];
	}
	return null;
}

/** Retire les signes `−` et parenthèses de tête : `−(−A)` → { sign: 1, node: A }. */
function peelSign(node: MathNode): { sign: 1 | -1; node: MathNode } {
	if (isDelimiter(node)) return peelSign(node.content);
	if (isOpposite(node)) {
		const inner = peelSign(node.operand);
		return { sign: inner.sign === 1 ? -1 : 1, node: inner.node };
	}
	return { sign: 1, node };
}

/**
 * Limite de `num / den`, ou null si le moteur ne conclut pas. Deux
 * exponentielles se comparent par leurs exposants : e^v / e^u = e^{v − u}.
 */
function ratioLimit(
	num: MathNode,
	den: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): TermLimit | null {
	const quotient = divide(num, den, 'fraction');
	const direct = toTermLimit(evaluateLimit(quotient, varName, approach, dir, options));
	if (direct !== null) return direct;
	const numExponent = exponentialArgument(num);
	const denExponent = exponentialArgument(den);
	if (numExponent === null || denExponent === null) return null;
	// lim (v − u) puis exponentielle : −∞ → 0, +∞ → +∞, c → e^c
	const exponentGap = subtract(numExponent, denExponent);
	const gap = toTermLimit(evaluateLimit(exponentGap, varName, approach, dir, options));
	if (gap === null) return null;
	if (gap.kind === 'infinite') {
		return gap.sign === 1 ? { kind: 'infinite', sign: 1 } : { kind: 'finite', value: 0 };
	}
	return { kind: 'finite', value: Math.exp(gap.value) };
}

/** Comparaison de deux termes infinis : n / leader. */
type Comparison =
	| { readonly kind: 'negligible' }
	| { readonly kind: 'dominant' }
	| { readonly kind: 'same-order'; readonly ratio: number };

/** Compare `node` au terme `leader` par lim node/leader, ou à défaut leader/node. */
function compareTerms(
	node: MathNode,
	leader: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): Comparison | null {
	const ratio = ratioLimit(node, leader, varName, approach, dir, options);
	if (ratio !== null) {
		if (ratio.kind === 'infinite') return { kind: 'dominant' };
		if (ratio.value === 0) return { kind: 'negligible' };
		return { kind: 'same-order', ratio: ratio.value };
	}
	const inverse = ratioLimit(leader, node, varName, approach, dir, options);
	if (inverse === null) return null;
	if (inverse.kind === 'infinite') return { kind: 'negligible' };
	if (inverse.value === 0) return { kind: 'dominant' };
	return { kind: 'same-order', ratio: 1 / inverse.value };
}

/**
 * Limite d'une somme en ±∞, terme à terme (somme aplatie).
 *
 * Forme ∞ − ∞ : on cherche le terme dominant parmi les termes infinis
 * (e^x − x : x/e^x → 0, croissance comparée). Les termes du même ordre que
 * lui (rapport fini non nul) forment un groupe dont le coefficient cumulé
 * donne le signe ; coefficient nul : on ne conclut pas.
 */
function trySumByDominantTerm(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): { value: MathNode; form: IndeterminateForm; description: string } | null {
	if (!isAddition(expr) && !isSubtraction(expr)) return null;
	if (nestedSums >= MAX_NESTED_SUMS) return null;

	nestedSums++;
	try {
		// Termes signés : signe de la chaîne × signes de tête du terme
		const terms = flattenSumShallow(expr).map(({ sign, term }) => {
			const peeled = peelSign(term);
			return { sign: (sign === '+' ? peeled.sign : -peeled.sign) as 1 | -1, node: peeled.node };
		});
		if (terms.length < 2) return null;

		const limits: TermLimit[] = [];
		for (const term of terms) {
			const termLimit = toTermLimit(evaluateLimit(term.node, varName, approach, dir, options));
			if (termLimit === null) return null;
			limits.push(termLimit);
		}

		const infiniteIndices: number[] = [];
		const signedSigns = new Set<number>();
		limits.forEach((termLimit, i) => {
			if (termLimit.kind === 'infinite') {
				infiniteIndices.push(i);
				signedSigns.add(terms[i].sign * termLimit.sign);
			}
		});
		if (infiniteIndices.length === 0) return null;

		const infinityNode = (sign: number): MathNode =>
			sign > 0 ? positiveInfinity() : negativeInfinity();

		// Pas de forme indéterminée : tous les infinis ont le même signe.
		if (signedSigns.size === 1) {
			const sign = [...signedSigns][0];
			return {
				value: infinityNode(sign),
				form: 'none',
				description: `Somme des limites : ${sign > 0 ? '+∞' : '-∞'}`
			};
		}

		// Forme ∞ − ∞ : terme dominant et groupe de même ordre.
		let leader = infiniteIndices[0];
		let group: Array<{ index: number; ratio: number }> = [{ index: leader, ratio: 1 }];
		for (const j of infiniteIndices.slice(1)) {
			const comparison = compareTerms(
				terms[j].node,
				terms[leader].node,
				varName,
				approach,
				dir,
				options
			);
			if (comparison === null) return null;
			if (comparison.kind === 'dominant') {
				leader = j;
				group = [{ index: j, ratio: 1 }];
			} else if (comparison.kind === 'same-order') {
				group.push({ index: j, ratio: comparison.ratio });
			}
		}

		const coefficient = group.reduce((acc, g) => acc + terms[g.index].sign * g.ratio, 0);
		if (Math.abs(coefficient) <= ZERO_TOLERANCE) return null;
		const leaderLimit = limits[leader];
		if (leaderLimit.kind !== 'infinite') return null;
		const sign = Math.sign(coefficient) * leaderLimit.sign;

		return {
			value: infinityNode(sign),
			form: '∞-∞',
			description: `Forme ∞ − ∞ levée par le terme dominant (croissances comparées) : ${sign > 0 ? '+∞' : '-∞'}`
		};
	} finally {
		nestedSums--;
	}
}

/**
 * Garde-fou : la limite d'une réécriture peut elle-même aboutir à une somme
 * réécrite. Profondeur d'imbrication des réécritures EN COURS.
 */
const MAX_NESTED_REWRITES = 2;
let nestedRewrites = 0;

/**
 * Somme ∞ − ∞ en ±∞ : limite d'une réécriture égale (conjugué, même
 * dénominateur), ou null si aucune ne conclut — une valeur approchée ne
 * conclut pas.
 */
function tryRewrittenSum(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): { value: MathNode; rewritten: MathNode; description: string; technique: LimitRule } | null {
	if (nestedRewrites >= MAX_NESTED_REWRITES) return null;
	nestedRewrites++;
	try {
		for (const candidate of rewriteIndeterminateSum(expr)) {
			const result = evaluateLimit(candidate.rewritten, varName, approach, dir, options);
			if ((result.status === 'exact' || result.status === 'infinite') && result.value !== null) {
				return {
					value: result.value,
					rewritten: candidate.rewritten,
					description: candidate.description,
					technique: candidate.technique
				};
			}
		}
		return null;
	} finally {
		nestedRewrites--;
	}
}

/** L'expression contient-elle une puissance de la base d'Euler (`e^u`) ? */
function containsEulerPower(expr: MathNode): boolean {
	return findNodes(expr, (n) => isSuperscript(n) && isEulerBase(n.base)).length > 0;
}

/**
 * L'Hôpital a mené à f'/g' qui n'est plus indéterminé mais que sa substitution
 * directe ne conclut pas (x/x² → 1/(2x) en 0⁺) : la limite de f'/g', par le
 * moteur complet, est celle de f/g. Seules une valeur exacte ou infinie
 * concluent. Pas de boucle : f'/g' n'est pas une forme 0/0 ou ∞/∞, L'Hôpital
 * ne s'y réapplique pas.
 */
function limitOfLhopitalQuotient(
	lhopitalResult: ReturnType<typeof applyLhopital>,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	options: LimitOptions
): { value: MathNode; status: 'exact' | 'infinite' } | null {
	const quotient = lhopitalResult.transformedExpr;
	if (!lhopitalResult.applicable || lhopitalResult.value || !quotient) return null;
	if (detectIndeterminateForm(quotient, varName, approach, direction) !== 'none') return null;
	return concludedLimit(evaluateLimit(quotient, varName, approach, direction, options));
}

/** Valeur d'une limite conclue (exacte ou infinie), ou null. */
function concludedLimit(
	result: LimitResult
): { value: MathNode; status: 'exact' | 'infinite' } | null {
	if (result.value === null) return null;
	if (result.status !== 'exact' && result.status !== 'infinite') return null;
	return { value: result.value, status: isInfinity(result.value) ? 'infinite' : result.status };
}

/**
 * Limite, par le moteur complet, de l'expression où |f| a été remplacé par ±f
 * selon le côté d'approche. Null si la simplification n'est pas celle de la
 * valeur absolue, ou si la limite n'est pas conclue (exacte ou infinie). Pas
 * de boucle : l'expression simplifiée ne contient plus de valeur absolue.
 */
function limitOfAbsFreeExpression(
	algebraicResult: AlgebraicResult,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	options: LimitOptions
): { value: MathNode; status: 'exact' | 'infinite' } | null {
	const simplified = algebraicResult.simplified;
	if (algebraicResult.technique !== 'abs-simplification' || !simplified) return null;
	if (isNumber(simplified) || isInfinity(simplified)) return null;
	return concludedLimit(evaluateLimit(simplified, varName, approach, direction, options));
}

/**
 * Internal limit evaluation (without one-sided recursion).
 */
function evaluateLimitInternal(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	options: LimitOptions
): LimitResult {
	const opts: Required<LimitOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new LimitStepRecorderImpl();

	// Validate domain accessibility (consistent with main evaluateLimit)
	const domainValidation = validateApproachInDomain(expr, varName, approach, direction);
	if (!domainValidation.valid) {
		return createResult(
			null,
			varName,
			approach,
			direction,
			'does-not-exist',
			'none',
			'direct-substitution',
			recorder,
			opts,
			domainValidation.message
		);
	}

	// Verify variable is used in expression
	if (!containsVariable(expr, varName)) {
		// Constant expression: evaluate numerically (e.g., ln(e) → 1)
		let evaluatedExpr = expr;
		// Constante rationnelle (2/3) : valeur exacte, pas 0.666666666666667
		const exactConstant = isNumber(expr) ? null : exactConstantNode(expr);
		if (exactConstant !== null) {
			evaluatedExpr = exactConstant;
		} else if (!isNumber(expr) && !isInfinity(expr)) {
			try {
				const numValue = evaluateNodeToApproximatedNumber(expr);
				if (Number.isFinite(numValue)) {
					const intValue = Math.round(numValue);
					evaluatedExpr =
						Math.abs(numValue - intValue) < ZERO_TOLERANCE
							? numericNode(intValue)
							: numericNode(numValue.toPrecision(15));
				}
			} catch {
				// If numeric evaluation fails, return the expression as-is
			}
		}
		return createResult(
			evaluatedExpr,
			varName,
			approach,
			direction,
			'exact',
			'none',
			'direct-substitution',
			recorder,
			opts
		);
	}

	// Try known limits
	const knownLimit = matchKnownLimit(expr, approach, varName, direction);
	if (knownLimit) {
		const limitValue = getKnownLimitValue(knownLimit, varName);
		recorder.recordStepByRule(
			'known-limit',
			expr,
			limitValue,
			'summarized',
			undefined,
			knownLimit.descriptionFr
		);
		return createResult(
			limitValue,
			varName,
			approach,
			direction,
			'exact',
			'none',
			'known-limit',
			recorder,
			opts
		);
	}

	// Try piecewise function limits (floor, ceil, sign)
	// Must be before direct substitution to handle direction correctly
	if (!isInfinity(approach) && containsPiecewiseFunction(expr)) {
		const piecewiseResult = tryPiecewiseFunctionLimit(expr, varName, approach, direction, recorder);
		if (piecewiseResult.success && piecewiseResult.value) {
			return createResult(
				piecewiseResult.value,
				varName,
				approach,
				direction,
				'exact',
				'none',
				piecewiseResult.technique,
				recorder,
				opts
			);
		}
	}

	// Try direct substitution
	if (!isInfinity(approach)) {
		const directResult = tryDirectSubstitution(expr, varName, approach, direction, recorder);
		if (directResult !== null) {
			return createResult(
				directResult,
				varName,
				approach,
				direction,
				isInfinity(directResult) ? 'infinite' : 'exact',
				'none',
				'direct-substitution',
				recorder,
				opts
			);
		}
	}

	// Try composition limits
	const compositionResult = tryCompositionLimit(expr, varName, approach, direction, recorder);
	if (compositionResult.success && compositionResult.value) {
		return createResult(
			compositionResult.value,
			varName,
			approach,
			direction,
			isInfinity(compositionResult.value) ? 'infinite' : 'exact',
			'none',
			compositionResult.technique ?? 'composition',
			recorder,
			opts
		);
	}

	const indeterminateForm = detectIndeterminateForm(expr, varName, approach, direction);

	// Valeur approchée de L'Hôpital : rendue 'approximate' faute de mieux
	let approximateValue: MathNode | null = null;

	// Try L'Hôpital
	if (isLhopitalApplicable(expr, varName, approach, direction)) {
		const lhopitalResult = applyLhopital(expr, varName, approach, direction, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value && lhopitalResult.approximate) {
			approximateValue = lhopitalResult.value;
		} else if (lhopitalResult.applicable && lhopitalResult.value) {
			return createResult(
				lhopitalResult.value,
				varName,
				approach,
				direction,
				'exact',
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
		const afterLhopital = limitOfLhopitalQuotient(
			lhopitalResult,
			varName,
			approach,
			direction,
			options
		);
		if (afterLhopital !== null) {
			return createResult(
				afterLhopital.value,
				varName,
				approach,
				direction,
				afterLhopital.status,
				lhopitalResult.resolvedForm ?? 'none',
				'lhopital',
				recorder,
				opts
			);
		}
	}

	// Try algebraic
	const algebraicResult = tryAlgebraicSimplification(expr, varName, approach, direction, recorder);
	if (algebraicResult.success && algebraicResult.simplified) {
		if (isNumber(algebraicResult.simplified) || isInfinity(algebraicResult.simplified)) {
			return createResult(
				algebraicResult.simplified,
				varName,
				approach,
				direction,
				isInfinity(algebraicResult.simplified) ? 'infinite' : 'exact',
				indeterminateForm,
				'algebraic-simplification',
				recorder,
				opts
			);
		}
		const absFree = limitOfAbsFreeExpression(
			algebraicResult,
			varName,
			approach,
			direction,
			options
		);
		if (absFree !== null) {
			return createResult(
				absFree.value,
				varName,
				approach,
				direction,
				absFree.status,
				indeterminateForm,
				'algebraic-simplification',
				recorder,
				opts
			);
		}
	}

	// Try squeeze
	const squeezeResult = trySqueeze(expr, varName, approach, direction, recorder);
	if (squeezeResult.applicable && squeezeResult.value) {
		return createResult(
			squeezeResult.value,
			varName,
			approach,
			direction,
			'exact',
			indeterminateForm,
			'squeeze',
			recorder,
			opts
		);
	}

	if (approximateValue !== null) {
		return createResult(
			approximateValue,
			varName,
			approach,
			direction,
			'approximate',
			indeterminateForm,
			'lhopital',
			recorder,
			opts
		);
	}

	return createResult(
		null,
		varName,
		approach,
		direction,
		'unsupported',
		indeterminateForm,
		'direct-substitution',
		recorder,
		opts
	);
}

/**
 * Try direct substitution to evaluate the limit.
 * Uses exact arithmetic first, with fallback to numeric evaluation.
 */
function tryDirectSubstitution(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorderImpl
): MathNode | null {
	// Try exact evaluation first
	const exactResult = tryDirectSubstitutionExact(expr, varName, approach, direction, recorder);
	if (exactResult !== null) {
		return exactResult;
	}

	// Fallback to numeric evaluation
	return tryDirectSubstitutionNumeric(expr, varName, approach, recorder);
}

/**
 * Try direct substitution using exact arithmetic.
 */
function tryDirectSubstitutionExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorderImpl
): MathNode | null {
	const result = tryEvaluateLimitExact(expr, varName, approach, direction);

	if (!result || isIndeterminateResult(result)) {
		return null; // Indeterminate form or evaluation failed
	}

	// Handle infinity results (e.g., ln(0⁺) = -∞)
	if (isInfinityResult(result)) {
		const node = resultToNode(result);
		if (node) {
			recorder.recordStepByRule(
				'direct-substitution',
				expr,
				node,
				'summarized',
				approach,
				`Substitution de ${varName} par ${getNumericValue(approach) ?? approach}`
			);
			return node;
		}
		return null;
	}

	const node = resultToFiniteNode(result);
	if (node) {
		recorder.recordStepByRule(
			'direct-substitution',
			expr,
			node,
			'summarized',
			approach,
			`Substitution de ${varName} par ${getNumericValue(approach) ?? approach}`
		);
		return node;
	}

	return null;
}

/**
 * Try direct substitution using numeric evaluation.
 * This is the fallback method when exact evaluation fails.
 */
function tryDirectSubstitutionNumeric(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorderImpl
): MathNode | null {
	const substituted = substituteValue(expr, varName, approach);
	const numericValue = tryEvaluateNumeric(substituted);

	if (numericValue !== null && Number.isFinite(numericValue)) {
		const resultNode: MathNode = { type: 'number', value: cleanNumberString(numericValue) };
		recorder.recordStepByRule(
			'direct-substitution',
			expr,
			resultNode,
			'summarized',
			approach,
			`Substitution de ${varName} par ${getNumericValue(approach) ?? approach}`
		);
		return resultNode;
	}

	return null;
}

/**
 * Try to evaluate an expression numerically.
 * Delegates to the eval module's evaluateNodeToApproximatedNumber,
 * returning null on any error (unsupported types, variables, etc.).
 */
function tryEvaluateNumeric(expr: MathNode): number | null {
	try {
		const result = evaluateNodeToApproximatedNumber(expr);
		return Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

/**
 * Clean a number string.
 */
function cleanNumberString(value: number): string {
	if (Math.abs(value - Math.round(value)) < ZERO_TOLERANCE) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Create a LimitResult object.
 */
function createResult(
	value: MathNode | null,
	variable: string,
	approach: MathNode,
	direction: LimitDirection,
	status: LimitStatus,
	indeterminateForm: IndeterminateForm,
	technique: LimitRule,
	recorder: LimitStepRecorderImpl,
	opts: Required<LimitOptions>,
	error?: string
): LimitResult {
	return {
		variable,
		approach,
		direction,
		status,
		value,
		indeterminateForm,
		technique,
		steps: recorder.getStepsFiltered(opts.verbosity),
		...(error && { error })
	};
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Evaluate a limit from a LimitNode.
 */
export function evaluateLimitNode(limitNode: LimitNode, options: LimitOptions = {}): LimitResult {
	return evaluateLimit(limitNode, undefined, undefined, 'both', options);
}

/**
 * Check if a known limit matches the expression.
 */
export function findKnownLimit(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection = 'both'
) {
	return matchKnownLimit(expr, approach, variable, direction);
}

/**
 * Analyze one-sided limits separately.
 */
export function analyzeOneSidedLimits(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	options: LimitOptions = {}
): OneSidedLimitResult {
	return evaluateOneSidedLimits(
		(e, v, a, d, o) => evaluateLimit(e, v, a, d, o),
		expr,
		variable,
		approach,
		options
	);
}

/**
 * Export discontinuity analysis.
 */
export { analyzeDiscontinuity } from './one-sided';
