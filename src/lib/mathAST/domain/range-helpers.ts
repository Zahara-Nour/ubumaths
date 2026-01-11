/**
 * Range Computation Helpers
 *
 * Advanced pattern matching, polynomial detection, and critical point analysis
 * for computing precise ranges of mathematical expressions.
 */

import type { MathNode } from '../types';
import type { Domain } from './types';
import { universalDomain, intervalDomain, fromNumber, closedInterval } from './factory';
import { getBoundsFromDomain, domainFromBounds, type Bounds } from './builtins';
import { differentiate } from '../differentiation';
import { evaluate, substitute } from '../eval';
import { containsVariable, getNumericValue } from '../differentiation/rules';

/**
 * Evaluate an expression at a specific value of a variable.
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

	// Handle common constants
	if (node.type === 'greek' && node.letter === 'pi') {
		return Math.PI;
	}

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

	const bounds = getBoundsFromDomain(inputDomain);
	if (!bounds) return universalDomain();

	// Handle unbounded domains
	if (bounds.lower === null || bounds.upper === null) {
		// Unbounded domain: range depends on sign of a
		if (a > 0) {
			// Opens upward: minimum at vertex
			const vertexY = c - (b * b) / (4 * a);
			return domainFromBounds({
				lower: vertexY,
				lowerInclusive: true,
				upper: null,
				upperInclusive: false
			});
		} else {
			// Opens downward: maximum at vertex
			const vertexY = c - (b * b) / (4 * a);
			return domainFromBounds({
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

	return domainFromBounds({
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
		return intervalDomain([closedInterval(fromNumber(b), fromNumber(b))]);
	}

	const bounds = getBoundsFromDomain(inputDomain);
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

	return domainFromBounds({
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
		return domainFromBounds({
			lower: 0,
			lowerInclusive: true,
			upper: null,
			upperInclusive: false
		});
	}

	const bounds = getBoundsFromDomain(inputRange);
	if (!bounds) {
		return domainFromBounds({
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
		return domainFromBounds({
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

	return domainFromBounds({
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

	const boundsA = getBoundsFromDomain(aRange);
	const boundsB = getBoundsFromDomain(bRange);

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

	return domainFromBounds({ lower, lowerInclusive, upper, upperInclusive });
}

/**
 * Compute max(A, B) where A and B are interval domains.
 */
export function computeMaxRange(aRange: Domain, bRange: Domain): Domain {
	if (aRange.kind === 'empty' || bRange.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBoundsFromDomain(aRange);
	const boundsB = getBoundsFromDomain(bRange);

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

	return domainFromBounds({ lower, lowerInclusive, upper, upperInclusive });
}

// =============================================================================
// Critical Point Analysis
// =============================================================================

/**
 * Find critical points of an expression by differentiating and solving f'(x) = 0.
 *
 * Currently uses sampling to find approximate roots of f'(x).
 * For polynomials, could use algebraic methods.
 */
export function findCriticalPoints(expr: MathNode, variable: string, domain: Domain): number[] {
	const bounds = getBoundsFromDomain(domain);
	if (!bounds || bounds.lower === null || bounds.upper === null) {
		return [];
	}

	const criticalPoints: number[] = [];

	try {
		// Differentiate the expression
		const derivative = differentiate(expr, { variable, simplify: true });

		// Sample to find sign changes (zeros of derivative)
		const numSamples = 100;
		const step = (bounds.upper - bounds.lower) / numSamples;

		let prevValue: number | null = null;
		let prevX: number | null = null;

		for (let i = 0; i <= numSamples; i++) {
			const x = bounds.lower + i * step;
			const value = evalAt(derivative, variable, x);

			if (value !== null) {
				// Check for sign change (root)
				if (prevValue !== null && prevX !== null) {
					if ((prevValue < 0 && value > 0) || (prevValue > 0 && value < 0)) {
						// Bisection to refine root location
						const root = bisectionRoot(derivative, variable, prevX, x, prevValue, value);
						if (root !== null && root > bounds.lower && root < bounds.upper) {
							criticalPoints.push(root);
						}
					}
				}

				// Check for zero
				if (Math.abs(value) < 1e-10) {
					if (!criticalPoints.some((cp) => Math.abs(cp - x) < 1e-6)) {
						criticalPoints.push(x);
					}
				}

				prevValue = value;
				prevX = x;
			}
		}
	} catch {
		// Differentiation failed, return empty
	}

	return criticalPoints;
}

/**
 * Bisection method to refine a root location.
 */
function bisectionRoot(
	expr: MathNode,
	variable: string,
	x1: number,
	x2: number,
	v1: number,
	v2: number,
	maxIter: number = 20
): number | null {
	let a = x1;
	let b = x2;
	let fa = v1;

	for (let i = 0; i < maxIter; i++) {
		const mid = (a + b) / 2;
		const fm = evalAt(expr, variable, mid);

		if (fm === null) {
			return mid; // Best approximation
		}

		if (Math.abs(fm) < 1e-10) {
			return mid;
		}

		if ((fa < 0 && fm > 0) || (fa > 0 && fm < 0)) {
			b = mid;
		} else {
			a = mid;
			fa = fm;
		}
	}

	return (a + b) / 2;
}

/**
 * Compute exact range using critical point analysis.
 *
 * For a differentiable function on [a, b]:
 * Range = {f(a), f(b)} ∪ {f(c) : c is critical point in (a, b)}
 */
export function computeRangeWithCriticalPoints(
	expr: MathNode,
	variable: string,
	domain: Domain
): Domain | null {
	const bounds = getBoundsFromDomain(domain);
	if (!bounds || bounds.lower === null || bounds.upper === null) {
		return null;
	}

	const criticalPoints = findCriticalPoints(expr, variable, domain);

	// Evaluate at all critical points and endpoints
	const values: { value: number; inclusive: boolean }[] = [];

	// Endpoints
	const lowerVal = evalAt(expr, variable, bounds.lower);
	if (lowerVal !== null) {
		values.push({ value: lowerVal, inclusive: bounds.lowerInclusive });
	}

	const upperVal = evalAt(expr, variable, bounds.upper);
	if (upperVal !== null) {
		values.push({ value: upperVal, inclusive: bounds.upperInclusive });
	}

	// Critical points (interior, so always achievable)
	for (const cp of criticalPoints) {
		const cpVal = evalAt(expr, variable, cp);
		if (cpVal !== null) {
			values.push({ value: cpVal, inclusive: true });
		}
	}

	if (values.length === 0) {
		return null;
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

	return domainFromBounds({
		lower: minVal.value,
		lowerInclusive: minVal.inclusive,
		upper: maxVal.value,
		upperInclusive: maxVal.inclusive
	});
}

// =============================================================================
// Periodic Function Optimization
// =============================================================================

/**
 * Check if the input range spans at least one full period of a periodic function.
 */
export function spansFullPeriod(inputBounds: Bounds, period: number): boolean {
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
 * Compute range for x^(p/q) where p, q are integers.
 */
export function computeRationalPowerRange(baseRange: Domain, power: RationalPower): Domain {
	const { numerator: p, denominator: q } = power;

	if (baseRange.kind === 'empty') return { kind: 'empty' };

	const bounds = getBoundsFromDomain(baseRange);
	if (!bounds) return universalDomain();

	// Handle special cases
	if (p === 0) {
		// x^0 = 1
		return intervalDomain([closedInterval(fromNumber(1), fromNumber(1))]);
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
			const lower = Math.pow(effectiveLower, p / q);
			const upper = bounds.upper !== null ? Math.pow(bounds.upper, p / q) : null;

			return domainFromBounds({
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

			const exp = p / q;
			const upper = effectiveLower > 0 ? Math.pow(effectiveLower, exp) : null;
			const lower = bounds.upper !== null ? Math.pow(bounds.upper, exp) : null;

			return domainFromBounds({
				lower,
				lowerInclusive: bounds.upperInclusive,
				upper,
				upperInclusive: effectiveLowerInclusive
			});
		}
	} else {
		// Odd denominator: defined for all reals
		const exp = p / q;

		if (bounds.lower === null || bounds.upper === null) {
			return universalDomain();
		}

		// Odd root preserves order for positive exp, reverses for negative
		if (isPositiveExponent) {
			const lower = Math.sign(bounds.lower) * Math.pow(Math.abs(bounds.lower), exp);
			const upper = Math.sign(bounds.upper) * Math.pow(Math.abs(bounds.upper), exp);

			return domainFromBounds({
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

			const absExp = Math.abs(exp);
			const lowerPow = Math.sign(bounds.lower) * Math.pow(Math.abs(bounds.lower), absExp);
			const upperPow = Math.sign(bounds.upper) * Math.pow(Math.abs(bounds.upper), absExp);

			const lower = 1 / upperPow;
			const upper = 1 / lowerPow;

			return domainFromBounds({
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

	const bounds = getBoundsFromDomain(baseRange);
	if (!bounds) return universalDomain();

	if (n === 0) {
		return intervalDomain([closedInterval(fromNumber(1), fromNumber(1))]);
	}

	if (n === 1) {
		return baseRange;
	}

	if (bounds.lower === null || bounds.upper === null) {
		// Unbounded
		if (n % 2 === 0) {
			return domainFromBounds({
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
			return domainFromBounds({
				lower: Math.pow(a, n),
				lowerInclusive: bounds.lowerInclusive,
				upper: Math.pow(b, n),
				upperInclusive: bounds.upperInclusive
			});
		} else if (b <= 0) {
			// All non-positive
			return domainFromBounds({
				lower: Math.pow(b, n),
				lowerInclusive: bounds.upperInclusive,
				upper: Math.pow(a, n),
				upperInclusive: bounds.lowerInclusive
			});
		} else {
			// Spans zero
			const maxPow = Math.max(Math.pow(Math.abs(a), n), Math.pow(b, n));
			return domainFromBounds({
				lower: 0,
				lowerInclusive: true,
				upper: maxPow,
				upperInclusive:
					Math.pow(Math.abs(a), n) >= Math.pow(b, n) ? bounds.lowerInclusive : bounds.upperInclusive
			});
		}
	} else if (n > 0 && n % 2 !== 0) {
		// Odd positive power - monotonically increasing
		return domainFromBounds({
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
				return domainFromBounds({
					lower: 1 / Math.pow(bounds.upper, absN),
					lowerInclusive: bounds.upperInclusive,
					upper: 1 / Math.pow(bounds.lower, absN),
					upperInclusive: bounds.lowerInclusive
				});
			} else {
				return domainFromBounds({
					lower: 1 / Math.pow(bounds.lower, absN),
					lowerInclusive: bounds.lowerInclusive,
					upper: 1 / Math.pow(bounds.upper, absN),
					upperInclusive: bounds.upperInclusive
				});
			}
		} else {
			// 1/x^|n| where |n| is odd
			return domainFromBounds({
				lower: 1 / Math.pow(bounds.upper, absN),
				lowerInclusive: bounds.upperInclusive,
				upper: 1 / Math.pow(bounds.lower, absN),
				upperInclusive: bounds.lowerInclusive
			});
		}
	}

	return universalDomain();
}
