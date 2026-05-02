/**
 * RED-FIRST TDD — intersection() parametric × {segment, demidroite} (V3).
 *
 * All tests MUST FAIL until V3 is implemented.
 *
 * V3 spec (Newton 1D via reuse of findParametricLineIntersections + clipping):
 *   intersection(c, segment, k)    — Newton on support line, then filter s ∈ [0, 1]
 *   intersection(c, demidroite, k) — Newton on support line, then filter s ≥ 0
 *
 * where s is the parameter of the foot on the segment/ray (s = dot(γ(t)-p1, p2-p1) / ‖p2-p1‖²
 * for segment, s = dot(γ(t)-origin, direction) / ‖direction‖² for ray).
 *
 * Auto-swap: argument order is indifferent for all combos.
 * k is 1-indexed; k > nb intersections → getPosition returns null (no error thrown).
 * Tolerance: ε = acceptance / ‖p2−p1‖ absorbs numerical slop near segment endpoints.
 *
 * New element types (to be created in Phase 2):
 *   GeoIntersectionParametricSegment { curveId, segmentId, k, dependsOn }
 *   GeoIntersectionParametricRay     { curveId, rayId,     k, dependsOn }
 *
 * New helpers (to be exported from parametric-intersection-1d.ts):
 *   findParametricSegmentIntersections(c, bindings, tMin, tMax, p1x, p1y, p2x, p2y, ...)
 *   findParametricRayIntersections(c, bindings, tMin, tMax, ox, oy, vx, vy, ...)
 *
 * Sections:
 *   A. Parametric × segment      (4 tests)
 *   B. Parametric × demidroite   (3 tests)
 *   C. Polaire × segment/demidroite (1 test)
 *   D. Edge cases                (2 tests)
 *   E. Sérialisation             (1 test)
 *
 * Total: 11 tests
 *
 * Key math:
 *   A1  unit circle × segment from (-2,0) to (2,0) → both (−1,0) and (1,0) on segment
 *   A2  unit circle × segment from (3,0) to (5,0)  → 0 intersections (segment outside)
 *   A3  unit circle × segment from (0.5,0) to (2,0) → line support hits (−1,0) and (1,0)
 *         but only (1,0) with s=0.5 ∈ [0,1]; (−1,0) has s<0 → 1 point
 *   A4  auto-swap: intersection(segment, c) ≡ intersection(c, segment)
 *   B1  unit circle × demidroite from (0,0) toward (2,0):
 *         line hits (−1,0) at s<0 (filtered) and (1,0) at s=0.5 ≥ 0 → 1 point at (1,0)
 *   B2  demidroite from (5,0) toward (10,0) → no circle intersection ≥ origin → null
 *   B3  auto-swap: intersection(demidroite, c) ≡ intersection(c, demidroite)
 *   C1  cardioid r=1+cos(θ) × segment crossing near cusp → at least 1 valid intersection
 *   D1  segment endpoint tolerance: intersection very close to s=1 (just within ε) → included
 *   D2  degenerate segment (p1=p2) → DslRuntimeError OU null silencieux
 *   E1  round-trip intersection(c, segment, k) → serialized form re-parses to same position
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
// A. Parametric × segment
// =============================================================================

describe('intersection — parametric × segment (A.)', () => {
	it('A1. unit circle × segment [(-2,0)→(2,0)] → 2 points at (±1, 0)', () => {
		// γ(t) = (cos t, sin t). Support line is y=0.
		// Both intersections (1,0) and (-1,0) lie on the segment [-2,2] along x-axis.
		// s(1,0)  = (1+2)/(4) = 0.75 ∈ [0,1] ✓
		// s(-1,0) = (-1+2)/(4) = 0.25 ∈ [0,1] ✓
		// Both must be returned.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-2, 0)`,
			`B = point(2, 0)`,
			`s = segment(A, B)`,
			`P1 = intersection(c, s, 1)`,
			`P2 = intersection(c, s, 2)`
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

	it('A2. unit circle × segment [(3,0)→(5,0)] entirely outside the circle → null', () => {
		// The segment lies on x-axis from x=3 to x=5.
		// The unit circle intersects y=0 at x=±1, which are both outside [3,5].
		// No valid intersection → k=1 must return null.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(3, 0)`,
			`B = point(5, 0)`,
			`s = segment(A, B)`,
			`P1 = intersection(c, s, 1)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');

		expect(pos1).toBeNull();
	});

	it('A3. support line intersects circle at 2 points but only 1 lies on the segment → 1 valid point', () => {
		// Segment from (0.5, 0) to (2, 0). Support line is y=0.
		// Unit circle ∩ y=0 = { (1,0), (-1,0) }.
		// (1,0): s = (1 - 0.5) / (2 - 0.5) = 0.5/1.5 ≈ 0.333 ∈ [0,1] ✓
		// (-1,0): s = (-1 - 0.5) / 1.5 = -1 < 0 ✗ (before segment start)
		// Only (1,0) must be returned.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(0.5, 0)`,
			`B = point(2, 0)`,
			`s = segment(A, B)`,
			`P1 = intersection(c, s, 1)`,
			`P2 = intersection(c, s, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(geoToNumber(pos1!.x)).toBeCloseTo(1, 3);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(0, 3);

		// Only one valid intersection → k=2 must return null
		expect(pos2).toBeNull();
	});

	it('A4. auto-swap: intersection(segment, c, 1) ≡ intersection(c, segment, 1)', () => {
		// The order of arguments must not affect the result.
		const base = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-2, 0)`,
			`B = point(2, 0)`,
			`s = segment(A, B)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(`${base}\nP = intersection(c, s, 1)`);
		const { figure: fig2, symbols: sym2 } = runMixed(`${base}\nP = intersection(s, c, 1)`);

		const pos1 = getPos(fig1, sym1, 'P');
		const pos2 = getPos(fig2, sym2, 'P');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
	});
});

// =============================================================================
// B. Parametric × demidroite
// =============================================================================

describe('intersection — parametric × demidroite (B.)', () => {
	it('B1. unit circle × demidroite origin (0,0) toward (2,0) → 1 point at (1, 0)', () => {
		// demidroite from O=(0,0) with direction (2,0)->(0,0) = (2,0), i.e. positive x-axis.
		// Unit circle ∩ y=0 = { (1,0), (-1,0) }.
		// (1,0):  s = dot((1,0)-(0,0), (2,0)) / ‖(2,0)‖² = 2/4 = 0.5 ≥ 0 ✓
		// (-1,0): s = dot((-1,0), (2,0)) / 4 = -2/4 = -0.5 < 0 ✗ (behind origin)
		// Only (1,0) must be returned.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0, 0)`,
			`D = point(2, 0)`,
			`r = demidroite(O, D)`,
			`P1 = intersection(c, r, 1)`,
			`P2 = intersection(c, r, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		expect(pos1).not.toBeNull();
		expect(geoToNumber(pos1!.x)).toBeCloseTo(1, 3);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(0, 3);

		// Only one valid intersection (the other is behind origin) → k=2 null
		expect(pos2).toBeNull();
	});

	it('B2. unit circle × demidroite from (5,0) toward (10,0) — ray misses the circle → null', () => {
		// demidroite originates at (5,0) pointing toward positive x.
		// Unit circle is at origin, entirely to the left of x=5.
		// The ray never reaches the circle → k=1 must return null.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(5, 0)`,
			`D = point(10, 0)`,
			`r = demidroite(O, D)`,
			`P1 = intersection(c, r, 1)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');

		expect(pos1).toBeNull();
	});

	it('B3. auto-swap: intersection(demidroite, c, 1) ≡ intersection(c, demidroite, 1)', () => {
		// Order of arguments must not matter.
		const base = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`O = point(0, 0)`,
			`D = point(2, 0)`,
			`r = demidroite(O, D)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(`${base}\nP = intersection(c, r, 1)`);
		const { figure: fig2, symbols: sym2 } = runMixed(`${base}\nP = intersection(r, c, 1)`);

		const pos1 = getPos(fig1, sym1, 'P');
		const pos2 = getPos(fig2, sym2, 'P');

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
	});
});

// =============================================================================
// C. Polaire × segment/demidroite
// =============================================================================

describe('intersection — polaire × segment/demidroite (C.)', () => {
	it('C1. cardioid r=1+cos(θ) × segment [(-1,0)→(3,0)] → at least 1 valid intersection', () => {
		// Polar cardioid r=1+cos(θ): max r=2 at θ=0 → point (2,0) lies on the segment.
		// At θ=0 the cardioid reaches (2,0) which is strictly inside [-1,3] → s ∈ [0,1].
		// At θ=π the cardioid reaches r=0 → origin (0,0) also inside the segment.
		// So at least (2,0) must be a valid intersection.
		const script = [
			`c = courbe("r = 1 + cos(theta)", theta_min=0, theta_max=${TWO_PI})`,
			`A = point(-1, 0)`,
			`B = point(3, 0)`,
			`s = segment(A, B)`,
			`P1 = intersection(c, s, 1)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');

		expect(pos1).not.toBeNull();

		// The point must lie on the x-axis (y ≈ 0) and on the segment x ∈ [-1, 3]
		const x = geoToNumber(pos1!.x);
		const y = geoToNumber(pos1!.y);
		expect(y).toBeCloseTo(0, 2);
		expect(x).toBeGreaterThanOrEqual(-1 - 1e-6);
		expect(x).toBeLessThanOrEqual(3 + 1e-6);
	});
});

// =============================================================================
// D. Edge cases
// =============================================================================

describe('intersection — parametric × segment/demidroite edge cases (D.)', () => {
	it('D1. intersection at s ≈ 1 (within boundary tolerance) → included by tolerance', () => {
		// Segment from (-2, 0) to (1, 0). The unit circle hits (1,0) exactly at s=1.
		// Due to numerical slop, Newton may converge to s = 1 ± ε. The tolerance
		// ε = acceptance / ‖p2-p1‖ must include this boundary hit.
		// If the implementation applies tolerance correctly, P1 must not be null.
		// If the implementation rejects s > 1 strictly, P1 may be null — this test
		// documents the expected inclusive behaviour.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-2, 0)`,
			`B = point(1, 0)`,
			`s = segment(A, B)`,
			`P1 = intersection(c, s, 1)`,
			`P2 = intersection(c, s, 2)`
		].join('\n');

		const { figure, symbols } = runMixed(script);
		const pos1 = getPos(figure, symbols, 'P1');
		const pos2 = getPos(figure, symbols, 'P2');

		// Both (1,0) at s=1 and (-1,0) at s=0.5 lie on or within the segment
		// (the endpoint tolerance must include s=1).
		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		const xs = [geoToNumber(pos1!.x), geoToNumber(pos2!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-1, 3);
		expect(xs[1]).toBeCloseTo(1, 3);
	});

	it('D2. degenerate segment (p1 = p2) → DslRuntimeError or null silently', () => {
		// A segment where both endpoints are the same point has zero length.
		// The implementation must either throw a francophone DslRuntimeError
		// (preferred) or return null silently — both are acceptable V3 behaviours.
		// This test verifies that no unhandled exception propagates.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(1, 0)`,
			`B = point(1, 0)`,
			`s = segment(A, B)`,
			`P = intersection(c, s, 1)`
		].join('\n');

		// Acceptable outcomes: throws DslRuntimeError OR silently returns null.
		// What must NOT happen: an unhandled JS exception or a non-DSL exception.
		let threw = false;
		let pos: ReturnType<typeof getPos> = null;

		try {
			const { figure, symbols } = runMixed(script);
			pos = getPos(figure, symbols, 'P');
		} catch (err) {
			threw = true;
			// If it throws, it MUST be a DslRuntimeError
			expect(err).toBeInstanceOf(DslRuntimeError);
		}

		if (!threw) {
			// If it doesn't throw, position must be null (degenerate → no intersection)
			expect(pos).toBeNull();
		}
	});
});

// =============================================================================
// E. Sérialisation
// =============================================================================

describe('intersection — parametric × segment sérialisation (E.)', () => {
	it('E1. round-trip intersection(c, segment, k) → serialized form re-parses to same position', () => {
		// After serialization + re-parse the element must recreate the same intersection.
		// The serialized form must reference both the curve and the segment, and include k.
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
			`A = point(-2, 0)`,
			`B = point(2, 0)`,
			`s = segment(A, B)`,
			`P = intersection(c, s, 1)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runMixed(script);
		const serialized = serializeDsl(fig1, sym1);

		// Re-run the serialized output (prepend radians because serializer may not emit unite_angle)
		const { figure: fig2, symbols: sym2 } = runDsl(`unite_angle("radians")\n${serialized}`);

		const pos1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const pos2 = fig2.getPosition(sym2.get('P')!.figureId!);

		expect(pos1).not.toBeNull();
		expect(pos2).not.toBeNull();

		expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
		expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);

		// The serialized text must reference both 'c' and 's' in an intersection call
		expect(serialized).toMatch(/intersection\([^)]*c[^)]*,[^)]*s|intersection\([^)]*s[^)]*,[^)]*c/);
	});
});
