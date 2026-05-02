/**
 * parametric-newton.ts — Newton multi-start solver for the closest-parameter
 * problem on a parametric curve.
 *
 * Used by drag interactions on `point_sur(c, t)` (V2): given a cursor
 * position (cx, cy), find the parameter t* in [t_min, t_max] minimising
 * ‖γ(t) − cursor‖ where γ(t) = (x(t), y(t)).
 *
 * Method: Newton on f(t) = (γ(t) − cursor)·γ'(t) (perpendicularity condition,
 * f(t*) = 0 at a closest-point). The full derivative is
 *     f'(t) = ‖γ'(t)‖² + (γ(t) − cursor)·γ''(t)
 * but γ'' is not pre-compiled on GeoParametricCurve, so the curvature term is
 * approximated to zero:
 *     f'(t) ≈ ‖γ'(t)‖²
 * This approximation is exact at the closest point (where γ − cursor ⊥ γ'')
 * and degrades gracefully when the cursor is close to the curve. Multi-start
 * recovery handles divergence when the cursor is far away.
 *
 * Multi-start: 8 starts uniformly distributed on [t_min, t_max]. Singular
 * starts (‖γ'(t0)‖ < 1e-10) are skipped. Among the converged candidates, the
 * one minimising ‖γ(t) − cursor‖ is returned.
 *
 * Returns null if every start is singular (no progress possible).
 */

import type { GeoParametricCurve } from '../types/elements';

export interface NewtonConfig {
	/** Number of equally spaced starting parameters in [t_min, t_max]. */
	numStarts: number;
	/** Maximum Newton iterations per start. */
	maxIterations: number;
	/** Convergence tolerance on |f(t)| = |(γ − cursor)·γ'|. */
	tolerance: number;
	/** Singularity threshold: skip start if ‖γ'(t0)‖ < threshold. */
	singularityThreshold: number;
}

const DEFAULT_CONFIG: NewtonConfig = {
	numStarts: 8,
	maxIterations: 20,
	tolerance: 1e-8,
	singularityThreshold: 1e-10
};

/**
 * Find the parameter t in [t_min, t_max] whose curve point γ(t) is closest to
 * (cursorX, cursorY). Returns null if every start is singular.
 */
export function findClosestParameterOnCurve(
	curveEl: GeoParametricCurve,
	cursorX: number,
	cursorY: number,
	scalarBindings: Record<string, number>,
	tMin: number,
	tMax: number,
	config?: Partial<NewtonConfig>
): number | null {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	if (!curveEl.compiledXPrime || !curveEl.compiledYPrime) return null;
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return null;

	const param = curveEl.parameter;

	// Single mutable env reused across all evaluations (avoid per-iter heap
	// allocations from `{ ...scalarBindings, [param]: t }`). Safe because
	// CompiledFn reads vars synchronously and does not retain references.
	const vars: Record<string, number> = { ...scalarBindings };

	const evalGamma = (t: number): { x: number; y: number } => {
		vars[param] = t;
		return { x: curveEl.compiledX(vars), y: curveEl.compiledY(vars) };
	};

	const evalGammaPrime = (t: number): { dx: number; dy: number } => {
		vars[param] = t;
		return {
			dx: curveEl.compiledXPrime!(vars),
			dy: curveEl.compiledYPrime!(vars)
		};
	};

	let bestT: number | null = null;
	let bestDist = Infinity;

	const N = Math.max(2, cfg.numStarts);
	const step = (tMax - tMin) / (N - 1);

	for (let i = 0; i < N; i++) {
		const t0 = tMin + i * step;

		// Skip singular start (‖γ'‖ ≈ 0): Newton would divide by ~0.
		const g0 = evalGammaPrime(t0);
		const speed0 = Math.sqrt(g0.dx * g0.dx + g0.dy * g0.dy);
		if (!Number.isFinite(speed0) || speed0 < cfg.singularityThreshold) continue;

		// Newton iterations on f(t) = (γ(t) − cursor)·γ'(t),
		// f'(t) ≈ ‖γ'(t)‖² (curvature term ignored).
		let t = t0;
		for (let iter = 0; iter < cfg.maxIterations; iter++) {
			const p = evalGamma(t);
			const dp = evalGammaPrime(t);
			if (
				!Number.isFinite(p.x) ||
				!Number.isFinite(p.y) ||
				!Number.isFinite(dp.dx) ||
				!Number.isFinite(dp.dy)
			) {
				break; // diverged into NaN/Infinity territory — abandon this start
			}

			const rx = p.x - cursorX;
			const ry = p.y - cursorY;
			const f = rx * dp.dx + ry * dp.dy;
			if (Math.abs(f) < cfg.tolerance) break;

			const speed2 = dp.dx * dp.dx + dp.dy * dp.dy;
			if (!Number.isFinite(speed2) || speed2 < cfg.singularityThreshold) {
				// Hit a singular point during iteration — abandon this start.
				break;
			}

			t = t - f / speed2;
			if (!Number.isFinite(t)) break;
		}

		// Even if the iteration did not formally converge below tolerance, we
		// still accept the final t as a candidate (clamped) — multi-start
		// minimisation chooses the best one. This is essential for the
		// "cursor unreachable" case where no perpendicular root exists.
		const tClamped = Math.max(tMin, Math.min(tMax, t));
		if (!Number.isFinite(tClamped)) continue;

		const pFinal = evalGamma(tClamped);
		if (!Number.isFinite(pFinal.x) || !Number.isFinite(pFinal.y)) continue;

		const dx = pFinal.x - cursorX;
		const dy = pFinal.y - cursorY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < bestDist) {
			bestDist = dist;
			bestT = tClamped;
		}
	}

	return bestT;
}
