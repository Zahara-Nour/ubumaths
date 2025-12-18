/**
 * Shape Drawing Utilities
 *
 * Functions for creating and rendering geometric shapes.
 *
 * @module whiteboard/core/shapes
 */

import type { Point, ShapeElement, ShapeType } from '../types/document';

// =============================================================================
// Types
// =============================================================================

export interface ShapeOptions {
	color: string;
	strokeWidth: number;
	opacity: number;
	fill?: string;
	fillOpacity?: number;
}

export interface ShapeRenderProps {
	type: 'line' | 'rect' | 'ellipse';
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
	// Ellipse props
	cx?: number;
	cy?: number;
	rx?: number;
	ry?: number;
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
		fill: options.fill,
		fillOpacity: options.fillOpacity
	};
}

// =============================================================================
// SVG Rendering
// =============================================================================

/**
 * Get SVG element properties for a shape
 */
export function getShapeSvgProps(shapeType: ShapeType, start: Point, end: Point): ShapeRenderProps {
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

			return {
				type: 'rect',
				x,
				y,
				width,
				height
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
