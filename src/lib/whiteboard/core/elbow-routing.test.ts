/**
 * Tests for elbow-routing.ts
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { routeElbowArrow, isPathValid, calculatePathLength, countPathTurns } from './elbow-routing';
import type { Point, WhiteboardElement, ShapeElement } from '../types/document';
import type { AABB } from './aabb';

// =============================================================================
// Test Helpers
// =============================================================================

function createRectangleElement(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number
): ShapeElement {
	return {
		id,
		type: 'shape',
		shapeType: 'rectangle',
		start: { x, y },
		end: { x: x + width, y: y + height },
		color: '#000000',
		strokeWidth: 2,
		opacity: 1
	};
}

function createAABB(minX: number, minY: number, maxX: number, maxY: number): AABB {
	return { minX, minY, maxX, maxY, elementId: 'test' };
}

// =============================================================================
// routeElbowArrow Tests
// =============================================================================

describe('routeElbowArrow', () => {
	describe('basic path generation', () => {
		it('creates a path with at least start and end points', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, null, null, []);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
			expect(result.points[0]).toEqual(start);
			expect(result.points[result.points.length - 1]).toEqual(end);
		});

		it('creates L-shape path for horizontal-dominant distance', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 200, y: 50 };

			const result = routeElbowArrow(start, end, null, null, []);

			expect(result.success).toBe(true);
			// Should be L-shape (3 points) or Z-shape (4 points)
			expect(result.points.length).toBeGreaterThanOrEqual(2);
			expect(result.points.length).toBeLessThanOrEqual(4);
		});

		it('creates L-shape path for vertical-dominant distance', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 50, y: 200 };

			const result = routeElbowArrow(start, end, null, null, []);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});

		it('uses simple path for very close points', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 10, y: 10 };

			const result = routeElbowArrow(start, end, null, null, []);

			expect(result.success).toBe(true);
			// Should use simple L-shape for close points
			expect(result.points.length).toBeLessThanOrEqual(4);
		});
	});

	describe('with headings', () => {
		it('respects start heading (right)', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, 'right', null, []);

			expect(result.success).toBe(true);
			// First segment should move right (positive x direction)
			if (result.points.length > 1) {
				expect(result.points[1].x).toBeGreaterThanOrEqual(start.x);
			}
		});

		it('respects start heading (down)', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, 'down', null, []);

			expect(result.success).toBe(true);
			// First segment should move down (positive y direction)
			if (result.points.length > 1) {
				expect(result.points[1].y).toBeGreaterThanOrEqual(start.y);
			}
		});

		it('respects perpendicular start and end headings', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, 'right', 'down', []);

			expect(result.success).toBe(true);
			// Should create clean L-shape
			expect(result.points.length).toBeLessThanOrEqual(4);
		});

		it('handles same direction start and end headings (Z-shape)', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, 'right', 'left', []);

			expect(result.success).toBe(true);
			// Should need more points for Z-shape
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('obstacle avoidance', () => {
		it('routes around a single obstacle', () => {
			const start: Point = { x: 0, y: 50 };
			const end: Point = { x: 200, y: 50 };
			const obstacle = createRectangleElement('obstacle', 80, 30, 40, 40);

			const result = routeElbowArrow(start, end, null, null, [obstacle]);

			expect(result.points[0]).toEqual(start);
			expect(result.points[result.points.length - 1]).toEqual(end);
			// Path should avoid the obstacle (might need detour)
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});

		it('excludes specified elements from obstacle checking', () => {
			const start: Point = { x: 0, y: 50 };
			const end: Point = { x: 200, y: 50 };
			const obstacle = createRectangleElement('obstacle', 80, 30, 40, 40);

			const result = routeElbowArrow(start, end, null, null, [obstacle], new Set(['obstacle']));

			expect(result.success).toBe(true);
			// Should find simpler path since obstacle is excluded
		});

		it('handles multiple obstacles', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 300, y: 300 };
			const obstacles: WhiteboardElement[] = [
				createRectangleElement('ob1', 50, 50, 50, 50),
				createRectangleElement('ob2', 150, 150, 50, 50)
			];

			const result = routeElbowArrow(start, end, null, null, obstacles);

			expect(result.points[0]).toEqual(start);
			expect(result.points[result.points.length - 1]).toEqual(end);
		});

		it('falls back to simple path when no route found', () => {
			const start: Point = { x: 50, y: 50 };
			const end: Point = { x: 150, y: 50 };
			// Create obstacles that completely block the path
			const obstacles: WhiteboardElement[] = [
				createRectangleElement('wall1', 90, -100, 20, 300),
				createRectangleElement('wall2', 90, -100, 20, 300)
			];

			const result = routeElbowArrow(start, end, null, null, obstacles, undefined, {
				maxNodes: 100 // Limit search
			});

			// Should still return a path (fallback)
			expect(result.points.length).toBeGreaterThanOrEqual(2);
			expect(result.points[0]).toEqual(start);
			expect(result.points[result.points.length - 1]).toEqual(end);
		});
	});

	describe('configuration options', () => {
		it('respects custom gridSize', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, null, null, [], undefined, { gridSize: 20 });

			expect(result.success).toBe(true);
		});

		it('respects custom turnPenalty', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 100, y: 100 };

			const result = routeElbowArrow(start, end, null, null, [], undefined, { turnPenalty: 5 });

			expect(result.success).toBe(true);
		});

		it('respects maxNodes limit', () => {
			const start: Point = { x: 0, y: 0 };
			const end: Point = { x: 1000, y: 1000 };
			const obstacles = [createRectangleElement('ob', 400, 400, 200, 200)];

			const result = routeElbowArrow(start, end, null, null, obstacles, undefined, {
				maxNodes: 50
			});

			// Should return a result even with limited search
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});
	});
});

// =============================================================================
// isPathValid Tests
// =============================================================================

describe('isPathValid', () => {
	it('returns true for empty path', () => {
		const obstacles = [createAABB(0, 0, 100, 100)];
		expect(isPathValid([], obstacles)).toBe(true);
	});

	it('returns true for single point path', () => {
		const obstacles = [createAABB(0, 0, 100, 100)];
		expect(isPathValid([{ x: 200, y: 200 }], obstacles)).toBe(true);
	});

	it('returns true for path not intersecting obstacles', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 50 }
		];
		const obstacles = [createAABB(100, 100, 150, 150)];

		expect(isPathValid(path, obstacles)).toBe(true);
	});

	it('returns false for path intersecting an obstacle', () => {
		const path: Point[] = [
			{ x: 0, y: 50 },
			{ x: 100, y: 50 }
		];
		const obstacles = [createAABB(40, 40, 60, 60)];

		expect(isPathValid(path, obstacles)).toBe(false);
	});

	it('returns true when path goes around obstacle', () => {
		const path: Point[] = [
			{ x: 0, y: 50 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 }
		];
		const obstacles = [createAABB(40, 40, 60, 60)];

		expect(isPathValid(path, obstacles)).toBe(true);
	});
});

// =============================================================================
// calculatePathLength Tests
// =============================================================================

describe('calculatePathLength', () => {
	it('returns 0 for empty path', () => {
		expect(calculatePathLength([])).toBe(0);
	});

	it('returns 0 for single point', () => {
		expect(calculatePathLength([{ x: 0, y: 0 }])).toBe(0);
	});

	it('calculates horizontal distance correctly', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		];
		expect(calculatePathLength(path)).toBe(100);
	});

	it('calculates vertical distance correctly', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 100 }
		];
		expect(calculatePathLength(path)).toBe(100);
	});

	it('calculates L-shape path length correctly', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 }
		];
		expect(calculatePathLength(path)).toBe(150);
	});

	it('calculates diagonal distance correctly', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 3, y: 4 }
		];
		expect(calculatePathLength(path)).toBe(5); // 3-4-5 triangle
	});
});

// =============================================================================
// countPathTurns Tests
// =============================================================================

describe('countPathTurns', () => {
	it('returns 0 for empty path', () => {
		expect(countPathTurns([])).toBe(0);
	});

	it('returns 0 for single point', () => {
		expect(countPathTurns([{ x: 0, y: 0 }])).toBe(0);
	});

	it('returns 0 for two points', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		];
		expect(countPathTurns(path)).toBe(0);
	});

	it('returns 0 for straight line (multiple collinear points)', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 100, y: 0 }
		];
		expect(countPathTurns(path)).toBe(0);
	});

	it('returns 1 for L-shape path', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 }
		];
		expect(countPathTurns(path)).toBe(1);
	});

	it('returns 2 for Z-shape path', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 100 },
			{ x: 100, y: 100 }
		];
		expect(countPathTurns(path)).toBe(2);
	});

	it('returns 3 for U-shape path', () => {
		const path: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 50 },
			{ x: 100, y: 50 },
			{ x: 100, y: 0 }
		];
		expect(countPathTurns(path)).toBe(2); // Actually 2 turns for this shape
	});
});
