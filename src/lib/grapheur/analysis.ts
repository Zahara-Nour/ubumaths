/**
 * Function Analysis for Grapheur
 *
 * Provides numerical algorithms for detecting:
 * - Roots (zeros) where f(x) = 0
 * - Local extrema (minima and maxima)
 * - Vertical asymptotes
 * - Horizontal asymptotes
 * - Oblique (slant) asymptotes
 *
 * @module grapheur/analysis
 */

import type {
	Viewport,
	Root,
	Extremum,
	VerticalAsymptote,
	HorizontalAsymptote,
	ObliqueAsymptote,
	FunctionAnalysis
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Maximum iterations for bisection refinement */
const MAX_ITERATIONS = 50;

/** Tolerance for bisection convergence */
const TOLERANCE = 1e-10;

/** Default number of samples for initial sweep */
const DEFAULT_SAMPLES = 200;

/** Step size for numerical derivative */
const DERIVATIVE_H = 1e-8;

/** Threshold for detecting large jumps (asymptotes) */
const JUMP_THRESHOLD = 100;

/** Large x values for limit estimation */
const LARGE_X_VALUES = [100, 1000, 10000, 100000] as const;

/** Convergence tolerance for limit estimation */
const LIMIT_TOLERANCE = 0.001;

// =============================================================================
// Root Detection
// =============================================================================

/**
 * Find roots (zeros) of a function within the viewport.
 *
 * Algorithm:
 * 1. Sample f(x) across the viewport
 * 2. Detect sign changes (potential roots)
 * 3. Refine each using bisection method
 * 4. Filter out false positives (asymptotes mistaken as roots)
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param viewport - The mathematical viewport bounds
 * @param functionId - ID of the function being analyzed
 * @param numSamples - Number of samples for initial sweep
 * @returns Array of detected roots
 */
export function findRoots(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	functionId: string,
	numSamples: number = DEFAULT_SAMPLES
): Root[] {
	const roots: Root[] = [];
	const step = (viewport.xMax - viewport.xMin) / numSamples;

	let prevX = viewport.xMin;
	let prevY = evaluator(prevX);

	for (let i = 1; i <= numSamples; i++) {
		const x = viewport.xMin + i * step;
		const y = evaluator(x);

		// Sign change indicates potential root
		if (prevY !== null && y !== null && prevY * y < 0) {
			const root = bisectRoot(evaluator, prevX, x, functionId);
			if (root && isValidRoot(evaluator, root.x)) {
				roots.push(root);
			}
		}

		// Check for near-zero value (exact or very close to zero)
		if (y !== null && Math.abs(y) < TOLERANCE) {
			if (!roots.some((r) => Math.abs(r.x - x) < step)) {
				roots.push({
					x,
					functionId,
					confidence: 1.0
				});
			}
		}

		prevX = x;
		prevY = y;
	}

	return roots;
}

/**
 * Refine a root using bisection method.
 */
function bisectRoot(
	evaluator: (x: number) => number | null,
	xLow: number,
	xHigh: number,
	functionId: string
): Root | null {
	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const xMid = (xLow + xHigh) / 2;

		// Check convergence
		if (xHigh - xLow < TOLERANCE) {
			return {
				x: xMid,
				functionId,
				confidence: 1.0
			};
		}

		const yLow = evaluator(xLow);
		const yMid = evaluator(xMid);

		// Handle undefined values
		if (yLow === null || yMid === null) {
			return null;
		}

		// Standard bisection
		if (yLow * yMid < 0) {
			xHigh = xMid;
		} else {
			xLow = xMid;
		}
	}

	// Return best approximation
	const xFinal = (xLow + xHigh) / 2;
	return {
		x: xFinal,
		functionId,
		confidence: 0.9
	};
}

/**
 * Validate that a root is real (not an asymptote false positive).
 */
function isValidRoot(evaluator: (x: number) => number | null, x: number): boolean {
	const y = evaluator(x);
	if (y === null) return false;

	// Check that the function is well-behaved near the root
	const delta = 1e-6;
	const yLeft = evaluator(x - delta);
	const yRight = evaluator(x + delta);

	if (yLeft === null || yRight === null) return false;

	// If the jump is too large, it's likely an asymptote, not a root
	if (Math.abs(yLeft - yRight) > JUMP_THRESHOLD) return false;

	// If |f(x)| is too large, not a real root
	if (Math.abs(y) > 1) return false;

	return true;
}

// =============================================================================
// Extrema Detection
// =============================================================================

/**
 * Find local extrema (minima and maxima) within the viewport.
 *
 * Algorithm:
 * 1. Approximate the derivative f'(x) numerically
 * 2. Detect sign changes in f'(x) (where f'(x) = 0)
 * 3. Refine each using bisection
 * 4. Classify as min or max using second derivative
 *
 * @param evaluator - Function that takes x and returns y
 * @param viewport - The mathematical viewport bounds
 * @param functionId - ID of the function being analyzed
 * @param numSamples - Number of samples for initial sweep
 * @returns Array of detected extrema
 */
export function findExtrema(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	functionId: string,
	numSamples: number = DEFAULT_SAMPLES
): Extremum[] {
	const extrema: Extremum[] = [];
	const step = (viewport.xMax - viewport.xMin) / numSamples;

	let prevX = viewport.xMin;
	let prevDeriv = approximateDerivative(evaluator, prevX);

	for (let i = 1; i <= numSamples; i++) {
		const x = viewport.xMin + i * step;
		const deriv = approximateDerivative(evaluator, x);

		// Sign change in derivative indicates extremum
		if (prevDeriv !== null && deriv !== null && prevDeriv * deriv < 0) {
			const extremum = bisectExtremum(evaluator, prevX, x, functionId);
			if (extremum) {
				// Only include if y is within viewport
				if (extremum.y >= viewport.yMin && extremum.y <= viewport.yMax) {
					extrema.push(extremum);
				}
			}
		}

		prevX = x;
		prevDeriv = deriv;
	}

	return extrema;
}

/**
 * Approximate the derivative using central differences.
 * f'(x) = (f(x+h) - f(x-h)) / (2h)
 */
function approximateDerivative(
	evaluator: (x: number) => number | null,
	x: number,
	h: number = DERIVATIVE_H
): number | null {
	const yPlus = evaluator(x + h);
	const yMinus = evaluator(x - h);

	if (yPlus === null || yMinus === null) return null;

	return (yPlus - yMinus) / (2 * h);
}

/**
 * Refine an extremum using bisection on the derivative.
 */
function bisectExtremum(
	evaluator: (x: number) => number | null,
	xLow: number,
	xHigh: number,
	functionId: string
): Extremum | null {
	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const xMid = (xLow + xHigh) / 2;

		// Check convergence
		if (xHigh - xLow < TOLERANCE) {
			const y = evaluator(xMid);
			if (y === null) return null;

			// Classify as min or max using second derivative
			const type = classifyExtremum(evaluator, xMid);

			return {
				x: xMid,
				y,
				type,
				functionId,
				confidence: 1.0
			};
		}

		const derivLow = approximateDerivative(evaluator, xLow);
		const derivMid = approximateDerivative(evaluator, xMid);

		// Handle undefined values
		if (derivLow === null || derivMid === null) {
			return null;
		}

		// Standard bisection on derivative
		if (derivLow * derivMid < 0) {
			xHigh = xMid;
		} else {
			xLow = xMid;
		}
	}

	// Return best approximation
	const xFinal = (xLow + xHigh) / 2;
	const y = evaluator(xFinal);
	if (y === null) return null;

	return {
		x: xFinal,
		y,
		type: classifyExtremum(evaluator, xFinal),
		functionId,
		confidence: 0.9
	};
}

/**
 * Classify an extremum as min or max using second derivative.
 * f''(x) > 0 => minimum, f''(x) < 0 => maximum
 */
function classifyExtremum(evaluator: (x: number) => number | null, x: number): 'min' | 'max' {
	const h = DERIVATIVE_H * 100; // Larger step for second derivative

	const yMinus = evaluator(x - h);
	const y = evaluator(x);
	const yPlus = evaluator(x + h);

	if (yMinus === null || y === null || yPlus === null) {
		// Fall back: if we can't determine, default to max
		// This is a rare edge case where numerical derivative failed
		return 'max';
	}

	// f''(x) ≈ (f(x+h) - 2f(x) + f(x-h)) / h²
	const secondDeriv = (yPlus - 2 * y + yMinus) / (h * h);

	return secondDeriv > 0 ? 'min' : 'max';
}

// =============================================================================
// Vertical Asymptote Detection
// =============================================================================

/**
 * Find vertical asymptotes within the viewport.
 *
 * Algorithm:
 * 1. Detect discontinuities (null values or large jumps)
 * 2. Refine location using binary search
 * 3. Determine behavior (→+∞ or →-∞)
 *
 * @param evaluator - Function that takes x and returns y
 * @param viewport - The mathematical viewport bounds
 * @param functionId - ID of the function being analyzed
 * @param numSamples - Number of samples for initial sweep
 * @returns Array of detected vertical asymptotes
 */
export function findVerticalAsymptotes(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	functionId: string,
	numSamples: number = DEFAULT_SAMPLES
): VerticalAsymptote[] {
	const asymptotes: VerticalAsymptote[] = [];
	const step = (viewport.xMax - viewport.xMin) / numSamples;
	const viewportHeight = viewport.yMax - viewport.yMin;

	let prevX = viewport.xMin;
	let prevY = evaluator(prevX);

	for (let i = 1; i <= numSamples; i++) {
		const x = viewport.xMin + i * step;
		const y = evaluator(x);

		// Check for discontinuity
		if (isDiscontinuity(prevY, y, viewportHeight)) {
			const asymptoteX = refineDiscontinuity(evaluator, prevX, x);

			// Determine behavior
			const behavior = determineBehavior(evaluator, asymptoteX);

			// Avoid duplicates
			if (!asymptotes.some((a) => Math.abs(a.x - asymptoteX) < step * 2)) {
				asymptotes.push({
					x: asymptoteX,
					functionId,
					behavior
				});
			}
		}

		prevX = x;
		prevY = y;
	}

	return asymptotes;
}

/**
 * Check if there's a discontinuity between two points.
 */
function isDiscontinuity(y1: number | null, y2: number | null, viewportHeight: number): boolean {
	// If either value is null, it's a discontinuity
	if (y1 === null || y2 === null) return true;

	// Large jump indicates asymptote
	const height = Math.max(viewportHeight, 1);
	const threshold = height * 5;

	return Math.abs(y1 - y2) > threshold;
}

/**
 * Refine the location of a discontinuity using binary search.
 */
function refineDiscontinuity(
	evaluator: (x: number) => number | null,
	xLow: number,
	xHigh: number
): number {
	for (let i = 0; i < 20; i++) {
		const xMid = (xLow + xHigh) / 2;

		if (xHigh - xLow < TOLERANCE) {
			return xMid;
		}

		const yLow = evaluator(xLow);
		const yMid = evaluator(xMid);

		// If discontinuity is between low and mid
		if (yLow === null || yMid === null || Math.abs((yMid ?? 0) - (yLow ?? 0)) > JUMP_THRESHOLD) {
			xHigh = xMid;
		} else {
			xLow = xMid;
		}
	}

	return (xLow + xHigh) / 2;
}

/**
 * Determine the behavior of a vertical asymptote.
 */
function determineBehavior(
	evaluator: (x: number) => number | null,
	x: number
): 'positive' | 'negative' | 'both' {
	const delta = 1e-4;

	const leftY = evaluator(x - delta);
	const rightY = evaluator(x + delta);

	const leftPositive = leftY !== null && leftY > 0;
	const leftNegative = leftY !== null && leftY < 0;
	const rightPositive = rightY !== null && rightY > 0;
	const rightNegative = rightY !== null && rightY < 0;

	if (
		(leftPositive && rightPositive) ||
		(leftY === null && rightPositive) ||
		(leftPositive && rightY === null)
	) {
		return 'positive';
	}
	if (
		(leftNegative && rightNegative) ||
		(leftY === null && rightNegative) ||
		(leftNegative && rightY === null)
	) {
		return 'negative';
	}
	return 'both';
}

// =============================================================================
// Horizontal Asymptote Detection
// =============================================================================

/**
 * Find horizontal asymptotes by estimating limits at ±∞.
 *
 * Algorithm:
 * 1. Sample at large x values
 * 2. Check if values converge
 * 3. If converged, report y = limit value
 *
 * @param evaluator - Function that takes x and returns y
 * @param functionId - ID of the function being analyzed
 * @returns Array of detected horizontal asymptotes
 */
export function findHorizontalAsymptotes(
	evaluator: (x: number) => number | null,
	functionId: string
): HorizontalAsymptote[] {
	const asymptotes: HorizontalAsymptote[] = [];

	// Check positive direction (x → +∞)
	const limitRight = estimateLimit(evaluator, LARGE_X_VALUES);
	// Check negative direction (x → -∞)
	const limitLeft = estimateLimit(
		evaluator,
		LARGE_X_VALUES.map((x) => -x)
	);

	if (limitRight !== null && limitLeft !== null) {
		// Both limits exist
		if (Math.abs(limitRight - limitLeft) < LIMIT_TOLERANCE) {
			// Same limit in both directions
			asymptotes.push({
				y: (limitRight + limitLeft) / 2,
				functionId,
				direction: 'both'
			});
		} else {
			// Different limits
			asymptotes.push({
				y: limitRight,
				functionId,
				direction: 'right'
			});
			asymptotes.push({
				y: limitLeft,
				functionId,
				direction: 'left'
			});
		}
	} else if (limitRight !== null) {
		asymptotes.push({
			y: limitRight,
			functionId,
			direction: 'right'
		});
	} else if (limitLeft !== null) {
		asymptotes.push({
			y: limitLeft,
			functionId,
			direction: 'left'
		});
	}

	return asymptotes;
}

/**
 * Estimate the limit of a function at a sequence of x values.
 * Returns null if the values don't converge.
 */
function estimateLimit(
	evaluator: (x: number) => number | null,
	xValues: readonly number[] | number[]
): number | null {
	const values: number[] = [];

	for (const x of xValues) {
		const y = evaluator(x);
		if (y === null || !isFinite(y)) return null;
		values.push(y);
	}

	// Check convergence: differences should shrink
	for (let i = 1; i < values.length; i++) {
		const diff = Math.abs(values[i] - values[i - 1]);
		const prevDiff = i > 1 ? Math.abs(values[i - 1] - values[i - 2]) : Infinity;

		// If difference is not shrinking, not converging
		if (i > 1 && diff >= prevDiff * 0.9) {
			// Allow some tolerance
			return null;
		}
	}

	// Check that the final values are close enough
	const lastTwo = values.slice(-2);
	if (Math.abs(lastTwo[0] - lastTwo[1]) > LIMIT_TOLERANCE) {
		return null;
	}

	// Return the last value as the limit
	return values[values.length - 1];
}

// =============================================================================
// Oblique Asymptote Detection
// =============================================================================

/**
 * Find oblique (slant) asymptotes y = mx + b as x → ±∞.
 *
 * Algorithm:
 * 1. Estimate m = lim f(x)/x at large |x|
 * 2. If m exists and is non-zero, estimate b = lim (f(x) - mx)
 * 3. Validate both converge
 *
 * @param evaluator - Function that takes x and returns y
 * @param functionId - ID of the function being analyzed
 * @returns Array of detected oblique asymptotes
 */
export function findObliqueAsymptotes(
	evaluator: (x: number) => number | null,
	functionId: string
): ObliqueAsymptote[] {
	const asymptotes: ObliqueAsymptote[] = [];

	// Check positive direction
	const obliqueRight = estimateObliqueAsymptote(evaluator, LARGE_X_VALUES);
	// Check negative direction
	const obliqueLeft = estimateObliqueAsymptote(
		evaluator,
		LARGE_X_VALUES.map((x) => -x)
	);

	if (obliqueRight !== null && obliqueLeft !== null) {
		// Check if same asymptote in both directions
		if (
			Math.abs(obliqueRight.m - obliqueLeft.m) < LIMIT_TOLERANCE &&
			Math.abs(obliqueRight.b - obliqueLeft.b) < LIMIT_TOLERANCE
		) {
			asymptotes.push({
				m: (obliqueRight.m + obliqueLeft.m) / 2,
				b: (obliqueRight.b + obliqueLeft.b) / 2,
				functionId,
				direction: 'both'
			});
		} else {
			asymptotes.push({
				...obliqueRight,
				functionId,
				direction: 'right'
			});
			asymptotes.push({
				...obliqueLeft,
				functionId,
				direction: 'left'
			});
		}
	} else if (obliqueRight !== null) {
		asymptotes.push({
			...obliqueRight,
			functionId,
			direction: 'right'
		});
	} else if (obliqueLeft !== null) {
		asymptotes.push({
			...obliqueLeft,
			functionId,
			direction: 'left'
		});
	}

	return asymptotes;
}

/**
 * Estimate oblique asymptote parameters m and b.
 */
function estimateObliqueAsymptote(
	evaluator: (x: number) => number | null,
	xValues: readonly number[] | number[]
): { m: number; b: number } | null {
	// Step 1: Estimate m = lim f(x)/x
	const mValues: number[] = [];

	for (const x of xValues) {
		// Skip x values too close to zero to avoid division instability
		if (Math.abs(x) < 1e-6) continue;
		const y = evaluator(x);
		if (y === null || !isFinite(y)) return null;
		mValues.push(y / x);
	}

	// Check if m converges
	const m = checkConvergence(mValues);
	if (m === null) return null;

	// If m is essentially zero, this is a horizontal asymptote, not oblique
	if (Math.abs(m) < LIMIT_TOLERANCE) return null;

	// Step 2: Estimate b = lim (f(x) - mx)
	const bValues: number[] = [];

	for (const x of xValues) {
		const y = evaluator(x);
		if (y === null || !isFinite(y)) return null;
		bValues.push(y - m * x);
	}

	// Check if b converges
	const b = checkConvergence(bValues);
	if (b === null) return null;

	return { m, b };
}

/**
 * Check if a sequence of values converges and return the limit.
 */
function checkConvergence(values: number[]): number | null {
	if (values.length < 2) return null;

	// Check that differences are shrinking
	let lastDiff = Infinity;
	for (let i = 1; i < values.length; i++) {
		const diff = Math.abs(values[i] - values[i - 1]);
		if (diff >= lastDiff * 0.95) {
			// Not converging fast enough
			return null;
		}
		lastDiff = diff;
	}

	// Check final convergence
	const lastTwo = values.slice(-2);
	if (Math.abs(lastTwo[0] - lastTwo[1]) > LIMIT_TOLERANCE * 10) {
		return null;
	}

	return values[values.length - 1];
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Perform complete analysis of a function.
 *
 * @param evaluator - Function that takes x and returns y
 * @param viewport - The mathematical viewport bounds
 * @param functionId - ID of the function being analyzed
 * @returns Complete analysis results
 */
export function analyzeFunction(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	functionId: string
): FunctionAnalysis {
	return {
		functionId,
		roots: findRoots(evaluator, viewport, functionId),
		extrema: findExtrema(evaluator, viewport, functionId),
		verticalAsymptotes: findVerticalAsymptotes(evaluator, viewport, functionId),
		horizontalAsymptotes: findHorizontalAsymptotes(evaluator, functionId),
		obliqueAsymptotes: findObliqueAsymptotes(evaluator, functionId)
	};
}

/**
 * Analyze multiple functions.
 *
 * @param functions - Array of functions with their IDs and evaluators
 * @param viewport - The mathematical viewport bounds
 * @returns Array of analysis results for each function
 */
export function analyzeAllFunctions(
	functions: readonly { id: string; evaluator: (x: number) => number | null }[],
	viewport: Viewport
): FunctionAnalysis[] {
	return functions.map((f) => analyzeFunction(f.evaluator, viewport, f.id));
}
