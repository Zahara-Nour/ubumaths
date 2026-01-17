/**
 * Binding Geometry Calculations
 *
 * Provides geometric calculations for arrow-to-shape binding system.
 * Includes point normalization, rotation, and perimeter intersection algorithms.
 *
 * @module whiteboard/core/binding-geometry
 */

import type { Point, ShapeElement } from '../types/document';

// =============================================================================
// Types
// =============================================================================

/** Bounding box representation */
export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** 2D Vector for direction calculations */
interface Vector {
	x: number;
	y: number;
}

// =============================================================================
// Point Normalization
// =============================================================================

/**
 * Converts an absolute point to normalized coordinates (0-1) within a bounding box.
 *
 * @param point - Absolute point coordinates
 * @param bounds - Bounding box to normalize within
 * @returns Point with coordinates in range [0,1] (or outside if point is outside bounds)
 */
export function normalizePoint(point: Point, bounds: BoundingBox): Point {
	// Guard against zero-dimension bounds to prevent Infinity/NaN
	const width = bounds.width || 1;
	const height = bounds.height || 1;

	return {
		x: (point.x - bounds.x) / width,
		y: (point.y - bounds.y) / height
	};
}

/**
 * Converts a normalized point (0-1) back to absolute coordinates.
 *
 * @param normalized - Point with normalized coordinates
 * @param bounds - Bounding box to denormalize within
 * @returns Point with absolute coordinates
 */
export function denormalizePoint(normalized: Point, bounds: BoundingBox): Point {
	return {
		x: bounds.x + normalized.x * bounds.width,
		y: bounds.y + normalized.y * bounds.height
	};
}

// =============================================================================
// Rotation
// =============================================================================

/**
 * Rotates a point around a center point by a given angle.
 *
 * @param point - Point to rotate
 * @param center - Center of rotation
 * @param angleDegrees - Rotation angle in degrees (clockwise)
 * @returns Rotated point
 */
export function rotatePointAroundCenter(point: Point, center: Point, angleDegrees: number): Point {
	const angleRadians = (angleDegrees * Math.PI) / 180;
	const cos = Math.cos(angleRadians);
	const sin = Math.sin(angleRadians);

	// Translate point to origin (relative to center)
	const dx = point.x - center.x;
	const dy = point.y - center.y;

	// Rotate
	const rotatedX = dx * cos - dy * sin;
	const rotatedY = dx * sin + dy * cos;

	// Translate back
	return {
		x: rotatedX + center.x,
		y: rotatedY + center.y
	};
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the bounding box of a shape element.
 */
export function getShapeBounds(shape: ShapeElement): BoundingBox {
	const minX = Math.min(shape.start.x, shape.end.x);
	const minY = Math.min(shape.start.y, shape.end.y);
	const maxX = Math.max(shape.start.x, shape.end.x);
	const maxY = Math.max(shape.start.y, shape.end.y);

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}

/**
 * Gets the center point of a bounding box.
 */
export function getBoundsCenter(bounds: BoundingBox): Point {
	return {
		x: bounds.x + bounds.width / 2,
		y: bounds.y + bounds.height / 2
	};
}

/**
 * Gets the center point of a shape element.
 */
export function getShapeCenter(shape: ShapeElement): Point {
	return getBoundsCenter(getShapeBounds(shape));
}

/**
 * Normalizes a vector to unit length.
 */
function normalizeVector(v: Vector): Vector {
	const length = Math.sqrt(v.x * v.x + v.y * v.y);
	if (length === 0) {
		return { x: 1, y: 0 }; // Default direction: right
	}
	return {
		x: v.x / length,
		y: v.y / length
	};
}

/**
 * Gets the direction vector from center to a point.
 */
function getDirectionFromCenter(center: Point, fromPoint: Point): Vector {
	return normalizeVector({
		x: fromPoint.x - center.x,
		y: fromPoint.y - center.y
	});
}

// =============================================================================
// Rectangle Perimeter
// =============================================================================

/**
 * Finds the point on a rectangle's perimeter closest to an external point.
 * Uses ray-casting from rectangle center toward the external point.
 *
 * @param bounds - Rectangle bounding box
 * @param fromPoint - External point to find closest perimeter point to
 * @param cornerRadius - Optional corner radius for rounded rectangles
 * @returns Point on the rectangle perimeter
 */
export function getRectanglePerimeterPoint(
	bounds: BoundingBox,
	fromPoint: Point,
	cornerRadius: number = 0
): Point {
	const center = getBoundsCenter(bounds);
	const direction = getDirectionFromCenter(center, fromPoint);

	const halfW = bounds.width / 2;
	const halfH = bounds.height / 2;

	// Handle edge case: fromPoint is at center
	if (direction.x === 0 && direction.y === 0) {
		// Default to right edge
		return { x: center.x + halfW, y: center.y };
	}

	// Find intersection with rectangle edges
	let t = Infinity;
	let intersectionPoint: Point = { x: center.x + halfW, y: center.y };

	// Right edge (x = center.x + halfW)
	if (direction.x > 0) {
		const tRight = halfW / direction.x;
		const yAtRight = direction.y * tRight;
		if (Math.abs(yAtRight) <= halfH && tRight < t) {
			t = tRight;
			intersectionPoint = { x: center.x + halfW, y: center.y + yAtRight };
		}
	}

	// Left edge (x = center.x - halfW)
	if (direction.x < 0) {
		const tLeft = -halfW / direction.x;
		const yAtLeft = direction.y * tLeft;
		if (Math.abs(yAtLeft) <= halfH && tLeft < t) {
			t = tLeft;
			intersectionPoint = { x: center.x - halfW, y: center.y + yAtLeft };
		}
	}

	// Bottom edge (y = center.y + halfH)
	if (direction.y > 0) {
		const tBottom = halfH / direction.y;
		const xAtBottom = direction.x * tBottom;
		if (Math.abs(xAtBottom) <= halfW && tBottom < t) {
			t = tBottom;
			intersectionPoint = { x: center.x + xAtBottom, y: center.y + halfH };
		}
	}

	// Top edge (y = center.y - halfH)
	if (direction.y < 0) {
		const tTop = -halfH / direction.y;
		const xAtTop = direction.x * tTop;
		if (Math.abs(xAtTop) <= halfW && tTop < t) {
			t = tTop;
			intersectionPoint = { x: center.x + xAtTop, y: center.y - halfH };
		}
	}

	// Handle corner radius if specified
	if (cornerRadius > 0) {
		intersectionPoint = adjustForCornerRadius(
			intersectionPoint,
			bounds,
			center,
			direction,
			cornerRadius
		);
	}

	return intersectionPoint;
}

/**
 * Adjusts intersection point for rounded corners.
 */
function adjustForCornerRadius(
	point: Point,
	bounds: BoundingBox,
	center: Point,
	direction: Vector,
	cornerRadius: number
): Point {
	const r = Math.min(cornerRadius, bounds.width / 2, bounds.height / 2);

	// Define corner regions
	const corners = [
		{ x: bounds.x + r, y: bounds.y + r }, // Top-left
		{ x: bounds.x + bounds.width - r, y: bounds.y + r }, // Top-right
		{ x: bounds.x + bounds.width - r, y: bounds.y + bounds.height - r }, // Bottom-right
		{ x: bounds.x + r, y: bounds.y + bounds.height - r } // Bottom-left
	];

	// Check if point is in a corner region
	for (const cornerCenter of corners) {
		const dx = point.x - cornerCenter.x;
		const dy = point.y - cornerCenter.y;

		// Determine if we're in the corner quadrant
		const inCornerX =
			(cornerCenter.x < center.x && point.x < cornerCenter.x) ||
			(cornerCenter.x > center.x && point.x > cornerCenter.x);
		const inCornerY =
			(cornerCenter.y < center.y && point.y < cornerCenter.y) ||
			(cornerCenter.y > center.y && point.y > cornerCenter.y);

		if (inCornerX && inCornerY) {
			// Project onto the corner arc
			const distFromCornerCenter = Math.sqrt(dx * dx + dy * dy);
			if (distFromCornerCenter > 0) {
				return {
					x: cornerCenter.x + (dx / distFromCornerCenter) * r,
					y: cornerCenter.y + (dy / distFromCornerCenter) * r
				};
			}
		}
	}

	return point;
}

// =============================================================================
// Ellipse Perimeter
// =============================================================================

/**
 * Finds the point on an ellipse's perimeter closest to an external point.
 * Uses parametric ellipse equation to find intersection.
 *
 * @param bounds - Ellipse bounding box (ellipse inscribed in this box)
 * @param fromPoint - External point to find closest perimeter point to
 * @returns Point on the ellipse perimeter
 */
export function getEllipsePerimeterPoint(bounds: BoundingBox, fromPoint: Point): Point {
	const center = getBoundsCenter(bounds);
	const a = bounds.width / 2; // Semi-major axis (horizontal)
	const b = bounds.height / 2; // Semi-minor axis (vertical)

	// Direction from center to fromPoint
	const dx = fromPoint.x - center.x;
	const dy = fromPoint.y - center.y;

	// Handle edge case: fromPoint is at center
	if (dx === 0 && dy === 0) {
		// Default to right side of ellipse
		return { x: center.x + a, y: center.y };
	}

	// Calculate angle for ellipse parametric equation
	// We need to find θ such that the direction from center through (a*cos(θ), b*sin(θ))
	// matches the direction to fromPoint
	const angle = Math.atan2(dy * a, dx * b);

	return {
		x: center.x + a * Math.cos(angle),
		y: center.y + b * Math.sin(angle)
	};
}

// =============================================================================
// Polygon Perimeter
// =============================================================================

/**
 * Finds the point on a polygon's perimeter closest to an external point.
 * Uses ray-casting from polygon center toward the external point.
 *
 * @param vertices - Polygon vertices in order (clockwise or counter-clockwise)
 * @param center - Polygon center point
 * @param fromPoint - External point to find closest perimeter point to
 * @returns Point on the polygon perimeter
 */
export function getPolygonPerimeterPoint(
	vertices: readonly Point[],
	center: Point,
	fromPoint: Point
): Point {
	const direction = getDirectionFromCenter(center, fromPoint);

	// Handle edge case: fromPoint is at center
	if (direction.x === 0 && direction.y === 0) {
		// Return first vertex as default
		return vertices[0] ? { ...vertices[0] } : center;
	}

	// Ray-cast from center in direction of fromPoint
	let closestPoint: Point = center;
	let closestT = Infinity;

	for (let i = 0; i < vertices.length; i++) {
		const v1 = vertices[i];
		const v2 = vertices[(i + 1) % vertices.length];

		const intersection = raySegmentIntersection(center, direction, v1, v2);
		if (intersection && intersection.t > 0 && intersection.t < closestT) {
			closestT = intersection.t;
			closestPoint = intersection.point;
		}
	}

	return closestPoint;
}

/**
 * Calculates intersection between a ray and a line segment.
 */
function raySegmentIntersection(
	rayOrigin: Point,
	rayDir: Vector,
	segStart: Point,
	segEnd: Point
): { point: Point; t: number } | null {
	const v1x = rayOrigin.x - segStart.x;
	const v1y = rayOrigin.y - segStart.y;
	const v2x = segEnd.x - segStart.x;
	const v2y = segEnd.y - segStart.y;
	const v3x = -rayDir.y;
	const v3y = rayDir.x;

	const dot = v2x * v3x + v2y * v3y;
	if (Math.abs(dot) < 1e-10) {
		return null; // Parallel
	}

	const t1 = (v2x * v1y - v2y * v1x) / dot;
	const t2 = (v1x * v3x + v1y * v3y) / dot;

	if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
		return {
			point: {
				x: rayOrigin.x + t1 * rayDir.x,
				y: rayOrigin.y + t1 * rayDir.y
			},
			t: t1
		};
	}

	return null;
}

// =============================================================================
// Polygon Vertex Generation
// =============================================================================

/**
 * Generates vertices for a regular polygon inscribed in a bounding box.
 *
 * @param bounds - Bounding box to inscribe polygon in
 * @param sides - Number of sides (5 = pentagon, 6 = hexagon, etc.)
 * @param startAngle - Starting angle in radians (default: -π/2 for top vertex)
 * @returns Array of polygon vertices
 */
export function generatePolygonVertices(
	bounds: BoundingBox,
	sides: number,
	startAngle: number = -Math.PI / 2
): Point[] {
	const center = getBoundsCenter(bounds);
	const radiusX = bounds.width / 2;
	const radiusY = bounds.height / 2;

	const vertices: Point[] = [];
	for (let i = 0; i < sides; i++) {
		const angle = startAngle + (i * 2 * Math.PI) / sides;
		vertices.push({
			x: center.x + radiusX * Math.cos(angle),
			y: center.y + radiusY * Math.sin(angle)
		});
	}

	return vertices;
}

/**
 * Generates vertices for a star shape inscribed in a bounding box.
 *
 * @param bounds - Bounding box to inscribe star in
 * @param points - Number of points (5 = 5-pointed star)
 * @param innerRadiusRatio - Ratio of inner to outer radius (default: 0.4)
 * @returns Array of star vertices (alternating outer and inner points)
 */
export function generateStarVertices(
	bounds: BoundingBox,
	points: number = 5,
	innerRadiusRatio: number = 0.4
): Point[] {
	const center = getBoundsCenter(bounds);
	const outerRadiusX = bounds.width / 2;
	const outerRadiusY = bounds.height / 2;
	const innerRadiusX = outerRadiusX * innerRadiusRatio;
	const innerRadiusY = outerRadiusY * innerRadiusRatio;

	const vertices: Point[] = [];
	const totalPoints = points * 2;

	for (let i = 0; i < totalPoints; i++) {
		const angle = -Math.PI / 2 + (i * Math.PI) / points;
		const isOuter = i % 2 === 0;
		const rx = isOuter ? outerRadiusX : innerRadiusX;
		const ry = isOuter ? outerRadiusY : innerRadiusY;

		vertices.push({
			x: center.x + rx * Math.cos(angle),
			y: center.y + ry * Math.sin(angle)
		});
	}

	return vertices;
}

// =============================================================================
// Unified Perimeter Point Function
// =============================================================================

/**
 * Gets the closest point on a shape's perimeter to an external point.
 * Dispatches to the appropriate algorithm based on shape type.
 *
 * @param shape - Shape element to find perimeter point on
 * @param fromPoint - External point to find closest perimeter point to
 * @param gap - Optional gap to add (offsets point outward from perimeter)
 * @returns Point on (or near, with gap) the shape perimeter
 */
export function getClosestPerimeterPoint(
	shape: ShapeElement,
	fromPoint: Point,
	gap: number = 0
): Point {
	const bounds = getShapeBounds(shape);
	const center = getShapeCenter(shape);

	// For non-bindable shapes (line, arrow), return center
	if (shape.shapeType === 'line' || shape.shapeType === 'arrow') {
		return center;
	}

	// If shape is rotated, we need to:
	// 1. Rotate fromPoint into shape's local coordinate system
	// 2. Find perimeter point in local coordinates
	// 3. Rotate result back to global coordinates
	let localFromPoint = fromPoint;
	if (shape.rotation && shape.rotation !== 0) {
		// Rotate fromPoint backward (opposite of shape rotation)
		localFromPoint = rotatePointAroundCenter(fromPoint, center, -shape.rotation);
	}

	let perimeterPoint: Point;

	switch (shape.shapeType) {
		case 'rectangle':
			perimeterPoint = getRectanglePerimeterPoint(bounds, localFromPoint, shape.cornerRadius);
			break;

		case 'circle':
			perimeterPoint = getEllipsePerimeterPoint(bounds, localFromPoint);
			break;

		case 'pentagon': {
			const pentagonVertices = generatePolygonVertices(bounds, 5);
			perimeterPoint = getPolygonPerimeterPoint(pentagonVertices, center, localFromPoint);
			break;
		}

		case 'hexagon': {
			const hexagonVertices = generatePolygonVertices(bounds, 6);
			perimeterPoint = getPolygonPerimeterPoint(hexagonVertices, center, localFromPoint);
			break;
		}

		case 'star': {
			const starVertices = generateStarVertices(bounds, 5, 0.4);
			perimeterPoint = getPolygonPerimeterPoint(starVertices, center, localFromPoint);
			break;
		}

		default:
			// Fallback to center for unknown shapes
			return center;
	}

	// Rotate perimeter point back to global coordinates
	if (shape.rotation && shape.rotation !== 0) {
		perimeterPoint = rotatePointAroundCenter(perimeterPoint, center, shape.rotation);
	}

	// Apply gap offset
	if (gap > 0) {
		const direction = getDirectionFromCenter(center, fromPoint);
		perimeterPoint = {
			x: perimeterPoint.x + direction.x * gap,
			y: perimeterPoint.y + direction.y * gap
		};
	}

	return perimeterPoint;
}
