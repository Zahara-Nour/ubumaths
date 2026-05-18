/**
 * parametric-calculus.ts — Differential geometry helpers for parametric curves.
 *
 * Public API:
 *   - computeArcLength(curve, bindings, tMin, tMax, N?) → length over [tMin, tMax]
 *     using composite Simpson with N sub-intervals (default 64, forced even).
 *   - computeCurvature(curve, bindings, t0) → signed curvature κ(t0) or null
 *     when γ'(t0) ≈ 0 (cusp / singularity).
 *   - computeOsculatingCircle(curve, bindings, t0) → { centerX, centerY, radius }
 *     or null when κ ≈ 0 (straight line) or γ' ≈ 0 (cusp).
 *
 * The second derivatives x'' and y'' are pre-compiled in
 * `Figure.createParametricCurve` and read directly from
 * `curve.compiledXSecond` / `curve.compiledYSecond` — see `getSecondDerivatives`.
 *
 * Conventions:
 *   - κ = (x'·y'' − y'·x'') / (x'² + y'²)^(3/2)  (signed)
 *   - n̂  = (-y'/‖γ'‖, x'/‖γ'‖)
 *   - centre = γ(t0) + n̂ / κ ;  rayon = 1 / |κ|
 */

import type { GeoParametricCurve } from '../types/elements';
import type { CompiledFn } from '$lib/mathAST/eval/compile';

const SPEED_EPS_SQ = 1e-20; // ‖γ'‖² below this → degenerate
const KAPPA_EPS = 1e-10; // |κ| below this → straight line (no osculating circle)

/**
 * Compute the arc length of γ over [tMin, tMax] using composite Simpson with
 * `numIntervals` sub-intervals (forced even). Returns NaN on invalid input
 * (missing derivatives, non-finite bounds, tMax ≤ tMin).
 *
 * Theoretical error is O(1/N^4) for smooth integrands; with N=64 the unit
 * circle integrates to 2π well within 1e-6.
 */
export function computeArcLength(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	numIntervals = 64
): number {
	if (!curve.compiledXPrime || !curve.compiledYPrime) return NaN;
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return NaN;

	const N = numIntervals % 2 === 0 ? numIntervals : numIntervals + 1;
	const h = (tMax - tMin) / N;
	const param = curve.parameter;
	const vars: Record<string, number> = { ...bindings };

	const speedAt = (t: number): number => {
		vars[param] = t;
		const dx = curve.compiledXPrime!(vars);
		const dy = curve.compiledYPrime!(vars);
		return Math.sqrt(dx * dx + dy * dy);
	};

	let sum = speedAt(tMin) + speedAt(tMax);
	for (let i = 1; i < N; i++) {
		const t = tMin + i * h;
		sum += (i % 2 === 1 ? 4 : 2) * speedAt(t);
	}
	return (h / 3) * sum;
}

/**
 * Return the curve's pre-compiled second derivatives (x''(t), y''(t)).
 *
 * Since 2026-05-18, second derivatives are eagerly compiled in
 * `Figure.createParametricCurve` and stored as `compiledXSecond` /
 * `compiledYSecond`. This getter is now a trivial read — the previous V1
 * re-differentiated and re-compiled on every call, which was a hot-path
 * cost for `cercle_osculateur` and `courbure` (one recompute per tick).
 *
 * Returns null when either compiled second derivative is absent (the curve
 * had no first derivatives, or eager compilation failed).
 */
function getSecondDerivatives(
	curve: GeoParametricCurve
): { compiledXSecond: CompiledFn; compiledYSecond: CompiledFn } | null {
	if (!curve.compiledXSecond || !curve.compiledYSecond) return null;
	return {
		compiledXSecond: curve.compiledXSecond,
		compiledYSecond: curve.compiledYSecond
	};
}

/**
 * Signed curvature κ(t0) of γ. Returns null when γ'(t0) is degenerate
 * (cusp / singularity), i.e. ‖γ'‖² < SPEED_EPS_SQ, or when second derivatives
 * cannot be obtained.
 */
export function computeCurvature(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	t0: number
): number | null {
	if (!curve.compiledXPrime || !curve.compiledYPrime) return null;
	if (!Number.isFinite(t0)) return null;

	const second = getSecondDerivatives(curve);
	if (!second) return null;

	const param = curve.parameter;
	const vars: Record<string, number> = { ...bindings, [param]: t0 };

	const dx = curve.compiledXPrime(vars);
	const dy = curve.compiledYPrime(vars);
	if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;

	const speedSq = dx * dx + dy * dy;
	if (speedSq < SPEED_EPS_SQ) return null;

	const ddx = second.compiledXSecond(vars);
	const ddy = second.compiledYSecond(vars);
	if (!Number.isFinite(ddx) || !Number.isFinite(ddy)) return null;

	// κ = (x'·y'' − y'·x'') / (x'² + y'²)^(3/2)
	const numerator = dx * ddy - dy * ddx;
	const denom = Math.pow(speedSq, 1.5);
	const kappa = numerator / denom;
	if (!Number.isFinite(kappa)) return null;
	return kappa;
}

/** Result of an osculating-circle computation. */
export interface OsculatingCircleData {
	readonly centerX: number;
	readonly centerY: number;
	readonly radius: number;
}

/**
 * Osculating circle at γ(t0): centre = γ(t0) + n̂ / κ, radius = 1/|κ|.
 * n̂ = (-y'/‖γ'‖, x'/‖γ'‖) is the rotated unit tangent.
 *
 * Returns null when γ'(t0) ≈ 0 (cusp), κ ≈ 0 (straight line) or any value is
 * non-finite. Silent — no logging.
 */
export function computeOsculatingCircle(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	t0: number
): OsculatingCircleData | null {
	if (!curve.compiledXPrime || !curve.compiledYPrime) return null;
	if (!Number.isFinite(t0)) return null;

	const kappa = computeCurvature(curve, bindings, t0);
	if (kappa === null) return null;
	if (Math.abs(kappa) < KAPPA_EPS) return null;

	const param = curve.parameter;
	const vars: Record<string, number> = { ...bindings, [param]: t0 };

	const px = curve.compiledX(vars);
	const py = curve.compiledY(vars);
	const dx = curve.compiledXPrime(vars);
	const dy = curve.compiledYPrime(vars);
	if (
		!Number.isFinite(px) ||
		!Number.isFinite(py) ||
		!Number.isFinite(dx) ||
		!Number.isFinite(dy)
	) {
		return null;
	}

	const speed = Math.sqrt(dx * dx + dy * dy);
	if (!(speed > 0)) return null;

	// Unit normal n̂ = (-y'/‖γ'‖, x'/‖γ'‖) rotates the unit tangent +90°.
	const nx = -dy / speed;
	const ny = dx / speed;

	const centerX = px + nx / kappa;
	const centerY = py + ny / kappa;
	const radius = 1 / Math.abs(kappa);

	if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(radius)) {
		return null;
	}
	return { centerX, centerY, radius };
}
