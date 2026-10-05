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
	isDelimiter
} from '../guards';
import { divide, opposite, subtract, positiveInfinity, negativeInfinity } from '../factory';
import { findNodes } from '../transforms';
import { isEulerBase } from '../differentiation/rules';
import { expandEulerPowers } from '../normal/rules/euler-power';
import { matchKnownLimit, getKnownLimitValue } from './known-limits';
import { LimitStepRecorderImpl } from './step-recorder';
import { containsVariable } from '../common/contains-variable';
import { detectIndeterminateForm } from './indeterminate';
import { applyLhopital, isLhopitalApplicable } from './lhopital';
import { tryAlgebraicSimplification } from './algebraic';
import { trySqueeze } from './squeeze';
import { evaluateOneSidedLimits, needsOneSidedAnalysis, recordOneSidedSteps } from './one-sided';
import { tryCompositionLimit } from './composition';
import { tryPiecewiseFunctionLimit, containsPiecewiseFunction } from './piecewise';
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
		if (!isNumber(expression) && !isInfinity(expression)) {
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

	// Detect indeterminate form for subsequent strategies
	const indeterminateForm = detectIndeterminateForm(expression, varName, approachPoint, dir);

	// Strategy 3: Try L'Hôpital's rule for 0/0 or ∞/∞
	if (isLhopitalApplicable(expression, varName, approachPoint, dir)) {
		const lhopitalResult = applyLhopital(expression, varName, approachPoint, dir, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value) {
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

		if (!oneSided.twoSidedExists) {
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
// Somme en ±∞ : terme dominant
// =============================================================================

/** Limite réduite à ce qui sert à combiner deux termes. */
type TermLimit =
	| { readonly kind: 'infinite'; readonly sign: 1 | -1 }
	| { readonly kind: 'finite'; readonly value: number };

/** Garde-fou : la levée de ∞ − ∞ rappelle `evaluateLimit` sur un quotient. */
const MAX_DOMINANCE_DEPTH = 3;
let dominanceDepth = 0;

function toTermLimit(result: LimitResult): TermLimit | null {
	const value = result.value;
	if (value === null || value === undefined) return null;
	if (isInfinity(value)) return { kind: 'infinite', sign: value.sign === 'positive' ? 1 : -1 };
	const numeric = getNumericValue(value);
	return numeric === null ? null : { kind: 'finite', value: numeric };
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
	const direct = toTermLimit(
		evaluateLimit(divide(num, den, 'fraction'), varName, approach, dir, options)
	);
	if (direct !== null) return direct;
	const numExponent = exponentialArgument(num);
	const denExponent = exponentialArgument(den);
	if (numExponent === null || denExponent === null) return null;
	// lim (v − u) puis exponentielle : −∞ → 0, +∞ → +∞, c → e^c
	const gap = toTermLimit(
		evaluateLimit(subtract(numExponent, denExponent), varName, approach, dir, options)
	);
	if (gap === null) return null;
	if (gap.kind === 'infinite') {
		return gap.sign === 1 ? { kind: 'infinite', sign: 1 } : { kind: 'finite', value: 0 };
	}
	return { kind: 'finite', value: Math.exp(gap.value) };
}

/**
 * Limite d'une somme `a + b` (ou différence, `b` = −c) en ±∞, terme à terme.
 *
 * Forme ∞ − ∞ : a + b = a·(1 + b/a). Si b/a → 0, a domine (e^x − x : x/e^x → 0,
 * croissance comparée) ; si b/a → ±∞, b domine ; si b/a → L ≠ −1, le signe
 * est celui de a·(1 + L). L = −1 : on ne conclut pas.
 */
function trySumByDominantTerm(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	dir: LimitDirection,
	options: LimitOptions
): { value: MathNode; form: IndeterminateForm; description: string } | null {
	if (!isAddition(expr) && !isSubtraction(expr)) return null;
	if (dominanceDepth >= MAX_DOMINANCE_DEPTH) return null;

	dominanceDepth++;
	try {
		const a = expr.left;
		const b = isSubtraction(expr) ? opposite(expr.right) : expr.right;
		const la = toTermLimit(evaluateLimit(a, varName, approach, dir, options));
		if (la === null) return null;
		const lb = toTermLimit(evaluateLimit(b, varName, approach, dir, options));
		if (lb === null) return null;

		const infinityNode = (sign: 1 | -1): MathNode =>
			sign === 1 ? positiveInfinity() : negativeInfinity();

		// Pas de forme indéterminée : au moins un infini, sans conflit de signe.
		if (la.kind === 'finite' && lb.kind === 'finite') return null;
		if (la.kind === 'finite' || lb.kind === 'finite' || la.sign === lb.sign) {
			const infinite = la.kind === 'infinite' ? la : lb;
			if (infinite.kind !== 'infinite') return null;
			const sign = infinite.sign;
			return {
				value: infinityNode(sign),
				form: 'none',
				description: `Somme des limites : ${sign === 1 ? '+∞' : '-∞'}`
			};
		}

		// Forme ∞ − ∞ : comparer les deux termes, signes mis à part
		// (a = sa·A, b = sb·B, donc b/a = sa·sb·B/A).
		const pa = peelSign(a);
		const pb = peelSign(b);
		const signFactor = pa.sign * pb.sign;
		const ratio = ratioLimit(pb.node, pa.node, varName, approach, dir, options);
		let sign: 1 | -1 | null = null;
		if (ratio !== null) {
			if (ratio.kind === 'infinite') {
				sign = lb.sign;
			} else {
				const onePlusL = 1 + signFactor * ratio.value;
				if (Math.abs(onePlusL) > ZERO_TOLERANCE) sign = onePlusL > 0 ? la.sign : lb.sign;
			}
		} else {
			const inverse = ratioLimit(pa.node, pb.node, varName, approach, dir, options);
			if (inverse !== null && inverse.kind === 'finite' && inverse.value === 0) sign = lb.sign;
		}
		if (sign === null) return null;

		return {
			value: infinityNode(sign),
			form: '∞-∞',
			description: `Forme ∞ − ∞ levée par le terme dominant (croissances comparées) : ${sign === 1 ? '+∞' : '-∞'}`
		};
	} finally {
		dominanceDepth--;
	}
}

/** L'expression contient-elle une puissance de la base d'Euler (`e^u`) ? */
function containsEulerPower(expr: MathNode): boolean {
	return findNodes(expr, (n) => isSuperscript(n) && isEulerBase(n.base)).length > 0;
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
		if (!isNumber(expr) && !isInfinity(expr)) {
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

	// Try L'Hôpital
	if (isLhopitalApplicable(expr, varName, approach, direction)) {
		const lhopitalResult = applyLhopital(expr, varName, approach, direction, recorder, opts);
		if (lhopitalResult.applicable && lhopitalResult.value) {
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
