/**
 * Grapheur Bezier - Catmull-Rom spline to SVG Bezier path conversion
 *
 * This module converts sampled curve points into smooth SVG paths using
 * Catmull-Rom spline interpolation. Catmull-Rom splines pass exactly through
 * all control points and create smooth curves with automatic tangent calculation.
 *
 * @module grapheur/bezier
 */

import type { Point, SampledCurve } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default tension for Catmull-Rom splines.
 * 0.5 is the standard value that produces smooth curves.
 * - 0.0 = straight lines (no curvature)
 * - 0.5 = standard Catmull-Rom (smooth)
 * - 1.0 = tighter curves
 */
const DEFAULT_TENSION = 0.5;

/**
 * Precision for coordinate rounding in SVG paths.
 * Helps reduce path string size without visible quality loss.
 */
const COORD_PRECISION = 4;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Round a number to a fixed precision for SVG coordinates.
 */
function roundCoord(value: number): string {
	// Handle edge cases
	if (!Number.isFinite(value)) {
		return '0';
	}
	// Round and remove trailing zeros
	return parseFloat(value.toFixed(COORD_PRECISION)).toString();
}

/**
 * Format a point for SVG path command.
 */
function formatPoint(p: Point): string {
	return `${roundCoord(p.x)},${roundCoord(p.y)}`;
}

// =============================================================================
// Catmull-Rom to Bezier Conversion
// =============================================================================

/**
 * Calculate Bezier control points for a Catmull-Rom spline segment.
 *
 * Converts a segment of a Catmull-Rom spline (defined by 4 points) into
 * the two control points needed for a cubic Bezier curve. The resulting
 * Bezier curve will pass through p1 and p2.
 *
 * @param p0 - Previous point (for tangent calculation at p1)
 * @param p1 - Start point of segment
 * @param p2 - End point of segment
 * @param p3 - Next point (for tangent calculation at p2)
 * @param tension - Spline tension (0.5 is standard Catmull-Rom)
 * @returns Tuple of [cp1, cp2] control points for cubic Bezier
 *
 * @example
 * ```typescript
 * const [cp1, cp2] = catmullRomToBezier(
 *   { x: 0, y: 0 },
 *   { x: 1, y: 1 },
 *   { x: 2, y: 0 },
 *   { x: 3, y: 1 },
 *   0.5
 * );
 * // cp1 and cp2 are control points for Bezier from (1,1) to (2,0)
 * ```
 */
export function catmullRomToBezier(
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	tension: number = DEFAULT_TENSION
): [Point, Point] {
	// Calculate tangent vectors at p1 and p2
	// For Catmull-Rom, tangent at p_i is proportional to (p_{i+1} - p_{i-1})
	const t = tension;

	// Control point 1: p1 + (p2 - p0) * t / 3
	const cp1: Point = {
		x: p1.x + ((p2.x - p0.x) * t) / 3,
		y: p1.y + ((p2.y - p0.y) * t) / 3
	};

	// Control point 2: p2 - (p3 - p1) * t / 3
	const cp2: Point = {
		x: p2.x - ((p3.x - p1.x) * t) / 3,
		y: p2.y - ((p3.y - p1.y) * t) / 3
	};

	return [cp1, cp2];
}

/**
 * Convert a segment of points (no discontinuities) to Catmull-Rom Bezier path.
 *
 * Takes an array of points and generates SVG path commands (C for cubic Bezier)
 * that create a smooth curve passing through all points.
 *
 * For the first and last segments, uses reflection to estimate the "phantom"
 * points needed for tangent calculation.
 *
 * @param points - Array of points to interpolate (must have at least 2)
 * @param tension - Spline tension (default: 0.5)
 * @returns SVG path commands string (without initial M command)
 *
 * @example
 * ```typescript
 * const points = [
 *   { x: 0, y: 0 },
 *   { x: 1, y: 1 },
 *   { x: 2, y: 0 },
 *   { x: 3, y: 1 }
 * ];
 * const path = pointsToCatmullRom(points);
 * // Returns "C ... C ... C ..." commands for smooth curve
 * ```
 */
export function pointsToCatmullRom(
	points: readonly Point[],
	tension: number = DEFAULT_TENSION
): string {
	const n = points.length;

	// Need at least 2 points
	if (n < 2) {
		return '';
	}

	// Special case: exactly 2 points - use straight line
	if (n === 2) {
		return `L${formatPoint(points[1])}`;
	}

	const commands: string[] = [];

	for (let i = 0; i < n - 1; i++) {
		// Get the four points needed for Catmull-Rom
		// For edge cases, reflect the adjacent point
		const p0 = i === 0 ? reflectPoint(points[1], points[0]) : points[i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = i === n - 2 ? reflectPoint(points[n - 2], points[n - 1]) : points[i + 2];

		// Calculate Bezier control points
		const [cp1, cp2] = catmullRomToBezier(p0, p1, p2, p3, tension);

		// Add cubic Bezier command
		commands.push(`C${formatPoint(cp1)} ${formatPoint(cp2)} ${formatPoint(p2)}`);
	}

	return commands.join('');
}

/**
 * Reflect a point across another point.
 *
 * Used to create "phantom" points at the ends of the curve
 * for proper tangent calculation.
 *
 * @param point - The point to reflect
 * @param center - The center point to reflect across
 * @returns The reflected point
 */
function reflectPoint(point: Point, center: Point): Point {
	return {
		x: 2 * center.x - point.x,
		y: 2 * center.y - point.y
	};
}

// =============================================================================
// SVG Path Generation
// =============================================================================

/**
 * Convert sampled curve to an SVG path string using Catmull-Rom interpolation.
 *
 * Handles discontinuities by creating separate path segments (M command after break).
 * Optionally transforms points from mathematical to SVG coordinates.
 *
 * @param curve - Sampled curve with points and discontinuities
 * @param transformer - Optional function to transform points (math -> SVG coords)
 * @param tension - Spline tension (default: 0.5)
 * @returns SVG path string (M, C commands)
 *
 * @example
 * ```typescript
 * const curve = {
 *   points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
 *   discontinuityIndices: []
 * };
 * const path = curveToSVGPath(curve);
 * // Returns "M0,0C... path commands"
 * ```
 *
 * @example
 * ```typescript
 * // With coordinate transformation (flip y for SVG)
 * const transform = (p: Point) => ({ x: p.x * 50 + 250, y: 250 - p.y * 50 });
 * const path = curveToSVGPath(curve, transform);
 * ```
 *
 * @example
 * ```typescript
 * // Curve with discontinuity (e.g., 1/x)
 * const curve = {
 *   points: [
 *     { x: -2, y: -0.5 }, { x: -1, y: -1 },
 *     { x: 1, y: 1 }, { x: 2, y: 0.5 }
 *   ],
 *   discontinuityIndices: [2]  // Break before index 2
 * };
 * const path = curveToSVGPath(curve);
 * // Returns two separate path segments
 * ```
 */
export function curveToSVGPath(
	curve: SampledCurve,
	transformer?: (p: Point) => Point,
	tension: number = DEFAULT_TENSION
): string {
	const { points, discontinuityIndices } = curve;

	// Handle empty curve
	if (points.length === 0) {
		return '';
	}

	// Transform points if transformer provided
	const transformedPoints = transformer ? points.map(transformer) : points;

	// Handle single point
	if (transformedPoints.length === 1) {
		const p = transformedPoints[0];
		return `M${formatPoint(p)}`;
	}

	// No discontinuities - single continuous path
	if (discontinuityIndices.length === 0) {
		const first = transformedPoints[0];
		return `M${formatPoint(first)}${pointsToCatmullRom(transformedPoints, tension)}`;
	}

	// Split into segments at discontinuities
	const segments = splitAtDiscontinuities(transformedPoints, discontinuityIndices);

	// Generate path for each segment
	const pathParts: string[] = [];

	for (const segment of segments) {
		if (segment.length === 0) continue;

		const first = segment[0];
		const moveTo = `M${formatPoint(first)}`;

		if (segment.length === 1) {
			pathParts.push(moveTo);
		} else {
			pathParts.push(moveTo + pointsToCatmullRom(segment, tension));
		}
	}

	return pathParts.join('');
}

/**
 * Split points array into segments at discontinuity indices.
 *
 * @param points - Array of points
 * @param discontinuityIndices - Indices where breaks occur
 * @returns Array of point segments
 */
function splitAtDiscontinuities(
	points: readonly Point[],
	discontinuityIndices: readonly number[]
): Point[][] {
	if (discontinuityIndices.length === 0) {
		return [[...points]];
	}

	// Create sorted, unique indices
	const sortedIndices = [...new Set(discontinuityIndices)]
		.filter((i) => i > 0 && i <= points.length)
		.sort((a, b) => a - b);

	if (sortedIndices.length === 0) {
		return [[...points]];
	}

	const segments: Point[][] = [];
	let startIdx = 0;

	for (const breakIdx of sortedIndices) {
		if (breakIdx > startIdx) {
			segments.push(points.slice(startIdx, breakIdx));
		}
		startIdx = breakIdx;
	}

	// Add final segment
	if (startIdx < points.length) {
		segments.push(points.slice(startIdx));
	}

	return segments;
}

/**
 * Generate a simple polyline path (straight line segments).
 *
 * Faster than Catmull-Rom but produces angular curves.
 * Useful for previews or when performance is critical.
 *
 * @param curve - Sampled curve with points and discontinuities
 * @param transformer - Optional function to transform points
 * @returns SVG path string (M, L commands)
 *
 * @example
 * ```typescript
 * const path = curveToPolylinePath(curve);
 * // Returns "M0,0L1,1L2,4L3,9..." without smoothing
 * ```
 */
export function curveToPolylinePath(
	curve: SampledCurve,
	transformer?: (p: Point) => Point
): string {
	const { points, discontinuityIndices } = curve;

	if (points.length === 0) {
		return '';
	}

	const transformedPoints = transformer ? points.map(transformer) : points;

	if (transformedPoints.length === 1) {
		return `M${formatPoint(transformedPoints[0])}`;
	}

	if (discontinuityIndices.length === 0) {
		const commands = transformedPoints.map((p, i) =>
			i === 0 ? `M${formatPoint(p)}` : `L${formatPoint(p)}`
		);
		return commands.join('');
	}

	const segments = splitAtDiscontinuities(transformedPoints, discontinuityIndices);
	const pathParts: string[] = [];

	for (const segment of segments) {
		if (segment.length === 0) continue;

		const commands = segment.map((p, i) => (i === 0 ? `M${formatPoint(p)}` : `L${formatPoint(p)}`));
		pathParts.push(commands.join(''));
	}

	return pathParts.join('');
}

/**
 * Create a coordinate transformer for converting math coordinates to SVG.
 *
 * In SVG, y increases downward, so we need to flip the y-axis.
 * This function creates a transformer that handles the conversion.
 *
 * @param mathViewport - Mathematical viewport bounds
 * @param svgWidth - SVG canvas width in pixels
 * @param svgHeight - SVG canvas height in pixels
 * @returns Transformer function for curveToSVGPath
 *
 * @example
 * ```typescript
 * const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
 * const transform = createMathToSVGTransformer(viewport, 500, 500);
 *
 * // Math point (0, 0) -> SVG point (250, 250) (center)
 * // Math point (10, 10) -> SVG point (500, 0) (top-right)
 * ```
 */
export function createMathToSVGTransformer(
	mathViewport: { xMin: number; xMax: number; yMin: number; yMax: number },
	svgWidth: number,
	svgHeight: number
): (p: Point) => Point {
	const mathWidth = mathViewport.xMax - mathViewport.xMin;
	const mathHeight = mathViewport.yMax - mathViewport.yMin;

	// Scale factors
	const scaleX = svgWidth / mathWidth;
	const scaleY = svgHeight / mathHeight;

	return (p: Point): Point => ({
		// x: scale and translate
		x: (p.x - mathViewport.xMin) * scaleX,
		// y: scale, translate, and flip (SVG y increases downward)
		y: svgHeight - (p.y - mathViewport.yMin) * scaleY
	});
}
