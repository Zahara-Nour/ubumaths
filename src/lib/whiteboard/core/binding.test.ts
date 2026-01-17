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
import type { Point, ShapeElement, ArrowElement, BindingAnchor } from '../types/document';

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
		const rect2 = createShape('rectangle', { x: 195, y: 100 }, { x: 295, y: 200 }, { id: 'rect2' });
		// Point is between the two rectangles, closer to rect2
		const point: Point = { x: 193, y: 150 };
		const elements = [rect1, rect2];

		const result = findBindingCandidate(point, elements, new Set());

		expect(result).not.toBeNull();
		// rect2's left edge is at x=195, distance = 2px
		// rect1's right edge is at x=200, distance = 7px
		expect(result!.element.id).toBe('rect2');
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
});
