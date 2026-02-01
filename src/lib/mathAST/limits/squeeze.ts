/**
 * Squeeze Theorem Implementation
 *
 * The squeeze theorem (theorem des gendarmes) states:
 * If g(x) ≤ f(x) ≤ h(x) for all x near a, and lim g(x) = lim h(x) = L,
 * then lim f(x) = L.
 *
 * This module provides utilities for applying the squeeze theorem to
 * common cases like x*sin(1/x) as x → 0.
 *
 * @module mathAST/limits/squeeze
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import type { LimitStepRecorder } from './step-recorder';
import {
	isMultiplication,
	isFunction,
	isDivision,
	isNumber,
	isVariable,
	isInfinity
} from '../guards';
import { number } from '../factory';

// =============================================================================
// Squeeze Theorem Result
// =============================================================================

/**
 * Result of applying the squeeze theorem.
 */
export interface SqueezeResult {
	/** Whether squeeze theorem was applicable */
	readonly applicable: boolean;

	/** The limit value */
	readonly value?: MathNode;

	/** Lower bound function */
	readonly lowerBound?: MathNode;

	/** Upper bound function */
	readonly upperBound?: MathNode;

	/** Description of the squeeze */
	readonly description?: string;
}

// =============================================================================
// Bounded Function Detection
// =============================================================================

/**
 * Check if a function is bounded (returns bounds if so).
 */
export interface BoundedInfo {
	readonly bounded: boolean;
	readonly lower?: number;
	readonly upper?: number;
	readonly functionName?: string;
}

/**
 * Get bounds for a bounded function.
 */
export function getBoundedFunctionInfo(expr: MathNode): BoundedInfo {
	if (!isFunction(expr)) {
		return { bounded: false };
	}

	const name = expr.name.toLowerCase();

	switch (name) {
		case 'sin':
		case 'cos':
			return {
				bounded: true,
				lower: -1,
				upper: 1,
				functionName: name
			};

		case 'arctan':
		case 'atan':
			return {
				bounded: true,
				lower: -Math.PI / 2,
				upper: Math.PI / 2,
				functionName: 'arctan'
			};

		case 'arcsin':
		case 'asin':
			// arcsin is bounded but only defined on [-1, 1]
			return {
				bounded: true,
				lower: -Math.PI / 2,
				upper: Math.PI / 2,
				functionName: 'arcsin'
			};

		case 'tanh':
			return {
				bounded: true,
				lower: -1,
				upper: 1,
				functionName: 'tanh'
			};

		default:
			return { bounded: false };
	}
}

// =============================================================================
// Squeeze Theorem Application
// =============================================================================

/**
 * Try to apply the squeeze theorem to evaluate a limit.
 *
 * Common patterns:
 * - x * sin(1/x) as x → 0: bounded between -|x| and |x|, both → 0
 * - x * cos(anything) as x → 0: same principle
 * - x² * bounded_function as x → 0
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param direction - Direction of approach
 * @param recorder - Step recorder
 */
export function trySqueeze(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): SqueezeResult {
	// Case A: Approach is infinity - look for bounded/x pattern
	if (isInfinity(approach)) {
		return trySqueezeAtInfinity(expr, varName, approach, recorder);
	}

	// Case B: Approach is 0 - look for (something → 0) * (bounded function)
	if (!isMultiplication(expr)) {
		return { applicable: false };
	}

	// Check approach point is 0
	if (!isNumber(approach) || parseFloat(approach.value) !== 0) {
		return { applicable: false };
	}

	// Check if one factor is bounded and other approaches 0
	const leftBounded = getBoundedFunctionInfo(expr.left);
	const rightBounded = getBoundedFunctionInfo(expr.right);

	// Case 1: left approaches 0, right is bounded
	if (rightBounded.bounded && approachesZero(expr.left, varName)) {
		return applySqueeze(expr, expr.left, rightBounded, varName, recorder);
	}

	// Case 2: right approaches 0, left is bounded
	if (leftBounded.bounded && approachesZero(expr.right, varName)) {
		return applySqueeze(expr, expr.right, leftBounded, varName, recorder);
	}

	// Case 3: Check for x * f(1/x) pattern where f is bounded
	const pattern = matchXTimesBoundedOfInverse(expr, varName);
	if (pattern) {
		return applySqueeze(expr, pattern.zeroFactor, pattern.boundedInfo, varName, recorder);
	}

	return { applicable: false };
}

/**
 * Check if an expression approaches 0 as variable approaches 0.
 */
function approachesZero(expr: MathNode, varName: string): boolean {
	// x → 0 as x → 0
	if (isVariable(expr) && expr.name === varName) {
		return true;
	}

	// x^n → 0 as x → 0 (for n > 0)
	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
			const exp = parseFloat(expr.superscript.value);
			return exp > 0;
		}
	}

	// |x| → 0 as x → 0
	if (isFunction(expr) && expr.name.toLowerCase() === 'abs') {
		if (expr.args.length === 1 && isVariable(expr.args[0]) && expr.args[0].name === varName) {
			return true;
		}
	}

	return false;
}

/**
 * Match pattern: x * f(1/x) where f is bounded.
 */
function matchXTimesBoundedOfInverse(
	expr: MathNode,
	varName: string
): { zeroFactor: MathNode; boundedInfo: BoundedInfo } | null {
	if (!isMultiplication(expr)) {
		return null;
	}

	// Check: variable * bounded_function(1/variable)
	if (isVariable(expr.left) && expr.left.name === varName) {
		const boundedInfo = checkBoundedOfInverse(expr.right, varName);
		if (boundedInfo.bounded) {
			return {
				zeroFactor: expr.left,
				boundedInfo
			};
		}
	}

	if (isVariable(expr.right) && expr.right.name === varName) {
		const boundedInfo = checkBoundedOfInverse(expr.left, varName);
		if (boundedInfo.bounded) {
			return {
				zeroFactor: expr.right,
				boundedInfo
			};
		}
	}

	return null;
}

/**
 * Check if expression is a bounded function of 1/x.
 */
function checkBoundedOfInverse(expr: MathNode, varName: string): BoundedInfo {
	if (!isFunction(expr)) {
		return { bounded: false };
	}

	const boundedInfo = getBoundedFunctionInfo(expr);
	if (!boundedInfo.bounded) {
		return { bounded: false };
	}

	// Check if argument is 1/x
	if (expr.args.length !== 1) {
		return { bounded: false };
	}

	const arg = expr.args[0];
	if (isDivision(arg)) {
		if (
			isNumber(arg.numerator) &&
			parseFloat(arg.numerator.value) === 1 &&
			isVariable(arg.denominator) &&
			arg.denominator.name === varName
		) {
			return boundedInfo;
		}
	}

	return { bounded: false };
}

/**
 * Apply the squeeze theorem and record the step.
 */
function applySqueeze(
	expr: MathNode,
	zeroFactor: MathNode,
	boundedInfo: BoundedInfo,
	varName: string,
	recorder: LimitStepRecorder
): SqueezeResult {
	const limitValue = number('0');

	const description = boundedInfo.functionName
		? `La fonction ${boundedInfo.functionName} est bornée entre ${boundedInfo.lower} et ${boundedInfo.upper}, ` +
			`et le facteur tend vers 0`
		: "Produit d'un facteur borné par un facteur tendant vers 0";

	recorder.recordStep(
		'squeeze',
		'Application du théorème des gendarmes',
		expr,
		limitValue,
		'summarized',
		undefined,
		description
	);

	return {
		applicable: true,
		value: limitValue,
		description
	};
}

// =============================================================================
// Squeeze Theorem Bounds Construction
// =============================================================================

/**
 * Construct explicit bounds for visualization/pedagogy.
 *
 * For x * sin(1/x):
 * -|x| ≤ x * sin(1/x) ≤ |x|
 *
 * @param expr - The expression
 * @param varName - The variable
 */
export function constructSqueezeBounds(
	expr: MathNode,
	varName: string
): { lower: MathNode; upper: MathNode } | null {
	if (!isMultiplication(expr)) {
		return null;
	}

	// For x * bounded_function pattern
	const pattern = matchXTimesBoundedOfInverse(expr, varName);
	if (!pattern) {
		return null;
	}

	const { lower = -1, upper = 1 } = pattern.boundedInfo;

	// Bounds are |lower| * |x| and |upper| * |x|
	const absX: MathNode = {
		type: 'function',
		name: 'abs',
		args: [{ type: 'variable', name: varName }]
	};

	const lowerBound: MathNode =
		lower === -1
			? { type: 'opposite', operand: absX }
			: {
					type: 'multiplication',
					left: { type: 'number', value: String(lower) },
					right: absX,
					displayStyle: 'implicit'
				};

	const upperBound: MathNode =
		upper === 1
			? absX
			: {
					type: 'multiplication',
					left: { type: 'number', value: String(upper) },
					right: absX,
					displayStyle: 'implicit'
				};

	return { lower: lowerBound, upper: upperBound };
}

// =============================================================================
// Squeeze Theorem at Infinity
// =============================================================================

/**
 * Try to apply squeeze theorem when x → ±∞.
 *
 * Pattern: bounded_function(x) / x → 0 as x → ±∞
 * Examples:
 * - sin(x)/x → 0 (since |sin(x)| ≤ 1, we have |sin(x)/x| ≤ 1/|x| → 0)
 * - cos(x)/x → 0
 * - sin(x)/x² → 0
 *
 * Also handles: bounded_function(x) / x^n for n ≥ 1
 */
function trySqueezeAtInfinity(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): SqueezeResult {
	// Must be a division
	if (!isDivision(expr)) {
		return { applicable: false };
	}

	// Check if numerator is a bounded function
	const boundedInfo = getBoundedFunctionInfo(expr.numerator);
	if (!boundedInfo.bounded) {
		return { applicable: false };
	}

	// Check if denominator approaches infinity
	if (!approachesInfinity(expr.denominator, varName)) {
		return { applicable: false };
	}

	const limitValue = number('0');

	const description =
		`La fonction ${boundedInfo.functionName} est bornée entre ${boundedInfo.lower} et ${boundedInfo.upper}, ` +
		`donc ${boundedInfo.functionName}(${varName})/(${varName}...) est encadrée par des fonctions tendant vers 0`;

	recorder.recordStep(
		'squeeze',
		"Application du théorème des gendarmes à l'infini",
		expr,
		limitValue,
		'summarized',
		undefined,
		description
	);

	return {
		applicable: true,
		value: limitValue,
		description
	};
}

/**
 * Check if an expression approaches infinity as the variable approaches infinity.
 * Handles: x, x^n (n > 0), |x|
 */
function approachesInfinity(expr: MathNode, varName: string): boolean {
	// x → ∞ as x → ∞
	if (isVariable(expr) && expr.name === varName) {
		return true;
	}

	// x^n → ∞ as x → ∞ (for n > 0)
	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
			const exp = parseFloat(expr.superscript.value);
			return exp > 0;
		}
	}

	// |x| → ∞ as x → ∞
	if (isFunction(expr) && expr.name.toLowerCase() === 'abs') {
		if (expr.args.length === 1 && isVariable(expr.args[0]) && expr.args[0].name === varName) {
			return true;
		}
	}

	return false;
}
