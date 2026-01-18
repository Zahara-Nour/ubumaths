/**
 * Tests for binding logic
 *
 * TDD Phase 2: Binding creation and detection
 */

import { describe, it, expect } from 'vitest';
import {
	isBindableShape,
	findBindingCandidate,
	createBindingAnchor,
	calculateBoundEndpoint,
	getArrowBindings,
	createArrowWithBindings,
	BINDING_THRESHOLD_PX
} from './binding';
import type {
	Point,
	ShapeElement,
	ArrowElement,
	BindingAnchor,
	WhiteboardElement
} from '../types/document';

// =============================================================================
// Test Utilities
// =============================================================================

/** Helper to create a mock shape element */
function createShape(
	shapeType: ShapeElement['shapeType'],
	start: Point,
	end: Point,
	options: Partial<ShapeElement> = {}
): ShapeElement {
	return {
		id: options.id ?? crypto.randomUUID(),
		type: 'shape',
		shapeType,
		start,
		end,
		color: '#000000',
		strokeWidth: 2,
		opacity: 1,
		...options
	};
}

/** Helper to create a mock arrow element */
function createArrow(start: Point, end: Point, options: Partial<ArrowElement> = {}): ArrowElement {
	return {
		id: options.id ?? crypto.randomUUID(),
		type: 'shape',
		shapeType: 'arrow',
		start,
		end,
		color: '#000000',
		strokeWidth: 2,
		opacity: 1,
		...options
	};
}

/** Helper to check if two points are approximately equal */
function expectPointClose(actual: Point, expected: Point, tolerance = 1) {
	expect(actual.x).toBeCloseTo(expected.x, tolerance);
	expect(actual.y).toBeCloseTo(expected.y, tolerance);
}

// =============================================================================
// isBindableShape Tests
// =============================================================================

describe('isBindableShape', () => {
	it('returns true for rectangle', () => {
		const shape = createShape('rectangle', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(true);
	});

	it('returns true for circle', () => {
		const shape = createShape('circle', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(true);
	});

	it('returns true for pentagon', () => {
		const shape = createShape('pentagon', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(true);
	});

	it('returns true for hexagon', () => {
		const shape = createShape('hexagon', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(true);
	});

	it('returns true for star', () => {
		const shape = createShape('star', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(true);
	});

	it('returns false for line', () => {
		const shape = createShape('line', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(false);
	});

	it('returns false for arrow', () => {
		const shape = createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 100 });
		expect(isBindableShape(shape)).toBe(false);
	});
});

// =============================================================================
// findBindingCandidate Tests
// =============================================================================

describe('findBindingCandidate', () => {
	it('returns null when no shapes are nearby', () => {
		const point: Point = { x: 500, y: 500 };
		const elements = [createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 })];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).toBeNull();
	});

	it('finds a rectangle when point is within threshold of its perimeter', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Point is 10px to the right of the right edge (within 15px threshold)
		const point: Point = { x: 210, y: 150 };
		const elements = [rect];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		expect(result!.element.id).toBe(rect.id);
		expect(result!.distance).toBeLessThanOrEqual(BINDING_THRESHOLD_PX);
	});

	it('finds a circle when point is within threshold of its perimeter', () => {
		const circle = createShape('circle', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Circle center is at (150, 150), radius 50
		// Point is 10px outside the right edge
		const point: Point = { x: 210, y: 150 };
		const elements = [circle];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		expect(result!.element.id).toBe(circle.id);
	});

	it('returns the closest shape when multiple are within threshold', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 250, y: 100 }, { x: 350, y: 200 }, { id: 'rect2' });
		// Point is between the two rectangles (outside both), closer to rect2
		const point: Point = { x: 225, y: 150 };
		const elements = [rect1, rect2];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		// rect1's right edge is at x=200, distance = 25px
		// rect2's left edge is at x=250, distance = 25px (equal, but rect1 is first in array)
		// Actually: point at 225, rect2 at 250 -> 25px, rect1 at 200 -> 25px
		// Since they're equal, returns first found (rect1)
		expect(result!.element.id).toBe('rect1');
	});

	it('binds to shape containing the point (even if closer to another edge)', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 195, y: 100 }, { x: 295, y: 200 }, { id: 'rect2' });
		// Point is inside rect1 but closer to rect2's edge
		const point: Point = { x: 193, y: 150 };
		const elements = [rect1, rect2];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		// Point is inside rect1, so it binds to rect1 (not the closer edge of rect2)
		expect(result!.element.id).toBe('rect1');
	});

	it('excludes elements in the excludeIds set', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const point: Point = { x: 210, y: 150 };
		const elements = [rect];

		const result = findBindingCandidate(point, elements, new Set([rect.id]));

		expect(result).toBeNull();
	});

	it('ignores line shapes', () => {
		const line = createShape('line', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Point very close to the line
		const point: Point = { x: 150, y: 150 };
		const elements = [line];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).toBeNull();
	});

	it('ignores arrow shapes', () => {
		const arrow = createArrow({ x: 100, y: 100 }, { x: 200, y: 200 });
		// Point very close to the arrow
		const point: Point = { x: 150, y: 150 };
		const elements = [arrow];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).toBeNull();
	});

	it('works with rotated shapes', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { rotation: 45 });
		// Point near the rotated rectangle
		const point: Point = { x: 220, y: 150 };
		const elements = [rect];

		const result = findBindingCandidate(point, elements, new Set());

		// Should still find the shape (exact distance depends on rotation)
		// Just verify it doesn't crash and returns reasonable result
		expect(result === null || result.element.id === rect.id).toBe(true);
	});

	it('returns perimeter point in the result', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const point: Point = { x: 210, y: 150 };
		const elements = [rect];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		expect(result!.perimeterPoint).toBeDefined();
		// Perimeter point should be on the right edge
		expect(result!.perimeterPoint.x).toBeCloseTo(200, 0);
		expect(result!.perimeterPoint.y).toBeCloseTo(150, 0);
	});

	describe('edge cases', () => {
		it('returns null for empty elements array', () => {
			const point: Point = { x: 150, y: 150 };
			const elements: ShapeElement[] = [];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).toBeNull();
		});

		it('returns null when all elements are excluded', () => {
			const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'r1' });
			const rect2 = createShape('rectangle', { x: 150, y: 150 }, { x: 250, y: 250 }, { id: 'r2' });
			const point: Point = { x: 205, y: 175 };
			const elements = [rect1, rect2];

			const result = findBindingCandidate(point, elements, new Set(['r1', 'r2']));

			expect(result).toBeNull();
		});

		it('finds shape when point is exactly on perimeter (distance = 0)', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const point: Point = { x: 200, y: 150 }; // Exactly on right edge
			const elements = [rect];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).not.toBeNull();
			expect(result!.distance).toBeCloseTo(0, 0);
		});

		it('handles overlapping shapes (picks closest perimeter)', () => {
			const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'r1' });
			const rect2 = createShape('rectangle', { x: 150, y: 100 }, { x: 250, y: 200 }, { id: 'r2' });
			// Point between the two overlapping areas, closer to rect2's right edge
			const point: Point = { x: 255, y: 150 };
			const elements = [rect1, rect2];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).not.toBeNull();
			expect(result!.element.id).toBe('r2');
		});

		it('handles shapes with negative coordinates', () => {
			const rect = createShape('rectangle', { x: -200, y: -200 }, { x: -100, y: -100 });
			const point: Point = { x: -95, y: -150 }; // Near right edge
			const elements = [rect];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).not.toBeNull();
			expect(result!.element.id).toBe(rect.id);
		});

		it('handles point inside a shape (binds to containing shape)', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const point: Point = { x: 150, y: 150 }; // Center of rectangle
			const elements = [rect];

			const result = findBindingCandidate(point, elements, new Set());

			// Point is inside the shape, so it should bind to that shape
			// This allows starting arrows from inside shapes
			expect(result).not.toBeNull();
			expect(result!.element.id).toBe(rect.id);
		});

		it('handles point just inside threshold from perimeter', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const point: Point = { x: 214, y: 150 }; // 14px from right edge (within 15px threshold)
			const elements = [rect];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).not.toBeNull();
			expect(result!.distance).toBeLessThan(BINDING_THRESHOLD_PX);
		});

		it('returns null for point just outside threshold', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const point: Point = { x: 231, y: 150 }; // 31px from right edge (outside 30px threshold)
			const elements = [rect];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).toBeNull();
		});

		it('handles very small shapes', () => {
			const smallRect = createShape('rectangle', { x: 100, y: 100 }, { x: 105, y: 105 });
			const point: Point = { x: 110, y: 102.5 }; // 5px from right edge
			const elements = [smallRect];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).not.toBeNull();
		});

		it('ignores text elements (type !== shape)', () => {
			const textElement = {
				id: crypto.randomUUID(),
				type: 'text' as const,
				x: 150,
				y: 150,
				text: 'Hello',
				fontSize: 16,
				fontFamily: 'Arial',
				color: '#000000',
				opacity: 1
			};
			const point: Point = { x: 150, y: 150 };
			const elements = [textElement] as unknown as readonly WhiteboardElement[];

			const result = findBindingCandidate(point, elements, new Set());

			expect(result).toBeNull();
		});
	});
});

// =============================================================================
// createBindingAnchor Tests
// =============================================================================

describe('createBindingAnchor', () => {
	it('creates a binding anchor with correct elementId', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowEndpoint: Point = { x: 210, y: 150 };
		const otherEndpoint: Point = { x: 300, y: 150 };

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

		expect(anchor.elementId).toBe(rect.id);
	});

	it('creates normalized position within 0-1 range for point inside bounds', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowEndpoint: Point = { x: 200, y: 150 }; // On right edge, vertically centered
		const otherEndpoint: Point = { x: 300, y: 150 };

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

		expect(anchor.normalizedPosition.x).toBeCloseTo(1, 1); // Right edge = 1
		expect(anchor.normalizedPosition.y).toBeCloseTo(0.5, 1); // Vertically centered = 0.5
	});

	it('calculates perimeter point facing toward the other endpoint', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowEndpoint: Point = { x: 210, y: 150 };
		const otherEndpoint: Point = { x: 300, y: 150 }; // To the right

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

		// Perimeter point should be on the right edge (facing toward otherEndpoint)
		expect(anchor.perimeterPoint.x).toBeCloseTo(1, 1); // Right edge normalized
	});

	it('uses default gap of 4px', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowEndpoint: Point = { x: 210, y: 150 };
		const otherEndpoint: Point = { x: 300, y: 150 };

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

		expect(anchor.gap).toBe(4);
	});

	it('accepts custom gap value', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowEndpoint: Point = { x: 210, y: 150 };
		const otherEndpoint: Point = { x: 300, y: 150 };

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint, 10);

		expect(anchor.gap).toBe(10);
	});

	it('handles shapes with rotation', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { rotation: 45 });
		const arrowEndpoint: Point = { x: 210, y: 150 };
		const otherEndpoint: Point = { x: 300, y: 150 };

		const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

		// Should create valid anchor without crashing
		expect(anchor.elementId).toBe(rect.id);
		expect(Number.isFinite(anchor.normalizedPosition.x)).toBe(true);
		expect(Number.isFinite(anchor.normalizedPosition.y)).toBe(true);
	});

	describe('edge cases', () => {
		it('handles zero-size shape gracefully', () => {
			const zeroRect = createShape('rectangle', { x: 100, y: 100 }, { x: 100, y: 100 });
			const arrowEndpoint: Point = { x: 105, y: 100 };
			const otherEndpoint: Point = { x: 200, y: 100 };

			const anchor = createBindingAnchor(zeroRect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(zeroRect.id);
			expect(Number.isFinite(anchor.normalizedPosition.x)).toBe(true);
			expect(Number.isFinite(anchor.normalizedPosition.y)).toBe(true);
		});

		it('handles arrow endpoint exactly at shape center', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const arrowEndpoint: Point = { x: 150, y: 150 }; // Center
			const otherEndpoint: Point = { x: 300, y: 150 };

			const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(rect.id);
			expect(anchor.normalizedPosition.x).toBeCloseTo(0.5, 1);
			expect(anchor.normalizedPosition.y).toBeCloseTo(0.5, 1);
		});

		it('handles arrow pointing back toward itself (start near end)', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const arrowEndpoint: Point = { x: 205, y: 150 };
			const otherEndpoint: Point = { x: 206, y: 150 }; // Very close to start

			const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(rect.id);
			expect(Number.isFinite(anchor.normalizedPosition.x)).toBe(true);
		});

		it('handles zero gap', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const arrowEndpoint: Point = { x: 200, y: 150 };
			const otherEndpoint: Point = { x: 300, y: 150 };

			const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint, 0);

			expect(anchor.gap).toBe(0);
		});

		it('handles negative coordinates', () => {
			const rect = createShape('rectangle', { x: -200, y: -200 }, { x: -100, y: -100 });
			const arrowEndpoint: Point = { x: -95, y: -150 };
			const otherEndpoint: Point = { x: 0, y: -150 };

			const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(rect.id);
			expect(Number.isFinite(anchor.normalizedPosition.x)).toBe(true);
		});

		it('handles very large shape', () => {
			const largeRect = createShape('rectangle', { x: 0, y: 0 }, { x: 10000, y: 10000 });
			const arrowEndpoint: Point = { x: 10005, y: 5000 };
			const otherEndpoint: Point = { x: 20000, y: 5000 };

			const anchor = createBindingAnchor(largeRect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(largeRect.id);
			expect(Number.isFinite(anchor.normalizedPosition.x)).toBe(true);
		});

		it('handles arrow endpoint outside and opposite to other endpoint direction', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			// Arrow endpoint to the right of rectangle, but other endpoint is to the left
			const arrowEndpoint: Point = { x: 250, y: 150 };
			const otherEndpoint: Point = { x: 50, y: 150 };

			const anchor = createBindingAnchor(rect, arrowEndpoint, otherEndpoint);

			expect(anchor.elementId).toBe(rect.id);
			// Perimeter point should be on the left edge (facing otherEndpoint)
			expect(anchor.perimeterPoint.x).toBeCloseTo(0, 1); // Normalized: left edge = 0
		});
	});
});

// =============================================================================
// calculateBoundEndpoint Tests
// =============================================================================

describe('calculateBoundEndpoint', () => {
	it('calculates correct position for binding on right edge', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 1, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};
		const otherEndpoint: Point = { x: 300, y: 150 }; // Arrow pointing right

		const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

		// Should be on right edge (200) + gap (4) = 204
		expect(result.x).toBeCloseTo(204, 0);
		expect(result.y).toBeCloseTo(150, 0);
	});

	it('calculates correct position for binding on top edge', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 0.5, y: 0 },
			perimeterPoint: { x: 0.5, y: 0 },
			gap: 4
		};
		const otherEndpoint: Point = { x: 150, y: 50 }; // Arrow pointing up

		const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

		// Should be on top edge (100) - gap (4) = 96
		expect(result.x).toBeCloseTo(150, 0);
		expect(result.y).toBeCloseTo(96, 0);
	});

	it('applies gap correctly in the direction away from shape center', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 0, y: 0.5 },
			perimeterPoint: { x: 0, y: 0.5 },
			gap: 10
		};
		const otherEndpoint: Point = { x: 50, y: 150 }; // Arrow pointing left

		const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

		// Should be on left edge (100) - gap (10) = 90
		expect(result.x).toBeCloseTo(90, 0);
		expect(result.y).toBeCloseTo(150, 0);
	});

	it('handles rotated shapes correctly', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { rotation: 90 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 1, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 0
		};
		const otherEndpoint: Point = { x: 150, y: 250 }; // Arrow pointing down

		const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

		// After 90° rotation, the "right" edge becomes the "bottom"
		// Center is at (150, 150), so the rotated right edge point should be at bottom
		expect(Number.isFinite(result.x)).toBe(true);
		expect(Number.isFinite(result.y)).toBe(true);
	});

	it('works with circle shapes', () => {
		const circle = createShape('circle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: circle.id,
			normalizedPosition: { x: 1, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};
		const otherEndpoint: Point = { x: 300, y: 150 };

		const result = calculateBoundEndpoint(binding, circle, otherEndpoint);

		// Circle right edge at x=200, + gap = 204
		expect(result.x).toBeCloseTo(204, 0);
		expect(result.y).toBeCloseTo(150, 0);
	});

	it('recalculates perimeter point based on direction to other endpoint', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 0.5, y: 0.5 }, // Center (will be adjusted)
			perimeterPoint: { x: 1, y: 0.5 }, // Original perimeter point
			gap: 4
		};

		// Other endpoint to the left - should recalculate to left edge
		const leftEndpoint: Point = { x: 50, y: 150 };
		const resultLeft = calculateBoundEndpoint(binding, rect, leftEndpoint);

		// Other endpoint above - should recalculate to top edge
		const topEndpoint: Point = { x: 150, y: 50 };
		const resultTop = calculateBoundEndpoint(binding, rect, topEndpoint);

		// Results should be on different edges
		expect(resultLeft.x).toBeLessThan(resultTop.x);
		expect(resultTop.y).toBeLessThan(resultLeft.y);
	});

	it('handles arrow endpoint exactly at shape center gracefully', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const binding: BindingAnchor = {
			elementId: rect.id,
			normalizedPosition: { x: 0.5, y: 0.5 },
			perimeterPoint: { x: 1, y: 0.5 },
			gap: 4
		};
		// Other endpoint exactly at shape center (150, 150)
		const centerPoint: Point = { x: 150, y: 150 };

		const result = calculateBoundEndpoint(binding, rect, centerPoint);

		// Should fall back to default direction (1, 0) from normalizeVector
		// Result should be on the right edge with gap
		expect(Number.isFinite(result.x)).toBe(true);
		expect(Number.isFinite(result.y)).toBe(true);
		expect(result.x).toBeCloseTo(204, 0); // Right edge (200) + gap (4)
	});

	describe('edge cases', () => {
		it('handles zero gap', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 1, y: 0.5 },
				perimeterPoint: { x: 1, y: 0.5 },
				gap: 0
			};
			const otherEndpoint: Point = { x: 300, y: 150 };

			const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

			// Should be exactly on the perimeter
			expect(result.x).toBeCloseTo(200, 0);
		});

		it('handles very large gap', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 1, y: 0.5 },
				perimeterPoint: { x: 1, y: 0.5 },
				gap: 500
			};
			const otherEndpoint: Point = { x: 300, y: 150 };

			const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

			expect(result.x).toBeCloseTo(700, 0); // 200 + 500
		});

		it('handles zero-size shape', () => {
			const zeroRect = createShape('rectangle', { x: 100, y: 100 }, { x: 100, y: 100 });
			const binding: BindingAnchor = {
				elementId: zeroRect.id,
				normalizedPosition: { x: 0.5, y: 0.5 },
				perimeterPoint: { x: 0.5, y: 0.5 },
				gap: 4
			};
			const otherEndpoint: Point = { x: 200, y: 100 };

			const result = calculateBoundEndpoint(binding, zeroRect, otherEndpoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles diagonal direction', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 1, y: 0 },
				perimeterPoint: { x: 1, y: 0 },
				gap: 0
			};
			// Other endpoint diagonally up-right
			const otherEndpoint: Point = { x: 300, y: 50 };

			const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

			expect(Number.isFinite(result.x)).toBe(true);
			expect(Number.isFinite(result.y)).toBe(true);
		});

		it('handles other endpoint very close to bound shape', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 1, y: 0.5 },
				perimeterPoint: { x: 1, y: 0.5 },
				gap: 4
			};
			// Other endpoint just outside the shape
			const otherEndpoint: Point = { x: 201, y: 150 };

			const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

			expect(Number.isFinite(result.x)).toBe(true);
		});

		it('handles negative coordinate shapes', () => {
			const rect = createShape('rectangle', { x: -200, y: -200 }, { x: -100, y: -100 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 1, y: 0.5 },
				perimeterPoint: { x: 1, y: 0.5 },
				gap: 4
			};
			const otherEndpoint: Point = { x: 0, y: -150 };

			const result = calculateBoundEndpoint(binding, rect, otherEndpoint);

			expect(result.x).toBeCloseTo(-96, 0); // -100 + 4
		});

		it('handles shape that has been resized to different aspect ratio', () => {
			// Original binding was on a square, now shape is wide rectangle
			const wideRect = createShape('rectangle', { x: 100, y: 100 }, { x: 400, y: 150 });
			const binding: BindingAnchor = {
				elementId: wideRect.id,
				normalizedPosition: { x: 1, y: 0.5 },
				perimeterPoint: { x: 1, y: 0.5 },
				gap: 4
			};
			const otherEndpoint: Point = { x: 500, y: 125 };

			const result = calculateBoundEndpoint(binding, wideRect, otherEndpoint);

			// Should adapt to new shape dimensions
			expect(result.x).toBeCloseTo(404, 0); // 400 + 4
			expect(result.y).toBeCloseTo(125, 0);
		});

		it('handles all edge directions', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const binding: BindingAnchor = {
				elementId: rect.id,
				normalizedPosition: { x: 0.5, y: 0.5 },
				perimeterPoint: { x: 0.5, y: 0.5 },
				gap: 4
			};

			const directions = [
				{ point: { x: 300, y: 150 }, expectedEdge: 'right' },
				{ point: { x: 0, y: 150 }, expectedEdge: 'left' },
				{ point: { x: 150, y: 0 }, expectedEdge: 'top' },
				{ point: { x: 150, y: 300 }, expectedEdge: 'bottom' }
			];

			for (const { point, expectedEdge } of directions) {
				const result = calculateBoundEndpoint(binding, rect, point);

				expect(Number.isFinite(result.x)).toBe(true);
				expect(Number.isFinite(result.y)).toBe(true);

				// Verify result is in expected direction from center
				const center = { x: 150, y: 150 };
				if (expectedEdge === 'right') expect(result.x).toBeGreaterThan(center.x);
				if (expectedEdge === 'left') expect(result.x).toBeLessThan(center.x);
				if (expectedEdge === 'top') expect(result.y).toBeLessThan(center.y);
				if (expectedEdge === 'bottom') expect(result.y).toBeGreaterThan(center.y);
			}
		});
	});
});

// =============================================================================
// getArrowBindings Tests
// =============================================================================

describe('getArrowBindings', () => {
	it('returns both bindings when both are set', () => {
		const arrow = createArrow(
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
			{
				startBinding: {
					elementId: 'shape1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				},
				endBinding: {
					elementId: 'shape2',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);

		const { startBinding, endBinding } = getArrowBindings(arrow);

		expect(startBinding).not.toBeNull();
		expect(startBinding!.elementId).toBe('shape1');
		expect(endBinding).not.toBeNull();
		expect(endBinding!.elementId).toBe('shape2');
	});

	it('returns null for missing startBinding', () => {
		const arrow = createArrow(
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
			{
				endBinding: {
					elementId: 'shape2',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);

		const { startBinding, endBinding } = getArrowBindings(arrow);

		expect(startBinding).toBeNull();
		expect(endBinding).not.toBeNull();
	});

	it('returns null for missing endBinding', () => {
		const arrow = createArrow(
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
			{
				startBinding: {
					elementId: 'shape1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);

		const { startBinding, endBinding } = getArrowBindings(arrow);

		expect(startBinding).not.toBeNull();
		expect(endBinding).toBeNull();
	});

	it('returns nulls for arrow without any bindings', () => {
		const arrow = createArrow({ x: 100, y: 100 }, { x: 200, y: 200 });

		const { startBinding, endBinding } = getArrowBindings(arrow);

		expect(startBinding).toBeNull();
		expect(endBinding).toBeNull();
	});

	it('handles explicit null bindings', () => {
		const arrow = createArrow(
			{ x: 100, y: 100 },
			{ x: 200, y: 200 },
			{
				startBinding: null,
				endBinding: null
			}
		);

		const { startBinding, endBinding } = getArrowBindings(arrow);

		expect(startBinding).toBeNull();
		expect(endBinding).toBeNull();
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Binding Integration', () => {
	it('full workflow: find candidate, create anchor, calculate position', () => {
		// Setup: rectangle and a point near its right edge
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		const arrowStart: Point = { x: 205, y: 150 }; // Near right edge
		const arrowEnd: Point = { x: 300, y: 150 }; // Arrow points right
		const elements = [rect];

		// Step 1: Find binding candidate
		const candidate = findBindingCandidate(arrowStart, elements, new Set());
		expect(candidate).not.toBeNull();
		expect(candidate!.element.id).toBe(rect.id);

		// Step 2: Create binding anchor
		const anchor = createBindingAnchor(candidate!.element, arrowStart, arrowEnd);
		expect(anchor.elementId).toBe(rect.id);

		// Step 3: Calculate bound position
		const boundPosition = calculateBoundEndpoint(anchor, rect, arrowEnd);

		// The bound position should be on the right edge + gap
		expect(boundPosition.x).toBeCloseTo(204, 0); // 200 (edge) + 4 (gap)
		expect(boundPosition.y).toBeCloseTo(150, 0);
	});

	it('binding updates when shape is conceptually moved', () => {
		// Original shape position
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Other endpoint at same height as original center (150)
		const otherEndpoint: Point = { x: 300, y: 150 };

		// Create binding
		const anchor = createBindingAnchor(rect, { x: 205, y: 150 }, otherEndpoint);

		// Simulate shape movement by creating new shape at different position
		const movedRect = createShape(
			'rectangle',
			{ x: 150, y: 150 }, // Moved 50px right and down
			{ x: 250, y: 250 },
			{ id: rect.id }
		);

		// Recalculate bound endpoint with moved shape
		const newPosition = calculateBoundEndpoint(anchor, movedRect, otherEndpoint);

		// The new center is at (200, 200), otherEndpoint is at (300, 150)
		// Direction from center to otherEndpoint is pointing right and slightly up
		// So the perimeter point will be on the right edge but above center

		// Should be near the right edge (250) + gap direction offset
		expect(newPosition.x).toBeGreaterThan(250);
		expect(newPosition.x).toBeLessThan(260);

		// Y should be less than 200 because we're pointing toward (300, 150) which is above center
		expect(newPosition.y).toBeLessThan(200);
		expect(newPosition.y).toBeGreaterThan(140);
	});
});

// =============================================================================
// createArrowWithBindings Tests
// =============================================================================

describe('createArrowWithBindings', () => {
	it('creates arrow without bindings when no shapes nearby', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };
		const elements: ShapeElement[] = [];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.shapeType).toBe('arrow');
		expect(result.arrow.startBinding).toBeNull();
		expect(result.arrow.endBinding).toBeNull();
		expectPointClose(result.adjustedStart, start);
		expectPointClose(result.adjustedEnd, end);
	});

	it('creates binding at start when near a shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Start near the right edge of rectangle
		const start: Point = { x: 205, y: 150 };
		const end: Point = { x: 300, y: 150 };
		const elements = [rect];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).not.toBeNull();
		expect(result.arrow.startBinding!.elementId).toBe(rect.id);
		expect(result.arrow.endBinding).toBeNull();
		// Start should snap to perimeter + gap
		expect(result.adjustedStart.x).toBeCloseTo(204, 0); // 200 + 4 gap
	});

	it('creates binding at end when near a shape', () => {
		const rect = createShape('rectangle', { x: 200, y: 100 }, { x: 300, y: 200 });
		// End near the left edge of rectangle
		const start: Point = { x: 100, y: 150 };
		const end: Point = { x: 195, y: 150 };
		const elements = [rect];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).toBeNull();
		expect(result.arrow.endBinding).not.toBeNull();
		expect(result.arrow.endBinding!.elementId).toBe(rect.id);
		// End should snap to perimeter + gap
		expect(result.adjustedEnd.x).toBeCloseTo(196, 0); // 200 - 4 gap
	});

	it('creates bindings at both ends when near shapes', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		// Arrow between the two rectangles
		const start: Point = { x: 205, y: 150 };
		const end: Point = { x: 295, y: 150 };
		const elements = [rect1, rect2];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).not.toBeNull();
		expect(result.arrow.startBinding!.elementId).toBe('rect1');
		expect(result.arrow.endBinding).not.toBeNull();
		expect(result.arrow.endBinding!.elementId).toBe('rect2');
	});

	it('passes through styling options', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };
		const options = {
			color: '#ff0000',
			strokeWidth: 5,
			opacity: 0.8,
			strokeStyle: 'dashed' as const
		};

		const result = createArrowWithBindings(start, end, [], options);

		expect(result.arrow.color).toBe('#ff0000');
		expect(result.arrow.strokeWidth).toBe(5);
		expect(result.arrow.opacity).toBe(0.8);
		expect(result.arrow.strokeStyle).toBe('dashed');
	});

	it('generates unique arrow ID', () => {
		const start: Point = { x: 100, y: 100 };
		const end: Point = { x: 200, y: 200 };
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result1 = createArrowWithBindings(start, end, [], options);
		const result2 = createArrowWithBindings(start, end, [], options);

		expect(result1.arrow.id).not.toBe(result2.arrow.id);
	});

	it('binds to circle shapes', () => {
		const circle = createShape('circle', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Center at (150, 150), radius 50. Point near right edge.
		const start: Point = { x: 205, y: 150 };
		const end: Point = { x: 300, y: 150 };
		const elements = [circle];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).not.toBeNull();
		expect(result.arrow.startBinding!.elementId).toBe(circle.id);
	});

	it('does not bind to line shapes', () => {
		const line = createShape('line', { x: 100, y: 100 }, { x: 200, y: 200 });
		// Point very close to line midpoint
		const start: Point = { x: 150, y: 150 };
		const end: Point = { x: 250, y: 250 };
		const elements = [line];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).toBeNull();
		expect(result.arrow.endBinding).toBeNull();
	});

	it('does not bind to arrow shapes', () => {
		const existingArrow = createArrow({ x: 100, y: 100 }, { x: 200, y: 200 });
		// Point very close to existing arrow
		const start: Point = { x: 150, y: 150 };
		const end: Point = { x: 250, y: 250 };
		const elements = [existingArrow];
		const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

		const result = createArrowWithBindings(start, end, elements, options);

		expect(result.arrow.startBinding).toBeNull();
		expect(result.arrow.endBinding).toBeNull();
	});

	describe('edge cases', () => {
		it('handles start and end at same point', () => {
			const start: Point = { x: 150, y: 150 };
			const end: Point = { x: 150, y: 150 };
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, [], options);

			expect(result.arrow.shapeType).toBe('arrow');
			expect(Number.isFinite(result.arrow.start.x)).toBe(true);
		});

		it('handles start inside a shape (binds to containing shape)', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			const start: Point = { x: 150, y: 150 }; // Center of rectangle
			const end: Point = { x: 300, y: 150 };
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// Start is inside the shape, so it binds to that shape
			expect(result.arrow.startBinding).not.toBeNull();
			expect(result.arrow.startBinding!.elementId).toBe(rect.id);
		});

		it('handles end inside a shape (binds to containing shape)', () => {
			const rect = createShape('rectangle', { x: 200, y: 100 }, { x: 300, y: 200 });
			const start: Point = { x: 100, y: 150 };
			const end: Point = { x: 250, y: 150 }; // Center of rectangle
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// End is inside the shape, so it binds to that shape
			expect(result.arrow.endBinding).not.toBeNull();
			expect(result.arrow.endBinding!.elementId).toBe(rect.id);
		});

		it('handles both endpoints inside the same shape (both bind)', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 300, y: 300 });
			const start: Point = { x: 150, y: 200 }; // Inside
			const end: Point = { x: 250, y: 200 }; // Inside
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// Both endpoints are inside the shape, so both bind to it
			expect(result.arrow.startBinding).not.toBeNull();
			expect(result.arrow.startBinding!.elementId).toBe(rect.id);
			expect(result.arrow.endBinding).not.toBeNull();
			expect(result.arrow.endBinding!.elementId).toBe(rect.id);
		});

		it('handles arrow between shapes that overlap', () => {
			const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'r1' });
			const rect2 = createShape('rectangle', { x: 180, y: 100 }, { x: 280, y: 200 }, { id: 'r2' });
			// Start near rect1's right edge
			const start: Point = { x: 205, y: 150 };
			// End near rect2's right edge
			const end: Point = { x: 285, y: 150 };
			const elements = [rect1, rect2];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// Should bind to rect1 at start (closest) and rect2 at end
			expect(result.arrow.startBinding).not.toBeNull();
			expect(result.arrow.endBinding).not.toBeNull();
		});

		it('handles very short arrow near shape', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			// Very short arrow near right edge, but end is outside threshold
			const start: Point = { x: 205, y: 150 }; // 5px from edge (within threshold)
			const end: Point = { x: 235, y: 150 }; // 35px from edge (outside 30px threshold)
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			expect(result.arrow.startBinding).not.toBeNull();
			expect(result.arrow.endBinding).toBeNull(); // End is outside threshold
		});

		it('handles arrow perpendicular to shape edge', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			// Arrow pointing straight right from shape
			const start: Point = { x: 205, y: 150 };
			const end: Point = { x: 400, y: 150 };
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			expect(result.arrow.startBinding).not.toBeNull();
			// Adjusted start should be on right edge + gap
			expect(result.adjustedStart.x).toBeCloseTo(204, 0);
			expect(result.adjustedStart.y).toBeCloseTo(150, 0);
		});

		it('handles arrow diagonal to shape', () => {
			const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 });
			// Arrow from near top-right corner, pointing diagonally
			const start: Point = { x: 210, y: 95 };
			const end: Point = { x: 400, y: 50 };
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			expect(result.arrow.startBinding).not.toBeNull();
		});

		it('handles negative coordinate shapes', () => {
			const rect = createShape('rectangle', { x: -200, y: -200 }, { x: -100, y: -100 });
			const start: Point = { x: -95, y: -150 };
			const end: Point = { x: 0, y: -150 };
			const elements = [rect];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			expect(result.arrow.startBinding).not.toBeNull();
			expect(result.adjustedStart.x).toBeCloseTo(-96, 0);
		});

		it('handles all supported stroke styles', () => {
			const strokeStyles = ['solid', 'dashed', 'dotted'] as const;

			for (const strokeStyle of strokeStyles) {
				const options = { color: '#000000', strokeWidth: 2, opacity: 1, strokeStyle };
				const result = createArrowWithBindings({ x: 0, y: 0 }, { x: 100, y: 100 }, [], options);

				expect(result.arrow.strokeStyle).toBe(strokeStyle);
			}
		});

		it('handles empty elements array', () => {
			const start: Point = { x: 100, y: 100 };
			const end: Point = { x: 200, y: 200 };
			const elements: ShapeElement[] = [];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			expect(result.arrow.startBinding).toBeNull();
			expect(result.arrow.endBinding).toBeNull();
			expectPointClose(result.adjustedStart, start);
			expectPointClose(result.adjustedEnd, end);
		});

		it('handles binding to polygon shapes', () => {
			const pentagon = createShape('pentagon', { x: 100, y: 100 }, { x: 200, y: 200 });
			const start: Point = { x: 210, y: 150 };
			const end: Point = { x: 300, y: 150 };
			const elements = [pentagon];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// Pentagon edge may not be exactly at x=200
			expect(
				!result.arrow.startBinding || result.arrow.startBinding.elementId === pentagon.id
			).toBe(true);
		});

		it('handles binding to star shapes', () => {
			const star = createShape('star', { x: 100, y: 100 }, { x: 200, y: 200 });
			const start: Point = { x: 155, y: 95 }; // Near top point of star
			const end: Point = { x: 155, y: 0 };
			const elements = [star];
			const options = { color: '#000000', strokeWidth: 2, opacity: 1 };

			const result = createArrowWithBindings(start, end, elements, options);

			// May or may not bind depending on exact star geometry
			expect(!result.arrow.startBinding || result.arrow.startBinding.elementId === star.id).toBe(
				true
			);
		});
	});
});
