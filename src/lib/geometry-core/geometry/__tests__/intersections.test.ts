import { describe, it, expect } from 'vitest';
import { intersectLL, intersectLC, intersectCC } from '../intersections';
import { exact, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { number } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// =============================================================================
// intersectLL (line-line)
// =============================================================================

describe('intersectLL', () => {
	it('intersects two perpendicular lines at origin', () => {
		// Horizontal line y=0: (−1,0) to (1,0)
		// Vertical line x=0: (0,−1) to (0,1)
		const result = intersectLL(pt(-1, 0), pt(1, 0), pt(0, -1), pt(0, 1));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!.x)).toBe(0);
		expect(geoToNumber(result!.y)).toBe(0);
	});

	it('result is exact when inputs are exact', () => {
		const result = intersectLL(pt(0, 0), pt(2, 2), pt(0, 2), pt(2, 0));
		expect(result).not.toBeNull();
		expect(isExact(result!.x)).toBe(true);
		expect(isExact(result!.y)).toBe(true);
	});

	it('intersects diagonal lines', () => {
		// y = x : (0,0) to (1,1)
		// y = -x + 2 : (0,2) to (2,0)
		// Intersection at (1, 1)
		const result = intersectLL(pt(0, 0), pt(1, 1), pt(0, 2), pt(2, 0));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!.x)).toBe(1);
		expect(geoToNumber(result!.y)).toBe(1);
	});

	it('intersects at fractional point (exact)', () => {
		// y = 2x : (0,0) to (1,2)
		// y = -x + 3 : (0,3) to (3,0)
		// 2x = -x + 3 => 3x = 3 => x = 1, y = 2
		const result = intersectLL(pt(0, 0), pt(1, 2), pt(0, 3), pt(3, 0));
		expect(result).not.toBeNull();
		expect(geoEqual(result!.x, geoFromNumber(1))).toBe(true);
		expect(geoEqual(result!.y, geoFromNumber(2))).toBe(true);
	});

	it('exact intersection at 1/3', () => {
		// Line 1: (0,0) to (3,1) => y = x/3
		// Line 2: (0,1) to (3,0) => y = -x/3 + 1
		// x/3 = -x/3 + 1 => 2x/3 = 1 => x = 3/2, y = 1/2
		const result = intersectLL(pt(0, 0), pt(3, 1), pt(0, 1), pt(3, 0));
		expect(result).not.toBeNull();
		expect(geoEqual(result!.x, geoFromFraction(3, 2))).toBe(true);
		expect(geoEqual(result!.y, geoFromFraction(1, 2))).toBe(true);
	});

	it('returns null for parallel lines', () => {
		// Two horizontal lines: y=0 and y=1
		const result = intersectLL(pt(0, 0), pt(1, 0), pt(0, 1), pt(1, 1));
		expect(result).toBeNull();
	});

	it('returns null for coincident lines', () => {
		// Same line defined by different points
		const result = intersectLL(pt(0, 0), pt(2, 2), pt(1, 1), pt(3, 3));
		expect(result).toBeNull();
	});

	it('returns null for parallel diagonal lines', () => {
		// y = x and y = x + 1
		const result = intersectLL(pt(0, 0), pt(1, 1), pt(0, 1), pt(1, 2));
		expect(result).toBeNull();
	});

	it('handles vertical lines', () => {
		// Vertical x=2 and horizontal y=3
		const result = intersectLL(pt(2, 0), pt(2, 5), pt(0, 3), pt(5, 3));
		expect(result).not.toBeNull();
		expect(geoToNumber(result!.x)).toBe(2);
		expect(geoToNumber(result!.y)).toBe(3);
	});

	it('handles two vertical lines (parallel)', () => {
		const result = intersectLL(pt(1, 0), pt(1, 5), pt(2, 0), pt(2, 5));
		expect(result).toBeNull();
	});
});

// =============================================================================
// intersectLC (line-circle)
// =============================================================================

describe('intersectLC', () => {
	it('line through center of unit circle -> 2 points', () => {
		// Circle center (0,0) radius 5, horizontal line y=0
		const result = intersectLC(
			pt(0, 0),
			pt(1, 0), // line y=0
			pt(0, 0),
			geoFromNumber(5) // circle
		);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// Points at (-5, 0) and (5, 0)
		const xs = result!.map((p) => geoToNumber(p.x)).sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-5, 8);
		expect(xs[1]).toBeCloseTo(5, 8);
	});

	it('tangent line -> 1 point', () => {
		// Circle center (0,0) radius 5, line y=5 (tangent at top)
		const result = intersectLC(
			pt(0, 5),
			pt(1, 5), // line y=5
			pt(0, 0),
			geoFromNumber(5)
		);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result![0].y)).toBeCloseTo(5, 8);
	});

	it('exterior line -> null', () => {
		// Circle center (0,0) radius 5, line y=10 (outside)
		const result = intersectLC(pt(0, 10), pt(1, 10), pt(0, 0), geoFromNumber(5));
		expect(result).toBeNull();
	});

	it('vertical line intersecting circle', () => {
		// Circle center (0,0) radius 5, vertical line x=3
		const result = intersectLC(pt(3, 0), pt(3, 1), pt(0, 0), geoFromNumber(5));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// x=3, x^2+y^2=25 => y^2=16 => y=±4
		const ys = result!.map((p) => geoToNumber(p.y)).sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-4, 8);
		expect(ys[1]).toBeCloseTo(4, 8);
	});

	it('intersection points are exact when possible', () => {
		// Circle center (0,0) radius 5, line y=0
		const result = intersectLC(pt(-10, 0), pt(10, 0), pt(0, 0), geoFromNumber(5));
		expect(result).not.toBeNull();
		// Should be exact: discriminant is a perfect square
		for (const p of result!) {
			expect(isExact(p.x)).toBe(true);
			expect(isExact(p.y)).toBe(true);
		}
	});

	it('off-center circle', () => {
		// Circle center (3,0) radius 2, horizontal line y=0
		// Intersections at (1, 0) and (5, 0)
		const result = intersectLC(pt(0, 0), pt(1, 0), pt(3, 0), geoFromNumber(2));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const xs = result!.map((p) => geoToNumber(p.x)).sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(1, 8);
		expect(xs[1]).toBeCloseTo(5, 8);
	});
});

// =============================================================================
// intersectCC (circle-circle)
// =============================================================================

describe('intersectCC', () => {
	it('two unit circles offset by 1 -> 2 points', () => {
		// Circle 1: center (0,0) radius 1
		// Circle 2: center (1,0) radius 1
		const result = intersectCC(pt(0, 0), geoFromNumber(1), pt(1, 0), geoFromNumber(1));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// Intersection x = 0.5, y = ±sqrt(3)/2
		const xs = result!.map((p) => geoToNumber(p.x));
		expect(xs[0]).toBeCloseTo(0.5, 8);
		expect(xs[1]).toBeCloseTo(0.5, 8);
		const ys = result!.map((p) => geoToNumber(p.y)).sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-Math.sqrt(3) / 2, 8);
		expect(ys[1]).toBeCloseTo(Math.sqrt(3) / 2, 8);
	});

	it('tangent circles (external) -> 1 point', () => {
		// Circle 1: center (0,0) radius 3
		// Circle 2: center (5,0) radius 2
		// Distance = 5 = r1 + r2 => external tangent
		const result = intersectCC(pt(0, 0), geoFromNumber(3), pt(5, 0), geoFromNumber(2));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 8);
	});

	it('disjoint circles -> null', () => {
		const result = intersectCC(pt(0, 0), geoFromNumber(1), pt(10, 0), geoFromNumber(1));
		expect(result).toBeNull();
	});

	it('concentric circles -> null', () => {
		const result = intersectCC(pt(0, 0), geoFromNumber(3), pt(0, 0), geoFromNumber(5));
		expect(result).toBeNull();
	});

	it('one circle inside another -> null', () => {
		const result = intersectCC(pt(0, 0), geoFromNumber(5), pt(1, 0), geoFromNumber(1));
		expect(result).toBeNull();
	});

	it('identical circles -> null (infinite intersections)', () => {
		const result = intersectCC(pt(0, 0), geoFromNumber(5), pt(0, 0), geoFromNumber(5));
		expect(result).toBeNull();
	});

	it('internal tangency (d = |r1 - r2|) -> 1 point', () => {
		// Circle 1: center (0,0) radius 5
		// Circle 2: center (3,0) radius 2 => d=3, r1-r2=3 => internal tangent at (5,0)
		const result = intersectCC(pt(0, 0), geoFromNumber(5), pt(3, 0), geoFromNumber(2));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(5, 8);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 8);
	});

	it('centers on y-axis (exercises B-branch of radical line)', () => {
		// Centers at (0,0) and (0,2), both radius sqrt(2)
		// Radical line: A=0, B=4, C=4 => y=1
		// Circle 1 at y=1: x²+1=2 => x=±1
		const r = geoFromNumber(Math.SQRT2);
		const result = intersectCC(pt(0, 0), r, pt(0, 2), r);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const xs = result!.map((p) => geoToNumber(p.x)).sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-1, 8);
		expect(xs[1]).toBeCloseTo(1, 8);
		result!.forEach((p) => expect(geoToNumber(p.y)).toBeCloseTo(1, 8));
	});

	it('classic construction: equilateral triangle vertex', () => {
		// Two circles of radius 6 centered at (0,0) and (6,0)
		// Intersection gives the vertex of an equilateral triangle
		const result = intersectCC(pt(0, 0), geoFromNumber(6), pt(6, 0), geoFromNumber(6));
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// x = 3, y = ±3*sqrt(3)
		const upper = result!.find((p) => geoToNumber(p.y) > 0)!;
		expect(geoToNumber(upper.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(upper.y)).toBeCloseTo(3 * Math.sqrt(3), 8);
	});
});
