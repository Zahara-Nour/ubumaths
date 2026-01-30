/**
 * Composition Limits
 *
 * Evaluates limits of composed functions using sign tracking.
 * Handles cases like:
 * - ln(f(x)) when f(x) → 0+ or f(x) → +∞
 * - 1/f(x) when f(x) → 0±
 * - sqrt(f(x)) behavior
 * - -f(x) negation
 * - f(x) when x → ±∞ (polynomials, exp, ln)
 *
 * @module mathAST/limits/composition
 */

import type { MathNode } from '../types';
import type { LimitDirection, LimitRule } from './types';
import type { LimitStepRecorder } from './step-recorder';
import {
	isNumber,
	isInfinity,
	isVariable,
	isDivision,
	isOpposite,
	isFunction,
	isSuperscript,
	isAddition,
	isSubtraction,
	isMultiplication
} from '../guards';
import {
	classifyWithSign,
	negateSign,
	lnSign,
	expSign,
	sqrtSign,
	signedValueToInfinity,
	isSignedInfinity,
	isSignedZero,
	// Binary operations (infinity algebra)
	addSigns,
	subtractSigns,
	multiplySigns,
	divideSigns,
	isIndeterminate,
	type SignedLimitValue
} from './sign-tracking';

// =============================================================================
// Types
// =============================================================================

export interface CompositionResult {
	readonly success: boolean;
	readonly value?: MathNode;
	readonly technique?: LimitRule;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Try to evaluate a limit using composition analysis.
 *
 * This handles cases where:
 * 1. The expression is a function of x approaching ±∞
 * 2. The expression is a composition f(g(x)) where g(x) → boundary
 * 3. The expression is a division 1/f(x) where f(x) → 0
 */
export function tryCompositionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	// Strategy 1: Simple expressions at infinity
	if (isInfinity(approach)) {
		const result = tryElementaryAtInfinity(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 2: Function composition (ln, exp, sqrt of expression)
	if (isFunction(expr) && expr.args.length === 1) {
		const result = tryFunctionComposition(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 3: Division using infinity algebra
	if (isDivision(expr)) {
		const result = tryDivisionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 4: Opposite (negation)
	if (isOpposite(expr)) {
		const result = tryOppositeLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 5: Addition using infinity algebra
	if (isAddition(expr)) {
		const result = tryAdditionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 6: Subtraction using infinity algebra
	if (isSubtraction(expr)) {
		const result = trySubtractionLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	// Strategy 7: Multiplication using infinity algebra
	if (isMultiplication(expr)) {
		const result = tryMultiplicationLimit(expr, varName, approach, direction, recorder);
		if (result.success) return result;
	}

	return { success: false };
}

// =============================================================================
// Elementary Functions at Infinity
// =============================================================================

/**
 * Evaluate elementary functions as x → ±∞.
 * Handles: x, x^n, exp(x), ln(x), and combinations.
 */
function tryElementaryAtInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isInfinity(approach)) return { success: false };

	const positive = approach.sign === 'positive';

	// Case 1: Variable x → ±∞
	if (isVariable(expr) && expr.name === varName) {
		const value: MathNode = positive
			? { type: 'infinity', sign: 'positive' }
			: { type: 'infinity', sign: 'negative' };

		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`La variable ${varName} tend vers ${positive ? '+∞' : '-∞'}`
		);

		return { success: true, value, technique: 'composition' };
	}

	// Case 2: Power x^n → ±∞
	if (isSuperscript(expr) && isVariable(expr.base) && expr.base.name === varName) {
		const exp = getNumericValue(expr.superscript);
		if (exp !== null && exp > 0 && Number.isInteger(exp)) {
			// x^n as x → ±∞
			// Even power: always +∞
			// Odd power: same sign as x
			const isEven = exp % 2 === 0;
			const resultSign = isEven || positive ? 'positive' : 'negative';
			const value: MathNode = { type: 'infinity', sign: resultSign };

			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`${varName}^${exp} tend vers ${resultSign === 'positive' ? '+∞' : '-∞'} quand ${varName} → ${positive ? '+∞' : '-∞'}`
			);

			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 3: exp(x) as x → ±∞
	if (isFunction(expr) && expr.name.toLowerCase() === 'exp' && expr.args.length === 1) {
		const arg = expr.args[0];

		// exp(x) as x → +∞ → +∞
		if (isVariable(arg) && arg.name === varName && positive) {
			const value: MathNode = { type: 'infinity', sign: 'positive' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(${varName}) tend vers +∞ quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}

		// exp(x) as x → -∞ → 0
		if (isVariable(arg) && arg.name === varName && !positive) {
			const value: MathNode = { type: 'number', value: '0' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(${varName}) tend vers 0 quand ${varName} → -∞`
			);
			return { success: true, value, technique: 'composition' };
		}

		// exp(-x) as x → +∞ → 0
		if (isOpposite(arg) && isVariable(arg.operand) && arg.operand.name === varName && positive) {
			const value: MathNode = { type: 'number', value: '0' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`exp(-${varName}) tend vers 0 quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 4: ln(x) as x → +∞ → +∞
	if (isFunction(expr) && expr.name.toLowerCase() === 'ln' && expr.args.length === 1) {
		const arg = expr.args[0];
		if (isVariable(arg) && arg.name === varName && positive) {
			const value: MathNode = { type: 'infinity', sign: 'positive' };
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`ln(${varName}) tend vers +∞ quand ${varName} → +∞`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Case 5: Sum/difference with dominant term at infinity
	if (isAddition(expr) || isSubtraction(expr)) {
		const result = tryDominantTermAtInfinity(expr, varName, approach, recorder);
		if (result.success) return result;
	}

	return { success: false };
}

/**
 * Find the dominant term in a sum/difference at infinity.
 */
function tryDominantTermAtInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isInfinity(approach)) return { success: false };

	const positive = approach.sign === 'positive';

	// Extract terms from the expression
	const terms = extractTerms(expr, varName);
	if (terms.length === 0) return { success: false };

	// Find the term with the highest degree
	let maxDegree = -Infinity;
	let dominantTerm: { coefficient: number; degree: number } | null = null;

	for (const term of terms) {
		if (term.degree > maxDegree) {
			maxDegree = term.degree;
			dominantTerm = term;
		}
	}

	if (dominantTerm === null || maxDegree <= 0) return { success: false };

	// Determine the sign of the limit
	const isEven = maxDegree % 2 === 0;
	const coeffSign = dominantTerm.coefficient >= 0;

	let resultSign: 'positive' | 'negative';
	if (positive) {
		// x → +∞: sign is coefficient sign
		resultSign = coeffSign ? 'positive' : 'negative';
	} else {
		// x → -∞: even power keeps coeff sign, odd power flips it
		resultSign = isEven === coeffSign ? 'positive' : 'negative';
	}

	const value: MathNode = { type: 'infinity', sign: resultSign };
	recorder.recordStepByRule(
		'infinity-analysis',
		expr,
		value,
		'summarized',
		approach,
		`Le terme dominant est de degré ${maxDegree}, la limite est ${resultSign === 'positive' ? '+∞' : '-∞'}`
	);

	return { success: true, value, technique: 'infinity-analysis' };
}

/**
 * Extract polynomial terms from an expression.
 */
function extractTerms(
	expr: MathNode,
	varName: string
): Array<{ coefficient: number; degree: number }> {
	const terms: Array<{ coefficient: number; degree: number }> = [];

	function extractFromNode(node: MathNode, sign: number): void {
		if (isVariable(node) && node.name === varName) {
			terms.push({ coefficient: sign, degree: 1 });
		} else if (isSuperscript(node) && isVariable(node.base) && node.base.name === varName) {
			const exp = getNumericValue(node.superscript);
			if (exp !== null && Number.isInteger(exp)) {
				terms.push({ coefficient: sign, degree: exp });
			}
		} else if (isOpposite(node)) {
			extractFromNode(node.operand, -sign);
		} else if (isMultiplication(node)) {
			// a * x^n
			const coeff = getNumericValue(node.left);
			if (coeff !== null) {
				if (isVariable(node.right) && node.right.name === varName) {
					terms.push({ coefficient: sign * coeff, degree: 1 });
				} else if (
					isSuperscript(node.right) &&
					isVariable(node.right.base) &&
					node.right.base.name === varName
				) {
					const exp = getNumericValue(node.right.superscript);
					if (exp !== null && Number.isInteger(exp)) {
						terms.push({ coefficient: sign * coeff, degree: exp });
					}
				}
			}
		} else if (isAddition(node)) {
			extractFromNode(node.left, sign);
			extractFromNode(node.right, sign);
		} else if (isSubtraction(node)) {
			extractFromNode(node.left, sign);
			extractFromNode(node.right, -sign);
		}
	}

	extractFromNode(expr, 1);
	return terms;
}

// =============================================================================
// Function Composition
// =============================================================================

/**
 * Handle function composition f(g(x)) where g(x) → boundary.
 */
function tryFunctionComposition(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isFunction(expr) || expr.args.length !== 1) return { success: false };

	const funcName = expr.name.toLowerCase();
	const innerExpr = expr.args[0];

	// Classify the inner expression's limit with sign tracking
	const innerLimit = classifyWithSign(innerExpr, varName, approach, direction);

	// Handle ln(g(x))
	if (funcName === 'ln') {
		const result = lnSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value && isSignedInfinity(result)) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				innerLimit.type === 'zero-plus'
					? `ln(0⁺) = -∞`
					: innerLimit.type === 'pos-infinity'
						? `ln(+∞) = +∞`
						: `Limite de ln par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Handle exp(g(x))
	if (funcName === 'exp') {
		const result = expSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`Limite de exp par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	// Handle sqrt(g(x))
	if (funcName === 'sqrt') {
		const result = sqrtSign(innerLimit);
		const value = signedValueToInfinity(result);
		if (value) {
			recorder.recordStepByRule(
				'composition',
				expr,
				value,
				'summarized',
				approach,
				`Limite de sqrt par composition`
			);
			return { success: true, value, technique: 'composition' };
		}
	}

	return { success: false };
}

// =============================================================================
// Opposite (Negation)
// =============================================================================

/**
 * Handle -f(x) where f(x) → ±∞.
 */
function tryOppositeLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isOpposite(expr)) return { success: false };

	const innerExpr = expr.operand;

	// Classify the inner expression's limit
	const innerLimit = classifyWithSign(innerExpr, varName, approach, direction);

	// Apply negation
	const result = negateSign(innerLimit);
	const value = signedValueToInfinity(result);

	if (value && isSignedInfinity(result)) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`Opposé de ${innerLimit.type === 'pos-infinity' ? '+∞' : '-∞'} = ${result.type === 'pos-infinity' ? '+∞' : '-∞'}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Addition with Infinity Algebra
// =============================================================================

/**
 * Handle a + b using infinity algebra.
 * Examples: ∞ + ∞ = ∞, ∞ + finite = ∞, ∞ + (-∞) = indeterminate
 */
function tryAdditionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isAddition(expr)) return { success: false };

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = addSigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} + ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Subtraction with Infinity Algebra
// =============================================================================

/**
 * Handle a - b using infinity algebra.
 * Examples: ∞ - (-∞) = ∞, ∞ - ∞ = indeterminate
 */
function trySubtractionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isSubtraction(expr)) return { success: false };

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = subtractSigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} - ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Multiplication with Infinity Algebra
// =============================================================================

/**
 * Handle a * b using infinity algebra.
 * Examples: ∞ · ∞ = ∞, ∞ · 0 = indeterminate, ∞ · finite = ∞
 */
function tryMultiplicationLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isMultiplication(expr)) return { success: false };

	const leftLimit = classifyWithSign(expr.left, varName, approach, direction);
	const rightLimit = classifyWithSign(expr.right, varName, approach, direction);

	// Only apply if at least one operand involves infinity or zero
	if (!needsInfinityAlgebra(leftLimit, rightLimit)) {
		return { success: false };
	}

	const result = multiplySigns(leftLimit, rightLimit);

	// If indeterminate, don't return a result - let other strategies handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(leftLimit)} · ${formatSignedValue(rightLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Division with Infinity Algebra
// =============================================================================

/**
 * Handle a / b using infinity algebra.
 * Examples: ∞ / ∞ = indeterminate, finite / ∞ = 0, ∞ / finite = ∞, finite / 0 = ∞
 */
function tryDivisionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): CompositionResult {
	if (!isDivision(expr)) return { success: false };

	const numLimit = classifyWithSign(expr.numerator, varName, approach, direction);
	const denLimit = classifyWithSign(expr.denominator, varName, approach, direction);

	// Apply infinity algebra for division when:
	// - At least one operand is infinite, OR
	// - Denominator is zero (finite/0 = ∞)
	const numIsInf = isSignedInfinity(numLimit);
	const denIsInf = isSignedInfinity(denLimit);
	const denIsZero = isSignedZero(denLimit);

	if (!numIsInf && !denIsInf && !denIsZero) {
		return { success: false };
	}

	const result = divideSigns(numLimit, denLimit);

	// If indeterminate, don't return a result - let other strategies (L'Hôpital, etc.) handle it
	if (isIndeterminate(result)) {
		return { success: false };
	}

	const value = signedValueToInfinity(result);
	if (value) {
		recorder.recordStepByRule(
			'composition',
			expr,
			value,
			'summarized',
			approach,
			`${formatSignedValue(numLimit)} / ${formatSignedValue(denLimit)} = ${formatSignedValue(result)}`
		);
		return { success: true, value, technique: 'composition' };
	}

	return { success: false };
}

// =============================================================================
// Infinity Algebra Helpers
// =============================================================================

/**
 * Check if we need to apply infinity algebra.
 *
 * We only apply when at least one operand is INFINITE.
 * Cases with zeros (like 0·bounded) are left to other strategies (squeeze theorem, etc.)
 * unless paired with infinity (0·∞ = indeterminate).
 */
function needsInfinityAlgebra(a: SignedLimitValue, b: SignedLimitValue): boolean {
	const aIsInf = isSignedInfinity(a);
	const bIsInf = isSignedInfinity(b);

	// Apply if at least one is infinite
	if (aIsInf || bIsInf) return true;

	// Also apply for division by zero (finite / 0 = ∞)
	// This is handled separately in tryDivisionLimit

	return false;
}

/**
 * Format a SignedLimitValue for display in step messages.
 */
function formatSignedValue(
	value: SignedLimitValue | { type: 'indeterminate'; form: string }
): string {
	switch (value.type) {
		case 'pos-infinity':
			return '+∞';
		case 'neg-infinity':
			return '-∞';
		case 'zero-plus':
			return '0⁺';
		case 'zero-minus':
			return '0⁻';
		case 'zero':
			return '0';
		case 'finite':
			return String(value.value);
		case 'indeterminate':
			return `FI(${value.form})`;
		case 'unknown':
			return '?';
		default:
			return '?';
	}
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get numeric value from a MathNode.
 */
function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		return Number.isFinite(val) ? val : null;
	}
	return null;
}
