/**
 * Symmetry Detection
 *
 * Detects whether mathematical expressions are even, odd, or neither.
 * - Even function: f(-x) = f(x) for all x
 * - Odd function: f(-x) = -f(x) for all x
 *
 * Uses normalization for algebraic comparison.
 *
 * @module mathAST/analysis/symmetry
 */

import type { MathNode } from '../types';
import type { Domain, IntervalSet, Interval } from '../domain/types';
import { isNumber, isPositiveInfinity, isNegativeInfinity } from '../guards';
import { opposite, subtract, add } from '../factory';
import { substitute, getVariables } from '../eval/substitute';
import { normalize, isZeroPolynomial } from '../normal';
import { computeDomain } from '../domain/compute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Domain Symmetry Checking
// =============================================================================

/**
 * Check if a domain is symmetric about the origin.
 * A domain D is symmetric if x ∈ D ⟺ -x ∈ D.
 *
 * @returns true if symmetric, false if not, undefined if cannot determine
 */
function isDomainSymmetric(domain: Domain): boolean | undefined {
	switch (domain.kind) {
		case 'universal':
			// ℝ is symmetric
			return true;

		case 'empty':
			// ∅ is symmetric (vacuously)
			return true;

		case 'interval_set':
			return isIntervalSetSymmetric(domain);

		case 'condition':
			// Cannot easily determine symmetry for condition domains
			return undefined;

		case 'periodic_exclusion':
			// Periodic exclusions like tan(x) are symmetric if base is symmetric
			// For now, assume unknown
			return undefined;

		default:
			return undefined;
	}
}

/**
 * Check if an interval set is symmetric about the origin.
 */
function isIntervalSetSymmetric(domain: IntervalSet): boolean | undefined {
	const intervals = domain.intervals;
	const excluded = domain.excludedPoints ?? [];

	// Check excluded points are symmetric
	for (const point of excluded) {
		const value = evaluateNodeToApproximatedNumber(point.value);
		if (!isFinite(value)) continue;

		// If x is excluded, -x must also be excluded
		const hasNegative = excluded.some((p) => {
			const v = evaluateNodeToApproximatedNumber(p.value);
			return isFinite(v) && Math.abs(v + value) < 1e-10;
		});

		if (!hasNegative && Math.abs(value) > 1e-10) {
			return false;
		}
	}

	// Single interval case
	if (intervals.length === 1) {
		return isIntervalSymmetric(intervals[0]);
	}

	// Multiple intervals: each interval must have a symmetric counterpart
	for (const interval of intervals) {
		const mirror = getMirrorInterval(interval);
		if (!mirror) return undefined;

		const hasMirror = intervals.some((i) => intervalsMatch(i, mirror));
		if (!hasMirror) return false;
	}

	return true;
}

/**
 * Check if a single interval is symmetric about the origin.
 * Examples: [-1, 1], ]-∞, +∞[, ]-a, a[
 */
function isIntervalSymmetric(interval: Interval): boolean | undefined {
	const lowerVal = getEndpointNumericValue(interval.lower.value);
	const upperVal = getEndpointNumericValue(interval.upper.value);

	// Handle infinities
	const lowerIsNegInf = isNegativeInfinity(interval.lower.value);
	const upperIsPosInf = isPositiveInfinity(interval.upper.value);

	// ]-∞, +∞[ is symmetric
	if (lowerIsNegInf && upperIsPosInf) {
		return true;
	}

	// ]-∞, a] or [a, +∞[ - not symmetric unless a = 0 with special structure
	if (lowerIsNegInf || upperIsPosInf) {
		// One-sided infinite intervals are not symmetric
		return false;
	}

	// Finite interval [a, b]
	if (lowerVal !== undefined && upperVal !== undefined) {
		// Symmetric if a = -b and same endpoint types
		const isSymmetricBounds = Math.abs(lowerVal + upperVal) < 1e-10;
		const sameTypes = interval.lower.type === interval.upper.type;
		return isSymmetricBounds && sameTypes;
	}

	// Cannot determine numerically
	return undefined;
}

/**
 * Get the mirror interval (negated endpoints).
 * [a, b] → [-b, -a]
 */
function getMirrorInterval(
	interval: Interval
): { lower: number; upper: number; lowerType: string; upperType: string } | undefined {
	const lowerVal = getEndpointNumericValue(interval.lower.value);
	const upperVal = getEndpointNumericValue(interval.upper.value);

	if (lowerVal === undefined || upperVal === undefined) {
		return undefined;
	}

	return {
		lower: -upperVal,
		upper: -lowerVal,
		lowerType: interval.upper.type, // Swap types
		upperType: interval.lower.type
	};
}

/**
 * Check if two intervals match (approximately).
 */
function intervalsMatch(
	interval: Interval,
	target: { lower: number; upper: number; lowerType: string; upperType: string }
): boolean {
	const lowerVal = getEndpointNumericValue(interval.lower.value);
	const upperVal = getEndpointNumericValue(interval.upper.value);

	if (lowerVal === undefined || upperVal === undefined) {
		return false;
	}

	return (
		Math.abs(lowerVal - target.lower) < 1e-10 &&
		Math.abs(upperVal - target.upper) < 1e-10 &&
		interval.lower.type === target.lowerType &&
		interval.upper.type === target.upperType
	);
}

/**
 * Get numeric value of an endpoint, or undefined if not evaluable.
 */
function getEndpointNumericValue(value: MathNode): number | undefined {
	if (isPositiveInfinity(value) || isNegativeInfinity(value)) {
		return undefined;
	}

	try {
		const num = evaluateNodeToApproximatedNumber(value);
		return isFinite(num) ? num : undefined;
	} catch {
		return undefined;
	}
}

// =============================================================================
// Types
// =============================================================================

/**
 * Type of symmetry detected
 */
export type SymmetryType = 'even' | 'odd' | 'none' | 'unknown';

/**
 * Result of symmetry detection
 */
export interface SymmetryResult {
	/** The type of symmetry detected */
	readonly symmetry: SymmetryType;

	/** The variable analyzed for symmetry */
	readonly variable: string;

	/** Confidence level of the result */
	readonly confidence: 'proven' | 'heuristic';

	/** Reason for the classification (for debugging/explanation) */
	readonly reason?: string;
}

// =============================================================================
// Known Function Symmetries
// =============================================================================

/**
 * Functions known to be even: f(-x) = f(x)
 */
const EVEN_FUNCTIONS = new Set(['cos', 'cosh', 'abs', 'sec', 'sech']);

/**
 * Functions known to be odd: f(-x) = -f(x)
 */
const ODD_FUNCTIONS = new Set([
	'sin',
	'sinh',
	'tan',
	'tanh',
	'cot',
	'coth',
	'csc',
	'csch',
	'arcsin',
	'arctan',
	'arcsinh',
	'arctanh'
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a number is an even integer.
 */
function isEvenInteger(value: string): boolean {
	const num = parseFloat(value);
	return Number.isInteger(num) && num % 2 === 0;
}

/**
 * Check if a number is an odd integer.
 */
function isOddInteger(value: string): boolean {
	const num = parseFloat(value);
	return Number.isInteger(num) && num % 2 !== 0;
}

/**
 * Get symmetry type of a known function.
 */
function getFunctionSymmetry(name: string): SymmetryType {
	if (EVEN_FUNCTIONS.has(name)) return 'even';
	if (ODD_FUNCTIONS.has(name)) return 'odd';
	return 'unknown';
}

/**
 * Combine symmetries according to multiplication rules.
 * - even × even = even
 * - odd × odd = even
 * - even × odd = odd
 * - any × none = none
 * - any × unknown = unknown
 */
function multiplySymmetries(a: SymmetryType, b: SymmetryType): SymmetryType {
	if (a === 'none' || b === 'none') return 'none';
	if (a === 'unknown' || b === 'unknown') return 'unknown';
	if (a === 'even' && b === 'even') return 'even';
	if (a === 'odd' && b === 'odd') return 'even';
	if ((a === 'even' && b === 'odd') || (a === 'odd' && b === 'even')) return 'odd';
	return 'unknown';
}

/**
 * Combine symmetries according to addition rules.
 * - even + even = even
 * - odd + odd = odd
 * - even + odd = none (in general)
 * - any + none = none
 */
function addSymmetries(a: SymmetryType, b: SymmetryType): SymmetryType {
	if (a === 'none' || b === 'none') return 'none';
	if (a === 'unknown' || b === 'unknown') return 'unknown';
	if (a === b) return a; // even + even = even, odd + odd = odd
	return 'none'; // even + odd = none
}

/**
 * Symmetry of f(-x) when we know symmetry of f.
 * - If f is even: f(-x) has same symmetry as f(x)
 * - If f is odd: f(-x) has opposite sign, so same parity
 */
function composeWithNegation(innerSym: SymmetryType, funcSym: SymmetryType): SymmetryType {
	if (innerSym === 'none' || funcSym === 'none') return 'none';
	if (innerSym === 'unknown' || funcSym === 'unknown') return 'unknown';

	// f(g(x)) where we know symmetry of g
	// If g is even: g(-x) = g(x), so f(g(-x)) = f(g(x)) - even behavior
	// If g is odd: g(-x) = -g(x), so f(g(-x)) = f(-g(x))
	//   - If f is even: f(-g(x)) = f(g(x)) - even
	//   - If f is odd: f(-g(x)) = -f(g(x)) - odd

	if (innerSym === 'even') return 'even';
	if (innerSym === 'odd') return funcSym;

	return 'unknown';
}

// =============================================================================
// Heuristic Symmetry Detection (Fast Path)
// =============================================================================

/**
 * Detect symmetry using structural heuristics.
 * Fast but may return 'unknown' for complex expressions.
 */
function detectSymmetryHeuristic(node: MathNode, variable: string): SymmetryType {
	// Constants are even
	const vars = getVariables(node);
	if (!vars.has(variable)) {
		return 'even';
	}

	switch (node.type) {
		case 'number':
			return 'even'; // Constants are even

		case 'variable':
			// x is odd
			return node.name === variable ? 'odd' : 'even';

		case 'greek':
			// Greek letter used as variable
			return node.letter === variable ? 'odd' : 'even';

		case 'opposite':
			// -f(x) has same symmetry as f(x)
			return detectSymmetryHeuristic(node.operand, variable);

		case 'positive':
			return detectSymmetryHeuristic(node.operand, variable);

		case 'addition':
		case 'subtraction': {
			const leftSym = detectSymmetryHeuristic(node.left, variable);
			const rightSym = detectSymmetryHeuristic(node.right, variable);
			return addSymmetries(leftSym, rightSym);
		}

		case 'multiplication': {
			const leftSym = detectSymmetryHeuristic(node.left, variable);
			const rightSym = detectSymmetryHeuristic(node.right, variable);
			return multiplySymmetries(leftSym, rightSym);
		}

		case 'division': {
			const numSym = detectSymmetryHeuristic(node.numerator, variable);
			const denSym = detectSymmetryHeuristic(node.denominator, variable);
			return multiplySymmetries(numSym, denSym);
		}

		case 'superscript': {
			// x^n: even if n is even, odd if n is odd
			const baseSym = detectSymmetryHeuristic(node.base, variable);

			// Check if exponent is a constant integer
			if (isNumber(node.superscript)) {
				if (isEvenInteger(node.superscript.value)) {
					// x^(even) is even, (-x)^(even) = x^(even)
					if (baseSym === 'odd' || baseSym === 'even') return 'even';
				}
				if (isOddInteger(node.superscript.value)) {
					// x^(odd) keeps parity: even^odd=even, odd^odd=odd
					return baseSym;
				}
			}

			// Non-integer or variable exponent - check if base contains variable
			if (!getVariables(node.base).has(variable)) {
				// a^x where a is constant - neither even nor odd in general
				return 'none';
			}

			return 'unknown';
		}

		case 'delimiter':
			return detectSymmetryHeuristic(node.content, variable);

		case 'function': {
			// Check if argument contains the variable
			if (node.args.length === 0) return 'even';

			const arg = node.args[0];
			const argSym = detectSymmetryHeuristic(arg, variable);
			const funcSym = getFunctionSymmetry(node.name);

			// sqrt, cbrt: preserve parity if argument is even, complex otherwise
			if (node.name === 'sqrt' || node.name === 'cbrt') {
				if (argSym === 'even') return 'even';
				return 'unknown'; // sqrt(odd) is not well-defined for negative values
			}

			return composeWithNegation(argSym, funcSym);
		}

		default:
			return 'unknown';
	}
}

// =============================================================================
// Algebraic Symmetry Detection (Slow Path - Proven)
// =============================================================================

/**
 * Detect symmetry by algebraic comparison.
 * Uses the approach:
 * - Even: f(-x) - f(x) = 0
 * - Odd: f(-x) + f(x) = 0
 *
 * This is more robust than direct comparison because it handles
 * cases like 1/(-x) = -1/x where the representations differ.
 */
function detectSymmetryAlgebraic(node: MathNode, variable: string): SymmetryResult {
	try {
		// Create f(-x) by substituting -x for x
		// Use maxIterations: 1 to prevent recursive substitution
		const negX = opposite({ type: 'variable', name: variable });
		const fNegX = substitute(node, { [variable]: negX }, { maxIterations: 1 });

		// Check even: f(-x) - f(x) = 0
		const diffEven = subtract(fNegX, node);
		const normDiffEven = normalize(diffEven);

		if (isZeroPolynomial(normDiffEven.numerator)) {
			return {
				symmetry: 'even',
				variable,
				confidence: 'proven',
				reason: 'f(-x) - f(x) = 0 verified algebraically'
			};
		}

		// Check odd: f(-x) + f(x) = 0
		const sumOdd = add(fNegX, node);
		const normSumOdd = normalize(sumOdd);

		if (isZeroPolynomial(normSumOdd.numerator)) {
			return {
				symmetry: 'odd',
				variable,
				confidence: 'proven',
				reason: 'f(-x) + f(x) = 0 verified algebraically'
			};
		}

		// Neither even nor odd
		return {
			symmetry: 'none',
			variable,
			confidence: 'proven',
			reason: 'f(-x) ≠ f(x) and f(-x) ≠ -f(x)'
		};
	} catch {
		// Normalization failed - fall back to heuristic
		return {
			symmetry: 'unknown',
			variable,
			confidence: 'heuristic',
			reason: 'Algebraic comparison failed'
		};
	}
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Detect whether an expression has even, odd, or no symmetry.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check symmetry in (auto-detected if single variable)
 * @returns SymmetryResult with symmetry type and confidence
 *
 * @example
 * detectSymmetry(parseLatex('x^2'))  // { symmetry: 'even', ... }
 * detectSymmetry(parseLatex('x^3'))  // { symmetry: 'odd', ... }
 * detectSymmetry(parseLatex('x^2 + x'))  // { symmetry: 'none', ... }
 * detectSymmetry(parseLatex('\\cos(x)'))  // { symmetry: 'even', ... }
 * detectSymmetry(parseLatex('\\sin(x)'))  // { symmetry: 'odd', ... }
 */
export function detectSymmetry(node: MathNode, variable?: string): SymmetryResult {
	// Auto-detect variable if not provided
	const vars = getVariables(node);

	if (vars.size === 0) {
		// Constant - always even
		return {
			symmetry: 'even',
			variable: variable ?? 'x',
			confidence: 'proven',
			reason: 'Constant expression'
		};
	}

	const targetVar = variable ?? (vars.size === 1 ? Array.from(vars)[0] : undefined);

	if (!targetVar) {
		return {
			symmetry: 'unknown',
			variable: '',
			confidence: 'heuristic',
			reason: 'Multiple variables, none specified'
		};
	}

	if (!vars.has(targetVar)) {
		// Expression doesn't contain the target variable - constant in that variable
		return {
			symmetry: 'even',
			variable: targetVar,
			confidence: 'proven',
			reason: `Expression is constant in ${targetVar}`
		};
	}

	// Check domain symmetry first
	// A function can only be even/odd if its domain is symmetric about 0
	try {
		const domainResult = computeDomain(node, targetVar);
		const domainSymmetric = isDomainSymmetric(domainResult.domain);

		if (domainSymmetric === false) {
			return {
				symmetry: 'none',
				variable: targetVar,
				confidence: 'proven',
				reason: 'Domain is not symmetric about the origin'
			};
		}
		// If domainSymmetric is undefined, we continue with other checks
	} catch {
		// Domain computation failed, continue with symmetry detection
	}

	// Use algebraic method (normalization now handles parity of trig functions)
	// This gives 'proven' confidence for all cases it can handle
	const algebraicResult = detectSymmetryAlgebraic(node, targetVar);

	if (algebraicResult.confidence === 'proven') {
		return algebraicResult;
	}

	// Fall back to heuristic if algebraic method failed
	const heuristicResult = detectSymmetryHeuristic(node, targetVar);

	if (heuristicResult !== 'unknown') {
		return {
			symmetry: heuristicResult,
			variable: targetVar,
			confidence: 'heuristic',
			reason: 'Structural analysis'
		};
	}

	return algebraicResult;
}

/**
 * Check if an expression is an even function.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is even
 *
 * @example
 * isEven(parseLatex('x^2'))  // true
 * isEven(parseLatex('\\cos(x)'))  // true
 * isEven(parseLatex('x'))  // false
 */
export function isEven(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'even';
}

/**
 * Check if an expression is an odd function.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is odd
 *
 * @example
 * isOdd(parseLatex('x^3'))  // true
 * isOdd(parseLatex('\\sin(x)'))  // true
 * isOdd(parseLatex('x^2'))  // false
 */
export function isOdd(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'odd';
}

/**
 * Check if an expression has no symmetry (neither even nor odd).
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression has no symmetry
 *
 * @example
 * hasNoSymmetry(parseLatex('x^2 + x'))  // true
 * hasNoSymmetry(parseLatex('x + 1'))  // true
 * hasNoSymmetry(parseLatex('x^2'))  // false
 */
export function hasNoSymmetry(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'none';
}
