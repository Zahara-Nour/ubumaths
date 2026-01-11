/**
 * Range (image) computation for mathematical expressions.
 *
 * Computes the output range (image) for an expression given an input domain.
 * This is the dual of domain computation: while `computeDomain` finds valid inputs,
 * `computeRange` finds possible outputs.
 */

import type { MathNode } from '../types';
import type { Domain, RangeResult, RangeStep } from './types';
import { universalDomain, intervalDomain, fromNumber, closedInterval } from './factory';
import { containsValue } from './algebra';
import { getBuiltinRange } from './builtins';
import { computeDomain } from './compute';
import { isNegativeInfinity, isPositiveInfinity } from '$lib/mathAST/guards';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for range computation
 */
export interface ComputeRangeOptions {
	/** Restrict input to this domain (default: natural domain Df) */
	domain?: Domain;
	/** Show computation steps for pedagogical display */
	showSteps?: boolean;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compute the output range (image) for an expression.
 *
 * @param expr - The mathematical expression
 * @param variable - The variable (default: 'x')
 * @param options - Configuration options
 * @returns RangeResult with computed range
 *
 * @example
 * // Simple builtin functions
 * computeRange(parseLatex('\\sqrt{x}'), 'x');  // → [0, +∞[
 * computeRange(parseLatex('\\sin{x}'), 'x');   // → [-1, 1]
 *
 * @example
 * // With restricted input domain
 * computeRange(parseLatex('x^2'), 'x', { domain: positiveReals() });  // → ]0, +∞[
 *
 * @example
 * // Compositions
 * computeRange(parseLatex('\\sin{x}^2'), 'x');  // → [0, 1]
 */
export function computeRange(
	expr: MathNode,
	variable: string = 'x',
	options: ComputeRangeOptions = {}
): RangeResult {
	const steps: RangeStep[] = [];

	// Step 1: Determine input domain
	const inputDomain = options.domain ?? computeDomain(expr, variable).domain;

	// If input domain is empty, range is empty
	if (inputDomain.kind === 'empty') {
		return {
			range: { kind: 'empty' },
			variable,
			inputDomain,
			...(options.showSteps ? { steps } : {})
		};
	}

	// Step 2: Compute range based on expression type
	const range = computeRangeNode(expr, variable, inputDomain, steps, options);

	return {
		range,
		variable,
		inputDomain,
		...(options.showSteps ? { steps } : {})
	};
}

// =============================================================================
// Range Computation Logic
// =============================================================================

/**
 * Compute range for a single node.
 */
function computeRangeNode(
	node: MathNode,
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	switch (node.type) {
		case 'number':
			// Constant: range is single point
			return singlePoint(parseFloat(node.value));

		case 'variable':
			// Variable: range equals input domain
			if (node.name === variable) {
				return inputDomain;
			}
			// Other variable: treated as constant (universal range)
			return universalDomain();

		case 'function':
			return computeFunctionRange(node, variable, inputDomain, steps, options);

		case 'addition':
			return computeAdditionRange(node, variable, inputDomain, steps, options);

		case 'subtraction':
			return computeSubtractionRange(node, variable, inputDomain, steps, options);

		case 'multiplication':
			return computeMultiplicationRange(node, variable, inputDomain, steps, options);

		case 'division':
			return computeDivisionRange(node, variable, inputDomain, steps, options);

		case 'opposite':
			return computeOppositeRange(node, variable, inputDomain, steps, options);

		case 'superscript':
			return computePowerRange(node, variable, inputDomain, steps, options);

		default:
			// Unknown node type: return universal (safe fallback)
			return universalDomain();
	}
}

// =============================================================================
// Builtin Function Range
// =============================================================================

/**
 * Compute range for a function call.
 */
function computeFunctionRange(
	node: MathNode & { type: 'function' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	// Get builtin range if known
	const builtinRange = getBuiltinRange(node.name);

	if (node.args.length === 0) {
		// No arguments: just return builtin range or universal
		return builtinRange ?? universalDomain();
	}

	// Compute range of the argument
	const argRange = computeRangeNode(node.args[0], variable, inputDomain, steps, options);

	// If argument range is empty, function range is empty
	if (argRange.kind === 'empty') {
		return { kind: 'empty' };
	}

	// For builtin functions, compose the range
	if (builtinRange) {
		// The function's range is its builtin range
		// (In a more complete implementation, we would intersect with what's
		// actually reachable given the argument's range)
		return builtinRange;
	}

	// Unknown function: return universal
	return universalDomain();
}

// =============================================================================
// Arithmetic Operations Range
// =============================================================================

/**
 * Compute range for addition: f(x) + g(x)
 * Range is Minkowski sum of individual ranges.
 */
function computeAdditionRange(
	node: MathNode & { type: 'addition' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	return minkowskiSum(leftRange, rightRange);
}

/**
 * Compute range for subtraction: f(x) - g(x)
 * Range is Minkowski difference.
 */
function computeSubtractionRange(
	node: MathNode & { type: 'subtraction' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	// a - b where a ∈ [a1, a2] and b ∈ [b1, b2] gives [a1 - b2, a2 - b1]
	return minkowskiDifference(leftRange, rightRange);
}

/**
 * Compute range for multiplication: f(x) * g(x)
 */
function computeMultiplicationRange(
	node: MathNode & { type: 'multiplication' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	return intervalMultiply(leftRange, rightRange);
}

/**
 * Compute range for division: f(x) / g(x)
 */
function computeDivisionRange(
	node: MathNode & { type: 'division' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const numRange = computeRangeNode(node.numerator, variable, inputDomain, steps, options);
	const denRange = computeRangeNode(node.denominator, variable, inputDomain, steps, options);

	// Division by a range that includes 0 can give any value
	if (rangeContainsZero(denRange)) {
		return universalDomain();
	}

	return intervalDivide(numRange, denRange);
}

/**
 * Compute range for opposite: -f(x)
 */
function computeOppositeRange(
	node: MathNode & { type: 'opposite' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const operandRange = computeRangeNode(node.operand, variable, inputDomain, steps, options);
	return negateRange(operandRange);
}

/**
 * Compute range for power: base^exponent
 */
function computePowerRange(
	node: MathNode & { type: 'superscript' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const baseRange = computeRangeNode(node.base, variable, inputDomain, steps, options);

	// Check if exponent is a constant
	if (node.superscript.type === 'number') {
		const exp = parseFloat(node.superscript.value);

		// x^2 on ℝ gives [0, +∞[
		if (exp === 2) {
			return squareRange(baseRange);
		}

		// x^0 = 1 (constant)
		if (exp === 0) {
			return singlePoint(1);
		}

		// x^1 = x
		if (exp === 1) {
			return baseRange;
		}

		// Even positive integer powers
		if (Number.isInteger(exp) && exp > 0 && exp % 2 === 0) {
			return evenPowerRange(baseRange, exp);
		}

		// Odd positive integer powers preserve monotonicity
		if (Number.isInteger(exp) && exp > 0 && exp % 2 === 1) {
			return oddPowerRange(baseRange, exp);
		}
	}

	// Complex exponent: return universal as safe fallback
	return universalDomain();
}

// =============================================================================
// Interval Arithmetic Helpers
// =============================================================================

/**
 * Create a single-point domain.
 */
function singlePoint(value: number): Domain {
	return intervalDomain([closedInterval(fromNumber(value), fromNumber(value))]);
}

/**
 * Check if a range contains zero.
 */
function rangeContainsZero(range: Domain): boolean {
	if (range.kind === 'empty') return false;
	if (range.kind === 'universal') return true;
	return containsValue(range, 0);
}

/**
 * Get bounds of a domain as [lower, upper] or null if unbounded.
 */
function getBounds(domain: Domain): { lower: number | null; upper: number | null } | null {
	if (domain.kind === 'empty') return null;
	if (domain.kind === 'universal') return { lower: null, upper: null };

	if (domain.kind === 'interval_set') {
		const intervals = domain.intervals;
		if (intervals.length === 0) return null;

		// Get overall bounds
		const firstInterval = intervals[0];
		const lastInterval = intervals[intervals.length - 1];

		const lower = isNegativeInfinity(firstInterval.lower.value)
			? null
			: endpointToNumber(firstInterval.lower.value);

		const upper = isPositiveInfinity(lastInterval.upper.value)
			? null
			: endpointToNumber(lastInterval.upper.value);

		return { lower, upper };
	}

	// For other domain types, return universal bounds
	return { lower: null, upper: null };
}

/**
 * Create domain from bounds.
 */
function domainFromBounds(lower: number | null, upper: number | null): Domain {
	if (lower === null && upper === null) {
		return universalDomain();
	}

	if (lower !== null && upper !== null) {
		if (lower > upper) {
			return { kind: 'empty' };
		}
		return intervalDomain([closedInterval(fromNumber(lower), fromNumber(upper))]);
	}

	if (lower !== null) {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(lower), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	// upper !== null
	return intervalDomain([
		{
			kind: 'interval',
			lower: { value: { type: 'infinity', sign: 'negative' }, type: 'open' },
			upper: { value: fromNumber(upper!), type: 'closed' }
		}
	]);
}

/**
 * Minkowski sum of two ranges: [a, b] + [c, d] = [a+c, b+d]
 */
function minkowskiSum(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBounds(a);
	const boundsB = getBounds(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	const lower =
		boundsA.lower !== null && boundsB.lower !== null ? boundsA.lower + boundsB.lower : null;

	const upper =
		boundsA.upper !== null && boundsB.upper !== null ? boundsA.upper + boundsB.upper : null;

	return domainFromBounds(lower, upper);
}

/**
 * Minkowski difference: [a, b] - [c, d] = [a-d, b-c]
 */
function minkowskiDifference(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBounds(a);
	const boundsB = getBounds(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	const lower =
		boundsA.lower !== null && boundsB.upper !== null ? boundsA.lower - boundsB.upper : null;

	const upper =
		boundsA.upper !== null && boundsB.lower !== null ? boundsA.upper - boundsB.lower : null;

	return domainFromBounds(lower, upper);
}

/**
 * Negate a range: -[a, b] = [-b, -a]
 */
function negateRange(domain: Domain): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') return universalDomain();

	const bounds = getBounds(domain);
	if (!bounds) return universalDomain();

	const newLower = bounds.upper !== null ? -bounds.upper : null;
	const newUpper = bounds.lower !== null ? -bounds.lower : null;

	return domainFromBounds(newLower, newUpper);
}

/**
 * Interval multiplication: [a, b] * [c, d]
 * Result is [min(ac, ad, bc, bd), max(ac, ad, bc, bd)]
 */
function intervalMultiply(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBounds(a);
	const boundsB = getBounds(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// If any bound is infinite, result is likely infinite
	if (
		boundsA.lower === null ||
		boundsA.upper === null ||
		boundsB.lower === null ||
		boundsB.upper === null
	) {
		return universalDomain();
	}

	const products = [
		boundsA.lower * boundsB.lower,
		boundsA.lower * boundsB.upper,
		boundsA.upper * boundsB.lower,
		boundsA.upper * boundsB.upper
	];

	return domainFromBounds(Math.min(...products), Math.max(...products));
}

/**
 * Interval division: [a, b] / [c, d] (assuming 0 not in [c, d])
 */
function intervalDivide(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBounds(a);
	const boundsB = getBounds(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// If denominator bounds include infinity or zero, return universal
	if (boundsB.lower === null || boundsB.upper === null) {
		return universalDomain();
	}

	if (boundsB.lower <= 0 && boundsB.upper >= 0) {
		// Division by zero possible
		return universalDomain();
	}

	if (boundsA.lower === null || boundsA.upper === null) {
		return universalDomain();
	}

	const quotients = [
		boundsA.lower / boundsB.lower,
		boundsA.lower / boundsB.upper,
		boundsA.upper / boundsB.lower,
		boundsA.upper / boundsB.upper
	];

	return domainFromBounds(Math.min(...quotients), Math.max(...quotients));
}

/**
 * Square range: x^2 on [a, b]
 * If [a, b] contains 0: [0, max(a^2, b^2)]
 * Otherwise: [min(a^2, b^2), max(a^2, b^2)]
 */
function squareRange(domain: Domain): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') {
		// x^2 on ℝ gives [0, +∞[
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	const bounds = getBounds(domain);
	if (!bounds) return universalDomain();

	// Unbounded domain: x^2 on ]-∞, a] or [b, +∞[ gives [0, +∞[ or [min^2, +∞[
	if (bounds.lower === null || bounds.upper === null) {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	const a = bounds.lower;
	const b = bounds.upper;

	// Check if interval contains 0
	if (a <= 0 && b >= 0) {
		// Contains 0: minimum is 0
		const maxSq = Math.max(a * a, b * b);
		return domainFromBounds(0, maxSq);
	}

	// Doesn't contain 0: both endpoints have same sign
	const minSq = Math.min(a * a, b * b);
	const maxSq = Math.max(a * a, b * b);
	return domainFromBounds(minSq, maxSq);
}

/**
 * Even power range: x^n on [a, b] where n is even
 */
function evenPowerRange(domain: Domain, n: number): Domain {
	// Even powers behave like x^2 but with different values
	if (domain.kind === 'empty') return { kind: 'empty' };

	const bounds = getBounds(domain);
	if (!bounds || bounds.lower === null || bounds.upper === null) {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	const a = bounds.lower;
	const b = bounds.upper;

	if (a <= 0 && b >= 0) {
		const maxPow = Math.max(Math.pow(a, n), Math.pow(b, n));
		return domainFromBounds(0, maxPow);
	}

	const minPow = Math.min(Math.pow(a, n), Math.pow(b, n));
	const maxPow = Math.max(Math.pow(a, n), Math.pow(b, n));
	return domainFromBounds(minPow, maxPow);
}

/**
 * Odd power range: x^n on [a, b] where n is odd
 * Monotonically increasing, so [a^n, b^n]
 */
function oddPowerRange(domain: Domain, n: number): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') return universalDomain();

	const bounds = getBounds(domain);
	if (!bounds) return universalDomain();

	const lower = bounds.lower !== null ? Math.pow(bounds.lower, n) : null;
	const upper = bounds.upper !== null ? Math.pow(bounds.upper, n) : null;

	return domainFromBounds(lower, upper);
}
