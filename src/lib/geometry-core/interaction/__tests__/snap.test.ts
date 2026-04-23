import { describe, it, expect } from 'vitest';
import { snapToGrid, snapToPoint } from '../snap';
import { Construction } from '../../graph/construction';
import { exact, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { number } from '$lib/mathAST';

function pt(x: number, y: number) {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// =============================================================================
// snapToGrid
// =============================================================================

describe('snapToGrid', () => {
	it('snaps to nearest integer with step 1', () => {
		const result = snapToGrid(3.3, 4.7, 1);
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(5);
	});

	it('snaps to nearest half with step 0.5', () => {
		const result = snapToGrid(3.3, 4.7, 0.5);
		expect(geoToNumber(result.x)).toBe(3.5);
		expect(geoToNumber(result.y)).toBe(4.5);
	});

	it('already on grid stays the same', () => {
		const result = snapToGrid(3, 4, 1);
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(4);
	});

	it('snaps negative coordinates', () => {
		const result = snapToGrid(-3.3, -4.7, 1);
		expect(geoToNumber(result.x)).toBe(-3);
		expect(geoToNumber(result.y)).toBe(-5);
	});

	it('snaps to zero', () => {
		const result = snapToGrid(0.3, -0.3, 1);
		expect(geoToNumber(result.x)).toBe(0);
		expect(geoToNumber(result.y)).toBe(0);
	});

	it('result is exact (not numeric)', () => {
		const result = snapToGrid(3.3, 4.7, 1);
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('snaps with grid step 2', () => {
		const result = snapToGrid(3.3, 5.1, 2);
		expect(geoToNumber(result.x)).toBe(4);
		expect(geoToNumber(result.y)).toBe(6);
	});
});

// =============================================================================
// snapToPoint
// =============================================================================

describe('snapToPoint', () => {
	it('snaps to a nearby point', () => {
		const c = new Construction();
		const a = c.createFreePoint(pt(3, 4));
		const result = snapToPoint(c, 3.1, 4.1, 0.5);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(a);
		expect(geoToNumber(result!.position.x)).toBe(3);
		expect(geoToNumber(result!.position.y)).toBe(4);
	});

	it('returns exact position of the snapped point', () => {
		const c = new Construction();
		c.createFreePoint(pt(3, 4));
		const result = snapToPoint(c, 3.1, 4.1, 0.5);
		expect(isExact(result!.position.x)).toBe(true);
		expect(isExact(result!.position.y)).toBe(true);
	});

	it('returns null if no point within threshold', () => {
		const c = new Construction();
		c.createFreePoint(pt(3, 4));
		expect(snapToPoint(c, 10, 10, 0.5)).toBeNull();
	});

	it('returns null on empty construction', () => {
		const c = new Construction();
		expect(snapToPoint(c, 0, 0, 1)).toBeNull();
	});

	it('snaps to midpoint', () => {
		const c = new Construction();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		const mid = c.createMidpoint(a, b);
		const result = snapToPoint(c, 5.1, 0, 0.5);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(mid);
	});

	it('snaps to closest point when multiple in range', () => {
		const c = new Construction();
		c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(2, 0));
		const result = snapToPoint(c, 1.6, 0, 1);
		expect(result!.id).toBe(b);
	});
});
