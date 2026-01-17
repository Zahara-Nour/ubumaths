/**
 * Tests for elbow path calculations
 *
 * Tests path generation for L-shaped (elbow) arrows with 90-degree bends.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateElbowPoint,
	calculateElbowPath,
	getElbowMidpoint,
	isElbowDegenerate
} from './elbow-path';
import type { Point } from '../types/document';

// =============================================================================
// Test Utilities
// =============================================================================

/** Helper to check if two points are approximately equal */
function expectPointClose(actual: Point, expected: Point, tolerance = 0.01) {
	expect(actual.x).toBeCloseTo(expected.x, tolerance);
	expect(actual.y).toBeCloseTo(expected.y, tolerance);
}

// =============================================================================
// calculateElbowPoint Tests
// =============================================================================

describe('calculateElbowPoint', () => {
	it('calculates elbow point for horizontal-first direction', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };

		const elbow = calculateElbowPoint(start, end, 'horizontal-first');

		// Horizontal-first: go to end.x first, then down to end.y
		// Elbow should be at (end.x, start.y)
		expect(elbow.x).toBe(200);
		expect(elbow.y).toBe(100);
	});

	it('calculates elbow point for vertical-first direction', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };

		const elbow = calculateElbowPoint(start, end, 'vertical-first');

		// Vertical-first: go to end.y first, then across to end.x
		// Elbow should be at (start.x, end.y)
		expect(elbow.x).toBe(100);
		expect(elbow.y).toBe(200);
	});

	it('handles negative directions', () => {
		const start: Point = { x: 200, y: 200 };
		const end: Point = { x: 100, y: 100 };

		const elbowH = calculateElbowPoint(start, end, 'horizontal-first');
		expect(elbowH.x).toBe(100);
		expect(elbowH.y).toBe(200);

		const elbowV = calculateElbowPoint(start, end, 'vertical-first');
		expect(elbowV.x).toBe(200);
		expect(elbowV.y).toBe(100);
	});
});

// =============================================================================
// calculateElbowPath Tests
// =============================================================================

describe('calculateElbowPath', () => {
	it('generates correct SVG path for horizontal-first', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };

		const result = calculateElbowPath(start, end, 'horizontal-first');

		// Path should be: M 100 100 L 200 100 L 200 200
		expect(result.path).toBe('M 100 100 L 200 100 L 200 200');
		expectPointClose(result.elbowPoint, { x: 200, y: 100 });
	});

	it('generates correct SVG path for vertical-first', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };

		const result = calculateElbowPath(start, end, 'vertical-first');

		// Path should be: M 100 100 L 100 200 L 200 200
		expect(result.path).toBe('M 100 100 L 100 200 L 200 200');
		expectPointClose(result.elbowPoint, { x: 100, y: 200 });
	});

	it('calculates correct total length', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 50 };

		const result = calculateElbowPath(start, end, 'horizontal-first');

		// Horizontal segment: 100px, Vertical segment: 50px
		expect(result.totalLength).toBe(150);
	});

	it('calculates midpoint on first segment when longer', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 200, y: 50 };

		const result = calculateElbowPath(start, end, 'horizontal-first');

		// Total: 250px, Half: 125px
		// First segment (horizontal): 200px - midpoint is at 125px on this segment
		// Midpoint should be at (125, 0)
		expectPointClose(result.midpoint, { x: 125, y: 0 });
		expect(result.midpointAngle).toBe(0); // Horizontal
	});

	it('calculates midpoint on second segment when first is shorter', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 50, y: 200 };

		const result = calculateElbowPath(start, end, 'horizontal-first');

		// Total: 250px, Half: 125px
		// First segment (horizontal): 50px
		// Remaining on second segment: 75px
		// Second segment is vertical from (50, 0) to (50, 200)
		// Midpoint should be at (50, 75)
		expectPointClose(result.midpoint, { x: 50, y: 75 });
		expect(result.midpointAngle).toBe(90); // Vertical downward
	});

	it('handles zero-length path gracefully', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 100, y: 100 };

		const result = calculateElbowPath(start, end, 'horizontal-first');

		expect(result.totalLength).toBe(0);
		expectPointClose(result.midpoint, start);
		expect(result.midpointAngle).toBe(0);
	});
});

// =============================================================================
// getElbowMidpoint Tests
// =============================================================================

describe('getElbowMidpoint', () => {
	it('returns correct midpoint for horizontal-first', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };

		const result = getElbowMidpoint(start, end, 'horizontal-first');

		// Total: 200px, Half: 100px = exactly at end of first segment
		// Should be at elbow point
		expectPointClose(result.point, { x: 100, y: 0 });
	});

	it('returns correct midpoint for vertical-first', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };

		const result = getElbowMidpoint(start, end, 'vertical-first');

		// Total: 200px, Half: 100px = exactly at end of first segment
		// Should be at elbow point
		expectPointClose(result.point, { x: 0, y: 100 });
	});

	it('returns correct angle for vertical segment going down', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 50, y: 200 };

		const result = getElbowMidpoint(start, end, 'horizontal-first');

		// Midpoint is on the vertical segment going down
		expect(result.angle).toBe(90);
	});

	it('returns correct angle for vertical segment going up', () => {
		const start: Point = { x: 0, y: 200 };
		const end: Point = { x: 50, y: 0 };

		const result = getElbowMidpoint(start, end, 'horizontal-first');

		// Midpoint is on the vertical segment going up
		expect(result.angle).toBe(-90);
	});
});

// =============================================================================
// isElbowDegenerate Tests
// =============================================================================

describe('isElbowDegenerate', () => {
	it('returns true when start and end have same X', () => {
		const start: Point = { x: 100, y: 0 };
		const end: Point = { x: 100, y: 200 };

		expect(isElbowDegenerate(start, end, 'horizontal-first')).toBe(true);
		expect(isElbowDegenerate(start, end, 'vertical-first')).toBe(true);
	});

	it('returns true when start and end have same Y', () => {
		const start: Point = { x: 0, y: 100 };
		const end: Point = { x: 200, y: 100 };

		expect(isElbowDegenerate(start, end, 'horizontal-first')).toBe(true);
		expect(isElbowDegenerate(start, end, 'vertical-first')).toBe(true);
	});

	it('returns false when start and end differ in both X and Y', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };

		expect(isElbowDegenerate(start, end, 'horizontal-first')).toBe(false);
		expect(isElbowDegenerate(start, end, 'vertical-first')).toBe(false);
	});
});
