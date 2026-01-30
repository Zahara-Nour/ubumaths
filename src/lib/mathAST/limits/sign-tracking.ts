/**
 * Sign Tracking for Limit Values
 *
 * Tracks the sign of values approaching 0 or infinity,
 * which is critical for composition limits.
 *
 * Examples:
 * - 0+ means approaching 0 from above (positive side)
 * - 0- means approaching 0 from below (negative side)
 *
 * @module mathAST/limits/sign-tracking
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import { isNumber, isInfinity } from '../guards';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended limit value with sign tracking.
 * Used to track whether a value approaches 0 from above/below.
 */
export type SignedLimitValue =
	| { readonly type: 'zero-plus' } // Approaching 0 from above (0+)
	| { readonly type: 'zero-minus' } // Approaching 0 from below (0-)
	| { readonly type: 'zero' } // Approaching 0 (sign unknown)
	| { readonly type: 'pos-infinity' } // +infinity
	| { readonly type: 'neg-infinity' } // -infinity
	| { readonly type: 'finite'; readonly value: number } // Finite non-zero value
	| { readonly type: 'unknown' }; // Cannot determine

// =============================================================================
// Sign Classification
// =============================================================================

/**
 * Classify the limit value with sign tracking.
 * This is critical for composition limits where sign matters.
 *
 * @param expr - Expression to evaluate
 * @param varName - Variable approaching the limit
 * @param approach - Point being approached
 * @param direction - Direction of approach
 */
export function classifyWithSign(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue {
	// Handle infinity approach
	if (isInfinity(approach)) {
		return classifyAtInfinity(expr, varName, approach.sign === 'positive');
	}

	// Handle finite approach
	const approachValue = getNumericValue(approach);
	if (approachValue === null) {
		return { type: 'unknown' };
	}

	return classifyAtFinitePoint(expr, varName, approachValue, direction);
}

/**
 * Classify at a finite point with sign tracking.
 */
function classifyAtFinitePoint(
	expr: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection
): SignedLimitValue {
	// First, check if the expression evaluates at the approach point
	const atApproach = evaluateNumeric(expr, varName, approachValue);

	// If infinity at the approach point AND we're looking at 'both' direction,
	// we can return early. For one-sided limits, we need to evaluate with epsilon
	// to determine the correct sign.
	if (direction === 'both') {
		if (atApproach === Infinity) return { type: 'pos-infinity' };
		if (atApproach === -Infinity) return { type: 'neg-infinity' };
	}

	const isZeroAtApproach =
		atApproach !== null && Number.isFinite(atApproach) && Math.abs(atApproach) < 1e-12;

	// Use multiple epsilon values to detect trend toward 0 or infinity
	const epsilons = [1e-4, 1e-6, 1e-8];

	// Determine test points based on direction
	const testResults: { value: number; epsilon: number }[] = [];

	for (const eps of epsilons) {
		if (direction === 'right' || direction === 'both') {
			const result = evaluateNumeric(expr, varName, approachValue + eps);
			if (result !== null) {
				if (result === Infinity) return { type: 'pos-infinity' };
				if (result === -Infinity) return { type: 'neg-infinity' };
				if (Number.isFinite(result)) testResults.push({ value: result, epsilon: eps });
			}
		}
		if (direction === 'left' || direction === 'both') {
			const result = evaluateNumeric(expr, varName, approachValue - eps);
			if (result !== null) {
				if (result === Infinity) return { type: 'pos-infinity' };
				if (result === -Infinity) return { type: 'neg-infinity' };
				if (Number.isFinite(result)) testResults.push({ value: result, epsilon: eps });
			}
		}
	}

	if (testResults.length === 0) {
		return { type: 'unknown' };
	}

	// Check if values are growing toward infinity (values increase as epsilon decreases)
	if (testResults.length >= 2) {
		const firstAbs = Math.abs(testResults[0].value);
		const lastAbs = Math.abs(testResults[testResults.length - 1].value);
		// If the last value is at least 100x larger than the first, it's growing to infinity
		if (lastAbs > firstAbs * 100 && lastAbs > 1e6) {
			const lastValue = testResults[testResults.length - 1].value;
			return lastValue > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
		}
	}

	// Also check absolute magnitude
	const lastValue = testResults[testResults.length - 1].value;
	if (Math.abs(lastValue) > 1e10) {
		return lastValue > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	// Check if values are converging toward 0
	const valuesDecreasingToZero =
		isZeroAtApproach ||
		testResults.every((r) => Math.abs(r.value) < 1e-3) ||
		(testResults.length >= 2 &&
			Math.abs(testResults[testResults.length - 1].value) < Math.abs(testResults[0].value) * 0.1);

	if (valuesDecreasingToZero || Math.abs(lastValue) < 1e-6) {
		// Determine sign based on the sign of values near the approach point
		if (direction === 'right') {
			const rightValues = testResults.filter((r) => r.epsilon > 0).map((r) => r.value);
			if (rightValues.length > 0) {
				return rightValues.every((v) => v >= 0) ? { type: 'zero-plus' } : { type: 'zero-minus' };
			}
		}
		if (direction === 'left') {
			const leftValues = testResults.map((r) => r.value);
			if (leftValues.length > 0) {
				return leftValues.every((v) => v >= 0) ? { type: 'zero-plus' } : { type: 'zero-minus' };
			}
		}
		// For 'both', check if both sides have same sign
		const allPositive = testResults.every((r) => r.value >= 0);
		const allNegative = testResults.every((r) => r.value < 0);
		if (allPositive) return { type: 'zero-plus' };
		if (allNegative) return { type: 'zero-minus' };
		return { type: 'zero' };
	}

	return { type: 'finite', value: lastValue };
}

/**
 * Classify at infinity.
 */
function classifyAtInfinity(expr: MathNode, varName: string, positive: boolean): SignedLimitValue {
	const testValues = positive ? [1e6, 1e8, 1e10] : [-1e6, -1e8, -1e10];
	const results: number[] = [];

	for (const testVal of testValues) {
		const result = evaluateNumeric(expr, varName, testVal);
		if (result === Infinity) return { type: 'pos-infinity' };
		if (result === -Infinity) return { type: 'neg-infinity' };
		if (result !== null && Number.isFinite(result)) {
			results.push(result);
		}
	}

	if (results.length === 0) {
		return { type: 'unknown' };
	}

	const lastResult = results[results.length - 1];

	// Check if values are growing unboundedly (tending to infinity)
	// If |last| >> |first| and |last| is very large, it's tending to infinity
	if (results.length >= 2) {
		const firstAbs = Math.abs(results[0]);
		const lastAbs = Math.abs(lastResult);

		// If values are growing proportionally with test values, it's tending to infinity
		// e.g., for f(x) = x, results would be [1e6, 1e8, 1e10] - growing by 100x each time
		if (lastAbs > 1e8 && lastAbs > firstAbs * 10) {
			return lastResult > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
		}
	}

	// Check if approaching zero
	if (Math.abs(lastResult) < 1e-6) {
		return lastResult >= 0 ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}

	// Otherwise it's a finite limit
	return { type: 'finite', value: lastResult };
}

// =============================================================================
// Sign Propagation Rules
// =============================================================================

/**
 * Get the sign of 1/x when x approaches the given signed value.
 *
 * 1/0+ = +infinity
 * 1/0- = -infinity
 * 1/+infinity = 0+
 * 1/-infinity = 0-
 */
export function reciprocalSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'pos-infinity' };
		case 'zero-minus':
			return { type: 'neg-infinity' };
		case 'zero':
			return { type: 'unknown' }; // Need one-sided analysis
		case 'pos-infinity':
			return { type: 'zero-plus' };
		case 'neg-infinity':
			return { type: 'zero-minus' };
		case 'finite':
			return { type: 'finite', value: 1 / value.value };
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of -x when x approaches the given signed value.
 *
 * -0+ = 0-
 * -0- = 0+
 * -(+infinity) = -infinity
 * -(-infinity) = +infinity
 */
export function negateSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'zero-minus' };
		case 'zero-minus':
			return { type: 'zero-plus' };
		case 'zero':
			return { type: 'zero' };
		case 'pos-infinity':
			return { type: 'neg-infinity' };
		case 'neg-infinity':
			return { type: 'pos-infinity' };
		case 'finite':
			return { type: 'finite', value: -value.value };
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of x^n when x approaches the given signed value.
 *
 * For even powers: result is always positive (0+ or +infinity)
 * For odd powers: sign is preserved
 */
export function powerSign(value: SignedLimitValue, exponent: number): SignedLimitValue {
	const isEven = exponent % 2 === 0;
	const isPositiveExp = exponent > 0;

	if (isEven) {
		// Even powers always produce positive results
		switch (value.type) {
			case 'zero-plus':
			case 'zero-minus':
			case 'zero':
				return { type: 'zero-plus' };
			case 'pos-infinity':
			case 'neg-infinity':
				return isPositiveExp ? { type: 'pos-infinity' } : { type: 'zero-plus' };
			case 'finite':
				return { type: 'finite', value: Math.pow(value.value, exponent) };
			default:
				return { type: 'unknown' };
		}
	} else {
		// Odd powers preserve sign
		switch (value.type) {
			case 'zero-plus':
				return { type: 'zero-plus' };
			case 'zero-minus':
				return { type: 'zero-minus' };
			case 'zero':
				return { type: 'zero' };
			case 'pos-infinity':
				return isPositiveExp ? { type: 'pos-infinity' } : { type: 'zero-plus' };
			case 'neg-infinity':
				return isPositiveExp ? { type: 'neg-infinity' } : { type: 'zero-minus' };
			case 'finite':
				return { type: 'finite', value: Math.pow(value.value, exponent) };
			default:
				return { type: 'unknown' };
		}
	}
}

/**
 * Get the sign of ln(x) when x approaches the given signed value.
 *
 * ln(0+) = -infinity
 * ln(+infinity) = +infinity
 * ln(1) = 0 (special case)
 */
export function lnSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'neg-infinity' };
		case 'zero-minus':
		case 'zero':
			return { type: 'unknown' }; // ln not defined for negative
		case 'pos-infinity':
			return { type: 'pos-infinity' };
		case 'neg-infinity':
			return { type: 'unknown' }; // ln not defined for negative
		case 'finite':
			if (value.value <= 0) return { type: 'unknown' };
			if (Math.abs(value.value - 1) < 1e-10) {
				// ln(1) = 0, need to check direction for sign
				return { type: 'zero' };
			}
			return { type: 'finite', value: Math.log(value.value) };
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of exp(x) when x approaches the given signed value.
 *
 * exp(+infinity) = +infinity
 * exp(-infinity) = 0+
 * exp(finite) = finite > 0
 */
export function expSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'pos-infinity':
			return { type: 'pos-infinity' };
		case 'neg-infinity':
			return { type: 'zero-plus' };
		case 'finite':
			return { type: 'finite', value: Math.exp(value.value) };
		case 'zero':
		case 'zero-plus':
		case 'zero-minus':
			return { type: 'finite', value: 1 }; // exp(0) = 1
		default:
			return { type: 'unknown' };
	}
}

/**
 * Get the sign of sqrt(x) when x approaches the given signed value.
 *
 * sqrt(0+) = 0+
 * sqrt(+infinity) = +infinity
 */
export function sqrtSign(value: SignedLimitValue): SignedLimitValue {
	switch (value.type) {
		case 'zero-plus':
			return { type: 'zero-plus' };
		case 'zero-minus':
		case 'neg-infinity':
			return { type: 'unknown' }; // sqrt not defined for negative
		case 'zero':
			return { type: 'zero-plus' }; // sqrt of small positive
		case 'pos-infinity':
			return { type: 'pos-infinity' };
		case 'finite':
			if (value.value < 0) return { type: 'unknown' };
			return { type: 'finite', value: Math.sqrt(value.value) };
		default:
			return { type: 'unknown' };
	}
}

// =============================================================================
// Binary Operations (Infinity Algebra)
// =============================================================================

/**
 * Result of a binary operation that may be indeterminate.
 */
export type BinaryOpResult =
	| SignedLimitValue
	| { readonly type: 'indeterminate'; readonly form: '∞-∞' | '0·∞' | '∞/∞' | '0/0' };

/**
 * Check if a binary operation result is indeterminate.
 */
export function isIndeterminate(
	result: BinaryOpResult
): result is { type: 'indeterminate'; form: string } {
	return result.type === 'indeterminate';
}

/**
 * Add two signed limit values.
 *
 * Rules:
 * - +∞ + +∞ = +∞
 * - -∞ + -∞ = -∞
 * - +∞ + -∞ = indeterminate (∞-∞)
 * - ∞ + finite = ∞
 * - finite + finite = finite
 * - 0 + x = x (absorbing for zero)
 */
export function addSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	// Handle unknown
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	// Both infinities
	if (a.type === 'pos-infinity' && b.type === 'pos-infinity') {
		return { type: 'pos-infinity' };
	}
	if (a.type === 'neg-infinity' && b.type === 'neg-infinity') {
		return { type: 'neg-infinity' };
	}
	if (
		(a.type === 'pos-infinity' && b.type === 'neg-infinity') ||
		(a.type === 'neg-infinity' && b.type === 'pos-infinity')
	) {
		return { type: 'indeterminate', form: '∞-∞' };
	}

	// Infinity + finite/zero = infinity
	if (a.type === 'pos-infinity' || a.type === 'neg-infinity') {
		return a;
	}
	if (b.type === 'pos-infinity' || b.type === 'neg-infinity') {
		return b;
	}

	// Both finite
	if (a.type === 'finite' && b.type === 'finite') {
		return { type: 'finite', value: a.value + b.value };
	}

	// Finite + zero = finite
	if (a.type === 'finite' && isSignedZero(b)) {
		return a;
	}
	if (b.type === 'finite' && isSignedZero(a)) {
		return b;
	}

	// Zero + zero
	if (isSignedZero(a) && isSignedZero(b)) {
		// 0+ + 0+ = 0+, 0- + 0- = 0-, otherwise unknown sign
		if (a.type === 'zero-plus' && b.type === 'zero-plus') return { type: 'zero-plus' };
		if (a.type === 'zero-minus' && b.type === 'zero-minus') return { type: 'zero-minus' };
		return { type: 'zero' };
	}

	return { type: 'unknown' };
}

/**
 * Subtract two signed limit values (a - b).
 *
 * Rules:
 * - +∞ - -∞ = +∞
 * - -∞ - +∞ = -∞
 * - +∞ - +∞ = indeterminate (∞-∞)
 * - -∞ - -∞ = indeterminate (∞-∞)
 * - ∞ - finite = ∞
 * - finite - ∞ = -∞ (opposite sign)
 */
export function subtractSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	// a - b = a + (-b)
	return addSigns(a, negateSign(b));
}

/**
 * Multiply two signed limit values.
 *
 * Rules:
 * - +∞ · +∞ = +∞
 * - -∞ · -∞ = +∞
 * - +∞ · -∞ = -∞
 * - ∞ · 0 = indeterminate (0·∞)
 * - ∞ · finite(>0) = ∞ (same sign)
 * - ∞ · finite(<0) = ∞ (opposite sign)
 * - 0 · finite = 0
 */
export function multiplySigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	// Handle unknown
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aIsInf = a.type === 'pos-infinity' || a.type === 'neg-infinity';
	const bIsInf = b.type === 'pos-infinity' || b.type === 'neg-infinity';
	const aIsZero = isSignedZero(a);
	const bIsZero = isSignedZero(b);

	// ∞ · 0 = indeterminate
	if ((aIsInf && bIsZero) || (bIsInf && aIsZero)) {
		return { type: 'indeterminate', form: '0·∞' };
	}

	// Both infinities: sign rule
	if (aIsInf && bIsInf) {
		const aPos = a.type === 'pos-infinity';
		const bPos = b.type === 'pos-infinity';
		return aPos === bPos ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	// Infinity · finite
	if (aIsInf && b.type === 'finite') {
		if (b.value === 0) return { type: 'indeterminate', form: '0·∞' };
		const resultPositive = (a.type === 'pos-infinity') === b.value > 0;
		return resultPositive ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}
	if (bIsInf && a.type === 'finite') {
		if (a.value === 0) return { type: 'indeterminate', form: '0·∞' };
		const resultPositive = (b.type === 'pos-infinity') === a.value > 0;
		return resultPositive ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	// Both finite
	if (a.type === 'finite' && b.type === 'finite') {
		return { type: 'finite', value: a.value * b.value };
	}

	// Zero · finite = zero (with sign)
	if (aIsZero && b.type === 'finite') {
		if (b.value === 0) return { type: 'zero' };
		const aPositive = a.type === 'zero-plus';
		const bPositive = b.value > 0;
		if (a.type === 'zero') return { type: 'zero' };
		return aPositive === bPositive ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}
	if (bIsZero && a.type === 'finite') {
		if (a.value === 0) return { type: 'zero' };
		const aPositive = a.value > 0;
		const bPositive = b.type === 'zero-plus';
		if (b.type === 'zero') return { type: 'zero' };
		return aPositive === bPositive ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}

	// Zero · zero = zero
	if (aIsZero && bIsZero) {
		// Sign: positive if same sign, negative if different
		if (a.type === 'zero' || b.type === 'zero') return { type: 'zero' };
		const aPos = a.type === 'zero-plus';
		const bPos = b.type === 'zero-plus';
		return aPos === bPos ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}

	return { type: 'unknown' };
}

/**
 * Divide two signed limit values (a / b).
 *
 * Rules:
 * - ∞ / ∞ = indeterminate
 * - 0 / 0 = indeterminate
 * - finite / ∞ = 0
 * - ∞ / finite = ∞ (with sign)
 * - finite / 0 = ∞ (with sign, uses reciprocalSign)
 * - 0 / finite = 0
 */
export function divideSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	// Handle unknown
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aIsInf = a.type === 'pos-infinity' || a.type === 'neg-infinity';
	const bIsInf = b.type === 'pos-infinity' || b.type === 'neg-infinity';
	const aIsZero = isSignedZero(a);
	const bIsZero = isSignedZero(b);

	// ∞ / ∞ = indeterminate
	if (aIsInf && bIsInf) {
		return { type: 'indeterminate', form: '∞/∞' };
	}

	// 0 / 0 = indeterminate
	if (aIsZero && bIsZero) {
		return { type: 'indeterminate', form: '0/0' };
	}

	// finite / ∞ = 0
	if (!aIsInf && bIsInf) {
		// Sign of 0 depends on signs of a and b
		if (a.type === 'finite') {
			if (a.value === 0) return { type: 'zero' };
			const aPos = a.value > 0;
			const bPos = b.type === 'pos-infinity';
			return aPos === bPos ? { type: 'zero-plus' } : { type: 'zero-minus' };
		}
		if (aIsZero) {
			return { type: 'zero' };
		}
	}

	// ∞ / finite = ∞
	if (aIsInf && b.type === 'finite') {
		if (b.value === 0) {
			// ∞ / 0 - technically still ∞ but with potential sign issues
			return a; // Keep the infinity
		}
		const aPos = a.type === 'pos-infinity';
		const bPos = b.value > 0;
		return aPos === bPos ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	// finite / 0 = ∞ (via reciprocal)
	if (a.type === 'finite' && bIsZero) {
		if (a.value === 0) return { type: 'indeterminate', form: '0/0' };
		const recipB = reciprocalSign(b);
		if (recipB.type === 'unknown') return { type: 'unknown' };
		return multiplySigns({ type: 'finite', value: a.value }, recipB);
	}

	// 0 / finite = 0
	if (aIsZero && b.type === 'finite') {
		if (b.value === 0) return { type: 'indeterminate', form: '0/0' };
		// Sign of 0 depends on signs
		if (a.type === 'zero') return { type: 'zero' };
		const aPos = a.type === 'zero-plus';
		const bPos = b.value > 0;
		return aPos === bPos ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}

	// Both finite
	if (a.type === 'finite' && b.type === 'finite') {
		if (b.value === 0) {
			// a / 0 where a is non-zero finite
			return a.value > 0 ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
		}
		return { type: 'finite', value: a.value / b.value };
	}

	// ∞ / 0 = ∞ (with sign based on both)
	if (aIsInf && bIsZero) {
		if (b.type === 'zero') return { type: 'unknown' }; // Need sign of zero
		const aPos = a.type === 'pos-infinity';
		const bPos = b.type === 'zero-plus';
		return aPos === bPos ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}

	return { type: 'unknown' };
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

/**
 * Recursively evaluate an expression numerically.
 */
function evaluateNumeric(expr: MathNode, varName: string, varValue: number): number | null {
	switch (expr.type) {
		case 'number': {
			const val = parseFloat(expr.value);
			return Number.isFinite(val) ? val : null;
		}

		case 'variable':
			return expr.name === varName ? varValue : null;

		case 'addition': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left + right;
		}

		case 'subtraction': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left - right;
		}

		case 'multiplication': {
			const left = evaluateNumeric(expr.left, varName, varValue);
			const right = evaluateNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left * right;
		}

		case 'division': {
			const num = evaluateNumeric(expr.numerator, varName, varValue);
			const den = evaluateNumeric(expr.denominator, varName, varValue);
			if (num === null || den === null) return null;
			if (den === 0) {
				return num > 0 ? Infinity : num < 0 ? -Infinity : null;
			}
			return num / den;
		}

		case 'opposite': {
			const operand = evaluateNumeric(expr.operand, varName, varValue);
			return operand !== null ? -operand : null;
		}

		case 'positive':
			return evaluateNumeric(expr.operand, varName, varValue);

		case 'superscript': {
			const base = evaluateNumeric(expr.base, varName, varValue);
			const exp = evaluateNumeric(expr.superscript, varName, varValue);
			if (base === null || exp === null) return null;
			const result = Math.pow(base, exp);
			return Number.isFinite(result) || result === Infinity || result === -Infinity ? result : null;
		}

		case 'function': {
			if (expr.args.length === 1) {
				const arg = evaluateNumeric(expr.args[0], varName, varValue);
				if (arg === null) return null;

				switch (expr.name.toLowerCase()) {
					case 'sin':
						return Math.sin(arg);
					case 'cos':
						return Math.cos(arg);
					case 'tan':
						return Math.tan(arg);
					case 'exp':
						return Math.exp(arg);
					case 'ln':
						return arg > 0 ? Math.log(arg) : arg === 0 ? -Infinity : null;
					case 'sqrt':
						return arg >= 0 ? Math.sqrt(arg) : null;
					case 'abs':
						return Math.abs(arg);
					default:
						return null;
				}
			}
			return null;
		}

		case 'delimiter':
			return evaluateNumeric(expr.content, varName, varValue);

		default:
			return null;
	}
}

/**
 * Convert a SignedLimitValue to a MathNode representing infinity.
 */
export function signedValueToInfinity(value: SignedLimitValue): MathNode | null {
	switch (value.type) {
		case 'pos-infinity':
			return { type: 'infinity', sign: 'positive' };
		case 'neg-infinity':
			return { type: 'infinity', sign: 'negative' };
		case 'finite':
			return { type: 'number', value: cleanNumber(value.value) };
		case 'zero':
		case 'zero-plus':
		case 'zero-minus':
			return { type: 'number', value: '0' };
		default:
			return null;
	}
}

/**
 * Check if a signed value represents infinity (positive or negative).
 */
export function isSignedInfinity(value: SignedLimitValue): boolean {
	return value.type === 'pos-infinity' || value.type === 'neg-infinity';
}

/**
 * Check if a signed value represents zero (any sign).
 */
export function isSignedZero(value: SignedLimitValue): boolean {
	return value.type === 'zero' || value.type === 'zero-plus' || value.type === 'zero-minus';
}

/**
 * Clean a number for string representation.
 */
function cleanNumber(value: number): string {
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}
