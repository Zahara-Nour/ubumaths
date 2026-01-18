/**
 * Heading System for Elbow Arrow Routing (Excalidraw-style)
 *
 * Headings are cardinal direction unit vectors [dx, dy] that determine
 * how arrows enter or exit shapes. This module provides utilities for
 * working with headings in the elbow arrow routing system.
 *
 * @module whiteboard/core/heading
 */

import type { Point, ShapeElement, Heading } from '../types/document';
import {
	HEADING_UP,
	HEADING_DOWN,
	HEADING_LEFT,
	HEADING_RIGHT,
	ALL_HEADINGS
} from '../types/document';

// Re-export constants for convenience
export { HEADING_UP, HEADING_DOWN, HEADING_LEFT, HEADING_RIGHT, ALL_HEADINGS, type Heading };

// =============================================================================
// Heading Comparison
// =============================================================================

/**
 * Compare two headings for equality.
 */
export function compareHeading(a: Heading, b: Heading): boolean {
	return a[0] === b[0] && a[1] === b[1];
}

/**
 * Check if a heading is horizontal (LEFT or RIGHT).
 */
export function headingIsHorizontal(h: Heading): boolean {
	return h[0] !== 0;
}

/**
 * Check if a heading is vertical (UP or DOWN).
 */
export function headingIsVertical(h: Heading): boolean {
	return h[1] !== 0;
}

/**
 * Check if two headings are perpendicular.
 */
export function areHeadingsPerpendicular(a: Heading, b: Heading): boolean {
	// Perpendicular if one is horizontal and one is vertical
	return headingIsHorizontal(a) !== headingIsHorizontal(b);
}

/**
 * Check if two headings are opposite.
 */
export function areHeadingsOpposite(a: Heading, b: Heading): boolean {
	return a[0] === -b[0] && a[1] === -b[1];
}

// =============================================================================
// Heading Transformations
// =============================================================================

/**
 * Get the opposite (flipped) heading.
 */
export function flipHeading(h: Heading): Heading {
	return [h[0] === 0 ? 0 : h[0] > 0 ? -1 : 1, h[1] === 0 ? 0 : h[1] > 0 ? -1 : 1] as Heading;
}

/**
 * Get perpendicular headings (the two headings that are 90 degrees from this one).
 */
export function getPerpendicularHeadings(h: Heading): [Heading, Heading] {
	if (headingIsHorizontal(h)) {
		return [HEADING_UP, HEADING_DOWN];
	}
	return [HEADING_LEFT, HEADING_RIGHT];
}

// =============================================================================
// Vector to Heading Conversion
// =============================================================================

/**
 * Convert a direction vector to the nearest heading.
 * Uses Excalidraw's algorithm for consistency.
 */
export function vectorToHeading(vec: readonly [number, number]): Heading {
	const [x, y] = vec;
	const absX = Math.abs(x);
	const absY = Math.abs(y);

	if (x > absY) {
		return HEADING_RIGHT;
	} else if (x <= -absY) {
		return HEADING_LEFT;
	} else if (y > absX) {
		return HEADING_DOWN;
	}
	return HEADING_UP;
}

/**
 * Convert two points to a heading (direction from p1 to p2).
 */
export function headingFromPoints(p1: Point, p2: Point): Heading {
	return vectorToHeading([p2.x - p1.x, p2.y - p1.y]);
}

/**
 * Determine if the direction from origin to point is horizontal.
 */
export function headingForPointIsHorizontal(p: Point, origin: Point): boolean {
	return headingIsHorizontal(headingFromPoints(origin, p));
}

// =============================================================================
// Shape-Heading Utilities
// =============================================================================

/**
 * Bounds type: [minX, minY, maxX, maxY] (Excalidraw-style)
 */
export type Bounds = readonly [number, number, number, number];

/**
 * Get bounds from a shape element.
 */
export function boundsFromShape(shape: ShapeElement): Bounds {
	const minX = Math.min(shape.start.x, shape.end.x);
	const minY = Math.min(shape.start.y, shape.end.y);
	const maxX = Math.max(shape.start.x, shape.end.x);
	const maxY = Math.max(shape.start.y, shape.end.y);
	return [minX, minY, maxX, maxY];
}

/**
 * Get the center point of bounds.
 */
export function getCenterForBounds(bounds: Bounds): Point {
	return {
		x: (bounds[0] + bounds[2]) / 2,
		y: (bounds[1] + bounds[3]) / 2
	};
}

/**
 * Check if a point is strictly inside bounds (not on the boundary).
 * Uses strict inequalities so points on AABB edges are not considered inside,
 * allowing dongle points on boundaries to work correctly in A* pathfinding.
 */
export function pointInsideBounds(p: Point, bounds: Bounds): boolean {
	return p.x > bounds[0] && p.x < bounds[2] && p.y > bounds[1] && p.y < bounds[3];
}

/**
 * Determine heading for a point from an element's bounding box.
 * Uses search cones (triangular regions) around the center to determine
 * which side of the element the point is closest to.
 *
 * This is the Excalidraw algorithm for rectangular elements.
 */
export function headingForPointFromElement(bounds: Bounds, point: Point): Heading {
	const SEARCH_CONE_MULTIPLIER = 2;
	const midPoint = getCenterForBounds(bounds);

	// Scale corners outward to create search cones
	const scalePoint = (px: number, py: number): Point => ({
		x: midPoint.x + (px - midPoint.x) * SEARCH_CONE_MULTIPLIER,
		y: midPoint.y + (py - midPoint.y) * SEARCH_CONE_MULTIPLIER
	});

	const topLeft = scalePoint(bounds[0], bounds[1]);
	const topRight = scalePoint(bounds[2], bounds[1]);
	const bottomLeft = scalePoint(bounds[0], bounds[3]);
	const bottomRight = scalePoint(bounds[2], bounds[3]);

	// Check which triangular region contains the point
	if (triangleIncludesPoint([topLeft, topRight, midPoint], point)) {
		return HEADING_UP;
	}
	if (triangleIncludesPoint([topRight, bottomRight, midPoint], point)) {
		return HEADING_RIGHT;
	}
	if (triangleIncludesPoint([bottomRight, bottomLeft, midPoint], point)) {
		return HEADING_DOWN;
	}
	return HEADING_LEFT;
}

/**
 * Check if a point is inside a triangle using barycentric coordinates.
 */
function triangleIncludesPoint(triangle: [Point, Point, Point], point: Point): boolean {
	const [a, b, c] = triangle;

	const v0x = c.x - a.x;
	const v0y = c.y - a.y;
	const v1x = b.x - a.x;
	const v1y = b.y - a.y;
	const v2x = point.x - a.x;
	const v2y = point.y - a.y;

	const dot00 = v0x * v0x + v0y * v0y;
	const dot01 = v0x * v1x + v0y * v1y;
	const dot02 = v0x * v2x + v0y * v2y;
	const dot11 = v1x * v1x + v1y * v1y;
	const dot12 = v1x * v2x + v1y * v2y;

	const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
	const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
	const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

	return u >= 0 && v >= 0 && u + v <= 1;
}

/**
 * Get the heading for exiting a shape toward a target point.
 * Uses the search cone algorithm to determine which side to exit from.
 */
export function getExitHeading(shape: ShapeElement, targetPoint: Point): Heading {
	const bounds = boundsFromShape(shape);
	return headingForPointFromElement(bounds, targetPoint);
}

/**
 * Get the heading for entering a shape from a source point.
 * This is the opposite of the exit heading from the source toward this shape.
 */
export function getEntryHeading(shape: ShapeElement, sourcePoint: Point): Heading {
	const bounds = boundsFromShape(shape);
	const headingTowardSource = headingForPointFromElement(bounds, sourcePoint);
	return flipHeading(headingTowardSource);
}

/**
 * Get the point on a shape's perimeter in a given heading direction.
 */
export function getPerimeterPointForHeading(
	bounds: Bounds,
	heading: Heading,
	gap: number = 0
): Point {
	const center = getCenterForBounds(bounds);

	if (compareHeading(heading, HEADING_UP)) {
		return { x: center.x, y: bounds[1] - gap };
	}
	if (compareHeading(heading, HEADING_DOWN)) {
		return { x: center.x, y: bounds[3] + gap };
	}
	if (compareHeading(heading, HEADING_LEFT)) {
		return { x: bounds[0] - gap, y: center.y };
	}
	// HEADING_RIGHT
	return { x: bounds[2] + gap, y: center.y };
}

// =============================================================================
// Neighbor Index Conversion (for A* grid navigation)
// =============================================================================

/**
 * Convert neighbor index (0-3) to heading.
 * Used in A* pathfinding: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
 */
export function neighborIndexToHeading(idx: 0 | 1 | 2 | 3): Heading {
	switch (idx) {
		case 0:
			return HEADING_UP;
		case 1:
			return HEADING_RIGHT;
		case 2:
			return HEADING_DOWN;
		case 3:
			return HEADING_LEFT;
	}
}

/**
 * Convert heading to neighbor index.
 */
export function headingToNeighborIndex(h: Heading): 0 | 1 | 2 | 3 {
	if (compareHeading(h, HEADING_UP)) return 0;
	if (compareHeading(h, HEADING_RIGHT)) return 1;
	if (compareHeading(h, HEADING_DOWN)) return 2;
	return 3;
}
