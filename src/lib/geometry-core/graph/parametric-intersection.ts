/**
 * parametric-intersection.ts — Newton 2D multi-start solver for the intersection
 * of two parametric curves γ1(t1) and γ2(t2).
 *
 * Solves F(t1, t2) = γ1(t1) − γ2(t2) = (0, 0) by Newton's method on a 2D system.
 *
 * Multi-start: an N×N grid (default 8×8 = 64 starts) on
 *   [t1_min, t1_max] × [t2_min, t2_max]. Singular Jacobians are skipped.
 *
 * Filtering pipeline:
 *   1. Clamp each converged (t1, t2) to its parameter domain.
 *   2. Reject if ‖γ1(t1) − γ2(t2)‖ exceeds the acceptance tolerance after clamp
 *      (catches cases where Newton dragged the iterate outside the domain).
 *   3. Deduplicate: |t1_a − t1_b| < ε1 AND |t2_a − t2_b| < ε2, where
 *      ε1 = (t1_max − t1_min) × duplicateThresholdRatio, similarly for ε2.
 *   4. Sort lexicographically by (t1, t2) ascending.
 *
 * Single mutable env per curve (avoid per-iteration heap allocations from
 * `{ ...bindings, [param]: t }`).
 */

import type { GeoParametricCurve } from '../types/elements';

export interface IntersectionConfig {
	/** Number of starts per axis (total = N²). */
	numStartsPerAxis: number;
	/** Maximum Newton iterations per start. */
	maxIterations: number;
	/** Convergence tolerance on ‖F(t1, t2)‖ = ‖γ1 − γ2‖. */
	convergenceTolerance: number;
	/** After clamping, reject if ‖γ1 − γ2‖ exceeds this (more permissive). */
	acceptanceTolerance: number;
	/** Skip start / abandon iteration if |det(J)| < this. */
	singularityThreshold: number;
	/** Dedup epsilon = (t_max − t_min) × this on each axis. */
	duplicateThresholdRatio: number;
}

const DEFAULT_CONFIG: IntersectionConfig = {
	numStartsPerAxis: 8,
	maxIterations: 20,
	convergenceTolerance: 1e-8,
	acceptanceTolerance: 1e-6,
	singularityThreshold: 1e-10,
	duplicateThresholdRatio: 1 / 1000
};

export interface ParametricIntersection {
	readonly t1: number;
	readonly t2: number;
	readonly x: number;
	readonly y: number;
}

/**
 * Find intersections of two parametric curves on their respective domains.
 *
 * Returns an array sorted lexicographically by (t1, t2) ascending, with
 * duplicates removed (relative epsilon on each parameter axis).
 * Returns [] if either curve lacks compiled derivatives or domains are invalid.
 */
export function findParametricIntersections(
	curve1: GeoParametricCurve,
	curve2: GeoParametricCurve,
	bindings1: Record<string, number>,
	bindings2: Record<string, number>,
	t1Min: number,
	t1Max: number,
	t2Min: number,
	t2Max: number,
	config?: Partial<IntersectionConfig>
): ParametricIntersection[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	if (!curve1.compiledXPrime || !curve1.compiledYPrime) return [];
	if (!curve2.compiledXPrime || !curve2.compiledYPrime) return [];
	if (!Number.isFinite(t1Min) || !Number.isFinite(t1Max) || t1Max <= t1Min) return [];
	if (!Number.isFinite(t2Min) || !Number.isFinite(t2Max) || t2Max <= t2Min) return [];

	const param1 = curve1.parameter;
	const param2 = curve2.parameter;

	// Single mutable env per curve to avoid heap allocations per Newton step.
	const vars1: Record<string, number> = { ...bindings1 };
	const vars2: Record<string, number> = { ...bindings2 };

	const eval1 = (t: number): { x: number; y: number; dx: number; dy: number } => {
		vars1[param1] = t;
		return {
			x: curve1.compiledX(vars1),
			y: curve1.compiledY(vars1),
			dx: curve1.compiledXPrime!(vars1),
			dy: curve1.compiledYPrime!(vars1)
		};
	};

	const eval2 = (t: number): { x: number; y: number; dx: number; dy: number } => {
		vars2[param2] = t;
		return {
			x: curve2.compiledX(vars2),
			y: curve2.compiledY(vars2),
			dx: curve2.compiledXPrime!(vars2),
			dy: curve2.compiledYPrime!(vars2)
		};
	};

	const N = Math.max(2, cfg.numStartsPerAxis);
	const step1 = (t1Max - t1Min) / (N - 1);
	const step2 = (t2Max - t2Min) / (N - 1);

	const candidates: ParametricIntersection[] = [];

	for (let i = 0; i < N; i++) {
		const t1Start = t1Min + i * step1;
		for (let j = 0; j < N; j++) {
			const t2Start = t2Min + j * step2;

			const result = newtonStep(
				eval1,
				eval2,
				t1Start,
				t2Start,
				cfg.maxIterations,
				cfg.convergenceTolerance,
				cfg.singularityThreshold
			);
			if (!result) continue;

			// Clamp final (t1, t2) to the curves' domains.
			const t1 = Math.max(t1Min, Math.min(t1Max, result.t1));
			const t2 = Math.max(t2Min, Math.min(t2Max, result.t2));
			if (!Number.isFinite(t1) || !Number.isFinite(t2)) continue;

			const p1 = eval1(t1);
			const p2 = eval2(t2);
			if (
				!Number.isFinite(p1.x) ||
				!Number.isFinite(p1.y) ||
				!Number.isFinite(p2.x) ||
				!Number.isFinite(p2.y)
			) {
				continue;
			}

			const dx = p1.x - p2.x;
			const dy = p1.y - p2.y;
			const residual = Math.sqrt(dx * dx + dy * dy);
			if (residual > cfg.acceptanceTolerance) continue;

			// Average the two curve points to get the intersection coordinates
			// (they should be ≈ equal but averaging is symmetric).
			candidates.push({
				t1,
				t2,
				x: 0.5 * (p1.x + p2.x),
				y: 0.5 * (p1.y + p2.y)
			});
		}
	}

	// Dedup with relative epsilon on each parameter axis.
	const eps1 = (t1Max - t1Min) * cfg.duplicateThresholdRatio;
	const eps2 = (t2Max - t2Min) * cfg.duplicateThresholdRatio;

	// Sort lexicographically by (t1, t2) before dedup so the first occurrence is
	// the canonical representative.
	candidates.sort((a, b) => {
		if (a.t1 !== b.t1) return a.t1 - b.t1;
		return a.t2 - b.t2;
	});

	const unique: ParametricIntersection[] = [];
	for (const c of candidates) {
		const dup = unique.some((u) => Math.abs(u.t1 - c.t1) < eps1 && Math.abs(u.t2 - c.t2) < eps2);
		if (!dup) unique.push(c);
	}

	return unique;
}

/**
 * Run Newton 2D from a starting (t1, t2) until convergence or maxIterations.
 *
 * Returns the latest (t1, t2) iterate. The caller is responsible for filtering
 * by acceptance tolerance after clamping — even iterations that hit a singular
 * Jacobian or fail to converge return their current (t1, t2), which the
 * acceptance filter rejects via `‖γ1(t1) − γ2(t2)‖ > acceptanceTolerance`.
 *
 * Returns null only when the iterate becomes non-finite (NaN/Infinity) — these
 * cannot be salvaged by clamping. This mirrors `parametric-newton.ts`.
 */
function newtonStep(
	eval1: (t: number) => { x: number; y: number; dx: number; dy: number },
	eval2: (t: number) => { x: number; y: number; dx: number; dy: number },
	t1Start: number,
	t2Start: number,
	maxIterations: number,
	convergenceTolerance: number,
	singularityThreshold: number
): { t1: number; t2: number } | null {
	let t1 = t1Start;
	let t2 = t2Start;

	for (let iter = 0; iter < maxIterations; iter++) {
		const p1 = eval1(t1);
		const p2 = eval2(t2);
		if (
			!Number.isFinite(p1.x) ||
			!Number.isFinite(p1.y) ||
			!Number.isFinite(p1.dx) ||
			!Number.isFinite(p1.dy) ||
			!Number.isFinite(p2.x) ||
			!Number.isFinite(p2.y) ||
			!Number.isFinite(p2.dx) ||
			!Number.isFinite(p2.dy)
		) {
			return null;
		}

		// F = γ1 − γ2
		const Fx = p1.x - p2.x;
		const Fy = p1.y - p2.y;
		const fNorm = Math.sqrt(Fx * Fx + Fy * Fy);
		if (fNorm < convergenceTolerance) return { t1, t2 };

		// Jacobian J = | γ1'(t1)_x   −γ2'(t2)_x |
		//             | γ1'(t1)_y   −γ2'(t2)_y |
		const a = p1.dx;
		const b = -p2.dx;
		const c = p1.dy;
		const d = -p2.dy;
		const det = a * d - b * c;
		if (!Number.isFinite(det) || Math.abs(det) < singularityThreshold) {
			// Singular Jacobian — abandon this start (cannot make a Newton step).
			// Return current iterate so caller can still test acceptance after clamp.
			return { t1, t2 };
		}

		// (Δt1, Δt2) = −J⁻¹ · F
		// J⁻¹ = (1/det) | d  −b |
		//                | −c  a |
		const invDet = 1 / det;
		const dt1 = -invDet * (d * Fx - b * Fy);
		const dt2 = -invDet * (-c * Fx + a * Fy);

		t1 = t1 + dt1;
		t2 = t2 + dt2;
		if (!Number.isFinite(t1) || !Number.isFinite(t2)) return null;
	}

	return { t1, t2 };
}
