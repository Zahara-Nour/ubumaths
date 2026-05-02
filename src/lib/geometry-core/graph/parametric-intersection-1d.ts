/**
 * parametric-intersection-1d.ts — Newton 1D multi-start solvers for parametric
 * curve × {droite, cercle, fonction} intersections (V2 of B3).
 *
 * Each helper reduces a 2D geometric intersection to a single scalar equation
 * f(t) = 0 on the curve's parameter t and runs Newton's method from 16 uniform
 * starts in [t_min, t_max] (20 iterations max, convergence tol 1e-8, acceptance
 * tol 1e-6). Singular starts (|f'(t0)| < 1e-10) are skipped. The full pipeline:
 *
 *   1. Newton iterations from each start (return current iterate on
 *      convergence, NaN/inf, or singular Jacobian).
 *   2. Clamp t to [t_min, t_max] and re-evaluate.
 *   3. Reject if |f(t_clamped)| > acceptance tolerance.
 *   4. Sort by t ascending.
 *   5. Deduplicate with relative epsilon ((t_max − t_min) × duplicateThresholdRatio).
 *
 * For function intersections, an additional domain filter removes results whose
 * γ_x(t) lies outside the function's [xMin, xMax] range (when restricted).
 *
 * Single mutable env per call (avoid per-iteration heap allocations from
 * `{ ...bindings, [param]: t }`). Mirrors the style of `parametric-newton.ts`
 * and `parametric-intersection.ts`.
 */

import type { GeoParametricCurve } from '../types/elements';
import type { CompiledFn } from '$lib/mathAST/eval/compile';

export interface IntersectionConfig1D {
	/** Number of equally spaced starts in [t_min, t_max]. */
	numStarts: number;
	/** Maximum Newton iterations per start. */
	maxIterations: number;
	/** Convergence tolerance on |f(t)|. */
	convergenceTolerance: number;
	/** After clamping, reject if |f(t)| exceeds this (more permissive). */
	acceptanceTolerance: number;
	/** Skip start / abandon iteration if |f'(t0)| < this. */
	singularityThreshold: number;
	/** Dedup epsilon = (t_max − t_min) × this. */
	duplicateThresholdRatio: number;
}

const DEFAULT_CONFIG: IntersectionConfig1D = {
	numStarts: 16,
	maxIterations: 20,
	convergenceTolerance: 1e-8,
	acceptanceTolerance: 1e-6,
	singularityThreshold: 1e-10,
	duplicateThresholdRatio: 1 / 1000
};

export interface ParametricIntersection1D {
	readonly t: number;
	readonly x: number;
	readonly y: number;
}

/**
 * Run Newton 1D from each start; collect, clamp, accept, sort, dedup.
 *
 * `evalF` returns (f, fPrime, x, y) at the current t, where (x, y) = γ(t).
 * Returns intersections sorted by t ascending, deduplicated.
 */
function newtonMultiStart(
	tMin: number,
	tMax: number,
	evalF: (t: number) => { f: number; fPrime: number; x: number; y: number },
	cfg: IntersectionConfig1D,
	postFilter?: (t: number, x: number, y: number) => boolean
): ParametricIntersection1D[] {
	const N = Math.max(2, cfg.numStarts);
	const step = (tMax - tMin) / (N - 1);
	const candidates: ParametricIntersection1D[] = [];

	for (let i = 0; i < N; i++) {
		const t0 = tMin + i * step;

		// Skip singular start: cannot make progress with f'(t0) ≈ 0.
		const start = evalF(t0);
		if (
			!Number.isFinite(start.f) ||
			!Number.isFinite(start.fPrime) ||
			Math.abs(start.fPrime) < cfg.singularityThreshold
		) {
			continue;
		}

		// Newton iterations.
		let t = t0;
		for (let iter = 0; iter < cfg.maxIterations; iter++) {
			const cur = evalF(t);
			if (
				!Number.isFinite(cur.f) ||
				!Number.isFinite(cur.fPrime) ||
				!Number.isFinite(cur.x) ||
				!Number.isFinite(cur.y)
			) {
				break;
			}
			if (Math.abs(cur.f) < cfg.convergenceTolerance) break;
			if (Math.abs(cur.fPrime) < cfg.singularityThreshold) {
				// Singular Jacobian during iteration — abandon (clamp test follows).
				break;
			}

			const tNext = t - cur.f / cur.fPrime;
			if (!Number.isFinite(tNext)) break;
			t = tNext;
		}

		// Clamp to domain and re-evaluate.
		const tClamped = Math.max(tMin, Math.min(tMax, t));
		if (!Number.isFinite(tClamped)) continue;
		const final = evalF(tClamped);
		if (!Number.isFinite(final.f) || !Number.isFinite(final.x) || !Number.isFinite(final.y)) {
			continue;
		}
		if (Math.abs(final.f) > cfg.acceptanceTolerance) continue;
		if (postFilter && !postFilter(tClamped, final.x, final.y)) continue;

		candidates.push({ t: tClamped, x: final.x, y: final.y });
	}

	// Sort by t ascending.
	candidates.sort((a, b) => a.t - b.t);

	// Dedup along two axes:
	//  - parameter t (relative epsilon (t_max − t_min) × ratio): catches the
	//    typical "same point on the curve" case.
	//  - spatial (x, y) with a fixed tolerance comparable to acceptanceTolerance:
	//    catches periodic or self-intersecting curves where t differs across
	//    candidates but γ(t) lands on the same physical point (e.g. the polar
	//    curve r=1 on [0, 2π] has γ(0) = γ(2π) = (1, 0)).
	const epsT = (tMax - tMin) * cfg.duplicateThresholdRatio;
	// Spatial dedup tolerance: tangent intersections (where Newton converges
	// from two distinct starts to nearly-but-not-exactly the same physical
	// point) need a more permissive bound than the parameter-axis dedup. We
	// derive it from the acceptance tolerance × 1000 — large enough to absorb
	// numerical wobble between starts that converge to the same tangent point
	// (typically 1e-3 at the default acceptanceTolerance=1e-6), while scaling
	// with the figure's coordinate units (vs a hard-coded 1e-3 which would
	// silently merge intersections on micro-scale figures or fail to dedup on
	// large-scale figures).
	const epsXY = cfg.acceptanceTolerance * 1000;
	const unique: ParametricIntersection1D[] = [];
	for (const c of candidates) {
		const dup = unique.some(
			(u) =>
				Math.abs(u.t - c.t) < epsT || (Math.abs(u.x - c.x) < epsXY && Math.abs(u.y - c.y) < epsXY)
		);
		if (!dup) unique.push(c);
	}
	return unique;
}

/**
 * Build a single mutable env keyed by the curve's parameter and reused across
 * Newton evaluations to avoid per-iteration heap allocations.
 *
 * NOT REENTRANT — the returned closure mutates a shared `vars` object. Do not
 * call it from two concurrent execution paths (e.g. parallel start evaluation).
 * Sequential calls (current usage) are safe.
 */
function makeCurveEvaluator(curve: GeoParametricCurve, bindings: Record<string, number>) {
	const param = curve.parameter;
	const vars: Record<string, number> = { ...bindings };
	return (t: number) => {
		vars[param] = t;
		return {
			x: curve.compiledX(vars),
			y: curve.compiledY(vars),
			dx: curve.compiledXPrime!(vars),
			dy: curve.compiledYPrime!(vars)
		};
	};
}

/**
 * Find intersections of γ(t) with the line through (px, py) directed by (vx, vy).
 *
 * f(t)  = (γ_x(t) − px) · vy − (γ_y(t) − py) · vx
 * f'(t) = γ'_x(t) · vy − γ'_y(t) · vx
 */
export function findParametricLineIntersections(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	px: number,
	py: number,
	vx: number,
	vy: number,
	config?: Partial<IntersectionConfig1D>
): ParametricIntersection1D[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	if (!curve.compiledXPrime || !curve.compiledYPrime) return [];
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return [];
	if (
		!Number.isFinite(px) ||
		!Number.isFinite(py) ||
		!Number.isFinite(vx) ||
		!Number.isFinite(vy)
	) {
		return [];
	}
	// Reject degenerate line direction. Compare ‖v‖ (linear) rather than ‖v‖²
	// (squared) to match the singularityThreshold scale: the threshold is
	// expressed in coordinate units, not squared coordinate units. Without the
	// sqrt, points 1e-5 apart pass through, but `speed2 = 1e-10` triggers the
	// guard incorrectly.
	const speed2 = vx * vx + vy * vy;
	const linearEps = Math.sqrt(cfg.singularityThreshold);
	if (Math.sqrt(speed2) < linearEps) return []; // degenerate line direction

	const evalGamma = makeCurveEvaluator(curve, bindings);

	const evalF = (t: number) => {
		const g = evalGamma(t);
		const f = (g.x - px) * vy - (g.y - py) * vx;
		const fPrime = g.dx * vy - g.dy * vx;
		return { f, fPrime, x: g.x, y: g.y };
	};

	return newtonMultiStart(tMin, tMax, evalF, cfg);
}

/**
 * Find intersections of γ(t) with the circle of centre (cx, cy) and radius r.
 *
 * f(t)  = (γ_x − cx)² + (γ_y − cy)² − r²
 * f'(t) = 2 · (γ_x − cx) · γ'_x + 2 · (γ_y − cy) · γ'_y
 */
export function findParametricCircleIntersections(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	cx: number,
	cy: number,
	r: number,
	config?: Partial<IntersectionConfig1D>
): ParametricIntersection1D[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	if (!curve.compiledXPrime || !curve.compiledYPrime) return [];
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return [];
	if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) return [];

	const evalGamma = makeCurveEvaluator(curve, bindings);
	const r2 = r * r;

	const evalF = (t: number) => {
		const g = evalGamma(t);
		const dx = g.x - cx;
		const dy = g.y - cy;
		const f = dx * dx + dy * dy - r2;
		const fPrime = 2 * (dx * g.dx + dy * g.dy);
		return { f, fPrime, x: g.x, y: g.y };
	};

	return newtonMultiStart(tMin, tMax, evalF, cfg);
}

/**
 * Find intersections of γ(t) with the segment from (p1x, p1y) to (p2x, p2y) (V3).
 *
 * Reuses {@link findParametricLineIntersections} on the support line of the segment,
 * then keeps only the hits whose foot parameter `s = dot(p − p1, p2 − p1) / ‖p2 − p1‖²`
 * lies in `[0, 1]` (with a relative tolerance `ε = acceptanceTolerance / ‖p2 − p1‖`
 * to absorb numerical slop near the endpoints).
 *
 * Degenerate input (p1 ≈ p2) returns `[]`.
 */
export function findParametricSegmentIntersections(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	p1x: number,
	p1y: number,
	p2x: number,
	p2y: number,
	config?: Partial<IntersectionConfig1D>
): ParametricIntersection1D[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	if (
		!Number.isFinite(p1x) ||
		!Number.isFinite(p1y) ||
		!Number.isFinite(p2x) ||
		!Number.isFinite(p2y)
	) {
		return [];
	}
	const vx = p2x - p1x;
	const vy = p2y - p1y;
	const lengthSq = vx * vx + vy * vy;
	const length = Math.sqrt(lengthSq);
	const linearEps = Math.sqrt(cfg.singularityThreshold);
	if (length < linearEps) return []; // degenerate segment (p1 = p2)

	const lineHits = findParametricLineIntersections(
		curve,
		bindings,
		tMin,
		tMax,
		p1x,
		p1y,
		vx,
		vy,
		cfg
	);

	// Tolerance on s relative to the segment length so that an intersection within
	// `acceptanceTolerance` units of the endpoint passes the boundary check.
	const eps = cfg.acceptanceTolerance / length;
	return lineHits.filter((p) => {
		const s = ((p.x - p1x) * vx + (p.y - p1y) * vy) / lengthSq;
		return s >= -eps && s <= 1 + eps;
	});
}

/**
 * Find intersections of γ(t) with the ray (demidroite) starting at (ox, oy) along
 * direction (vx, vy) (V3).
 *
 * Reuses {@link findParametricLineIntersections} on the support line of the ray,
 * then keeps only the hits whose foot parameter `s = dot(p − origin, direction) / ‖direction‖²`
 * is `≥ 0` (with a relative tolerance `ε = acceptanceTolerance / ‖direction‖`
 * to absorb numerical slop near the origin).
 *
 * Degenerate input (‖direction‖ ≈ 0) returns `[]`.
 */
export function findParametricRayIntersections(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	ox: number,
	oy: number,
	vx: number,
	vy: number,
	config?: Partial<IntersectionConfig1D>
): ParametricIntersection1D[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	if (
		!Number.isFinite(ox) ||
		!Number.isFinite(oy) ||
		!Number.isFinite(vx) ||
		!Number.isFinite(vy)
	) {
		return [];
	}
	const lengthSq = vx * vx + vy * vy;
	const length = Math.sqrt(lengthSq);
	const linearEps = Math.sqrt(cfg.singularityThreshold);
	if (length < linearEps) return []; // degenerate ray (zero direction)

	const lineHits = findParametricLineIntersections(
		curve,
		bindings,
		tMin,
		tMax,
		ox,
		oy,
		vx,
		vy,
		cfg
	);

	const eps = cfg.acceptanceTolerance / length;
	return lineHits.filter((p) => {
		const s = ((p.x - ox) * vx + (p.y - oy) * vy) / lengthSq;
		return s >= -eps;
	});
}

/**
 * Find intersections of γ(t) with the function curve y = f(x).
 *
 * g(t)  = γ_y(t) − f(γ_x(t))
 * g'(t) = γ'_y(t) − f'(γ_x(t)) · γ'_x(t)
 *
 * Domain filter: γ_x(t) must lie in [xMin, xMax] (use ±Infinity for unrestricted).
 * A small tolerance on the domain bounds is applied so results barely outside
 * are still rejected (matches the spec test C3).
 */
export function findParametricFunctionIntersections(
	curve: GeoParametricCurve,
	bindings: Record<string, number>,
	tMin: number,
	tMax: number,
	fn: CompiledFn,
	fnPrime: CompiledFn,
	xMin: number,
	xMax: number,
	config?: Partial<IntersectionConfig1D>
): ParametricIntersection1D[] {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	if (!curve.compiledXPrime || !curve.compiledYPrime) return [];
	if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return [];

	const evalGamma = makeCurveEvaluator(curve, bindings);

	const evalF = (t: number) => {
		const gamma = evalGamma(t);
		const fx = fn({ x: gamma.x });
		const fpx = fnPrime({ x: gamma.x });
		const f = gamma.y - fx;
		const fPrime = gamma.dy - fpx * gamma.dx;
		return { f, fPrime, x: gamma.x, y: gamma.y };
	};

	// Domain filter: keep only intersections whose x lies in [xMin, xMax].
	// Use a small tolerance on the bounds (matches Newton's acceptance scale).
	const domainTol = 1e-9;
	const hasDomain = Number.isFinite(xMin) || Number.isFinite(xMax);
	const postFilter = hasDomain
		? (_t: number, x: number) => {
				if (Number.isFinite(xMin) && x < xMin - domainTol) return false;
				if (Number.isFinite(xMax) && x > xMax + domainTol) return false;
				return true;
			}
		: undefined;

	return newtonMultiStart(tMin, tMax, evalF, cfg, postFilter);
}
