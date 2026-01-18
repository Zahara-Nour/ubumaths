/**
 * Hit Testing Module
 *
 * Functions for detecting if a point intersects with whiteboard elements.
 * Used for element selection on the whiteboard.
 *
 * @module whiteboard/core/hit-testing
 */

import {
	getArrowPoints,
	type Point,
	type WhiteboardElement,
	type StrokeElement,
	type ShapeElement,
	type ImageElement,
	type TextBlockElement,
	type GroupElement,
	type ArrowElement
} from '../types/document';
import { calculateShapeBounds } from './shapes';
import { hitTestCurvedPath } from './curved-path';

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
// Rotation Utilities
// =============================================================================

/**
 * Rotate a point around a center point by an angle in degrees.
 * Positive angle = clockwise rotation.
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
	if (angleDeg === 0) return point;

	const angleRad = (angleDeg * Math.PI) / 180;
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);
	const dx = point.x - center.x;
	const dy = point.y - center.y;

	return {
		x: center.x + dx * cos - dy * sin,
		y: center.y + dx * sin + dy * cos
	};
}

/**
 * Get the center point of a bounding box.
 */
export function getBoundsCenter(bounds: BoundingBox): Point {
	return {
		x: bounds.x + bounds.width / 2,
		y: bounds.y + bounds.height / 2
	};
}

/**
 * Calculate rotation angle from center to mouse position (in degrees).
 * Returns angle where 0° = right, 90° = down, etc.
 */
export function calculateAngleFromCenter(center: Point, mousePos: Point): number {
	const dx = mousePos.x - center.x;
	const dy = mousePos.y - center.y;
	// atan2 gives angle in radians from -PI to PI, convert to degrees
	const radians = Math.atan2(dy, dx);
	return (radians * 180) / Math.PI;
}

/**
 * Normalize angle to 0-360 range.
 */
export function normalizeAngle(angle: number): number {
	let normalized = angle % 360;
	if (normalized < 0) normalized += 360;
	return normalized;
}

/**
 * Snap angle to nearest increment (e.g., 15° for Shift key).
 */
export function snapAngle(angle: number, increment: number): number {
	return Math.round(angle / increment) * increment;
}

/**
 * Internal helper to calculate stroke bounds without rotation.
 * Used by hit-testing before the main getStrokeBounds function.
 */
function getStrokeBoundsInternal(stroke: StrokeElement): BoundingBox {
	const { points, width } = stroke;
	const padding = Number.isFinite(width) ? width / 2 : 0;

	if (points.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasValidPoint = false;

	for (const p of points) {
		// Skip invalid points (NaN, Infinity)
		if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
			continue;
		}
		hasValidPoint = true;
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}

	if (!hasValidPoint) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	return {
		x: minX - padding,
		y: minY - padding,
		width: maxX - minX + 2 * padding,
		height: maxY - minY + 2 * padding
	};
}

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
 * For rotated strokes, transforms the test point into local coordinate space.
 */
export function hitTestStroke(
	point: Point,
	stroke: StrokeElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	const { points, width, rotation = 0 } = stroke;
	const hitRadius = width / 2 + tolerance;

	// Handle empty stroke
	if (points.length === 0) {
		return false;
	}

	// Transform test point into local coordinate system if rotated
	let testPoint = point;
	if (rotation !== 0) {
		const bounds = getStrokeBoundsInternal(stroke);
		const center = getBoundsCenter(bounds);
		// Rotate test point in opposite direction to transform into local space
		testPoint = rotatePoint(point, center, -rotation);
	}

	// Handle single point stroke
	if (points.length === 1) {
		const p = points[0];
		const distance = Math.sqrt((testPoint.x - p.x) ** 2 + (testPoint.y - p.y) ** 2);
		return distance <= hitRadius;
	}

	// Check each segment
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];

		const distance = pointToSegmentDistance(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);

		if (distance <= hitRadius) {
			return true;
		}
	}

	return false;
}

/**
 * Test if a point hits a shape element.
 *
 * For lines and arrows, uses path-based hit testing along the actual path.
 * For other shapes, uses bounding box plus tolerance.
 * For rotated shapes, transforms the test point into local coordinate space.
 */
export function hitTestShape(
	point: Point,
	shape: ShapeElement,
	tolerance: number = DEFAULT_TOLERANCE,
	liveElbowPoints?: Map<string, readonly Point[]>
): boolean {
	const bounds = calculateShapeBounds(shape.shapeType, shape.start, shape.end, shape.strokeWidth);
	const rotation = shape.rotation ?? 0;

	// Transform test point into local coordinate system if rotated
	let testPoint = point;
	if (rotation !== 0) {
		const center = {
			x: (bounds.minX + bounds.maxX) / 2,
			y: (bounds.minY + bounds.maxY) / 2
		};
		// Rotate test point in opposite direction to transform into local space
		testPoint = rotatePoint(point, center, -rotation);
	}

	// For lines and arrows, use path-based hit testing
	if (shape.shapeType === 'line' || shape.shapeType === 'arrow') {
		// Adjust tolerance based on stroke width
		const hitTolerance = Math.max(tolerance, shape.strokeWidth / 2 + 2);

		// Check if this is an arrow with special path type
		if (shape.shapeType === 'arrow') {
			const arrowShape = shape as ArrowElement;
			const effectiveArrowType = arrowShape.arrowType ?? (arrowShape.elbowed ? 'elbow' : 'sharp');

			if (effectiveArrowType === 'curved') {
				// Use curved path hit testing
				return hitTestCurvedPath(
					shape.start,
					shape.end,
					arrowShape.waypoints ?? [],
					testPoint,
					hitTolerance
				);
			} else if (effectiveArrowType === 'elbow') {
				// Use live points if available, otherwise use stored points
				const points = liveElbowPoints?.get(arrowShape.id) ?? getArrowPoints(arrowShape);
				return hitTestPolyline(points, testPoint, hitTolerance);
			}
		}

		// Sharp/straight line - use simple line segment hit test
		return hitTestLineSegment(shape.start, shape.end, testPoint, hitTolerance);
	}

	// For other shapes, use bounding box
	return (
		testPoint.x >= bounds.minX - tolerance &&
		testPoint.x <= bounds.maxX + tolerance &&
		testPoint.y >= bounds.minY - tolerance &&
		testPoint.y <= bounds.maxY + tolerance
	);
}

/**
 * Test if a point is within tolerance of a line segment.
 */
function hitTestLineSegment(start: Point, end: Point, point: Point, tolerance: number): boolean {
	const distance = distanceToLineSegment(point, start, end);
	return distance <= tolerance;
}

/**
 * Calculate the distance from a point to a line segment.
 */
function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
	const dx = lineEnd.x - lineStart.x;
	const dy = lineEnd.y - lineStart.y;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		// Line segment is a point
		return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
	}

	// Project point onto line, clamped to [0, 1]
	const t = Math.max(
		0,
		Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared)
	);

	const closestX = lineStart.x + t * dx;
	const closestY = lineStart.y + t * dy;

	return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
}

/**
 * Test if a point is within tolerance of a polyline (array of points).
 * Used for elbow arrows with A* routed paths.
 */
function hitTestPolyline(points: readonly Point[], testPoint: Point, tolerance: number): boolean {
	if (points.length < 2) return false;

	for (let i = 0; i < points.length - 1; i++) {
		const distance = distanceToLineSegment(testPoint, points[i], points[i + 1]);
		if (distance <= tolerance) {
			return true;
		}
	}

	return false;
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
 * Test if a point hits a group element.
 *
 * Tests all children and returns true if any child is hit.
 */
export function hitTestGroup(
	point: Point,
	group: GroupElement,
	tolerance: number = DEFAULT_TOLERANCE
): boolean {
	// Test each child element
	for (const child of group.children) {
		let hit = false;
		switch (child.type) {
			case 'stroke':
				hit = hitTestStroke(point, child, tolerance);
				break;
			case 'shape':
				hit = hitTestShape(point, child, tolerance);
				break;
			case 'image':
				hit = hitTestImage(point, child, tolerance);
				break;
			case 'textblock':
				hit = hitTestTextBlock(point, child, tolerance);
				break;
			case 'group':
				hit = hitTestGroup(point, child, tolerance);
				break;
		}
		if (hit) return true;
	}
	return false;
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
	tolerance: number = DEFAULT_TOLERANCE,
	liveElbowPoints?: Map<string, readonly Point[]>
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
				hit = hitTestShape(point, element, tolerance, liveElbowPoints);
				break;
			case 'image':
				hit = hitTestImage(point, element, tolerance);
				break;
			case 'textblock':
				hit = hitTestTextBlock(point, element, tolerance);
				break;
			case 'group':
				hit = hitTestGroup(point, element, tolerance);
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
		case 'group':
			return getGroupBounds(element);
	}
}

/**
 * Calculate bounding box for a stroke element.
 */
function getStrokeBounds(stroke: StrokeElement): BoundingBox {
	const { points, width } = stroke;
	const padding = Number.isFinite(width) ? width / 2 : 0;

	// Handle empty stroke
	if (points.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	// Find min/max coordinates, skipping invalid points
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasValidPoint = false;

	for (const p of points) {
		// Skip invalid points (NaN, Infinity)
		if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
			continue;
		}
		hasValidPoint = true;
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}

	if (!hasValidPoint) {
		return { x: 0, y: 0, width: 0, height: 0 };
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

/**
 * Calculate bounding box for a group element.
 * Returns the smallest box that contains all children.
 */
function getGroupBounds(group: GroupElement): BoundingBox {
	if (group.children.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	// Get bounds of first child
	const firstBounds = getElementBounds(group.children[0]);
	let minX = firstBounds.x;
	let minY = firstBounds.y;
	let maxX = firstBounds.x + firstBounds.width;
	let maxY = firstBounds.y + firstBounds.height;

	// Expand to include all other children
	for (let i = 1; i < group.children.length; i++) {
		const childBounds = getElementBounds(group.children[i]);
		minX = Math.min(minX, childBounds.x);
		minY = Math.min(minY, childBounds.y);
		maxX = Math.max(maxX, childBounds.x + childBounds.width);
		maxY = Math.max(maxY, childBounds.y + childBounds.height);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
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
 * Test if rect2 is fully contained within rect1.
 */
export function rectangleContains(container: BoundingBox, contained: BoundingBox): boolean {
	return (
		contained.x >= container.x &&
		contained.y >= container.y &&
		contained.x + contained.width <= container.x + container.width &&
		contained.y + contained.height <= container.y + container.height
	);
}

/**
 * Get all elements fully contained within a selection rectangle.
 *
 * Returns elements whose bounding boxes are entirely inside the selection rect.
 * Used for marquee selection (drag to select multiple elements).
 * This is the default mode - only selects elements fully inside the rectangle.
 */
export function getElementsInRect(
	selectionRect: BoundingBox,
	elements: readonly WhiteboardElement[]
): WhiteboardElement[] {
	return elements.filter((element) => {
		const elementBounds = getElementBounds(element);
		return rectangleContains(selectionRect, elementBounds);
	});
}

/**
 * Get all elements that intersect with a selection rectangle.
 *
 * Returns elements whose bounding boxes touch or overlap the selection rect.
 * Used for marquee selection with Alt modifier (intersection mode).
 */
export function getElementsIntersectingRect(
	selectionRect: BoundingBox,
	elements: readonly WhiteboardElement[]
): WhiteboardElement[] {
	return elements.filter((element) => {
		const elementBounds = getElementBounds(element);
		return rectanglesIntersect(selectionRect, elementBounds);
	});
}
