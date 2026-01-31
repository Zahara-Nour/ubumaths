/**
 * Sign Tracking for Limit Values
 *
 * Tracks the sign of values approaching 0 or infinity,
 * which is critical for composition limits.
 *
 * Uses exact arithmetic via normalizeExtended when possible, with fallback
 * to numeric heuristics for transcendental functions.
 *
 * Examples:
 * - 0+ means approaching 0 from above (positive side)
 * - 0- means approaching 0 from below (negative side)
 *
 * @module mathAST/limits/sign-tracking
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import { isNumber, isInfinity, isSignedZero as isSignedZeroNode } from '../guards';
import { number, positiveInfinity, negativeInfinity, zeroPlus, zeroMinus } from '../factory';
import {
	addExtended,
	subtractExtended,
	multiplyExtended,
	divideExtended,
	lnExtended,
	expExtended,
	sqrtExtended,
	isIndeterminateResult,
	type ExtendedResult,
	type IndeterminateForm
} from '../eval/extended-arithmetic';
import { tryEvaluateLimitExact, resultToNumber } from './exact-evaluation';

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
 * Uses exact arithmetic via normalizeExtended when possible, with fallback
 * to numeric heuristics for cases involving transcendental functions.
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
	// Try exact evaluation first
	const exactResult = classifyWithSignExact(expr, varName, approach, direction);
	if (exactResult !== null) {
		return exactResult;
	}

	// Fallback to numeric classification
	return classifyWithSignNumeric(expr, varName, approach, direction);
}

/**
 * Classify using exact arithmetic via normalizeExtended.
 * Returns null if exact evaluation fails.
 */
function classifyWithSignExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): SignedLimitValue | null {
	const result = tryEvaluateLimitExact(expr, varName, approach, direction);
	if (!result) {
		return null;
	}

	switch (result.type) {
		case 'infinity':
			return result.sign === 'positive' ? { type: 'pos-infinity' } : { type: 'neg-infinity' };

		case 'signed-zero':
			return result.sign === 'positive' ? { type: 'zero-plus' } : { type: 'zero-minus' };

		case 'normal': {
			const numValue = resultToNumber(result);
			if (numValue === null) {
				// Result contains variables or complex radicals - can't classify
				return null;
			}
			if (numValue === 0) {
				// Unsigned zero from normal form
				return { type: 'zero' };
			}
			return { type: 'finite', value: numValue };
		}

		case 'indeterminate':
			// Indeterminate form - cannot classify
			return { type: 'unknown' };
	}
}

/**
 * Classify using numeric heuristics.
 * This is the fallback method when exact evaluation fails.
 */
function classifyWithSignNumeric(
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
 * Delegates to extended-arithmetic module.
 */
export function lnSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = lnExtended(node);
	if (isIndeterminateResult(result)) return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
}

/**
 * Get the sign of exp(x) when x approaches the given signed value.
 * Delegates to extended-arithmetic module.
 */
export function expSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = expExtended(node);
	if (isIndeterminateResult(result)) return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
}

/**
 * Get the sign of sqrt(x) when x approaches the given signed value.
 * Delegates to extended-arithmetic module.
 */
export function sqrtSign(value: SignedLimitValue): SignedLimitValue {
	if (value.type === 'unknown') return { type: 'unknown' };

	const node = signedValueToMathNode(value);
	if (!node) return { type: 'unknown' };

	const result = sqrtExtended(node);
	if (isIndeterminateResult(result)) return { type: 'unknown' };
	return mathNodeToSignedValue(result.value);
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
 * Delegates to extended-arithmetic module.
 */
export function addSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(addExtended(aNode, bNode));
}

/**
 * Subtract two signed limit values (a - b).
 * Delegates to extended-arithmetic module.
 */
export function subtractSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(subtractExtended(aNode, bNode));
}

/**
 * Multiply two signed limit values.
 * Delegates to extended-arithmetic module.
 */
export function multiplySigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(multiplyExtended(aNode, bNode));
}

/**
 * Divide two signed limit values (a / b).
 * Delegates to extended-arithmetic module.
 */
export function divideSigns(a: SignedLimitValue, b: SignedLimitValue): BinaryOpResult {
	if (a.type === 'unknown' || b.type === 'unknown') {
		return { type: 'unknown' };
	}

	const aNode = signedValueToMathNode(a);
	const bNode = signedValueToMathNode(b);
	if (!aNode || !bNode) return { type: 'unknown' };

	return extendedResultToBinaryOp(divideExtended(aNode, bNode));
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
 * Convert a SignedLimitValue to a MathNode.
 * Uses SignedZeroNode for signed zeros, preserving sign information.
 */
export function signedValueToMathNode(value: SignedLimitValue): MathNode | null {
	switch (value.type) {
		case 'pos-infinity':
			return positiveInfinity();
		case 'neg-infinity':
			return negativeInfinity();
		case 'finite':
			return number(cleanNumber(value.value));
		case 'zero-plus':
			return zeroPlus();
		case 'zero-minus':
			return zeroMinus();
		case 'zero':
			return number('0');
		default:
			return null;
	}
}

/**
 * Convert a MathNode to a SignedLimitValue.
 */
export function mathNodeToSignedValue(node: MathNode): SignedLimitValue {
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		if (val === 0) return { type: 'zero' };
		if (Number.isFinite(val)) return { type: 'finite', value: val };
		return { type: 'unknown' };
	}
	if (isInfinity(node)) {
		return node.sign === 'positive' ? { type: 'pos-infinity' } : { type: 'neg-infinity' };
	}
	if (isSignedZeroNode(node)) {
		return node.sign === 'positive' ? { type: 'zero-plus' } : { type: 'zero-minus' };
	}
	return { type: 'unknown' };
}

/**
 * Convert ExtendedResult to BinaryOpResult.
 */
function extendedResultToBinaryOp(result: ExtendedResult): BinaryOpResult {
	if (isIndeterminateResult(result)) {
		// Map indeterminate forms
		const form = result.form as IndeterminateForm;
		if (form === '0/0' || form === '∞/∞' || form === '0·∞' || form === '∞-∞') {
			return { type: 'indeterminate', form };
		}
		// For power-related forms, return unknown
		return { type: 'unknown' };
	}
	return mathNodeToSignedValue(result.value);
}

/**
 * Convert a SignedLimitValue to a MathNode for final output.
 * Unlike signedValueToMathNode, this converts signed zeros to regular numbers
 * since the final limit result should be a NumberNode, not a SignedZeroNode.
 */
export function signedValueToInfinity(value: SignedLimitValue): MathNode | null {
	switch (value.type) {
		case 'pos-infinity':
			return positiveInfinity();
		case 'neg-infinity':
			return negativeInfinity();
		case 'finite':
			return number(cleanNumber(value.value));
		case 'zero':
		case 'zero-plus':
		case 'zero-minus':
			return number('0'); // Convert to regular number for final output
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
