/**
 * Hit Testing Module
 *
 * Functions for detecting if a point intersects with whiteboard elements.
 * Used for element selection on the whiteboard.
 *
 * @module whiteboard/core/hit-testing
 */

import type {
	Point,
	WhiteboardElement,
	StrokeElement,
	ShapeElement,
	ImageElement,
	TextBlockElement
} from '../types/document';
import { calculateShapeBounds } from './shapes';

// =============================================================================
// Types
// =============================================================================

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface HitTestResult {
	elementId: string;
	elementType: WhiteboardElement['type'];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TOLERANCE = 5;

// =============================================================================
// Geometry Utilities
// =============================================================================

/**
 * Calculate the distance from a point to a line segment.
 *
 * Uses vector projection to find the closest point on the segment,
 * clamped to the segment endpoints.
 */
export function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		// Segment is a point
		return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	}

	// Project point onto line, clamped to [0,1]
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));

	// Find closest point on segment
	const closestX = x1 + t * dx;
	const closestY = y1 + t * dy;

	return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

// =============================================================================
// Hit Test Functions
// =============================================================================

/**
 * Test if a point hits a stroke element.
 *
 * Iterates through all segments of the stroke and checks if the distance
 * from the point to any segment is within the stroke's width plus tolerance.
 */
export function hitTestStroke(
	point: Point,
	stroke: StrokeElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	const { points, width } = stroke;
	const hitRadius = width / 2 + tolerance;

	// Handle empty stroke
	if (points.length === 0) {
		return false;
	}

	// Handle single point stroke
	if (points.length === 1) {
		const p = points[0];
		const distance = Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2);
		return distance <= hitRadius;
	}

	// Check each segment
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];

		const distance = pointToSegmentDistance(point.x, point.y, p1.x, p1.y, p2.x, p2.y);

		if (distance <= hitRadius) {
			return true;
		}
	}

	return false;
}

/**
 * Test if a point hits a shape element.
 *
 * Uses the shape's bounding box plus tolerance for hit detection.
 */
export function hitTestShape(
	point: Point,
	shape: ShapeElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	const bounds = calculateShapeBounds(shape.shapeType, shape.start, shape.end, shape.strokeWidth);

	return (
		point.x >= bounds.minX - tolerance &&
		point.x <= bounds.maxX + tolerance &&
		point.y >= bounds.minY - tolerance &&
		point.y <= bounds.maxY + tolerance
	);
}

/**
 * Test if a point hits an image element.
 *
 * Point-in-rect test with tolerance margin.
 */
export function hitTestImage(
	point: Point,
	image: ImageElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	const { position, width, height } = image;

	return (
		point.x >= position.x - tolerance &&
		point.x <= position.x + width + tolerance &&
		point.y >= position.y - tolerance &&
		point.y <= position.y + height + tolerance
	);
}

/**
 * Test if a point hits a textblock element.
 *
 * Point-in-rect test with tolerance margin.
 */
export function hitTestTextBlock(
	point: Point,
	textblock: TextBlockElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	const { position, width, height } = textblock;

	return (
		point.x >= position.x - tolerance &&
		point.x <= position.x + width + tolerance &&
		point.y >= position.y - tolerance &&
		point.y <= position.y + height + tolerance
	);
}

/**
 * Test a point against all elements and return the topmost hit.
 *
 * Elements are tested in reverse order (last element first) because
 * later elements are rendered on top in z-order.
 */
export function hitTestElements(
	point: Point,
	elements: readonly WhiteboardElement[],
	tolerance: number = DEFAULT_TOLERANCE
): HitTestResult | null {
	// Iterate in reverse to check topmost elements first
	for (let i = elements.length - 1; i >= 0; i--) {
		const element = elements[i];
		let hit = false;

		switch (element.type) {
			case 'stroke':
				hit = hitTestStroke(point, element, tolerance);
				break;
			case 'shape':
				hit = hitTestShape(point, element, tolerance);
				break;
			case 'image':
				hit = hitTestImage(point, element, tolerance);
				break;
			case 'textblock':
				hit = hitTestTextBlock(point, element, tolerance);
				break;
		}

		if (hit) {
			return {
				elementId: element.id,
				elementType: element.type
			};
		}
	}

	return null;
}

// =============================================================================
// Bounds Calculation
// =============================================================================

/**
 * Calculate the bounding box for any whiteboard element.
 */
export function getElementBounds(element: WhiteboardElement): BoundingBox {
	switch (element.type) {
		case 'stroke':
			return getStrokeBounds(element);
		case 'shape':
			return getShapeBounds(element);
		case 'image':
			return getImageBounds(element);
		case 'textblock':
			return getTextBlockBounds(element);
	}
}

/**
 * Calculate bounding box for a stroke element.
 */
function getStrokeBounds(stroke: StrokeElement): BoundingBox {
	const { points, width } = stroke;
	const padding = width / 2;

	// Handle empty stroke
	if (points.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	// Find min/max coordinates
	let minX = points[0].x;
	let minY = points[0].y;
	let maxX = points[0].x;
	let maxY = points[0].y;

	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}

	// Apply padding for stroke width
	const x = minX - padding;
	const y = minY - padding;
	const boundsWidth = maxX - minX + 2 * padding;
	const boundsHeight = maxY - minY + 2 * padding;

	return { x, y, width: boundsWidth, height: boundsHeight };
}

/**
 * Calculate bounding box for a shape element.
 */
function getShapeBounds(shape: ShapeElement): BoundingBox {
	const bounds = calculateShapeBounds(shape.shapeType, shape.start, shape.end, shape.strokeWidth);

	return {
		x: bounds.minX,
		y: bounds.minY,
		width: bounds.maxX - bounds.minX,
		height: bounds.maxY - bounds.minY
	};
}

/**
 * Calculate bounding box for an image element.
 */
function getImageBounds(image: ImageElement): BoundingBox {
	return {
		x: image.position.x,
		y: image.position.y,
		width: image.width,
		height: image.height
	};
}

/**
 * Calculate bounding box for a textblock element.
 */
function getTextBlockBounds(textblock: TextBlockElement): BoundingBox {
	return {
		x: textblock.position.x,
		y: textblock.position.y,
		width: textblock.width,
		height: textblock.height
	};
}

// =============================================================================
// Rectangle Intersection (for marquee selection)
// =============================================================================

/**
 * Test if two rectangles intersect (inclusive of edges).
 *
 * Used for marquee/rectangle selection to determine which elements
 * fall within the selection area.
 */
export function rectanglesIntersect(rect1: BoundingBox, rect2: BoundingBox): boolean {
	// Calculate right and bottom edges
	const r1Right = rect1.x + rect1.width;
	const r1Bottom = rect1.y + rect1.height;
	const r2Right = rect2.x + rect2.width;
	const r2Bottom = rect2.y + rect2.height;

	// Two rectangles intersect if they overlap on both axes
	// Using <= for inclusive edges (touching counts as intersection)
	return rect1.x <= r2Right && r1Right >= rect2.x && rect1.y <= r2Bottom && r1Bottom >= rect2.y;
}

/**
 * Get all elements that intersect with a selection rectangle.
 *
 * Returns elements whose bounding boxes intersect with the selection rect.
 * Used for marquee selection (drag to select multiple elements).
 */
export function getElementsInRect(
	selectionRect: BoundingBox,
	elements: readonly WhiteboardElement[]
): WhiteboardElement[] {
	return elements.filter((element) => {
		const elementBounds = getElementBounds(element);
		return rectanglesIntersect(selectionRect, elementBounds);
	});
}
