/**
 * Indeterminate Form Detection
 *
 * Detects indeterminate forms (0/0, ∞/∞, etc.) for L'Hôpital's rule application.
 *
 * @module mathAST/limits/indeterminate
 */

import type { MathNode } from '../types';
import type { IndeterminateForm, LimitDirection } from './types';
import {
	isNumber,
	isInfinity,
	isDivision,
	isMultiplication,
	isSubtraction,
	isSuperscript
} from '../guards';

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
		const result = evaluateWithSubstitution(expr, varName, testVal);
		if (result !== null && Number.isFinite(result)) {
			values.push(result);
		}
	}

	if (values.length === 0) {
		// Check for infinity
		const testNear = direction === 'left' ? approachValue - epsilon : approachValue + epsilon;
		const result = evaluateWithSubstitution(expr, varName, testNear);
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
		const result = evaluateWithSubstitution(expr, varName, testVal);
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

// =============================================================================
// Helper Functions
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
 * Evaluate an expression with a substitution.
 */
function evaluateWithSubstitution(expr: MathNode, varName: string, value: number): number | null {
	return evaluateNodeNumeric(expr, varName, value);
}

/**
 * Recursively evaluate an expression numerically.
 */
function evaluateNodeNumeric(expr: MathNode, varName: string, varValue: number): number | null {
	switch (expr.type) {
		case 'number': {
			const val = parseFloat(expr.value);
			return Number.isFinite(val) ? val : null;
		}

		case 'variable':
			return expr.name === varName ? varValue : null;

		case 'addition': {
			const left = evaluateNodeNumeric(expr.left, varName, varValue);
			const right = evaluateNodeNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left + right;
		}

		case 'subtraction': {
			const left = evaluateNodeNumeric(expr.left, varName, varValue);
			const right = evaluateNodeNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left - right;
		}

		case 'multiplication': {
			const left = evaluateNodeNumeric(expr.left, varName, varValue);
			const right = evaluateNodeNumeric(expr.right, varName, varValue);
			if (left === null || right === null) return null;
			return left * right;
		}

		case 'division': {
			const num = evaluateNodeNumeric(expr.numerator, varName, varValue);
			const den = evaluateNodeNumeric(expr.denominator, varName, varValue);
			if (num === null || den === null) return null;
			if (den === 0) {
				// Return signed infinity based on numerator sign
				return num > 0 ? Infinity : num < 0 ? -Infinity : null;
			}
			return num / den;
		}

		case 'opposite': {
			const operand = evaluateNodeNumeric(expr.operand, varName, varValue);
			return operand !== null ? -operand : null;
		}

		case 'positive': {
			return evaluateNodeNumeric(expr.operand, varName, varValue);
		}

		case 'superscript': {
			const base = evaluateNodeNumeric(expr.base, varName, varValue);
			const exp = evaluateNodeNumeric(expr.superscript, varName, varValue);
			if (base === null || exp === null) return null;
			const result = Math.pow(base, exp);
			return Number.isFinite(result) || result === Infinity || result === -Infinity ? result : null;
		}

		case 'function': {
			if (expr.args.length === 1) {
				const arg = evaluateNodeNumeric(expr.args[0], varName, varValue);
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
					case 'arcsin':
					case 'asin':
						return arg >= -1 && arg <= 1 ? Math.asin(arg) : null;
					case 'arccos':
					case 'acos':
						return arg >= -1 && arg <= 1 ? Math.acos(arg) : null;
					case 'arctan':
					case 'atan':
						return Math.atan(arg);
					default:
						return null;
				}
			}
			return null;
		}

		case 'delimiter':
			return evaluateNodeNumeric(expr.content, varName, varValue);

		default:
			return null;
	}
}
