/**
 * Improper Integrals — V5 (bornes infinies pour `integrale` / `aire` / `aire_entre`).
 *
 * Hybrid scheme:
 *   - Phase A (diagnose): adaptive Simpson on growing windows [a, a+T_k] with
 *     T_k = T₀·2^k for k = 0..K_MAX. Detect divergence via stagnation of deltas
 *     or unbounded growth.
 *   - Phase B (compute, only if convergent): change of variable u = x/(1+|x|)
 *     mapping the infinite interval onto a bounded one, then adaptive Simpson.
 *
 * Spec: docs/wip/geometry/improper-integrals-study.md §2.2.
 *
 * @module mathAST/integration/improper
 */
import type { MathNode } from '../types';
import { compile } from '../eval/compile';
import { adaptiveSimpson } from './numeric';

// =============================================================================
// Types
// =============================================================================

export type ImproperStatus = 'convergent' | 'divergent';
export type DivergenceReason = 'stagnation' | 'unboundedGrowth' | 'other';

export interface ImproperResult {
	readonly value: number;
	readonly status: ImproperStatus;
	/** Set when `status === 'divergent'`. */
	readonly reason?: DivergenceReason;
}

// =============================================================================
// Constants (locked V1 — see study §2.2)
// =============================================================================

/** Initial truncation half-width T₀. */
const T0 = 10;
/** Max number of doublings (T = T₀·2^K_MAX = 640 for K_MAX=6). */
const K_MAX = 6;
/** Effective probe half-width — exported for callers that build the discontinuity-cache
 *  range matching the diagnose probe (figure.ts, area-builtin-helper.ts). */
export const PROBE_T_MAX = T0 * 2 ** K_MAX;
/** Adaptive Simpson tolerance for the probe phase. */
const PROBE_TOL = 1e-8;
/** Adaptive Simpson recursion depth for the probe phase. */
const PROBE_DEPTH = 22;
/** Ratio threshold for stagnation detection. Δ_k / Δ_{k-1} ≥ 0.95 → stalling.
 *  NOTE: this heuristic may misclassify slowly-converging integrands (e.g.
 *  ∫ 1/(x·ln²x) dx) as divergent because their increments stay near-ratio-1
 *  for many doublings. Acceptable for the V5 pedagogical scope (8 canonical
 *  cases + standard classroom functions). Revisit for V6 if exotic convergent
 *  integrals are needed. See `improper-integrals-study.md` §2.3. */
const STAGNATION_RATIO = 0.95;
/** Number of consecutive stagnant deltas to declare divergence. */
const STAGNATION_RUN = 2;
/** Unbounded growth signal: lateMax > 5 × earlyMax with earlyMax > 1e-3.
 *  NOTE: GROWTH_FLOOR suppresses the growth signal for integrands with tiny
 *  early partial sums (e.g. ∫ 1/(x·ln x) dx); covered by stagnation in those
 *  V1-scoped cases. */
const GROWTH_FACTOR = 5;
const GROWTH_FLOOR = 1e-3;
/** Substitution endpoint trim — avoids singular evaluation at u=±1. */
const SUB_EPS = 1e-8;
/** Adaptive Simpson tolerance for the substitution phase (final value). */
const COMPUTE_TOL = 1e-8;
const COMPUTE_DEPTH = 22;

// =============================================================================
// Core API
// =============================================================================

/**
 * Compute the improper integral ∫_a^b f(x) dx where at least one of `a`, `b`
 * is ±Infinity.
 *
 * @param expr   Integrand as a MathNode. Must depend only on `variable`.
 * @param variable  Name of the integration variable.
 * @param a   Lower bound (number or ±Infinity).
 * @param b   Upper bound (number or ±Infinity).
 * @throws {Error} If both bounds are finite.
 * @returns Convergent result with finite value, or divergent with NaN value.
 */
export function improperIntegrate(
	expr: MathNode,
	variable: string,
	a: number,
	b: number
): ImproperResult {
	if (Number.isFinite(a) && Number.isFinite(b)) {
		throw new Error('improperIntegrate: both bounds are finite — use numericIntegrate instead');
	}
	if (a === b) {
		// Degenerate: a = b = ±∞. Define as 0.
		return { value: 0, status: 'convergent' };
	}

	// Compile once for fast evaluation.
	const compiled = compile(expr);
	const f = (xVal: number): number => {
		const v = compiled({ [variable]: xVal });
		return Number.isFinite(v) ? v : 0;
	};

	// Dispatch by interval shape.
	if (a === -Infinity && b === Infinity) {
		// Two-sided: split at 0, run each half independently.
		const left = oneSided(f, 0, 'left');
		if (left.status === 'divergent') return left;
		const right = oneSided(f, 0, 'right');
		if (right.status === 'divergent') return right;
		return { value: left.value + right.value, status: 'convergent' };
	}
	if (a === -Infinity) {
		// (-∞, b].
		return oneSided(f, b, 'left');
	}
	if (b === Infinity) {
		// [a, +∞).
		return oneSided(f, a, 'right');
	}
	// Should not reach (a,b validated above), but keep for safety.
	throw new Error('improperIntegrate: unexpected bound configuration');
}

// =============================================================================
// One-sided improper integral (right or left)
// =============================================================================

type Side = 'right' | 'left';

/**
 * Compute ∫_a^{+∞} f or ∫_{-∞}^b f.
 *
 * `endpoint` is the finite end (a for 'right', b for 'left').
 */
function oneSided(f: (x: number) => number, endpoint: number, side: Side): ImproperResult {
	// Phase A — diagnose.
	const probe = (k: number): number => {
		const T = T0 * 2 ** k;
		if (side === 'right') return adaptiveSimpson(f, endpoint, endpoint + T, PROBE_TOL, PROBE_DEPTH);
		return adaptiveSimpson(f, endpoint - T, endpoint, PROBE_TOL, PROBE_DEPTH);
	};

	const hist: number[] = [];
	for (let k = 0; k <= K_MAX; k++) hist.push(probe(k));

	const diag = diagnose(hist);
	if (diag !== 'convergent') {
		return { value: NaN, status: 'divergent', reason: diag };
	}

	// Phase B — compute via substitution u = (x - endpoint)/(1 + |x - endpoint|).
	// For 'right' side, u in [0, 1) maps to x in [endpoint, +∞).
	// For 'left' side, u in (-1, 0] maps to x in (-∞, endpoint].
	const value = computeViaSubstitution(f, endpoint, side);
	if (!Number.isFinite(value)) {
		return { value: NaN, status: 'divergent', reason: 'other' };
	}
	return { value, status: 'convergent' };
}

// =============================================================================
// Diagnose phase (convergent vs divergent)
// =============================================================================

function diagnose(hist: readonly number[]): 'convergent' | DivergenceReason {
	// Any non-finite probe → divergent immediately.
	for (const v of hist) {
		if (!Number.isFinite(v)) return 'unboundedGrowth';
	}

	// Compute |Δ_k| = |hist[k] - hist[k-1]|.
	const deltas: number[] = [];
	for (let i = 1; i < hist.length; i++) deltas.push(Math.abs(hist[i] - hist[i - 1]));

	// Signal 1 — stagnation: Δ_k/Δ_{k-1} ≥ STAGNATION_RATIO for ≥ STAGNATION_RUN
	// consecutive levels.
	let stallRun = 0;
	for (let i = 1; i < deltas.length; i++) {
		const ratio = deltas[i] / Math.max(deltas[i - 1], 1e-30);
		if (ratio > STAGNATION_RATIO) {
			stallRun++;
			if (stallRun >= STAGNATION_RUN) return 'stagnation';
		} else {
			stallRun = 0;
		}
	}

	// Signal 2 — unbounded growth: lateMax >> earlyMax with non-trivial scale.
	const half = Math.floor(hist.length / 2);
	const earlyMax = Math.max(...hist.slice(0, half).map(Math.abs));
	const lateMax = Math.max(...hist.slice(half).map(Math.abs));
	if (lateMax > earlyMax * GROWTH_FACTOR && earlyMax > GROWTH_FLOOR) return 'unboundedGrowth';

	return 'convergent';
}

// =============================================================================
// Substitution-based compute phase (Phase B)
// =============================================================================

function computeViaSubstitution(f: (x: number) => number, endpoint: number, side: Side): number {
	// u = (x - endpoint)/(1 + |x - endpoint|); for side='right', u in [0,1).
	// Inverse: x = endpoint + u/(1-u) for right, x = endpoint + u/(1+u) for left.
	// For left we use u in (-1, 0], dx/du = 1/(1+u)² ; we substitute v = -u to mirror.
	// Simplest: implement only 'right' analytically and reflect for 'left'.
	if (side === 'right') {
		// x = endpoint + u/(1-u), dx = du/(1-u)².
		const g = (u: number): number => {
			const denom = 1 - u;
			const xVal = endpoint + u / denom;
			const jac = 1 / (denom * denom);
			const v = f(xVal) * jac;
			return Number.isFinite(v) ? v : 0;
		};
		return adaptiveSimpson(g, 0, 1 - SUB_EPS, COMPUTE_TOL, COMPUTE_DEPTH);
	}
	// side === 'left': mirror via x → 2·endpoint − x doesn't preserve f.
	// Use direct substitution: u = (endpoint - x)/(1 + endpoint - x), u in [0, 1).
	// Then x = endpoint - u/(1-u), dx = -du/(1-u)². The minus sign cancels with
	// reversing limits (u=0 ↔ x=endpoint, u=1 ↔ x=-∞), so net sign is +.
	const g = (u: number): number => {
		const denom = 1 - u;
		const xVal = endpoint - u / denom;
		const jac = 1 / (denom * denom);
		const v = f(xVal) * jac;
		return Number.isFinite(v) ? v : 0;
	};
	return adaptiveSimpson(g, 0, 1 - SUB_EPS, COMPUTE_TOL, COMPUTE_DEPTH);
}
