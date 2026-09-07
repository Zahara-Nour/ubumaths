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
import type { Plottable } from './types';
import type { SampledCurve } from '$lib/geometry-core/viewport';
import { sampleFunction } from '$lib/geometry-core/viewport';
import { isExplicitFunction } from './types';
import type { ExplicitFunction } from './types';
import { createEvaluator } from './evaluator';
import type { VariableBindings } from './evaluator';
import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { compile } from '$lib/mathAST/eval/compile';
import { differentiate } from '$lib/mathAST/differentiation';
import { findCriticalZeros, findCriticalExtrema } from '$lib/mathAST/analysis';
import { simplify } from '$lib/mathAST/simplify';
import { substitute } from '$lib/mathAST/eval/substitute';
import { add, multiply, variable } from '$lib/mathAST/factory';
// `number()` refuse un littéral signé ; `numericNode()` gère le signe lui-même.
import { numericNode } from '$lib/mathAST/common/numeric';
import { integrateDefinite } from '$lib/mathAST/integration';
import type {
	DifferentiableCurve,
	OsculatingCircleData
} from '$lib/geometry-core/graph/parametric-calculus';
import {
	computeArcLength,
	computeCurvature,
	computeOsculatingCircle
} from '$lib/geometry-core/graph/parametric-calculus';

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
/** Optional AST info for hybrid exact+numeric analysis. */
export interface AnalysisASTInfo {
	expression: MathNode;
	derivative?: MathNode;
	compiledFn: CompiledFn;
	compiledDerivative?: CompiledFn;
}

export function analyzeFunction(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	functionId: string,
	ast?: AnalysisASTInfo
): FunctionAnalysis {
	// Use hybrid exact+numeric analysis when AST is available
	let roots: Root[];
	let extrema: Extremum[];

	if (ast) {
		const criticalZeros = findCriticalZeros(
			ast.expression,
			ast.compiledFn,
			'x',
			viewport.xMin,
			viewport.xMax
		);
		roots = criticalZeros.map((cp) => ({
			x: cp.xNumeric,
			functionId,
			confidence: cp.exact ? 1.0 : 0.9,
			...(cp.exact ? { exactX: cp.x } : {})
		}));

		if (ast.derivative && ast.compiledDerivative) {
			const criticalExtrema = findCriticalExtrema(
				ast.expression,
				ast.derivative,
				ast.compiledFn,
				ast.compiledDerivative,
				'x',
				viewport.xMin,
				viewport.xMax
			);
			extrema = criticalExtrema
				.filter((cp) => cp.yNumeric >= viewport.yMin && cp.yNumeric <= viewport.yMax)
				.map((cp) => ({
					x: cp.xNumeric,
					y: cp.yNumeric,
					type: cp.type as 'min' | 'max',
					functionId,
					confidence: cp.exact ? 1.0 : 0.9,
					...(cp.exact ? { exactX: cp.x, exactY: simplifyExact(cp.y) } : {})
				}));
		} else {
			extrema = findExtrema(evaluator, viewport, functionId);
		}
	} else {
		roots = findRoots(evaluator, viewport, functionId);
		extrema = findExtrema(evaluator, viewport, functionId);
	}

	return {
		functionId,
		roots,
		extrema,
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
	functions: readonly AnalysisInput[],
	viewport: Viewport
): FunctionAnalysis[] {
	return functions.map((f) => analyzeCached(f, viewport));
}

/**
 * Analysis results, keyed by expression then by function and viewport.
 *
 * Zeros, extrema and asymptotes depend on the expression and on the window —
 * on nothing else. Yet the four components that display them re-read the whole
 * function list, which changes at every move of the tangent slider: without
 * this cache, dragging it re-ran symbolic solving and two numeric sweeps per
 * function, four times per frame.
 *
 * Parameter values need no key of their own: `bindParameters` already returns
 * a distinct node per set of values, so the expression identity carries them.
 */
const analysisCache = new WeakMap<MathNode, Map<string, FunctionAnalysis>>();

/** Viewports kept per expression before the cache is emptied. */
const MAX_ANALYSES_PER_EXPRESSION = 200;

function analyzeCached(input: AnalysisInput, viewport: Viewport): FunctionAnalysis {
	const expression = input.ast?.expression;
	if (!expression) return analyzeFunction(input.evaluator, viewport, input.id, input.ast);

	const key = `${input.id}|${viewport.xMin},${viewport.xMax},${viewport.yMin},${viewport.yMax}`;
	const perExpression = analysisCache.get(expression) ?? new Map<string, FunctionAnalysis>();

	const cached = perExpression.get(key);
	if (cached) return cached;

	// Un panoramique crée une clé par fenêtre traversée : on repart à zéro
	// plutôt que de laisser la carte enfler sans fin.
	if (perExpression.size >= MAX_ANALYSES_PER_EXPRESSION) perExpression.clear();

	const analysis = analyzeFunction(input.evaluator, viewport, input.id, input.ast);
	perExpression.set(key, analysis);
	analysisCache.set(expression, perExpression);
	return analysis;
}

/**
 * Simplify an ordinate before it is shown.
 *
 * `findCriticalExtrema` returns `y` as the expression evaluated at the critical
 * point, unreduced: the vertex of `x² − 2` comes back as `0^2 - 2`, and a
 * trigonometric one as `sin(-π/2) - 0.5`. Nobody wants to read that.
 */
function simplifyExact(node: MathNode): MathNode {
	try {
		return simplify(node).result;
	} catch {
		return node;
	}
}

// =============================================================================
// Analysis Inputs
// =============================================================================

/** One curve to analyse: its evaluator, plus the AST that unlocks exact results. */
export interface AnalysisInput {
	readonly id: string;
	readonly evaluator: (x: number) => number | null;
	readonly ast?: AnalysisASTInfo;
}

/**
 * Derivative and compiled closures are cached per AST node. A pan or a zoom
 * re-runs the analysis with the very same AST object, which is only replaced
 * when the user edits the expression.
 */
const analysisASTCache = new WeakMap<MathNode, AnalysisASTInfo>();

/**
 * Build the AST information `analyzeFunction()` needs to take its exact path.
 *
 * Returns `undefined` when the expression cannot be compiled at all; a missing
 * derivative alone is not fatal, extrema simply fall back to the numeric sweep.
 */
export function buildAnalysisAST(ast: MathNode): AnalysisASTInfo | undefined {
	const cached = analysisASTCache.get(ast);
	if (cached) return cached;

	let compiledFn: CompiledFn;
	try {
		compiledFn = compile(ast);
	} catch {
		return undefined;
	}

	let info: AnalysisASTInfo = { expression: ast, compiledFn };
	try {
		const derivative = differentiate(ast, { variable: 'x', simplify: true });
		info = { ...info, derivative, compiledDerivative: compile(derivative) };
	} catch {
		// Keep the zeros exact even when the derivative is out of reach.
	}

	analysisASTCache.set(ast, info);
	return info;
}

/**
 * Turn the graph's plottables into analysis inputs.
 *
 * Single entry point for the components that display roots, extrema and
 * asymptotes: they used to assemble `{ id, evaluator }` by hand and all three
 * forgot the AST, which silently disabled the exact analysis.
 *
 * @param plottables - Everything the graph holds, sequences included
 * @returns One input per visible explicit function with a parsable expression
 */
export function toAnalysisInputs(
	plottables: readonly Plottable[],
	bindings: VariableBindings = {}
): AnalysisInput[] {
	const inputs: AnalysisInput[] = [];

	for (const plottable of plottables) {
		if (!isExplicitFunction(plottable) || !plottable.visible) continue;

		const ast = plottable.ast;
		if (!ast) continue;

		// Parameters are substituted before anything symbolic runs: `solve` would
		// treat a free `a` as a second unknown, and the derivative would carry it.
		const bound = bindParameters(ast, bindings);
		if (!bound) continue;

		inputs.push({
			id: plottable.id,
			evaluator: cachedEvaluator(bound),
			ast: buildAnalysisAST(bound)
		});
	}

	return inputs;
}

/**
 * Replace the parameters an expression uses by their current values.
 *
 * The substituted AST is cached per (expression, bindings) so a slider drag
 * does not rebuild it — and so `buildAnalysisAST`, keyed on the node identity,
 * keeps hitting its own cache between frames at a constant slider value.
 *
 * @returns The bound expression, or undefined when substitution fails
 */
export function bindParameters(ast: MathNode, bindings: VariableBindings): MathNode | undefined {
	const names = Object.keys(bindings);
	if (names.length === 0) return ast;

	const perAst = boundASTCache.get(ast) ?? new Map<string, MathNode>();
	const key = names
		.sort()
		.map((n) => `${n}=${bindings[n]}`)
		.join(',');

	const cached = perAst.get(key);
	if (cached) return cached;

	let bound: MathNode;
	try {
		bound = substitute(ast, bindings);
	} catch {
		return undefined;
	}

	perAst.set(key, bound);
	boundASTCache.set(ast, perAst);
	return bound;
}

/**
 * Build the curve of `f'`, drawn alongside `f`.
 *
 * Returned as a plottable of its own so the renderer needs no special case,
 * but derived from the function each frame rather than stored: editing `f`
 * redraws `f'`, which is the whole point of showing them together.
 *
 * Parameters are bound before differentiating, so `a·x²` with `a = 3` gives
 * `6x` and not an expression still carrying `a`.
 *
 * @returns The derivative curve, or undefined when it cannot be built
 */
export function derivativeCurve(
	func: ExplicitFunction,
	bindings: VariableBindings = {}
): ExplicitFunction | undefined {
	if (!func.ast) return undefined;

	const bound = bindParameters(func.ast, bindings);
	if (!bound) return undefined;

	const derivative = buildAnalysisAST(bound)?.derivative;
	if (!derivative) return undefined;

	// Rendre le même objet pour les mêmes entrées : le composant de tracé
	// n'échantillonne à nouveau que si sa prop a réellement changé.
	const key = `${func.id}|${func.color}|${func.lineWidth}|${func.visible}`;
	const cached = derivativeCache.get(derivative);
	if (cached?.key === key) return cached.curve;

	const curve: ExplicitFunction = {
		...func,
		id: `${func.id}:derivative`,
		ast: derivative,
		parseError: undefined,
		// Dashed, so the two curves stay tellable apart at a glance.
		lineStyle: 'dashed',
		lineWidth: Math.max(func.lineWidth - 1, 1),
		showDerivative: false
	};

	derivativeCache.set(derivative, { key, curve });
	return curve;
}

/** Derivative curves, keyed by the derivative expression. */
const derivativeCache = new WeakMap<MathNode, { key: string; curve: ExplicitFunction }>();

/** A tangent: where it touches, how steep it is, and the line itself. */
export interface TangentResult {
	/** Abscissa of the point of tangency. */
	readonly x: number;
	/** Ordinate of the point of tangency. */
	readonly y: number;
	/** `f'(x₀)` — the slope, which is the number the tangent makes visible. */
	readonly slope: number;
	/** The tangent as a plottable line, ready for the same renderer as a curve. */
	readonly line: ExplicitFunction;
}

/**
 * Build the tangent to `f` at `x₀`.
 *
 * The line is handed back as a plottable of its own so the renderer needs no
 * special case — a tangent is a curve like another, it just happens to be
 * straight. Its equation is built from the two numbers `f(x₀)` and `f'(x₀)`,
 * both read from the derivative `buildAnalysisAST` already memoises.
 *
 * @returns The tangent, or undefined where `f` or `f'` is not defined
 */
export function tangentAt(
	func: ExplicitFunction,
	x0: number,
	bindings: VariableBindings = {}
): TangentResult | undefined {
	if (!func.ast || !Number.isFinite(x0)) return undefined;

	const bound = bindParameters(func.ast, bindings);
	if (!bound) return undefined;

	const info = buildAnalysisAST(bound);
	if (!info?.compiledDerivative) return undefined;

	const y = info.compiledFn({ x: x0 });
	const slope = info.compiledDerivative({ x: x0 });
	if (!Number.isFinite(y) || !Number.isFinite(slope)) return undefined;

	// y = f(x₀) + f'(x₀)·(x − x₀), écrite sous forme réduite.
	const intercept = y - slope * x0;
	const line = add(multiply(numericNode(slope), variable('x'), 'implicit'), numericNode(intercept));

	return {
		x: x0,
		y,
		slope,
		line: {
			...func,
			id: `${func.id}:tangent`,
			ast: line,
			parseError: undefined,
			lineWidth: 1,
			lineStyle: 'solid',
			showDerivative: false,
			tangentAt: null
		}
	};
}

/** The area between a curve and the axis, ready to shade and to read. */
export interface IntegralResult {
	readonly from: number;
	readonly to: number;
	/** Signed value: a region below the axis counts negative. */
	readonly value: number;
	/** Exact value, when mathAST found an antiderivative. */
	readonly exact: MathNode | undefined;
	/** Boundary of the region, in math coordinates, from `from` to `to`. */
	readonly points: readonly { readonly x: number; readonly y: number }[];
}

/** Samples used to draw the shaded boundary. */
const INTEGRAL_SAMPLES = 200;

/**
 * Compute the signed area between `f` and the axis, over `[from ; to]`.
 *
 * The value comes from `integrateDefinite` of mathAST — exact when an
 * antiderivative exists, numeric otherwise — so nothing is recomputed here.
 * What this adds is the outline to shade, which the integral itself has no
 * reason to know about.
 *
 * @returns The area and its outline, or undefined when it cannot be computed
 */
export function integralUnder(
	func: ExplicitFunction,
	from: number,
	to: number,
	bindings: VariableBindings = {}
): IntegralResult | undefined {
	if (!func.ast || !Number.isFinite(from) || !Number.isFinite(to) || from === to) return undefined;

	const [lower, upper] = from < to ? [from, to] : [to, from];
	const bound = bindParameters(func.ast, bindings);
	if (!bound) return undefined;

	// L'aire ne dépend que de l'expression et des bornes. Elle est demandée deux
	// fois par rendu — le remplissage et la valeur affichée — et son intégration
	// symbolique coûte le plus cher de tout ce que le panneau recalcule.
	const cacheKey = `${lower},${upper}`;
	const perExpression = integralCache.get(bound) ?? new Map<string, IntegralResult>();
	const cachedIntegral = perExpression.get(cacheKey);
	if (cachedIntegral) return cachedIntegral;

	const info = buildAnalysisAST(bound);
	if (!info) return undefined;

	let result;
	try {
		result = integrateDefinite(bound, numericNode(lower), numericNode(upper));
	} catch {
		return undefined;
	}

	const value = result.approximate ?? evaluateToNumber(result.value);
	if (value === undefined) return undefined;

	// Outline of the region, sampled left to right. A rank where `f` is not
	// defined breaks the region rather than joining across the gap.
	const points: { x: number; y: number }[] = [];
	const step = (upper - lower) / INTEGRAL_SAMPLES;

	for (let i = 0; i <= INTEGRAL_SAMPLES; i++) {
		const x = lower + i * step;
		const y = info.compiledFn({ x });
		if (Number.isFinite(y)) points.push({ x, y });
	}

	if (points.length < 2) return undefined;

	const integral: IntegralResult = {
		from: lower,
		to: upper,
		value,
		exact: result.status === 'exact' ? (result.value ?? undefined) : undefined,
		points
	};

	if (perExpression.size >= MAX_SAMPLES_PER_EXPRESSION) perExpression.clear();
	perExpression.set(cacheKey, integral);
	integralCache.set(bound, perExpression);
	return integral;
}

/** Areas, keyed by expression then by bounds. */
const integralCache = new WeakMap<MathNode, Map<string, IntegralResult>>();

/** Read a numeric value off an exact node, when it has one. */
function evaluateToNumber(node: MathNode | null): number | undefined {
	if (!node) return undefined;

	try {
		const compiled = compile(node);
		const value = compiled({});
		return Number.isFinite(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

/**
 * See `y = f(x)` as the parametrised curve `t ↦ (t, f(t))`.
 *
 * That is all it takes to reuse the arc length, curvature and osculating
 * circle of `geometry-core`, which are stated for a parametrised curve and do
 * not care where its closures come from. Nothing of those formulas is rewritten
 * here.
 *
 * @returns The curve seen parametrically, or undefined without a second derivative
 */
export function asParametricCurve(
	func: ExplicitFunction,
	bindings: VariableBindings = {}
): DifferentiableCurve | undefined {
	if (!func.ast) return undefined;

	const bound = bindParameters(func.ast, bindings);
	if (!bound) return undefined;

	const info = buildAnalysisAST(bound);
	if (!info?.derivative || !info.compiledDerivative) return undefined;

	let compiledSecond: CompiledFn;
	try {
		compiledSecond = compile(differentiate(info.derivative, { variable: 'x', simplify: true }));
	} catch {
		return undefined;
	}

	return {
		parameter: 'x',
		compiledX: (vars) => vars.x,
		compiledY: info.compiledFn,
		// x = t, donc x' = 1 et x'' = 0.
		compiledXPrime: () => 1,
		compiledYPrime: info.compiledDerivative,
		compiledXSecond: () => 0,
		compiledYSecond: compiledSecond
	};
}

/**
 * Length of the curve between two abscissas.
 *
 * `computeArcLength` of geometry-core does the integrating; all this adds is
 * seeing `f` as a parametrised curve.
 *
 * @returns The length, or undefined when it cannot be computed
 */
export function arcLengthBetween(
	func: ExplicitFunction,
	from: number,
	to: number,
	bindings: VariableBindings = {}
): number | undefined {
	if (from === to) return undefined;

	const curve = asParametricCurve(func, bindings);
	if (!curve) return undefined;

	const [lower, upper] = from < to ? [from, to] : [to, from];
	const length = computeArcLength(curve, {}, lower, upper);
	return Number.isFinite(length) ? length : undefined;
}

/** Signed curvature of the curve at an abscissa. */
export function curvatureAt(
	func: ExplicitFunction,
	x0: number,
	bindings: VariableBindings = {}
): number | undefined {
	const curve = asParametricCurve(func, bindings);
	if (!curve) return undefined;

	return computeCurvature(curve, {}, x0) ?? undefined;
}

/**
 * Osculating circle at an abscissa — the circle that best hugs the curve there.
 *
 * Undefined where the curve is straight: a zero curvature has no finite circle,
 * only the tangent.
 */
export function osculatingCircleAt(
	func: ExplicitFunction,
	x0: number,
	bindings: VariableBindings = {}
): OsculatingCircleData | undefined {
	const curve = asParametricCurve(func, bindings);
	if (!curve) return undefined;

	return computeOsculatingCircle(curve, {}, x0) ?? undefined;
}

/**
 * Evaluators, keyed by expression.
 *
 * `createEvaluator` compiles the AST each time it is called, and the four
 * display components call it on every render. The expression rarely changes;
 * the compilation should not be redone because a slider moved.
 */
const evaluatorCache = new WeakMap<MathNode, (x: number) => number | null>();

function cachedEvaluator(ast: MathNode): (x: number) => number | null {
	const cached = evaluatorCache.get(ast);
	if (cached) return cached;

	const evaluator = createEvaluator(ast);
	evaluatorCache.set(ast, evaluator);
	return evaluator;
}

/**
 * Sampled curves, keyed by expression then by viewport and point count.
 *
 * Moving the tangent's abscissa changes neither the curve of `f`, nor that of
 * `f'`, nor the shaded area — yet each of them was re-sampled, because every
 * render hands the components a fresh object. Returning the same result for
 * the same inputs lets that work be skipped.
 */
const sampledCurveCache = new WeakMap<MathNode, Map<string, SampledCurve>>();

/** Viewports kept per expression before the cache is emptied. */
const MAX_SAMPLES_PER_EXPRESSION = 200;

/**
 * Sample a curve over a viewport, reusing the previous result when nothing
 * that matters has changed.
 *
 * @param ast - Expression, already bound to its parameter values
 * @param viewport - Current bounds
 * @param numPoints - Sample count, which the interaction state may lower
 */
export function sampleCached(ast: MathNode, viewport: Viewport, numPoints: number): SampledCurve {
	const key = `${viewport.xMin},${viewport.xMax},${viewport.yMin},${viewport.yMax}|${numPoints}`;
	const perExpression = sampledCurveCache.get(ast) ?? new Map<string, SampledCurve>();

	const cached = perExpression.get(key);
	if (cached) return cached;

	if (perExpression.size >= MAX_SAMPLES_PER_EXPRESSION) perExpression.clear();

	const sampled = sampleFunction(cachedEvaluator(ast), viewport, numPoints);
	perExpression.set(key, sampled);
	sampledCurveCache.set(ast, perExpression);
	return sampled;
}

/** Substituted expressions, keyed by source AST then by binding values. */
const boundASTCache = new WeakMap<MathNode, Map<string, MathNode>>();
