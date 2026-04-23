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
		const result = checkPointAt(f, a, 3, 4);
		expect(result.valid).toBe(true);
	});

	it('invalid when point is at wrong position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		const result = checkPointAt(f, a, 5, 6);
		expect(result.valid).toBe(false);
	});

	it('invalid for non-existent point', () => {
		const f = new Figure();
		const result = checkPointAt(f, 'nope', 0, 0);
		expect(result.valid).toBe(false);
	});

	it('valid for midpoint at computed position', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(6, 0));
		const mid = f.createMidpoint(a, b);
		expect(checkPointAt(f, mid, 3, 0).valid).toBe(true);
	});

	it('message is in french', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(3, 4));
		const result = checkPointAt(f, a, 3, 4);
		expect(result.message.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// checkCollinear
// =============================================================================

describe('checkCollinear', () => {
	it('valid for three aligned points', () => {
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
});

// =============================================================================
// checkDistance
// =============================================================================

describe('checkDistance', () => {
	it('valid for correct distance', () => {
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

	it('valid for distance 0 (same point position)', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(5, 5));
		const b = f.createFreePoint(pt(5, 5));
		expect(checkDistance(f, a, b, 0).valid).toBe(true);
	});

	it('valid for irrational distance (sqrt(2))', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 1));
		// distance = sqrt(2), distance² = 2
		expect(checkDistance(f, a, b, Math.SQRT2).valid).toBe(true);
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
		// AB = 3, AC = 3
		expect(checkSameDistance(f, a, b, a, c).valid).toBe(true);
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

	it('invalid for same element (line parallel to itself)', () => {
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

	it('invalid for non-line-like element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkParallel(f, a, seg).valid).toBe(false);
	});
});

// =============================================================================
// checkPerpendicular
// =============================================================================

describe('checkPerpendicular', () => {
	it('valid for perpendicular segments', () => {
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

	it('valid for 60° angle (equilateral triangle vertex)', () => {
		const f = new Figure();
		// A=(2,0), V=(0,0), B=(1, sqrt(3)) => |VA|=2, |VB|=2, cos=0.5 => 60°
		const a = f.createFreePoint(pt(2, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint({ x: exact(number(1)), y: exact(sqrt(number(3))) });
		expect(checkAngle(f, a, v, b, 60).valid).toBe(true);
	});

	it('valid for 180° straight line', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(-1, 0));
		expect(checkAngle(f, a, v, b, 180).valid).toBe(true);
	});

	it('invalid for wrong angle', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(1, 0));
		const v = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(0, 1));
		expect(checkAngle(f, a, v, b, 45).valid).toBe(false);
	});
});

// =============================================================================
// checkPointOnCircle
// =============================================================================

describe('checkPointOnCircle', () => {
	it('valid when point is on circle (byRadius)', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(3, 4)); // distance = 5
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('invalid when point is not on circle', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const p = f.createFreePoint(pt(1, 1)); // distance = sqrt(2)
		const circ = f.createCircleByRadius(center, geoFromNumber(5));
		expect(checkPointOnCircle(f, p, circ).valid).toBe(false);
	});

	it('valid when point is on circle (byPoint)', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const edge = f.createFreePoint(pt(5, 0));
		const circ = f.createCircleByPoint(center, edge);
		// Another point at same distance
		const p = f.createFreePoint(pt(3, 4)); // distance = 5
		expect(checkPointOnCircle(f, p, circ).valid).toBe(true);
	});

	it('the edge point of a circleByPoint is always on the circle', () => {
		const f = new Figure();
		const center = f.createFreePoint(pt(0, 0));
		const edge = f.createFreePoint(pt(3, 4));
		const circ = f.createCircleByPoint(center, edge);
		expect(checkPointOnCircle(f, edge, circ).valid).toBe(true);
	});

	it('invalid for non-circle element', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(5, 0));
		const seg = f.createSegment(a, b);
		expect(checkPointOnCircle(f, a, seg).valid).toBe(false);
	});
});
