/**
 * Viewport Utilities - Coordinate transformations and viewport operations
 *
 * This module provides utilities for:
 * - Converting between mathematical and SVG coordinates
 * - Pan and zoom operations on viewports
 * - Deriving viewport metrics
 *
 * All functions are pure and return new objects (immutable operations).
 *
 * @module grapheur/viewport
 */

import type { Viewport, ViewportMetrics, Point } from './types';

// =============================================================================
// Default Viewport
// =============================================================================

/**
 * Default viewport showing -10 to 10 on both axes
 */
export const DEFAULT_VIEWPORT: Viewport = {
	xMin: -10,
	xMax: 10,
	yMin: -10,
	yMax: 10
} as const;

/**
 * Minimum viewport span (prevents excessive zoom)
 */
const MIN_SPAN = 1e-6;

/**
 * Maximum viewport span (prevents loss of precision)
 */
const MAX_SPAN = 1e10;

// =============================================================================
// Coordinate Transformer
// =============================================================================

/**
 * Interface for bidirectional coordinate transformation
 *
 * Converts between mathematical coordinates (y-up) and SVG coordinates (y-down).
 */
export interface CoordinateTransformer {
	/**
	 * Convert mathematical coordinates to SVG coordinates
	 *
	 * @param x - Mathematical x coordinate
	 * @param y - Mathematical y coordinate
	 * @returns Point in SVG coordinates
	 */
	mathToSvg(x: number, y: number): Point;

	/**
	 * Convert SVG coordinates to mathematical coordinates
	 *
	 * @param x - SVG x coordinate (pixels from left)
	 * @param y - SVG y coordinate (pixels from top)
	 * @returns Point in mathematical coordinates
	 */
	svgToMath(x: number, y: number): Point;

	/** Pixels per math unit (horizontal) */
	readonly scaleX: number;

	/** Pixels per math unit (vertical, positive value) */
	readonly scaleY: number;
}

/**
 * Creates a coordinate transformer for the given viewport and SVG dimensions
 *
 * The transformer handles the coordinate system differences:
 * - Math: y increases upward, origin can be anywhere
 * - SVG: y increases downward, origin at top-left
 *
 * @param viewport - The mathematical viewport bounds
 * @param svgWidth - Width of the SVG in pixels
 * @param svgHeight - Height of the SVG in pixels
 * @returns A CoordinateTransformer for bidirectional conversion
 *
 * @example
 * ```typescript
 * const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
 * const transformer = createTransformer(viewport, 800, 600);
 *
 * // Convert math point to SVG
 * const svgPoint = transformer.mathToSvg(0, 0); // Center of viewport
 *
 * // Convert SVG point to math
 * const mathPoint = transformer.svgToMath(400, 300); // Should be (0, 0)
 * ```
 */
export function createTransformer(
	viewport: Viewport,
	svgWidth: number,
	svgHeight: number
): CoordinateTransformer {
	const mathWidth = viewport.xMax - viewport.xMin;
	const mathHeight = viewport.yMax - viewport.yMin;

	// Scale factors: pixels per math unit
	// Defensive check: prevents NaN propagation if viewport somehow has zero span
	const scaleX = mathWidth > 0 ? svgWidth / mathWidth : 1;
	const scaleY = mathHeight > 0 ? svgHeight / mathHeight : 1;

	return {
		mathToSvg(x: number, y: number): Point {
			return {
				// x: distance from left edge, scaled to pixels
				x: (x - viewport.xMin) * scaleX,
				// y: distance from top edge (inverted), scaled to pixels
				y: (viewport.yMax - y) * scaleY
			};
		},

		svgToMath(x: number, y: number): Point {
			return {
				// x: convert pixel offset to math units
				x: viewport.xMin + x / scaleX,
				// y: convert pixel offset to math units (inverted)
				y: viewport.yMax - y / scaleY
			};
		},

		scaleX,
		scaleY
	};
}

// =============================================================================
// Viewport Operations
// =============================================================================

/**
 * Pan the viewport by a given delta in mathematical coordinates
 *
 * @param viewport - The current viewport
 * @param dx - Horizontal displacement (positive = pan right)
 * @param dy - Vertical displacement (positive = pan up)
 * @returns A new viewport with the panning applied
 *
 * @example
 * ```typescript
 * const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
 * const panned = panViewport(viewport, 5, 0);
 * // Result: { xMin: -5, xMax: 15, yMin: -10, yMax: 10 }
 * ```
 */
export function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
	return {
		xMin: viewport.xMin + dx,
		xMax: viewport.xMax + dx,
		yMin: viewport.yMin + dy,
		yMax: viewport.yMax + dy
	};
}

/**
 * Zoom the viewport by a scale factor around a center point
 *
 * A factor > 1 zooms out (shows more), factor < 1 zooms in (shows less).
 * If no center is provided, zooms around the viewport center.
 *
 * @param viewport - The current viewport
 * @param factor - Scale factor (e.g., 0.5 = zoom in 2x, 2 = zoom out 2x)
 * @param centerX - X coordinate to zoom around (default: viewport center)
 * @param centerY - Y coordinate to zoom around (default: viewport center)
 * @returns A new viewport with the zoom applied
 *
 * @example
 * ```typescript
 * const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
 *
 * // Zoom in 2x at center
 * const zoomedIn = zoomViewport(viewport, 0.5);
 * // Result: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
 *
 * // Zoom out 2x at point (5, 5)
 * const zoomedOut = zoomViewport(viewport, 2, 5, 5);
 * ```
 */
export function zoomViewport(
	viewport: Viewport,
	factor: number,
	centerX?: number,
	centerY?: number
): Viewport {
	// Use viewport center if no center specified
	const cx = centerX ?? (viewport.xMin + viewport.xMax) / 2;
	const cy = centerY ?? (viewport.yMin + viewport.yMax) / 2;

	// Current half-widths
	const halfWidth = (viewport.xMax - viewport.xMin) / 2;
	const halfHeight = (viewport.yMax - viewport.yMin) / 2;

	// New half-widths after scaling
	const newHalfWidth = halfWidth * factor;
	const newHalfHeight = halfHeight * factor;

	// Clamp to valid range
	const clampedHalfWidth = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, newHalfWidth));
	const clampedHalfHeight = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, newHalfHeight));

	// Calculate the position of the center relative to the old viewport center
	const oldCenterX = (viewport.xMin + viewport.xMax) / 2;
	const oldCenterY = (viewport.yMin + viewport.yMax) / 2;

	// Adjust center to maintain the zoom point
	// The zoom point should stay at the same relative position
	const relX = (cx - oldCenterX) / halfWidth;
	const relY = (cy - oldCenterY) / halfHeight;

	const newCenterX = cx - relX * clampedHalfWidth;
	const newCenterY = cy - relY * clampedHalfHeight;

	return {
		xMin: newCenterX - clampedHalfWidth,
		xMax: newCenterX + clampedHalfWidth,
		yMin: newCenterY - clampedHalfHeight,
		yMax: newCenterY + clampedHalfHeight
	};
}

/**
 * Reset viewport to the default (-10 to 10 on both axes)
 *
 * @returns The default viewport
 *
 * @example
 * ```typescript
 * const viewport = resetViewport();
 * // Result: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
 * ```
 */
export function resetViewport(): Viewport {
	return { ...DEFAULT_VIEWPORT };
}

/**
 * Create a viewport with specified center and dimensions
 *
 * @param centerX - Center x coordinate
 * @param centerY - Center y coordinate
 * @param width - Total width in math units
 * @param height - Total height in math units (defaults to width for square aspect)
 * @returns A new viewport centered at the specified point
 *
 * @example
 * ```typescript
 * const viewport = createViewport(0, 0, 20);
 * // Result: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
 *
 * const wide = createViewport(0, 0, 40, 20);
 * // Result: { xMin: -20, xMax: 20, yMin: -10, yMax: 10 }
 * ```
 */
export function createViewport(
	centerX: number,
	centerY: number,
	width: number,
	height?: number
): Viewport {
	const h = height ?? width;
	const halfWidth = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, width / 2));
	const halfHeight = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, h / 2));

	return {
		xMin: centerX - halfWidth,
		xMax: centerX + halfWidth,
		yMin: centerY - halfHeight,
		yMax: centerY + halfHeight
	};
}

// =============================================================================
// Viewport Metrics
// =============================================================================

/**
 * Derive convenience metrics from a viewport
 *
 * @param viewport - The viewport to analyze
 * @returns ViewportMetrics with width, height, and center coordinates
 *
 * @example
 * ```typescript
 * const viewport = { xMin: -10, xMax: 10, yMin: -5, yMax: 15 };
 * const metrics = getViewportMetrics(viewport);
 * // Result: { width: 20, height: 20, centerX: 0, centerY: 5 }
 * ```
 */
export function getViewportMetrics(viewport: Viewport): ViewportMetrics {
	return {
		width: viewport.xMax - viewport.xMin,
		height: viewport.yMax - viewport.yMin,
		centerX: (viewport.xMin + viewport.xMax) / 2,
		centerY: (viewport.yMin + viewport.yMax) / 2
	};
}

/**
 * Check if a viewport is valid (finite values, min < max)
 *
 * @param viewport - The viewport to validate
 * @returns true if the viewport is valid
 */
export function isValidViewport(viewport: Viewport): boolean {
	return (
		Number.isFinite(viewport.xMin) &&
		Number.isFinite(viewport.xMax) &&
		Number.isFinite(viewport.yMin) &&
		Number.isFinite(viewport.yMax) &&
		viewport.xMin < viewport.xMax &&
		viewport.yMin < viewport.yMax
	);
}

/**
 * Clamp a viewport to valid bounds
 *
 * Ensures the viewport has valid finite values and reasonable dimensions.
 *
 * @param viewport - The viewport to clamp
 * @returns A valid viewport (falls back to default if input is too invalid)
 */
export function clampViewport(viewport: Viewport): Viewport {
	// If any value is not finite, return default
	if (
		!Number.isFinite(viewport.xMin) ||
		!Number.isFinite(viewport.xMax) ||
		!Number.isFinite(viewport.yMin) ||
		!Number.isFinite(viewport.yMax)
	) {
		return resetViewport();
	}

	// Ensure min < max
	let { xMin, xMax, yMin, yMax } = viewport;

	if (xMin >= xMax) {
		const mid = (xMin + xMax) / 2;
		xMin = mid - MIN_SPAN / 2;
		xMax = mid + MIN_SPAN / 2;
	}

	if (yMin >= yMax) {
		const mid = (yMin + yMax) / 2;
		yMin = mid - MIN_SPAN / 2;
		yMax = mid + MIN_SPAN / 2;
	}

	// Clamp to max span
	const clampedWidth = Math.min(xMax - xMin, MAX_SPAN);
	const clampedHeight = Math.min(yMax - yMin, MAX_SPAN);

	const centerX = (xMin + xMax) / 2;
	const centerY = (yMin + yMax) / 2;

	return {
		xMin: centerX - clampedWidth / 2,
		xMax: centerX + clampedWidth / 2,
		yMin: centerY - clampedHeight / 2,
		yMax: centerY + clampedHeight / 2
	};
}
