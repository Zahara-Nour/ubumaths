/**
 * Elbow Path Calculation
 *
 * Calculates SVG path data for elbow arrows (arrows with 90-degree bends).
 * Used for probability trees, algorithm flowcharts, and hierarchical diagrams.
 *
 * @module whiteboard/core/elbow-path
 */

import type { Point, ElbowDirection } from '../types/document';

// =============================================================================
// Types
// =============================================================================

/** Result of elbow path calculation */
export interface ElbowPathResult {
	/** SVG path data (d attribute) */
	path: string;
	/** The elbow/bend point */
	elbowPoint: Point;
	/** Midpoint along the path for label positioning */
	midpoint: Point;
	/** Angle at midpoint in degrees (for label rotation) */
	midpointAngle: number;
	/** Total path length in pixels */
	totalLength: number;
}

// =============================================================================
// Path Calculation
// =============================================================================

/**
 * Calculate the elbow (bend) point for a given start/end and direction.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param direction - Direction of first segment
 * @returns The elbow point coordinates
 */
export function calculateElbowPoint(start: Point, end: Point, direction: ElbowDirection): Point {
	if (direction === 'horizontal-first') {
		// Go horizontal first, then vertical
		// Elbow is at (end.x, start.y)
		return { x: end.x, y: start.y };
	} else {
		// Go vertical first, then horizontal
		// Elbow is at (start.x, end.y)
		return { x: start.x, y: end.y };
	}
}

/**
 * Calculate the SVG path data for an elbow arrow.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param direction - Direction of first segment ('horizontal-first' or 'vertical-first')
 * @returns ElbowPathResult with path data, elbow point, midpoint, and total length
 */
export function calculateElbowPath(
	start: Point,
	end: Point,
	direction: ElbowDirection
): ElbowPathResult {
	const elbowPoint = calculateElbowPoint(start, end, direction);

	// Calculate segment lengths
	const segment1Length =
		direction === 'horizontal-first'
			? Math.abs(end.x - start.x) // Horizontal segment
			: Math.abs(end.y - start.y); // Vertical segment

	const segment2Length =
		direction === 'horizontal-first'
			? Math.abs(end.y - start.y) // Vertical segment
			: Math.abs(end.x - start.x); // Horizontal segment

	const totalLength = segment1Length + segment2Length;

	// Calculate midpoint along the path
	const { point: midpoint, angle: midpointAngle } = calculateElbowMidpoint(
		start,
		end,
		direction,
		elbowPoint,
		segment1Length,
		segment2Length,
		totalLength
	);

	// Generate SVG path
	// M = moveto, L = lineto
	const path = `M ${start.x} ${start.y} L ${elbowPoint.x} ${elbowPoint.y} L ${end.x} ${end.y}`;

	return {
		path,
		elbowPoint,
		midpoint,
		midpointAngle,
		totalLength
	};
}

/**
 * Calculate the midpoint along an elbow path and the angle at that point.
 * The midpoint is at 50% of the total path length.
 */
function calculateElbowMidpoint(
	start: Point,
	end: Point,
	direction: ElbowDirection,
	elbowPoint: Point,
	segment1Length: number,
	segment2Length: number,
	totalLength: number
): { point: Point; angle: number } {
	// Handle degenerate cases
	if (totalLength === 0) {
		return { point: { x: start.x, y: start.y }, angle: 0 };
	}

	const halfLength = totalLength / 2;

	if (halfLength <= segment1Length) {
		// Midpoint is on first segment
		const ratio = halfLength / segment1Length;

		if (direction === 'horizontal-first') {
			// First segment is horizontal
			const x = start.x + (elbowPoint.x - start.x) * ratio;
			return {
				point: { x, y: start.y },
				angle: 0 // Horizontal = 0 degrees
			};
		} else {
			// First segment is vertical
			const y = start.y + (elbowPoint.y - start.y) * ratio;
			return {
				point: { x: start.x, y },
				angle: end.y > start.y ? 90 : -90 // Vertical = 90 or -90 degrees
			};
		}
	} else {
		// Midpoint is on second segment
		const remainingLength = halfLength - segment1Length;
		const ratio = segment2Length > 0 ? remainingLength / segment2Length : 0;

		if (direction === 'horizontal-first') {
			// Second segment is vertical
			const y = elbowPoint.y + (end.y - elbowPoint.y) * ratio;
			return {
				point: { x: elbowPoint.x, y },
				angle: end.y > elbowPoint.y ? 90 : -90 // Vertical = 90 or -90 degrees
			};
		} else {
			// Second segment is horizontal
			const x = elbowPoint.x + (end.x - elbowPoint.x) * ratio;
			return {
				point: { x, y: elbowPoint.y },
				angle: 0 // Horizontal = 0 degrees
			};
		}
	}
}

/**
 * Get the midpoint of an elbow path for label positioning.
 * Simpler version that just returns the midpoint and angle.
 *
 * @param start - Start point
 * @param end - End point
 * @param direction - Elbow direction
 * @returns Point and angle for label positioning
 */
export function getElbowMidpoint(
	start: Point,
	end: Point,
	direction: ElbowDirection
): { point: Point; angle: number } {
	const result = calculateElbowPath(start, end, direction);
	return {
		point: result.midpoint,
		angle: result.midpointAngle
	};
}

/**
 * Check if an elbow path would degenerate to a straight line.
 * This happens when start and end are aligned horizontally or vertically.
 *
 * @param start - Start point
 * @param end - End point
 * @param direction - Elbow direction
 * @returns true if the path would be a straight line
 */
export function isElbowDegenerate(start: Point, end: Point, direction: ElbowDirection): boolean {
	if (direction === 'horizontal-first') {
		// Degenerate if same X (only vertical) or same Y (only horizontal)
		return start.x === end.x || start.y === end.y;
	} else {
		// Degenerate if same Y (only vertical) or same X (only horizontal)
		return start.y === end.y || start.x === end.x;
	}
}
