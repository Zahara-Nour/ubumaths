/**
 * Shape Drawing Utilities
 *
 * Functions for creating and rendering geometric shapes.
 *
 * @module whiteboard/core/shapes
 */

import type { Point, ShapeElement, ShapeType, StrokeStyle, FillMode } from '../types/document';

// =============================================================================
// Types
// =============================================================================

export interface ShapeOptions {
	color: string;
	strokeWidth: number;
	opacity: number;
	strokeStyle?: StrokeStyle;
	fillMode?: FillMode;
	fill?: string;
	fillOpacity?: number;
	cornerRadius?: number;
}

export interface ShapeRenderProps {
	type: 'line' | 'rect' | 'ellipse' | 'polygon' | 'path';
	// Line props
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
	// Rect props
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	// Corner radius for rect
	cornerRadius?: number;
	// Ellipse props
	cx?: number;
	cy?: number;
	rx?: number;
	ry?: number;
	// Polygon props
	points?: string;
	// Path props (for rounded polygons)
	d?: string;
	// Arrow marker flag
	hasArrowMarker?: boolean;
}

export interface ShapeBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

// =============================================================================
// Shape Creation
// =============================================================================

/**
 * Create a shape element from start and end points
 */
export function createShapeElement(
	shapeType: ShapeType,
	start: Point,
	end: Point,
	options: ShapeOptions
): ShapeElement {
	return {
		id: crypto.randomUUID(),
		type: 'shape',
		shapeType,
		start: { x: start.x, y: start.y },
		end: { x: end.x, y: end.y },
		color: options.color,
		strokeWidth: options.strokeWidth,
		opacity: options.opacity,
		strokeStyle: options.strokeStyle,
		fillMode: options.fillMode,
		fill: options.fill,
		fillOpacity: options.fillOpacity,
		cornerRadius: options.cornerRadius
	};
}

// =============================================================================
// Polygon Generation
// =============================================================================

/**
 * Generate points for a regular polygon inscribed in an ellipse
 * @param cx - Center x
 * @param cy - Center y
 * @param rx - Radius x (half width)
 * @param ry - Radius y (half height)
 * @param sides - Number of sides
 * @param rotationOffset - Starting angle offset in radians (default: -π/2 for top-pointing)
 */
function generateRegularPolygonPoints(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	sides: number,
	rotationOffset: number = -Math.PI / 2
): string {
	const points: string[] = [];
	for (let i = 0; i < sides; i++) {
		const angle = rotationOffset + (2 * Math.PI * i) / sides;
		const x = cx + rx * Math.cos(angle);
		const y = cy + ry * Math.sin(angle);
		points.push(`${x},${y}`);
	}
	return points.join(' ');
}

/**
 * Generate points for a 5-pointed star inscribed in an ellipse
 * @param cx - Center x
 * @param cy - Center y
 * @param rx - Outer radius x (half width)
 * @param ry - Outer radius y (half height)
 * @param innerRatio - Ratio of inner radius to outer radius (default: 0.382 for classic star)
 */
function generateStarPoints(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	innerRatio: number = 0.382
): string {
	const points: string[] = [];
	const numPoints = 5;
	const rotationOffset = -Math.PI / 2; // Start at top

	for (let i = 0; i < numPoints * 2; i++) {
		const angle = rotationOffset + (Math.PI * i) / numPoints;
		const isOuter = i % 2 === 0;
		const radiusX = isOuter ? rx : rx * innerRatio;
		const radiusY = isOuter ? ry : ry * innerRatio;
		const x = cx + radiusX * Math.cos(angle);
		const y = cy + radiusY * Math.sin(angle);
		points.push(`${x},${y}`);
	}
	return points.join(' ');
}

/**
 * Get vertices as array of {x, y} for a regular polygon
 */
export function getPolygonVertices(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	sides: number,
	rotationOffset: number = -Math.PI / 2
): Array<{ x: number; y: number }> {
	const vertices: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < sides; i++) {
		const angle = rotationOffset + (2 * Math.PI * i) / sides;
		vertices.push({
			x: cx + rx * Math.cos(angle),
			y: cy + ry * Math.sin(angle)
		});
	}
	return vertices;
}

/**
 * Get vertices as array of {x, y} for a star
 */
export function getStarVertices(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	innerRatio: number = 0.382
): Array<{ x: number; y: number }> {
	const vertices: Array<{ x: number; y: number }> = [];
	const numPoints = 5;
	const rotationOffset = -Math.PI / 2;

	for (let i = 0; i < numPoints * 2; i++) {
		const angle = rotationOffset + (Math.PI * i) / numPoints;
		const isOuter = i % 2 === 0;
		const radiusX = isOuter ? rx : rx * innerRatio;
		const radiusY = isOuter ? ry : ry * innerRatio;
		vertices.push({
			x: cx + radiusX * Math.cos(angle),
			y: cy + radiusY * Math.sin(angle)
		});
	}
	return vertices;
}

/**
 * Generate an SVG path for a polygon with rounded corners
 * Uses quadratic bezier curves at each vertex
 * @param vertices - Array of {x, y} points
 * @param cornerRadius - Radius for corner rounding
 */
function generateRoundedPolygonPath(
	vertices: Array<{ x: number; y: number }>,
	cornerRadius: number
): string {
	if (vertices.length < 3) return '';
	if (cornerRadius <= 0) {
		// Return simple polygon path if no rounding
		const first = vertices[0];
		let path = `M ${first.x} ${first.y}`;
		for (let i = 1; i < vertices.length; i++) {
			path += ` L ${vertices[i].x} ${vertices[i].y}`;
		}
		return path + ' Z';
	}

	const n = vertices.length;
	const pathParts: string[] = [];

	for (let i = 0; i < n; i++) {
		const prev = vertices[(i - 1 + n) % n];
		const curr = vertices[i];
		const next = vertices[(i + 1) % n];

		// Calculate vectors from current vertex to prev and next
		const toPrev = { x: prev.x - curr.x, y: prev.y - curr.y };
		const toNext = { x: next.x - curr.x, y: next.y - curr.y };

		// Calculate lengths
		const lenToPrev = Math.sqrt(toPrev.x * toPrev.x + toPrev.y * toPrev.y);
		const lenToNext = Math.sqrt(toNext.x * toNext.x + toNext.y * toNext.y);

		// Limit corner radius to half the shorter edge
		const maxRadius = Math.min(lenToPrev / 2, lenToNext / 2);
		const r = Math.min(cornerRadius, maxRadius);

		// Normalize vectors
		const unitToPrev = { x: toPrev.x / lenToPrev, y: toPrev.y / lenToPrev };
		const unitToNext = { x: toNext.x / lenToNext, y: toNext.y / lenToNext };

		// Calculate points where the curve starts and ends
		const startPoint = {
			x: curr.x + unitToPrev.x * r,
			y: curr.y + unitToPrev.y * r
		};
		const endPoint = {
			x: curr.x + unitToNext.x * r,
			y: curr.y + unitToNext.y * r
		};

		if (i === 0) {
			// Move to the start point of the first curve
			pathParts.push(`M ${startPoint.x} ${startPoint.y}`);
		} else {
			// Line to the start of this curve
			pathParts.push(`L ${startPoint.x} ${startPoint.y}`);
		}

		// Quadratic bezier curve with the vertex as control point
		pathParts.push(`Q ${curr.x} ${curr.y} ${endPoint.x} ${endPoint.y}`);
	}

	// Close the path by going back to the first curve start
	pathParts.push('Z');

	return pathParts.join(' ');
}

// =============================================================================
// SVG Rendering
// =============================================================================

/**
 * Get SVG element properties for a shape
 * @param shapeType - Type of shape to render
 * @param start - Start point
 * @param end - End point
 * @param cornerRadius - Optional corner radius for rounded corners (default: 0)
 */
export function getShapeSvgProps(
	shapeType: ShapeType,
	start: Point,
	end: Point,
	cornerRadius: number = 0
): ShapeRenderProps {
	switch (shapeType) {
		case 'line':
			return {
				type: 'line',
				x1: start.x,
				y1: start.y,
				x2: end.x,
				y2: end.y
			};

		case 'rectangle': {
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const width = Math.abs(end.x - start.x);
			const height = Math.abs(end.y - start.y);
			// Limit corner radius to half the smaller dimension
			const maxRadius = Math.min(width / 2, height / 2);
			const effectiveRadius = Math.min(cornerRadius, maxRadius);

			return {
				type: 'rect',
				x,
				y,
				width,
				height,
				cornerRadius: effectiveRadius
			};
		}

		case 'circle': {
			// Use ellipse for flexibility (can be oval based on drag)
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const width = Math.abs(end.x - start.x);
			const height = Math.abs(end.y - start.y);

			return {
				type: 'ellipse',
				cx: x + width / 2,
				cy: y + height / 2,
				rx: width / 2,
				ry: height / 2
			};
		}

		case 'arrow':
			return {
				type: 'line',
				x1: start.x,
				y1: start.y,
				x2: end.x,
				y2: end.y,
				hasArrowMarker: true
			};

		case 'pentagon': {
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const width = Math.abs(end.x - start.x);
			const height = Math.abs(end.y - start.y);
			const cx = x + width / 2;
			const cy = y + height / 2;

			if (cornerRadius > 0) {
				const vertices = getPolygonVertices(cx, cy, width / 2, height / 2, 5);
				return {
					type: 'path',
					d: generateRoundedPolygonPath(vertices, cornerRadius)
				};
			}
			return {
				type: 'polygon',
				points: generateRegularPolygonPoints(cx, cy, width / 2, height / 2, 5)
			};
		}

		case 'hexagon': {
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const width = Math.abs(end.x - start.x);
			const height = Math.abs(end.y - start.y);
			const cx = x + width / 2;
			const cy = y + height / 2;

			if (cornerRadius > 0) {
				const vertices = getPolygonVertices(cx, cy, width / 2, height / 2, 6);
				return {
					type: 'path',
					d: generateRoundedPolygonPath(vertices, cornerRadius)
				};
			}
			return {
				type: 'polygon',
				points: generateRegularPolygonPoints(cx, cy, width / 2, height / 2, 6)
			};
		}

		case 'star': {
			const x = Math.min(start.x, end.x);
			const y = Math.min(start.y, end.y);
			const width = Math.abs(end.x - start.x);
			const height = Math.abs(end.y - start.y);
			const cx = x + width / 2;
			const cy = y + height / 2;

			if (cornerRadius > 0) {
				const vertices = getStarVertices(cx, cy, width / 2, height / 2);
				return {
					type: 'path',
					d: generateRoundedPolygonPath(vertices, cornerRadius)
				};
			}
			return {
				type: 'polygon',
				points: generateStarPoints(cx, cy, width / 2, height / 2)
			};
		}

		default:
			return {
				type: 'line',
				x1: start.x,
				y1: start.y,
				x2: end.x,
				y2: end.y
			};
	}
}

// =============================================================================
// Geometry Utilities
// =============================================================================

/**
 * Calculate the angle of a line in degrees (-180 to 180)
 * 0° = pointing right, 90° = pointing down, -90° = pointing up
 */
export function calculateLineAngle(start: Point, end: Point): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Calculate the length of a line in pixels
 */
export function calculateLineLength(start: Point, end: Point): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize an angle to keep text readable (-90 to 90)
 * Flips angles outside this range so text is never upside down
 */
export function normalizeAngleForText(angle: number): number {
	if (angle > 90) return angle - 180;
	if (angle < -90) return angle + 180;
	return angle;
}

/**
 * Calculate bounding box for a shape
 */
export function calculateShapeBounds(
	shapeType: ShapeType,
	start: Point,
	end: Point,
	strokeWidth: number
): ShapeBounds {
	const padding = strokeWidth / 2;

	const minX = Math.min(start.x, end.x);
	const minY = Math.min(start.y, end.y);
	const maxX = Math.max(start.x, end.x);
	const maxY = Math.max(start.y, end.y);

	return {
		minX: minX - padding,
		minY: minY - padding,
		maxX: maxX + padding,
		maxY: maxY + padding
	};
}

/**
 * Check if a point is inside a shape's bounding box
 */
export function isPointInShapeBounds(point: Point, shape: ShapeElement): boolean {
	const bounds = calculateShapeBounds(shape.shapeType, shape.start, shape.end, shape.strokeWidth);

	return (
		point.x >= bounds.minX &&
		point.x <= bounds.maxX &&
		point.y >= bounds.minY &&
		point.y <= bounds.maxY
	);
}
