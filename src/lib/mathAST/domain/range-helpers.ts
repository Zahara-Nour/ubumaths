/**
 * Range Computation Helpers
 *
 * Advanced pattern matching, polynomial detection, and critical point analysis
 * for computing precise ranges of mathematical expressions.
 */

import type { MathNode } from '../types';
import type { Domain } from './types';
import {
	universalDomain,
	intervalDomain,
	closedInterval,
	interval as makeInterval,
	openEndpoint,
	closedEndpoint,
	posInfinityEndpoint,
	negInfinityEndpoint
} from './factory';
import {
	number,
	positiveInfinity as posInfinityNode,
	negativeInfinity as negInfinityNode
} from '../factory';
import { numericNode } from '../common/numeric';
import { evaluateLimit } from '../limits';
import { getEndpoints, buildInterval } from '$lib/math/intervals';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { tryConvertConditionToInterval } from './algebra';
import { differentiate } from '../differentiation';
import { evaluate, substitute } from '../eval';
import { containsVariable } from '../common/contains-variable';
import { getNumericValue } from '../common/numeric';
import { evaluateAtCriticalPoint, findCriticalPoints } from '../variations/critical-points';

// =============================================================================
// Numeric Bounds Helpers (local to range-helpers)
// =============================================================================

interface NumericBounds {
	lower: number | null; // null = -∞
	upper: number | null; // null = +∞
	lowerInclusive: boolean;
	upperInclusive: boolean;
}

/**
 * Extract numeric bounds from a Domain.
 * Handles all Domain kinds: condition_domain → tryConvertConditionToInterval,
 * periodic_exclusion → universal, interval_set → getEndpoints + endpointToNumber.
 */
function getNumericBounds(domain: Domain): NumericBounds | null {
	if (domain.kind === 'empty') return null;
	if (domain.kind === 'universal') {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}
	if (domain.kind === 'condition_domain') {
		const converted = tryConvertConditionToInterval(domain);
		if (converted) return getNumericBounds(converted);
		return null;
	}
	if (domain.kind === 'periodic_exclusion') {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}
	// interval_set
	const ep = getEndpoints(domain);
	if (!ep) return null;

	const lo = endpointToNumber(ep.lo.value);
	const hi = endpointToNumber(ep.hi.value);

	return {
		lower: lo === -Infinity ? null : lo,
		upper: hi === Infinity ? null : hi,
		lowerInclusive: ep.lo.type === 'closed',
		upperInclusive: ep.hi.type === 'closed'
	};
}

/**
 * Create a Domain from numeric bounds using symbolic buildInterval + number.
 */
function domainFromNumericBounds(bounds: NumericBounds): Domain {
	const { lower, lowerInclusive, upper, upperInclusive } = bounds;

	if (lower === null && upper === null) {
		return universalDomain();
	}

	if (lower !== null && upper !== null && lower > upper) {
		return { kind: 'empty' };
	}

	const lo =
		lower !== null
			? {
					value: numericNode(lower),
					type: lowerInclusive ? ('closed' as const) : ('open' as const)
				}
			: negInfinityEndpoint();
	const hi =
		upper !== null
			? {
					value: numericNode(upper),
					type: upperInclusive ? ('closed' as const) : ('open' as const)
				}
			: posInfinityEndpoint();

	return buildInterval(lo, hi) as Domain;
}

/**
 * Evaluate an expression at a specific numeric value of a variable.
 */
function evalAt(expr: MathNode, varName: string, value: number): number | null {
	try {
		const substituted = substitute(expr, { [varName]: value });
		const result = evaluate(substituted, { mode: 'decimal' });
		if (typeof result.value === 'number' && isFinite(result.value)) {
			return result.value;
		}
	} catch {
		// Evaluation failed
	}
	return null;
}

// =============================================================================
// Pattern Detection Types
// =============================================================================

/**
 * Represents a polynomial in standard form: a_n*x^n + ... + a_1*x + a_0
 */
export interface PolynomialForm {
	/** Coefficients indexed by degree: coeffs[i] = coefficient of x^i */
	coefficients: Map<number, number>;
	/** The variable name */
	variable: string;
	/** The degree of the polynomial */
	degree: number;
}

/**
 * Represents a quadratic in standard form: ax² + bx + c
 */
export interface QuadraticForm {
	a: number;
	b: number;
	c: number;
	variable: string;
}

/**
 * Represents a linear function: ax + b
 */
export interface LinearForm {
	a: number;
	b: number;
	variable: string;
}

/**
 * Represents a rational power: x^(p/q)
 */
export interface RationalPower {
	numerator: number;
	denominator: number;
}

// =============================================================================
// Pattern Detection Functions
// =============================================================================

/**
 * Extract constant value from a node if possible.
 */
export function extractConstant(node: MathNode): number | null {
	return getNumericValue(node);
}

/**
 * Check if a node is constant (doesn't contain the variable).
 */
export function isConstant(node: MathNode, variable: string): boolean {
	return !containsVariable(node, variable);
}

/**
 * Try to extract a linear form: ax + b
 */
export function extractLinear(node: MathNode, variable: string): LinearForm | null {
	// Case 1: Just the variable → 1*x + 0
	if (node.type === 'variable' && node.name === variable) {
		return { a: 1, b: 0, variable };
	}

	// Case 2: Constant → 0*x + c
	if (isConstant(node, variable)) {
		const c = evaluateConstant(node);
		if (c !== null) {
			return { a: 0, b: c, variable };
		}
	}

	// Case 3: a * x
	if (node.type === 'multiplication') {
		const leftConst = isConstant(node.left, variable) ? evaluateConstant(node.left) : null;
		const rightConst = isConstant(node.right, variable) ? evaluateConstant(node.right) : null;

		if (leftConst !== null && node.right.type === 'variable' && node.right.name === variable) {
			return { a: leftConst, b: 0, variable };
		}
		if (rightConst !== null && node.left.type === 'variable' && node.left.name === variable) {
			return { a: rightConst, b: 0, variable };
		}
	}

	// Case 4: x + b or b + x
	if (node.type === 'addition') {
		const leftLinear = extractLinear(node.left, variable);
		const rightLinear = extractLinear(node.right, variable);

		if (leftLinear && rightLinear) {
			return {
				a: leftLinear.a + rightLinear.a,
				b: leftLinear.b + rightLinear.b,
				variable
			};
		}
	}

	// Case 5: x - b or a - x
	if (node.type === 'subtraction') {
		const leftLinear = extractLinear(node.left, variable);
		const rightLinear = extractLinear(node.right, variable);

		if (leftLinear && rightLinear) {
			return {
				a: leftLinear.a - rightLinear.a,
				b: leftLinear.b - rightLinear.b,
				variable
			};
		}
	}

	// Case 6: -x
	if (node.type === 'opposite') {
		const operandLinear = extractLinear(node.operand, variable);
		if (operandLinear) {
			return { a: -operandLinear.a, b: -operandLinear.b, variable };
		}
	}

	return null;
}

/**
 * Try to extract a quadratic form: ax² + bx + c
 */
export function extractQuadratic(node: MathNode, variable: string): QuadraticForm | null {
	// Try to identify quadratic structure
	const coeffs = extractPolynomialCoefficients(node, variable, 2);
	if (!coeffs) return null;

	return {
		a: coeffs.get(2) ?? 0,
		b: coeffs.get(1) ?? 0,
		c: coeffs.get(0) ?? 0,
		variable
	};
}

/**
 * Extract polynomial coefficients up to a given degree.
 */
function extractPolynomialCoefficients(
	node: MathNode,
	variable: string,
	maxDegree: number
): Map<number, number> | null {
	const coeffs = new Map<number, number>();

	// Initialize with zeros
	for (let i = 0; i <= maxDegree; i++) {
		coeffs.set(i, 0);
	}

	if (!extractPolyTerms(node, variable, coeffs, 1, maxDegree)) {
		return null;
	}

	// Check if degree is at most maxDegree
	const maxFound = Math.max(
		...Array.from(coeffs.entries())
			.filter(([, v]) => v !== 0)
			.map(([k]) => k)
	);
	if (maxFound > maxDegree) return null;

	return coeffs;
}

/**
 * Recursively extract polynomial terms.
 */
function extractPolyTerms(
	node: MathNode,
	variable: string,
	coeffs: Map<number, number>,
	multiplier: number,
	maxDegree: number
): boolean {
	// Constant term
	if (isConstant(node, variable)) {
		const c = evaluateConstant(node);
		if (c === null) return false;
		coeffs.set(0, (coeffs.get(0) ?? 0) + multiplier * c);
		return true;
	}

	// Variable alone: x = 1*x^1
	if (node.type === 'variable' && node.name === variable) {
		coeffs.set(1, (coeffs.get(1) ?? 0) + multiplier);
		return true;
	}

	// Addition: a + b
	if (node.type === 'addition') {
		return (
			extractPolyTerms(node.left, variable, coeffs, multiplier, maxDegree) &&
			extractPolyTerms(node.right, variable, coeffs, multiplier, maxDegree)
		);
	}

	// Subtraction: a - b
	if (node.type === 'subtraction') {
		return (
			extractPolyTerms(node.left, variable, coeffs, multiplier, maxDegree) &&
			extractPolyTerms(node.right, variable, coeffs, -multiplier, maxDegree)
		);
	}

	// Opposite: -a
	if (node.type === 'opposite') {
		return extractPolyTerms(node.operand, variable, coeffs, -multiplier, maxDegree);
	}

	// Power: x^n
	if (node.type === 'superscript') {
		if (node.base.type === 'variable' && node.base.name === variable) {
			const expVal = extractConstant(node.superscript);
			if (expVal !== null && Number.isInteger(expVal) && expVal >= 0 && expVal <= maxDegree) {
				coeffs.set(expVal, (coeffs.get(expVal) ?? 0) + multiplier);
				return true;
			}
		}
		return false;
	}

	// Multiplication
	if (node.type === 'multiplication') {
		// c * x^n or c * x
		const leftConst = isConstant(node.left, variable) ? evaluateConstant(node.left) : null;
		const rightConst = isConstant(node.right, variable) ? evaluateConstant(node.right) : null;

		if (leftConst !== null) {
			return extractPolyTerms(node.right, variable, coeffs, multiplier * leftConst, maxDegree);
		}
		if (rightConst !== null) {
			return extractPolyTerms(node.left, variable, coeffs, multiplier * rightConst, maxDegree);
		}

		// x * x = x^2
		if (
			node.left.type === 'variable' &&
			node.left.name === variable &&
			node.right.type === 'variable' &&
			node.right.name === variable
		) {
			coeffs.set(2, (coeffs.get(2) ?? 0) + multiplier);
			return true;
		}

		return false;
	}

	// Delimiter (parentheses)
	if (node.type === 'delimiter') {
		return extractPolyTerms(node.content, variable, coeffs, multiplier, maxDegree);
	}

	return false;
}

/**
 * Evaluate a constant expression to a number.
 */
export function evaluateConstant(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		if (typeof result.value === 'number' && isFinite(result.value)) {
			return result.value;
		}
	} catch {
		// Fallback to pattern matching
	}

	// Direct constant extraction
	const val = extractConstant(node);
	if (val !== null) return val;

	return null;
}

/**
 * Try to extract a rational power from an exponent node.
 * Detects patterns like: 1/2, 1/3, 2/3, n/d where n, d are integers.
 */
export function extractRationalPower(expNode: MathNode): RationalPower | null {
	// Direct fraction: n/d
	if (expNode.type === 'division') {
		const num = extractConstant(expNode.numerator);
		const den = extractConstant(expNode.denominator);

		if (
			num !== null &&
			den !== null &&
			Number.isInteger(num) &&
			Number.isInteger(den) &&
			den !== 0
		) {
			return { numerator: num, denominator: den };
		}
	}

	// Check for common decimal values that represent fractions
	const val = extractConstant(expNode);
	if (val !== null) {
		// Check common fractions
		const commonFractions: [number, number, number][] = [
			[0.5, 1, 2],
			[1 / 3, 1, 3],
			[2 / 3, 2, 3],
			[0.25, 1, 4],
			[0.75, 3, 4],
			[0.2, 1, 5],
			[0.4, 2, 5],
			[0.6, 3, 5],
			[0.8, 4, 5],
			[1 / 6, 1, 6],
			[5 / 6, 5, 6]
		];

		for (const [decimal, num, den] of commonFractions) {
			if (Math.abs(val - decimal) < 1e-10) {
				return { numerator: num, denominator: den };
			}
			if (Math.abs(val + decimal) < 1e-10) {
				return { numerator: -num, denominator: den };
			}
		}

		// If it's an integer, return it as n/1
		if (Number.isInteger(val)) {
			return { numerator: val, denominator: 1 };
		}
	}

	return null;
}

// =============================================================================
// Quadratic Range Computation
// =============================================================================

/**
 * Compute the range of a quadratic ax² + bx + c on a given domain.
 *
 * Uses the vertex formula: vertex at x = -b/(2a), value = c - b²/(4a)
 */
export function computeQuadraticRange(quad: QuadraticForm, inputDomain: Domain): Domain {
	const { a, b, c } = quad;

	// If a = 0, it's linear
	if (Math.abs(a) < 1e-10) {
		return computeLinearRange({ a: b, b: c, variable: quad.variable }, inputDomain);
	}

	const bounds = getNumericBounds(inputDomain);
	if (!bounds) return universalDomain();

	// Handle unbounded domains
	if (bounds.lower === null || bounds.upper === null) {
		// Unbounded domain: range depends on sign of a
		if (a > 0) {
			// Opens upward: minimum at vertex
			const vertexY = c - (b * b) / (4 * a);
			return domainFromNumericBounds({
				lower: vertexY,
				lowerInclusive: true,
				upper: null,
				upperInclusive: false
			});
		} else {
			// Opens downward: maximum at vertex
			const vertexY = c - (b * b) / (4 * a);
			return domainFromNumericBounds({
				lower: null,
				lowerInclusive: false,
				upper: vertexY,
				upperInclusive: true
			});
		}
	}

	// Bounded domain: evaluate at endpoints and vertex (if in domain)
	const vertexX = -b / (2 * a);
	const vertexY = c - (b * b) / (4 * a);

	const lowerY = a * bounds.lower * bounds.lower + b * bounds.lower + c;
	const upperY = a * bounds.upper * bounds.upper + b * bounds.upper + c;

	const values: { value: number; inclusive: boolean }[] = [
		{ value: lowerY, inclusive: bounds.lowerInclusive },
		{ value: upperY, inclusive: bounds.upperInclusive }
	];

	// Check if vertex is in domain
	if (vertexX >= bounds.lower && vertexX <= bounds.upper) {
		// Vertex is interior, so always achievable
		values.push({ value: vertexY, inclusive: true });
	}

	// Find min and max
	let minVal = { value: Infinity, inclusive: false };
	let maxVal = { value: -Infinity, inclusive: false };

	for (const v of values) {
		if (v.value < minVal.value) {
			minVal = v;
		} else if (v.value === minVal.value && v.inclusive) {
			minVal.inclusive = true;
		}

		if (v.value > maxVal.value) {
			maxVal = v;
		} else if (v.value === maxVal.value && v.inclusive) {
			maxVal.inclusive = true;
		}
	}

	return domainFromNumericBounds({
		lower: minVal.value,
		lowerInclusive: minVal.inclusive,
		upper: maxVal.value,
		upperInclusive: maxVal.inclusive
	});
}

/**
 * Compute the range of a linear function ax + b on a given domain.
 */
export function computeLinearRange(linear: LinearForm, inputDomain: Domain): Domain {
	const { a, b } = linear;

	// Constant function
	if (Math.abs(a) < 1e-10) {
		return intervalDomain([closedInterval(numericNode(b), numericNode(b))]);
	}

	const bounds = getNumericBounds(inputDomain);
	if (!bounds) return universalDomain();

	// Handle unbounded domains
	if (bounds.lower === null && bounds.upper === null) {
		return universalDomain();
	}

	// Compute range
	let newLower: number | null = null;
	let newUpper: number | null = null;
	let newLowerInclusive = true;
	let newUpperInclusive = true;

	if (a > 0) {
		// Increasing
		if (bounds.lower !== null) {
			newLower = a * bounds.lower + b;
			newLowerInclusive = bounds.lowerInclusive;
		}
		if (bounds.upper !== null) {
			newUpper = a * bounds.upper + b;
			newUpperInclusive = bounds.upperInclusive;
		}
	} else {
		// Decreasing
		if (bounds.upper !== null) {
			newLower = a * bounds.upper + b;
			newLowerInclusive = bounds.upperInclusive;
		}
		if (bounds.lower !== null) {
			newUpper = a * bounds.lower + b;
			newUpperInclusive = bounds.lowerInclusive;
		}
	}

	return domainFromNumericBounds({
		lower: newLower,
		lowerInclusive: newLowerInclusive,
		upper: newUpper,
		upperInclusive: newUpperInclusive
	});
}

// =============================================================================
// Absolute Value Range
// =============================================================================

/**
 * Compute |D| where D is an interval domain.
 *
 * Algebraic approach (no sampling):
 * - If D ⊂ [0, +∞): |D| = D
 * - If D ⊂ (-∞, 0]: |D| = -D (negated)
 * - If D = [a, b] with a < 0 < b: |D| = [0, max(|a|, b)]
 */
export function computeAbsRange(inputRange: Domain): Domain {
	if (inputRange.kind === 'empty') return { kind: 'empty' };
	if (inputRange.kind === 'universal') {
		// |ℝ| = [0, +∞)
		return domainFromNumericBounds({
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false
		});
	}

	const bounds = getNumericBounds(inputRange);
	if (!bounds) {
		return domainFromNumericBounds({
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false
		});
	}

	const lower = bounds.lower;
	const upper = bounds.upper;

	// Case 1: All non-negative
	if (lower !== null && lower >= 0) {
		return inputRange;
	}

	// Case 2: All non-positive
	if (upper !== null && upper <= 0) {
		// Negate the interval: -[a, b] = [-b, -a]
		return domainFromNumericBounds({
			lower: upper !== null ? -upper : null,
			lowerInclusive: bounds.upperInclusive,
			upper: lower !== null ? -lower : null,
			upperInclusive: bounds.lowerInclusive
		});
	}

	// Case 3: Interval spans zero
	// [a, b] with a < 0 < b → [0, max(|a|, b)]
	const absLower = lower !== null ? Math.abs(lower) : null;
	const absUpper = upper !== null ? Math.abs(upper) : null;

	let maxAbs: number | null = null;
	let maxAbsInclusive = false;

	if (absLower !== null && absUpper !== null) {
		if (absLower > absUpper) {
			maxAbs = absLower;
			maxAbsInclusive = bounds.lowerInclusive;
		} else if (absUpper > absLower) {
			maxAbs = absUpper;
			maxAbsInclusive = bounds.upperInclusive;
		} else {
			maxAbs = absLower;
			maxAbsInclusive = bounds.lowerInclusive || bounds.upperInclusive;
		}
	} else if (absLower !== null) {
		maxAbs = absLower;
		maxAbsInclusive = bounds.lowerInclusive;
	} else if (absUpper !== null) {
		maxAbs = absUpper;
		maxAbsInclusive = bounds.upperInclusive;
	}

	return domainFromNumericBounds({
		lower: 0,
		lowerInclusive: true, // 0 is always achievable when interval contains 0
		upper: maxAbs,
		upperInclusive: maxAbsInclusive
	});
}

// =============================================================================
// Min/Max Range
// =============================================================================

/**
 * Compute min(A, B) where A and B are interval domains.
 */
export function computeMinRange(aRange: Domain, bRange: Domain): Domain {
	if (aRange.kind === 'empty' || bRange.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getNumericBounds(aRange);
	const boundsB = getNumericBounds(bRange);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// min([a1, a2], [b1, b2]) = [min(a1, b1), min(a2, b2)]
	let lower: number | null = null;
	let lowerInclusive = false;
	let upper: number | null = null;
	let upperInclusive = false;

	// Lower bound of min
	if (boundsA.lower !== null && boundsB.lower !== null) {
		lower = Math.min(boundsA.lower, boundsB.lower);
		if (boundsA.lower < boundsB.lower) {
			lowerInclusive = boundsA.lowerInclusive;
		} else if (boundsB.lower < boundsA.lower) {
			lowerInclusive = boundsB.lowerInclusive;
		} else {
			lowerInclusive = boundsA.lowerInclusive || boundsB.lowerInclusive;
		}
	} else if (boundsA.lower !== null) {
		lower = boundsA.lower;
		lowerInclusive = boundsA.lowerInclusive;
	} else if (boundsB.lower !== null) {
		lower = boundsB.lower;
		lowerInclusive = boundsB.lowerInclusive;
	}

	// Upper bound of min
	if (boundsA.upper !== null && boundsB.upper !== null) {
		upper = Math.min(boundsA.upper, boundsB.upper);
		if (boundsA.upper < boundsB.upper) {
			upperInclusive = boundsA.upperInclusive;
		} else if (boundsB.upper < boundsA.upper) {
			upperInclusive = boundsB.upperInclusive;
		} else {
			upperInclusive = boundsA.upperInclusive && boundsB.upperInclusive;
		}
	}
	// Note: if one is null and the other isn't, min is bounded by the non-null one
	// but for min, the upper bound should be the minimum of the two, so we take the non-null one only if it's smaller

	return domainFromNumericBounds({ lower, lowerInclusive, upper, upperInclusive });
}

/**
 * Compute max(A, B) where A and B are interval domains.
 */
export function computeMaxRange(aRange: Domain, bRange: Domain): Domain {
	if (aRange.kind === 'empty' || bRange.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getNumericBounds(aRange);
	const boundsB = getNumericBounds(bRange);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// max([a1, a2], [b1, b2]) = [max(a1, b1), max(a2, b2)]
	let lower: number | null = null;
	let lowerInclusive = false;
	let upper: number | null = null;
	let upperInclusive = false;

	// Lower bound of max
	if (boundsA.lower !== null && boundsB.lower !== null) {
		lower = Math.max(boundsA.lower, boundsB.lower);
		if (boundsA.lower > boundsB.lower) {
			lowerInclusive = boundsA.lowerInclusive;
		} else if (boundsB.lower > boundsA.lower) {
			lowerInclusive = boundsB.lowerInclusive;
		} else {
			lowerInclusive = boundsA.lowerInclusive && boundsB.lowerInclusive;
		}
	}

	// Upper bound of max
	if (boundsA.upper !== null && boundsB.upper !== null) {
		upper = Math.max(boundsA.upper, boundsB.upper);
		if (boundsA.upper > boundsB.upper) {
			upperInclusive = boundsA.upperInclusive;
		} else if (boundsB.upper > boundsA.upper) {
			upperInclusive = boundsB.upperInclusive;
		} else {
			upperInclusive = boundsA.upperInclusive || boundsB.upperInclusive;
		}
	} else if (boundsA.upper !== null) {
		upper = boundsA.upper;
		upperInclusive = boundsA.upperInclusive;
	} else if (boundsB.upper !== null) {
		upper = boundsB.upper;
		upperInclusive = boundsB.upperInclusive;
	}

	return domainFromNumericBounds({ lower, lowerInclusive, upper, upperInclusive });
}

// =============================================================================
// Critical Point Analysis
// =============================================================================

/**
 * Recursively strip delimiter (parentheses) nodes from an expression tree.
 *
 * Needed because `differentiate` may produce delimiter wrappers that confuse
 * `solve`'s coefficient extraction (flattenSumShallow stops at delimiters).
 */
function stripDelimiters(node: MathNode): MathNode {
	if (node.type === 'delimiter') return stripDelimiters(node.content);

	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return { ...node, left: stripDelimiters(node.left), right: stripDelimiters(node.right) };
		case 'division':
			return {
				...node,
				numerator: stripDelimiters(node.numerator),
				denominator: stripDelimiters(node.denominator)
			};
		case 'opposite':
		case 'positive':
			return { ...node, operand: stripDelimiters(node.operand) };
		case 'superscript':
			return {
				...node,
				base: stripDelimiters(node.base),
				superscript: stripDelimiters(node.superscript)
			};
		case 'function':
			return { ...node, args: node.args.map(stripDelimiters) };
		default:
			return node;
	}
}

/**
 * Result of exact range computation, including symbolic MathNode bounds.
 */
export interface ExactRangeResult {
	/** The Domain with numeric bounds */
	domain: Domain;
	/** The exact lower bound as a MathNode */
	lowerNode: MathNode;
	/** The exact upper bound as a MathNode */
	upperNode: MathNode;
	/** Numeric approximation of the lower bound */
	lowerApproximate: number;
	/** Numeric approximation of the upper bound */
	upperApproximate: number;
	/** Whether the lower bound is inclusive */
	lowerInclusive: boolean;
	/** Whether the upper bound is inclusive */
	upperInclusive: boolean;
}

/**
 * Compute exact range using the closed interval method, extended with limits.
 *
 * For a differentiable function on [a, b]:
 *   Range = {f(a), f(b)} ∪ {f(c) : c is critical point in (a, b)}
 *
 * For unbounded domains, uses evaluateLimit at ±∞ to determine behavior.
 *
 * Uses the exact solver and symbolic evaluation for precise MathNode bounds.
 * Returns null if endpoints can't be evaluated or solver fails.
 */
export function computeRangeWithCriticalPointsExact(
	expr: MathNode,
	variable: string,
	domain: Domain
): ExactRangeResult | null {
	const bounds = getNumericBounds(domain);
	if (!bounds) return null;

	try {
		const candidates: { node: MathNode; approximate: number; inclusive: boolean }[] = [];
		let lowerIsInfinite = false; // range extends to -∞
		let upperIsInfinite = false; // range extends to +∞

		// Evaluate f at lower endpoint (finite) or compute limit (infinite)
		if (bounds.lower !== null) {
			const lowerEval = evaluateAtCriticalPoint(expr, variable, numericNode(bounds.lower));
			if (!lowerEval || lowerEval.yApproximate === undefined) return null;
			candidates.push({
				node: lowerEval.y,
				approximate: lowerEval.yApproximate,
				inclusive: bounds.lowerInclusive
			});
		} else {
			// Lower bound is -∞: compute limit as x → -∞
			const limitResult = evaluateLimit(expr, variable, negInfinityNode());
			if (limitResult.status === 'exact' && limitResult.value) {
				// Finite limit → asymptotic bound (open)
				const approx = evalNodeApproximate(limitResult.value);
				if (approx === null) return null;
				candidates.push({
					node: limitResult.value,
					approximate: approx,
					inclusive: false // asymptotic, never reached
				});
			} else if (limitResult.status === 'infinite' && limitResult.value) {
				// Infinite limit → mark which side is unbounded
				if (limitResult.value.type === 'infinity') {
					if (limitResult.value.sign === 'negative') {
						lowerIsInfinite = true;
					} else {
						upperIsInfinite = true;
					}
				}
			} else {
				return null; // Can't determine limit
			}
		}

		// Evaluate f at upper endpoint (finite) or compute limit (infinite)
		if (bounds.upper !== null) {
			const upperEval = evaluateAtCriticalPoint(expr, variable, numericNode(bounds.upper));
			if (!upperEval || upperEval.yApproximate === undefined) return null;
			candidates.push({
				node: upperEval.y,
				approximate: upperEval.yApproximate,
				inclusive: bounds.upperInclusive
			});
		} else {
			// Upper bound is +∞: compute limit as x → +∞
			const limitResult = evaluateLimit(expr, variable, posInfinityNode());
			if (limitResult.status === 'exact' && limitResult.value) {
				// Finite limit → asymptotic bound (open)
				const approx = evalNodeApproximate(limitResult.value);
				if (approx === null) return null;
				candidates.push({
					node: limitResult.value,
					approximate: approx,
					inclusive: false // asymptotic, never reached
				});
			} else if (limitResult.status === 'infinite' && limitResult.value) {
				// Infinite limit → mark which side is unbounded
				if (limitResult.value.type === 'infinity') {
					if (limitResult.value.sign === 'positive') {
						upperIsInfinite = true;
					} else {
						lowerIsInfinite = true;
					}
				}
			} else {
				return null; // Can't determine limit
			}
		}

		// Find critical points using the variations module
		const derivative = stripDelimiters(differentiate(expr, { variable, simplify: true }));
		const criticalPoints = findCriticalPoints(derivative, variable, domain, expr);

		for (const cp of criticalPoints) {
			if (cp.y && cp.yApproximate !== undefined) {
				// Must be strictly inside the domain
				const insideLower =
					bounds.lower === null ||
					(cp.xApproximate !== undefined && cp.xApproximate > bounds.lower);
				const insideUpper =
					bounds.upper === null ||
					(cp.xApproximate !== undefined && cp.xApproximate < bounds.upper);
				if (insideLower && insideUpper) {
					candidates.push({ node: cp.y, approximate: cp.yApproximate, inclusive: true });
				}
			}
		}

		// Sanity check: sample interior points to verify the computed range covers
		// all function values. Solve may find some but not all critical points.
		if (candidates.length > 0) {
			const finiteApproxes = candidates.map((c) => c.approximate);
			const minVal = Math.min(...finiteApproxes);
			const maxVal = Math.max(...finiteApproxes);

			// Determine sampling window
			let lo: number;
			let hi: number;
			if (bounds.lower !== null && bounds.upper !== null) {
				lo = bounds.lower;
				hi = bounds.upper;
			} else if (bounds.lower !== null) {
				// [a, +∞) → sample around known points
				lo = bounds.lower;
				hi = Math.max(bounds.lower + 100, ...finiteApproxes.map((v) => Math.abs(v) * 2 + 10));
			} else if (bounds.upper !== null) {
				// (-∞, b] → sample around known points
				hi = bounds.upper;
				lo = Math.min(bounds.upper - 100, ...finiteApproxes.map((v) => -Math.abs(v) * 2 - 10));
			} else {
				// (-∞, +∞) → sample [-100, 100]
				lo = -100;
				hi = 100;
			}

			for (let i = 1; i <= 10; i++) {
				const x = lo + ((hi - lo) * i) / 11;
				const fVal = evalAt(expr, variable, x);
				if (fVal !== null) {
					if (!lowerIsInfinite && fVal < minVal - 1e-10) {
						return null; // Function goes below computed min
					}
					if (!upperIsInfinite && fVal > maxVal + 1e-10) {
						return null; // Function goes above computed max
					}
				}
			}
		}

		// Both sides infinite → range is all of ℝ
		if (lowerIsInfinite && upperIsInfinite) {
			return {
				domain: universalDomain(),
				lowerNode: negInfinityNode(),
				upperNode: posInfinityNode(),
				lowerApproximate: -Infinity,
				upperApproximate: Infinity,
				lowerInclusive: false,
				upperInclusive: false
			};
		}

		// Find min and max among finite candidates
		if (candidates.length === 0) return null;

		let min = candidates[0];
		let max = candidates[0];

		for (const c of candidates) {
			if (c.approximate < min.approximate) {
				min = c;
			} else if (c.approximate === min.approximate && c.inclusive) {
				min = { ...min, inclusive: true };
			}
			if (c.approximate > max.approximate) {
				max = c;
			} else if (c.approximate === max.approximate && c.inclusive) {
				max = { ...max, inclusive: true };
			}
		}

		// Build domain with potentially infinite endpoints
		const lowerEndpoint = lowerIsInfinite
			? negInfinityEndpoint()
			: min.inclusive
				? closedEndpoint(min.node)
				: openEndpoint(min.node);

		const upperEndpoint = upperIsInfinite
			? posInfinityEndpoint()
			: max.inclusive
				? closedEndpoint(max.node)
				: openEndpoint(max.node);

		const resultDomain = intervalDomain([makeInterval(lowerEndpoint, upperEndpoint)]);

		return {
			domain: resultDomain,
			lowerNode: lowerIsInfinite ? negInfinityNode() : min.node,
			upperNode: upperIsInfinite ? posInfinityNode() : max.node,
			lowerApproximate: lowerIsInfinite ? -Infinity : min.approximate,
			upperApproximate: upperIsInfinite ? Infinity : max.approximate,
			lowerInclusive: lowerIsInfinite ? false : min.inclusive,
			upperInclusive: upperIsInfinite ? false : max.inclusive
		};
	} catch {
		return null;
	}
}

/**
 * Evaluate a MathNode to a numeric approximation.
 */
function evalNodeApproximate(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		if (typeof result.value === 'number' && isFinite(result.value)) {
			return result.value;
		}
	} catch {
		// Evaluation failed
	}
	return null;
}

/**
 * Compute range using the exact closed interval method (with limits for unbounded domains).
 *
 * Returns the exact range as a Domain, or null if the range cannot be determined exactly.
 * No sampling fallback — if we can't compute it exactly, we return null.
 */
export function computeRangeWithCriticalPoints(
	expr: MathNode,
	variable: string,
	domain: Domain
): Domain | null {
	const exact = computeRangeWithCriticalPointsExact(expr, variable, domain);
	return exact ? exact.domain : null;
}

// =============================================================================
// Periodic Function Optimization
// =============================================================================

/**
 * Check if the input range spans at least one full period of a periodic function.
 */
export function spansFullPeriod(inputBounds: NumericBounds, period: number): boolean {
	if (inputBounds.lower === null || inputBounds.upper === null) {
		return true; // Unbounded always spans full period
	}

	const span = inputBounds.upper - inputBounds.lower;
	return span >= period;
}

/**
 * Get the period for common periodic functions.
 */
export function getFunctionPeriod(funcName: string): number | null {
	const periods: Record<string, number> = {
		sin: 2 * Math.PI,
		cos: 2 * Math.PI,
		tan: Math.PI,
		cot: Math.PI,
		sec: 2 * Math.PI,
		csc: 2 * Math.PI
	};

	return periods[funcName.toLowerCase()] ?? null;
}

// =============================================================================
// Rational Power Range
// =============================================================================

/**
 * Compute base^(p/q) accurately by decomposing into root then integer power.
 *
 * Math.pow(8, 2/3) uses exp(0.666... * ln(8)) which gives 3.9999999999999996.
 * Instead: Math.cbrt(8)=2, then 2^2=4 — exact.
 *
 * @param base - Non-negative base value (or any real for odd q)
 * @param p - Numerator of exponent
 * @param q - Denominator of exponent (positive)
 */
function rationalPow(base: number, p: number, q: number): number {
	if (base === 0) return p > 0 ? 0 : Infinity;

	const absBase = Math.abs(base);

	// Step 1: q-th root using dedicated functions when available
	let root: number;
	if (q === 2) {
		root = Math.sqrt(absBase);
	} else if (q === 3) {
		root = Math.cbrt(absBase);
	} else {
		root = Math.pow(absBase, 1 / q);
	}

	// Step 2: integer power (exact for integer exponent and reasonable values)
	const result = Math.pow(root, Math.abs(p));

	// Step 3: handle sign
	const signedResult = p < 0 ? 1 / result : result;

	// For odd q, negative base keeps its sign raised to p
	if (base < 0 && q % 2 !== 0) {
		// (-x)^(p/q) = (-1)^p * x^(p/q) for odd q
		return p % 2 !== 0 ? -signedResult : signedResult;
	}

	return signedResult;
}

/**
 * Compute range for x^(p/q) where p, q are integers.
 */
export function computeRationalPowerRange(baseRange: Domain, power: RationalPower): Domain {
	const { numerator: p, denominator: q } = power;

	if (baseRange.kind === 'empty') return { kind: 'empty' };

	const bounds = getNumericBounds(baseRange);
	if (!bounds) return universalDomain();

	// Handle special cases
	if (p === 0) {
		// x^0 = 1
		return intervalDomain([closedInterval(number(1), number(1))]);
	}

	if (q === 1) {
		// Integer power
		return computeIntegerPowerRange(baseRange, p);
	}

	const isEvenDenominator = q % 2 === 0;
	const isPositiveExponent = p * q > 0;

	// Even denominator requires non-negative base
	if (isEvenDenominator) {
		// Restrict to non-negative part of base range
		const lowerBound = bounds.lower !== null ? Math.max(0, bounds.lower) : 0;
		const effectiveLower = lowerBound;
		const effectiveLowerInclusive =
			bounds.lower !== null && bounds.lower >= 0 ? bounds.lowerInclusive : true;

		if (bounds.upper !== null && bounds.upper < 0) {
			return { kind: 'empty' }; // All negative, no valid inputs
		}

		if (isPositiveExponent) {
			// x^(p/q) with p/q > 0, monotonically increasing on [0, +∞)
			const lower = rationalPow(effectiveLower, p, q);
			const upper = bounds.upper !== null ? rationalPow(bounds.upper, p, q) : null;

			return domainFromNumericBounds({
				lower,
				lowerInclusive: effectiveLowerInclusive,
				upper,
				upperInclusive: bounds.upperInclusive
			});
		} else {
			// x^(p/q) with p/q < 0, monotonically decreasing on (0, +∞)
			if (effectiveLower <= 0 && !effectiveLowerInclusive) {
				return universalDomain(); // Approaches +∞ as x → 0+
			}

			const upper = effectiveLower > 0 ? rationalPow(effectiveLower, p, q) : null;
			const lower = bounds.upper !== null ? rationalPow(bounds.upper, p, q) : null;

			return domainFromNumericBounds({
				lower,
				lowerInclusive: bounds.upperInclusive,
				upper,
				upperInclusive: effectiveLowerInclusive
			});
		}
	} else {
		// Odd denominator: defined for all reals
		if (bounds.lower === null || bounds.upper === null) {
			return universalDomain();
		}

		// Odd root preserves order for positive exp, reverses for negative
		if (isPositiveExponent) {
			const lower = rationalPow(bounds.lower, p, q);
			const upper = rationalPow(bounds.upper, p, q);

			return domainFromNumericBounds({
				lower,
				lowerInclusive: bounds.lowerInclusive,
				upper,
				upperInclusive: bounds.upperInclusive
			});
		} else {
			// Negative exponent: 1/x^|exp|
			if (bounds.lower <= 0 && bounds.upper >= 0) {
				return universalDomain(); // Includes zero, unbounded
			}

			// x^(p/q) with p/q < 0: compute as 1 / x^(|p|/q)
			const absp = Math.abs(p);
			const lowerPow = rationalPow(bounds.lower, absp, q);
			const upperPow = rationalPow(bounds.upper, absp, q);

			const lower = 1 / upperPow;
			const upper = 1 / lowerPow;

			return domainFromNumericBounds({
				lower,
				lowerInclusive: bounds.upperInclusive,
				upper,
				upperInclusive: bounds.lowerInclusive
			});
		}
	}
}

/**
 * Compute range for integer power.
 */
function computeIntegerPowerRange(baseRange: Domain, n: number): Domain {
	if (baseRange.kind === 'empty') return { kind: 'empty' };

	const bounds = getNumericBounds(baseRange);
	if (!bounds) return universalDomain();

	if (n === 0) {
		return intervalDomain([closedInterval(number(1), number(1))]);
	}

	if (n === 1) {
		return baseRange;
	}

	if (bounds.lower === null || bounds.upper === null) {
		// Unbounded
		if (n % 2 === 0) {
			return domainFromNumericBounds({
				lower: 0,
				lowerInclusive: true,
				upper: null,
				upperInclusive: false
			});
		}
		return universalDomain();
	}

	if (n > 0 && n % 2 === 0) {
		// Even positive power
		const a = bounds.lower;
		const b = bounds.upper;

		if (a >= 0) {
			// All non-negative
			return domainFromNumericBounds({
				lower: Math.pow(a, n),
				lowerInclusive: bounds.lowerInclusive,
				upper: Math.pow(b, n),
				upperInclusive: bounds.upperInclusive
			});
		} else if (b <= 0) {
			// All non-positive
			return domainFromNumericBounds({
				lower: Math.pow(b, n),
				lowerInclusive: bounds.upperInclusive,
				upper: Math.pow(a, n),
				upperInclusive: bounds.lowerInclusive
			});
		} else {
			// Spans zero
			const maxPow = Math.max(Math.pow(Math.abs(a), n), Math.pow(b, n));
			return domainFromNumericBounds({
				lower: 0,
				lowerInclusive: true,
				upper: maxPow,
				upperInclusive:
					Math.pow(Math.abs(a), n) >= Math.pow(b, n) ? bounds.lowerInclusive : bounds.upperInclusive
			});
		}
	} else if (n > 0 && n % 2 !== 0) {
		// Odd positive power - monotonically increasing
		return domainFromNumericBounds({
			lower: Math.pow(bounds.lower, n),
			lowerInclusive: bounds.lowerInclusive,
			upper: Math.pow(bounds.upper, n),
			upperInclusive: bounds.upperInclusive
		});
	} else if (n < 0) {
		// Negative power
		if (bounds.lower <= 0 && bounds.upper >= 0) {
			return universalDomain(); // Includes zero
		}

		const absN = Math.abs(n);
		const isEven = absN % 2 === 0;

		if (isEven) {
			// 1/x^|n| where |n| is even
			if (bounds.lower > 0) {
				return domainFromNumericBounds({
					lower: 1 / Math.pow(bounds.upper, absN),
					lowerInclusive: bounds.upperInclusive,
					upper: 1 / Math.pow(bounds.lower, absN),
					upperInclusive: bounds.lowerInclusive
				});
			} else {
				return domainFromNumericBounds({
					lower: 1 / Math.pow(bounds.lower, absN),
					lowerInclusive: bounds.lowerInclusive,
					upper: 1 / Math.pow(bounds.upper, absN),
					upperInclusive: bounds.upperInclusive
				});
			}
		} else {
			// 1/x^|n| where |n| is odd
			return domainFromNumericBounds({
				lower: 1 / Math.pow(bounds.upper, absN),
				lowerInclusive: bounds.upperInclusive,
				upper: 1 / Math.pow(bounds.lower, absN),
				upperInclusive: bounds.lowerInclusive
			});
		}
	}

	return universalDomain();
}
