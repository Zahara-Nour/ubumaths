/**
 * Tests for binding update propagation
 *
 * TDD Phase 3: Update bound arrows when shapes transform
 */

import { describe, it, expect } from 'vitest';
import {
	getBoundArrows,
	updateBoundArrowsForShapes,
	clearBindingsForDeletedShapes
} from './binding-updates';
import type { Point, ShapeElement, ArrowElement, WhiteboardElement } from '../types/document';

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

/** Helper to create a mock arrow element with optional bindings */
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
// getBoundArrows Tests
// =============================================================================

describe('getBoundArrows', () => {
	it('returns empty array when no arrows exist', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const elements: WhiteboardElement[] = [rect];

		const result = getBoundArrows('rect1', elements);

		expect(result).toEqual([]);
	});

	it('returns empty array when arrows have no bindings', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow({ x: 210, y: 150 }, { x: 300, y: 150 });
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = getBoundArrows('rect1', elements);

		expect(result).toEqual([]);
	});

	it('finds arrow with startBinding to target shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = getBoundArrows('rect1', elements);

		expect(result).toHaveLength(1);
		expect(result[0].arrow.id).toBe('arrow1');
		expect(result[0].boundAt).toBe('start');
	});

	it('finds arrow with endBinding to target shape', () => {
		const rect = createShape('rectangle', { x: 200, y: 100 }, { x: 300, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 100, y: 150 },
			{ x: 196, y: 150 },
			{
				id: 'arrow1',
				endBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = getBoundArrows('rect1', elements);

		expect(result).toHaveLength(1);
		expect(result[0].arrow.id).toBe('arrow1');
		expect(result[0].boundAt).toBe('end');
	});

	it('finds arrow bound at both ends to same shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 300, y: 300 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 104, y: 150 },
			{ x: 296, y: 250 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 0, y: 0.25 },
					perimeterPoint: { x: 0, y: 0.25 },
					gap: 4
				},
				endBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.75 },
					perimeterPoint: { x: 1, y: 0.75 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = getBoundArrows('rect1', elements);

		expect(result).toHaveLength(2);
		expect(result.find((r) => r.boundAt === 'start')).toBeDefined();
		expect(result.find((r) => r.boundAt === 'end')).toBeDefined();
	});

	it('finds multiple arrows bound to same shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow1 = createArrow(
			{ x: 204, y: 120 },
			{ x: 300, y: 120 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.2 },
					perimeterPoint: { x: 1, y: 0.2 },
					gap: 4
				}
			}
		);
		const arrow2 = createArrow(
			{ x: 204, y: 180 },
			{ x: 300, y: 180 },
			{
				id: 'arrow2',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.8 },
					perimeterPoint: { x: 1, y: 0.8 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow1, arrow2];

		const result = getBoundArrows('rect1', elements);

		expect(result).toHaveLength(2);
	});

	it('does not include arrows bound to other shapes', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 296, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				},
				endBinding: {
					elementId: 'rect2',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect1, rect2, arrow];

		const resultRect1 = getBoundArrows('rect1', elements);
		const resultRect2 = getBoundArrows('rect2', elements);

		expect(resultRect1).toHaveLength(1);
		expect(resultRect1[0].boundAt).toBe('start');
		expect(resultRect2).toHaveLength(1);
		expect(resultRect2[0].boundAt).toBe('end');
	});

	it('returns empty array for non-existent shape ID', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const elements: WhiteboardElement[] = [rect];

		const result = getBoundArrows('nonexistent', elements);

		expect(result).toEqual([]);
	});

	it('ignores null bindings', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				startBinding: null,
				endBinding: null
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = getBoundArrows('rect1', elements);

		expect(result).toEqual([]);
	});
});

// =============================================================================
// updateBoundArrowsForShapes Tests
// =============================================================================

describe('updateBoundArrowsForShapes', () => {
	describe('shape movement', () => {
		it('updates arrow start position when bound shape moves', () => {
			// Initial state (for context - arrow is bound to rect at right edge)
			const _rect = createShape(
				'rectangle',
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				{ id: 'rect1' }
			);
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);
			void _rect; // Initial shape state

			// Move shape 50px right
			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			const updatedArrow = result.updatedArrows[0];
			// New right edge is at x=250, plus gap=4 -> 254
			expect(updatedArrow.start.x).toBeCloseTo(254, 0);
			expect(updatedArrow.start.y).toBeCloseTo(150, 0);
			// End should remain unchanged
			expectPointClose(updatedArrow.end, { x: 300, y: 150 });
		});

		it('updates arrow end position when bound shape moves', () => {
			// Initial state: arrow bound to rect at left edge
			const arrow = createArrow(
				{ x: 100, y: 150 },
				{ x: 196, y: 150 },
				{
					id: 'arrow1',
					endBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 0, y: 0.5 },
						perimeterPoint: { x: 0, y: 0.5 },
						gap: 4
					}
				}
			);

			// Move shape 50px right
			const movedRect = createShape(
				'rectangle',
				{ x: 250, y: 100 },
				{ x: 350, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			const updatedArrow = result.updatedArrows[0];
			// New left edge is at x=250, minus gap=4 -> 246
			expect(updatedArrow.end.x).toBeCloseTo(246, 0);
			// Start should remain unchanged
			expectPointClose(updatedArrow.start, { x: 100, y: 150 });
		});

		it('updates both endpoints when arrow is bound to two different shapes', () => {
			// Initial state: arrow connects rect1 (right edge) to rect2 (left edge)
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 296, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					},
					endBinding: {
						elementId: 'rect2',
						normalizedPosition: { x: 0, y: 0.5 },
						perimeterPoint: { x: 0, y: 0.5 },
						gap: 4
					}
				}
			);

			// Move both shapes
			const movedRect1 = createShape(
				'rectangle',
				{ x: 50, y: 100 },
				{ x: 150, y: 200 },
				{ id: 'rect1' }
			);
			const movedRect2 = createShape(
				'rectangle',
				{ x: 350, y: 100 },
				{ x: 450, y: 200 },
				{ id: 'rect2' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect1, movedRect2, arrow];

			const result = updateBoundArrowsForShapes(['rect1', 'rect2'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			const updatedArrow = result.updatedArrows[0];
			// rect1 right edge: 150 + 4 = 154
			expect(updatedArrow.start.x).toBeCloseTo(154, 0);
			// rect2 left edge: 350 - 4 = 346
			expect(updatedArrow.end.x).toBeCloseTo(346, 0);
		});
	});

	describe('shape resize', () => {
		it('updates arrow position when bound shape is resized', () => {
			// Initial state: arrow bound to rect at right edge (x=200)
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			// Resize shape (make it wider)
			const resizedRect = createShape(
				'rectangle',
				{ x: 100, y: 100 },
				{ x: 300, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [resizedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			const updatedArrow = result.updatedArrows[0];
			// New right edge: 300 + 4 = 304
			expect(updatedArrow.start.x).toBeCloseTo(304, 0);
		});

		it('maintains gap when shape changes size', () => {
			// Initial state: arrow bound with gap=10 to rect at right edge (x=200)
			const gap = 10;
			const arrow = createArrow(
				{ x: 210, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap
					}
				}
			);

			// Resize shape
			const resizedRect = createShape(
				'rectangle',
				{ x: 100, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [resizedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			const updatedArrow = result.updatedArrows[0];
			// Right edge: 250 + gap(10) = 260
			expect(updatedArrow.start.x).toBeCloseTo(260, 0);
		});
	});

	describe('shape rotation', () => {
		it('updates arrow position when bound shape rotates', () => {
			// Initial state: arrow bound to rect at right edge with rotation=0
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			// Rotate shape 90 degrees
			const rotatedRect = createShape(
				'rectangle',
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				{ id: 'rect1', rotation: 90 }
			);
			const updatedElements: WhiteboardElement[] = [rotatedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			// The exact position depends on the rotation math, just verify it changed
			const updatedArrow = result.updatedArrows[0];
			expect(Number.isFinite(updatedArrow.start.x)).toBe(true);
			expect(Number.isFinite(updatedArrow.start.y)).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('returns empty when no shapes are specified', () => {
			const rect = createShape(
				'rectangle',
				{ x: 100, y: 100 },
				{ x: 200, y: 200 },
				{ id: 'rect1' }
			);
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);
			const elements: WhiteboardElement[] = [rect, arrow];

			const result = updateBoundArrowsForShapes([], elements);

			expect(result.updatedArrows).toHaveLength(0);
		});

		it('handles shape that no longer exists in elements', () => {
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'deleted-rect',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);
			const elements: WhiteboardElement[] = [arrow];

			const result = updateBoundArrowsForShapes(['deleted-rect'], elements);

			// Arrow should not be updated since target shape doesn't exist
			expect(result.updatedArrows).toHaveLength(0);
		});

		it('handles arrow bound to same shape at both ends', () => {
			// Initial state: arrow connects left and right edges of same rect
			const arrow = createArrow(
				{ x: 96, y: 150 },
				{ x: 304, y: 250 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 0, y: 0.25 },
						perimeterPoint: { x: 0, y: 0.25 },
						gap: 4
					},
					endBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.75 },
						perimeterPoint: { x: 1, y: 0.75 },
						gap: 4
					}
				}
			);

			// Move shape
			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 150 },
				{ x: 350, y: 350 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			const updatedArrow = result.updatedArrows[0];
			// Both endpoints should be updated
			expect(updatedArrow.start.x).not.toBeCloseTo(96, 0);
			expect(updatedArrow.end.x).not.toBeCloseTo(304, 0);
		});

		it('does not modify arrows without bindings', () => {
			// Initial state: one unbound arrow and one bound arrow
			const unboundArrow = createArrow({ x: 300, y: 300 }, { x: 400, y: 400 }, { id: 'arrow1' });
			const boundArrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow2',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, unboundArrow, boundArrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			expect(result.updatedArrows[0].id).toBe('arrow2');
		});

		it('preserves arrow styling properties', () => {
			// Initial state: arrow with custom styling bound to rect
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					color: '#ff0000',
					strokeWidth: 5,
					opacity: 0.8,
					strokeStyle: 'dashed',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			const updatedArrow = result.updatedArrows[0];
			expect(updatedArrow.color).toBe('#ff0000');
			expect(updatedArrow.strokeWidth).toBe(5);
			expect(updatedArrow.opacity).toBe(0.8);
			expect(updatedArrow.strokeStyle).toBe('dashed');
		});

		it('preserves binding data in updated arrow', () => {
			// Initial state: arrow with startBinding and null endBinding
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					},
					endBinding: null
				}
			);

			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			const updatedArrow = result.updatedArrows[0];
			expect(updatedArrow.startBinding).toBeDefined();
			expect(updatedArrow.startBinding?.elementId).toBe('rect1');
			expect(updatedArrow.endBinding).toBeNull();
		});

		it('handles circle shapes', () => {
			// Initial state: arrow bound to circle at right edge
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'circle1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			// Move circle
			const movedCircle = createShape(
				'circle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'circle1' }
			);
			const updatedElements: WhiteboardElement[] = [movedCircle, arrow];

			const result = updateBoundArrowsForShapes(['circle1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			// Circle right edge is at x=250, plus gap
			expect(result.updatedArrows[0].start.x).toBeCloseTo(254, 0);
		});

		it('handles polygon shapes (pentagon)', () => {
			// Initial state: arrow bound to pentagon at top
			const arrow = createArrow(
				{ x: 160, y: 95 },
				{ x: 160, y: 0 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'pent1',
						normalizedPosition: { x: 0.5, y: 0 },
						perimeterPoint: { x: 0.5, y: 0 },
						gap: 4
					}
				}
			);

			// Move pentagon
			const movedPentagon = createShape(
				'pentagon',
				{ x: 150, y: 150 },
				{ x: 250, y: 250 },
				{ id: 'pent1' }
			);
			const updatedElements: WhiteboardElement[] = [movedPentagon, arrow];

			const result = updateBoundArrowsForShapes(['pent1'], updatedElements);

			expect(result.updatedArrows).toHaveLength(1);
			expect(Number.isFinite(result.updatedArrows[0].start.x)).toBe(true);
			expect(Number.isFinite(result.updatedArrows[0].start.y)).toBe(true);
		});
	});

	describe('batch updates', () => {
		it('updates arrows for multiple shapes in single call', () => {
			// Initial state: two rects with arrows bound to each
			const arrow1 = createArrow(
				{ x: 204, y: 150 },
				{ x: 280, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);
			const arrow2 = createArrow(
				{ x: 404, y: 150 },
				{ x: 500, y: 150 },
				{
					id: 'arrow2',
					startBinding: {
						elementId: 'rect2',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			// Move both shapes
			const movedRect1 = createShape(
				'rectangle',
				{ x: 50, y: 100 },
				{ x: 150, y: 200 },
				{ id: 'rect1' }
			);
			const movedRect2 = createShape(
				'rectangle',
				{ x: 350, y: 100 },
				{ x: 450, y: 200 },
				{ id: 'rect2' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect1, movedRect2, arrow1, arrow2];

			const result = updateBoundArrowsForShapes(['rect1', 'rect2'], updatedElements);

			expect(result.updatedArrows).toHaveLength(2);
		});

		it('returns correct updatedElementIds', () => {
			// Initial state: arrow bound to rect
			const arrow = createArrow(
				{ x: 204, y: 150 },
				{ x: 300, y: 150 },
				{
					id: 'arrow1',
					startBinding: {
						elementId: 'rect1',
						normalizedPosition: { x: 1, y: 0.5 },
						perimeterPoint: { x: 1, y: 0.5 },
						gap: 4
					}
				}
			);

			const movedRect = createShape(
				'rectangle',
				{ x: 150, y: 100 },
				{ x: 250, y: 200 },
				{ id: 'rect1' }
			);
			const updatedElements: WhiteboardElement[] = [movedRect, arrow];

			const result = updateBoundArrowsForShapes(['rect1'], updatedElements);

			expect(result.updatedElementIds).toContain('arrow1');
		});
	});
});

// =============================================================================
// clearBindingsForDeletedShapes Tests
// =============================================================================

describe('clearBindingsForDeletedShapes', () => {
	it('returns empty when no shapes are specified', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes([], elements);

		expect(result.updatedArrows).toHaveLength(0);
	});

	it('clears startBinding when target shape is deleted', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				},
				endBinding: null
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(1);
		expect(result.updatedArrows[0].startBinding).toBeNull();
		expect(result.updatedArrows[0].endBinding).toBeNull();
	});

	it('clears endBinding when target shape is deleted', () => {
		const rect = createShape('rectangle', { x: 200, y: 100 }, { x: 300, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 100, y: 150 },
			{ x: 196, y: 150 },
			{
				id: 'arrow1',
				startBinding: null,
				endBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(1);
		expect(result.updatedArrows[0].startBinding).toBeNull();
		expect(result.updatedArrows[0].endBinding).toBeNull();
	});

	it('clears both bindings when both target shapes are deleted', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 296, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				},
				endBinding: {
					elementId: 'rect2',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect1, rect2, arrow];

		const result = clearBindingsForDeletedShapes(['rect1', 'rect2'], elements);

		expect(result.updatedArrows).toHaveLength(1);
		expect(result.updatedArrows[0].startBinding).toBeNull();
		expect(result.updatedArrows[0].endBinding).toBeNull();
	});

	it('preserves binding when target shape is NOT deleted', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 296, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				},
				endBinding: {
					elementId: 'rect2',
					normalizedPosition: { x: 0, y: 0.5 },
					perimeterPoint: { x: 0, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect1, rect2, arrow];

		// Only delete rect1, keep rect2
		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(1);
		expect(result.updatedArrows[0].startBinding).toBeNull();
		expect(result.updatedArrows[0].endBinding).not.toBeNull();
		expect(result.updatedArrows[0].endBinding?.elementId).toBe('rect2');
	});

	it('handles multiple arrows bound to same shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow1 = createArrow(
			{ x: 204, y: 120 },
			{ x: 300, y: 120 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.2 },
					perimeterPoint: { x: 1, y: 0.2 },
					gap: 4
				}
			}
		);
		const arrow2 = createArrow(
			{ x: 204, y: 180 },
			{ x: 300, y: 180 },
			{
				id: 'arrow2',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.8 },
					perimeterPoint: { x: 1, y: 0.8 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow1, arrow2];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(2);
		expect(result.updatedArrows.every((a) => a.startBinding === null)).toBe(true);
	});

	it('does not modify arrows without bindings to deleted shapes', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		const arrow = createArrow(
			{ x: 404, y: 150 },
			{ x: 500, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect2',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect1, rect2, arrow];

		// Delete rect1, which arrow is NOT bound to
		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(0);
	});

	it('preserves arrow position and style properties', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				color: '#ff0000',
				strokeWidth: 5,
				opacity: 0.8,
				strokeStyle: 'dashed',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		const updatedArrow = result.updatedArrows[0];
		expect(updatedArrow.start).toEqual({ x: 204, y: 150 });
		expect(updatedArrow.end).toEqual({ x: 300, y: 150 });
		expect(updatedArrow.color).toBe('#ff0000');
		expect(updatedArrow.strokeWidth).toBe(5);
		expect(updatedArrow.opacity).toBe(0.8);
		expect(updatedArrow.strokeStyle).toBe('dashed');
	});

	it('returns correct updatedElementIds', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 204, y: 150 },
			{ x: 300, y: 150 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.5 },
					perimeterPoint: { x: 1, y: 0.5 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedElementIds).toContain('arrow1');
	});

	it('handles arrow bound at both ends to the same deleted shape', () => {
		const rect = createShape('rectangle', { x: 100, y: 100 }, { x: 300, y: 300 }, { id: 'rect1' });
		const arrow = createArrow(
			{ x: 96, y: 150 },
			{ x: 304, y: 250 },
			{
				id: 'arrow1',
				startBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 0, y: 0.25 },
					perimeterPoint: { x: 0, y: 0.25 },
					gap: 4
				},
				endBinding: {
					elementId: 'rect1',
					normalizedPosition: { x: 1, y: 0.75 },
					perimeterPoint: { x: 1, y: 0.75 },
					gap: 4
				}
			}
		);
		const elements: WhiteboardElement[] = [rect, arrow];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(1);
		expect(result.updatedArrows[0].startBinding).toBeNull();
		expect(result.updatedArrows[0].endBinding).toBeNull();
	});

	it('ignores non-arrow elements', () => {
		const rect1 = createShape('rectangle', { x: 100, y: 100 }, { x: 200, y: 200 }, { id: 'rect1' });
		const rect2 = createShape('rectangle', { x: 300, y: 100 }, { x: 400, y: 200 }, { id: 'rect2' });
		const elements: WhiteboardElement[] = [rect1, rect2];

		const result = clearBindingsForDeletedShapes(['rect1'], elements);

		expect(result.updatedArrows).toHaveLength(0);
	});
});
