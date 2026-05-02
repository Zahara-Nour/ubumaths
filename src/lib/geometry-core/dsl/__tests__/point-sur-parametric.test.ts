/**
 * RED-FIRST TDD — point_sur() parametric branch (B2).
 *
 * All tests in sections A–F MUST FAIL until the parametric branch is implemented
 * in builtins.ts / figure.ts (Phase 2).
 *
 * The exception is D2 (non-regression for existing point_sur on segment), which
 * should PASS immediately since the existing branch is not touched.
 *
 * API: P = point_sur(c, t0)
 *   c  — GeoParametricCurve (parametric or polar)
 *   t0 — number / ScalarParam (slider) — mandatory in V1
 *   P  — point at γ(t0), draggable: false
 *
 * Sections:
 *   A. Nominal — parametric curves     (3 tests)
 *   B. Nominal — polar curves          (2 tests)
 *   C. Reactivity / dependsOn          (3 tests)
 *   D. Errors                          (2 tests — D2 is non-regression, should PASS)
 *   E. Serialization round-trip        (2 tests)
 *   F. lieu(point_sur(c, t), t)        (2 tests)
 *
 * Total: 14 tests
 *
 * Architecture assumptions (to be confirmed in Phase 2):
 *   - New element type: 'pointOnParametricCurve'
 *   - New figure method: createPointOnParametricCurve(curveId, tValue, options?)
 *   - Fields on the element: { parametricCurveId, t: ScalarParam, draggable: false,
 *       dependsOn: readonly string[] }
 *   - getPosition(id) returns the computed γ(t0) coordinates
 *   - Serializer emits: `P = point_sur(c, 1.5)` or `P = point_sur(c, s)` (symbolic)
 *   - lieu() accepts a pointOnParametricCurve as driver
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { DslRuntimeError } from '../errors';
import { geoToNumber } from '../../compute/to-number';

// =============================================================================
// Helper
// =============================================================================

/**
 * Run a DSL script (with radians mode prepended) and return the resolved
 * symbol P (or any custom name).  The helper asserts that the symbol and its
 * figure element both exist before returning.
 *
 * Architectural note: `unite_angle("radians")` is prepended for the same reason
 * as in courbe-tangente-parametric.test.ts — cos(t)/sin(t) use radian semantics
 * in all tests, which requires the radian directive to be active.
 */
function runPointOnParametric(script: string, pName = 'P') {
	const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
	const pEntry = symbols.get(pName);
	expect(pEntry, `symbol "${pName}" must exist in symbol table`).toBeDefined();
	const p = figure.getElementById(pEntry!.figureId!);
	expect(p, `figure element for "${pName}" must exist`).toBeDefined();
	return { figure, symbols, p: p! };
}

const TWO_PI = 2 * Math.PI;

// =============================================================================
// A. Nominal — parametric curves
// =============================================================================

describe('point_sur — parametric (A. nominal parametric curves)', () => {
	it('A1. point on unit circle (cos(t), sin(t)) at t=0 → P = (1, 0)', () => {
		// γ(0) = (cos(0), sin(0)) = (1, 0)
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);

		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(1, 6);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 6);
	});

	it('A2. point on parabola (t, t²) at t=2 → P = (2, 4)', () => {
		// γ(2) = (2, 4)
		const script = [
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
			`P = point_sur(c, 2)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);

		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(2, 6);
		expect(geoToNumber(pos!.y)).toBeCloseTo(4, 6);
	});

	it('A3. point on unit circle at t=π/2 → P = (0, 1), verified via getPosition', () => {
		// γ(π/2) = (cos(π/2), sin(π/2)) = (0, 1)
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, ${Math.PI / 2})`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);

		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);
	});
});

// =============================================================================
// B. Nominal — polar curves
// =============================================================================

describe('point_sur — parametric (B. nominal polar curves)', () => {
	it('B1. point on polar circle r=2cos(θ) at θ=π/2 → P = (0, 0) since r(π/2)=0', () => {
		// r(π/2) = 2*cos(π/2) = 0 → x = r*cos(θ) = 0, y = r*sin(θ) = 0
		const script = [
			`c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=${Math.PI})`,
			`P = point_sur(c, ${Math.PI / 2})`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);

		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 4);
	});

	it('B2. point on cardioid r=1-cos(θ) at θ=π/2 → P ≈ (0, 1)', () => {
		// r(π/2) = 1 - cos(π/2) = 1
		// x = r*cos(θ) = 1*cos(π/2) ≈ 0
		// y = r*sin(θ) = 1*sin(π/2) = 1
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`P = point_sur(c, ${Math.PI / 2})`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);

		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);
	});
});

// =============================================================================
// C. Reactivity / dependsOn
// =============================================================================

describe('point_sur — parametric (C. reactivity / dependsOn)', () => {
	it('C1. t0 numeric → dependsOn contains [curveId] only', () => {
		// With a numeric t0, the point depends only on the curve, not on any slider.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const cId = symbols.get('c')!.figureId!;
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// Must depend on curve
		expect(p.dependsOn).toContain(cId);

		// With pure numeric t0, no slider is referenced — dependsOn has length 1
		// (or at most contains transitive deps from the curve itself, but no extra slider).
		const sliderSymbol = symbols.get('s');
		expect(sliderSymbol).toBeUndefined(); // no slider created
		expect(p.dependsOn).toHaveLength(1);
	});

	it('C2. t0 is a slider → dependsOn contains [curveId, sliderId]; moving slider updates position', () => {
		// Build a circle with a slider t that drives the point.
		const script = [
			`s = slider(min=0, max=${TWO_PI}, valeur=0)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, s)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const cId = symbols.get('c')!.figureId!;
		const sId = symbols.get('s')!.figureId!;
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// Both the curve and the slider must appear in dependsOn
		expect(p.dependsOn).toContain(cId);
		expect(p.dependsOn).toContain(sId);

		// Move slider to π/2 → γ(π/2) = (0, 1)
		figure.moveSlider(sId, Math.PI / 2);
		figure.recompute();

		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);
	});

	it('C3. curve depends on a slider a; point with numeric t0 re-positions when a moves', () => {
		// c = a*(cos(t), sin(t)).  When a changes from 2 to 3 at t=0:
		// pos should go from (2, 0) to (3, 0).
		const script = [
			`a = slider(min=1, max=5, valeur=2)`,
			`c = courbe("x = a*cos(t)", "y = a*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const aId = symbols.get('a')!.figureId!;
		const cId = symbols.get('c')!.figureId!;
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// The point depends at least on the curve.
		expect(p.dependsOn).toContain(cId);

		// Initial position: a=2, t=0 → (2, 0)
		const pos1 = figure.getPosition(pId);
		expect(geoToNumber(pos1!.x)).toBeCloseTo(2, 4);

		// Move a from 2 to 3 → position should update to (3, 0)
		figure.moveSlider(aId, 3);
		figure.recompute();

		const pos2 = figure.getPosition(pId);
		expect(pos2).toBeDefined();
		expect(geoToNumber(pos2!.x)).toBeCloseTo(3, 4);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(0, 4);
	});
});

// =============================================================================
// D. Errors
// =============================================================================

describe('point_sur — parametric (D. errors)', () => {
	it('D1. point_sur(c) without t throws — t is required for parametric curves', () => {
		// Unlike circle (where angle=0 makes sense), parametric curves have no
		// sensible default parameter value — t0 is mandatory.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c)`
		].join('\n');

		expect(() => runDsl(`unite_angle("radians")\n${script}`)).toThrow(DslRuntimeError);
		// The error message should mention that t (or a parameter) is required for
		// a parametric curve — exact wording is decided in Phase 2.
		expect(() => runDsl(`unite_angle("radians")\n${script}`)).toThrow(
			/paramètre.*requis|t.*obligatoire|paramétrique/i
		);
	});

	it('D2. non-regression: point_sur on segment still works (should PASS immediately)', () => {
		// The existing segment branch must not be broken by adding the parametric branch.
		const { figure, symbols } = runDsl(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nP = point_sur(s, 0.5)'
		);
		const pId = symbols.get('P')!.figureId!;
		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(2, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 4);
	});
});

// =============================================================================
// E. Serialization round-trip
// =============================================================================

describe('point_sur — parametric (E. serialization round-trip)', () => {
	it('E1. round-trip P = point_sur(c, 1.5) — preserves t and curveId', () => {
		const script = [
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
			`P = point_sur(c, 1.5)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(`unite_angle("radians")\n${script}`);
		const serialized = serializeDsl(fig1, sym1);

		// The serialized form must reference point_sur and the numeric t value
		expect(serialized).toContain('point_sur(c, 1.5)');

		// Round-trip: re-parsing the serialized script must produce the same element.
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		expect(sym2.get('P')).toBeDefined();

		// Position must be preserved: γ(1.5) = (1.5, 2.25)
		const pId1 = sym1.get('P')!.figureId!;
		const pId2 = sym2.get('P')!.figureId!;
		const pos1 = fig1.getPosition(pId1);
		const pos2 = fig2.getPosition(pId2);

		expect(pos1).toBeDefined();
		expect(pos2).toBeDefined();
		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 4);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 4);
	});

	it('E2. round-trip P = point_sur(c, s) — slider name serialized symbolically, not as number', () => {
		const script = [
			`s = slider(min=0, max=${TWO_PI}, valeur=1)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, s)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(`unite_angle("radians")\n${script}`);
		const serialized = serializeDsl(fig1, sym1);

		// The slider must be referenced symbolically ('s'), not by its current numeric value.
		expect(serialized).toMatch(/point_sur\(c,\s*s\)/);

		// Round-trip: P survives and still depends on the slider.
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		expect(sym2.get('P')).toBeDefined();

		const sId2 = sym2.get('s')!.figureId!;
		const pEl2 = fig2.getElementById(sym2.get('P')!.figureId!);
		expect(pEl2).toBeDefined();
		expect(pEl2!.dependsOn).toContain(sId2);
	});
});

// =============================================================================
// F. lieu(point_sur(c, t), t) — the primary purpose of B2
// =============================================================================

describe('point_sur — parametric (F. lieu(point_sur(c, t), t))', () => {
	it('F1. midpoint locus on parametric circle → produces ≥30 points on circle of radius 0.5', () => {
		// c = unit circle, O = origin, P = point_sur(c, t), M = midpoint(O, P)
		// lieu(M, P) traces all midpoints → circle of radius 0.5 centred at origin.
		const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const script = [
			`O = point(0, 0)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`t = slider(min=0, max=${TWO_PI}, valeur=0)`,
			`P = point_sur(c, t)`,
			`M = milieu(O, P)`,
			`L = lieu(M, P)`
		].join('\n');

		const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
		const lId = symbols.get('L')!.figureId!;

		const el = figure.getElementById(lId);
		expect(el).toBeDefined();
		expect(el!.type).toBe('locus');

		const curve = figure.computeLocusCurveForElement(lId, defaultViewport);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThanOrEqual(30);

		// All points should lie on the circle of radius 0.5 centred at origin.
		for (const pt of curve!.points) {
			const dist = Math.sqrt(pt.x ** 2 + pt.y ** 2);
			expect(dist).toBeCloseTo(0.5, 1);
		}
	});

	it('F2. locus on polar cardioid → produces ≥30 finite points', () => {
		// c = cardioid r = 1 - cos(theta), P = point_sur(c, theta_slider)
		// The locus of P itself should reproduce the cardioid with ≥30 finite points.
		const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`t = slider(min=0, max=${TWO_PI}, valeur=0)`,
			`P = point_sur(c, t)`,
			`L = lieu(P, P)`
		].join('\n');

		const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
		const lId = symbols.get('L')!.figureId!;

		const el = figure.getElementById(lId);
		expect(el).toBeDefined();
		expect(el!.type).toBe('locus');

		const curve = figure.computeLocusCurveForElement(lId, defaultViewport);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThanOrEqual(30);

		// All sampled points must be finite (no NaN or Infinity).
		for (const pt of curve!.points) {
			expect(Number.isFinite(pt.x)).toBe(true);
			expect(Number.isFinite(pt.y)).toBe(true);
		}
	});
});

// =============================================================================
// G. Edge cases (added during code review enrichment)
// =============================================================================

describe('point_sur — parametric (G. edge cases)', () => {
	it('G1. t0 outside [t_min, t_max] is silently extrapolated (no clamp, no error)', () => {
		// Polar circle r = 1 on [0, π], queried at theta = 3π (out of domain).
		// γ(3π) = (cos(3π), sin(3π)) = (-1, 0)
		const script = [
			`c = courbe("r = 1", theta_min=0, theta_max=${Math.PI})`,
			`P = point_sur(c, ${3 * Math.PI})`
		].join('\n');
		const { figure, p } = runPointOnParametric(script);
		const pos = figure.getPosition(p.id);
		expect(pos).not.toBeNull();
		expect(Number.isFinite(geoToNumber(pos!.x))).toBe(true);
		expect(Number.isFinite(geoToNumber(pos!.y))).toBe(true);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-1, 6);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 6);
	});

	it('G2. lieu on polar curve [0, 2π] (full revolution) closes the path (first ≈ last)', () => {
		// Cardioid on [0, 2π] : γ(0) = γ(2π) = (0, 0). With closed-revolution
		// detection, buildSampledCurve replaces the last point with the first
		// to ensure exact closure (first.x === last.x, first.y === last.y).
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`,
			`t = slider(min=0, max=${2 * Math.PI}, valeur=0)`,
			`P = point_sur(c, t)`,
			`L = lieu(P, P)`
		].join('\n');
		const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
		const lEntry = symbols.get('L');
		expect(lEntry).toBeDefined();
		const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const curve = figure.computeLocusCurveForElement(lEntry!.figureId!, defaultViewport);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThanOrEqual(30);
		// First and last points must coincide exactly (closed-revolution path).
		const first = curve!.points[0];
		const last = curve!.points[curve!.points.length - 1];
		expect(first.x).toBe(last.x);
		expect(first.y).toBe(last.y);
	});

	it('G3. lieu on parametric curve with [0, π] (half revolution) is open (first ≠ last)', () => {
		// Cardioid on [0, π] only — locus should NOT be closed (different endpoints).
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${Math.PI})`,
			`t = slider(min=0, max=${Math.PI}, valeur=0)`,
			`P = point_sur(c, t)`,
			`L = lieu(P, P)`
		].join('\n');
		const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
		const lEntry = symbols.get('L');
		expect(lEntry).toBeDefined();
		const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const curve = figure.computeLocusCurveForElement(lEntry!.figureId!, defaultViewport);
		expect(curve).not.toBeNull();
		// First and last must differ (path is open).
		const first = curve!.points[0];
		const last = curve!.points[curve!.points.length - 1];
		const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
		expect(dist).toBeGreaterThan(0.5);
	});
});

// =============================================================================
// H. Drag — point_sur paramétrique (V2 — RED-FIRST)
//
// All tests below MUST FAIL until Phase 2 is implemented.
//
// Spec:
//   - GeoPointOnParametricCurve.draggable is boolean (not literal false)
//   - Default draggable: true when t is a numeric GeoValue
//   - Default draggable: true when t is a scalarRef pointing to a GeoSlider
//   - draggable: false when t is a scalarRef pointing to a GeoScalar (computed)
//   - figure.movePointOnParametricCurve(id, newT) updates t for numeric t elements
//   - figure.movePointOnParametricCurveFromCursor(id, x, y) runs Newton multi-start
//     and then calls movePointOnParametricCurve or moveSlider as appropriate
//   - Newton multi-start: 8 starts, tolerance 1e-8, max 20 iterations
//   - Clamp: convergence outside [t_min, t_max] → clamp to range
//   - Singularity: skip start if ‖γ'(t0)‖ < 1e-10; all singular → no update
//   - Self-intersecting: pick the root minimising ‖γ(t) − cursor‖ among candidates
// =============================================================================

describe('point_sur — parametric (H. drag V2 — red-first)', () => {
	it('H1. numeric t → draggable === true (default)', () => {
		// V1 has draggable: false as a literal type.
		// V2 changes the type to boolean and defaults to true for numeric t.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0.5)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// This will FAIL in V1 because draggable is always false (literal type).
		expect((p as { draggable: boolean }).draggable).toBe(true);
	});

	it('H2. t is a slider → draggable === true', () => {
		// A point driven by a slider is draggable: moving the point moves the slider.
		const script = [
			`s = slider(min=0, max=${TWO_PI}, valeur=1)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, s)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// Slider-driven point must be draggable.
		expect((p as { draggable: boolean }).draggable).toBe(true);
	});

	it('H3. t is a scalar computed (2*s) → draggable === false', () => {
		// A computed scalar (e.g. 2*s) is read-only from the drag perspective:
		// there is no single slider to update, so drag is disabled.
		const script = [
			`s = slider(min=0, max=${Math.PI}, valeur=0.5)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 2*s)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;
		const p = figure.getElementById(pId)!;

		// Computed scalar → must NOT be draggable.
		expect((p as { draggable: boolean }).draggable).toBe(false);
	});

	it('H4. movePointOnParametricCurve(id, newT) updates position for numeric-t point', () => {
		// Direct API test: no Newton involved — the caller provides newT directly.
		// P starts at t=0 (position (1, 0)) on the unit circle.
		// After moving to t=π/2 via the figure API, position must be (0, 1).
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;

		// This method does not exist in V1 — test will fail with a TypeError.
		(
			figure as unknown as { movePointOnParametricCurve(id: string, newT: number): void }
		).movePointOnParametricCurve(pId, Math.PI / 2);
		figure.recompute();

		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);
	});

	it('H5. movePointOnParametricCurveFromCursor on unit circle finds nearest t', () => {
		// The cursor is placed at approximately (0, 1), which corresponds to t=π/2
		// on the unit circle. Newton multi-start should converge to t≈π/2.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, 0)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;

		// Cursor at (0, 1) — expected: Newton converges to t≈π/2 → P moves to (0, 1).
		// This method does not exist in V1.
		(
			figure as unknown as {
				movePointOnParametricCurveFromCursor(id: string, cx: number, cy: number): void;
			}
		).movePointOnParametricCurveFromCursor(pId, 0, 1);
		figure.recompute();

		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);
	});

	it('H6. Newton clamps t when cursor is outside the reachable arc', () => {
		// The curve is a half-circle (upper half): t ∈ [0, π], so y ≥ 0 always.
		// Cursor at (0, -1) is below the curve — Newton should clamp to the
		// nearest boundary (t=0 or t=π, both give y=0).
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${Math.PI})`,
			`P = point_sur(c, ${Math.PI / 2})`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;

		// Cursor at (0, -2) — below the half-circle, unreachable.
		(
			figure as unknown as {
				movePointOnParametricCurveFromCursor(id: string, cx: number, cy: number): void;
			}
		).movePointOnParametricCurveFromCursor(pId, 0, -2);
		figure.recompute();

		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();

		// After clamping, t must be at one of the boundaries: t=0 → (1, 0)
		// or t=π → (-1, 0). Either way, y must be 0 (or very close — clamped boundary).
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 3);
	});

	it('H7. singularity at cardioid cusp: Newton skips degenerate start, returns valid t', () => {
		// Cardioid r = 1 - cos(θ): at θ=0 the cusp is at (0,0) and γ'(0)=(0,0),
		// so that starting point is singular (‖γ'‖ < 1e-10).
		// With 8 starts uniformly spaced on [0, 2π], the start at θ=0 (or very
		// near it) must be skipped; other starts converge and return a valid t.
		// Test: cursor near (0, 0) (the cusp) should not return NaN or throw.
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`P = point_sur(c, 1)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const pId = symbols.get('P')!.figureId!;

		// Cursor at exactly the cusp (0, 0) — the singular point.
		expect(() => {
			(
				figure as unknown as {
					movePointOnParametricCurveFromCursor(id: string, cx: number, cy: number): void;
				}
			).movePointOnParametricCurveFromCursor(pId, 0, 0);
			figure.recompute();
		}).not.toThrow();

		// After the call, position must be a finite point (not NaN, not Infinity).
		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(Number.isFinite(geoToNumber(pos!.x))).toBe(true);
		expect(Number.isFinite(geoToNumber(pos!.y))).toBe(true);
	});

	it('H8. drag with slider-t updates the slider value', () => {
		// When t is a slider, dragging P to cursor (0, 1) on the unit circle
		// must update the slider to t≈π/2, not write a numeric t directly.
		// The coupling is bidirectional: slider → point; drag → slider → point.
		const script = [
			`s = slider(min=0, max=${TWO_PI}, valeur=0)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = point_sur(c, s)`
		].join('\n');

		const { figure, symbols } = runPointOnParametric(script);
		const sId = symbols.get('s')!.figureId!;
		const pId = symbols.get('P')!.figureId!;

		// Move via cursor — must update the slider internally.
		(
			figure as unknown as {
				movePointOnParametricCurveFromCursor(id: string, cx: number, cy: number): void;
			}
		).movePointOnParametricCurveFromCursor(pId, 0, 1);
		figure.recompute();

		// Verify position: P should be at (0, 1).
		const pos = figure.getPosition(pId);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 4);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 4);

		// Verify the slider was updated (not just the element's t field).
		const sliderEl = figure.getElementById(sId) as { value: number } | undefined;
		expect(sliderEl).toBeDefined();
		expect(sliderEl!.value).toBeCloseTo(Math.PI / 2, 3);
	});
});
