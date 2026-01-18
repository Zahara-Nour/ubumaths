/**
 * Tests for curved path calculations
 *
 * Tests path generation for curved arrows using Catmull-Rom splines
 * converted to cubic Bezier curves.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateCurvedPath,
	getPointOnCurvedPath,
	getAngleOnCurvedPath,
	hitTestCurvedPath,
	closestPointOnBezierSegment
} from './curved-path';
import type { Point, ArrowWaypoint } from '../types/document';

// =============================================================================
// Test Utilities
// =============================================================================

/** Helper to check if two points are approximately equal */
function expectPointClose(actual: Point, expected: Point, _tolerance = 1) {
	expect(actual.x).toBeCloseTo(expected.x, 0);
	expect(actual.y).toBeCloseTo(expected.y, 0);
}

/** Helper to create a waypoint */
function createWaypoint(x: number, y: number, id?: string): ArrowWaypoint {
	return {
		id: id ?? crypto.randomUUID(),
		position: { x, y }
	};
}

// =============================================================================
// calculateCurvedPath Tests
// =============================================================================

describe('calculateCurvedPath', () => {
	it('returns empty path for degenerate case (< 2 points)', () => {
		const start: Point = { x: 100, y: 100 };

		// This should not happen in practice, but test defensive behavior
		const result = calculateCurvedPath(start, start, []);

		expect(result.path).toContain('M');
		expect(result.totalLength).toBe(0);
	});

	it('generates straight line path for 2 points (no waypoints)', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };

		const result = calculateCurvedPath(start, end, []);

		// Should be a straight line
		expect(result.path).toBe('M 0 0 L 100 0');
		expect(result.totalLength).toBe(100);
		expectPointClose(result.midpoint, { x: 50, y: 0 });
		expect(result.midpointAngle).toBeCloseTo(0, 1);
	});

	it('generates curved path with one waypoint', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const waypoints = [createWaypoint(50, 50)];

		const result = calculateCurvedPath(start, end, waypoints);

		// Should be a Bezier curve
		expect(result.path).toMatch(/^M 0 0 C/);
		expect(result.path).toContain('C');
		// Path should have 2 segments (start->waypoint, waypoint->end)
		expect(result.segmentMidpoints.length).toBe(2);
		expect(result.totalLength).toBeGreaterThan(100); // Curved path is longer than straight
	});

	it('generates curved path with multiple waypoints', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 200, y: 0 };
		const waypoints = [createWaypoint(50, 50), createWaypoint(100, -50), createWaypoint(150, 25)];

		const result = calculateCurvedPath(start, end, waypoints);

		// Should have 4 segments (between 5 points)
		expect(result.segmentMidpoints.length).toBe(4);
		expect(result.totalLength).toBeGreaterThan(200);
	});

	it('calculates midpoint at curve center', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };
		const waypoints = [createWaypoint(50, 0)];

		const result = calculateCurvedPath(start, end, waypoints);

		// Midpoint should be somewhere along the curve, not necessarily at waypoint
		expect(result.midpoint.x).toBeGreaterThan(0);
		expect(result.midpoint.x).toBeLessThan(100);
	});

	it('handles diagonal path correctly', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };

		const result = calculateCurvedPath(start, end, []);

		// Diagonal line length should be sqrt(2) * 100 ≈ 141.42
		expect(result.totalLength).toBeCloseTo(141.42, 0);
		// Angle should be 45 degrees
		expect(result.midpointAngle).toBeCloseTo(45, 0);
	});

	it('calculates correct segment midpoints for add-waypoint UI', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 200, y: 0 };
		const waypoints = [createWaypoint(100, 50)];

		const result = calculateCurvedPath(start, end, waypoints);

		// Should have 2 segment midpoints
		expect(result.segmentMidpoints.length).toBe(2);

		// First segment midpoint should be roughly between start and waypoint
		const mid1 = result.segmentMidpoints[0];
		expect(mid1.x).toBeGreaterThan(0);
		expect(mid1.x).toBeLessThan(100);

		// Second segment midpoint should be roughly between waypoint and end
		const mid2 = result.segmentMidpoints[1];
		expect(mid2.x).toBeGreaterThan(100);
		expect(mid2.x).toBeLessThan(200);
	});
});

// =============================================================================
// getPointOnCurvedPath Tests
// =============================================================================

describe('getPointOnCurvedPath', () => {
	it('returns start point at ratio 0', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };
		const waypoints = [createWaypoint(50, 0)];

		const point = getPointOnCurvedPath(start, end, waypoints, 0);

		expectPointClose(point, start);
	});

	it('returns end point at ratio 1', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };
		const waypoints = [createWaypoint(50, 0)];

		const point = getPointOnCurvedPath(start, end, waypoints, 1);

		expectPointClose(point, end);
	});

	it('returns midpoint at ratio 0.5 for straight line', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };

		const point = getPointOnCurvedPath(start, end, [], 0.5);

		expectPointClose(point, { x: 50, y: 0 });
	});

	it('returns point on curve at ratio 0.5 for curved path', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const waypoints = [createWaypoint(50, 50)];

		const point = getPointOnCurvedPath(start, end, waypoints, 0.5);

		// Should be somewhere on the curve
		expect(point.x).toBeGreaterThan(0);
		expect(point.x).toBeLessThan(100);
	});
});

// =============================================================================
// getAngleOnCurvedPath Tests
// =============================================================================

describe('getAngleOnCurvedPath', () => {
	it('returns 0 degrees for horizontal line going right', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };

		const angle = getAngleOnCurvedPath(start, end, [], 0.5);

		expect(angle).toBeCloseTo(0, 1);
	});

	it('returns 180/-180 degrees for horizontal line going left', () => {
		const start: Point = { x: 100, y: 0 };
		const end: Point = { x: 0, y: 0 };

		const angle = getAngleOnCurvedPath(start, end, [], 0.5);

		expect(Math.abs(angle)).toBeCloseTo(180, 1);
	});

	it('returns 90 degrees for vertical line going down', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 0, y: 100 };

		const angle = getAngleOnCurvedPath(start, end, [], 0.5);

		expect(angle).toBeCloseTo(90, 1);
	});

	it('returns -90 degrees for vertical line going up', () => {
		const start: Point = { x: 0, y: 100 };
		const end: Point = { x: 0, y: 0 };

		const angle = getAngleOnCurvedPath(start, end, [], 0.5);

		expect(angle).toBeCloseTo(-90, 1);
	});

	it('returns 45 degrees for diagonal line', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };

		const angle = getAngleOnCurvedPath(start, end, [], 0.5);

		expect(angle).toBeCloseTo(45, 1);
	});
});

// =============================================================================
// hitTestCurvedPath Tests
// =============================================================================

describe('hitTestCurvedPath', () => {
	it('returns true for point on straight line', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const testPoint: Point = { x: 50, y: 0 };

		const hit = hitTestCurvedPath(start, end, [], testPoint, 5);

		expect(hit).toBe(true);
	});

	it('returns false for point far from straight line', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const testPoint: Point = { x: 50, y: 50 };

		const hit = hitTestCurvedPath(start, end, [], testPoint, 5);

		expect(hit).toBe(false);
	});

	it('returns true for point near curved path', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const waypoints = [createWaypoint(50, 30)];
		// Test a point that should be on/near the curve
		const testPoint: Point = { x: 50, y: 28 };

		const hit = hitTestCurvedPath(start, end, waypoints, testPoint, 10);

		expect(hit).toBe(true);
	});

	it('returns false for point far from curved path', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const waypoints = [createWaypoint(50, 30)];
		const testPoint: Point = { x: 50, y: 100 };

		const hit = hitTestCurvedPath(start, end, waypoints, testPoint, 5);

		expect(hit).toBe(false);
	});

	it('returns true for point at start', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };
		const waypoints = [createWaypoint(50, 0)];
		const testPoint: Point = { x: 2, y: 2 };

		const hit = hitTestCurvedPath(start, end, waypoints, testPoint, 5);

		expect(hit).toBe(true);
	});

	it('returns true for point at end', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 100 };
		const waypoints = [createWaypoint(50, 0)];
		const testPoint: Point = { x: 98, y: 98 };

		const hit = hitTestCurvedPath(start, end, waypoints, testPoint, 5);

		expect(hit).toBe(true);
	});

	it('uses tolerance correctly', () => {
		const start: Point = { x: 0, y: 0 };
		const end: Point = { x: 100, y: 0 };
		const testPoint: Point = { x: 50, y: 8 };

		// With tolerance 5, should miss
		expect(hitTestCurvedPath(start, end, [], testPoint, 5)).toBe(false);

		// With tolerance 10, should hit
		expect(hitTestCurvedPath(start, end, [], testPoint, 10)).toBe(true);
	});
});

// =============================================================================
// closestPointOnBezierSegment Tests
// =============================================================================

describe('closestPointOnBezierSegment', () => {
	it('finds closest point on simple bezier segment', () => {
		const segment = {
			p0: { x: 0, y: 0 },
			p1: { x: 33, y: 50 },
			p2: { x: 66, y: 50 },
			p3: { x: 100, y: 0 }
		};

		const testPoint: Point = { x: 50, y: 100 };
		const result = closestPointOnBezierSegment(segment, testPoint);

		// The closest point should be near the top of the curve
		expect(result.point.y).toBeGreaterThan(0);
		expect(result.point.x).toBeCloseTo(50, 0);
		expect(result.t).toBeCloseTo(0.5, 1);
	});

	it('finds point at start when closest', () => {
		const segment = {
			p0: { x: 0, y: 0 },
			p1: { x: 33, y: 0 },
			p2: { x: 66, y: 0 },
			p3: { x: 100, y: 0 }
		};

		const testPoint: Point = { x: -10, y: 0 };
		const result = closestPointOnBezierSegment(segment, testPoint);

		expectPointClose(result.point, { x: 0, y: 0 });
		expect(result.t).toBeCloseTo(0, 1);
	});

	it('finds point at end when closest', () => {
		const segment = {
			p0: { x: 0, y: 0 },
			p1: { x: 33, y: 0 },
			p2: { x: 66, y: 0 },
			p3: { x: 100, y: 0 }
		};

		const testPoint: Point = { x: 110, y: 0 };
		const result = closestPointOnBezierSegment(segment, testPoint);

		expectPointClose(result.point, { x: 100, y: 0 });
		expect(result.t).toBeCloseTo(1, 1);
	});

	it('returns correct distance', () => {
		const segment = {
			p0: { x: 0, y: 0 },
			p1: { x: 33, y: 0 },
			p2: { x: 66, y: 0 },
			p3: { x: 100, y: 0 }
		};

		const testPoint: Point = { x: 50, y: 10 };
		const result = closestPointOnBezierSegment(segment, testPoint);

		// Distance should be approximately 10 (vertical distance)
		expect(result.distance).toBeCloseTo(10, 0);
	});
});
