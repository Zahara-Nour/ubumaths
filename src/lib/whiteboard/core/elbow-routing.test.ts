/**
 * Tests for Elbow Arrow Routing (Excalidraw-style)
 *
 * Tests the A* pathfinding algorithm for elbow arrows with:
 * - Non-uniform grids
 * - Dynamic AABBs
 * - Dongle system
 * - Cubic turn penalties
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { routeElbowArrow, validateElbowPoints } from './elbow-routing';
import { HEADING_UP, HEADING_DOWN, HEADING_LEFT, HEADING_RIGHT } from './heading';
import type { ShapeElement } from '../types/document';

// =============================================================================
// Helper Functions
// =============================================================================

function createRectangle(
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

// =============================================================================
// Basic Routing Tests
// =============================================================================

describe('routeElbowArrow', () => {
	describe('basic routing without shapes', () => {
		it('routes horizontal then vertical (L-shape) with perpendicular headings', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 100, y: 100 },
				HEADING_RIGHT,
				HEADING_UP,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
			expect(result.points[0]).toEqual({ x: 0, y: 0 });
			expect(result.points[result.points.length - 1]).toEqual({ x: 100, y: 100 });
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('routes vertical then horizontal (L-shape) with perpendicular headings', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 100, y: 100 },
				HEADING_DOWN,
				HEADING_LEFT,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
			expect(result.points[0]).toEqual({ x: 0, y: 0 });
			expect(result.points[result.points.length - 1]).toEqual({ x: 100, y: 100 });
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('routes Z-shape when headings are same direction', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 100, y: 100 },
				HEADING_RIGHT,
				HEADING_LEFT,
				null,
				null
			);

			expect(result.success).toBe(true);
			// Z-shape needs at least 3 points (start, corner(s), end)
			expect(result.points.length).toBeGreaterThanOrEqual(3);
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('routes S-shape when headings are opposite and offset', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 0, y: 200 },
				HEADING_RIGHT,
				HEADING_RIGHT,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('handles horizontal-dominant distance', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 200, y: 50 },
				HEADING_RIGHT,
				HEADING_LEFT,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});

		it('handles vertical-dominant distance', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 50, y: 200 },
				HEADING_DOWN,
				HEADING_UP,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('routing between rectangles', () => {
		it('routes from right side of rect A to left side of rect B (horizontally aligned)', () => {
			const rectA = createRectangle('a', 0, 50, 100, 100);
			const rectB = createRectangle('b', 200, 50, 100, 100);

			// Arrow from right edge of A to left edge of B
			const result = routeElbowArrow(
				{ x: 100, y: 100 }, // Right edge of A
				{ x: 200, y: 100 }, // Left edge of B
				HEADING_RIGHT,
				HEADING_LEFT,
				rectA,
				rectB
			);

			expect(result.success).toBe(true);
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('routes from bottom of rect A to top of rect B (vertically aligned)', () => {
			const rectA = createRectangle('a', 50, 0, 100, 100);
			const rectB = createRectangle('b', 50, 200, 100, 100);

			const result = routeElbowArrow(
				{ x: 100, y: 100 }, // Bottom edge of A
				{ x: 100, y: 200 }, // Top edge of B
				HEADING_DOWN,
				HEADING_UP,
				rectA,
				rectB
			);

			expect(result.success).toBe(true);
			expect(validateElbowPoints(result.points)).toBe(true);
		});

		it('routes around rectangles when diagonal', () => {
			const rectA = createRectangle('a', 0, 0, 100, 100);
			const rectB = createRectangle('b', 200, 200, 100, 100);

			const result = routeElbowArrow(
				{ x: 100, y: 50 }, // Right edge of A
				{ x: 200, y: 250 }, // Left edge of B
				HEADING_RIGHT,
				HEADING_LEFT,
				rectA,
				rectB
			);

			expect(result.success).toBe(true);
			expect(validateElbowPoints(result.points)).toBe(true);
		});
	});

	describe('heading enforcement', () => {
		it('first segment goes in start heading direction (RIGHT)', () => {
			const result = routeElbowArrow(
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				HEADING_RIGHT,
				HEADING_UP,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);

			// First segment should be horizontal (going right)
			const p0 = result.points[0];
			const p1 = result.points[1];
			expect(p1.x).toBeGreaterThanOrEqual(p0.x); // Moving right
			expect(Math.abs(p1.y - p0.y)).toBeLessThan(1); // Horizontal
		});

		it('first segment goes in start heading direction (DOWN)', () => {
			const result = routeElbowArrow(
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				HEADING_DOWN,
				HEADING_LEFT,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);

			// First segment should be vertical (going down)
			const p0 = result.points[0];
			const p1 = result.points[1];
			expect(p1.y).toBeGreaterThanOrEqual(p0.y); // Moving down
			expect(Math.abs(p1.x - p0.x)).toBeLessThan(1); // Vertical
		});

		it('last segment comes from end heading direction', () => {
			const result = routeElbowArrow(
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				HEADING_RIGHT,
				HEADING_UP,
				null,
				null
			);

			expect(result.success).toBe(true);
			const points = result.points;
			expect(points.length).toBeGreaterThanOrEqual(2);

			// Last segment should be vertical (coming from up, which means arriving from above)
			const pLast = points[points.length - 1];
			const pPrev = points[points.length - 2];
			expect(Math.abs(pLast.x - pPrev.x)).toBeLessThan(1); // Vertical
		});
	});

	describe('edge cases', () => {
		it('handles same start and end point', () => {
			const result = routeElbowArrow(
				{ x: 100, y: 100 },
				{ x: 100, y: 100 },
				HEADING_RIGHT,
				HEADING_LEFT,
				null,
				null
			);

			// Should handle gracefully
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});

		it('handles very close points', () => {
			const result = routeElbowArrow(
				{ x: 100, y: 100 },
				{ x: 101, y: 101 },
				HEADING_RIGHT,
				HEADING_LEFT,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.points.length).toBeGreaterThanOrEqual(2);
		});

		it('handles large distances', () => {
			const result = routeElbowArrow(
				{ x: 0, y: 0 },
				{ x: 10000, y: 10000 },
				HEADING_RIGHT,
				HEADING_UP,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(validateElbowPoints(result.points)).toBe(true);
		});
	});
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateElbowPoints', () => {
	it('returns true for valid orthogonal path', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
			{ x: 200, y: 100 }
		];
		expect(validateElbowPoints(points)).toBe(true);
	});

	it('returns false for diagonal path', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 100 } // Diagonal
		];
		expect(validateElbowPoints(points)).toBe(false);
	});

	it('returns true for single horizontal segment', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		];
		expect(validateElbowPoints(points)).toBe(true);
	});

	it('returns true for single vertical segment', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 0, y: 100 }
		];
		expect(validateElbowPoints(points)).toBe(true);
	});

	it('returns true for L-shape', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 }
		];
		expect(validateElbowPoints(points)).toBe(true);
	});

	it('returns true for Z-shape', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 100 },
			{ x: 100, y: 100 }
		];
		expect(validateElbowPoints(points)).toBe(true);
	});

	it('handles tolerance for near-orthogonal segments', () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0.5 } // Almost horizontal
		];
		expect(validateElbowPoints(points, 1)).toBe(true);
	});
});
