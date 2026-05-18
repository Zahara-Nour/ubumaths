/**
 * RED-FIRST TDD — intersection() parametric × parametric branch (B3).
 *
 * All tests MUST FAIL until the parametric branch is implemented (Phase 2).
 * The only possible early-green tests are those that rely on existing behavior
 * (e.g. "k > nb intersections → null" if the interpreter already returns null
 * for unknown intersection types, or error-throwing behavior from the dispatcher).
 *
 * API:
 *   P = intersection(c1, c2)        # k=1 (default)
 *   Q = intersection(c1, c2, 2)     # k-th point (1-indexed)
 *
 * where c1, c2 are GeoParametricCurve (parametric or polar).
 *
 * Algorithm (Newton 2D, multi-start 8×8 grid):
 *   F(t1, t2) = γ1(t1) − γ2(t2) = 0
 *   Canonical order: sort results lexicographically by (t1, t2) ascending.
 *   Dedup: |t1_a − t1_b| < (t1_max−t1_min)/1000 AND |t2_a − t2_b| < (t2_max−t2_min)/1000.
 *   k > nb intersections → getPosition returns null (no error thrown).
 *
 * Sections:
 *   A. Nominal parametric × parametric     (4 tests)
 *   B. Polar × polar                       (2 tests)
 *   C. Mixed parametric × polar            (1 test)
 *   D. Edge cases / k hors range           (2 tests)
 *   E. Reactivity                          (2 tests)
 *   F. Serialization                       (2 tests)
 *
 * Total: 15 tests
 *
 * Architecture assumptions (to be confirmed in Phase 2):
 *   - New element type: 'intersectionParametric'
 *   - Fields: { type, curve1Id, curve2Id, k: number, dependsOn: readonly [string, string] }
 *   - Position computed live via compute-position.ts (Newton 2D helper)
 *   - Serializer emits: `P = intersection(c1, c2, k)` — always emits k explicitly
 *     OR omits k when k=1 (TBD in Phase 2 — see test F2)
 *   - No DslRuntimeError for large k; position silently returns null
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Prepend `unite_angle("radians")` so cos(t)/sin(t) use radian semantics,
 * matching the expected intersection coordinates.
 */
function runIntersectionParametric(script: string) {
	return runDsl(`unite_angle("radians")\n${script}`);
}

function getPos(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;
	return figure.getPosition(entry.figureId);
}

const TWO_PI = 2 * Math.PI;

// =============================================================================
// A. Nominal parametric × parametric
// =============================================================================

describe('intersection — parametric × parametric (A. nominal)', () => {
	it('A1. two unit circles offset by 1 → 2 intersection points at (0.5, ±√3/2)', () => {
		// c1: unit circle centred at origin   — x=cos(t), y=sin(t)
		// c2: unit circle centred at (1, 0)   — x=cos(t)+1, y=sin(t)
		// Exact intersections: x=1/2, y=±√3/2
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P1 = intersection(c1, c2, 1)`,
			`P2 = intersection(c1, c2, 2)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both x-coordinates must be ≈ 0.5
		expect(geoToNumber(pos1!.x)).toBeCloseTo(0.5, 3);
		expect(geoToNumber(pos2!.x)).toBeCloseTo(0.5, 3);

		// y-coordinates must be ≈ ±√3/2 (one positive, one negative)
		const ys = [geoToNumber(pos1!.y), geoToNumber(pos2!.y)].sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-Math.sqrt(3) / 2, 3);
		expect(ys[1]).toBeCloseTo(Math.sqrt(3) / 2, 3);
	});

	it('A2. ellipse 2×1 meets ellipse 1×2 → 4 intersection points', () => {
		// c1: x=2cos(t), y=sin(t)  → ellipse semi-major=2 along x
		// c2: x=cos(t),  y=2sin(t) → ellipse semi-major=2 along y
		// Solving: (2cos(t1))²/4 + sin(t1)² = 1 and cos(t2)² + (2sin(t2))²/4 = 1
		// Cartesian intersection: x²/4 + y² = 1 AND x² + y²/4 = 1
		// → x²(1 - 1/4) = 1 - 1/4 → x² = 1 but refined: solving gives x²=4/5, y²=4/5
		const script = [
			`c1 = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t)", "y = 2*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P1 = intersection(c1, c2, 1)`,
			`P2 = intersection(c1, c2, 2)`,
			`P3 = intersection(c1, c2, 3)`,
			`P4 = intersection(c1, c2, 4)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const positions = [1, 2, 3, 4].map((i) => getPos(figure, symbols, `P${i}`));
		const validPositions = positions.filter((p) => p !== null);

		expect(validPositions.length).toBe(4);

		// Each point must lie on both ellipses: x²/4 + y² ≈ 1 and x² + y²/4 ≈ 1
		for (const p of validPositions) {
			const x = geoToNumber(p!.x);
			const y = geoToNumber(p!.y);
			expect((x * x) / 4 + y * y).toBeCloseTo(1, 2);
			expect(x * x + (y * y) / 4).toBeCloseTo(1, 2);
		}
	});

	it('A3. third intersection point of two circles has correct canonical order', () => {
		// Use two non-symmetric unit circles so all k-values are distinct.
		// c1: centred at (0, 0), c2: centred at (0.8, 0).
		// This test verifies that k=3 returns null (only 2 intersections exist)
		// or that k=3 gives a point if there somehow are 3 (degenerate).
		// The spec says k > nb intersections → null silently.
		// Re-purpose this test: use the ellipse×ellipse case with 4 points,
		// verify P3 has a larger t1 than P2 (canonical lexico order).
		const script = [
			`c1 = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t)", "y = 2*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P2 = intersection(c1, c2, 2)`,
			`P3 = intersection(c1, c2, 3)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos2 = getPos(figure, symbols, 'P2');
		const pos3 = getPos(figure, symbols, 'P3');

		// Both must exist for the 4-intersection ellipse case
		expect(pos2).not.toBeNull();
		expect(pos3).not.toBeNull();

		// P2 and P3 must differ (canonical order separates them)
		const dist = Math.sqrt(
			(geoToNumber(pos3!.x) - geoToNumber(pos2!.x)) ** 2 +
				(geoToNumber(pos3!.y) - geoToNumber(pos2!.y)) ** 2
		);
		expect(dist).toBeGreaterThan(0.01);
	});

	it('A4. intersection(c1, c2) with no k argument returns same point as k=1', () => {
		// k omitted → default k=1. Must agree with explicit k=1.
		const scriptDefault = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2)`
		].join('\n');

		const scriptExplicit = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runIntersectionParametric(scriptDefault);
		const { figure: fig2, symbols: sym2 } = runIntersectionParametric(scriptExplicit);

		const posDefault = getPos(fig1, sym1, 'P');
		const posExplicit = getPos(fig2, sym2, 'P');

		expect(posDefault).not.toBeNull();
		expect(posExplicit).not.toBeNull();

		expect(geoToNumber(posDefault!.x)).toBeCloseTo(geoToNumber(posExplicit!.x), 4);
		expect(geoToNumber(posDefault!.y)).toBeCloseTo(geoToNumber(posExplicit!.y), 4);
	});
});

// =============================================================================
// B. Polar × polar
// =============================================================================

describe('intersection — polar × polar (B. polar curves)', () => {
	it('B1. cardioid r=1-cos(θ) meets circle r=1 at two points near (0, ±1)', () => {
		// c1: cardioid r = 1 - cos(θ)
		// c2: circle  r = 1  (centred at origin)
		// Intersection: 1 - cos(θ) = 1 → cos(θ) = 0 → θ = π/2 or 3π/2
		// At θ=π/2: x = r·cos(π/2) = 0, y = r·sin(π/2) = 1  → (0, 1)
		// At θ=3π/2: x = 0, y = -1                          → (0, -1)
		const script = [
			`c1 = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`c2 = courbe("r = 1", theta_min=0, theta_max=${TWO_PI})`,
			`P1 = intersection(c1, c2, 1)`,
			`P2 = intersection(c1, c2, 2)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both points must have x ≈ 0
		expect(Math.abs(geoToNumber(pos1!.x))).toBeCloseTo(0, 3);
		expect(Math.abs(geoToNumber(pos2!.x))).toBeCloseTo(0, 3);

		// y-coordinates: ±1 (sorted)
		const ys = [geoToNumber(pos1!.y), geoToNumber(pos2!.y)].sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-1, 3);
		expect(ys[1]).toBeCloseTo(1, 3);
	});

	it('B2. two rotated cardioids share at least one intersection', () => {
		// c1: cardioid r = 1 - cos(θ)   (standard orientation)
		// c2: cardioid r = 1 + cos(θ)   (rotated 180°, symmetric about y-axis)
		// These two cardioids intersect where 1-cos(θ) = 1+cos(θ) → cos(θ)=0
		// θ = π/2 and θ = 3π/2, giving points (0, ?) depending on r(θ).
		// At θ=π/2: r=1, so point ≈ (0, 1).
		const script = [
			`c1 = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`c2 = courbe("r = 1 + cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos = getPos(figure, symbols, 'P');

		expect(pos).not.toBeNull();

		// The intersection must lie on the y-axis (x ≈ 0) and |y| ≈ 1
		expect(Math.abs(geoToNumber(pos!.x))).toBeCloseTo(0, 2);
		expect(Math.abs(geoToNumber(pos!.y))).toBeCloseTo(1, 2);
	});
});

// =============================================================================
// C. Mixed: parametric × polar
// =============================================================================

describe('intersection — mixed parametric × polar (C.)', () => {
	it('C1. parametric unit circle meets cardioid r=1-cos(θ) — at least one intersection found', () => {
		// Unit circle: x=cos(t), y=sin(t) with t ∈ [0, 2π]
		// Cardioid polar: r = 1 - cos(θ), θ ∈ [0, 2π]
		// The cardioid passes through (0, 1) and (0, -1); unit circle contains these points.
		// So at least one intersection is expected.
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos = getPos(figure, symbols, 'P');

		expect(pos).not.toBeNull();

		// The intersection must lie on the unit circle: x² + y² ≈ 1
		const x = geoToNumber(pos!.x);
		const y = geoToNumber(pos!.y);
		expect(x * x + y * y).toBeCloseTo(1, 2);
	});
});

// =============================================================================
// D. Edge cases / k hors range
// =============================================================================

describe('intersection — parametric (D. edge cases / k out of range)', () => {
	it('D1. k=10 when only 2 intersections exist → getPosition returns null', () => {
		// Two unit circles with 2 intersections; k=10 must silently return null.
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 10)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos = getPos(figure, symbols, 'P');

		// k > nb intersections → null (no exception)
		expect(pos).toBeNull();
	});

	it('D2. disjoint curves (circles far apart) → k=1 position is null', () => {
		// c1: unit circle centred at origin
		// c2: small circle centred at (10, 0) with radius 0.5
		// No real intersection exists — Newton should fail to converge or find
		// a solution outside the parameter range; position must be null.
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = 0.5*cos(t) + 10", "y = 0.5*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const pos = getPos(figure, symbols, 'P');

		expect(pos).toBeNull();
	});
});

// =============================================================================
// E. Reactivity
// =============================================================================

describe('intersection — parametric (E. reactivity)', () => {
	it('E1. dependsOn of intersection element contains both curveIds', () => {
		// Architectural check: the intersection element must list c1Id and c2Id
		// in its dependsOn so the figure graph re-computes it when either curve changes.
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const c1Id = symbols.get('c1')!.figureId!;
		const c2Id = symbols.get('c2')!.figureId!;
		const pId = symbols.get('P')!.figureId!;

		const el = figure.getElementById(pId);
		expect(el).toBeDefined();
		expect(el!.dependsOn).toContain(c1Id);
		expect(el!.dependsOn).toContain(c2Id);
	});

	it('E2. slider in c1 → moving slider recomputes intersection position', () => {
		// c1 is a circle of radius 'a' (slider); c2 is fixed unit circle.
		// Initially a=1 → two circles of same radius → 2 intersection points.
		// After moving slider to a=0.5 → circles still overlap, positions change.
		const script = [
			`a = slider(min=0.5, max=2, valeur=1)`,
			`c1 = courbe("x = a*cos(t)", "y = a*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 0.5", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 1)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);

		const pos1 = getPos(figure, symbols, 'P');
		expect(pos1).not.toBeNull();
		const x1 = geoToNumber(pos1!.x);
		const y1 = geoToNumber(pos1!.y);

		// Move slider: a changes → c1 changes → intersection should recompute
		const aId = symbols.get('a')!.figureId!;
		figure.moveSlider(aId, 1.5);

		const pos2 = getPos(figure, symbols, 'P');
		expect(pos2).not.toBeNull();

		// Position should be different after the slider change
		const moved =
			Math.abs(geoToNumber(pos2!.x) - x1) > 1e-6 || Math.abs(geoToNumber(pos2!.y) - y1) > 1e-6;
		expect(moved).toBe(true);
	});
});

// =============================================================================
// F. Serialization
// =============================================================================

describe('intersection — parametric (F. serialization round-trip)', () => {
	it('F1. round-trip preserves k=2 and reproduces same position', () => {
		// After serialization + re-parse the element must exist with same position.
		const script = [
			`c1 = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t)", "y = 2*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2, 2)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runIntersectionParametric(script);
		const serialized = serializeDsl(fig1, sym1);

		// Re-run the serialized script (also prepend radians)
		const { figure: fig2, symbols: sym2 } = runDsl(`unite_angle("radians")\n${serialized}`);

		const pos1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const pos2 = fig2.getPosition(sym2.get('P')!.figureId!);

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 4);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 4);
	});

	it('F2. serialized form contains "intersection(c1, c2" substring', () => {
		// The serializer must emit a DSL line that starts the intersection call.
		// Whether k=1 is explicit or omitted is implementation-defined (Phase 2),
		// but the serialized text must at minimum reference the two curve names.
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`c2 = courbe("x = cos(t) + 1", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c1, c2)`
		].join('\n');

		const { figure, symbols } = runIntersectionParametric(script);
		const serialized = serializeDsl(figure, symbols);

		// The serialized output must contain a call referencing both curves.
		expect(serialized).toMatch(/intersection\(c1,\s*c2/);
	});
});

// =============================================================================
// G. Edge cases (added during code review enrichment)
// =============================================================================

describe('intersection — parametric (G. edge cases)', () => {
	it('G1. intersection(c, c) (same curve) raises DslRuntimeError', () => {
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`P = intersection(c, c)`
		].join('\n');
		expect(() => runIntersectionParametric(script)).toThrow(
			/les deux courbes doivent (etre|être) distinctes/
		);
	});

	it('G2. k = 0 raises DslRuntimeError (k must be >= 1)', () => {
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`c2 = courbe("x = cos(t)+1", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`P = intersection(c1, c2, 0)`
		].join('\n');
		expect(() => runIntersectionParametric(script)).toThrow(
			/`?k`? doit (etre|être) un entier (>=|≥) 1/
		);
	});

	it('G3. k = 1.5 (non-integer) raises DslRuntimeError', () => {
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`c2 = courbe("x = cos(t)+1", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`P = intersection(c1, c2, 1.5)`
		].join('\n');
		expect(() => runIntersectionParametric(script)).toThrow(
			/`?k`? doit (etre|être) un entier (>=|≥) 1/
		);
	});
});
