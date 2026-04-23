import { describe, it, expect } from 'vitest';
import { findPointNear, findElementNear } from '../hit-testing';
import { Figure } from '../../graph/figure';
import { exact } from '../../types/geo-value';
import { number } from '$lib/mathAST';

function pt(x: number, y: number) {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// =============================================================================
// findPointNear
// =============================================================================

describe('findPointNear', () => {
	it('finds a point within threshold', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(3, 4));
		expect(findPointNear(c, 3, 4, 1)).toBe(a);
	});

	it('finds a point near but not exactly on it', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(3, 4));
		expect(findPointNear(c, 3.5, 4, 1)).toBe(a);
	});

	it('returns null if no point within threshold', () => {
		const c = new Figure();
		c.createFreePoint(pt(3, 4));
		expect(findPointNear(c, 10, 10, 1)).toBeNull();
	});

	it('returns null on empty construction', () => {
		const c = new Figure();
		expect(findPointNear(c, 0, 0, 1)).toBeNull();
	});

	it('returns the closest point when multiple are in range', () => {
		const c = new Figure();
		c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(1, 0));
		// Cursor at (0.8, 0) — closer to B
		expect(findPointNear(c, 0.8, 0, 1.5)).toBe(b);
	});

	it('finds midpoints too', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		const mid = c.createMidpoint(a, b);
		// Midpoint at (5, 0)
		expect(findPointNear(c, 5, 0, 1)).toBe(mid);
	});

	it('point exactly on threshold boundary is included', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		// Distance exactly 1
		expect(findPointNear(c, 1, 0, 1)).toBe(a);
	});

	it('point just outside threshold is excluded', () => {
		const c = new Figure();
		c.createFreePoint(pt(0, 0));
		expect(findPointNear(c, 1.01, 0, 1)).toBeNull();
	});

	it('ignores non-point elements (segments, circles)', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		c.createSegment(a, b);
		// Segment midpoint area (5, 0) — should not find the segment, only free points
		expect(findPointNear(c, 5, 0, 1)).toBeNull();
	});
});

// =============================================================================
// findElementNear (any element type)
// =============================================================================

describe('findElementNear', () => {
	it('finds a point', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(3, 4));
		expect(findElementNear(c, 3, 4, 1)).toBe(a);
	});

	it('returns null on empty construction', () => {
		const c = new Figure();
		expect(findElementNear(c, 0, 0, 1)).toBeNull();
	});

	it('prefers points over segments when both are near', () => {
		const c = new Figure();
		const a = c.createFreePoint(pt(0, 0));
		const b = c.createFreePoint(pt(10, 0));
		c.createSegment(a, b);
		// Near point A
		expect(findElementNear(c, 0.1, 0, 1)).toBe(a);
	});
});
