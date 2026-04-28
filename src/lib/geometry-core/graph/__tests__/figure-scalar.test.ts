import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

// =============================================================================
// A. GeoScalar — creation and reactivity
// =============================================================================

describe('GeoScalar: distance', () => {
	it('creates a distance scalar with correct value', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b);
		expect(f.getScalarValue(d)).toBeCloseTo(5, 10);
	});

	it('element has type scalar and scalarKind distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const d = f.createScalarDistance(a, b);
		const el = f.getElementById(d)!;
		expect(el.type).toBe('scalar');
		expect((el as { scalarKind: string }).scalarKind).toBe('distance');
	});

	it('updates when a source point moves', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b);
		expect(f.getScalarValue(d)).toBeCloseTo(5, 10);

		f.beginTransaction();
		f.movePoint(b, numeric(6), numeric(8));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(d)).toBeCloseTo(10, 10);
	});

	it('depends on both points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const d = f.createScalarDistance(a, b);
		const el = f.getElementById(d)!;
		expect(el.dependsOn).toContain(a);
		expect(el.dependsOn).toContain(b);
	});
});

describe('GeoScalar: angle', () => {
	it('computes angle value correctly (90 degrees)', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const o = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const a = f.createScalarAngle(p1, o, p2);
		expect(f.getScalarValue(a)).toBeCloseTo(90, 5);
	});

	it('computes angle value correctly (60 degrees)', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const o = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0.5, Math.sqrt(3) / 2));
		const a = f.createScalarAngle(p1, o, p2);
		expect(f.getScalarValue(a)).toBeCloseTo(60, 3);
	});

	it('updates when vertex moves', () => {
		const f = new Figure();
		const p1 = f.createFreePoint(pt(1, 0));
		const o = f.createFreePoint(pt(0, 0));
		const p2 = f.createFreePoint(pt(0, 1));
		const a = f.createScalarAngle(p1, o, p2);
		expect(f.getScalarValue(a)).toBeCloseTo(90, 5);

		// Move p2 to (1,0) direction — angle becomes 0
		f.beginTransaction();
		f.movePoint(p2, numeric(2), numeric(0));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(a)).toBeCloseTo(0, 5);
	});
});

describe('GeoScalar: norme', () => {
	it('computes vector norm correctly', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const v = f.createVectorByPoints(a, b);
		const n = f.createScalarNorme(v);
		expect(f.getScalarValue(n)).toBeCloseTo(5, 10);
	});

	it('updates when vector endpoint moves', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const v = f.createVectorByPoints(a, b);
		const n = f.createScalarNorme(v);

		f.beginTransaction();
		f.movePoint(b, numeric(0), numeric(0));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(n)).toBeCloseTo(0, 10);
	});
});

describe('GeoScalar: expression', () => {
	it('computes a composed expression from other scalars', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b); // d = 5

		const expr = f.createScalarExpression((sv) => 1 + 3 / (sv.get(d) ?? 1), [d]);
		// 1 + 3/5 = 1.6
		expect(f.getScalarValue(expr)).toBeCloseTo(1.6, 10);
	});

	it('updates when underlying scalar changes', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const d = f.createScalarDistance(a, b); // d = 5

		const expr = f.createScalarExpression((sv) => 1 + 3 / (sv.get(d) ?? 1), [d]);

		// Move b to (6,8) → d = 10 → 1 + 3/10 = 1.3
		f.beginTransaction();
		f.movePoint(b, numeric(6), numeric(8));
		f.recompute();
		f.commit();

		expect(f.getScalarValue(expr)).toBeCloseTo(1.3, 10);
	});
});

// =============================================================================
// B. GeoSlider
// =============================================================================

describe('GeoSlider', () => {
	it('creates a slider with initial value', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 3);
		expect(f.getScalarValue(s)).toBe(3);
	});

	it('element has type slider', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 5);
		const el = f.getElementById(s)!;
		expect(el.type).toBe('slider');
	});

	it('clamps initial value to [min, max]', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 15);
		expect(f.getScalarValue(s)).toBe(10);
	});

	it('moveSlider updates the value', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 3);
		f.beginTransaction();
		f.moveSlider(s, 7);
		f.recompute();
		f.commit();
		expect(f.getScalarValue(s)).toBe(7);
	});

	it('moveSlider clamps to max', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 3);
		f.beginTransaction();
		f.moveSlider(s, 15);
		f.recompute();
		f.commit();
		expect(f.getScalarValue(s)).toBe(10);
	});

	it('moveSlider clamps to min', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 3);
		f.beginTransaction();
		f.moveSlider(s, -5);
		f.recompute();
		f.commit();
		expect(f.getScalarValue(s)).toBe(0);
	});

	it('moveSlider rounds to step', () => {
		const f = new Figure();
		const s = f.createSlider(0, 10, 3, { step: 2 });
		f.beginTransaction();
		f.moveSlider(s, 5.7);
		f.recompute();
		f.commit();
		expect(f.getScalarValue(s)).toBe(6);
	});

	it('dependents update when slider changes', () => {
		const f = new Figure();
		const o = f.createFreePoint(pt(0, 0));
		const s = f.createSlider(1, 10, 3);
		const c = f.createCircleByRadius(o, { scalarRef: s });
		const el = f.getElementById(c)!;
		// Circle should depend on both center and slider
		expect(el.dependsOn).toContain(o);
		expect(el.dependsOn).toContain(s);

		// Point on circle at theta=0 should be at (3, 0)
		const p = f.createPointOnCircle(c, 0);
		const pos = f.getPosition(p);
		expect(pos).not.toBeNull();
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(3) });

		// Move slider to 5 → point should be at (5, 0)
		f.beginTransaction();
		f.moveSlider(s, 5);
		f.recompute();
		f.commit();

		const pos2 = f.getPosition(p);
		expect(pos2).not.toBeNull();
		expect(pos2!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(5) });
	});
});

// =============================================================================
// C. ScalarParam — dynamic parameters
// =============================================================================

describe('ScalarParam: circle with dynamic radius', () => {
	it('circle radius from scalar distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const d = f.createScalarDistance(a, b); // d = 3

		const o = f.createFreePoint(pt(5, 5));
		const c = f.createCircleByRadius(o, { scalarRef: d });

		// Point on circle at theta=0 should be at (8, 5) = (5+3, 5)
		const p = f.createPointOnCircle(c, 0);
		const pos = f.getPosition(p);
		expect(pos).not.toBeNull();
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(8) });
		expect(pos!.y).toMatchObject({ kind: 'numeric', value: expect.closeTo(5) });
	});

	it('circle updates when scalar changes', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const d = f.createScalarDistance(a, b); // d = 3

		const o = f.createFreePoint(pt(0, 0));
		const c = f.createCircleByRadius(o, { scalarRef: d });
		const p = f.createPointOnCircle(c, 0);

		// Move b to (5,0) → d = 5 → circle radius = 5
		f.beginTransaction();
		f.movePoint(b, numeric(5), numeric(0));
		f.recompute();
		f.commit();

		const pos = f.getPosition(p);
		expect(pos).not.toBeNull();
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(5) });
	});

	it('backward compat: GeoValue radius still works', () => {
		const f = new Figure();
		const o = f.createFreePoint(pt(0, 0));
		const c = f.createCircleByRadius(o, numeric(4));
		const p = f.createPointOnCircle(c, 0);
		const pos = f.getPosition(p);
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(4) });
	});
});

describe('ScalarParam: rotation with dynamic angle', () => {
	it('rotation angle from scalar (radians)', () => {
		const f = new Figure();
		// Rotation angle is in radians internally
		const s = f.createSlider(0, 2 * Math.PI, Math.PI / 2);
		const source = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const r = f.createRotatedPoint(source, center, { scalarRef: s });

		const pos = f.getPosition(r);
		expect(pos).not.toBeNull();
		// pi/2 radians: (1,0) → (0,1)
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(0, 5) });
		expect(pos!.y).toMatchObject({ kind: 'numeric', value: expect.closeTo(1, 5) });
	});

	it('rotation updates when slider changes', () => {
		const f = new Figure();
		const s = f.createSlider(0, 2 * Math.PI, Math.PI / 2);
		const source = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const r = f.createRotatedPoint(source, center, { scalarRef: s });

		// Move slider to pi radians
		f.beginTransaction();
		f.moveSlider(s, Math.PI);
		f.recompute();
		f.commit();

		const pos = f.getPosition(r);
		// pi radians: (1,0) → (-1,0)
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(-1, 5) });
		expect(pos!.y).toMatchObject({ kind: 'numeric', value: expect.closeTo(0, 5) });
	});
});

describe('ScalarParam: homothety with dynamic factor', () => {
	it('homothety factor from scalar expression', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const d = f.createScalarDistance(a, b); // d = 5

		// factor = 1 + 3/d = 1 + 3/5 = 1.6
		const factor = f.createScalarExpression((sv) => 1 + 3 / (sv.get(d) ?? 1), [d]);

		const source = f.createFreePoint(pt(2, 0));
		const center = f.createFreePoint(pt(0, 0));
		const h = f.createDilatedPoint(source, center, { scalarRef: factor });

		const pos = f.getPosition(h);
		// center(0,0), source(2,0), factor 1.6 → (0 + 1.6*(2-0), 0) = (3.2, 0)
		expect(pos).not.toBeNull();
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(3.2, 5) });
	});
});

// =============================================================================
// D. GeoMeasure backward compat
// =============================================================================

describe('GeoMeasure backward compat', () => {
	it('getMeasureValue still works', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const m = f.createMeasure('distance', [a, b]);
		expect(f.getMeasureValue(m)).toBeCloseTo(5, 10);
	});

	it('getScalarValue also returns measure values', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const m = f.createMeasure('distance', [a, b]);
		expect(f.getScalarValue(m)).toBeCloseTo(5, 10);
	});

	it('measure can be used as scalarRef for circle radius', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const m = f.createMeasure('distance', [a, b]); // m = 3

		const o = f.createFreePoint(pt(10, 0));
		const c = f.createCircleByRadius(o, { scalarRef: m });
		const p = f.createPointOnCircle(c, 0);
		const pos = f.getPosition(p);
		expect(pos!.x).toMatchObject({ kind: 'numeric', value: expect.closeTo(13) }); // 10 + 3
	});
});

// =============================================================================
// E. Error cases
// =============================================================================

describe('GeoScalar: errors', () => {
	it('throws on missing point for distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.createScalarDistance(a, 'nope')).toThrow();
	});

	it('throws on non-point for angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createScalarAngle(a, seg, b)).toThrow();
	});

	it('throws on non-vector for norme', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(() => f.createScalarNorme(a)).toThrow();
	});

	it('handles division by zero gracefully in expression', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 0)); // same point → distance = 0
		const d = f.createScalarDistance(a, b);

		const expr = f.createScalarExpression((sv) => 1 / (sv.get(d) ?? 0), [d]);
		// Should not crash, may return Infinity or NaN
		const val = f.getScalarValue(expr);
		expect(val).toBeDefined();
		expect(typeof val).toBe('number');
	});

	it('slider clamps initial value below min', () => {
		const f = new Figure();
		const s = f.createSlider(5, 10, 2);
		expect(f.getScalarValue(s)).toBe(5);
	});
});

// =============================================================================
// F. Locus + Scalar integration
// =============================================================================

const defaultViewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe('Locus with scalar dependency', () => {
	it('locus through scalar: limacon de Pascal', () => {
		const f = new Figure();
		// Circle of radius 2 centered at origin
		const K = f.createFreePoint(pt(0, 0));
		const c = f.createCircleByRadius(K, numeric(2));
		// Fixed point O on the x-axis
		const O = f.createFreePoint(pt(2, 0));
		// Driver point A on the circle
		const A = f.createPointOnCircle(c, Math.PI / 2); // start at top

		// n = distance(O, A)
		const n = f.createScalarDistance(O, A);
		// factor = 1 + 3/n (limacon with d=3, a=2)
		const factor = f.createScalarExpression((sv) => 1 + 3 / (sv.get(n) ?? 1), [n]);
		// P = homothety(A, center=O, rapport=factor)
		const P = f.createDilatedPoint(A, O, { scalarRef: factor });

		// Create locus: trace P as A moves around the circle
		const loc = f.createLocus(A, P, { numSamples: 100 });

		const curve = f.computeLocusCurveForElement(loc, defaultViewport);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);
	});

	it('locus with slider-controlled radius', () => {
		const f = new Figure();
		const O = f.createFreePoint(pt(0, 0));
		const s = f.createSlider(1, 5, 2);
		const c = f.createCircleByRadius(O, { scalarRef: s });
		const A = f.createPointOnCircle(c, 0);

		// Simple locus: trace A as it moves around the circle
		const loc = f.createLocus(A, A, { numSamples: 50 });
		const curve = f.computeLocusCurveForElement(loc, defaultViewport);
		expect(curve).not.toBeNull();
		// The locus should be a circle of radius 2
		// Check that max x is approximately 2
		const maxX = Math.max(...curve!.points.map((p) => p.x));
		expect(maxX).toBeCloseTo(2, 0);
	});
});
