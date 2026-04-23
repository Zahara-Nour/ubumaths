import { describe, it, expect } from 'vitest';
import { Construction } from '../construction';
import { exact, numeric, isExact, isNumeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { number, sqrt } from '$lib/mathAST';

function point(x: number, y: number) {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// =============================================================================
// Creation
// =============================================================================

describe('createFreePoint', () => {
	it('creates a point and registers it', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(3, 4));
		expect(c.getElementById(id)).toBeDefined();
		expect(c.getElementById(id)!.type).toBe('freePoint');
		expect(c.size).toBe(1);
	});

	it('generates unique ids', () => {
		const c = new Construction();
		const id1 = c.createFreePoint(point(0, 0));
		const id2 = c.createFreePoint(point(1, 1));
		expect(id1).not.toBe(id2);
	});

	it('stores the position as GeoPoint', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(3, 4));
		const pos = c.getPosition(id);
		expect(pos).not.toBeNull();
		expect(geoToNumber(pos!.x)).toBe(3);
		expect(geoToNumber(pos!.y)).toBe(4);
	});

	it('supports exact values (sqrt, fractions)', () => {
		const c = new Construction();
		const id = c.createFreePoint({
			x: exact(sqrt(number(2))),
			y: geoFromFraction(1, 3)
		});
		const pos = c.getPosition(id);
		expect(pos).not.toBeNull();
		expect(isExact(pos!.x)).toBe(true);
		expect(isExact(pos!.y)).toBe(true);
	});
});

describe('createSegment', () => {
	it('creates a segment between two points', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(3, 4));
		const seg = c.createSegment(a, b);
		expect(c.getElementById(seg)).toBeDefined();
		expect(c.getElementById(seg)!.type).toBe('segment');
		expect(c.size).toBe(3);
	});

	it('throws if parent does not exist', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		expect(() => c.createSegment(a, 'nonexistent')).toThrow();
	});
});

describe('createMidpoint', () => {
	it('creates a midpoint of two points', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(6, 8));
		const mid = c.createMidpoint(a, b);
		expect(c.getElementById(mid)).toBeDefined();
		expect(c.getElementById(mid)!.type).toBe('midpoint');
	});

	it('computes the correct position (exact)', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(6, 8));
		const mid = c.createMidpoint(a, b);
		const pos = c.getPosition(mid);
		expect(pos).not.toBeNull();
		expect(geoToNumber(pos!.x)).toBe(3);
		expect(geoToNumber(pos!.y)).toBe(4);
	});

	it('midpoint of exact values is exact', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(1, 0));
		const b = c.createFreePoint(point(0, 1));
		const mid = c.createMidpoint(a, b);
		const pos = c.getPosition(mid);
		expect(isExact(pos!.x)).toBe(true);
		expect(isExact(pos!.y)).toBe(true);
		expect(geoEqual(pos!.x, geoFromFraction(1, 2))).toBe(true);
		expect(geoEqual(pos!.y, geoFromFraction(1, 2))).toBe(true);
	});
});

describe('createLine / createRay', () => {
	it('creates a line through two points', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const id = c.createLine(a, b);
		expect(c.getElementById(id)!.type).toBe('line');
	});

	it('creates a ray from origin through point', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const id = c.createRay(a, b);
		expect(c.getElementById(id)!.type).toBe('ray');
	});
});

describe('createCircleByRadius / createCircleByPoint', () => {
	it('creates a circle with fixed radius', () => {
		const c = new Construction();
		const center = c.createFreePoint(point(0, 0));
		const id = c.createCircleByRadius(center, geoFromNumber(5));
		expect(c.getElementById(id)!.type).toBe('circleByRadius');
	});

	it('creates a circle through a point', () => {
		const c = new Construction();
		const center = c.createFreePoint(point(0, 0));
		const edge = c.createFreePoint(point(3, 4));
		const id = c.createCircleByPoint(center, edge);
		expect(c.getElementById(id)!.type).toBe('circleByPoint');
	});
});

// =============================================================================
// Access
// =============================================================================

describe('element access', () => {
	it('getElementById returns undefined for unknown id', () => {
		const c = new Construction();
		expect(c.getElementById('nope')).toBeUndefined();
	});

	it('getAllElements returns all elements', () => {
		const c = new Construction();
		c.createFreePoint(point(0, 0));
		c.createFreePoint(point(1, 1));
		expect(c.getAllElements().length).toBe(2);
	});

	it('getElementsByType filters correctly', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		c.createSegment(a, b);
		c.createMidpoint(a, b);
		expect(c.getElementsByType('freePoint').length).toBe(2);
		expect(c.getElementsByType('segment').length).toBe(1);
		expect(c.getElementsByType('midpoint').length).toBe(1);
		expect(c.getElementsByType('line').length).toBe(0);
	});

	it('size is correct', () => {
		const c = new Construction();
		expect(c.size).toBe(0);
		const a = c.createFreePoint(point(0, 0));
		expect(c.size).toBe(1);
		const b = c.createFreePoint(point(1, 1));
		c.createSegment(a, b);
		expect(c.size).toBe(3);
	});
});

// =============================================================================
// getPosition
// =============================================================================

describe('getPosition', () => {
	it('returns position of free point', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(7, 11));
		const pos = c.getPosition(id);
		expect(pos).not.toBeNull();
		expect(geoToNumber(pos!.x)).toBe(7);
		expect(geoToNumber(pos!.y)).toBe(11);
	});

	it('returns position of midpoint', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(10, 20));
		const mid = c.createMidpoint(a, b);
		const pos = c.getPosition(mid);
		expect(geoToNumber(pos!.x)).toBe(5);
		expect(geoToNumber(pos!.y)).toBe(10);
	});

	it('returns null for non-point elements', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const seg = c.createSegment(a, b);
		expect(c.getPosition(seg)).toBeNull();
	});

	it('returns null for unknown id', () => {
		const c = new Construction();
		expect(c.getPosition('nope')).toBeNull();
	});
});

// =============================================================================
// movePoint
// =============================================================================

describe('movePoint', () => {
	it('updates position of a free point', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(0, 0));
		c.movePoint(id, numeric(5), numeric(10));
		const pos = c.getPosition(id);
		expect(geoToNumber(pos!.x)).toBe(5);
		expect(geoToNumber(pos!.y)).toBe(10);
	});

	it('moved point becomes numeric', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(0, 0));
		c.movePoint(id, numeric(5), numeric(10));
		const pos = c.getPosition(id);
		expect(isNumeric(pos!.x)).toBe(true);
		expect(isNumeric(pos!.y)).toBe(true);
	});

	it('can move to exact values (snap)', () => {
		const c = new Construction();
		const id = c.createFreePoint(point(0, 0));
		c.movePoint(id, exact(number(3)), exact(number(4)));
		const pos = c.getPosition(id);
		expect(isExact(pos!.x)).toBe(true);
	});

	it('throws on non-free-point', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const seg = c.createSegment(a, b);
		expect(() => c.movePoint(seg, numeric(0), numeric(0))).toThrow();
	});

	it('throws on unknown id', () => {
		const c = new Construction();
		expect(() => c.movePoint('nope', numeric(0), numeric(0))).toThrow();
	});
});

// =============================================================================
// recompute
// =============================================================================

describe('recompute', () => {
	it('midpoint updates when parent moves', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(10, 0));
		const mid = c.createMidpoint(a, b);

		// Initially midpoint is (5, 0)
		expect(geoToNumber(c.getPosition(mid)!.x)).toBe(5);

		// Move A to (10, 0), midpoint should become (10, 0)
		c.movePoint(a, numeric(10), numeric(0));
		c.recompute();
		expect(geoToNumber(c.getPosition(mid)!.x)).toBe(10);
	});

	it('midpoint of numeric parents is numeric', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(10, 0));
		const mid = c.createMidpoint(a, b);

		c.movePoint(a, numeric(2), numeric(4));
		c.recompute();
		const pos = c.getPosition(mid)!;
		expect(isNumeric(pos.x)).toBe(true);
		expect(isNumeric(pos.y)).toBe(true);
	});

	it('chain: A -> mid(A,B) recalculates on A move', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(0, 10));
		const mid = c.createMidpoint(a, b);

		c.movePoint(a, numeric(0), numeric(20));
		c.recompute();
		// mid of (0,20) and (0,10) = (0, 15)
		expect(geoToNumber(c.getPosition(mid)!.y)).toBe(15);
	});

	it('does nothing if no dirty elements', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(3, 4));
		const b = c.createFreePoint(point(6, 8));
		c.createMidpoint(a, b);
		// No move, no dirty
		c.recompute();
		expect(geoToNumber(c.getPosition(a)!.x)).toBe(3);
	});
});

// =============================================================================
// Remove
// =============================================================================

describe('remove', () => {
	it('removes a single element', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const removed = c.remove(a);
		expect(removed).toContain(a);
		expect(c.size).toBe(0);
	});

	it('cascade removes dependants', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(1, 1));
		const seg = c.createSegment(a, b);
		const mid = c.createMidpoint(a, b);
		const removed = c.remove(a);
		expect(removed).toContain(a);
		expect(removed).toContain(seg);
		expect(removed).toContain(mid);
		expect(c.size).toBe(1); // only B remains
	});

	it('throws on unknown id', () => {
		const c = new Construction();
		expect(() => c.remove('nope')).toThrow();
	});
});

// =============================================================================
// Integration: full construction scenario
// =============================================================================

describe('integration', () => {
	it('triangle with midpoints', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(6, 0));
		const cc = c.createFreePoint(point(3, 6));

		c.createSegment(a, b);
		c.createSegment(b, cc);
		c.createSegment(cc, a);

		const mAB = c.createMidpoint(a, b);
		const mBC = c.createMidpoint(b, cc);

		expect(geoToNumber(c.getPosition(mAB)!.x)).toBe(3);
		expect(geoToNumber(c.getPosition(mAB)!.y)).toBe(0);
		expect(geoToNumber(c.getPosition(mBC)!.x)).toBeCloseTo(4.5, 10);
		expect(geoToNumber(c.getPosition(mBC)!.y)).toBe(3);

		// Move vertex A, midpoints update
		c.movePoint(a, numeric(2), numeric(2));
		c.recompute();
		// mAB = mid of (2,2) and (6,0) = (4, 1)
		expect(geoToNumber(c.getPosition(mAB)!.x)).toBe(4);
		expect(geoToNumber(c.getPosition(mAB)!.y)).toBe(1);

		expect(c.size).toBe(8); // 3 points + 3 segments + 2 midpoints
	});

	it('remove point cascades through midpoint', () => {
		const c = new Construction();
		const a = c.createFreePoint(point(0, 0));
		const b = c.createFreePoint(point(10, 0));
		const mid = c.createMidpoint(a, b);
		c.createSegment(a, mid);

		c.remove(a);
		// A, mid (depends on A), seg (depends on A and mid) all removed
		expect(c.size).toBe(1); // only B
		expect(c.getElementById(b)).toBeDefined();
	});
});
