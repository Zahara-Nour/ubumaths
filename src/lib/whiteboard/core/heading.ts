/**
 * Heading System for Elbow Arrow Routing
 *
 * Headings represent cardinal directions (up, down, left, right) that determine
 * how arrows enter or exit shapes. This is similar to Excalidraw's heading system.
 *
 * @module whiteboard/core/heading
 */

import type { Point, Heading, ShapeElement } from '../types/document';
import { getShapeBounds } from './binding-geometry';

// =============================================================================
// Types
// =============================================================================

/** Vector representation of a heading */
export interface HeadingVector {
	readonly x: number;
	readonly y: number;
}

/** Heading with its perpendicular alternatives */
export interface HeadingInfo {
	readonly heading: Heading;
	readonly vector: HeadingVector;
	readonly perpendiculars: readonly [Heading, Heading];
	readonly opposite: Heading;
}

// =============================================================================
// Constants
// =============================================================================

/** Heading vectors (unit vectors in each direction) */
export const HEADING_VECTORS: Record<Heading, HeadingVector> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 }
};

/** All heading values */
export const ALL_HEADINGS: readonly Heading[] = ['up', 'down', 'left', 'right'];

/** Perpendicular headings for each heading */
export const PERPENDICULAR_HEADINGS: Record<Heading, readonly [Heading, Heading]> = {
	up: ['left', 'right'],
	down: ['left', 'right'],
	left: ['up', 'down'],
	right: ['up', 'down']
};

/** Opposite heading for each heading */
export const OPPOSITE_HEADINGS: Record<Heading, Heading> = {
	up: 'down',
	down: 'up',
	left: 'right',
	right: 'left'
};

// =============================================================================
// Heading Utilities
// =============================================================================

/**
 * Get the vector for a heading.
 */
export function getHeadingVector(heading: Heading): HeadingVector {
	return HEADING_VECTORS[heading];
}

/**
 * Get the opposite heading.
 */
export function getOppositeHeading(heading: Heading): Heading {
	return OPPOSITE_HEADINGS[heading];
}

/**
 * Get perpendicular headings.
 */
export function getPerpendicularHeadings(heading: Heading): readonly [Heading, Heading] {
	return PERPENDICULAR_HEADINGS[heading];
}

/**
 * Get complete heading info.
 */
export function getHeadingInfo(heading: Heading): HeadingInfo {
	return {
		heading,
		vector: HEADING_VECTORS[heading],
		perpendiculars: PERPENDICULAR_HEADINGS[heading],
		opposite: OPPOSITE_HEADINGS[heading]
	};
}

/**
 * Convert a direction vector to the nearest heading.
 */
export function vectorToHeading(dx: number, dy: number): Heading {
	// Determine if horizontal or vertical is dominant
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? 'right' : 'left';
	} else {
		return dy > 0 ? 'down' : 'up';
	}
}

/**
 * Convert an angle (in radians) to the nearest heading.
 */
export function angleToHeading(angle: number): Heading {
	// Normalize angle to [0, 2*PI)
	const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

	// Divide into quadrants (45-degree sectors around each cardinal direction)
	if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) {
		return 'right';
	} else if (normalized < (3 * Math.PI) / 4) {
		return 'down';
	} else if (normalized < (5 * Math.PI) / 4) {
		return 'left';
	} else {
		return 'up';
	}
}

/**
 * Convert a heading to an angle (in radians).
 */
export function headingToAngle(heading: Heading): number {
	switch (heading) {
		case 'right':
			return 0;
		case 'down':
			return Math.PI / 2;
		case 'left':
			return Math.PI;
		case 'up':
			return (3 * Math.PI) / 2;
	}
}

/**
 * Check if two headings are perpendicular.
 */
export function areHeadingsPerpendicular(h1: Heading, h2: Heading): boolean {
	const perps = PERPENDICULAR_HEADINGS[h1];
	return perps[0] === h2 || perps[1] === h2;
}

/**
 * Check if two headings are opposite.
 */
export function areHeadingsOpposite(h1: Heading, h2: Heading): boolean {
	return OPPOSITE_HEADINGS[h1] === h2;
}

/**
 * Check if two headings are the same.
 */
export function areHeadingsSame(h1: Heading, h2: Heading): boolean {
	return h1 === h2;
}

// =============================================================================
// Shape-Heading Utilities
// =============================================================================

/**
 * Determine the heading for a point relative to a shape's center.
 * Returns the heading that points from the shape's center toward the point.
 */
export function getHeadingFromShapeToPoint(shape: ShapeElement, point: Point): Heading {
	const bounds = getShapeBounds(shape);
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;

	const dx = point.x - centerX;
	const dy = point.y - centerY;

	return vectorToHeading(dx, dy);
}

/**
 * Determine the heading for exiting a shape toward a target point.
 * This considers which side of the shape is closest to the target.
 */
export function getExitHeading(shape: ShapeElement, targetPoint: Point): Heading {
	const bounds = getShapeBounds(shape);
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;

	// Direction from shape center to target
	const dx = targetPoint.x - centerX;
	const dy = targetPoint.y - centerY;

	return vectorToHeading(dx, dy);
}

/**
 * Determine the heading for entering a shape from a source point.
 * This is the opposite of the exit heading from source toward this shape.
 */
export function getEntryHeading(shape: ShapeElement, sourcePoint: Point): Heading {
	const exitHeading = getExitHeading(shape, sourcePoint);
	return getOppositeHeading(exitHeading);
}

/**
 * Get the point on a shape's perimeter in a given heading direction.
 * Useful for calculating where an arrow should connect to a shape.
 */
export function getPerimeterPointForHeading(
	shape: ShapeElement,
	heading: Heading,
	gap: number = 0
): Point {
	const bounds = getShapeBounds(shape);
	const centerX = bounds.x + bounds.width / 2;
	const centerY = bounds.y + bounds.height / 2;

	switch (heading) {
		case 'up':
			return { x: centerX, y: bounds.y - gap };
		case 'down':
			return { x: centerX, y: bounds.y + bounds.height + gap };
		case 'left':
			return { x: bounds.x - gap, y: centerY };
		case 'right':
			return { x: bounds.x + bounds.width + gap, y: centerY };
	}
}

/**
 * Get all four perimeter points (one for each heading).
 */
export function getAllPerimeterPoints(
	shape: ShapeElement,
	gap: number = 0
): Record<Heading, Point> {
	return {
		up: getPerimeterPointForHeading(shape, 'up', gap),
		down: getPerimeterPointForHeading(shape, 'down', gap),
		left: getPerimeterPointForHeading(shape, 'left', gap),
		right: getPerimeterPointForHeading(shape, 'right', gap)
	};
}

// =============================================================================
// Routing Helpers
// =============================================================================

/**
 * Determine the best heading sequence for an elbow arrow.
 * Returns an array of headings representing the turns in the path.
 *
 * For a simple L-shaped elbow:
 * - If horizontal distance > vertical: start horizontal, then vertical
 * - Otherwise: start vertical, then horizontal
 */
export function getSimpleElbowHeadings(start: Point, end: Point): [Heading, Heading] {
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// First heading based on major axis
	const firstHeading =
		Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

	// Second heading is perpendicular, toward the end point
	const secondHeading =
		firstHeading === 'left' || firstHeading === 'right'
			? dy > 0
				? 'down'
				: 'up'
			: dx > 0
				? 'right'
				: 'left';

	return [firstHeading, secondHeading];
}

/**
 * Generate elbow points from start to end using simple L-shape routing.
 * Returns an array of points including start, elbow point, and end.
 */
export function generateSimpleElbowPoints(
	start: Point,
	end: Point,
	startHeading?: Heading | null,
	endHeading?: Heading | null
): Point[] {
	// If headings are provided, use them to determine the elbow point
	if (startHeading && endHeading) {
		// Check if headings are compatible (perpendicular)
		if (areHeadingsPerpendicular(startHeading, endHeading)) {
			// Simple case: one 90-degree turn
			let elbowX: number;
			let elbowY: number;

			if (startHeading === 'left' || startHeading === 'right') {
				// Start horizontal, end vertical
				elbowX = end.x;
				elbowY = start.y;
			} else {
				// Start vertical, end horizontal
				elbowX = start.x;
				elbowY = end.y;
			}

			return [start, { x: elbowX, y: elbowY }, end];
		}

		// Same or opposite headings: need two turns
		// This creates a Z or S shape
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;

		if (startHeading === 'left' || startHeading === 'right') {
			// Horizontal start
			return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
		} else {
			// Vertical start
			return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
		}
	}

	// No headings provided: use simple L-shape based on distance
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// Determine direction based on which axis has more distance
	if (Math.abs(dx) >= Math.abs(dy)) {
		// Horizontal first
		return [start, { x: end.x, y: start.y }, end];
	} else {
		// Vertical first
		return [start, { x: start.x, y: end.y }, end];
	}
}
