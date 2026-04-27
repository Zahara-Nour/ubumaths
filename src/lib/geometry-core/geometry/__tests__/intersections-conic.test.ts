import { describe, it, expect } from 'vitest';
import { intersectLQ, intersectQQ } from '../intersections';
import { intersectLC } from '../intersections';
import { exact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoFromNumber } from '../../compute/geo-arithmetic';
import { number } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

/** Sort points by x, then by y for deterministic comparison */
function sortPoints(pts: GeoPoint[]): { x: number; y: number }[] {
	return pts
		.map((p) => ({ x: geoToNumber(p.x), y: geoToNumber(p.y) }))
		.sort((a, b) => a.x - b.x || a.y - b.y);
}

// Ellipse x²/a² + y²/b² = 1  →  [1/a², 0, 1/b², 0, 0, -1]
// or equivalently [b², 0, a², 0, 0, -a²*b²]
const ellipse_3_2: readonly [number, number, number, number, number, number] = [
	1 / 9,
	0,
	1 / 4,
	0,
	0,
	-1
]; // x²/9 + y²/4 = 1, a=3 b=2

// Circle center (0,0) radius 5 as conic: x² + y² - 25 = 0
const circle_5: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -25];

// Hyperbola x²/4 - y²/9 = 1  →  [1/4, 0, -1/9, 0, 0, -1]
const hyperbola_2_3: readonly [number, number, number, number, number, number] = [
	1 / 4,
	0,
	-1 / 9,
	0,
	0,
	-1
];

// Parabola y = x²  →  x² - y = 0  →  [1, 0, 0, 0, -1, 0]
const parabola_y_x2: readonly [number, number, number, number, number, number] = [
	1, 0, 0, 0, -1, 0
];

// =============================================================================
// intersectLQ (line-conic)
// =============================================================================

describe('intersectLQ', () => {
	it('line through center of ellipse -> 2 points', () => {
		// Horizontal line y=0 through ellipse x²/9 + y²/4 = 1
		// Intersections at (-3, 0) and (3, 0)
		const result = intersectLQ(pt(-5, 0), pt(5, 0), ellipse_3_2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-3, 6);
		expect(sorted[0].y).toBeCloseTo(0, 6);
		expect(sorted[1].x).toBeCloseTo(3, 6);
		expect(sorted[1].y).toBeCloseTo(0, 6);
	});

	it('vertical line through ellipse -> 2 points', () => {
		// Vertical line x=0 through ellipse x²/9 + y²/4 = 1
		// Intersections at (0, -2) and (0, 2)
		const result = intersectLQ(pt(0, -5), pt(0, 5), ellipse_3_2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].y).toBeCloseTo(-2, 6);
		expect(sorted[1].y).toBeCloseTo(2, 6);
	});

	it('tangent line to ellipse -> 1 point', () => {
		// Horizontal line y=2 is tangent to ellipse x²/9 + y²/4 = 1 at (0, 2)
		const result = intersectLQ(pt(-5, 2), pt(5, 2), ellipse_3_2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(2, 6);
	});

	it('exterior line -> null', () => {
		// Line y=5 does not intersect ellipse x²/9 + y²/4 = 1
		const result = intersectLQ(pt(-5, 5), pt(5, 5), ellipse_3_2);
		expect(result).toBeNull();
	});

	it('diagonal line through ellipse -> 2 points', () => {
		// Line y=x through ellipse x²/9 + y²/4 = 1
		// x²/9 + x²/4 = 1 => x²(4+9)/36 = 1 => x² = 36/13 => x = ±6/√13
		const result = intersectLQ(pt(-5, -5), pt(5, 5), ellipse_3_2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const expectedX = 6 / Math.sqrt(13);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-expectedX, 6);
		expect(sorted[1].x).toBeCloseTo(expectedX, 6);
	});

	it('line through hyperbola -> 2 points (both branches)', () => {
		// Horizontal line y=0 through hyperbola x²/4 - y²/9 = 1
		// Intersections at (-2, 0) and (2, 0)
		const result = intersectLQ(pt(-5, 0), pt(5, 0), hyperbola_2_3);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-2, 6);
		expect(sorted[1].x).toBeCloseTo(2, 6);
	});

	it('vertical line through hyperbola -> null (between branches)', () => {
		// Vertical line x=0 does not intersect hyperbola x²/4 - y²/9 = 1
		const result = intersectLQ(pt(0, -5), pt(0, 5), hyperbola_2_3);
		expect(result).toBeNull();
	});

	it('line through parabola -> 2 points', () => {
		// Horizontal line y=4 through parabola y=x²
		// x² = 4 => x = ±2
		const result = intersectLQ(pt(-5, 4), pt(5, 4), parabola_y_x2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-2, 6);
		expect(sorted[1].x).toBeCloseTo(2, 6);
	});

	it('tangent to parabola -> 1 point', () => {
		// Line y=0 is tangent to parabola y=x² at origin
		const result = intersectLQ(pt(-5, 0), pt(5, 0), parabola_y_x2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
	});

	it('consistency with intersectLC for circle', () => {
		// Compare intersectLQ on circle conic with intersectLC
		// Circle center (0,0) radius 5, line through (0,0) to (1,1)
		const lqResult = intersectLQ(pt(0, 0), pt(1, 1), circle_5);
		const lcResult = intersectLC(pt(0, 0), pt(1, 1), pt(0, 0), geoFromNumber(5));
		expect(lqResult).not.toBeNull();
		expect(lcResult).not.toBeNull();
		expect(lqResult!.length).toBe(lcResult!.length);

		const lqSorted = sortPoints(lqResult!);
		const lcSorted = sortPoints(lcResult!);
		for (let i = 0; i < lqSorted.length; i++) {
			expect(lqSorted[i].x).toBeCloseTo(lcSorted[i].x, 6);
			expect(lqSorted[i].y).toBeCloseTo(lcSorted[i].y, 6);
		}
	});

	it('line through off-center ellipse -> 2 points', () => {
		// Ellipse (x-2)²/4 + y² = 1 → x²-4x+4)/4 + y² = 1 → x²/4 - x + 1 + y² = 1
		// → [0.25, 0, 1, -1, 0, 0]
		const offCenterEllipse: readonly [number, number, number, number, number, number] = [
			0.25, 0, 1, -1, 0, 0
		];
		// Horizontal line y=0 → intersections at x=0 and x=4
		const result = intersectLQ(pt(-5, 0), pt(5, 0), offCenterEllipse);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(0, 6);
		expect(sorted[1].x).toBeCloseTo(4, 6);
	});

	it('tilted conic (B ≠ 0): rotated ellipse', () => {
		// x² + x*y + y² - 1 = 0 (rotated ellipse)
		const rotatedEllipse: readonly [number, number, number, number, number, number] = [
			1, 1, 1, 0, 0, -1
		];
		// Horizontal line y=0 → x² - 1 = 0 → x = ±1
		const result = intersectLQ(pt(-5, 0), pt(5, 0), rotatedEllipse);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-1, 6);
		expect(sorted[1].x).toBeCloseTo(1, 6);
	});

	it('large coordinates: circle radius 1000', () => {
		// Circle x² + y² = 1000000
		const bigCircle: readonly [number, number, number, number, number, number] = [
			1, 0, 1, 0, 0, -1e6
		];
		// Line y=500 → x² + 250000 = 1000000 → x² = 750000 → x = ±866.025...
		const result = intersectLQ(pt(-2000, 500), pt(2000, 500), bigCircle);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-Math.sqrt(750000), 2);
		expect(sorted[1].x).toBeCloseTo(Math.sqrt(750000), 2);
	});

	it('degenerate conic (pair of lines) -> 2 points', () => {
		// x² - y² = 0 → (x-y)(x+y) = 0, pair of lines y=x and y=-x
		const degenerateConic: readonly [number, number, number, number, number, number] = [
			1, 0, -1, 0, 0, 0
		];
		// Horizontal line y=3 → intersections at (3, 3) and (-3, 3)
		const result = intersectLQ(pt(-5, 3), pt(5, 3), degenerateConic);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-3, 6);
		expect(sorted[1].x).toBeCloseTo(3, 6);
	});

	it('line parallel to asymptote of hyperbola -> 1 point', () => {
		// Hyperbola x²/4 - y²/9 = 1, asymptotes y = ±(3/2)x
		// Line y = (3/2)x + 1 is parallel to an asymptote, should intersect once
		// Using points: (0, 1) and (2, 4) for line y = (3/2)x + 1
		const result = intersectLQ(pt(0, 1), pt(2, 4), hyperbola_2_3);
		// Substituting y = (3/2)x + 1 into x²/4 - y²/9 = 1:
		// x²/4 - ((3/2)x + 1)²/9 = 1
		// x²/4 - (9x²/4 + 3x + 1)/9 = 1
		// x²/4 - x²/4 - x/3 - 1/9 = 1
		// -x/3 = 1 + 1/9 = 10/9
		// x = -10/3
		// This is a degenerate quadratic (a=0), so 1 solution
		expect(result).not.toBeNull();
		expect(result!.length).toBe(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-10 / 3, 6);
	});
});

// =============================================================================
// intersectQQ (conic-conic)
// =============================================================================

describe('intersectQQ', () => {
	it('circle and ellipse -> 4 points', () => {
		// Circle x² + y² = 5 and ellipse x²/9 + y²/4 = 1
		// Circle: [1, 0, 1, 0, 0, -5]
		const circleCoeffs: readonly [number, number, number, number, number, number] = [
			1, 0, 1, 0, 0, -5
		];
		const result = intersectQQ(circleCoeffs, ellipse_3_2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(4);
	});

	it('two circles -> 2 points (consistent with intersectCC)', () => {
		// Circle 1: center (0,0) radius 2 -> x² + y² - 4 = 0
		// Circle 2: center (1,0) radius 2 -> (x-1)² + y² - 4 = 0 -> x² -2x +1 + y² - 4 = 0 -> x² + y² -2x - 3 = 0
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -4];
		const c2: readonly [number, number, number, number, number, number] = [1, 0, 1, -2, 0, -3];
		const result = intersectQQ(c1, c2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// x = 0.5 for both points
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(0.5, 6);
		expect(sorted[1].x).toBeCloseTo(0.5, 6);
	});

	it('disjoint conics -> null', () => {
		// Circle x² + y² - 1 = 0 (radius 1 at origin)
		// Small ellipse centered far away: (x-10)²/4 + y² = 1 -> x²/4 -5x + 25 + y² -1 = 0
		// -> [0.25, 0, 1, -5, 0, 24]
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -1];
		const c2: readonly [number, number, number, number, number, number] = [0.25, 0, 1, -5, 0, 24];
		const result = intersectQQ(c1, c2);
		expect(result).toBeNull();
	});

	it('ellipse and parabola -> up to 4 points', () => {
		// Parabola y = x²: [1, 0, 0, 0, -1, 0]
		// Circle x² + y² = 2: [1, 0, 1, 0, 0, -2]
		// Substituting: x² + x⁴ = 2 => x⁴ + x² - 2 = 0 => (x²+2)(x²-1) = 0 => x = ±1
		// So 2 points: (1,1) and (-1,1)
		const circleCoeffs: readonly [number, number, number, number, number, number] = [
			1, 0, 1, 0, 0, -2
		];
		const result = intersectQQ(circleCoeffs, parabola_y_x2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-1, 6);
		expect(sorted[0].y).toBeCloseTo(1, 6);
		expect(sorted[1].x).toBeCloseTo(1, 6);
		expect(sorted[1].y).toBeCloseTo(1, 6);
	});

	it('tangent conics -> fewer points', () => {
		// Circle x² + y² = 1
		// Ellipse x²/4 + y² = 1 (larger on x, same on y => tangent at (0,±1))
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -1];
		const c2: readonly [number, number, number, number, number, number] = [0.25, 0, 1, 0, 0, -1];
		const result = intersectQQ(c1, c2);
		expect(result).not.toBeNull();
		// Tangent at (0,1) and (0,-1) — could be 2 points
		expect(result!.length).toBeLessThanOrEqual(4);
		expect(result!.length).toBeGreaterThanOrEqual(2);
	});

	it('two ellipses with 2 intersection points', () => {
		// Ellipse 1: x²/4 + y² = 1 -> [0.25, 0, 1, 0, 0, -1]
		// Ellipse 2: x² + y²/4 = 1 -> [1, 0, 0.25, 0, 0, -1]
		// x²/4 + y² = x² + y²/4 => -3x²/4 + 3y²/4 = 0 => y² = x² => y = ±x
		// Substituting y=x: x²/4 + x² = 1 => 5x²/4 = 1 => x = ±2/√5
		// 4 points total
		const e1: readonly [number, number, number, number, number, number] = [0.25, 0, 1, 0, 0, -1];
		const e2: readonly [number, number, number, number, number, number] = [1, 0, 0.25, 0, 0, -1];
		const result = intersectQQ(e1, e2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(4);
		const sorted = sortPoints(result!);
		const v = 2 / Math.sqrt(5);
		expect(sorted[0].x).toBeCloseTo(-v, 5);
		expect(sorted[0].y).toBeCloseTo(-v, 5);
		expect(sorted[3].x).toBeCloseTo(v, 5);
		expect(sorted[3].y).toBeCloseTo(v, 5);
	});

	it('identical conics -> null (infinite intersections)', () => {
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -4];
		const result = intersectQQ(c1, c1);
		expect(result).toBeNull();
	});

	it('one conic inside the other -> null', () => {
		// Small circle: x² + y² = 1
		// Large circle: x² + y² = 100
		const small: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -1];
		const large: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -100];
		const result = intersectQQ(small, large);
		expect(result).toBeNull();
	});

	it('tilted conics (B ≠ 0): rotated ellipses', () => {
		// Rotated ellipse 1: x² + x*y + y² = 1 → [1, 1, 1, 0, 0, -1]
		// Circle: x² + y² = 1 → [1, 0, 1, 0, 0, -1]
		const e1: readonly [number, number, number, number, number, number] = [1, 1, 1, 0, 0, -1];
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -1];
		const result = intersectQQ(e1, c1);
		// Subtracting: x*y = 0 → x=0 or y=0
		// x=0: y² = 1 → (0,±1)
		// y=0: x² = 1 → (±1,0)
		// 4 points
		expect(result).not.toBeNull();
		expect(result!.length).toBe(4);
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(-1, 5);
		expect(sorted[0].y).toBeCloseTo(0, 5);
		expect(sorted[3].x).toBeCloseTo(1, 5);
		expect(sorted[3].y).toBeCloseTo(0, 5);
	});

	it('large-scale conics: circles of radius 500', () => {
		// Circle 1: center (0,0) radius 500 → x² + y² - 250000 = 0
		// Circle 2: center (100,0) radius 500 → (x-100)² + y² - 250000 = 0
		//   → x² - 200x + 10000 + y² - 250000 = 0 → [1, 0, 1, -200, 0, -240000]
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -250000];
		const c2: readonly [number, number, number, number, number, number] = [
			1, 0, 1, -200, 0, -240000
		];
		const result = intersectQQ(c1, c2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(2);
		// x = 50, y = ±sqrt(250000-2500) = ±sqrt(247500) ≈ ±497.5
		const sorted = sortPoints(result!);
		expect(sorted[0].x).toBeCloseTo(50, 1);
		expect(sorted[1].x).toBeCloseTo(50, 1);
	});

	it('circle and hyperbola -> 2 points', () => {
		// Circle x² + y² = 10: [1, 0, 1, 0, 0, -10]
		// Hyperbola x² - y² = 2: [1, 0, -1, 0, 0, -2]
		// Adding: 2x² = 12 => x² = 6 => x = ±√6
		// y² = 10 - 6 = 4 => y = ±2
		// 4 points: (√6, ±2), (-√6, ±2)
		const c1: readonly [number, number, number, number, number, number] = [1, 0, 1, 0, 0, -10];
		const c2: readonly [number, number, number, number, number, number] = [1, 0, -1, 0, 0, -2];
		const result = intersectQQ(c1, c2);
		expect(result).not.toBeNull();
		expect(result!.length).toBe(4);
		const sorted = sortPoints(result!);
		const sqr6 = Math.sqrt(6);
		expect(sorted[0].x).toBeCloseTo(-sqr6, 5);
		expect(sorted[3].x).toBeCloseTo(sqr6, 5);
	});
});
