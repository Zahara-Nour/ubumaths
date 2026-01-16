/**
 * Stroke Smoothing with perfect-freehand
 *
 * Converts raw pointer input points into smooth, pressure-sensitive strokes.
 *
 * @module whiteboard/core/stroke-smoothing
 */

import getStroke from 'perfect-freehand';
import type { Point, StrokeToolType } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of points per stroke */
const MAX_POINTS = 50000;

/** Minimum stroke size */
const MIN_SIZE = 1;

/** Maximum stroke size */
const MAX_SIZE = 100;

// =============================================================================
// Types
// =============================================================================

export interface SmoothingOptions {
	/** Stroke size/width */
	size: number;
	/** Amount of thinning at the start and end (0 to 1) */
	thinning?: number;
	/** Amount of smoothing (0 to 1) */
	smoothing?: number;
	/** Amount of streamlining (0 to 1) */
	streamline?: number;
	/** Simulate pressure for non-pressure input */
	simulatePressure?: boolean;
	/** Easing function for taper start */
	easing?: (t: number) => number;
	/** Start cap style */
	start?: { taper?: number | boolean; cap?: boolean };
	/** End cap style */
	end?: { taper?: number | boolean; cap?: boolean };
}

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a Point has valid finite coordinates
 */
function isValidInputPoint(p: Point): boolean {
	return Number.isFinite(p.x) && Number.isFinite(p.y);
}

/**
 * Check if an outline point [x, y] has valid finite coordinates
 */
function isValidOutlinePoint(p: unknown): p is [number, number] {
	return (
		Array.isArray(p) &&
		p.length >= 2 &&
		typeof p[0] === 'number' &&
		typeof p[1] === 'number' &&
		Number.isFinite(p[0]) &&
		Number.isFinite(p[1])
	);
}

// =============================================================================
// Stroke Smoothing
// =============================================================================

/**
 * Convert raw points to smooth outline points using perfect-freehand
 *
 * @param points - Raw input points from pointer events
 * @param options - Smoothing options
 * @returns Array of outline points [[x, y], ...]
 */
export function smoothStroke(points: Point[], options: SmoothingOptions): number[][] {
	if (points.length === 0) {
		return [];
	}

	// Filter out invalid points (NaN, Infinity, etc.) and limit count
	const validPoints = points.filter(isValidInputPoint);
	if (validPoints.length === 0) {
		console.warn('[stroke-smoothing] No valid points in stroke');
		return [];
	}

	const limitedPoints =
		validPoints.length > MAX_POINTS ? validPoints.slice(0, MAX_POINTS) : validPoints;

	// Convert to format expected by perfect-freehand: [x, y, pressure?]
	const inputPoints = limitedPoints.map((p) => {
		if (p.pressure !== undefined && Number.isFinite(p.pressure)) {
			return [p.x, p.y, p.pressure];
		}
		return [p.x, p.y];
	});

	// Get stroke outline from perfect-freehand
	const outlinePoints = getStroke(inputPoints, {
		size: Math.max(MIN_SIZE, Math.min(MAX_SIZE, options.size)),
		thinning: options.thinning ?? 0.5,
		smoothing: options.smoothing ?? 0.5,
		streamline: options.streamline ?? 0.5,
		simulatePressure: options.simulatePressure ?? true,
		easing: options.easing ?? ((t) => t),
		start: options.start ?? { taper: 0, cap: true },
		end: options.end ?? { taper: 0, cap: true }
	});

	return outlinePoints;
}

/**
 * Get tool-specific smoothing options
 *
 * @param toolType - The type of drawing tool
 * @param size - Base stroke size
 * @param color - Stroke color (unused but kept for future)
 * @param opacity - Stroke opacity (unused but kept for future)
 * @returns Configured smoothing options
 */
export function getToolOptions(
	toolType: StrokeToolType,
	size: number,
	_color: string,
	_opacity: number
): SmoothingOptions {
	const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));

	switch (toolType) {
		case 'pen':
			return {
				size: clampedSize,
				thinning: 0.5,
				smoothing: 0.5,
				streamline: 0.5,
				simulatePressure: true,
				start: { taper: 0, cap: true },
				end: { taper: 0, cap: true }
			};

		case 'marker':
			// Marker: no pressure sensitivity, consistent width
			return {
				size: clampedSize,
				thinning: 0, // No thinning for consistent width
				smoothing: 0.5,
				streamline: 0.5,
				simulatePressure: false, // Ignore pressure data
				start: { taper: 0, cap: true },
				end: { taper: 0, cap: true }
			};

		case 'highlighter':
			return {
				size: clampedSize,
				thinning: 0.1, // Less thinning for consistent width
				smoothing: 0.5,
				streamline: 0.6,
				simulatePressure: false, // Highlighters don't vary with pressure
				start: { taper: false, cap: false },
				end: { taper: false, cap: false }
			};

		case 'eraser':
			return {
				size: clampedSize,
				thinning: 0,
				smoothing: 0.5,
				streamline: 0.5,
				simulatePressure: false,
				start: { taper: false, cap: true },
				end: { taper: false, cap: true }
			};

		default:
			return {
				size: clampedSize,
				thinning: 0.5,
				smoothing: 0.5,
				streamline: 0.5,
				simulatePressure: true
			};
	}
}

// =============================================================================
// SVG Path Generation
// =============================================================================

/**
 * Convert outline points to SVG path string
 *
 * Uses quadratic bezier curves for smooth rendering.
 *
 * @param outlinePoints - Points from smoothStroke
 * @returns SVG path d attribute string
 */
export function pointsToSvgPath(outlinePoints: number[][]): string {
	if (outlinePoints.length === 0) {
		return '';
	}

	// Filter to only valid points (handles NaN, Infinity, malformed data)
	const validPoints = outlinePoints.filter(isValidOutlinePoint);
	if (validPoints.length === 0) {
		console.warn('[stroke-smoothing] No valid outline points');
		return '';
	}

	if (validPoints.length === 1) {
		// Single point - create a small circle
		const [x, y] = validPoints[0];
		return `M ${x} ${y} L ${x} ${y} Z`;
	}

	// Build path using quadratic bezier curves for smoothness
	const [first, ...rest] = validPoints;

	let path = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;

	if (rest.length === 1) {
		// Two points - just a line
		path += ` L ${rest[0][0].toFixed(2)} ${rest[0][1].toFixed(2)}`;
	} else {
		// Multiple points - use quadratic curves
		for (let i = 0; i < rest.length - 1; i++) {
			const current = rest[i];
			const next = rest[i + 1];
			// Use current point as control point, midpoint to next as end point
			const midX = (current[0] + next[0]) / 2;
			const midY = (current[1] + next[1]) / 2;
			path += ` Q ${current[0].toFixed(2)} ${current[1].toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
		}
		// Final point
		const last = rest[rest.length - 1];
		path += ` L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
	}

	// Close the path
	path += ' Z';

	return path;
}

// =============================================================================
// Geometry Utilities
// =============================================================================

/**
 * Calculate bounding box for a set of points
 *
 * @param points - Array of points
 * @param strokeWidth - Optional stroke width to expand bbox
 * @returns Bounding box coordinates
 */
export function getBoundingBox(points: Point[], strokeWidth: number = 0): BoundingBox {
	if (points.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
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

	// If no valid points, return zero bbox
	if (!hasValidPoint) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	}

	// Expand by half stroke width on each side
	const halfWidth = Number.isFinite(strokeWidth) ? strokeWidth / 2 : 0;

	return {
		minX: minX - halfWidth,
		minY: minY - halfWidth,
		maxX: maxX + halfWidth,
		maxY: maxY + halfWidth
	};
}

/**
 * Check if two axis-aligned bounding boxes intersect
 */
function doBoundingBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
	return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Check if a point is inside a bounding box
 */
function isPointInBoundingBox(x: number, y: number, bbox: BoundingBox): boolean {
	return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
}

/**
 * Get distance from point to line segment
 */
function pointToSegmentDistance(
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

	// Project point onto line, clamped to segment
	let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
	t = Math.max(0, Math.min(1, t));

	const projX = x1 + t * dx;
	const projY = y1 + t * dy;

	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Check if two line segments actually intersect (cross each other)
 */
function doSegmentsIntersect(
	a1x: number,
	a1y: number,
	a2x: number,
	a2y: number,
	b1x: number,
	b1y: number,
	b2x: number,
	b2y: number
): boolean {
	// Using cross product to determine if segments cross
	const d1x = a2x - a1x;
	const d1y = a2y - a1y;
	const d2x = b2x - b1x;
	const d2y = b2y - b1y;

	const cross = d1x * d2y - d1y * d2x;

	// Parallel or collinear
	if (Math.abs(cross) < 1e-10) {
		return false;
	}

	const t = ((b1x - a1x) * d2y - (b1y - a1y) * d2x) / cross;
	const u = ((b1x - a1x) * d1y - (b1y - a1y) * d1x) / cross;

	return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Check if two line segments are within a given distance of each other
 */
function segmentsWithinDistance(
	a1x: number,
	a1y: number,
	a2x: number,
	a2y: number,
	b1x: number,
	b1y: number,
	b2x: number,
	b2y: number,
	maxDistance: number
): boolean {
	// First check if segments actually intersect
	if (doSegmentsIntersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y)) {
		return true;
	}

	// Check endpoints of each segment against the other segment
	if (pointToSegmentDistance(a1x, a1y, b1x, b1y, b2x, b2y) <= maxDistance) return true;
	if (pointToSegmentDistance(a2x, a2y, b1x, b1y, b2x, b2y) <= maxDistance) return true;
	if (pointToSegmentDistance(b1x, b1y, a1x, a1y, a2x, a2y) <= maxDistance) return true;
	if (pointToSegmentDistance(b2x, b2y, a1x, a1y, a2x, a2y) <= maxDistance) return true;

	return false;
}

/**
 * Check if two strokes intersect, considering their widths
 *
 * @param stroke1Points - Points of first stroke
 * @param stroke2Points - Points of second stroke
 * @param width1 - Width of first stroke
 * @param width2 - Width of second stroke
 * @returns True if strokes intersect
 */
export function doStrokesIntersect(
	stroke1Points: Point[],
	stroke2Points: Point[],
	width1: number,
	width2: number
): boolean {
	if (stroke1Points.length === 0 || stroke2Points.length === 0) {
		return false;
	}

	// Quick bounding box check first
	const bbox1 = getBoundingBox(stroke1Points, width1);
	const bbox2 = getBoundingBox(stroke2Points, width2);

	if (!doBoundingBoxesIntersect(bbox1, bbox2)) {
		return false;
	}

	// For single points, just check bbox intersection
	if (stroke1Points.length === 1 || stroke2Points.length === 1) {
		// Check if any point from one stroke is within the bbox of the other
		if (stroke1Points.length === 1) {
			return isPointInBoundingBox(stroke1Points[0].x, stroke1Points[0].y, bbox2);
		}
		return isPointInBoundingBox(stroke2Points[0].x, stroke2Points[0].y, bbox1);
	}

	// Combined max distance for intersection
	const maxDistance = (width1 + width2) / 2;

	// Check segment-to-segment distances
	for (let i = 0; i < stroke1Points.length - 1; i++) {
		const a1 = stroke1Points[i];
		const a2 = stroke1Points[i + 1];

		for (let j = 0; j < stroke2Points.length - 1; j++) {
			const b1 = stroke2Points[j];
			const b2 = stroke2Points[j + 1];

			if (segmentsWithinDistance(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y, b2.x, b2.y, maxDistance)) {
				return true;
			}
		}
	}

	return false;
}
