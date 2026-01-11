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

	for (const testVal of testValues) {
		const result = evaluateNumeric(expr, varName, testVal);
		if (result === Infinity) return { type: 'pos-infinity' };
		if (result === -Infinity) return { type: 'neg-infinity' };
	}

	// Check the last finite value
	const lastTest = testValues[testValues.length - 1];
	const lastResult = evaluateNumeric(expr, varName, lastTest);
	if (lastResult !== null && Number.isFinite(lastResult)) {
		if (Math.abs(lastResult) < 1e-6) {
			return lastResult >= 0 ? { type: 'zero-plus' } : { type: 'zero-minus' };
		}
		return { type: 'finite', value: lastResult };
	}

	return { type: 'unknown' };
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
