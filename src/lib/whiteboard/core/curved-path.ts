/**
 * Curved Path Calculation
 *
 * Calculates SVG path data for curved arrows using Catmull-Rom splines
 * converted to cubic Bezier curves.
 *
 * The algorithm:
 * 1. Takes start point, end point, and optional waypoints
 * 2. Creates a smooth curve passing through all points using Catmull-Rom splines
 * 3. Converts Catmull-Rom segments to cubic Bezier curves for SVG rendering
 *
 * @module whiteboard/core/curved-path
 */

import type { Point, ArrowWaypoint } from '../types/document';

// =============================================================================
// Types
// =============================================================================

/** Result of curved path calculation */
export interface CurvedPathResult {
	/** SVG path data (d attribute) with M and C commands */
	path: string;
	/** Midpoint along the curve for label positioning */
	midpoint: Point;
	/** Angle at midpoint in degrees (for label rotation) */
	midpointAngle: number;
	/** Total approximate path length in pixels */
	totalLength: number;
	/** Midpoints of each segment (for "add waypoint" UI) */
	segmentMidpoints: Point[];
}

/** Cubic Bezier segment with start, two control points, and end */
interface BezierSegment {
	p0: Point;
	p1: Point; // Control point 1
	p2: Point; // Control point 2
	p3: Point;
}

// =============================================================================
// Catmull-Rom to Bezier Conversion
// =============================================================================

/**
 * Convert a Catmull-Rom spline segment to a cubic Bezier segment.
 *
 * Given 4 points (P0, P1, P2, P3), the Catmull-Rom curve passes through P1 and P2.
 * The control points for the equivalent cubic Bezier are calculated as:
 *   Control1 = P1 + (P2 - P0) / 6
 *   Control2 = P2 - (P3 - P1) / 6
 *
 * @param p0 - Point before the segment (for tangent calculation)
 * @param p1 - Start point of the segment
 * @param p2 - End point of the segment
 * @param p3 - Point after the segment (for tangent calculation)
 * @param tension - Tension parameter (0 = straight lines, 1 = default Catmull-Rom)
 * @returns Cubic Bezier segment
 */
function catmullRomToBezier(
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	tension: number = 1
): BezierSegment {
	// Scale factor for control points (affects curve smoothness)
	const scale = tension / 6;

	// Calculate control points using Catmull-Rom tangent formulas
	const c1: Point = {
		x: p1.x + (p2.x - p0.x) * scale,
		y: p1.y + (p2.y - p0.y) * scale
	};

	const c2: Point = {
		x: p2.x - (p3.x - p1.x) * scale,
		y: p2.y - (p3.y - p1.y) * scale
	};

	return {
		p0: p1,
		p1: c1,
		p2: c2,
		p3: p2
	};
}

// =============================================================================
// Path Calculation
// =============================================================================

/**
 * Calculate a smooth curved path through a series of points.
 *
 * Uses Catmull-Rom splines converted to cubic Bezier curves.
 * The curve passes through all provided points.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param waypoints - Intermediate waypoints the curve passes through
 * @param tension - Curve tension (0.5 = tight curves, 1 = smooth, default: 1)
 * @returns CurvedPathResult with path data and metadata
 */
export function calculateCurvedPath(
	start: Point,
	end: Point,
	waypoints: readonly ArrowWaypoint[],
	tension: number = 1
): CurvedPathResult {
	// Build the full point sequence
	const allPoints: Point[] = [start, ...waypoints.map((wp) => wp.position), end];

	// Handle degenerate cases
	if (allPoints.length < 2) {
		return {
			path: '',
			midpoint: start,
			midpointAngle: 0,
			totalLength: 0,
			segmentMidpoints: []
		};
	}

	// For 2 points (no waypoints), draw a straight line with a slight curve for visual distinction
	if (allPoints.length === 2) {
		const [p1, p2] = allPoints;
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const length = Math.sqrt(dx * dx + dy * dy);

		return {
			path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
			midpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
			midpointAngle: Math.atan2(dy, dx) * (180 / Math.PI),
			totalLength: length,
			segmentMidpoints: [{ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }]
		};
	}

	// Generate Bezier segments for the curve
	const bezierSegments = generateBezierSegments(allPoints, tension);

	// Build SVG path
	const pathCommands = generateSvgPath(bezierSegments);

	// Calculate segment midpoints for "add waypoint" UI
	const segmentMidpoints = calculateSegmentMidpoints(bezierSegments);

	// Calculate total length and curve midpoint
	const { totalLength, midpoint, midpointAngle } = calculatePathMetrics(bezierSegments);

	return {
		path: pathCommands,
		midpoint,
		midpointAngle,
		totalLength,
		segmentMidpoints
	};
}

/**
 * Generate Bezier segments from a list of points using Catmull-Rom interpolation.
 */
function generateBezierSegments(points: Point[], tension: number): BezierSegment[] {
	const segments: BezierSegment[] = [];

	// Need at least 2 points for a segment
	if (points.length < 2) return segments;

	// For Catmull-Rom, we need 4 points per segment (p0, p1, p2, p3)
	// For the first segment, we "mirror" p0 = p1
	// For the last segment, we "mirror" p3 = p2
	for (let i = 0; i < points.length - 1; i++) {
		// Get the 4 points needed for Catmull-Rom
		const p0 = i === 0 ? mirrorPoint(points[0], points[1]) : points[i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 =
			i === points.length - 2
				? mirrorPoint(points[points.length - 1], points[points.length - 2])
				: points[i + 2];

		segments.push(catmullRomToBezier(p0, p1, p2, p3, tension));
	}

	return segments;
}

/**
 * Mirror a point across another point (for handling endpoints in Catmull-Rom).
 * result = 2 * anchor - point
 */
function mirrorPoint(anchor: Point, point: Point): Point {
	return {
		x: 2 * anchor.x - point.x,
		y: 2 * anchor.y - point.y
	};
}

/**
 * Generate SVG path commands from Bezier segments.
 */
function generateSvgPath(segments: BezierSegment[]): string {
	if (segments.length === 0) return '';

	const commands: string[] = [];

	// Move to start point
	commands.push(`M ${segments[0].p0.x} ${segments[0].p0.y}`);

	// Add cubic Bezier commands for each segment
	for (const seg of segments) {
		commands.push(`C ${seg.p1.x} ${seg.p1.y}, ${seg.p2.x} ${seg.p2.y}, ${seg.p3.x} ${seg.p3.y}`);
	}

	return commands.join(' ');
}

/**
 * Calculate the midpoint of each Bezier segment (at t=0.5).
 * Used for the "add waypoint" UI.
 */
function calculateSegmentMidpoints(segments: BezierSegment[]): Point[] {
	return segments.map((seg) => evaluateBezierAt(seg, 0.5));
}

/**
 * Evaluate a cubic Bezier curve at parameter t (0 to 1).
 * Uses De Casteljau's algorithm for numerical stability.
 */
function evaluateBezierAt(seg: BezierSegment, t: number): Point {
	const u = 1 - t;
	const u2 = u * u;
	const u3 = u2 * u;
	const t2 = t * t;
	const t3 = t2 * t;

	return {
		x: u3 * seg.p0.x + 3 * u2 * t * seg.p1.x + 3 * u * t2 * seg.p2.x + t3 * seg.p3.x,
		y: u3 * seg.p0.y + 3 * u2 * t * seg.p1.y + 3 * u * t2 * seg.p2.y + t3 * seg.p3.y
	};
}

/**
 * Calculate the tangent (derivative) of a cubic Bezier curve at parameter t.
 */
function evaluateBezierTangentAt(seg: BezierSegment, t: number): Point {
	const u = 1 - t;
	const u2 = u * u;
	const t2 = t * t;

	// Derivative of cubic Bezier
	return {
		x:
			3 * u2 * (seg.p1.x - seg.p0.x) +
			6 * u * t * (seg.p2.x - seg.p1.x) +
			3 * t2 * (seg.p3.x - seg.p2.x),
		y:
			3 * u2 * (seg.p1.y - seg.p0.y) +
			6 * u * t * (seg.p2.y - seg.p1.y) +
			3 * t2 * (seg.p3.y - seg.p2.y)
	};
}

/**
 * Approximate the length of a cubic Bezier segment using subdivision.
 */
function approximateBezierLength(seg: BezierSegment, subdivisions: number = 10): number {
	let length = 0;
	let prevPoint = seg.p0;

	for (let i = 1; i <= subdivisions; i++) {
		const t = i / subdivisions;
		const point = evaluateBezierAt(seg, t);
		length += Math.sqrt((point.x - prevPoint.x) ** 2 + (point.y - prevPoint.y) ** 2);
		prevPoint = point;
	}

	return length;
}

/**
 * Calculate path metrics: total length, midpoint position, and midpoint angle.
 */
function calculatePathMetrics(segments: BezierSegment[]): {
	totalLength: number;
	midpoint: Point;
	midpointAngle: number;
} {
	if (segments.length === 0) {
		return { totalLength: 0, midpoint: { x: 0, y: 0 }, midpointAngle: 0 };
	}

	// Calculate segment lengths
	const segmentLengths = segments.map((seg) => approximateBezierLength(seg));
	const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);

	// Find the midpoint (at 50% of total length)
	const targetLength = totalLength / 2;
	let accumulatedLength = 0;

	for (let i = 0; i < segments.length; i++) {
		const segLength = segmentLengths[i];

		if (accumulatedLength + segLength >= targetLength) {
			// Midpoint is in this segment
			const remainingLength = targetLength - accumulatedLength;
			const t = segLength > 0 ? remainingLength / segLength : 0.5;

			const midpoint = evaluateBezierAt(segments[i], t);
			const tangent = evaluateBezierTangentAt(segments[i], t);
			const midpointAngle = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI);

			return { totalLength, midpoint, midpointAngle };
		}

		accumulatedLength += segLength;
	}

	// Fallback: use the end of the last segment
	const lastSeg = segments[segments.length - 1];
	return {
		totalLength,
		midpoint: lastSeg.p3,
		midpointAngle: 0
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a point on the curved path at a specific ratio (0 to 1).
 * Useful for animations or intermediate calculations.
 *
 * @param start - Start point
 * @param end - End point
 * @param waypoints - Intermediate waypoints
 * @param ratio - Position along the curve (0 = start, 1 = end)
 * @returns Point at the specified ratio
 */
export function getPointOnCurvedPath(
	start: Point,
	end: Point,
	waypoints: readonly ArrowWaypoint[],
	ratio: number
): Point {
	const allPoints: Point[] = [start, ...waypoints.map((wp) => wp.position), end];

	if (allPoints.length < 2) return start;
	if (allPoints.length === 2) {
		return {
			x: allPoints[0].x + (allPoints[1].x - allPoints[0].x) * ratio,
			y: allPoints[0].y + (allPoints[1].y - allPoints[0].y) * ratio
		};
	}

	const segments = generateBezierSegments(allPoints, 1);
	const segmentLengths = segments.map((seg) => approximateBezierLength(seg));
	const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
	const targetLength = totalLength * ratio;

	let accumulatedLength = 0;
	for (let i = 0; i < segments.length; i++) {
		const segLength = segmentLengths[i];
		if (accumulatedLength + segLength >= targetLength) {
			const remainingLength = targetLength - accumulatedLength;
			const t = segLength > 0 ? remainingLength / segLength : 0;
			return evaluateBezierAt(segments[i], t);
		}
		accumulatedLength += segLength;
	}

	return end;
}

/**
 * Calculate the angle at a specific point on the curve.
 * Useful for rotating arrow heads or labels.
 *
 * @param start - Start point
 * @param end - End point
 * @param waypoints - Intermediate waypoints
 * @param ratio - Position along the curve (0 = start, 1 = end)
 * @returns Angle in degrees
 */
export function getAngleOnCurvedPath(
	start: Point,
	end: Point,
	waypoints: readonly ArrowWaypoint[],
	ratio: number
): number {
	const allPoints: Point[] = [start, ...waypoints.map((wp) => wp.position), end];

	if (allPoints.length < 2) return 0;
	if (allPoints.length === 2) {
		const dx = allPoints[1].x - allPoints[0].x;
		const dy = allPoints[1].y - allPoints[0].y;
		return Math.atan2(dy, dx) * (180 / Math.PI);
	}

	const segments = generateBezierSegments(allPoints, 1);
	const segmentLengths = segments.map((seg) => approximateBezierLength(seg));
	const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
	const targetLength = totalLength * ratio;

	let accumulatedLength = 0;
	for (let i = 0; i < segments.length; i++) {
		const segLength = segmentLengths[i];
		if (accumulatedLength + segLength >= targetLength) {
			const remainingLength = targetLength - accumulatedLength;
			const t = segLength > 0 ? remainingLength / segLength : 0;
			const tangent = evaluateBezierTangentAt(segments[i], t);
			return Math.atan2(tangent.y, tangent.x) * (180 / Math.PI);
		}
		accumulatedLength += segLength;
	}

	return 0;
}

/**
 * Find the closest point on a Bezier segment to a given point.
 * Uses iterative refinement for accuracy.
 *
 * @param segment - The Bezier segment
 * @param point - The point to find the closest position to
 * @param iterations - Number of refinement iterations (default: 5)
 * @returns Object with the closest point on the curve and the parameter t
 */
export function closestPointOnBezierSegment(
	segment: BezierSegment,
	point: Point,
	iterations: number = 5
): { point: Point; t: number; distance: number } {
	// Initial coarse search
	let bestT = 0;
	let bestDistance = Infinity;
	const initialSamples = 20;

	for (let i = 0; i <= initialSamples; i++) {
		const t = i / initialSamples;
		const curvePoint = evaluateBezierAt(segment, t);
		const dist = Math.sqrt((curvePoint.x - point.x) ** 2 + (curvePoint.y - point.y) ** 2);
		if (dist < bestDistance) {
			bestDistance = dist;
			bestT = t;
		}
	}

	// Refine with binary search
	let tMin = Math.max(0, bestT - 1 / initialSamples);
	let tMax = Math.min(1, bestT + 1 / initialSamples);

	for (let iter = 0; iter < iterations; iter++) {
		const step = (tMax - tMin) / 4;
		let currentBestT = tMin;
		let currentBestDist = Infinity;

		for (let i = 0; i <= 4; i++) {
			const t = tMin + i * step;
			const curvePoint = evaluateBezierAt(segment, t);
			const dist = Math.sqrt((curvePoint.x - point.x) ** 2 + (curvePoint.y - point.y) ** 2);
			if (dist < currentBestDist) {
				currentBestDist = dist;
				currentBestT = t;
			}
		}

		bestT = currentBestT;
		bestDistance = currentBestDist;
		tMin = Math.max(0, bestT - step);
		tMax = Math.min(1, bestT + step);
	}

	return {
		point: evaluateBezierAt(segment, bestT),
		t: bestT,
		distance: bestDistance
	};
}

/**
 * Check if a point is within a certain distance of the curved path.
 * Used for hit testing.
 *
 * @param start - Start point of the arrow
 * @param end - End point of the arrow
 * @param waypoints - Intermediate waypoints
 * @param point - Point to test
 * @param tolerance - Distance tolerance in pixels
 * @returns true if point is within tolerance of the curve
 */
export function hitTestCurvedPath(
	start: Point,
	end: Point,
	waypoints: readonly ArrowWaypoint[],
	point: Point,
	tolerance: number
): boolean {
	const allPoints: Point[] = [start, ...waypoints.map((wp) => wp.position), end];

	if (allPoints.length < 2) return false;

	// Simple case: straight line
	if (allPoints.length === 2) {
		return distanceToLineSegment(point, allPoints[0], allPoints[1]) <= tolerance;
	}

	// Generate Bezier segments and test each
	const segments = generateBezierSegments(allPoints, 1);

	for (const segment of segments) {
		const result = closestPointOnBezierSegment(segment, point);
		if (result.distance <= tolerance) {
			return true;
		}
	}

	return false;
}

/**
 * Calculate distance from a point to a line segment.
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
