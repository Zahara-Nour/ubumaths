/**
 * RED-FIRST TDD — intersection() parametric × {droite, cercle, fonction} (V2).
 *
 * All tests in sections A–D, F, G MUST FAIL until the V2 branch is implemented.
 * Section E (out-of-scope errors) and section D2 (concentric circles) may be
 * green early because they rely on existing throw/null behaviour.
 *
 * V2 spec (Newton 1D, 16 uniform starts, 20 iter, tol 1e-8):
 *   intersection(c, droite)    — cross(γ(t)−P, v) = 0
 *   intersection(c, cercle)    — ‖γ(t)−center‖² − r² = 0
 *   intersection(c, fonction)  — γ_y(t) − f(γ_x(t)) = 0
 *
 * Auto-swap: argument order is indifferent for all three combos.
 * k is 1-indexed; k > nb intersections → getPosition returns null silently.
 * Results sorted by t ascending (canonical).
 *
 * New element types (to be created in Phase 2):
 *   GeoIntersectionParametricLine   { curveId, lineId,     k, dependsOn }
 *   GeoIntersectionParametricCircle { curveId, circleId,   k, dependsOn }
 *   GeoIntersectionParametricFunction { curveId, functionId, k, dependsOn }
 *
 * Sections:
 *   A. Parametric × droite          (4 tests)
 *   B. Parametric × cercle          (3 tests)
 *   C. Parametric × fonction        (3 tests)
 *   D. Polaire × droite/cercle      (2 tests)
 *   E. Hors-scope / erreurs DSL     (2 tests)
 *   F. Réactivité                   (1 test)
 *   G. Sérialisation                (1 test)
 *
 * Total: 16 tests
 *
 * Key math:
 *   A1  circle(cos t, sin t) ∩ y=0    → t=0,π → (1,0) and (-1,0)
 *   A2  ellipse(2cos t, sin t) ∩ x=1  → cos t=0.5 → t=π/3,5π/3 → y=±√3/2
 *   A4  circle(cos t, sin t) ∩ y=1    → sin t=1 → one point (0,1); k=2 null
 *   B1  ellipse(2cos t, sin t) ∩ x²+y²=1
 *         4cos²t+sin²t=1 → 3cos²t=0 → cos t=0 → t=π/2,3π/2 → (0,1),(0,-1)
 *   B3  concentric disjoint circles  → null
 *   C1  circle(cos t, sin t) ∩ y=x²
 *         sin t = cos²t → two solutions in [0,2π]; points lie on unit circle
 *   D1  cardioid r=1-cos θ ∩ y=0     → r sin θ=0 → θ=0(origin) and θ=π ((-2,0))
 *   D2  polar circle r=1 ∩ cercle(r=0.5 centred at (0.5,0)) → 1 point at (1,0)
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { DslRuntimeError } from '../errors';

// =============================================================================
// Helpers
// =============================================================================

/** Prepend unite_angle("radians") so trigonometric functions use radian semantics. */
function runMixed(script: string) {
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
// A. Parametric × droite
// =============================================================================

describe('intersection — parametric × droite (A.)', () => {
	it('A1. unit circle (cos t, sin t) × horizontal line y=0 → 2 points at (±1, 0)', () => {
		// γ(t) = (cos t, sin t), droite through (-5,0) and (5,0) is y=0.
		// Newton 1D: cross(γ(t)−P, v) = γ_y(t)·v_x − γ_x(t)·v_y = sin(t)·10 = 0
		// → sin(t)=0 → t=0,π → points (1,0) and (-1,0).
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-5, 0)`,
			`B = point(5, 0)`,
			`d = droite(A, B)`,
			`P1 = intersection(c, d, 1)`,
			`P2 = intersection(c, d, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		const xs = [geoToNumber(pos1!.x), geoToNumber(pos2!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-1, 3);
		expect(xs[1]).toBeCloseTo(1, 3);

		// Both y-coordinates must be ≈ 0
		expect(geoToNumber(pos1!.y)).toBeCloseTo(0, 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(0, 3);
	});

	it('A2. ellipse (2cos t, sin t) × vertical line x=1 → 2 points with y = ±√3/2', () => {
		// 2cos(t)=1 → cos(t)=0.5 → t=π/3 (y=√3/2) and t=5π/3 (y=−√3/2).
		// Droite verticale through (1,-5) and (1,5).
		const script = [
			`c = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(1, -5)`,
			`B = point(1, 5)`,
			`d = droite(A, B)`,
			`P1 = intersection(c, d, 1)`,
			`P2 = intersection(c, d, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both x-coordinates must be ≈ 1
		expect(geoToNumber(pos1!.x)).toBeCloseTo(1, 3);
		expect(geoToNumber(pos2!.x)).toBeCloseTo(1, 3);

		// y-coordinates must be ±√3/2 (sorted)
		const ys = [geoToNumber(pos1!.y), geoToNumber(pos2!.y)].sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-Math.sqrt(3) / 2, 3);
		expect(ys[1]).toBeCloseTo(Math.sqrt(3) / 2, 3);
	});

	it('A3. auto-swap: intersection(droite, c) returns same points as intersection(c, droite)', () => {
		// Order of arguments must not matter for the result.
		const base = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-5, 0)`,
			`B = point(5, 0)`,
			`d = droite(A, B)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(`${base}\nP = intersection(c, d, 1)`);
		const { figure: fig2, symbols: sym2 } = runMixed(`${base}\nP = intersection(d, c, 1)`);

		const pos1 = getPos(fig1, sym1, 'P');
		const pos2 = getPos(fig2, sym2, 'P');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both should agree to 3 decimal places
		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
	});

	it('A4. tangent droite to unit circle → k=1 returns (0,1), k=2 returns null', () => {
		// Droite y=1 is tangent to the unit circle at (0,1).
		// Newton converges to exactly one solution; k=2 must silently return null.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-5, 1)`,
			`B = point(5, 1)`,
			`d = droite(A, B)`,
			`P1 = intersection(c, d, 1)`,
			`P2 = intersection(c, d, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(geoToNumber(pos1!.x)).toBeCloseTo(0, 2);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(1, 2);

		// k=2 is beyond the number of intersections → null (no error)
		expect(pos2).toBeNull();
	});
});

// =============================================================================
// B. Parametric × cercle
// =============================================================================

describe('intersection — parametric × cercle (B.)', () => {
	it('B1. ellipse (2cos t, sin t) × unit circle x²+y²=1 → 2 points at (0, ±1)', () => {
		// System: (2cos t)²+(sin t)²=1 ⟺ 4cos²t+sin²t=1 ⟺ 3cos²t=0 → cos t=0
		// → t=π/2 → (0,1)  and  t=3π/2 → (0,-1).  Exactly 2 intersection points.
		const script = [
			`c = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0, 0)`,
			`circle = cercle(O, rayon=1)`,
			`P1 = intersection(c, circle, 1)`,
			`P2 = intersection(c, circle, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both x-coordinates must be ≈ 0
		expect(geoToNumber(pos1!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(pos2!.x)).toBeCloseTo(0, 3);

		// y-coordinates must be ±1 (sorted)
		const ys = [geoToNumber(pos1!.y), geoToNumber(pos2!.y)].sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-1, 3);
		expect(ys[1]).toBeCloseTo(1, 3);
	});

	it('B2. auto-swap: intersection(cercle, c) ≡ intersection(c, cercle)', () => {
		const base = [
			`c = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0, 0)`,
			`circle = cercle(O, rayon=1)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(`${base}\nP = intersection(c, circle, 1)`);
		const { figure: fig2, symbols: sym2 } = runMixed(`${base}\nP = intersection(circle, c, 1)`);

		const pos1 = getPos(fig1, sym1, 'P');
		const pos2 = getPos(fig2, sym2, 'P');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
	});

	it('B3. parametric circle × concentric classical circle (disjoint) → null', () => {
		// Parametric: unit circle (cos t, sin t).
		// Classical: cercle centred at origin radius 3.
		// These are concentric and do not intersect → k=1 must return null.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0, 0)`,
			`circle = cercle(O, rayon=3)`,
			`P = intersection(c, circle, 1)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos = getPos(figure, symbols, 'P');

		// The parametric circle r=1 never touches the classical circle r=3 at origin
		expect(pos).toBeNull();
	});
});

// =============================================================================
// C. Parametric × fonction
// =============================================================================

describe('intersection — parametric × fonction (C.)', () => {
	it('C1. unit circle × parabola y=x² → 2 points that lie on the circle', () => {
		// System: sin t = cos²t  ⟺  1 - cos t = cos²t  (using sin²t+cos²t=1)
		// Let u=cos t: u² + u - 1 = 0 → u = (−1+√5)/2 ≈ 0.618
		// → two t values in [0,2π] with that cos t, giving two distinct (x,y).
		// Both points must satisfy x²+y²=1 and y=x².
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`f = courbe("y = x^2")`,
			`P1 = intersection(c, f, 1)`,
			`P2 = intersection(c, f, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both points must lie on the unit circle
		for (const pos of [pos1, pos2]) {
			const x = geoToNumber(pos!.x);
			const y = geoToNumber(pos!.y);
			expect(x * x + y * y).toBeCloseTo(1, 2);
			// And on the parabola
			expect(y).toBeCloseTo(x * x, 2);
		}
	});

	it('C2. auto-swap: intersection(fonction, c) ≡ intersection(c, fonction)', () => {
		const base = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`f = courbe("y = x^2")`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(`${base}\nP = intersection(c, f, 1)`);
		const { figure: fig2, symbols: sym2 } = runMixed(`${base}\nP = intersection(f, c, 1)`);

		const pos1 = getPos(fig1, sym1, 'P');
		const pos2 = getPos(fig2, sym2, 'P');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
	});

	it('C3. domain restriction: f(x)=x² on [0,5] × unit circle → only point(s) with x≥0', () => {
		// f is restricted to x ∈ [0, 5].  The unit circle × y=x² has solutions at two
		// mirror-symmetric x values (one positive, one negative).  With the domain
		// restriction only the positive-x solution must be returned.
		// k=1 returns the (unique, positive-x) point; k=2 returns null.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`f = courbe("y = x^2", x_min=0, x_max=5)`,
			`P1 = intersection(c, f, 1)`,
			`P2 = intersection(c, f, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		// The returned point must have x ≥ 0 (within domain)
		expect(geoToNumber(pos1!.x)).toBeGreaterThanOrEqual(-1e-6);

		// The negative-x solution is filtered out → k=2 must be null
		expect(pos2).toBeNull();
	});
});

// =============================================================================
// D. Polaire × droite/cercle
// =============================================================================

describe('intersection — polaire × droite/cercle (D.)', () => {
	it('D1. cardioid r=1+cos(θ) × horizontal line y=0 → at least 2 points on y=0', () => {
		// Polar cardioid r=1+cos θ: x = r·cos θ, y = r·sin θ.
		// y=0 ⟺ r·sin θ = 0 ⟺ sin θ=0 (r>0 for θ≠π) or r=0 (θ=π, origin).
		// θ=0 → r=2, point (2,0).  θ=π → r=0, origin (0,0).  Both on y=0.
		const script = [
			`c = courbe("r = 1 + cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`A = point(-5, 0)`,
			`B = point(5, 0)`,
			`d = droite(A, B)`,
			`P1 = intersection(c, d, 1)`,
			`P2 = intersection(c, d, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		// Both points must have y ≈ 0
		expect(geoToNumber(pos1!.y)).toBeCloseTo(0, 2);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(0, 2);
	});

	it('D2. polar circle r=1 × cercle(rayon=0.5) centred at (0.5, 0) → 1 point at (1, 0)', () => {
		// The polar curve r=1 is the unit circle centred at origin.
		// The classical circle: centre (0.5, 0), radius 0.5 passes through (0,0) and (1,0).
		// Intersection of x²+y²=1 with (x−0.5)²+y²=0.25:
		// Expanding: x²−x+0.25+y²=0.25 → x²+y²=x → 1=x → x=1, y=0.
		// Exactly one intersection point at (1, 0); k=2 → null.
		const script = [
			`c = courbe("r = 1", theta_min=0, theta_max=${TWO_PI})`,
			`O = point(0.5, 0)`,
			`circle = cercle(O, rayon=0.5)`,
			`P1 = intersection(c, circle, 1)`,
			`P2 = intersection(c, circle, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(geoToNumber(pos1!.x)).toBeCloseTo(1, 3);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(0, 3);

		expect(pos2).toBeNull();
	});
});

// =============================================================================
// E. Hors-scope / erreurs DSL
// =============================================================================

describe('intersection — hors-scope V2 (E.)', () => {
	it('E1. intersection(c, segment) → DslRuntimeError avec message francophone', () => {
		// Segment is NOT part of V2 scope. The dispatcher must throw a DSL error
		// indicating this limitation with a French message.
		// The error message is implementation-defined but must be francophone.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-2, 0)`,
			`B = point(2, 0)`,
			`s = segment(A, B)`,
			`P = intersection(c, s, 1)`
		].join('\n');

		// Assumption: V2 will still throw for segment (not part of V2 scope).
		// This test confirms the error is thrown (message pattern may need updating
		// once V2 is implemented and the exact error text is known).
		expect(() => runMixed(script)).toThrow(DslRuntimeError);
	});

	it('E2. intersection(c, quadraticCurve) → DslRuntimeError (conique implicite non supportée)', () => {
		// A quadratic/conic implicit curve is not in V2 scope.
		// The parametric × implicit-conic combo must remain unsupported in V2.
		// (If the implementer decides to support it, this test must be updated.)
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`q = courbe("x^2 + y^2 - 4 = 0")`,
			`P = intersection(c, q, 1)`
		].join('\n');

		// Expected: throws because parametric × implicit-conic is unsupported in V2.
		// Note: if the implementer routes this to the parametric × circle branch
		// (since x²+y²−4=0 is a circle), this test should be updated to verify
		// the resulting position instead.
		expect(() => runMixed(script)).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// F. Réactivité
// =============================================================================

describe('intersection — parametric × droite réactivité (F.)', () => {
	it('F1. slider in droite → moving slider recomputes parametric × droite intersection', () => {
		// The droite passes through (0, h) and (1, h) where h is a slider.
		// Initially h=0 → line y=0 intersects unit circle at (±1,0).
		// After moving h to 0.5 → line y=0.5 intersects unit circle at x=±√(1−0.25)=±√0.75.
		const script = [
			`h = slider(min=-1, max=1, valeur=0)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-5, h)`,
			`B = point(5, h)`,
			`d = droite(A, B)`,
			`P = intersection(c, d, 1)`
		].join('\n');

		const { figure, symbols } = runMixed(script);

		// Initial position at h=0 → y=0 line
		const pos1 = getPos(figure, symbols, 'P');
		expect(pos1).not.toBeNull();
		const y1 = geoToNumber(pos1!.y);
		expect(y1).toBeCloseTo(0, 3);

		// Move slider to h=0.5
		const hId = symbols.get('h')!.figureId!;
		figure.moveSlider(hId, 0.5);

		// Intersection must have recomputed
		const pos2 = getPos(figure, symbols, 'P');
		expect(pos2).not.toBeNull();

		const y2 = geoToNumber(pos2!.y);
		// y must now be ≈ 0.5 (on the new line)
		expect(y2).toBeCloseTo(0.5, 2);
		// And the point must still lie on the unit circle
		const x2 = geoToNumber(pos2!.x);
		expect(x2 * x2 + y2 * y2).toBeCloseTo(1, 2);
	});
});

// =============================================================================
// G. Sérialisation
// =============================================================================

describe('intersection — parametric × droite sérialisation (G.)', () => {
	it('G1. round-trip: P = intersection(c, d, k) → serialized form re-parses to same position', () => {
		// After serialization + re-parse the element must re-create the same intersection
		// with the same position.  The serialized form must reference both the curve
		// and the line (order as emitted by the serializer) and include k=2 explicitly.
		const script = [
			`c = courbe("x = 2*cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(1, -5)`,
			`B = point(1, 5)`,
			`d = droite(A, B)`,
			`P = intersection(c, d, 2)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(script);
		const serialized = serializeDsl(fig1, sym1);

		// Re-run the serialized output (also prepend radians because the serializer
		// may not emit unite_angle).
		const { figure: fig2, symbols: sym2 } = runDsl(`unite_angle("radians")\n${serialized}`);

		const pos1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const pos2 = fig2.getPosition(sym2.get('P')!.figureId!);

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);

		// The serialized text must reference both 'c' and 'd' in an intersection call
		expect(serialized).toMatch(/intersection\([^)]*c[^)]*,[^)]*d|intersection\([^)]*d[^)]*,[^)]*c/);
	});
});

// =============================================================================
// H. Edge cases (added during code review enrichment)
// =============================================================================

describe('intersection — parametric mixed (H. edge cases)', () => {
	it('H1. courbe with both `sur [a;b]` and x_min/x_max named args raises DslRuntimeError', () => {
		const script = [
			`f = courbe("y = x^2 sur [0;5]", x_min=0, x_max=5)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`P = intersection(c, f, 1)`
		].join('\n');
		expect(() => runMixed(script)).toThrow(/x_min|x_max|sur|domaine/i);
	});

	it('H2. spatial dedup scales with coordinate range (small-scale geometry)', () => {
		// Intersection of two tangent circles at micro scale: two circles
		// tangent at origin, both with radius 0.001. Newton may converge from
		// multiple starts to nearly-the-same physical point but with different
		// numerical jitter ≤ 1e-9. The relative spatial dedup should still
		// merge these into one.
		const script = [
			`c = courbe("x = 0.001*cos(t)", "y = 0.001*sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0.001, 0)`,
			`circle = cercle(O, rayon=0.001)`,
			`P1 = intersection(c, circle, 1)`,
			`P2 = intersection(c, circle, 2)`
		].join('\n');
		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		// At least one intersection at (0.001, 0)
		expect(pos1).not.toBeNull();
		// At micro scale, the dedup must NOT silently merge two genuinely close
		// but distinct intersections (none here — circles are tangent so just one).
		// k=2 should be null since circles are tangent.
		const pos2 = getPos(figure, symbols, 'P2');
		expect(pos2).toBeNull();
	});
});
