import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { exact, numeric, isExact, isNumeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(numericNode(x)), y: exact(numericNode(y)) };
}

// =============================================================================
// createIntersectionLL
// =============================================================================

describe('createIntersectionLL', () => {
	it('creates intersection point of two crossing segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);

		const inter = f.createIntersectionLL(seg1, seg2);
		expect(f.getElementById(inter)).toBeDefined();
		expect(f.getElementById(inter)!.type).toBe('intersectionLL');

		const pos = f.getPosition(inter);
		expect(pos).not.toBeNull();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0, 8);
	});

	it('intersection is exact when parents are exact', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint(pt(2, -2));
		const d = f.createFreePoint(pt(2, 2));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);

		const inter = f.createIntersectionLL(seg1, seg2);
		const pos = f.getPosition(inter)!;
		expect(isExact(pos.x)).toBe(true);
		expect(isExact(pos.y)).toBe(true);
		expect(geoEqual(pos.x, geoFromNumber(2))).toBe(true);
		expect(geoEqual(pos.y, geoFromNumber(0))).toBe(true);
	});

	it('intersection becomes numeric when parent is dragged', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		// Initially exact
		expect(isExact(f.getPosition(inter)!.x)).toBe(true);

		// Drag -> numeric
		f.movePoint(c, numeric(3), numeric(-5));
		f.movePoint(d, numeric(3), numeric(5));
		f.recompute();
		expect(isNumeric(f.getPosition(inter)!.x)).toBe(true);
	});

	it('intersection updates when parent point is dragged', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		f.movePoint(c, numeric(3), numeric(-5));
		f.movePoint(d, numeric(3), numeric(5));
		f.recompute();

		const pos = f.getPosition(inter)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(0, 8);
	});

	it('intersection disappears when lines become parallel', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 1));
		const d = f.createFreePoint(pt(5, 1));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		expect(f.getPosition(inter)).toBeNull();
	});

	it('intersection reappears when lines stop being parallel', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 1));
		const d = f.createFreePoint(pt(5, 1));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		// Parallel -> no intersection
		expect(f.getPosition(inter)).toBeNull();

		// Make non-parallel by moving d
		f.movePoint(d, numeric(5), numeric(-1));
		f.recompute();
		expect(f.getPosition(inter)).not.toBeNull();
	});

	it('works with lines (not just segments)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(0, 2));
		const d = f.createFreePoint(pt(2, 0));
		const line1 = f.createLine(a, b);
		const line2 = f.createLine(c, d);

		const inter = f.createIntersectionLL(line1, line2);
		const pos = f.getPosition(inter)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(1, 8);
	});

	it('works with rays', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(0, 5));
		const ray1 = f.createRay(a, b);
		const ray2 = f.createRay(c, d);

		const inter = f.createIntersectionLL(ray1, ray2);
		const pos = f.getPosition(inter)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(0, 8);
	});

	it('works with mixed: segment and line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint(pt(2, -3));
		const d = f.createFreePoint(pt(2, 3));
		const seg = f.createSegment(a, b);
		const line = f.createLine(c, d);

		const inter = f.createIntersectionLL(seg, line);
		const pos = f.getPosition(inter)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(0, 8);
	});

	it('intersection at fractional coordinates (exact)', () => {
		const f = new Figure();
		// Line 1: (0,0) to (3,1) => y = x/3
		// Line 2: (0,1) to (3,0) => y = -x/3 + 1
		// Intersection: x = 3/2, y = 1/2
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 1));
		const c = f.createFreePoint(pt(0, 1));
		const d = f.createFreePoint(pt(3, 0));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);

		const inter = f.createIntersectionLL(seg1, seg2);
		const pos = f.getPosition(inter)!;
		expect(geoEqual(pos.x, geoFromFraction(3, 2))).toBe(true);
		expect(geoEqual(pos.y, geoFromFraction(1, 2))).toBe(true);
	});

	it('cascade: removing a line removes the intersection', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		f.remove(seg1);
		expect(f.getElementById(inter)).toBeUndefined();
		expect(f.getPosition(inter)).toBeNull();
	});

	it('cascade: removing a defining point removes everything downstream', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);
		const e = f.createFreePoint(pt(3, 3));
		f.createSegment(inter, e);

		f.remove(a); // removes a, seg1, inter, segment from inter to e
		expect(f.getElementById(inter)).toBeUndefined();
		expect(f.size).toBe(5); // b, c, d, e, seg2
	});

	it('throws if first arg is not line-like', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createIntersectionLL(a, seg)).toThrow('not a line-like');
	});

	it('throws if second arg is not line-like', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createIntersectionLL(seg, a)).toThrow('not a line-like');
	});

	it('midpoint of intersection updates correctly', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		// Midpoint between intersection (0,0) and point (4,4)
		const e = f.createFreePoint(pt(4, 4));
		const mid = f.createMidpoint(inter, e);
		expect(geoToNumber(f.getPosition(mid)!.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(f.getPosition(mid)!.y)).toBeCloseTo(2, 8);

		// Move intersection via dragging
		f.movePoint(c, numeric(2), numeric(-5));
		f.movePoint(d, numeric(2), numeric(5));
		f.recompute();
		// Intersection now at (2, 0), midpoint = (3, 2)
		expect(geoToNumber(f.getPosition(mid)!.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(f.getPosition(mid)!.y)).toBeCloseTo(2, 8);
	});
});

// =============================================================================
// createReflectedPoint
// =============================================================================

describe('createReflectedPoint', () => {
	it('creates reflected point through origin', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBe(-3);
		expect(geoToNumber(pos.y)).toBe(-4);
	});

	it('reflected point is exact when parents are exact', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		const pos = f.getPosition(reflected)!;
		expect(isExact(pos.x)).toBe(true);
		expect(isExact(pos.y)).toBe(true);
	});

	it('reflected point becomes numeric after drag', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		expect(isExact(f.getPosition(reflected)!.x)).toBe(true);

		f.movePoint(p, numeric(5), numeric(2));
		f.recompute();
		expect(isNumeric(f.getPosition(reflected)!.x)).toBe(true);
	});

	it('reflected point follows when source point is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		f.movePoint(p, numeric(5), numeric(2));
		f.recompute();

		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(-5, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(-2, 8);
	});

	it('reflected point follows when center is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(4, 0));
		const center = f.createFreePoint(pt(2, 0));
		const reflected = f.createReflectedPoint(p, center);

		expect(geoToNumber(f.getPosition(reflected)!.x)).toBe(0);

		f.movePoint(center, numeric(3), numeric(0));
		f.recompute();
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBeCloseTo(2, 8);
	});

	it('reflected through non-origin center', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(5, 3));
		const center = f.createFreePoint(pt(2, 1));
		const reflected = f.createReflectedPoint(p, center);

		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBe(-1);
		expect(geoToNumber(pos.y)).toBe(-1);
	});

	it('double reflection returns to original position', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(7, 3));
		const center = f.createFreePoint(pt(2, 5));
		const reflected1 = f.createReflectedPoint(p, center);
		const reflected2 = f.createReflectedPoint(reflected1, center);

		const pos = f.getPosition(reflected2)!;
		expect(geoEqual(pos.x, exact(numericNode(7)))).toBe(true);
		expect(geoEqual(pos.y, exact(numericNode(3)))).toBe(true);
	});

	it('double reflection still works after drag + recompute', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(7, 3));
		const center = f.createFreePoint(pt(2, 5));
		const reflected1 = f.createReflectedPoint(p, center);
		const reflected2 = f.createReflectedPoint(reflected1, center);

		f.movePoint(p, numeric(10), numeric(-4));
		f.recompute();

		const pos = f.getPosition(reflected2)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(10, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(-4, 8);
	});

	it('midpoint of source and reflection is the center', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(8, 6));
		const center = f.createFreePoint(pt(3, 1));
		const reflected = f.createReflectedPoint(p, center);

		const pPos = f.getPosition(p)!;
		const rPos = f.getPosition(reflected)!;
		const midX = (geoToNumber(pPos.x) + geoToNumber(rPos.x)) / 2;
		const midY = (geoToNumber(pPos.y) + geoToNumber(rPos.y)) / 2;
		expect(midX).toBe(3);
		expect(midY).toBe(1);
	});

	it('cascade: removing source removes reflected point', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		f.remove(p);
		expect(f.getElementById(reflected)).toBeUndefined();
		expect(f.getPosition(reflected)).toBeNull();
	});

	it('cascade: removing center removes reflected point', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);

		f.remove(center);
		expect(f.getElementById(reflected)).toBeUndefined();
	});

	it('throws if sourceId is not a point element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		const center = f.createFreePoint(pt(5, 5));
		expect(() => f.createReflectedPoint(seg, center)).toThrow('not a point');
	});

	it('throws if centerId is not a point element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createReflectedPoint(a, seg)).toThrow('not a point');
	});

	it('throws if sourceId === centerId', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		expect(() => f.createReflectedPoint(p, p)).toThrow('distinct');
	});

	it('reflected point of a midpoint', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(6, 0));
		const mid = f.createMidpoint(a, b); // (3, 0)
		const center = f.createFreePoint(pt(3, 3));
		const reflected = f.createReflectedPoint(mid, center);

		// 2*(3,3) - (3,0) = (3, 6)
		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(6, 8);

		// Drag a -> midpoint moves -> reflected follows
		f.movePoint(a, numeric(2), numeric(0));
		f.recompute();
		// mid = (4, 0), reflected = 2*(3,3) - (4,0) = (2, 6)
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(f.getPosition(reflected)!.y)).toBeCloseTo(6, 8);
	});

	it('segment from reflected point to center', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(4, 0));
		const center = f.createFreePoint(pt(0, 0));
		const reflected = f.createReflectedPoint(p, center);
		f.createSegment(reflected, center);

		expect(f.size).toBe(4); // p, center, reflected, segment
	});
});

// =============================================================================
// Mixed dependent points
// =============================================================================

describe('mixed dependent points', () => {
	it('reflected point of an intersection', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2); // (0, 0)
		const center = f.createFreePoint(pt(3, 3));
		const reflected = f.createReflectedPoint(inter, center);

		// 2*(3,3) - (0,0) = (6, 6)
		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(6, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(6, 8);

		// Drag c to move intersection
		f.movePoint(c, numeric(2), numeric(-5));
		f.movePoint(d, numeric(2), numeric(5));
		f.recompute();
		// Intersection now at (2, 0), reflected = 2*(3,3) - (2,0) = (4, 6)
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBeCloseTo(4, 8);
		expect(geoToNumber(f.getPosition(reflected)!.y)).toBeCloseTo(6, 8);
	});

	it('midpoint of two intersections', () => {
		const f = new Figure();
		// Two pairs of crossing lines
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint(pt(2, -2));
		const d = f.createFreePoint(pt(2, 2));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter1 = f.createIntersectionLL(seg1, seg2); // (2, 0)

		const e = f.createFreePoint(pt(0, 0));
		const g = f.createFreePoint(pt(0, 4));
		const h = f.createFreePoint(pt(-2, 2));
		const i = f.createFreePoint(pt(2, 2));
		const seg3 = f.createSegment(e, g);
		const seg4 = f.createSegment(h, i);
		const inter2 = f.createIntersectionLL(seg3, seg4); // (0, 2)

		const mid = f.createMidpoint(inter1, inter2);
		const pos = f.getPosition(mid)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(1, 8);
	});
});
