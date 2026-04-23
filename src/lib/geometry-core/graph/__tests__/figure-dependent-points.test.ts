import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { exact, numeric, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber } from '../../compute/geo-arithmetic';
import { number } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
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

	it('intersection updates when parent point is dragged', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		// Move line 2 to x=3
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
		const seg1 = f.createSegment(a, b); // y=0
		const seg2 = f.createSegment(c, d); // y=1, parallel
		const inter = f.createIntersectionLL(seg1, seg2);

		// Parallel lines: no intersection
		expect(f.getPosition(inter)).toBeNull();
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

	it('cascade: segment from intersection to another point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);

		// Create a segment from intersection to another point
		const e = f.createFreePoint(pt(3, 3));
		f.createSegment(inter, e);
		expect(f.size).toBe(9); // 5 points + 3 segments + 1 intersection

		// Removing seg1 cascades: removes intersection and the segment from it
		f.remove(seg1);
		expect(f.getElementById(inter)).toBeUndefined();
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

		// Initially: 2*2 - 4 = 0
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBe(0);

		f.movePoint(center, numeric(3), numeric(0));
		f.recompute();

		// Now: 2*3 - 4 = 2
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBeCloseTo(2, 8);
	});

	it('reflected through non-origin center', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(5, 3));
		const center = f.createFreePoint(pt(2, 1));
		const reflected = f.createReflectedPoint(p, center);

		// 2*2-5 = -1, 2*1-3 = -1
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
		expect(geoEqual(pos.x, exact(number(7)))).toBe(true);
		expect(geoEqual(pos.y, exact(number(3)))).toBe(true);
	});
});
