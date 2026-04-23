import { describe, it, expect } from 'vitest';
import {
	checkPointAt,
	checkCollinear,
	checkDistance,
	checkSameDistance,
	checkParallel,
	checkPerpendicular,
	checkAngle,
	checkPointOnCircle
} from '../checks';
import { Figure } from '../../graph/figure';
import { exact } from '../../types/geo-value';
import { geoFromNumber } from '../../compute/geo-arithmetic';
import { number, sqrt } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// =============================================================================
// checkPointAt
// =============================================================================

describe('checkPointAt', () => {
	it('valid when point is at exact position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		expect(checkPointAt(f, a, 3, 4).valid).toBe(true);
	});

	it('invalid when point is at wrong position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		expect(checkPointAt(f, a, 5, 6).valid).toBe(false);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		expect(checkPointAt(f, 'nope', 0, 0).valid).toBe(false);
	});

	it('valid for midpoint at computed position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(6, 0));
		const mid = f.createMidpoint(a, b);
		expect(checkPointAt(f, mid, 3, 0).valid).toBe(true);
	});

	it('valid at origin', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(checkPointAt(f, a, 0, 0).valid).toBe(true);
	});

	it('valid for negative coordinates', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-7, -3));
		expect(checkPointAt(f, a, -7, -3).valid).toBe(true);
	});

	it('invalid when only x is wrong', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		expect(checkPointAt(f, a, 999, 4).valid).toBe(false);
	});

	it('invalid when only y is wrong', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		expect(checkPointAt(f, a, 3, 999).valid).toBe(false);
	});

	it('valid for intersection point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(-5, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, -5));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		const inter = f.createIntersectionLL(seg1, seg2);
		expect(checkPointAt(f, inter, 0, 0).valid).toBe(true);
	});

	it('message contains expected position on failure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const result = checkPointAt(f, a, 5, 7);
		expect(result.message).toContain('5');
		expect(result.message).toContain('7');
	});
});

// =============================================================================
// checkCollinear
// =============================================================================

describe('checkCollinear', () => {
	it('valid for three aligned points on diagonal', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(3, 3));
		expect(checkCollinear(f, a, b, c).valid).toBe(true);
	});

	it('invalid for non-aligned points', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(1, 0));
		expect(checkCollinear(f, a, b, c).valid).toBe(false);
	});

	it('valid for horizontal line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 5));
		const b = f.createFreePoint(pt(3, 5));
		const c = f.createFreePoint(pt(7, 5));
		expect(checkCollinear(f, a, b, c).valid).toBe(true);
	});

	it('valid for vertical line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(2, 0));
		const b = f.createFreePoint(pt(2, 3));
		const c = f.createFreePoint(pt(2, 7));
		expect(checkCollinear(f, a, b, c).valid).toBe(true);
	});

	it('valid for midpoint on segment', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(6, 8));
		const mid = f.createMidpoint(a, b);
		expect(checkCollinear(f, a, mid, b).valid).toBe(true);
	});

	it('valid regardless of point order', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 2));
		const c = f.createFreePoint(pt(4, 4));
		expect(checkCollinear(f, c, a, b).valid).toBe(true);
		expect(checkCollinear(f, b, c, a).valid).toBe(true);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		expect(checkCollinear(f, a, b, 'nope').valid).toBe(false);
	});

	it('valid when two points are the same position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 3));
		const b = f.createFreePoint(pt(3, 3));
		const c = f.createFreePoint(pt(5, 5));
		expect(checkCollinear(f, a, b, c).valid).toBe(true);
	});

	it('valid when all three points coincide', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 1));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(1, 1));
		expect(checkCollinear(f, a, b, c).valid).toBe(true);
	});
});

// =============================================================================
// checkDistance
// =============================================================================

describe('checkDistance', () => {
	it('valid for correct distance (3-4-5 triangle)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		expect(checkDistance(f, a, b, 5).valid).toBe(true);
	});

	it('invalid for wrong distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		expect(checkDistance(f, a, b, 6).valid).toBe(false);
	});

	it('valid for distance 0 (same position)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(5, 5));
		const b = f.createFreePoint(pt(5, 5));
		expect(checkDistance(f, a, b, 0).valid).toBe(true);
	});

	it('valid for irrational distance (sqrt(2))', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		expect(checkDistance(f, a, b, Math.SQRT2).valid).toBe(true);
	});

	it('valid for horizontal distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(7, 0));
		expect(checkDistance(f, a, b, 7).valid).toBe(true);
	});

	it('valid for vertical distance', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 11));
		expect(checkDistance(f, a, b, 11).valid).toBe(true);
	});

	it('symmetric: distance(A,B) = distance(B,A)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		expect(checkDistance(f, a, b, 5).valid).toBe(true);
		expect(checkDistance(f, b, a, 5).valid).toBe(true);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		expect(checkDistance(f, a, 'nope', 5).valid).toBe(false);
	});

	it('message contains actual distance on failure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const result = checkDistance(f, a, b, 10);
		expect(result.message).toContain('5');
	});
});

// =============================================================================
// checkSameDistance
// =============================================================================

describe('checkSameDistance', () => {
	it('valid when AB = CD', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const c = f.createFreePoint(pt(10, 10));
		const d = f.createFreePoint(pt(13, 14));
		expect(checkSameDistance(f, a, b, c, d).valid).toBe(true);
	});

	it('invalid when AB != CD', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 4));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(1, 0));
		expect(checkSameDistance(f, a, b, c, d).valid).toBe(false);
	});

	it('valid for isosceles triangle (AB = AC)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const c = f.createFreePoint(pt(0, 3));
		expect(checkSameDistance(f, a, b, a, c).valid).toBe(true);
	});

	it('valid for equilateral triangle sides', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(4, 0));
		const c = f.createFreePoint({ x: exact(number(2)), y: exact(sqrt(number(12))) });
		expect(checkSameDistance(f, a, b, b, c).valid).toBe(true);
		expect(checkSameDistance(f, a, b, a, c).valid).toBe(true);
	});

	it('valid for zero distances (same position)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(5, 5));
		const b = f.createFreePoint(pt(5, 5));
		const c = f.createFreePoint(pt(3, 3));
		const d = f.createFreePoint(pt(3, 3));
		expect(checkSameDistance(f, a, b, c, d).valid).toBe(true);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(checkSameDistance(f, a, b, a, 'nope').valid).toBe(false);
	});
});

// =============================================================================
// checkParallel
// =============================================================================

describe('checkParallel', () => {
	it('valid for parallel horizontal segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 3));
		const d = f.createFreePoint(pt(5, 3));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkParallel(f, seg1, seg2).valid).toBe(true);
	});

	it('valid for parallel vertical segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 5));
		const c = f.createFreePoint(pt(3, 0));
		const d = f.createFreePoint(pt(3, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkParallel(f, seg1, seg2).valid).toBe(true);
	});

	it('valid for parallel diagonal segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 2));
		const c = f.createFreePoint(pt(5, 0));
		const d = f.createFreePoint(pt(6, 2));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkParallel(f, seg1, seg2).valid).toBe(true);
	});

	it('invalid for same element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkParallel(f, seg, seg).valid).toBe(false);
	});

	it('invalid for non-parallel segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkParallel(f, seg1, seg2).valid).toBe(false);
	});

	it('valid for parallel lines', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(0, 1));
		const d = f.createFreePoint(pt(1, 2));
		const line1 = f.createLine(a, b);
		const line2 = f.createLine(c, d);
		expect(checkParallel(f, line1, line2).valid).toBe(true);
	});

	it('valid for parallel rays', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const c = f.createFreePoint(pt(0, 5));
		const d = f.createFreePoint(pt(3, 5));
		const ray1 = f.createRay(a, b);
		const ray2 = f.createRay(c, d);
		expect(checkParallel(f, ray1, ray2).valid).toBe(true);
	});

	it('valid for mixed: segment parallel to line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 3));
		const d = f.createFreePoint(pt(5, 3));
		const seg = f.createSegment(a, b);
		const line = f.createLine(c, d);
		expect(checkParallel(f, seg, line).valid).toBe(true);
	});

	it('invalid for non-line-like element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkParallel(f, a, seg).valid).toBe(false);
	});

	it('invalid for non-existent element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkParallel(f, seg, 'nope').valid).toBe(false);
	});
});

// =============================================================================
// checkPerpendicular
// =============================================================================

describe('checkPerpendicular', () => {
	it('valid for perpendicular axis-aligned segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(0, 5));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkPerpendicular(f, seg1, seg2).valid).toBe(true);
	});

	it('invalid for non-perpendicular segments', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(1, 1));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkPerpendicular(f, seg1, seg2).valid).toBe(false);
	});

	it('valid for perpendicular diagonal lines', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(1, -1));
		const line1 = f.createLine(a, b);
		const line2 = f.createLine(c, d);
		expect(checkPerpendicular(f, line1, line2).valid).toBe(true);
	});

	it('valid for perpendicular rays', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(3, 0));
		const c = f.createFreePoint(pt(0, 0));
		const d = f.createFreePoint(pt(0, 3));
		const ray1 = f.createRay(a, b);
		const ray2 = f.createRay(c, d);
		expect(checkPerpendicular(f, ray1, ray2).valid).toBe(true);
	});

	it('invalid for parallel segments (not perpendicular)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const c = f.createFreePoint(pt(0, 3));
		const d = f.createFreePoint(pt(5, 3));
		const seg1 = f.createSegment(a, b);
		const seg2 = f.createSegment(c, d);
		expect(checkPerpendicular(f, seg1, seg2).valid).toBe(false);
	});

	it('invalid for non-line-like element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkPerpendicular(f, a, seg).valid).toBe(false);
	});
});

// =============================================================================
// checkAngle
// =============================================================================

describe('checkAngle', () => {
	it('valid for 90° right angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(checkAngle(f, a, v, b, 90).valid).toBe(true);
	});

	it('valid for 60° angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(2, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint({ x: exact(number(1)), y: exact(sqrt(number(3))) });
		expect(checkAngle(f, a, v, b, 60).valid).toBe(true);
	});

	it('valid for 45° angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		expect(checkAngle(f, a, v, b, 45).valid).toBe(true);
	});

	it('valid for 180° straight line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(-1, 0));
		expect(checkAngle(f, a, v, b, 180).valid).toBe(true);
	});

	it('valid for 0° (same direction)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(2, 0));
		expect(checkAngle(f, a, v, b, 0).valid).toBe(true);
	});

	it('invalid for wrong angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(checkAngle(f, a, v, b, 45).valid).toBe(false);
	});

	it('invalid for coincident points (undefined angle)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(checkAngle(f, a, v, b, 90).valid).toBe(false);
	});

	it('symmetric: angle(A,V,B) = angle(B,V,A)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(checkAngle(f, a, v, b, 90).valid).toBe(true);
		expect(checkAngle(f, b, v, a, 90).valid).toBe(true);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		expect(checkAngle(f, a, v, 'nope', 90).valid).toBe(false);
	});

	it('message contains actual angle on failure', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		const result = checkAngle(f, a, v, b, 45);
		expect(result.message).toContain('90');
	});

	it('valid with non-origin vertex', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(6, 5));
		const v = f.createFreePoint(pt(5, 5));
		const b = f.createFreePoint(pt(5, 6));
		expect(checkAngle(f, a, v, b, 90).valid).toBe(true);
	});
});

// =============================================================================
// checkPointOnCircle
// =============================================================================

describe('checkPointOnCircle', () => {
	it('valid when point is on circle (byRadius)', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(3, 4));
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('invalid when point is not on circle', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(1, 1));
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(false);
	});

	it('valid when point is on circle (byPoint)', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const edge = f.createFreePoint(pt(5, 0));
		const circ = f.createCircleByPoint(center, edge);
		const p = f.createFreePoint(pt(3, 4));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('the edge point of a circleByPoint is always on the circle', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const edge = f.createFreePoint(pt(3, 4));
		const circ = f.createCircleByPoint(center, edge);
		expect(checkPointOnCircle(f, edge, circ).valid).toBe(true);
	});

	it('center is on circle only if radius is 0', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, center, circ).valid).toBe(false);

		const circ0 = f.createCircleByRadius(center, geoFromNumber(0));
		expect(checkPointOnCircle(f, center, circ0).valid).toBe(true);
	});

	it('valid for point on off-center circle', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(3, 4));
		const p = f.createFreePoint(pt(6, 8));
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('valid with exact irrational radius', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const edge = f.createFreePoint(pt(1, 1)); // radius = sqrt(2)
		const circ = f.createCircleByPoint(center, edge);
		const p = f.createFreePoint({ x: exact(sqrt(number(2))), y: exact(number(0)) });
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('invalid for non-circle element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkPointOnCircle(f, a, seg).valid).toBe(false);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, 'nope', circ).valid).toBe(false);
	});

	it('invalid for non-existent circle', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		expect(checkPointOnCircle(f, p, 'nope').valid).toBe(false);
	});
});
