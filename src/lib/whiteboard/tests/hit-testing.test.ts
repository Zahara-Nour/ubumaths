/**
 * Tests for Hit Testing Module
 *
 * Hit testing is used for element selection on the whiteboard.
 */

import { describe, it, expect } from 'vitest';
import {
	hitTestStroke,
	hitTestShape,
	hitTestImage,
	hitTestTextBlock,
	hitTestElements,
	getElementBounds,
	pointToSegmentDistance
} from '../core/hit-testing';
import type {
	Point,
	StrokeElement,
	ShapeElement,
	ImageElement,
	TextBlockElement,
	WhiteboardElement,
	ArrowElement
} from '../types/document';

// =============================================================================
// Test Fixtures
// =============================================================================

function createStroke(points: Point[], width = 4): StrokeElement {
	return {
		id: 'stroke-1',
		type: 'stroke',
		toolType: 'pen',
		points,
		color: '#000000',
		width,
		opacity: 1
	};
}

function createShape(
	shapeType: ShapeElement['shapeType'],
	start: Point,
	end: Point,
	strokeWidth = 2
): ShapeElement {
	return {
		id: 'shape-1',
		type: 'shape',
		shapeType,
		start,
		end,
		color: '#000000',
		strokeWidth,
		opacity: 1
	};
}

function createImage(position: Point, width: number, height: number): ImageElement {
	return {
		id: 'image-1',
		type: 'image',
		position,
		width,
		height,
		src: 'data:image/png;base64,test'
	};
}

function createTextBlock(position: Point, width: number, height: number): TextBlockElement {
	return {
		id: 'textblock-1',
		type: 'textblock',
		position,
		width,
		height,
		markdownContent: 'Test content'
	};
}

// =============================================================================
// Point to Segment Distance
// =============================================================================

describe('pointToSegmentDistance', () => {
	it('calculates distance from point to segment when closest point is at start', () => {
		// Point at (0, 5), segment from (0, 0) to (10, 0)
		// Closest point is (0, 0)
		const distance = pointToSegmentDistance(0, 5, 0, 0, 10, 0);
		expect(distance).toBe(5);
	});

	it('calculates distance from point to segment when closest point is at end', () => {
		// Point at (10, 5), segment from (0, 0) to (10, 0)
		// Closest point is (10, 0)
		const distance = pointToSegmentDistance(10, 5, 0, 0, 10, 0);
		expect(distance).toBe(5);
	});

	it('calculates distance from point to segment when closest point is in the middle', () => {
		// Point at (5, 5), segment from (0, 0) to (10, 0)
		// Closest point is (5, 0), distance is 5
		const distance = pointToSegmentDistance(5, 5, 0, 0, 10, 0);
		expect(distance).toBe(5);
	});

	it('returns 0 when point is on the segment', () => {
		// Point at (5, 0), segment from (0, 0) to (10, 0)
		const distance = pointToSegmentDistance(5, 0, 0, 0, 10, 0);
		expect(distance).toBe(0);
	});

	it('handles segment as a point (zero length)', () => {
		// Point at (3, 4), segment is just (0, 0)
		const distance = pointToSegmentDistance(3, 4, 0, 0, 0, 0);
		expect(distance).toBe(5); // sqrt(3^2 + 4^2)
	});

	it('handles diagonal segments correctly', () => {
		// Point at (0, 0), segment from (1, 1) to (2, 2)
		// Distance from (0,0) to line y=x passing through (1,1) and (2,2)
		// Closest point on segment is (1, 1) since projection is before segment start
		const distance = pointToSegmentDistance(0, 0, 1, 1, 2, 2);
		expect(distance).toBeCloseTo(Math.sqrt(2), 5);
	});

	it('handles points beyond segment end', () => {
		// Point at (15, 0), segment from (0, 0) to (10, 0)
		// Closest point is (10, 0), distance is 5
		const distance = pointToSegmentDistance(15, 0, 0, 0, 10, 0);
		expect(distance).toBe(5);
	});

	it('handles points before segment start', () => {
		// Point at (-5, 0), segment from (0, 0) to (10, 0)
		// Closest point is (0, 0), distance is 5
		const distance = pointToSegmentDistance(-5, 0, 0, 0, 10, 0);
		expect(distance).toBe(5);
	});
});

// =============================================================================
// Hit Test Stroke
// =============================================================================

describe('hitTestStroke', () => {
	it('returns true when point is on a stroke segment', () => {
		const stroke = createStroke([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		]);
		const point: Point = { x: 50, y: 0 };

		expect(hitTestStroke(point, stroke)).toBe(true);
	});

	it('returns true when point is within stroke width', () => {
		const stroke = createStroke(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			],
			10
		); // width = 10, so radius = 5
		const point: Point = { x: 50, y: 4 }; // within 5 pixels

		expect(hitTestStroke(point, stroke)).toBe(true);
	});

	it('returns true when point is within tolerance', () => {
		const stroke = createStroke(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			],
			4
		); // width = 4, radius = 2
		const point: Point = { x: 50, y: 6 }; // 6px away, radius (2) + default tolerance (5) = 7

		expect(hitTestStroke(point, stroke)).toBe(true);
	});

	it('returns false when point is outside stroke and tolerance', () => {
		const stroke = createStroke(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			],
			4
		); // width = 4, radius = 2
		const point: Point = { x: 50, y: 10 }; // 10px away, radius (2) + default tolerance (5) = 7

		expect(hitTestStroke(point, stroke)).toBe(false);
	});

	it('handles custom tolerance', () => {
		const stroke = createStroke(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			],
			4
		); // width = 4, radius = 2
		const point: Point = { x: 50, y: 10 }; // 10px away

		expect(hitTestStroke(point, stroke, 8)).toBe(true); // 2 + 8 = 10
		expect(hitTestStroke(point, stroke, 7)).toBe(false); // 2 + 7 = 9
	});

	it('handles multi-segment strokes', () => {
		const stroke = createStroke([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 50 },
			{ x: 100, y: 50 }
		]);

		// Point near second segment
		expect(hitTestStroke({ x: 50, y: 25 }, stroke)).toBe(true);
		// Point near third segment
		expect(hitTestStroke({ x: 75, y: 50 }, stroke)).toBe(true);
		// Point far from all segments
		expect(hitTestStroke({ x: 25, y: 50 }, stroke)).toBe(false);
	});

	it('handles single-point stroke', () => {
		const stroke = createStroke([{ x: 50, y: 50 }], 10);

		expect(hitTestStroke({ x: 50, y: 50 }, stroke)).toBe(true);
		expect(hitTestStroke({ x: 55, y: 50 }, stroke)).toBe(true); // within radius
		expect(hitTestStroke({ x: 70, y: 50 }, stroke)).toBe(false); // outside
	});

	it('handles empty stroke', () => {
		const stroke = createStroke([]);

		expect(hitTestStroke({ x: 50, y: 50 }, stroke)).toBe(false);
	});
});

// =============================================================================
// Hit Test Shape
// =============================================================================

describe('hitTestShape', () => {
	it('returns true when point is inside rectangle bounds', () => {
		const shape = createShape('rectangle', { x: 10, y: 10 }, { x: 100, y: 100 });
		const point: Point = { x: 50, y: 50 };

		expect(hitTestShape(point, shape)).toBe(true);
	});

	it('returns true when point is on rectangle edge', () => {
		const shape = createShape('rectangle', { x: 10, y: 10 }, { x: 100, y: 100 });
		const point: Point = { x: 10, y: 50 };

		expect(hitTestShape(point, shape)).toBe(true);
	});

	it('returns true when point is within tolerance of rectangle', () => {
		const shape = createShape('rectangle', { x: 10, y: 10 }, { x: 100, y: 100 }, 2);
		const point: Point = { x: 5, y: 50 }; // 5px from edge, within tolerance

		expect(hitTestShape(point, shape)).toBe(true);
	});

	it('returns false when point is outside rectangle and tolerance', () => {
		const shape = createShape('rectangle', { x: 10, y: 10 }, { x: 100, y: 100 }, 2);
		const point: Point = { x: 0, y: 50 }; // 10px from edge

		expect(hitTestShape(point, shape)).toBe(false);
	});

	it('handles inverted coordinates (end before start)', () => {
		const shape = createShape('rectangle', { x: 100, y: 100 }, { x: 10, y: 10 });
		const point: Point = { x: 50, y: 50 };

		expect(hitTestShape(point, shape)).toBe(true);
	});

	it('handles line shape', () => {
		const shape = createShape('line', { x: 0, y: 0 }, { x: 100, y: 100 });

		// Point on the diagonal line
		expect(hitTestShape({ x: 50, y: 50 }, shape)).toBe(true);
		// Point near the line (within tolerance)
		expect(hitTestShape({ x: 48, y: 52 }, shape)).toBe(true);
		// Point far from the line (corner of bounding box but not on line)
		expect(hitTestShape({ x: 0, y: 100 }, shape)).toBe(false);
	});

	it('handles circle shape', () => {
		const shape = createShape('circle', { x: 0, y: 0 }, { x: 100, y: 100 });

		expect(hitTestShape({ x: 50, y: 50 }, shape)).toBe(true);
	});

	it('handles arrow shape', () => {
		const shape = createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 100 });

		expect(hitTestShape({ x: 50, y: 50 }, shape)).toBe(true);
	});

	it('handles sharp arrow type', () => {
		const shape: ArrowElement = {
			...(createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 0 }) as ArrowElement),
			arrowType: 'sharp'
		};

		// Point on the line
		expect(hitTestShape({ x: 50, y: 0 }, shape)).toBe(true);
		// Point far from the line
		expect(hitTestShape({ x: 50, y: 50 }, shape)).toBe(false);
	});

	it('handles curved arrow type', () => {
		const shape: ArrowElement = {
			...(createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 0 }) as ArrowElement),
			arrowType: 'curved',
			waypoints: [{ id: 'wp1', position: { x: 50, y: 30 } }]
		};

		// Point near the curve (which passes through the waypoint)
		expect(hitTestShape({ x: 50, y: 28 }, shape, 10)).toBe(true);
		// Point far from the curve
		expect(hitTestShape({ x: 50, y: 100 }, shape)).toBe(false);
	});

	it('handles elbow arrow type', () => {
		const shape: ArrowElement = {
			...(createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 100 }) as ArrowElement),
			arrowType: 'elbow',
			elbowDirection: 'horizontal-first'
		};

		// Point on horizontal segment
		expect(hitTestShape({ x: 50, y: 0 }, shape)).toBe(true);
		// Point on vertical segment
		expect(hitTestShape({ x: 100, y: 50 }, shape)).toBe(true);
		// Point far from both segments
		expect(hitTestShape({ x: 50, y: 50 }, shape)).toBe(false);
	});

	it('handles legacy elbowed flag', () => {
		const shape: ArrowElement = {
			...(createShape('arrow', { x: 0, y: 0 }, { x: 100, y: 100 }) as ArrowElement),
			elbowed: true,
			elbowDirection: 'vertical-first'
		};

		// Point on vertical segment
		expect(hitTestShape({ x: 0, y: 50 }, shape)).toBe(true);
		// Point on horizontal segment
		expect(hitTestShape({ x: 50, y: 100 }, shape)).toBe(true);
	});

	it('uses custom tolerance', () => {
		const shape = createShape('rectangle', { x: 10, y: 10 }, { x: 100, y: 100 }, 2);
		const point: Point = { x: 0, y: 50 }; // 10px from edge

		expect(hitTestShape(point, shape, 10)).toBe(true);
		expect(hitTestShape(point, shape, 5)).toBe(false);
	});
});

// =============================================================================
// Hit Test Image
// =============================================================================

describe('hitTestImage', () => {
	it('returns true when point is inside image bounds', () => {
		const image = createImage({ x: 10, y: 10 }, 100, 80);
		const point: Point = { x: 50, y: 50 };

		expect(hitTestImage(point, image)).toBe(true);
	});

	it('returns true when point is on image edge', () => {
		const image = createImage({ x: 10, y: 10 }, 100, 80);

		expect(hitTestImage({ x: 10, y: 10 }, image)).toBe(true); // top-left
		expect(hitTestImage({ x: 110, y: 90 }, image)).toBe(true); // bottom-right
	});

	it('returns false when point is outside image bounds (beyond tolerance)', () => {
		const image = createImage({ x: 10, y: 10 }, 100, 80);

		// Default tolerance is 5px, so need to be > 5px away from edge
		expect(hitTestImage({ x: 3, y: 50 }, image)).toBe(false); // left (> 5px from x:10)
		expect(hitTestImage({ x: 117, y: 50 }, image)).toBe(false); // right (> 5px from x:110)
		expect(hitTestImage({ x: 50, y: 3 }, image)).toBe(false); // top (> 5px from y:10)
		expect(hitTestImage({ x: 50, y: 97 }, image)).toBe(false); // bottom (> 5px from y:90)
	});
});

// =============================================================================
// Hit Test TextBlock
// =============================================================================

describe('hitTestTextBlock', () => {
	it('returns true when point is inside textblock bounds', () => {
		const textblock = createTextBlock({ x: 20, y: 20 }, 200, 100);
		const point: Point = { x: 100, y: 70 };

		expect(hitTestTextBlock(point, textblock)).toBe(true);
	});

	it('returns true when point is on textblock edge', () => {
		const textblock = createTextBlock({ x: 20, y: 20 }, 200, 100);

		expect(hitTestTextBlock({ x: 20, y: 20 }, textblock)).toBe(true); // top-left
		expect(hitTestTextBlock({ x: 220, y: 120 }, textblock)).toBe(true); // bottom-right
	});

	it('returns false when point is outside textblock bounds (beyond tolerance)', () => {
		const textblock = createTextBlock({ x: 20, y: 20 }, 200, 100);

		// Default tolerance is 5px, so need to be > 5px away from edge
		expect(hitTestTextBlock({ x: 13, y: 70 }, textblock)).toBe(false); // left (> 5px from x:20)
		expect(hitTestTextBlock({ x: 227, y: 70 }, textblock)).toBe(false); // right (> 5px from x:220)
	});
});

// =============================================================================
// Hit Test Elements (main function)
// =============================================================================

describe('hitTestElements', () => {
	it('returns null for empty elements array', () => {
		const result = hitTestElements({ x: 50, y: 50 }, []);

		expect(result).toBeNull();
	});

	it('returns null when point hits no elements', () => {
		const elements: WhiteboardElement[] = [
			createImage({ x: 100, y: 100 }, 50, 50),
			createTextBlock({ x: 200, y: 200 }, 50, 50)
		];

		const result = hitTestElements({ x: 0, y: 0 }, elements);

		expect(result).toBeNull();
	});

	it('returns the hit element info when point hits an element', () => {
		const elements: WhiteboardElement[] = [createImage({ x: 10, y: 10 }, 100, 100)];

		const result = hitTestElements({ x: 50, y: 50 }, elements);

		expect(result).toEqual({
			elementId: 'image-1',
			elementType: 'image'
		});
	});

	it('returns the topmost element when multiple elements overlap (reverse z-order)', () => {
		// Elements are rendered in order, so last element is on top
		const image1: ImageElement = { ...createImage({ x: 0, y: 0 }, 100, 100), id: 'bottom' };
		const image2: ImageElement = { ...createImage({ x: 50, y: 50 }, 100, 100), id: 'top' };

		const elements: WhiteboardElement[] = [image1, image2];

		// Point at (75, 75) hits both images, should return 'top' (last in array)
		const result = hitTestElements({ x: 75, y: 75 }, elements);

		expect(result).toEqual({
			elementId: 'top',
			elementType: 'image'
		});
	});

	it('handles mixed element types', () => {
		const elements: WhiteboardElement[] = [
			createStroke([
				{ x: 0, y: 0 },
				{ x: 100, y: 100 }
			]),
			createShape('rectangle', { x: 200, y: 200 }, { x: 300, y: 300 }),
			createImage({ x: 400, y: 400 }, 100, 100),
			createTextBlock({ x: 600, y: 600 }, 100, 100)
		];

		// Test stroke hit
		expect(hitTestElements({ x: 50, y: 50 }, elements)?.elementType).toBe('stroke');

		// Test shape hit
		expect(hitTestElements({ x: 250, y: 250 }, elements)?.elementType).toBe('shape');

		// Test image hit
		expect(hitTestElements({ x: 450, y: 450 }, elements)?.elementType).toBe('image');

		// Test textblock hit
		expect(hitTestElements({ x: 650, y: 650 }, elements)?.elementType).toBe('textblock');
	});

	it('uses custom tolerance', () => {
		const stroke = createStroke(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 }
			],
			4
		); // width = 4, radius = 2
		const elements: WhiteboardElement[] = [stroke];

		// Point at 10px away from stroke
		const point: Point = { x: 50, y: 10 };

		expect(hitTestElements(point, elements, 5)).toBeNull(); // 2 + 5 = 7 < 10
		expect(hitTestElements(point, elements, 8)).not.toBeNull(); // 2 + 8 = 10
	});
});

// =============================================================================
// Get Element Bounds
// =============================================================================

describe('getElementBounds', () => {
	it('calculates bounds for stroke element', () => {
		const stroke = createStroke(
			[
				{ x: 10, y: 20 },
				{ x: 100, y: 80 },
				{ x: 50, y: 150 }
			],
			10
		); // width = 10

		const bounds = getElementBounds(stroke);

		// min/max of points + width/2 (5px)
		expect(bounds.x).toBe(5); // 10 - 5
		expect(bounds.y).toBe(15); // 20 - 5
		expect(bounds.width).toBe(100); // (100 + 5) - (10 - 5)
		expect(bounds.height).toBe(140); // (150 + 5) - (20 - 5)
	});

	it('calculates bounds for shape element', () => {
		const shape = createShape('rectangle', { x: 10, y: 20 }, { x: 100, y: 80 }, 4);

		const bounds = getElementBounds(shape);

		// Uses calculateShapeBounds which includes strokeWidth/2
		expect(bounds.x).toBe(8); // 10 - 2
		expect(bounds.y).toBe(18); // 20 - 2
		expect(bounds.width).toBe(94); // (100 + 2) - (10 - 2)
		expect(bounds.height).toBe(64); // (80 + 2) - (20 - 2)
	});

	it('calculates bounds for image element', () => {
		const image = createImage({ x: 50, y: 60 }, 200, 150);

		const bounds = getElementBounds(image);

		expect(bounds.x).toBe(50);
		expect(bounds.y).toBe(60);
		expect(bounds.width).toBe(200);
		expect(bounds.height).toBe(150);
	});

	it('calculates bounds for textblock element', () => {
		const textblock = createTextBlock({ x: 30, y: 40 }, 180, 120);

		const bounds = getElementBounds(textblock);

		expect(bounds.x).toBe(30);
		expect(bounds.y).toBe(40);
		expect(bounds.width).toBe(180);
		expect(bounds.height).toBe(120);
	});

	it('handles empty stroke', () => {
		const stroke = createStroke([]);

		const bounds = getElementBounds(stroke);

		expect(bounds.x).toBe(0);
		expect(bounds.y).toBe(0);
		expect(bounds.width).toBe(0);
		expect(bounds.height).toBe(0);
	});

	it('handles single point stroke', () => {
		const stroke = createStroke([{ x: 50, y: 50 }], 10);

		const bounds = getElementBounds(stroke);

		expect(bounds.x).toBe(45); // 50 - 5
		expect(bounds.y).toBe(45); // 50 - 5
		expect(bounds.width).toBe(10); // 5 + 5
		expect(bounds.height).toBe(10); // 5 + 5
	});

	it('handles shape with inverted coordinates', () => {
		const shape = createShape('rectangle', { x: 100, y: 80 }, { x: 20, y: 30 }, 0);

		const bounds = getElementBounds(shape);

		expect(bounds.x).toBe(20);
		expect(bounds.y).toBe(30);
		expect(bounds.width).toBe(80);
		expect(bounds.height).toBe(50);
	});
});

// =============================================================================
// Rectangle Intersection
// =============================================================================

import {
	rectanglesIntersect,
	rectangleContains,
	getElementsInRect,
	type BoundingBox
} from '../core/hit-testing';

describe('rectanglesIntersect', () => {
	it('returns true for overlapping rectangles', () => {
		const rect1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const rect2: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };

		expect(rectanglesIntersect(rect1, rect2)).toBe(true);
	});

	it('returns true when one rectangle contains another', () => {
		const outer: BoundingBox = { x: 0, y: 0, width: 200, height: 200 };
		const inner: BoundingBox = { x: 50, y: 50, width: 50, height: 50 };

		expect(rectanglesIntersect(outer, inner)).toBe(true);
		expect(rectanglesIntersect(inner, outer)).toBe(true);
	});

	it('returns true for touching edges (inclusive)', () => {
		const rect1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const rect2: BoundingBox = { x: 100, y: 0, width: 100, height: 100 };

		expect(rectanglesIntersect(rect1, rect2)).toBe(true);
	});

	it('returns false for non-overlapping rectangles', () => {
		const rect1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const rect2: BoundingBox = { x: 200, y: 200, width: 100, height: 100 };

		expect(rectanglesIntersect(rect1, rect2)).toBe(false);
	});

	it('returns false when rectangles are close but not touching', () => {
		const rect1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const rect2: BoundingBox = { x: 101, y: 0, width: 100, height: 100 };

		expect(rectanglesIntersect(rect1, rect2)).toBe(false);
	});

	it('handles zero-size rectangles', () => {
		const rect1: BoundingBox = { x: 50, y: 50, width: 0, height: 0 };
		const rect2: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		// A point (zero-size rect) at 50,50 is inside rect2
		expect(rectanglesIntersect(rect1, rect2)).toBe(true);
	});
});

// =============================================================================
// Rectangle Contains
// =============================================================================

describe('rectangleContains', () => {
	it('returns true when contained rect is fully inside', () => {
		const container: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const contained: BoundingBox = { x: 10, y: 10, width: 30, height: 30 };

		expect(rectangleContains(container, contained)).toBe(true);
	});

	it('returns true when contained rect touches edges (inclusive)', () => {
		const container: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const contained: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		expect(rectangleContains(container, contained)).toBe(true);
	});

	it('returns false when contained rect partially overlaps', () => {
		const container: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const contained: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };

		expect(rectangleContains(container, contained)).toBe(false);
	});

	it('returns false when contained rect is outside', () => {
		const container: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const contained: BoundingBox = { x: 200, y: 200, width: 50, height: 50 };

		expect(rectangleContains(container, contained)).toBe(false);
	});

	it('returns false when contained rect extends past one edge', () => {
		const container: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
		const contained: BoundingBox = { x: 10, y: 10, width: 100, height: 30 }; // extends past right edge

		expect(rectangleContains(container, contained)).toBe(false);
	});
});

// =============================================================================
// Get Elements In Rectangle (Containment Mode)
// =============================================================================

describe('getElementsInRect', () => {
	it('returns empty array when no elements intersect', () => {
		const elements: WhiteboardElement[] = [
			createImage({ x: 200, y: 200 }, 50, 50),
			createImage({ x: 300, y: 300 }, 50, 50)
		];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(0);
	});

	it('returns all elements fully inside selection', () => {
		const img1: ImageElement = { ...createImage({ x: 10, y: 10 }, 30, 30), id: 'img1' };
		const img2: ImageElement = { ...createImage({ x: 50, y: 50 }, 30, 30), id: 'img2' };
		const elements: WhiteboardElement[] = [img1, img2];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(2);
		expect(result.map((e) => e.id)).toContain('img1');
		expect(result.map((e) => e.id)).toContain('img2');
	});

	it('does NOT return elements only partially inside (containment mode)', () => {
		const img1: ImageElement = { ...createImage({ x: 80, y: 80 }, 50, 50), id: 'img1' }; // partially inside
		const img2: ImageElement = { ...createImage({ x: 200, y: 200 }, 50, 50), id: 'img2' }; // outside
		const elements: WhiteboardElement[] = [img1, img2];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		// Neither element is fully contained
		expect(result).toHaveLength(0);
	});

	it('handles strokes correctly', () => {
		const stroke1 = {
			...createStroke([
				{ x: 10, y: 10 },
				{ x: 50, y: 50 }
			]),
			id: 'stroke1'
		};
		const stroke2 = {
			...createStroke([
				{ x: 200, y: 200 },
				{ x: 250, y: 250 }
			]),
			id: 'stroke2'
		};
		const elements: WhiteboardElement[] = [stroke1, stroke2];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('stroke1');
	});

	it('handles shapes correctly', () => {
		const shape1 = {
			...createShape('rectangle', { x: 10, y: 10 }, { x: 50, y: 50 }),
			id: 'shape1'
		};
		const shape2 = {
			...createShape('rectangle', { x: 200, y: 200 }, { x: 250, y: 250 }),
			id: 'shape2'
		};
		const elements: WhiteboardElement[] = [shape1, shape2];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('shape1');
	});

	it('handles textblocks correctly', () => {
		const textblock1 = { ...createTextBlock({ x: 10, y: 10 }, 40, 30), id: 'text1' };
		const textblock2 = { ...createTextBlock({ x: 200, y: 200 }, 40, 30), id: 'text2' };
		const elements: WhiteboardElement[] = [textblock1, textblock2];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('text1');
	});

	it('handles mixed element types', () => {
		const elements: WhiteboardElement[] = [
			{ ...createImage({ x: 10, y: 10 }, 30, 30), id: 'img' },
			{ ...createShape('rectangle', { x: 50, y: 50 }, { x: 80, y: 80 }), id: 'shape' },
			{
				...createStroke([
					{ x: 20, y: 60 },
					{ x: 60, y: 80 }
				]),
				id: 'stroke'
			},
			{ ...createTextBlock({ x: 200, y: 200 }, 50, 50), id: 'text-outside' }
		];
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, elements);

		expect(result).toHaveLength(3);
		expect(result.map((e) => e.id)).toContain('img');
		expect(result.map((e) => e.id)).toContain('shape');
		expect(result.map((e) => e.id)).toContain('stroke');
	});

	it('returns empty array for empty elements array', () => {
		const selectionRect: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

		const result = getElementsInRect(selectionRect, []);

		expect(result).toHaveLength(0);
	});
});
