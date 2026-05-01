/**
 * Rigorous singularity detection for the `integrale()` and `aire()` builtins.
 *
 * V2 delegates to `analyzeContinuity()` from `mathAST/analysis/continuity` to
 * obtain a typed list of discontinuities (removable / jump / infinite /
 * essential), then filters and enriches it with a `RangeDiscontinuity[]`
 * tagged by position relative to `[a, b]` and a divergence verdict.
 *
 * `warnIfSingularitySuspected()` is a consultative wrapper that emits a single
 * `console.warn` when at least one discontinuity in `[a, b]` forces the
 * integral to diverge (`infinite`/`essential` interior, or boundary with no
 * finite one-sided limit on the interior side). Removable, jump, and
 * boundary-safe cases are silent.
 *
 * See `docs/wip/geometry/singularity-rigorous-study.md`.
 */

import type { MathNode } from '$lib/mathAST/types';
import { toCustom } from '$lib/mathAST/custom-generator';
import { analyzeContinuity, getDiscontinuitySourceDescription } from '$lib/mathAST/analysis';
import type { Discontinuity, LimitSign } from '$lib/mathAST/analysis';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { isInfinity } from '$lib/mathAST/guards';

/**
 * A discontinuity of `f` whose location falls inside the integration range
 * `[a, b]`. Carries the full mathAST `Discontinuity` plus its position relative
 * to the range and a flag telling whether it forces the integral to diverge.
 *
 * - `atBoundary === 'lower' | 'upper'`: the discontinuity sits exactly on `a`
 *   or `b` (within `BOUNDARY_TOL`). Only the limit from inside `[a, b]` matters.
 * - `causesDivergence`: `true` for `infinite`/`essential` whose interior-side
 *   limit is missing or infinite. `false` for `removable`/`jump` (always
 *   Riemann-integrable) and for boundary cases with a finite one-sided limit
 *   on the interior side (e.g. `sqrt(x)` on `[0, 4]`).
 */
export interface RangeDiscontinuity {
	readonly disc: Discontinuity;
	/** Numeric value of `disc.point`, evaluated once at filter time. Always finite —
	 * symbolic points that fail evaluation are dropped before this stage. Lets the
	 * compute closure pick interior split points without re-evaluating the node. */
	readonly pointValue: number;
	readonly atBoundary: 'lower' | 'upper' | 'interior';
	readonly causesDivergence: boolean;
}

const BOUNDARY_TOL = 1e-9;

// =============================================================================
// analyzeRangeContinuity — public API
// =============================================================================

/**
 * Strip an arbitrary number of leading `opposite(opposite(...))` wrappers from
 * the AST. The `courbe()` builtin parses `y = E` as `--E` (mathematically
 * equivalent but two opposite nodes thick), and `analyzeContinuity()` reasons
 * structurally on the AST: the wrapping confuses limit evaluation and turns
 * removable cases like `sin(x)/x` into spurious `essential` ones. Unwrapping
 * yields the canonical form without changing the math.
 *
 * Note: only handles **paired** opposites (even count). A triple-opposite
 * `---E` would leave one wrapper in place. `courbe()` consistently emits an
 * even count today; if the parser convention changes this helper will need
 * to handle odd cases too.
 */
function unwrapDoubleOpposites(node: MathNode): MathNode {
	let cur = node;
	while (cur.type === 'opposite' && cur.operand.type === 'opposite') {
		cur = cur.operand.operand;
	}
	return cur;
}

/**
 * Run `analyzeContinuity()` and return its `discontinuities` list.
 *
 * Pre-unwraps double-opposite wrappers so callers that pass an integrand
 * straight from a `courbe()` element get the correct classification (the
 * `--E` wrapping otherwise breaks the limits engine — see
 * `unwrapDoubleOpposites`). Use this from `case 'integrale'` / `case 'aire'`
 * to populate the `discontinuities` cache passed to `createIntegralArea`.
 *
 * Returns `null` when the analysis throws. **Downstream consequence**:
 * `createIntegralArea`'s compute closure treats `null` and `undefined` the
 * same way — it skips the NaN-on-divergence check entirely. This is the
 * fail-open posture appropriate for a consultative API: a broken analysis
 * must never break creation, even if it means silently missing a singularity
 * that should have been reported.
 */
export function getAllDiscontinuities(
	expr: MathNode,
	variable: string
): readonly Discontinuity[] | null {
	try {
		const canonical = unwrapDoubleOpposites(expr);
		return analyzeContinuity(canonical, variable, { verbosity: 'result' }).discontinuities;
	} catch {
		return null;
	}
}

/**
 * Try to evaluate a `MathNode` to a finite number. Returns `null` if evaluation
 * fails or yields a non-finite value. Used to position a discontinuity point on
 * the real line for boundary/interior classification.
 *
 * Symbolic points that cannot be evaluated are skipped — in practice,
 * `analyzeContinuity` only emits numeric `point` nodes for the kinds of
 * expressions handled by `integrale`/`aire`, so this is a graceful-degradation
 * path rather than a hot one.
 */
function pointToNumber(point: MathNode): number | null {
	try {
		const v = evaluateNodeToApproximatedNumber(point);
		return Number.isFinite(v) ? v : null;
	} catch {
		return null;
	}
}

/**
 * Decide whether a discontinuity inside `[a, b]` makes the integral diverge.
 *
 * - `removable` / `jump`: never diverge on a finite range (intégrable au sens
 *   de Riemann ; les limites unilatérales existent).
 * - `infinite` / `essential` interior: always diverge.
 * - `infinite` / `essential` at boundary: diverge iff the limit from inside
 *   `[a, b]` is missing or infinite. A finite one-sided limit on the interior
 *   side (e.g. `sqrt(x)` at `0` on `[0, 4]` with `rightLimit = 0`) means the
 *   integral converges.
 */
function classifyCausesDivergence(
	disc: Discontinuity,
	atBoundary: 'lower' | 'upper' | 'interior'
): boolean {
	if (disc.type === 'removable' || disc.type === 'jump') return false;
	if (atBoundary === 'interior') return true;
	const interiorLimit = atBoundary === 'lower' ? disc.rightLimit : disc.leftLimit;
	// For 'essential' type, continuity.ts always sets leftLimit/rightLimit to
	// null (no limit exists), so this guard also handles the
	// essential-at-boundary path — diverges by construction.
	if (interiorLimit === null) return true;
	if (isInfinity(interiorLimit)) return true;
	return false;
}

/**
 * Classify a precomputed list of discontinuities (typically `result.discontinuities`
 * from `analyzeContinuity`) against the range `[a, b]`.
 *
 * Filters to points inside `[a, b]` and tags each with its position
 * (`atBoundary`) and divergence verdict (`causesDivergence`). Cheap (no
 * re-analysis): suitable for the compute closure of `createIntegralArea`,
 * which calls it on every slider drag.
 *
 * @returns The matching discontinuities, or `null` when bounds are non-finite
 *   or the interval is degenerate (`a === b`). Inverted bounds (`a > b`) are
 *   normalized to `[min, max]`.
 */
export function classifyDiscontinuitiesForRange(
	allDiscs: readonly Discontinuity[],
	a: number,
	b: number
): readonly RangeDiscontinuity[] | null {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
	if (a === b) return null;
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	const inRange: RangeDiscontinuity[] = [];
	for (const disc of allDiscs) {
		const pVal = pointToNumber(disc.point);
		if (pVal === null) continue;
		if (pVal < lo - BOUNDARY_TOL) continue;
		if (pVal > hi + BOUNDARY_TOL) continue;

		let atBoundary: 'lower' | 'upper' | 'interior';
		if (Math.abs(pVal - lo) < BOUNDARY_TOL) atBoundary = 'lower';
		else if (Math.abs(pVal - hi) < BOUNDARY_TOL) atBoundary = 'upper';
		else atBoundary = 'interior';

		inRange.push({
			disc,
			pointValue: pVal,
			atBoundary,
			causesDivergence: classifyCausesDivergence(disc, atBoundary)
		});
	}

	return inRange;
}

/**
 * Analyse the continuity of `expr` restricted to `[a, b]`.
 *
 * Convenience wrapper: runs `analyzeContinuity()` then
 * `classifyDiscontinuitiesForRange()`. Use directly when bounds are static; use
 * the two-step path (cache `analyzeContinuity` result, call
 * `classifyDiscontinuitiesForRange` on each drag) when bounds are reactive.
 *
 * @returns Same as `classifyDiscontinuitiesForRange`. May throw if the
 *   underlying continuity analysis throws — callers consult this at their own
 *   risk; the consultative `warnIfSingularitySuspected` wraps it defensively.
 */
export function analyzeRangeContinuity(
	expr: MathNode,
	variable: string,
	a: number,
	b: number
): readonly RangeDiscontinuity[] | null {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
	if (a === b) return null;
	const canonical = unwrapDoubleOpposites(expr);
	const result = analyzeContinuity(canonical, variable, { verbosity: 'result' });
	return classifyDiscontinuitiesForRange(result.discontinuities, a, b);
}

// =============================================================================
// Warning formatting — used by warnIfSingularitySuspected
// =============================================================================

/** Concise, human-friendly point label. Prefers integers, then a 3-digit decimal,
 * then falls back to the symbolic representation truncated. */
function formatPoint(point: MathNode): string {
	if (point.type === 'number') {
		const v = parseFloat(point.value);
		if (Number.isInteger(v)) return String(v);
		return v.toFixed(3).replace(/\.?0+$/, '');
	}
	let s: string;
	try {
		s = toCustom(point);
	} catch {
		s = '...';
	}
	return s.length > 30 ? s.slice(0, 27) + '...' : s;
}

function formatSign(sign: LimitSign | undefined): string {
	if (sign === 'positive') return '+∞';
	if (sign === 'negative') return '-∞';
	return '±∞';
}

/** Short, action-oriented label for the discontinuity type used in the warn. */
function shortTypeLabel(disc: Discontinuity): string {
	switch (disc.type) {
		case 'infinite': {
			const ls = disc.leftLimitSign;
			const rs = disc.rightLimitSign;
			if (ls && rs && ls !== 'unknown' && rs !== 'unknown') {
				return `asymptote verticale (${formatSign(ls)} à gauche, ${formatSign(rs)} à droite)`;
			}
			return 'asymptote verticale';
		}
		case 'essential':
			return 'discontinuité essentielle';
		case 'jump':
			return 'saut';
		case 'removable':
			return 'trou';
	}
}

/** Lowercased French source description. `'division'` → `'division par zéro'`. */
function sourceCause(disc: Discontinuity): string {
	const desc = getDiscontinuitySourceDescription(disc.source);
	return desc.charAt(0).toLowerCase() + desc.slice(1);
}

/** Build the multi-line console.warn message for ≥ 1 divergent discontinuity. */
function formatDivergenceWarning(
	divergent: readonly RangeDiscontinuity[],
	line: number | undefined,
	builtin: string,
	a: number,
	b: number
): string {
	const prefix = line !== undefined ? `${builtin} ligne ${line}: ` : `${builtin}: `;
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	if (divergent.length === 1) {
		const rd = divergent[0];
		const pStr = formatPoint(rd.disc.point);
		return (
			`${prefix}f a une discontinuité en x = ${pStr} ∈ [${lo}, ${hi}].\n` +
			`  • Type : ${shortTypeLabel(rd.disc)}\n` +
			`  • Cause : ${sourceCause(rd.disc)}\n` +
			`  • L'intégrale diverge — retour NaN.`
		);
	}

	const header = `${prefix}f a ${divergent.length} discontinuités dans [${lo}, ${hi}].`;
	const items = divergent.map(
		(rd) => `  • x ≈ ${formatPoint(rd.disc.point)} : ${shortTypeLabel(rd.disc)}`
	);
	return `${header}\n${items.join('\n')}\n  L'intégrale diverge — retour NaN.`;
}

// =============================================================================
// warnIfSingularitySuspected — public API (consultative)
// =============================================================================

/**
 * Consult `analyzeRangeContinuity` and emit a single `console.warn` when at
 * least one discontinuity in `[a, b]` forces the integral to diverge.
 *
 * Silent in all of these cases (V2 — improvement over V1):
 *  - bounds non-finite or `a === b`,
 *  - no discontinuity in `[a, b]`,
 *  - only `removable` / `jump` discontinuities (Riemann-integrable),
 *  - boundary discontinuities with a finite one-sided limit on the interior
 *    side (e.g. `sqrt(x)` on `[0, 4]`).
 *
 * Defensive: any throw from the continuity analysis is swallowed silently —
 * this function is consultative and must never break the surrounding builtin.
 *
 * `builtin` is the name displayed in the warning prefix (default `'integrale'`;
 * pass `'aire'` from the aire() builtin).
 */
export function warnIfSingularitySuspected(
	expr: MathNode,
	variable: string,
	a: number,
	b: number,
	line?: number,
	builtin: string = 'integrale'
): void {
	let rangeDiscs: readonly RangeDiscontinuity[] | null;
	try {
		rangeDiscs = analyzeRangeContinuity(expr, variable, a, b);
	} catch {
		return;
	}
	if (rangeDiscs === null) return;
	const divergent = rangeDiscs.filter((rd) => rd.causesDivergence);
	if (divergent.length === 0) return;
	console.warn(formatDivergenceWarning(divergent, line, builtin, a, b));
}
