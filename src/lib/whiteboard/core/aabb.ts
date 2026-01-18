/**
 * Axis-Aligned Bounding Box (AABB) Utilities
 *
 * Provides AABB calculations for obstacle avoidance in elbow arrow routing.
 * AABBs are used to represent shape boundaries that arrows must navigate around.
 *
 * @module whiteboard/core/aabb
 */

import type { Point, WhiteboardElement, ShapeElement } from '../types/document';
import { getShapeBounds, type BoundingBox } from './binding-geometry';

// =============================================================================
// Types
// =============================================================================

/**
 * Axis-Aligned Bounding Box.
 * Represents a rectangular region aligned with the coordinate axes.
 */
export interface AABB {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
	/** Optional element ID this AABB represents */
	readonly elementId?: string;
}

/**
 * Line segment for intersection testing.
 */
export interface Segment {
	readonly p1: Point;
	readonly p2: Point;
}

// =============================================================================
// AABB Creation
// =============================================================================

/**
 * Create an AABB from min/max coordinates.
 */
export function createAABB(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
	elementId?: string
): AABB {
	return {
		minX: Math.min(minX, maxX),
		minY: Math.min(minY, maxY),
		maxX: Math.max(minX, maxX),
		maxY: Math.max(minY, maxY),
		elementId
	};
}

/**
 * Create an AABB from a bounding box.
 */
export function aabbFromBoundingBox(bounds: BoundingBox, elementId?: string): AABB {
	return createAABB(
		bounds.x,
		bounds.y,
		bounds.x + bounds.width,
		bounds.y + bounds.height,
		elementId
	);
}

/**
 * Create an AABB from a shape element.
 */
export function aabbFromShape(shape: ShapeElement): AABB {
	const bounds = getShapeBounds(shape);
	return aabbFromBoundingBox(bounds, shape.id);
}

/**
 * Create an AABB from two points.
 */
export function aabbFromPoints(p1: Point, p2: Point, elementId?: string): AABB {
	return createAABB(p1.x, p1.y, p2.x, p2.y, elementId);
}

/**
 * Create an AABB that encompasses all given points.
 */
export function aabbFromPointArray(points: readonly Point[], elementId?: string): AABB {
	if (points.length === 0) {
		return createAABB(0, 0, 0, 0, elementId);
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const p of points) {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x);
		maxY = Math.max(maxY, p.y);
	}

	return createAABB(minX, minY, maxX, maxY, elementId);
}

/**
 * Create AABBs from all shape elements in a collection.
 * Filters out non-shape elements and arrows.
 */
export function aabbsFromElements(
	elements: readonly WhiteboardElement[],
	excludeIds?: Set<string>
): AABB[] {
	const aabbs: AABB[] = [];

	for (const element of elements) {
		// Skip excluded elements
		if (excludeIds?.has(element.id)) continue;

		// Only process shape elements (not strokes, textblocks, etc.)
		if (element.type !== 'shape') continue;

		// Skip arrows (we don't route around arrows)
		const shape = element as ShapeElement;
		if (shape.shapeType === 'arrow' || shape.shapeType === 'line') continue;

		aabbs.push(aabbFromShape(shape));
	}

	return aabbs;
}

// =============================================================================
// AABB Properties
// =============================================================================

/**
 * Get the width of an AABB.
 */
export function aabbWidth(aabb: AABB): number {
	return aabb.maxX - aabb.minX;
}

/**
 * Get the height of an AABB.
 */
export function aabbHeight(aabb: AABB): number {
	return aabb.maxY - aabb.minY;
}

/**
 * Get the center point of an AABB.
 */
export function aabbCenter(aabb: AABB): Point {
	return {
		x: (aabb.minX + aabb.maxX) / 2,
		y: (aabb.minY + aabb.maxY) / 2
	};
}

/**
 * Get the area of an AABB.
 */
export function aabbArea(aabb: AABB): number {
	return aabbWidth(aabb) * aabbHeight(aabb);
}

/**
 * Get the perimeter of an AABB.
 */
export function aabbPerimeter(aabb: AABB): number {
	return 2 * (aabbWidth(aabb) + aabbHeight(aabb));
}

// =============================================================================
// AABB Operations
// =============================================================================

/**
 * Expand an AABB by a given margin in all directions.
 */
export function expandAABB(aabb: AABB, margin: number): AABB {
	return createAABB(
		aabb.minX - margin,
		aabb.minY - margin,
		aabb.maxX + margin,
		aabb.maxY + margin,
		aabb.elementId
	);
}

/**
 * Shrink an AABB by a given margin in all directions.
 */
export function shrinkAABB(aabb: AABB, margin: number): AABB {
	return expandAABB(aabb, -margin);
}

/**
 * Compute the union of two AABBs (smallest AABB containing both).
 */
export function unionAABB(a: AABB, b: AABB): AABB {
	return createAABB(
		Math.min(a.minX, b.minX),
		Math.min(a.minY, b.minY),
		Math.max(a.maxX, b.maxX),
		Math.max(a.maxY, b.maxY)
	);
}

/**
 * Compute the intersection of two AABBs (null if no intersection).
 */
export function intersectAABB(a: AABB, b: AABB): AABB | null {
	const minX = Math.max(a.minX, b.minX);
	const minY = Math.max(a.minY, b.minY);
	const maxX = Math.min(a.maxX, b.maxX);
	const maxY = Math.min(a.maxY, b.maxY);

	if (minX > maxX || minY > maxY) {
		return null;
	}

	return createAABB(minX, minY, maxX, maxY);
}

// =============================================================================
// AABB Tests
// =============================================================================

/**
 * Check if a point is inside an AABB.
 */
export function pointInAABB(point: Point, aabb: AABB): boolean {
	return (
		point.x >= aabb.minX && point.x <= aabb.maxX && point.y >= aabb.minY && point.y <= aabb.maxY
	);
}

/**
 * Check if a point is strictly inside an AABB (not on boundary).
 */
export function pointStrictlyInAABB(point: Point, aabb: AABB): boolean {
	return point.x > aabb.minX && point.x < aabb.maxX && point.y > aabb.minY && point.y < aabb.maxY;
}

/**
 * Check if two AABBs overlap.
 */
export function aabbsOverlap(a: AABB, b: AABB): boolean {
	return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Check if AABB 'a' fully contains AABB 'b'.
 */
export function aabbContains(a: AABB, b: AABB): boolean {
	return a.minX <= b.minX && a.maxX >= b.maxX && a.minY <= b.minY && a.maxY >= b.maxY;
}

/**
 * Check if a line segment intersects an AABB.
 * Uses Cohen-Sutherland algorithm for efficiency.
 */
export function segmentIntersectsAABB(segment: Segment, aabb: AABB): boolean {
	const { p1, p2 } = segment;

	// Cohen-Sutherland outcodes
	const INSIDE = 0;
	const LEFT = 1;
	const RIGHT = 2;
	const BOTTOM = 4;
	const TOP = 8;

	function outcode(x: number, y: number): number {
		let code = INSIDE;
		if (x < aabb.minX) code |= LEFT;
		else if (x > aabb.maxX) code |= RIGHT;
		if (y < aabb.minY) code |= TOP;
		else if (y > aabb.maxY) code |= BOTTOM;
		return code;
	}

	let x0 = p1.x;
	let y0 = p1.y;
	let x1 = p2.x;
	let y1 = p2.y;

	let outcode0 = outcode(x0, y0);
	let outcode1 = outcode(x1, y1);

	while (true) {
		if (!(outcode0 | outcode1)) {
			// Both points inside
			return true;
		} else if (outcode0 & outcode1) {
			// Both points in same outside region
			return false;
		} else {
			// Line crosses at least one edge
			const outcodeOut = outcode0 ? outcode0 : outcode1;
			let x: number;
			let y: number;

			if (outcodeOut & BOTTOM) {
				x = x0 + ((x1 - x0) * (aabb.maxY - y0)) / (y1 - y0);
				y = aabb.maxY;
			} else if (outcodeOut & TOP) {
				x = x0 + ((x1 - x0) * (aabb.minY - y0)) / (y1 - y0);
				y = aabb.minY;
			} else if (outcodeOut & RIGHT) {
				y = y0 + ((y1 - y0) * (aabb.maxX - x0)) / (x1 - x0);
				x = aabb.maxX;
			} else {
				y = y0 + ((y1 - y0) * (aabb.minX - x0)) / (x1 - x0);
				x = aabb.minX;
			}

			if (outcodeOut === outcode0) {
				x0 = x;
				y0 = y;
				outcode0 = outcode(x0, y0);
			} else {
				x1 = x;
				y1 = y;
				outcode1 = outcode(x1, y1);
			}
		}
	}
}

/**
 * Check if a path (array of points) intersects any AABB in a collection.
 */
export function pathIntersectsAnyAABB(points: readonly Point[], aabbs: readonly AABB[]): boolean {
	if (points.length < 2 || aabbs.length === 0) return false;

	for (let i = 0; i < points.length - 1; i++) {
		const segment: Segment = { p1: points[i], p2: points[i + 1] };

		for (const aabb of aabbs) {
			if (segmentIntersectsAABB(segment, aabb)) {
				return true;
			}
		}
	}

	return false;
}

// =============================================================================
// Distance Functions
// =============================================================================

/**
 * Calculate the minimum distance from a point to an AABB.
 * Returns 0 if the point is inside the AABB.
 */
export function distancePointToAABB(point: Point, aabb: AABB): number {
	const dx = Math.max(aabb.minX - point.x, 0, point.x - aabb.maxX);
	const dy = Math.max(aabb.minY - point.y, 0, point.y - aabb.maxY);
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the minimum distance between two AABBs.
 * Returns 0 if the AABBs overlap.
 */
export function distanceAABBToAABB(a: AABB, b: AABB): number {
	const dx = Math.max(a.minX - b.maxX, 0, b.minX - a.maxX);
	const dy = Math.max(a.minY - b.maxY, 0, b.minY - a.maxY);
	return Math.sqrt(dx * dx + dy * dy);
}

// =============================================================================
// Corner and Edge Utilities
// =============================================================================

/**
 * Get the four corners of an AABB.
 */
export function aabbCorners(aabb: AABB): [Point, Point, Point, Point] {
	return [
		{ x: aabb.minX, y: aabb.minY }, // Top-left
		{ x: aabb.maxX, y: aabb.minY }, // Top-right
		{ x: aabb.maxX, y: aabb.maxY }, // Bottom-right
		{ x: aabb.minX, y: aabb.maxY } // Bottom-left
	];
}

/**
 * Get the four edge segments of an AABB.
 */
export function aabbEdges(aabb: AABB): [Segment, Segment, Segment, Segment] {
	const corners = aabbCorners(aabb);
	return [
		{ p1: corners[0], p2: corners[1] }, // Top
		{ p1: corners[1], p2: corners[2] }, // Right
		{ p1: corners[2], p2: corners[3] }, // Bottom
		{ p1: corners[3], p2: corners[0] } // Left
	];
}

/**
 * Get the closest point on an AABB's boundary to a given point.
 */
export function closestPointOnAABB(point: Point, aabb: AABB): Point {
	return {
		x: Math.max(aabb.minX, Math.min(aabb.maxX, point.x)),
		y: Math.max(aabb.minY, Math.min(aabb.maxY, point.y))
	};
}
