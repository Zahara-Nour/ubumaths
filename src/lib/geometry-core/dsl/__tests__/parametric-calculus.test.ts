/**
 * RED-FIRST TDD — builtins C: differential geometry on parametric curves.
 *
 * All tests in this file MUST FAIL until the builtins are implemented (Phase 2).
 * The three new builtins are:
 *
 *   L  = longueur(c)             # arc length over [t_min, t_max] (Simpson N=64)
 *   L  = longueur(c, t1, t2)     # arc length over [t1, t2]
 *   k  = courbure(c, t0)         # signed curvature at t0
 *   oc = cercle_osculateur(c, t0) # osculating circle at t0
 *
 * Architecture assumptions (to be confirmed in Phase 2):
 *   - longueur() → GeoScalar (type 'scalar', scalarKind 'arcLength' or similar)
 *     with compute closure using composite Simpson N=64.
 *     figure.getScalarValue(id) returns the numeric arc length.
 *   - courbure() → GeoScalar (type 'scalar', scalarKind 'curvature' or similar)
 *     formula: κ = (x'·y'' − y'·x'') / (x'² + y'²)^(3/2), signed.
 *     figure.getScalarValue(id) returns the numeric curvature. null when κ=0 or γ'=0.
 *   - cercle_osculateur() → new element type 'osculatingCircle' (GeoOsculatingCircle)
 *     Fields: { type: 'osculatingCircle', curveId, t: ScalarParam, dependsOn }
 *     figure.getPosition(id) returns the centre γ(t0) + n̂/κ.
 *     figure.getOsculatingCircleRadius(id) returns 1/|κ| (API to be confirmed).
 *     When κ=0 → null silently (position null, radius null).
 *
 * Sections:
 *   A. longueur()       (5 tests)
 *   B. courbure()       (4 tests)
 *   C. cercle_osculateur() (3 tests)
 *   D. Reactivity       (2 tests)
 *   E. DSL errors       (2 tests)
 *   F. Serialization    (2 tests)
 *
 * Total: 18 tests — all should be RED until Phase 2 implementation.
 *
 * Test helper API notes:
 *   - getScalarValue(figure, symbols, name) reads a GeoScalar numeric value.
 *   - getPos(figure, symbols, name) reads the geometric position of an element.
 *   - getOsculatingRadius(figure, symbols, name) reads the osculating circle radius
 *     via figure.getOsculatingCircleRadius(id). The exact method name is assumed
 *     and may need adjusting in Phase 2.
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Run a DSL script with radians mode prepended.
 * All parametric tests use cos/sin with radian semantics.
 */
function runC(script: string) {
	return runDsl(`unite_angle("radians")\n${script}`);
}

/**
 * Read the numeric value of a GeoScalar bound to a symbol.
 * Returns null when the symbol is absent, has no figureId, or the scalar
 * value is undefined (degenerate / not-yet-computed).
 */
function getScalarValue(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
): number | null {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;
	const v = figure.getScalarValue(entry.figureId);
	return v === undefined || v === null ? null : v;
}

/**
 * Read the geometric position of an element (used for cercle_osculateur centre).
 */
function getPos(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;
	return figure.getPosition(entry.figureId);
}

/**
 * Read the osculating circle radius via figure.getOsculatingCircleRadius(id).
 *
 * Phase 2 assumption: figure exposes getOsculatingCircleRadius(id: string): number | null.
 * If the method does not exist yet this helper returns null (test still fails with
 * the right assertion rather than a runtime error).
 */
function getOsculatingRadius(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
): number | null {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;

	const fig = figure as unknown as Record<string, unknown>;
	if (typeof fig['getOsculatingCircleRadius'] !== 'function') return null;

	return (fig['getOsculatingCircleRadius'] as (id: string) => number | null)(entry.figureId);
}

const TWO_PI = 2 * Math.PI;

// =============================================================================
// A. longueur()
// =============================================================================

describe('longueur — arc length of parametric curves (A)', () => {
	it('A1. unit circle (cos t, sin t) over [0, 2π] → 2π (± 1e-3)', () => {
		// The arc length of a unit circle over a full turn is exactly 2π ≈ 6.2832.
		// Composite Simpson N=64 has theoretical error O(1/N^4) → < 1e-6 for this integrand.
		const { figure, symbols } = runC(
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` + `L = longueur(c)`
		);

		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(TWO_PI, 3); // tolerance 1e-3
	});

	it('A2. half-circle (cos t, sin t) over [0, π] → π (± 1e-3)', () => {
		// Half of the unit circle perimeter.
		const { figure, symbols } = runC(
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${Math.PI})\n` + `L = longueur(c)`
		);

		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(Math.PI, 3);
	});

	it('A3. parabola (t, t²) over [0, 1] → ≈ 1.4789 (± 1e-3)', () => {
		// Exact arc length of y = x² on [0, 1]:
		//   L = √5/2 + ln(2 + √5)/4  ≈ 1.1180 + 0.3609 ≈ 1.4789
		// (standard result: ∫₀¹ √(1 + 4t²) dt)
		const exact = Math.sqrt(5) / 2 + Math.log(2 + Math.sqrt(5)) / 4; // ≈ 1.4789

		const { figure, symbols } = runC(
			`c = courbe("x = t", "y = t^2", t_min=0, t_max=1)\n` + `L = longueur(c)`
		);

		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(exact, 3);
	});

	it('A4. longueur(c, t1, t2) with explicit bounds → scalar depends on those bounds', () => {
		// Quarter circle from 0 to π/2 → length = π/2.
		// Verifies that explicit t1/t2 arguments override the curve's tMin/tMax.
		const { figure, symbols } = runC(
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` +
				`L = longueur(c, 0, ${Math.PI / 2})`
		);

		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(Math.PI / 2, 3);
	});

	it('A5. cardioid r = 1 - cos(θ) over [0, 2π] → 8 (± 1e-2)', () => {
		// The arc length of the cardioid r = 1 − cos(θ) is exactly 8.
		// In polar form: x = (1-cos θ)cos θ, y = (1-cos θ)sin θ.
		// The integrand has an integrable singularity at θ=0 (cusp), so tolerance is 1e-2.
		const { figure, symbols } = runC(
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})\n` + `L = longueur(c)`
		);

		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(8, 2); // looser tolerance due to cusp at θ=0
	});
});

// =============================================================================
// B. courbure()
// =============================================================================

describe('courbure — signed curvature at a point (B)', () => {
	it('B1. unit circle at t=0 → κ = 1 (positive, anti-clockwise convention)', () => {
		// γ(t) = (cos t, sin t). For standard anti-clockwise traversal:
		// x' = -sin t, y' = cos t, x'' = -cos t, y'' = -sin t
		// κ = (x'·y'' - y'·x'') / (x'² + y'²)^(3/2)
		//   = ((-sin t)(-sin t) - (cos t)(-cos t)) / 1
		//   = (sin²t + cos²t) / 1 = 1
		const { figure, symbols } = runC(
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` + `k = courbure(c, 0)`
		);

		const k = getScalarValue(figure, symbols, 'k');
		expect(k).not.toBeNull();
		expect(k!).toBeCloseTo(1, 4);
	});

	it('B2. circle of radius 2 at t=π/3 → κ = 1/2', () => {
		// γ(t) = (2cos t, 2sin t). Curvature = 1/radius = 1/2.
		const { figure, symbols } = runC(
			`c = courbe("x = 2*cos(t)", "y = 2*sin(t)", t_min=0, t_max=${TWO_PI})\n` +
				`k = courbure(c, ${Math.PI / 3})`
		);

		const k = getScalarValue(figure, symbols, 'k');
		expect(k).not.toBeNull();
		expect(k!).toBeCloseTo(0.5, 4);
	});

	it('B3. parabola (t, t²) at t=0 → κ = 2', () => {
		// γ(t) = (t, t²). x' = 1, y' = 2t, x'' = 0, y'' = 2.
		// κ = (x'·y'' - y'·x'') / (x'² + y'²)^(3/2)
		//   = (1·2 - 2t·0) / (1 + 4t²)^(3/2)
		// At t=0: κ = 2 / 1 = 2
		// (standard result: curvature at vertex of y = x² is 2)
		const { figure, symbols } = runC(
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)\n` + `k = courbure(c, 0)`
		);

		const k = getScalarValue(figure, symbols, 'k');
		expect(k).not.toBeNull();
		expect(k!).toBeCloseTo(2, 4);
	});

	it('B4. cardioid r = 1 - cos(θ) at θ=0 (cusp, γ′=0) → null silently', () => {
		// At θ=0 the cardioid has a cusp: γ'(0) = (0, 0).
		// The curvature formula is undefined (‖γ'‖ = 0 → denominator = 0).
		// The spec requires silent null — no DslRuntimeError thrown.
		expect(() => {
			const { figure, symbols } = runC(
				`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${TWO_PI})\n` +
					`k = courbure(c, 0)`
			);
			const k = getScalarValue(figure, symbols, 'k');
			// null or NaN both acceptable (degenerate — cusp)
			expect(k === null || (k !== null && !Number.isFinite(k!))).toBe(true);
		}).not.toThrow();
	});
});

// =============================================================================
// C. cercle_osculateur()
// =============================================================================

describe('cercle_osculateur — osculating circle (C)', () => {
	it('C1. circle is its own osculating circle: unit circle at t=0 → centre (0,0), radius 1', () => {
		// The osculating circle of γ(t) = (cos t, sin t) is the circle itself.
		// Centre = γ(t0) + n̂/κ = (1,0) + (-cos 0, -sin 0) * 1/1 = (1,0) + (-1, 0) = (0, 0)
		// where n̂ = (-y'/‖γ'‖, x'/‖γ'‖) = (-cos 0, -sin 0) = (-1, 0) at t=0.
		// Wait: n̂ = (-y'/‖γ'‖, x'/‖γ'‖) = (-(cos 0), (-sin 0)) = (-1, 0).
		// centre = (cos 0, sin 0) + (-1, 0)/1 = (1, 0) + (-1, 0) = (0, 0). Correct.
		// Radius = 1/|κ| = 1/1 = 1.
		const { figure, symbols } = runC(
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` +
				`oc = cercle_osculateur(c, 0)`
		);

		const centre = getPos(figure, symbols, 'oc');
		const radius = getOsculatingRadius(figure, symbols, 'oc');

		expect(centre).not.toBeNull();
		expect(geoToNumber(centre!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(centre!.y)).toBeCloseTo(0, 3);

		expect(radius).not.toBeNull();
		expect(radius!).toBeCloseTo(1, 3);
	});

	it('C2. parabola (t, t²) at t=0 → centre (0, 0.5), radius 0.5', () => {
		// κ = 2 at t=0. Radius = 1/2 = 0.5.
		// γ(0) = (0, 0). γ'(0) = (1, 0). ‖γ'(0)‖ = 1.
		// n̂ = (-y'/‖γ'‖, x'/‖γ'‖) = (-(0)/1, (1)/1) = (0, 1).
		// centre = (0, 0) + (0, 1) / 2 = (0, 0.5).
		const { figure, symbols } = runC(
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)\n` + `oc = cercle_osculateur(c, 0)`
		);

		const centre = getPos(figure, symbols, 'oc');
		const radius = getOsculatingRadius(figure, symbols, 'oc');

		expect(centre).not.toBeNull();
		expect(geoToNumber(centre!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(centre!.y)).toBeCloseTo(0.5, 3);

		expect(radius).not.toBeNull();
		expect(radius!).toBeCloseTo(0.5, 3);
	});

	it('C3. straight line (t, 0) at t=0 (κ=0) → null silently, no error', () => {
		// A straight line has κ=0 everywhere. The osculating "circle" has infinite radius.
		// The spec requires silent null (no position, no radius). No DslRuntimeError.
		expect(() => {
			const { figure, symbols } = runC(
				`c = courbe("x = t", "y = 0*t", t_min=-5, t_max=5)\n` + `oc = cercle_osculateur(c, 0)`
			);

			// Both position and radius should be null (κ=0 → degenerate)
			const centre = getPos(figure, symbols, 'oc');
			const radius = getOsculatingRadius(figure, symbols, 'oc');
			// Accept null or infinite radius (degenerate)
			const centreOk = centre === null;
			const radiusOk = radius === null || (radius !== null && !Number.isFinite(radius));
			expect(centreOk || radiusOk).toBe(true);
		}).not.toThrow();
	});
});

// =============================================================================
// D. Reactivity
// =============================================================================

describe('parametric calculus — reactivity (D)', () => {
	it('D1. longueur(c, 0, s) with slider s → moving s changes the arc length', () => {
		// Initial slider value s=1 → quarter circle arc length ≈ π/2 ≈ 1.5708.
		// After moveSlider to s=Math.PI → half circle ≈ π ≈ 3.1416.
		const { figure, symbols } = runC(
			[
				`s = slider(min=0, max=${TWO_PI}, valeur=${Math.PI / 2})`,
				`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
				`L = longueur(c, 0, s)`
			].join('\n')
		);

		const L1 = getScalarValue(figure, symbols, 'L');
		expect(L1).not.toBeNull();
		expect(L1!).toBeCloseTo(Math.PI / 2, 2);

		// Move slider to π
		const sId = symbols.get('s')!.figureId!;
		figure.moveSlider(sId, Math.PI);

		const L2 = getScalarValue(figure, symbols, 'L');
		expect(L2).not.toBeNull();
		expect(L2!).toBeCloseTo(Math.PI, 2);

		// The two values must differ
		expect(Math.abs(L2! - L1!)).toBeGreaterThan(0.5);
	});

	it('D2. cercle_osculateur(c, t) with slider t → moving t changes centre and radius', () => {
		// γ(t) = (t, t²), κ(t) = 2 / (1 + 4t²)^(3/2) — non-constant curvature.
		// At tau=0: κ=2, radius=0.5, centre=(0, 0.5).
		// At tau=1: κ=2/(5^(3/2))≈0.179, radius≈5.59 — centre and radius change significantly.
		//
		// Note: the slider is named 'tau' (not 't') to avoid collision with the curve
		// parameter 't' that the DSL auto-detects inside the equation strings.
		const { figure: fig2, symbols: sym2 } = runC(
			[
				`tau = slider(min=-3, max=3, valeur=0)`,
				`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
				`oc = cercle_osculateur(c, tau)`
			].join('\n')
		);

		const centre0 = getPos(fig2, sym2, 'oc');
		const r0 = getOsculatingRadius(fig2, sym2, 'oc');

		expect(centre0).not.toBeNull();
		expect(r0).not.toBeNull();

		// Move slider tau to 1
		const tauId = sym2.get('tau')!.figureId!;
		fig2.moveSlider(tauId, 1);

		const centre1 = getPos(fig2, sym2, 'oc');
		const r1 = getOsculatingRadius(fig2, sym2, 'oc');

		expect(centre1).not.toBeNull();
		expect(r1).not.toBeNull();

		// At tau=1: κ = 2 / (1+4)^(3/2) = 2/5^1.5 ≈ 0.1789 → radius ≈ 5.59
		// Much larger than radius at tau=0 (0.5).
		expect(r1!).toBeGreaterThan(1);

		// Centre must have moved (y-coordinate especially)
		const centreChanged =
			Math.abs(geoToNumber(centre1!.x) - geoToNumber(centre0!.x)) > 0.01 ||
			Math.abs(geoToNumber(centre1!.y) - geoToNumber(centre0!.y)) > 0.01;
		expect(centreChanged).toBe(true);
	});
});

// =============================================================================
// E. DSL errors
// =============================================================================

describe('parametric calculus — DSL errors (E)', () => {
	it('E1. longueur(c, t1) with only one bound → DslRuntimeError mentioning "t1 et t2"', () => {
		// Providing a single bound is ambiguous and must be rejected explicitly.
		expect(() =>
			runC(
				`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` + `L = longueur(c, 1)`
			)
		).toThrow(/t1 et t2/);
	});

	it('E2. longueur(c, 2, 1) with t1 >= t2 → DslRuntimeError mentioning "t2 doit etre superieur"', () => {
		// The integration direction must be t1 < t2.
		expect(() =>
			runC(
				`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})\n` +
					`L = longueur(c, 2, 1)`
			)
		).toThrow(/t2 doit etre superieur/);
	});
});

// =============================================================================
// F. Serialization
// =============================================================================

describe('parametric calculus — serialization round-trip (F)', () => {
	it('F1. round-trip: longueur(c, 0, 1) preserves explicit bounds', () => {
		// The serialized text must contain the explicit bounds 0 and 1.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`L = longueur(c, 0, 1)`
		].join('\n');

		const { figure, symbols } = runC(script);
		const serialized = serializeDsl(figure, symbols);

		// The serialized form must reference the curve and the two bounds.
		expect(serialized).toMatch(/longueur\(c,\s*0,\s*1\)/);

		// Re-run and verify the scalar value is preserved.
		const { figure: fig2, symbols: sym2 } = runDsl(`unite_angle("radians")\n${serialized}`);
		const L1 = getScalarValue(figure, symbols, 'L');
		const L2 = getScalarValue(fig2, sym2, 'L');
		expect(L1).not.toBeNull();
		expect(L2).not.toBeNull();
		expect(L2!).toBeCloseTo(L1!, 4);
	});

	it('F2. round-trip: cercle_osculateur(c, 1) preserves curveId and t', () => {
		// After serialization + re-parse, cercle_osculateur must exist with same t=1
		// and produce the same centre/radius.
		const script = [
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
			`oc = cercle_osculateur(c, 1)`
		].join('\n');

		const { figure, symbols } = runC(script);
		const serialized = serializeDsl(figure, symbols);

		// Serialized text must reference the curve name and t=1.
		expect(serialized).toMatch(/cercle_osculateur\(c,\s*1\)/);

		// Re-run and verify the element still exists.
		const { figure: fig2, symbols: sym2 } = runDsl(`unite_angle("radians")\n${serialized}`);

		const entry2 = sym2.get('oc');
		expect(entry2).toBeDefined();
		expect(entry2!.figureId).toBeDefined();

		// Centre and radius must be consistent with round-tripped values.
		const centre1 = getPos(figure, symbols, 'oc');
		const centre2 = getPos(fig2, sym2, 'oc');
		expect(centre1).not.toBeNull();
		expect(centre2).not.toBeNull();
		expect(geoToNumber(centre2!.x)).toBeCloseTo(geoToNumber(centre1!.x), 3);
		expect(geoToNumber(centre2!.y)).toBeCloseTo(geoToNumber(centre1!.y), 3);
	});
});

// =============================================================================
// G. Edge cases (added during code review enrichment)
// =============================================================================

describe('parametric calculus (G. edge cases)', () => {
	it('G1. longueur with t bounds outside [t_min, t_max] silently extrapolates', () => {
		// Curve defined on [0, π] but longueur queried on [-π/2, π/2]: compileds
		// extrapolate without error. Speed of (cos t, sin t) parametrisation is 1
		// everywhere, so the length is exactly π regardless of where the interval falls.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${Math.PI})`,
			`L = longueur(c, ${-Math.PI / 2}, ${Math.PI / 2})`
		].join('\n');
		const { figure, symbols } = runC(script);
		const L = getScalarValue(figure, symbols, 'L');
		expect(L).not.toBeNull();
		expect(L!).toBeCloseTo(Math.PI, 3);
	});

	it('G2. cercle_osculateur on circle (constant κ) gives same circle for any t', () => {
		// Unit circle has κ=1 everywhere → osculator is the unit circle itself.
		// Verify two different t values give the same centre.
		const scriptA = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`oc = cercle_osculateur(c, 0.5)`
		].join('\n');
		const scriptB = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`oc = cercle_osculateur(c, 2.5)`
		].join('\n');
		const { figure: fA, symbols: sA } = runC(scriptA);
		const { figure: fB, symbols: sB } = runC(scriptB);
		const cA = getPos(fA, sA, 'oc');
		const cB = getPos(fB, sB, 'oc');
		expect(cA).not.toBeNull();
		expect(cB).not.toBeNull();
		expect(geoToNumber(cA!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(cA!.y)).toBeCloseTo(0, 3);
		expect(geoToNumber(cB!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(cB!.y)).toBeCloseTo(0, 3);
	});
});
