/**
 * Grapheur Sampler - Generate sample points for curve rendering
 *
 * This module handles the sampling of mathematical functions over a viewport
 * to produce point arrays suitable for SVG path rendering. It includes
 * discontinuity detection for handling asymptotes and domain errors.
 *
 * @module grapheur/sampler
 */

import type { Point, SampledCurve, Viewport } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default number of sample points across the viewport.
 * 200 points provides a good balance between smoothness and performance.
 */
export const DEFAULT_NUM_POINTS = 200;

/**
 * Factor used to detect asymptotes.
 * If the change in y between consecutive points exceeds this factor
 * times the viewport height, it's considered an asymptote.
 */
const ASYMPTOTE_FACTOR = 2;

/**
 * Minimum viewport dimension to prevent division by zero or extreme sampling.
 */
const MIN_VIEWPORT_DIM = 1e-10;

// =============================================================================
// Asymptote Detection
// =============================================================================

/**
 * Detect if there's an asymptote between two consecutive points.
 *
 * An asymptote is detected when:
 * - Either y value is null (domain error)
 * - The change in y is greater than ASYMPTOTE_FACTOR * viewportHeight
 * - The y values have opposite signs and are both large (crossing asymptote)
 *
 * @param y1 - First y value (or null if undefined)
 * @param y2 - Second y value (or null if undefined)
 * @param viewportHeight - Height of the viewport in math units
 * @returns true if an asymptote is detected
 *
 * @example
 * ```typescript
 * // Domain error causes discontinuity
 * isAsymptote(null, 5, 10); // true
 *
 * // Large jump causes discontinuity
 * isAsymptote(1000, -1000, 10); // true
 *
 * // Normal variation, no discontinuity
 * isAsymptote(1, 2, 10); // false
 * ```
 */
export function isAsymptote(y1: number | null, y2: number | null, viewportHeight: number): boolean {
	// If either value is null (domain error), it's a discontinuity
	if (y1 === null || y2 === null) {
		return true;
	}

	// Ensure viewport height is reasonable
	const height = Math.max(viewportHeight, MIN_VIEWPORT_DIM);

	// Calculate the change in y
	const deltaY = Math.abs(y2 - y1);

	// Large jump relative to viewport height indicates asymptote
	if (deltaY > ASYMPTOTE_FACTOR * height) {
		return true;
	}

	// Check for sign change with large values (crossing a vertical asymptote)
	// This catches cases like 1/x where values go from +large to -large
	if (y1 * y2 < 0) {
		const absY1 = Math.abs(y1);
		const absY2 = Math.abs(y2);
		// If both values are more than half the viewport height and opposite signs
		if (absY1 > height / 2 && absY2 > height / 2) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Sample a function over a viewport to generate curve points.
 *
 * Evaluates the function at evenly-spaced x values across the viewport
 * and collects the resulting (x, y) points. Detects discontinuities
 * caused by domain errors or asymptotes.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param viewport - The mathematical viewport bounds
 * @param numPoints - Number of sample points (default: 200)
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * // Sample a parabola
 * const f = (x: number) => x * x;
 * const viewport = { xMin: -5, xMax: 5, yMin: 0, yMax: 25 };
 * const curve = sampleFunction(f, viewport);
 * // curve.points contains 200 points along y = x^2
 * // curve.discontinuityIndices is empty (no discontinuities)
 * ```
 *
 * @example
 * ```typescript
 * // Sample 1/x (has asymptote at x=0)
 * const f = (x: number) => x === 0 ? null : 1 / x;
 * const viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
 * const curve = sampleFunction(f, viewport);
 * // curve.discontinuityIndices contains index near x=0
 * ```
 */
export function sampleFunction(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	numPoints: number = DEFAULT_NUM_POINTS
): SampledCurve {
	// Validate inputs
	const n = Math.max(2, Math.floor(numPoints));
	const viewportWidth = viewport.xMax - viewport.xMin;
	const viewportHeight = viewport.yMax - viewport.yMin;

	// Handle degenerate viewport
	if (viewportWidth <= MIN_VIEWPORT_DIM) {
		return { points: [], discontinuityIndices: [] };
	}

	const step = viewportWidth / (n - 1);
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];

	let prevY: number | null = null;

	for (let i = 0; i < n; i++) {
		const x = viewport.xMin + i * step;
		const y = evaluator(x);

		// Check for discontinuity (not for the first point)
		if (i > 0 && isAsymptote(prevY, y, viewportHeight)) {
			discontinuityIndices.push(points.length);
		}

		// Only add point if y is defined
		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}

/**
 * Sample a function with adaptive refinement near discontinuities.
 *
 * This function first samples at regular intervals, then adds extra
 * samples near detected discontinuities for better accuracy in
 * locating asymptotes.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param viewport - The mathematical viewport bounds
 * @param numPoints - Base number of sample points (default: 200)
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * // Sample tan(x) with adaptive refinement
 * const f = (x: number) => Math.tan(x);
 * const viewport = { xMin: -Math.PI, xMax: Math.PI, yMin: -10, yMax: 10 };
 * const curve = sampleFunctionAdaptive(f, viewport);
 * ```
 */
export function sampleFunctionAdaptive(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	numPoints: number = DEFAULT_NUM_POINTS
): SampledCurve {
	// First pass: regular sampling
	const initial = sampleFunction(evaluator, viewport, numPoints);

	// If no discontinuities, return as-is
	if (initial.discontinuityIndices.length === 0) {
		return initial;
	}

	// Second pass: refine near discontinuities
	const viewportWidth = viewport.xMax - viewport.xMin;
	const viewportHeight = viewport.yMax - viewport.yMin;
	const step = viewportWidth / (numPoints - 1);

	// Collect all x values with refinement
	const xValues = new Set<number>();

	// Add original sample points
	for (let i = 0; i < numPoints; i++) {
		xValues.add(viewport.xMin + i * step);
	}

	// Add refinement points near discontinuities
	const refinementStep = step / 10;
	for (const discIdx of initial.discontinuityIndices) {
		// Find the x value at this discontinuity
		if (discIdx > 0 && discIdx <= initial.points.length) {
			const point = initial.points[discIdx - 1];
			if (point) {
				// Add points around the discontinuity
				for (let j = -5; j <= 5; j++) {
					const x = point.x + j * refinementStep;
					if (x >= viewport.xMin && x <= viewport.xMax) {
						xValues.add(x);
					}
				}
			}
		}
	}

	// Sort x values and sample
	const sortedX = [...xValues].sort((a, b) => a - b);
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];

	let prevY: number | null = null;

	for (const x of sortedX) {
		const y = evaluator(x);

		if (points.length > 0 && isAsymptote(prevY, y, viewportHeight)) {
			discontinuityIndices.push(points.length);
		}

		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}

// =============================================================================
// Derivative-Based Adaptive Sampling
// =============================================================================

/** Number of probe points for derivative estimation in pass 1. */
const DERIVATIVE_PROBE_COUNT = 50;

/**
 * Sample a function with adaptive density based on the derivative.
 *
 * Regions where |f'(x)| is large get more sample points (the curve changes
 * fast there), while flat regions get fewer. This produces smoother curves
 * with fewer total points than uniform sampling.
 *
 * Algorithm:
 * - Pass 1: Evaluate |f'(x)| at N probe points to estimate density
 * - Pass 2: Distribute sample points non-uniformly based on density
 * - Pass 3: Refine around detected discontinuities
 *
 * @param evaluator - Function f(x) → y | null
 * @param derivativeEvaluator - Function f'(x) → y | null
 * @param viewport - The mathematical viewport bounds
 * @param numPoints - Target number of sample points (default: 200)
 * @returns SampledCurve with adaptively distributed points
 */
export function sampleWithDerivative(
	evaluator: (x: number) => number | null,
	derivativeEvaluator: (x: number) => number | null,
	viewport: Viewport,
	numPoints: number = DEFAULT_NUM_POINTS
): SampledCurve {
	const n = Math.max(2, Math.floor(numPoints));
	const viewportWidth = viewport.xMax - viewport.xMin;
	const viewportHeight = viewport.yMax - viewport.yMin;

	if (viewportWidth <= MIN_VIEWPORT_DIM) {
		return { points: [], discontinuityIndices: [] };
	}

	// Pass 1: probe f'(x) at regular intervals to estimate density
	const probeStep = viewportWidth / (DERIVATIVE_PROBE_COUNT - 1);
	const densities: number[] = [];
	let maxAbsDerivative = 0;

	for (let i = 0; i < DERIVATIVE_PROBE_COUNT; i++) {
		const x = viewport.xMin + i * probeStep;
		const d = derivativeEvaluator(x);
		const absD = d !== null && Number.isFinite(d) ? Math.abs(d) : 0;
		densities.push(absD);
		if (absD > maxAbsDerivative) maxAbsDerivative = absD;
	}

	// If derivative is constant or zero everywhere, fall back to uniform
	if (maxAbsDerivative < 1e-10) {
		return sampleFunctionAdaptive(evaluator, viewport, n);
	}

	// Pass 2: compute cumulative density and distribute points
	// density(x) = 1 + densityFactor * |f'(x)| / maxDerivative
	// This ensures a minimum density of 1 everywhere (no gaps)
	const DENSITY_FACTOR = 3; // steep zones get up to 4x more points
	const cumulativeDensity: number[] = [0];

	for (let i = 1; i < DERIVATIVE_PROBE_COUNT; i++) {
		const avgDensity =
			1 + (DENSITY_FACTOR * (densities[i - 1] + densities[i])) / (2 * maxAbsDerivative);
		cumulativeDensity.push(cumulativeDensity[i - 1] + avgDensity * probeStep);
	}

	const totalDensity = cumulativeDensity[cumulativeDensity.length - 1];

	// Generate x values distributed according to cumulative density
	const xValues: number[] = [];
	for (let i = 0; i < n; i++) {
		const targetDensity = (i / (n - 1)) * totalDensity;

		// Binary search for the x position corresponding to this cumulative density
		let lo = 0;
		let hi = DERIVATIVE_PROBE_COUNT - 2;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (cumulativeDensity[mid + 1] < targetDensity) {
				lo = mid + 1;
			} else {
				hi = mid;
			}
		}

		// Linear interpolation within the probe interval
		const dRange = cumulativeDensity[lo + 1] - cumulativeDensity[lo];
		const t = dRange > 0 ? (targetDensity - cumulativeDensity[lo]) / dRange : 0;
		const x = viewport.xMin + (lo + t) * probeStep;
		xValues.push(x);
	}

	// Ensure endpoints are included
	if (xValues.length > 0) {
		xValues[0] = viewport.xMin;
		xValues[xValues.length - 1] = viewport.xMax;
	}

	// Pass 3: sample at computed x values with discontinuity detection
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];
	let prevY: number | null = null;

	for (const x of xValues) {
		const y = evaluator(x);

		if (points.length > 0 && isAsymptote(prevY, y, viewportHeight)) {
			discontinuityIndices.push(points.length);
		}

		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	// Pass 4: refine near discontinuities (same as sampleFunctionAdaptive)
	if (discontinuityIndices.length === 0) {
		return { points, discontinuityIndices };
	}

	const refinementStep = viewportWidth / n / 10;
	const allX = new Set(xValues);

	for (const discIdx of discontinuityIndices) {
		if (discIdx > 0 && discIdx <= points.length) {
			const point = points[discIdx - 1];
			if (point) {
				for (let j = -5; j <= 5; j++) {
					const rx = point.x + j * refinementStep;
					if (rx >= viewport.xMin && rx <= viewport.xMax) {
						allX.add(rx);
					}
				}
			}
		}
	}

	// Re-sample with refined points
	const sortedX = [...allX].sort((a, b) => a - b);
	const refinedPoints: Point[] = [];
	const refinedDiscontinuities: number[] = [];
	prevY = null;

	for (const x of sortedX) {
		const y = evaluator(x);

		if (refinedPoints.length > 0 && isAsymptote(prevY, y, viewportHeight)) {
			refinedDiscontinuities.push(refinedPoints.length);
		}

		if (y !== null) {
			refinedPoints.push({ x, y });
		}

		prevY = y;
	}

	return { points: refinedPoints, discontinuityIndices: refinedDiscontinuities };
}

// =============================================================================
// Parametric 2D Sampling
// =============================================================================

/**
 * Result of sampling a 2D parametric curve t → (x(t), y(t)).
 *
 * - `points` are valid (finite) sampled points in parameter order.
 * - `discontinuityIndices` lists positions in `points` where a break occurred
 *   (NaN/Inf, undefined, or large jump) — the renderer should split path here.
 * - `closed` is true when P(tMin) ≈ P(tMax) within a viewport-relative epsilon.
 */
export interface ParametricSampleResult {
	readonly points: readonly Point[];
	readonly discontinuityIndices: readonly number[];
	readonly closed: boolean;
}

/** Number of probe points used to estimate ‖speed(t)‖ when derivatives are available. */
const PARAMETRIC_PROBE_COUNT = 100;

/** Density factor: high-speed regions get up to (1 + DENSITY_FACTOR) × more points. */
const PARAMETRIC_DENSITY_FACTOR = 3;

/**
 * Default math-unit span used to convert |speed| × dt into a relative jump scale
 * when the caller does not supply a viewport.
 */
const DEFAULT_PARAMETRIC_SPAN = 10;

/** Closed curve detection: dist(P(tMin), P(tMax)) < ε × viewportSpan. */
const CLOSED_CURVE_RELATIVE_EPSILON = 0.01;

/** Threshold below which speed is considered effectively zero (degenerate curve). */
const SPEED_ZERO_THRESHOLD = 1e-10;

/** Coerce an evaluator's return value into a finite number or null. */
function toFiniteOrNull(v: number | null): number | null {
	if (v === null) return null;
	return Number.isFinite(v) ? v : null;
}

/**
 * Detect a discontinuity between two consecutive sampled points of a parametric curve.
 *
 * A discontinuity is detected when:
 * - either point is null (NaN/Inf/undefined value),
 * - or the Euclidean distance between consecutive points exceeds
 *   `ASYMPTOTE_FACTOR × viewportSpan` (huge jump relative to view).
 */
function isParametricDiscontinuity(
	p1: Point | null,
	p2: Point | null,
	viewportSpan: number
): boolean {
	if (p1 === null || p2 === null) return true;
	const span = Math.max(viewportSpan, MIN_VIEWPORT_DIM);
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const dist = Math.hypot(dx, dy);
	return dist > ASYMPTOTE_FACTOR * span;
}

/**
 * Sample a 2D parametric curve t → (x(t), y(t)) over [tMin, tMax].
 *
 * Algorithm:
 * - If `tMax ≤ tMin`: return an empty result.
 * - If both x'(t) and y'(t) are provided: probe ‖speed(t)‖ at K points and
 *   distribute samples non-uniformly so that fast-moving regions get more points.
 * - Otherwise: uniform sampling over [tMin, tMax].
 * - Evaluate (x(t), y(t)) at each sample; track NaN / null / huge-jump as
 *   discontinuities.
 * - Detect "closed curve" by comparing P(tMin) to P(tMax) within a relative
 *   epsilon driven by the viewport span (or `DEFAULT_PARAMETRIC_SPAN`).
 *
 * @param xFn       t → x(t) | null
 * @param yFn       t → y(t) | null
 * @param xPrime    t → x'(t) | null  (set both xPrime and yPrime to null to force uniform sampling)
 * @param yPrime    t → y'(t) | null
 * @param tMin      lower bound
 * @param tMax      upper bound
 * @param numPoints target number of samples (default 300)
 * @param viewport  optional viewport — used to scale the closed-curve epsilon and the jump threshold
 */
export function sampleParametric2D(
	xFn: (t: number) => number | null,
	yFn: (t: number) => number | null,
	xPrime: ((t: number) => number | null) | null,
	yPrime: ((t: number) => number | null) | null,
	tMin: number,
	tMax: number,
	numPoints: number = 300,
	viewport?: { xMin: number; xMax: number; yMin: number; yMax: number }
): ParametricSampleResult {
	// Empty / inverted range → empty result.
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) {
		return { points: [], discontinuityIndices: [], closed: false };
	}

	const n = Math.max(2, Math.floor(numPoints));
	const tSpan = tMax - tMin;

	// Viewport span used both for closed-curve detection and discontinuity scaling.
	let viewportSpan: number;
	if (viewport) {
		const w = Math.max(0, viewport.xMax - viewport.xMin);
		const h = Math.max(0, viewport.yMax - viewport.yMin);
		viewportSpan = Math.max(w, h);
		if (viewportSpan <= MIN_VIEWPORT_DIM) viewportSpan = DEFAULT_PARAMETRIC_SPAN;
	} else {
		viewportSpan = DEFAULT_PARAMETRIC_SPAN;
	}

	// ─── Step 1: build the array of t values ────────────────────────────
	const tValues: number[] = [];

	if (xPrime && yPrime) {
		// Adaptive: probe |speed(t)| at K points.
		const probeStep = tSpan / (PARAMETRIC_PROBE_COUNT - 1);
		const speeds: number[] = [];
		let maxSpeed = 0;
		for (let i = 0; i < PARAMETRIC_PROBE_COUNT; i++) {
			const t = tMin + i * probeStep;
			const xp = xPrime(t);
			const yp = yPrime(t);
			const sx = xp !== null && Number.isFinite(xp) ? xp : 0;
			const sy = yp !== null && Number.isFinite(yp) ? yp : 0;
			const s = Math.hypot(sx, sy);
			speeds.push(s);
			if (s > maxSpeed) maxSpeed = s;
		}

		if (maxSpeed < SPEED_ZERO_THRESHOLD) {
			// Speed essentially zero everywhere → uniform.
			for (let i = 0; i < n; i++) {
				tValues.push(tMin + (i / (n - 1)) * tSpan);
			}
		} else {
			// Cumulative density. At each probe interval [tᵢ, tᵢ₊₁]:
			//   density = 1 + DENSITY_FACTOR * avg(speedᵢ, speedᵢ₊₁) / maxSpeed
			const cumulativeDensity: number[] = [0];
			for (let i = 1; i < PARAMETRIC_PROBE_COUNT; i++) {
				const avg = (speeds[i - 1] + speeds[i]) / 2;
				const density = 1 + (PARAMETRIC_DENSITY_FACTOR * avg) / maxSpeed;
				cumulativeDensity.push(cumulativeDensity[i - 1] + density * probeStep);
			}
			const totalDensity = cumulativeDensity[cumulativeDensity.length - 1];

			for (let i = 0; i < n; i++) {
				const target = (i / (n - 1)) * totalDensity;
				// Binary search for the probe interval containing `target`.
				let lo = 0;
				let hi = PARAMETRIC_PROBE_COUNT - 2;
				while (lo < hi) {
					const mid = (lo + hi) >> 1;
					if (cumulativeDensity[mid + 1] < target) {
						lo = mid + 1;
					} else {
						hi = mid;
					}
				}
				const dRange = cumulativeDensity[lo + 1] - cumulativeDensity[lo];
				const u = dRange > 0 ? (target - cumulativeDensity[lo]) / dRange : 0;
				tValues.push(tMin + (lo + u) * probeStep);
			}

			// Anchor endpoints exactly on tMin/tMax.
			tValues[0] = tMin;
			tValues[tValues.length - 1] = tMax;
		}
	} else {
		// Uniform sampling.
		for (let i = 0; i < n; i++) {
			tValues.push(tMin + (i / (n - 1)) * tSpan);
		}
	}

	// ─── Step 2: evaluate (x(t), y(t)) at each t ────────────────────────
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];
	let prevPoint: Point | null = null;
	let firstValidPoint: Point | null = null;
	let lastValidPoint: Point | null = null;

	for (let i = 0; i < tValues.length; i++) {
		const t = tValues[i];
		const xRaw = xFn(t);
		const yRaw = yFn(t);
		const x = toFiniteOrNull(xRaw);
		const y = toFiniteOrNull(yRaw);
		const current: Point | null = x !== null && y !== null ? { x, y } : null;

		// Discontinuity check (skip for the very first sample).
		if (i > 0 && isParametricDiscontinuity(prevPoint, current, viewportSpan)) {
			discontinuityIndices.push(points.length);
		}

		if (current !== null) {
			points.push(current);
			if (firstValidPoint === null) firstValidPoint = current;
			lastValidPoint = current;
		}

		prevPoint = current;
	}

	// ─── Step 3: closed-curve detection ─────────────────────────────────
	let closed = false;
	if (
		firstValidPoint !== null &&
		lastValidPoint !== null &&
		discontinuityIndices.length === 0 &&
		points.length >= 3
	) {
		const epsilon = Math.max(viewportSpan * CLOSED_CURVE_RELATIVE_EPSILON, MIN_VIEWPORT_DIM);
		const d = Math.hypot(
			lastValidPoint.x - firstValidPoint.x,
			lastValidPoint.y - firstValidPoint.y
		);
		if (d < epsilon) {
			closed = true;
		}
	}

	return { points, discontinuityIndices, closed };
}

/**
 * Generate sample points at specific x coordinates.
 *
 * Useful when you need control over exactly where samples are taken,
 * such as for critical points or user-specified values.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param xValues - Array of x values to sample at
 * @param viewportHeight - Height for asymptote detection
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * const f = (x: number) => Math.sin(x);
 * const xValues = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI];
 * const curve = sampleAtPoints(f, xValues, 2);
 * ```
 */
export function sampleAtPoints(
	evaluator: (x: number) => number | null,
	xValues: readonly number[],
	viewportHeight: number
): SampledCurve {
	if (xValues.length === 0) {
		return { points: [], discontinuityIndices: [] };
	}

	const points: Point[] = [];
	const discontinuityIndices: number[] = [];
	const height = Math.max(viewportHeight, MIN_VIEWPORT_DIM);

	let prevY: number | null = null;

	for (const x of xValues) {
		const y = evaluator(x);

		if (points.length > 0 && isAsymptote(prevY, y, height)) {
			discontinuityIndices.push(points.length);
		}

		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}
