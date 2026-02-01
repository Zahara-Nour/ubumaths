/**
 * Piecewise Function Limit Handling
 *
 * Special handling for piecewise functions (floor, ceil, sign) that have
 * jump discontinuities and require direction-aware limit evaluation.
 *
 * @module mathAST/limits/piecewise
 */

import type { MathNode } from '../types';
import type { LimitDirection, LimitRule } from './types';
import type { LimitStepRecorder } from './step-recorder';
import { isFunction, isNumber } from '../guards';
import { findNodes } from '../transforms';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { number } from '../factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of piecewise function limit evaluation.
 */
export interface PiecewiseLimitResult {
	/** Whether the limit was successfully computed */
	readonly success: boolean;
	/** The limit value (if successful) */
	readonly value: MathNode | null;
	/** The technique used */
	readonly technique: LimitRule;
	/** French description of the method */
	readonly description?: string;
}

/**
 * Information about a piecewise function in an expression.
 */
interface PiecewiseFunctionInfo {
	readonly name: 'floor' | 'ceil' | 'sign' | 'sgn';
	readonly argument: MathNode;
	readonly node: MathNode;
}

// =============================================================================
// Detection
// =============================================================================

/**
 * Piecewise function names that require special limit handling.
 */
const PIECEWISE_FUNCTIONS = ['floor', 'ceil', 'sign', 'sgn'] as const;
type PiecewiseFunctionName = (typeof PIECEWISE_FUNCTIONS)[number];

/**
 * Check if a name is a piecewise function name.
 */
function isPiecewiseFunctionName(name: string): name is PiecewiseFunctionName {
	return (PIECEWISE_FUNCTIONS as readonly string[]).includes(name.toLowerCase());
}

/**
 * Check if an expression contains piecewise functions.
 */
export function containsPiecewiseFunction(expr: MathNode): boolean {
	const funcs = findNodes(expr, (node) => isFunction(node) && isPiecewiseFunctionName(node.name));
	return funcs.length > 0;
}

/**
 * Find all piecewise functions in an expression.
 */
function findPiecewiseFunctions(expr: MathNode): PiecewiseFunctionInfo[] {
	const results: PiecewiseFunctionInfo[] = [];

	const funcs = findNodes(expr, (node) => isFunction(node) && isPiecewiseFunctionName(node.name));

	for (const node of funcs) {
		if (isFunction(node) && node.args.length > 0) {
			results.push({
				name: node.name.toLowerCase() as 'floor' | 'ceil' | 'sign' | 'sgn',
				argument: node.args[0],
				node
			});
		}
	}

	return results;
}

// =============================================================================
// Limit Evaluation
// =============================================================================

/**
 * Try to evaluate a limit involving piecewise functions.
 *
 * Handles:
 * - floor(x) at integer points: left limit = n-1, right limit = n
 * - ceil(x) at integer points: left limit = n, right limit = n
 * - sign(x) at zeros: left limit = -1 or +1 depending on derivative sign
 *
 * @param expr - The expression containing piecewise functions
 * @param varName - The variable approaching the limit
 * @param approach - The approach point
 * @param direction - The direction of approach
 * @param recorder - Step recorder for pedagogical output
 * @returns Result with success status and computed value
 */
export function tryPiecewiseFunctionLimit(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	// Only works for finite approach points
	if (!isNumber(approach)) {
		return { success: false, value: null, technique: 'direct-substitution' };
	}

	const approachValue = parseFloat(approach.value);
	if (!Number.isFinite(approachValue)) {
		return { success: false, value: null, technique: 'direct-substitution' };
	}

	// Find piecewise functions in the expression
	const piecewiseFuncs = findPiecewiseFunctions(expr);
	if (piecewiseFuncs.length === 0) {
		return { success: false, value: null, technique: 'direct-substitution' };
	}

	// For simplicity, handle the case where the expression IS a piecewise function
	// (not composed with other operations)
	if (piecewiseFuncs.length === 1 && piecewiseFuncs[0].node === expr) {
		const func = piecewiseFuncs[0];
		return evaluateSimplePiecewiseLimit(func, varName, approachValue, direction, recorder);
	}

	// For composed expressions, evaluate by epsilon substitution
	return evaluateComposedPiecewiseLimit(expr, varName, approachValue, direction, recorder);
}

/**
 * Evaluate limit of a simple piecewise function (floor(x), ceil(x), sign(x)).
 */
function evaluateSimplePiecewiseLimit(
	func: PiecewiseFunctionInfo,
	varName: string,
	approachValue: number,
	direction: LimitDirection,
	recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	const { name, argument } = func;

	// Evaluate the argument at the approach point
	const argAtApproach = evaluateArgumentAt(argument, varName, approachValue);
	if (argAtApproach === null) {
		return { success: false, value: null, technique: 'direct-substitution' };
	}

	// Handle floor function
	if (name === 'floor') {
		return evaluateFloorLimit(argAtApproach, argument, varName, approachValue, direction, recorder);
	}

	// Handle ceil function
	if (name === 'ceil') {
		return evaluateCeilLimit(argAtApproach, argument, varName, approachValue, direction, recorder);
	}

	// Handle sign/sgn function
	if (name === 'sign' || name === 'sgn') {
		return evaluateSignLimit(argAtApproach, argument, varName, approachValue, direction, recorder);
	}

	return { success: false, value: null, technique: 'direct-substitution' };
}

/**
 * Evaluate limit of floor function.
 *
 * floor(x) at integer n:
 * - Left limit: n - 1
 * - Right limit: n
 * - Two-sided limit doesn't exist (jump discontinuity)
 */
function evaluateFloorLimit(
	argAtApproach: number,
	argument: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection,
	recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	const isIntegerArg = Math.abs(argAtApproach - Math.round(argAtApproach)) < 1e-10;
	const n = Math.round(argAtApproach);

	if (!isIntegerArg) {
		// Not at an integer - floor is continuous here
		const value = Math.floor(argAtApproach);
		return {
			success: true,
			value: number(String(value)),
			technique: 'direct-substitution',
			description: `floor(${argAtApproach}) = ${value}`
		};
	}

	// At an integer - need direction-aware evaluation
	if (direction === 'left') {
		// Approaching from left: floor(n - ε) = n - 1
		const value = n - 1;
		recorder?.recordStep(
			'one-sided',
			`Limite à gauche de floor en ${n}`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`floor(${n}⁻) = ${value}`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `floor(x) → ${value} quand x → ${n}⁻`
		};
	}

	if (direction === 'right') {
		// Approaching from right: floor(n + ε) = n
		const value = n;
		recorder?.recordStep(
			'one-sided',
			`Limite à droite de floor en ${n}`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`floor(${n}⁺) = ${value}`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `floor(x) → ${value} quand x → ${n}⁺`
		};
	}

	// direction === 'both': check if limits match
	// Left limit: n - 1, Right limit: n
	// They don't match, so two-sided limit doesn't exist
	// Return null to indicate this (let caller handle the one-sided case)
	return { success: false, value: null, technique: 'one-sided' };
}

/**
 * Evaluate limit of ceil function.
 *
 * ceil(x) at integer n:
 * - Left limit: n
 * - Right limit: n
 * - At integer points, ceil is actually right-continuous
 *
 * Wait, let me reconsider:
 * ceil(2.9) = 3, ceil(3.0) = 3, ceil(3.1) = 4
 * So at x = 3:
 * - Left limit: ceil(3 - ε) = 3
 * - Right limit: ceil(3 + ε) = 4
 */
function evaluateCeilLimit(
	argAtApproach: number,
	argument: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection,
	recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	const isIntegerArg = Math.abs(argAtApproach - Math.round(argAtApproach)) < 1e-10;
	const n = Math.round(argAtApproach);

	if (!isIntegerArg) {
		// Not at an integer - ceil is continuous here
		const value = Math.ceil(argAtApproach);
		return {
			success: true,
			value: number(String(value)),
			technique: 'direct-substitution',
			description: `ceil(${argAtApproach}) = ${value}`
		};
	}

	// At an integer - need direction-aware evaluation
	if (direction === 'left') {
		// Approaching from left: ceil(n - ε) = n
		const value = n;
		recorder?.recordStep(
			'one-sided',
			`Limite à gauche de ceil en ${n}`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`ceil(${n}⁻) = ${value}`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `ceil(x) → ${value} quand x → ${n}⁻`
		};
	}

	if (direction === 'right') {
		// Approaching from right: ceil(n + ε) = n + 1
		// Wait, ceil(3.001) = 4, so right limit at 3 is 4? Let me verify.
		// Actually ceil(3.0) = 3, ceil(3+ε) = 4 for ε > 0
		// So right limit at integer n is n+1? No wait...
		// ceil(n) = n, ceil(n + 0.001) = n + 1
		// So the right limit is n + 1? But that contradicts ceil being right-continuous.
		// Let me reconsider: ceil is LEFT-continuous, not right-continuous.
		// ceil(n - ε) = n, ceil(n + ε) = n + 1
		// So at integer n: left limit = n, right limit = n + 1? No...
		// ceil(2.999) = 3, ceil(3) = 3, ceil(3.001) = 4
		// Left limit at 3: lim(ceil(x), x→3⁻) = lim(ceil(2.999...)) = 3
		// Right limit at 3: lim(ceil(x), x→3⁺) = lim(ceil(3.001...)) = 4
		// So there IS a jump discontinuity at integers!
		const value = n + 1;
		recorder?.recordStep(
			'one-sided',
			`Limite à droite de ceil en ${n}`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`ceil(${n}⁺) = ${value}`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `ceil(x) → ${value} quand x → ${n}⁺`
		};
	}

	// direction === 'both': limits don't match at integers
	return { success: false, value: null, technique: 'one-sided' };
}

/**
 * Evaluate limit of sign function.
 *
 * sign(x) at x = 0:
 * - Left limit: -1
 * - Right limit: +1
 * - Two-sided limit doesn't exist (jump discontinuity)
 *
 * For sign(g(x)) where g(a) = 0:
 * - Need to determine the sign of g near a
 */
function evaluateSignLimit(
	argAtApproach: number,
	argument: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection,
	recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	const isZeroArg = Math.abs(argAtApproach) < 1e-10;

	if (!isZeroArg) {
		// Argument is not zero - sign is continuous here
		const value = Math.sign(argAtApproach);
		return {
			success: true,
			value: number(String(value)),
			technique: 'direct-substitution',
			description: `sign(${argAtApproach}) = ${value}`
		};
	}

	// Argument is zero at approach point - need to determine sign from each side
	const epsilon = 1e-8;

	if (direction === 'left') {
		// Evaluate argument slightly to the left
		const argLeft = evaluateArgumentAt(argument, varName, approachValue - epsilon);
		if (argLeft === null) {
			return { success: false, value: null, technique: 'one-sided' };
		}
		const value = Math.sign(argLeft);
		recorder?.recordStep(
			'one-sided',
			`Limite à gauche de sign`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`sign(g(x)) → ${value} quand x → ${approachValue}⁻`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `sign → ${value} quand x → ${approachValue}⁻`
		};
	}

	if (direction === 'right') {
		// Evaluate argument slightly to the right
		const argRight = evaluateArgumentAt(argument, varName, approachValue + epsilon);
		if (argRight === null) {
			return { success: false, value: null, technique: 'one-sided' };
		}
		const value = Math.sign(argRight);
		recorder?.recordStep(
			'one-sided',
			`Limite à droite de sign`,
			argument,
			number(String(value)),
			'detailed',
			undefined,
			`sign(g(x)) → ${value} quand x → ${approachValue}⁺`
		);
		return {
			success: true,
			value: number(String(value)),
			technique: 'one-sided',
			description: `sign → ${value} quand x → ${approachValue}⁺`
		};
	}

	// direction === 'both': need to check if both sides give the same sign
	const argLeft = evaluateArgumentAt(argument, varName, approachValue - epsilon);
	const argRight = evaluateArgumentAt(argument, varName, approachValue + epsilon);

	if (argLeft === null || argRight === null) {
		return { success: false, value: null, technique: 'one-sided' };
	}

	const signLeft = Math.sign(argLeft);
	const signRight = Math.sign(argRight);

	if (signLeft === signRight) {
		// Same sign on both sides - limit exists
		return {
			success: true,
			value: number(String(signLeft)),
			technique: 'direct-substitution',
			description: `sign → ${signLeft}`
		};
	}

	// Different signs - jump discontinuity, two-sided limit doesn't exist
	return { success: false, value: null, technique: 'one-sided' };
}

/**
 * Evaluate limit of composed expression with piecewise functions.
 * Uses epsilon-neighborhood evaluation.
 */
function evaluateComposedPiecewiseLimit(
	expr: MathNode,
	varName: string,
	approachValue: number,
	direction: LimitDirection,
	_recorder?: LimitStepRecorder
): PiecewiseLimitResult {
	const epsilon = 1e-8;

	if (direction === 'left') {
		const value = evaluateExpressionAt(expr, varName, approachValue - epsilon);
		if (value !== null && Number.isFinite(value)) {
			return {
				success: true,
				value: number(formatNumber(value)),
				technique: 'one-sided'
			};
		}
	}

	if (direction === 'right') {
		const value = evaluateExpressionAt(expr, varName, approachValue + epsilon);
		if (value !== null && Number.isFinite(value)) {
			return {
				success: true,
				value: number(formatNumber(value)),
				technique: 'one-sided'
			};
		}
	}

	if (direction === 'both') {
		const leftValue = evaluateExpressionAt(expr, varName, approachValue - epsilon);
		const rightValue = evaluateExpressionAt(expr, varName, approachValue + epsilon);

		if (leftValue !== null && rightValue !== null) {
			if (Math.abs(leftValue - rightValue) < 1e-6) {
				return {
					success: true,
					value: number(formatNumber(leftValue)),
					technique: 'direct-substitution'
				};
			}
		}
	}

	return { success: false, value: null, technique: 'one-sided' };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Evaluate an argument expression at a specific value.
 */
function evaluateArgumentAt(arg: MathNode, varName: string, value: number): number | null {
	try {
		const substituted = substitute(arg, { [varName]: number(String(value)) });
		const result = evaluateNodeToApproximatedNumber(substituted);
		return Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

/**
 * Evaluate an expression at a specific value.
 */
function evaluateExpressionAt(expr: MathNode, varName: string, value: number): number | null {
	try {
		const substituted = substitute(expr, { [varName]: number(String(value)) });
		const result = evaluateNodeToApproximatedNumber(substituted);
		return Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}

/**
 * Format a number nicely.
 */
function formatNumber(value: number): string {
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}
