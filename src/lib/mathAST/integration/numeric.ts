/**
 * Numeric Integration (Simpson's Rule)
 *
 * Provides numeric integration methods for definite integrals when symbolic integration
 * is not available or fails.
 *
 * @module mathAST/integration/numeric
 */

import type { MathNode } from '../types';
import { evaluate } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of numeric integration.
 */
export interface NumericResult {
	/** Computed numeric value of the integral */
	readonly value: number;
	/** Estimated error (absolute) */
	readonly error: number;
	/** Integration method used */
	readonly method: 'simpson' | 'adaptive-simpson';
}

/**
 * Options for numeric integration.
 */
export interface NumericIntegrateOptions {
	/** Tolerance for adaptive methods (default: 1e-6) */
	tolerance?: number;
	/** Maximum recursion depth for adaptive methods (default: 15) */
	maxDepth?: number;
	/** Force specific method ('simpson' or 'adaptive-simpson', default: 'adaptive-simpson') */
	method?: 'simpson' | 'adaptive-simpson';
	/** Number of subintervals for basic Simpson (must be even, default: 100) */
	intervals?: number;
}

// =============================================================================
// Simpson's Rule (Basic)
// =============================================================================

/**
 * Integrate using Simpson's rule.
 *
 * Simpson's rule is exact for polynomials of degree ≤ 3.
 * Formula: (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + 4f(xₙ₋₁) + f(xₙ)]
 * where h = (b-a)/n and n must be even.
 *
 * @param f - Function to integrate
 * @param a - Lower bound
 * @param b - Upper bound
 * @param n - Number of subintervals (must be even)
 * @returns Approximate integral value
 *
 * @throws Error if n is not even
 *
 * @example
 * ```typescript
 * // ∫₀¹ x² dx = 1/3
 * const result = simpson(x => x*x, 0, 1, 10);
 * // result ≈ 0.333333...
 * ```
 */
export function simpson(f: (x: number) => number, a: number, b: number, n: number): number {
	// Validate n is even
	if (n % 2 !== 0) {
		throw new Error(`Simpson's rule requires an even number of subintervals, got ${n}`);
	}

	// Handle edge cases
	if (a === b) return 0;

	// Calculate step size
	const h = (b - a) / n;

	// Initialize sum with endpoints
	let sum = f(a) + f(b);

	// Add interior points with alternating coefficients 4 and 2
	for (let i = 1; i < n; i++) {
		const x = a + i * h;
		const coefficient = i % 2 === 1 ? 4 : 2;
		sum += coefficient * f(x);
	}

	// Apply Simpson's formula
	return (h / 3) * sum;
}

// =============================================================================
// Adaptive Simpson's Rule
// =============================================================================

/**
 * Recursive helper for adaptive Simpson's rule.
 *
 * @param f - Function to integrate
 * @param a - Lower bound
 * @param b - Upper bound
 * @param tolerance - Error tolerance
 * @param fa - f(a) (cached)
 * @param fm - f((a+b)/2) (cached)
 * @param fb - f(b) (cached)
 * @param depth - Current recursion depth
 * @param maxDepth - Maximum allowed depth
 * @returns Approximate integral value
 */
function adaptiveSimpsonRecursive(
	f: (x: number) => number,
	a: number,
	b: number,
	tolerance: number,
	fa: number,
	fm: number,
	fb: number,
	depth: number,
	maxDepth: number
): number {
	// Check recursion depth
	if (depth >= maxDepth) {
		// Return basic Simpson estimate for this interval
		const h = (b - a) / 6;
		return h * (fa + 4 * fm + fb);
	}

	// Calculate midpoint and quarter points
	const m = (a + b) / 2;
	const lm = (a + m) / 2;
	const rm = (m + b) / 2;

	// Evaluate at quarter points
	const flm = f(lm);
	const frm = f(rm);

	// Compute Simpson estimates
	const h = (b - a) / 6;
	const whole = h * (fa + 4 * fm + fb);
	const left = (h / 2) * (fa + 4 * flm + fm);
	const right = (h / 2) * (fm + 4 * frm + fb);

	// Error estimate: |S(a,m) + S(m,b) - S(a,b)| / 15
	const delta = left + right - whole;
	const error = Math.abs(delta) / 15;

	// If error is acceptable, return refined estimate with Richardson extrapolation
	if (error <= tolerance) {
		return left + right + delta / 15;
	}

	// Otherwise, recurse on both halves with tighter tolerance
	const leftResult = adaptiveSimpsonRecursive(
		f,
		a,
		m,
		tolerance / 2,
		fa,
		flm,
		fm,
		depth + 1,
		maxDepth
	);

	const rightResult = adaptiveSimpsonRecursive(
		f,
		m,
		b,
		tolerance / 2,
		fm,
		frm,
		fb,
		depth + 1,
		maxDepth
	);

	return leftResult + rightResult;
}

/**
 * Integrate using adaptive Simpson's rule.
 *
 * Recursively subdivides the interval until the error estimate is below the tolerance.
 * Error estimate: |S(a,m) + S(m,b) - S(a,b)| / 15 where m = (a+b)/2.
 *
 * This method is more efficient than basic Simpson's rule for functions with
 * varying behavior across the interval.
 *
 * @param f - Function to integrate
 * @param a - Lower bound
 * @param b - Upper bound
 * @param tolerance - Error tolerance (default: 1e-6)
 * @param maxDepth - Maximum recursion depth (default: 15)
 * @returns Approximate integral value
 *
 * @example
 * ```typescript
 * // ∫₀^π sin(x) dx = 2
 * const result = adaptiveSimpson(Math.sin, 0, Math.PI, 1e-6, 10);
 * // result ≈ 2 (within 1e-6)
 * ```
 */
export function adaptiveSimpson(
	f: (x: number) => number,
	a: number,
	b: number,
	tolerance: number = 1e-6,
	maxDepth: number = 15
): number {
	// Handle edge cases
	if (a === b) return 0;

	// Evaluate at initial points
	const m = (a + b) / 2;
	const fa = f(a);
	const fm = f(m);
	const fb = f(b);

	// Start recursive refinement
	return adaptiveSimpsonRecursive(f, a, b, tolerance, fa, fm, fb, 0, maxDepth);
}

// =============================================================================
// MathNode Wrapper
// =============================================================================

/**
 * Numerically integrate a MathNode expression.
 *
 * Converts the expression to a function using evaluate(), then applies
 * adaptive Simpson's rule (or basic Simpson if specified).
 *
 * @param expr - Expression to integrate
 * @param variable - Variable of integration
 * @param a - Lower bound
 * @param b - Upper bound
 * @param options - Integration options
 * @returns Numeric result with value, error estimate, and method
 *
 * @throws Error if expression contains variables other than the integration variable
 *
 * @example
 * ```typescript
 * // ∫₀¹ x² dx = 1/3
 * const expr = power(variable('x'), number('2'));
 * const result = numericIntegrate(expr, 'x', 0, 1);
 * // result.value ≈ 0.333333
 * // result.error < 1e-6
 * // result.method = 'adaptive-simpson'
 * ```
 */
export function numericIntegrate(
	expr: MathNode,
	variable: string,
	a: number,
	b: number,
	options: NumericIntegrateOptions = {}
): NumericResult {
	// Merge with defaults
	const tolerance = options.tolerance ?? 1e-6;
	const maxDepth = options.maxDepth ?? 15;
	const method = options.method ?? 'adaptive-simpson';
	const intervals = options.intervals ?? 100;

	// Validate that expression only contains the integration variable
	const variables = getVariables(expr);
	const otherVars = Array.from(variables).filter((v) => v !== variable);
	if (otherVars.length > 0) {
		throw new Error(
			`Cannot numerically integrate: expression contains variables other than ${variable}: ${otherVars.join(', ')}`
		);
	}

	// Convert MathNode to function
	const f = (x: number): number => {
		// Substitute the variable with the numeric value
		const substituted = substitute(expr, { [variable]: { type: 'number', value: String(x) } });

		// Evaluate to get numeric result
		const result = evaluate(substituted, { mode: 'decimal' });

		return result.value as number;
	};

	// Perform integration based on method
	let value: number;
	let error: number;

	if (method === 'simpson') {
		// Validate intervals is even
		if (intervals % 2 !== 0) {
			throw new Error(`Simpson's rule requires an even number of intervals, got ${intervals}`);
		}

		value = simpson(f, a, b, intervals);

		// For basic Simpson, estimate error using Richardson extrapolation
		// Compare with half the intervals
		const coarse = simpson(f, a, b, Math.max(2, Math.floor(intervals / 2)));
		error = Math.abs(value - coarse) / 15;
	} else {
		// Adaptive Simpson
		value = adaptiveSimpson(f, a, b, tolerance, maxDepth);

		// Error estimate is the tolerance (conservative)
		// In practice, adaptive Simpson often achieves better accuracy
		error = tolerance;
	}

	return {
		value,
		error,
		method
	};
}
