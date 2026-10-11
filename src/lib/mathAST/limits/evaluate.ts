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

import { EULER_NOT_A_VARIABLE, refusesEulerVariable } from '../common/euler-variable';
import type { MathNode, LimitNode, GreekLetterNode } from '../types';
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
	isMultiplication,
	isSymbol,
	isPositive,
	isGreek,
	isVariable
} from '../guards';
import {
	add,
	divide,
	multiply,
	subtract,
	positiveInfinity,
	negativeInfinity,
	number,
	opposite,
	func,
	ln,
	variable as variableNode,
	greek,
	power,
	mathConstant
} from '../factory';
import { findNodes, mapNode } from '../transforms';
import { flattenSumShallow, flattenProductShallow, unflattenProduct } from '../flatten';
import { isEulerBase } from '../differentiation/rules';
import { expandEulerPowers } from '../normal/rules/euler-power';
import { expandFunctionPowers } from '../common/function-power';
import { expandOddRootPowers, hasOddRootPower } from '../common/odd-root-power';
import { toLatex } from '../latex-generator';
import { combineVariablePowers } from '../common/variable-powers';
import { matchKnownLimit, getKnownLimitValue, structurallyEqual } from './known-limits';
import { LimitStepRecorderImpl } from './step-recorder';
import { containsVariable } from '../common/contains-variable';
import { detectIndeterminateForm } from './indeterminate';
import { applyLhopital, isLhopitalApplicable } from './lhopital';
import { tryAlgebraicSimplification, type AlgebraicResult } from './algebraic';
import { trySqueeze } from './squeeze';
import { evaluateOneSidedLimits, needsOneSidedAnalysis, recordOneSidedSteps } from './one-sided';
import { tryCompositionLimit } from './composition';
import { rewriteReciprocalTrig } from './reciprocal-trig';
import { tryPiecewiseFunctionLimit, containsPiecewiseFunction } from './piecewise';
import {
	limitByGeneralizedDegree,
	involvesFractionalPower,
	exactConstantNode,
	exactConstantRational
} from './generalized-degree';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import {
	isNegative,
	absRational,
	mulRational,
	negRational,
	addRational,
	fromInteger,
	isZero as isZeroRational
} from '../normal/rational';
import type { Rational } from '../normal/types';
import { rationalToNode } from '../common/numeric';
import { rewriteIndeterminateSum } from './sum-reduction';
import { classifyWithSign } from './sign-tracking';
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
	// En ±∞ : f doit être définie sur tout un intervalle ]a ; +∞[ (ou
	// ]−∞ ; a[). ln(x+1) − ln(x+2) en −∞, ln x − ln(sin x) en +∞ : non.
	if (isInfinity(approach)) {
		const defined = !undefinedTowardInfinity(expr, varName, approach, direction);
		return defined
			? { valid: true, leftDefined: true, rightDefined: true }
			: {
					valid: false,
					leftDefined: false,
					rightDefined: false,
					message: DOMAIN_MESSAGES['both-undefined']
				};
	}

	const approachVal = getNumericValue(approach);
	if (approachVal === null) {
		return { valid: true, leftDefined: true, rightDefined: true };
	}

	try {
		const { domain } = computeDomain(expr, varName);
		// Small offset to check domain membership near the approach point
		// We check at approach ± epsilon to determine left/right accessibility
		// (1e-10 tombait dans la tolérance des exclusions périodiques : cot x
		// se disait non définie à droite de 0)
		const epsilon = DOMAIN_PROBE_OFFSET;

		// Le domaine calculé peut être trop large (ln(sin x) : « ℝ » ; ln(ln x) :
		// « x > 0 ») : une évaluation hors domaine juste à côté du point le
		// restreint.
		const leftDefined =
			containsValue(domain, approachVal - epsilon) &&
			!outOfDomainNear(expr, varName, approachVal - epsilon);
		const rightDefined =
			containsValue(domain, approachVal + epsilon) &&
			!outOfDomainNear(expr, varName, approachVal + epsilon);

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

/**
 * Sondes vers ±∞ : sept points consécutifs, [10⁶ ; 10⁶ + 6], assez pour
 * qu'un argument périodique de période 2π (sin x) passe par une valeur
 * négative. Elles ne servent qu'aux arguments dont le signe n'est pas
 * prouvé : ln(x − 10⁷) est négatif en 10⁶, mais tend vers +∞.
 */
const INFINITY_PROBES = [0, 1, 2, 3, 4, 5, 6].map((step) => 1e6 + step);

/**
 * Un ln ou une racine carrée de f a-t-il un argument STRICTEMENT négatif en
 * l'une des sondes vers ±∞ ? Seul un négatif prouve la sortie du domaine :
 * un argument nul vient d'un dépassement de capacité (e^{−x} en 10⁶), une
 * évaluation impossible ne dit rien. Les racines d'indice explicite (∛) sont
 * ignorées : définies sur ℝ pour un indice impair.
 */
function undefinedTowardInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): boolean {
	const positive = isInfinity(approach) && approach.sign === 'positive';
	const guardedArguments = findNodes(
		expr,
		(node) =>
			isFunction(node) &&
			node.args.length === 1 &&
			(((node.name === 'ln' || node.name === 'log') && node.base === undefined) ||
				(node.name === 'sqrt' && node.base === undefined))
	).flatMap((node) => (isFunction(node) ? [node.args[0]] : []));
	// Un argument qui tend vers +∞ ou vers un réel > 0 est positif au
	// voisinage : la sonde ne le juge pas (revue de #907 : ln(ln x − 20)
	// n'est positif qu'au-delà de 4,8·10⁸)
	const relevant = guardedArguments.filter(
		(argument) =>
			containsVariable(argument, varName) && !isPositiveNear(argument, varName, approach, direction)
	);
	if (relevant.length === 0) return false;
	return INFINITY_PROBES.some((magnitude) => {
		const point = positive ? number(String(magnitude)) : opposite(number(String(magnitude)));
		return relevant.some((argument) => {
			try {
				const value = evaluateNodeToApproximatedNumber(substituteValue(argument, varName, point));
				return Number.isFinite(value) && value < 0;
			} catch {
				return false;
			}
		});
	});
}

/** Écart au point pour sonder le domaine numériquement. */
const DOMAIN_PROBE_OFFSET = 1e-7;

/**
 * f évaluée en `value` sort-elle de son domaine (ln d'un négatif, √ d'un
 * négatif, arcsin hors [−1, 1]) ? Toute autre erreur d'évaluation ne dit
 * rien sur le domaine : false.
 */
function outOfDomainNear(expr: MathNode, varName: string, value: number): boolean {
	const magnitude = number(Math.abs(value).toFixed(12));
	const point = value < 0 ? opposite(magnitude) : magnitude;
	try {
		evaluateNodeToApproximatedNumber(substituteValue(expr, varName, point));
		return false;
	} catch (error) {
		// L'évaluateur rend ∛ d'un négatif (indice impair, défini sur ℝ) : seule
		// une racine d'indice pair d'un négatif lève ici.
		return error instanceof Error && /argument must be/.test(error.message);
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
	const requestedVariable = isLimit(expr) ? expr.variable : variable;
	if (refusesEulerVariable(requestedVariable, expr)) {
		throw new LimitError(EULER_NOT_A_VARIABLE, 'INVALID_VARIABLE');
	}
	const greekResult = evaluateGreekVariableLimit(expr, variable, approach, direction, options);
	if (greekResult !== null) return greekResult;
	const result = rejectUnreducedInfinity(
		evaluateLimitExactForm(expr, variable, approach, direction, options)
	);
	const expression = isLimit(expr) ? expr.expression : expr;
	const twoSided = oddRootTwoSided(expr, variable, approach, options, result, expression);
	return withInfiniteStatus(writeLikeInput(twoSided ?? result, expression));
}

/**
 * Limite bilatérale « non supportée » d'une puissance x^{p/q}, q impair
 * (x^{-1/3} en 0) : on la tranche par ses deux limites latérales, que le
 * moteur sait calculer — différentes : pas de limite ; égales : leur valeur.
 * `null` hors de ce cas (rien ne change pour les autres expressions).
 */
function oddRootTwoSided(
	expr: MathNode | LimitNode,
	variable: string | undefined,
	approach: MathNode | undefined,
	options: LimitOptions,
	result: LimitResult,
	expression: MathNode
): LimitResult | null {
	if (result.status !== 'unsupported' || result.direction !== 'both') return null;
	if (!hasOddRootPower(expression) || isInfinity(result.approach)) return null;
	const side = (direction: 'left' | 'right'): LimitResult =>
		isLimit(expr)
			? evaluateLimit({ ...expr, direction }, undefined, undefined, direction, options)
			: evaluateLimit(expr, variable, approach, direction, options);
	const left = side('left');
	const right = side('right');
	const known = (r: LimitResult) =>
		(r.status === 'exact' || r.status === 'infinite') && r.value !== null;
	if (!known(left) || !known(right)) return null;
	if (toLatex(left.value as MathNode) === toLatex(right.value as MathNode)) {
		return { ...left, direction: 'both' };
	}
	return { ...result, status: 'does-not-exist', value: null };
}

/**
 * Invariant de sortie : une limite dont la valeur est ±∞ a le statut
 * `infinite`, quelle que soit la stratégie qui l'a trouvée (L'Hôpital,
 * substitution directe, composition… rendaient `exact`). Posé ici, à la
 * sortie unique, plutôt que stratégie par stratégie.
 */
function withInfiniteStatus(result: LimitResult): LimitResult {
	if (result.status !== 'exact' || result.value === null || !isInfinity(result.value)) {
		return result;
	}
	return { ...result, status: 'infinite' };
}

/**
 * Variable grecque (`\lim_{\alpha\to+\infty}`) : dans le corps, α est un
 * nœud `greek`, alors que toutes les stratégies du moteur (substitution,
 * degré, formes connues…) cherchent un nœud `variable`. On traduit donc α en
 * variable nommée `alpha` à l'entrée, on calcule, puis on rend α dans la
 * valeur et les étapes. Rend `null` si la variable n'est pas une lettre
 * grecque présente dans l'expression (cas ordinaire).
 */
function evaluateGreekVariableLimit(
	expr: MathNode | LimitNode,
	variable: string | undefined,
	approach: MathNode | undefined,
	direction: LimitDirection,
	options: LimitOptions
): LimitResult | null {
	const varName = variable ?? (isLimit(expr) ? expr.variable : undefined);
	if (varName === undefined) return null;
	const isTheGreek = (n: MathNode): n is GreekLetterNode => isGreek(n) && n.letter === varName;
	const [letter] = [
		...findNodes(expr, isTheGreek),
		...(approach ? findNodes(approach, isTheGreek) : [])
	];
	if (letter === undefined) return null;

	const toVariable = (n: MathNode): MathNode =>
		mapNode(n, (m) => (isTheGreek(m) ? variableNode(varName, m.metadata) : m));
	const toGreek = (n: MathNode): MathNode =>
		mapNode(n, (m) => (isVariable(m) && m.name === varName ? greek(letter.letter, m.metadata) : m));

	const result = evaluateLimit(
		toVariable(expr),
		variable,
		approach && toVariable(approach),
		direction,
		options
	);
	return {
		...result,
		approach: toGreek(result.approach),
		value: result.value && toGreek(result.value),
		steps: result.steps.map((step) => ({
			...step,
			before: toGreek(step.before),
			after: toGreek(step.after),
			...(step.operand && { operand: toGreek(step.operand) })
		}))
	};
}

/**
 * Borne écrite par le parseur : `\infty` est le symbole `infinity`, `+\infty`
 * son `positive`, `-\infty` son `opposite`. Sans cette traduction en nœud
 * `infinity`, aucune stratégie ne voyait une borne infinie : la substitution
 * directe remplaçait x par le symbole et rendait « exact ∞/e^∞ » pour x/eˣ.
 */
function normalizeApproach(approach: MathNode): MathNode {
	if (isDelimiter(approach)) return normalizeApproach(approach.content);
	if (isSymbol(approach) && approach.symbol === 'infinity') return positiveInfinity();
	if (isPositive(approach)) {
		const inner = normalizeApproach(approach.operand);
		return isInfinity(inner) ? inner : approach;
	}
	if (isOpposite(approach)) {
		const inner = normalizeApproach(approach.operand);
		if (isInfinity(inner)) {
			return inner.sign === 'positive' ? negativeInfinity() : positiveInfinity();
		}
	}
	return approach;
}

/** Le symbole `\infty` ou un nœud `infinity` quelque part dans `node`. */
function containsInfinity(node: MathNode): boolean {
	return (
		findNodes(node, (n) => isInfinity(n) || (isSymbol(n) && n.symbol === 'infinity')).length > 0
	);
}

/** ln(0), log(0) non réduits : la trace d'un pôle logarithmique substitué. */
function containsLogOfZero(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) =>
				isFunction(n) &&
				(n.name === 'ln' || n.name === 'log') &&
				n.args.length === 1 &&
				getNumericValue(stripDelimiters(n.args[0])) === 0
		).length > 0
	);
}

/**
 * Filet : une limite n'est une valeur que si elle est ±∞ SEUL ou une
 * expression sans ∞. « ∞/e^∞ », « ln(∞)/∞ » sont des formes non réduites,
 * donc une limite non calculée — jamais une valeur exacte.
 */
function rejectUnreducedInfinity(result: LimitResult): LimitResult {
	if (result.value === null || isInfinity(result.value)) return result;
	if (!containsInfinity(result.value) && !containsLogOfZero(result.value)) return result;
	return { ...result, status: 'unsupported', value: null };
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
		approachPoint = normalizeApproach(expr.approach);
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
		approachPoint = normalizeApproach(approach);
		dir = direction;
	}

	// `\lim_{x\to a}\left(f\right)` : une somme DOIT être parenthésée après
	// `\lim`, c'est la saisie la plus courante. Les parenthèses de groupement
	// ne portent aucun sens (l'arbre porte déjà la priorité) ; sans ce retrait,
	// aucune stratégie ne reconnaissait f, et `(1+\frac{1}{x})^x` échappait
	// aux limites remarquables.
	expression = removeGrouping(expression);

	// `\cos^{-1}(x)` est la réciproque : la limite se calcule sur `arccos(x)`
	// (la substitution directe rendait cos(0) = 1). `\sin^2(x)` → `\sin(x)^2`.
	expression = expandFunctionPowers(expression);

	// x^{p/q}, q impair : définie pour x < 0 (décision du 2026-10-08) ; la
	// limite se calcule sur le radical ᵠ√(x^p), que les stratégies savent
	// signer (x^{-1/3} en 0⁻ rendait +∞ au lieu de −∞).
	// Produits / quotients de puissances de x réunis : x^{1/5}/x^{1/3} = x^{-2/15}
	// (L'Hôpital rendait « ≈ 60 » pour +∞) — avant la réécriture en radical
	expression = expandOddRootPowers(combineVariablePowers(expression, varName));

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

	// Convention lycée : un seul côté dans le domaine (ln x en 0, √x en 0) →
	// la limite bilatérale est celle de ce côté. Le résultat garde 'both'.
	if (dir === 'both' && domainValidation.leftDefined !== domainValidation.rightDefined) {
		const side: LimitDirection = domainValidation.rightDefined ? 'right' : 'left';
		const oneSided = evaluateLimitExactForm(expression, varName, approachPoint, side, options);
		const status =
			oneSided.value !== null && isInfinity(oneSided.value) ? 'infinite' : oneSided.status;
		return { ...oneSided, direction: 'both', status };
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
					// Irrationnelle (√2, ln 2, π) : gardée symbolique, statut exact.
					// Un décimal à 15 chiffres présenté « exact » se faisait
					// rationaliser plus loin (241421356237309/100000000000000).
					const intValue = Math.round(numValue);
					if (Math.abs(numValue - intValue) < ZERO_TOLERANCE) {
						evaluatedExpr = numericNode(intValue);
					}
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

	// Stratégie 1.9 : u^v, u ET v variables (xˣ, x^{1/x}), forme 0^0, ∞^0 ou
	// 1^∞ (ou borne infinie) : u^v = e^{v ln u}. Le domaine est u > 0
	// (convention x^a = e^{a ln x}) : la substitution directe de 0^0 (= 1 par
	// hasard sur main) ne doit pas conclure. Avant la substitution directe.
	const expOfLog = isExponentialIndeterminate(expression, varName, approachPoint, dir)
		? tryExponentialOfLogarithm(expression, varName, approachPoint, dir, options)
		: null;
	if (expOfLog !== null) {
		recorder.recordStepByRule(
			'composition',
			expression,
			expOfLog,
			'summarized',
			approachPoint,
			'Écriture exponentielle : u^v = e^{v ln u}'
		);
		return createResult(
			expOfLog,
			varName,
			approachPoint,
			dir,
			isInfinity(expOfLog) ? 'infinite' : 'exact',
			'none',
			'composition',
			recorder,
			opts
		);
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

	// Stratégie 2.555 : ln u où u tend vers un rationnel L > 0 — par continuité
	// de ln, lim ln u = ln L (ln 1 = 0) ; ou vers +∞ (ln(+∞) = +∞). La composition ne traitait que
	// u → 0⁺ ou +∞ : ln((x²+1)/x²) en +∞, réécriture de ln(x²+1) − 2 ln x,
	// restait « non supportée ».
	const logOfLimit = tryLogarithmOfPositiveLimit(expression, varName, approachPoint, dir, options);
	if (logOfLimit !== null) {
		recorder.recordStepByRule(
			'composition',
			expression,
			logOfLimit,
			'summarized',
			approachPoint,
			'Continuité de ln : lim ln u = ln(lim u)'
		);
		return createResult(
			logOfLimit,
			varName,
			approachPoint,
			dir,
			isInfinity(logOfLimit) ? 'infinite' : 'exact',
			'none',
			'composition',
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

	// Stratégie 2.65 : somme dont chaque terme a une limite exacte, par les
	// seuls cas sûrs (finis → somme des limites ; infinis tous de même signe →
	// cet infini). `\lim_{x\to0}\frac{\sin x}{x}+1` restait « non supportée » :
	// la substitution échoue (0/0) et seul ±∞ était traité terme à terme.
	const sumOfLimits = trySumOfLimits(expression, varName, approachPoint, dir, options);
	if (sumOfLimits !== null) {
		recorder.recordStepByRule(
			'linearity',
			expression,
			sumOfLimits,
			'summarized',
			approachPoint,
			'Limite d’une somme : lim (f + g) = lim f + lim g'
		);
		return createResult(
			sumOfLimits,
			varName,
			approachPoint,
			dir,
			isInfinity(sumOfLimits) ? 'infinite' : 'exact',
			'none',
			'linearity',
			recorder,
			opts
		);
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
	// En un point fini, seul le regroupement des logarithmes : ln(x²−1) − ln(x−1)
	// en 1⁺ est une forme (−∞) − (−∞), ln((x²−1)/(x−1)) → ln 2.
	if (isAddition(expression) || isSubtraction(expression)) {
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
	// fonction `exp` ; la puissance de la base d'Euler (la lettre `e`, lue
	// `euler` par les deux parseurs) passait à côté : `x e^x` en −∞
	// sortait « non supportée ». On ne relit qu'EN DERNIER RECOURS, pour ne
	// rien changer à ce qui aboutissait déjà (une valeur `e` ne devient pas
	// `exp(1)`). Pas de boucle : la relecture ne contient plus de `e^u`.
	if (containsEulerPower(expression)) {
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

/**
 * lim ln u = ln L quand u tend vers un rationnel EXACT L > 0, +∞ quand u → +∞ ;
 * null sinon (limite approchée, irrationnelle, nulle ou −∞ : la composition
 * s'en charge ou l'on s'abstient).
 */
function tryLogarithmOfPositiveLimit(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): MathNode | null {
	if (!isFunction(expression) || expression.name !== 'ln' || expression.args.length !== 1) {
		return null;
	}
	const inner = evaluateLimit(expression.args[0], varName, approach, dir, options);
	if (inner.value === null || inner.value === undefined) return null;
	if (inner.status !== 'exact' && inner.status !== 'infinite') return null;
	// ln(+∞) = +∞ : la limite intérieure peut être conclue par L'Hôpital, que
	// la composition (classement de signe) ne voit pas — (x²+1)/x en +∞
	if (isInfinity(inner.value)) {
		return inner.value.sign === 'positive' ? positiveInfinity() : null;
	}
	const value = exactConstantRational(inner.value);
	if (value === null || value.n <= 0n) return null;
	if (value.n === value.d) return number('0');
	const constant = exactConstantNode(inner.value);
	return constant === null ? null : ln(constant);
}

/** Formes 0^0, ∞^0, 1^∞ d'une puissance u^v (ou borne infinie). */
function isExponentialIndeterminate(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection
): boolean {
	if (!isSuperscript(expression) || isEulerBase(expression.base)) return false;
	if (!containsVariable(expression.base, varName)) return false;
	if (!containsVariable(expression.superscript, varName)) return false;
	if (isInfinity(approach)) return true;
	const form = detectIndeterminateForm(expression, varName, approach, dir);
	return form === '0^0' || form === '∞^0' || form === '1^∞';
}

/** Garde-fou de récursion : v·ln u peut reformer une puissance. */
let nestedExpLog = 0;

/**
 * lim u^v = e^{lim v ln u} (u, v dépendant de la variable) : continuité de
 * exp. v ln u → +∞ donne +∞, → −∞ donne 0, → 0 donne 1. Seule une limite
 * intérieure exacte conclut ; null sinon.
 */
function tryExponentialOfLogarithm(
	expression: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): MathNode | null {
	if (!isSuperscript(expression) || isEulerBase(expression.base)) return null;
	const base = expression.base;
	const exponent = expression.superscript;
	if (!containsVariable(base, varName) || !containsVariable(exponent, varName)) return null;
	if (nestedExpLog >= 2) return null;
	nestedExpLog++;
	try {
		const inner = evaluateLimit(
			multiply(exponent, ln(base), 'implicit'),
			varName,
			approach,
			dir,
			options
		);
		if (inner.value === null || inner.value === undefined) return null;
		if (inner.status !== 'exact' && inner.status !== 'infinite') return null;
		if (isInfinity(inner.value)) {
			return inner.value.sign === 'positive' ? positiveInfinity() : number('0');
		}
		// v ln u → 0 : e⁰ = 1 (`exactConstantRational` ne lit pas 0)
		if (isNumber(inner.value) && Number(inner.value.value) === 0) return number('1');
		const constant = exactConstantNode(inner.value);
		if (constant === null) return null;
		// e¹ s'écrit e
		if (isNumber(constant) && Number(constant.value) === 1) return mathConstant('euler');
		return power(mathConstant('euler'), constant);
	} finally {
		nestedExpLog--;
	}
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

/**
 * Retire toutes les parenthèses de GROUPEMENT, à toute profondeur (`((f))`
 * → f). La priorité est déjà portée par l'arbre ; `|·|` est un autre nœud,
 * et les délimiteurs d'intervalle, d'ensemble, de matrice restent.
 */
function removeGrouping(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		isDelimiter(n) && (n.semantic ?? 'grouping') === 'grouping' ? n.content : n
	);
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
 * Limite d'une somme terme à terme quand chaque terme a une limite EXACTE
 * (ou infinie) : tous finis → somme des limites ; infinis tous de même signe
 * → cet infini. Forme ∞ − ∞, limite approchée, inexistante ou non trouvée :
 * null (laissé aux stratégies suivantes).
 *
 * ⚠️ Un terme SANS la variable est sa propre limite et reste tel quel : √2,
 * ln 2, e, π ne passent jamais par une valeur décimale. Les parts rationnelles
 * sont réduites en une seule (1 − 1 → 0), à la place de la première ; une
 * limite décimale n'est jamais rationalisée en « exacte » (null).
 *
 * @example
 * lim_{x→0} sin x / x + √2   // 1 + √2 (pas 241421356237309/100000000000000)
 * lim_{x→0} tan x / x − 1    // 0 (pas « 1 − 1 »)
 */
function trySumOfLimits(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): MathNode | null {
	if (!isAddition(expr) && !isSubtraction(expr)) return null;
	if (nestedSums >= MAX_NESTED_SUMS) return null;

	nestedSums++;
	try {
		const terms = flattenSumShallow(expr);
		if (terms.length < 2) return null;
		// Parts finies, dans l'ordre : rationnelle (cumulée) ou symbolique
		const parts: Array<
			| { readonly kind: 'rational' }
			| { readonly kind: 'symbolic'; readonly sign: '+' | '-'; readonly value: MathNode }
		> = [];
		let rationalTotal: Rational = fromInteger(0);
		let hasRationalPart = false;
		const infiniteSigns = new Set<number>();
		const addFinite = (sign: '+' | '-', value: MathNode): void => {
			const rational = hasDecimalLiteral(value) ? null : exactConstantRational(value);
			if (rational !== null) {
				rationalTotal = addRational(rationalTotal, sign === '+' ? rational : negRational(rational));
				if (!hasRationalPart) parts.push({ kind: 'rational' });
				hasRationalPart = true;
				return;
			}
			parts.push({ kind: 'symbolic', sign, value });
		};
		for (const { sign, term } of terms) {
			const bare = stripDelimiters(term);
			if (!containsVariable(bare, varName)) {
				if (isInfinity(bare)) return null;
				addFinite(sign, bare);
				continue;
			}
			const limit = toFactorLimit(evaluateLimit(bare, varName, approach, dir, options));
			if (limit === null) return null;
			if (limit.kind === 'infinite') {
				infiniteSigns.add(sign === '+' ? limit.sign : -limit.sign);
				continue;
			}
			if (limit.kind === 'zero') continue;
			// Valeur approchée (flottant) : jamais présentée comme exacte
			if (hasDecimalLiteral(limit.value)) return null;
			addFinite(sign, limit.value);
		}
		if (infiniteSigns.size > 1) return null;
		if (infiniteSigns.size === 1) {
			return [...infiniteSigns][0] > 0 ? positiveInfinity() : negativeInfinity();
		}
		let sum: MathNode | null = null;
		for (const part of parts) {
			let sign: '+' | '-';
			let value: MathNode;
			if (part.kind === 'rational') {
				if (isZeroRational(rationalTotal)) continue;
				sign = isNegative(rationalTotal) ? '-' : '+';
				value = rationalToNode(absRational(rationalTotal));
			} else {
				sign = part.sign;
				value = part.value;
			}
			if (sum === null) sum = sign === '+' ? value : opposite(value);
			else sum = sign === '+' ? add(sum, value) : subtract(sum, value);
		}
		return sum ?? number('0');
	} finally {
		nestedSums--;
	}
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
		for (const candidate of rewriteIndeterminateSum(expr, varName)) {
			if (!isInfinity(approach) && candidate.kind !== 'logarithms') continue;
			// ln u − ln v = ln(u/v) n'est une égalité que si u, v > 0 au voisinage :
			// ln(x+1) − ln(x+2) n'est pas défini en −∞ (revue de #907).
			const allPositive = candidate.positiveNear.every((argument) =>
				isPositiveNear(argument, varName, approach, dir)
			);
			if (!allPositive) continue;
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

/**
 * u est-il > 0 au voisinage du point, du côté demandé ? Limite +∞, réel > 0
 * ou 0⁺ prouvés ; −∞, réel < 0, 0 sans signe ou signe inconnu : non.
 */
function isPositiveNear(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection
): boolean {
	const sign = classifyWithSign(expr, varName, approach, dir);
	if (sign.type === 'pos-infinity' || sign.type === 'zero-plus') return true;
	return sign.type === 'finite' && sign.value > 0;
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
					// Irrationnelle (√2, ln 2, π) : gardée symbolique, statut exact.
					// Un décimal à 15 chiffres présenté « exact » se faisait
					// rationaliser plus loin (241421356237309/100000000000000).
					const intValue = Math.round(numValue);
					if (Math.abs(numValue - intValue) < ZERO_TOLERANCE) {
						evaluatedExpr = numericNode(intValue);
					}
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
	// cot, sec, csc → quotients de sin et cos : cot(π/2) se réduit à 0, et un
	// pôle devient un dénominateur nul, visible par le garde ci-dessous.
	const substitutable = rewriteReciprocalTrig(expr);
	// Une valeur FINIE ne vient jamais d'un dénominateur nul au point : 1/cos x
	// en π/2 rendait « 16331239353195370 » (cos(π/2) flottant ≈ 6e-17).
	const finiteAllowed = () =>
		pointInDomain(expr, varName, approach) &&
		!hasVanishingDenominator(substitutable, varName, approach, 'outside-exponent');

	// Un dénominateur nul SOUS un exposant (e^{1/x} en 0) ne bloque pas par
	// lui-même : la substitution exacte du côté demandé fait foi (e^{1/0⁻} = 0).
	// En bilatéral, les deux côtés doivent donner la même valeur : 1/(1+e^{1/x})
	// vaut 1 à gauche, 0 à droite — pas de limite.
	if (
		!hasVanishingDenominator(substitutable, varName, approach, 'outside-exponent') &&
		hasVanishingDenominator(substitutable, varName, approach, 'inside-exponent')
	) {
		return substitutionUnderExponentPole(substitutable, varName, approach, direction, recorder);
	}

	// Try exact evaluation first
	const exactResult = tryDirectSubstitutionExact(
		substitutable,
		varName,
		approach,
		direction,
		recorder
	);
	if (exactResult !== null) {
		// ln(0) « fini » : un pôle logarithmique, pas une valeur — y compris
		// absorbé par un infini : ln(x²−1) − ln(x−1) en 1⁺ rendait « ln 0 + ∞ »
		// = +∞ (x²−1 → 0 sans signe), forme (−∞) − (−∞) en réalité.
		if (containsLogOfZero(exactResult)) return null;
		if (hasLogarithmicPole(substitutable, varName, approach, direction)) return null;
		return isInfinity(exactResult) || finiteAllowed() ? exactResult : null;
	}

	// Fallback to numeric evaluation
	const numericResult = tryDirectSubstitutionNumeric(substitutable, varName, approach, recorder);
	if (numericResult === null) return null;
	return finiteAllowed() ? numericResult : null;
}

/** Un ln de l'expression vaut-il « ln 0 » par substitution exacte ? */
function hasLogarithmicPole(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): boolean {
	return findNodes(
		expr,
		(node) =>
			isFunction(node) &&
			(node.name === 'ln' || node.name === 'log') &&
			containsVariable(node, varName)
	).some((node) => {
		const result = tryEvaluateLimitExact(node, varName, approach, direction);
		if (result === null || isIndeterminateResult(result) || isInfinityResult(result)) return false;
		const value = resultToNode(result);
		return value !== null && containsLogOfZero(value);
	});
}

/** Seuil sous lequel un dénominateur évalué au point est tenu pour nul. */
const VANISHING_DENOMINATOR = 1e-9;

/**
 * Substitution exacte quand le seul pôle est sous un exposant : valeur
 * directionnelle (signed zeros), et en bilatéral, gauche = droite exigé.
 */
function substitutionUnderExponentPole(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorderImpl
): MathNode | null {
	if (direction !== 'both') {
		return tryDirectSubstitutionExact(expr, varName, approach, direction, recorder);
	}
	const left = tryDirectSubstitutionExact(expr, varName, approach, 'left', recorder);
	const right = tryDirectSubstitutionExact(expr, varName, approach, 'right', recorder);
	if (left === null || right === null || !structurallyEqual(left, right)) return null;
	return left;
}

/** Nœuds situés dans un exposant (de e^u, a^u) ou sous exp(…). */
function nodesInsideExponents(expr: MathNode): Set<MathNode> {
	const inside = new Set<MathNode>();
	for (const holder of findNodes(expr, (n) => isSuperscript(n) || isFunction(n))) {
		let root: MathNode | null = null;
		if (isSuperscript(holder)) root = holder.superscript;
		else if (isFunction(holder) && holder.name === 'exp' && holder.args.length === 1) {
			root = holder.args[0];
		}
		if (root !== null) for (const node of findNodes(root, () => true)) inside.add(node);
	}
	return inside;
}

/**
 * Un dénominateur (ou le cos sous un tan) s'annule-t-il numériquement au
 * point ? Alors la substitution ne dit rien : c'est un pôle ou une forme 0/0.
 * `where` restreint aux dénominateurs hors exposant ou sous un exposant.
 */
function hasVanishingDenominator(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	where: 'outside-exponent' | 'inside-exponent'
): boolean {
	const inside = nodesInsideExponents(expr);
	const denominators: MathNode[] = [];
	for (const node of findNodes(expr, (n) => isDivision(n) || isFunction(n))) {
		if (inside.has(node) !== (where === 'inside-exponent')) continue;
		if (isDivision(node)) denominators.push(node.denominator);
		else if (isFunction(node) && node.name === 'tan' && node.args.length === 1) {
			denominators.push(func('cos', [node.args[0]]));
		}
	}
	return denominators.some((den) => {
		if (!containsVariable(den, varName)) return false;
		const value = tryEvaluateNumeric(substituteValue(den, varName, approach));
		return value !== null && Math.abs(value) < VANISHING_DENOMINATOR;
	});
}

/**
 * Une valeur FINIE par substitution directe n'est la limite que si f est
 * définie au point : (x−π)·tan(x/2) en π donnait « 0 » (0 × tan(π/2), pôle
 * avalé par la substitution), alors que la limite vaut −2. Hors du domaine,
 * la substitution s'efface devant les autres stratégies. Domaine non calculé
 * → on garde la substitution (comportement antérieur).
 */
function pointInDomain(expr: MathNode, varName: string, approach: MathNode): boolean {
	// π, π/2 : pas un littéral numérique, mais une valeur approchée suffit ici
	const value = getNumericValue(approach) ?? tryEvaluateNumeric(approach);
	if (value === null) return true;
	try {
		return containsValue(computeDomain(expr, varName).domain, value);
	} catch {
		return true;
	}
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
