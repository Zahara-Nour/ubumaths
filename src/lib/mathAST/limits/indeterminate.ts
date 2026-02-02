/**
 * Indeterminate Form Detection
 *
 * Detects indeterminate forms (0/0, ∞/∞, etc.) for L'Hôpital's rule application.
 * Uses exact arithmetic via normalizeExtended when possible, with fallback to
 * numeric heuristics for transcendental functions.
 *
 * @module mathAST/limits/indeterminate
 */

import type { MathNode } from '../types';
import type { IndeterminateForm, LimitDirection } from './types';
import { isInfinity, isDivision, isMultiplication, isSubtraction, isSuperscript } from '../guards';
import { tryEvaluateLimitExact, isZeroResult, isInfinityResult } from './exact-evaluation';
import { evaluateNumeric, getNumericValue } from '../common';

// =============================================================================
// Limit Value Types
// =============================================================================

/**
 * Possible limit value classifications.
 */
export type LimitValueClass =
	| 'zero' // The value approaches 0
	| 'one' // The value approaches 1
	| 'finite-nonzero' // Approaches a finite non-zero value
	| 'positive-infinity' // +∞
	| 'negative-infinity' // -∞
	| 'infinity' // ±∞ (sign unknown)
	| 'unknown'; // Cannot determine

/**
 * Result of classifying a limit value.
 */
export interface LimitValueClassification {
	readonly class: LimitValueClass;
	readonly numericValue?: number;
}

// =============================================================================
// Numeric Evaluation at Limit Point
// =============================================================================

/**
 * Try to evaluate an expression numerically as variable approaches a point.
 * Returns the value class (zero, finite, infinity, etc.).
 *
 * @param expr - Expression to evaluate
 * @param varName - Variable approaching the limit
 * @param approach - Point being approached
 * @param direction - Direction of approach
 */
export function classifyLimitValue(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection = 'both'
): LimitValueClassification {
	// If approach is infinity, use infinity analysis
	if (isInfinity(approach)) {
		return classifyAtInfinity(expr, varName, approach.sign === 'positive');
	}

	// Otherwise, try direct numerical evaluation
	const approachValue = getNumericValue(approach);
	if (approachValue === null) {
		return { class: 'unknown' };
	}

	return classifyAtFinitePoint(expr, varName, approachValue, direction);
}

/**
 * Classify limit value at a finite point.
 */
function classifyAtFinitePoint(
	expr: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection
): LimitValueClassification {
	// Determine which side to approach from
	const epsilon = 1e-10;
	let testValues: number[];

	if (direction === 'right') {
		testValues = [approachValue + epsilon, approachValue + epsilon / 10];
	} else if (direction === 'left') {
		testValues = [approachValue - epsilon, approachValue - epsilon / 10];
	} else {
		testValues = [
			approachValue + epsilon,
			approachValue - epsilon,
			approachValue + epsilon / 10,
			approachValue - epsilon / 10
		];
	}

	// Evaluate at test points
	const values: number[] = [];
	for (const testVal of testValues) {
		const result = evaluateNumeric(expr, varName, testVal);
		if (result !== null && Number.isFinite(result)) {
			values.push(result);
		}
	}

	if (values.length === 0) {
		// Check for infinity
		const testNear = direction === 'left' ? approachValue - epsilon : approachValue + epsilon;
		const result = evaluateNumeric(expr, varName, testNear);
		if (result !== null) {
			if (result === Infinity) {
				return { class: 'positive-infinity' };
			}
			if (result === -Infinity) {
				return { class: 'negative-infinity' };
			}
		}
		return { class: 'unknown' };
	}

	// Check if values are converging to something
	const lastValue = values[values.length - 1];

	if (Math.abs(lastValue) < 1e-8) {
		return { class: 'zero', numericValue: 0 };
	}
	if (Math.abs(lastValue - 1) < 1e-8) {
		return { class: 'one', numericValue: 1 };
	}

	return { class: 'finite-nonzero', numericValue: lastValue };
}

/**
 * Classify limit value at infinity.
 */
function classifyAtInfinity(
	expr: MathNode,
	varName: string,
	positive: boolean
): LimitValueClassification {
	// Test at large values
	const testValues = positive ? [1e6, 1e8, 1e10] : [-1e6, -1e8, -1e10];

	const values: number[] = [];
	for (const testVal of testValues) {
		const result = evaluateNumeric(expr, varName, testVal);
		if (result !== null) {
			if (result === Infinity) {
				return { class: 'positive-infinity' };
			}
			if (result === -Infinity) {
				return { class: 'negative-infinity' };
			}
			if (Number.isFinite(result)) {
				values.push(result);
			}
		}
	}

	if (values.length === 0) {
		return { class: 'unknown' };
	}

	const lastValue = values[values.length - 1];
	if (Math.abs(lastValue) < 1e-6) {
		return { class: 'zero', numericValue: 0 };
	}
	if (Math.abs(lastValue - 1) < 1e-6) {
		return { class: 'one', numericValue: 1 };
	}

	return { class: 'finite-nonzero', numericValue: lastValue };
}

// =============================================================================
// Indeterminate Form Detection
// =============================================================================

/**
 * Detect the indeterminate form of an expression at a limit point.
 *
 * Uses exact arithmetic via normalizeExtended when possible, with fallback
 * to numeric heuristics for cases involving transcendental functions.
 *
 * @param expr - The expression to analyze
 * @param varName - The variable approaching the limit
 * @param approach - The point being approached
 * @param direction - Direction of approach
 * @returns The indeterminate form, or 'none' if determinate
 */
export function detectIndeterminateForm(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection = 'both'
): IndeterminateForm {
	// Try exact detection first
	const exactResult = detectIndeterminateFormExact(expr, varName, approach, direction);
	if (exactResult !== null) {
		return exactResult;
	}

	// Fallback to numeric detection
	return detectIndeterminateFormNumeric(expr, varName, approach, direction);
}

/**
 * Detect indeterminate form using exact arithmetic.
 * Returns null if exact evaluation fails (e.g., for transcendental functions).
 */
function detectIndeterminateFormExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): IndeterminateForm | null {
	// Division: check for 0/0 or ∞/∞
	if (isDivision(expr)) {
		const numResult = tryEvaluateLimitExact(expr.numerator, varName, approach, direction);
		const denResult = tryEvaluateLimitExact(expr.denominator, varName, approach, direction);

		// If exact evaluation succeeded for both
		if (numResult && denResult) {
			// 0/0
			if (isZeroResult(numResult) && isZeroResult(denResult)) {
				return '0/0';
			}

			// ∞/∞
			if (isInfinityResult(numResult) && isInfinityResult(denResult)) {
				return '∞/∞';
			}

			// Determinate case
			return 'none';
		}
	}

	// Multiplication: check for 0 * ∞
	if (isMultiplication(expr)) {
		const leftResult = tryEvaluateLimitExact(expr.left, varName, approach, direction);
		const rightResult = tryEvaluateLimitExact(expr.right, varName, approach, direction);

		if (leftResult && rightResult) {
			if (
				(isZeroResult(leftResult) && isInfinityResult(rightResult)) ||
				(isInfinityResult(leftResult) && isZeroResult(rightResult))
			) {
				return '0*∞';
			}
			return 'none';
		}
	}

	// Subtraction: check for ∞ - ∞
	if (isSubtraction(expr)) {
		const leftResult = tryEvaluateLimitExact(expr.left, varName, approach, direction);
		const rightResult = tryEvaluateLimitExact(expr.right, varName, approach, direction);

		if (leftResult && rightResult) {
			if (isInfinityResult(leftResult) && isInfinityResult(rightResult)) {
				return '∞-∞';
			}
			return 'none';
		}
	}

	// Power: check for 0^0, ∞^0, 1^∞
	if (isSuperscript(expr)) {
		const baseResult = tryEvaluateLimitExact(expr.base, varName, approach, direction);
		const expResult = tryEvaluateLimitExact(expr.superscript, varName, approach, direction);

		if (baseResult && expResult) {
			// 0^0
			if (isZeroResult(baseResult) && isZeroResult(expResult)) {
				return '0^0';
			}

			// ∞^0
			if (isInfinityResult(baseResult) && isZeroResult(expResult)) {
				return '∞^0';
			}

			// 1^∞ - need to check if base is exactly 1
			if (expResult.type === 'infinity' && baseResult.type === 'normal') {
				// Check if base normalizes to 1
				const baseClass = classifyLimitValue(expr.base, varName, approach, direction);
				if (baseClass.class === 'one') {
					return '1^∞';
				}
			}

			return 'none';
		}
	}

	// Could not determine exactly, return null to trigger numeric fallback
	return null;
}

/**
 * Detect indeterminate form using numeric heuristics.
 * This is the fallback method when exact evaluation fails.
 */
function detectIndeterminateFormNumeric(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): IndeterminateForm {
	// Division: check for 0/0 or ∞/∞
	if (isDivision(expr)) {
		const numClass = classifyLimitValue(expr.numerator, varName, approach, direction);
		const denClass = classifyLimitValue(expr.denominator, varName, approach, direction);

		// 0/0
		if (numClass.class === 'zero' && denClass.class === 'zero') {
			return '0/0';
		}

		// ∞/∞
		if (isInfinityClass(numClass.class) && isInfinityClass(denClass.class)) {
			return '∞/∞';
		}
	}

	// Multiplication: check for 0 * ∞
	if (isMultiplication(expr)) {
		const leftClass = classifyLimitValue(expr.left, varName, approach, direction);
		const rightClass = classifyLimitValue(expr.right, varName, approach, direction);

		if (
			(leftClass.class === 'zero' && isInfinityClass(rightClass.class)) ||
			(isInfinityClass(leftClass.class) && rightClass.class === 'zero')
		) {
			return '0*∞';
		}
	}

	// Subtraction: check for ∞ - ∞
	if (isSubtraction(expr)) {
		const leftClass = classifyLimitValue(expr.left, varName, approach, direction);
		const rightClass = classifyLimitValue(expr.right, varName, approach, direction);

		if (isInfinityClass(leftClass.class) && isInfinityClass(rightClass.class)) {
			return '∞-∞';
		}
	}

	// Power: check for 0^0, ∞^0, 1^∞
	if (isSuperscript(expr)) {
		const baseClass = classifyLimitValue(expr.base, varName, approach, direction);
		const expClass = classifyLimitValue(expr.superscript, varName, approach, direction);

		// 0^0
		if (baseClass.class === 'zero' && expClass.class === 'zero') {
			return '0^0';
		}

		// ∞^0
		if (isInfinityClass(baseClass.class) && expClass.class === 'zero') {
			return '∞^0';
		}

		// 1^∞
		if (baseClass.class === 'one' && isInfinityClass(expClass.class)) {
			return '1^∞';
		}
	}

	return 'none';
}

/**
 * Check if a value class represents infinity.
 */
function isInfinityClass(cls: LimitValueClass): boolean {
	return cls === 'positive-infinity' || cls === 'negative-infinity' || cls === 'infinity';
}
