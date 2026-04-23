/**
 * Viewport Utilities - Coordinate transformations and viewport operations
 *
 * Extracted from grapheur/viewport.ts — these are generic 2D math visualization utilities.
 * All functions are pure and return new objects (immutable operations).
 */

import type { Viewport, ViewportMetrics, Point } from './types';

// =============================================================================
// Default Viewport
// =============================================================================

export const DEFAULT_VIEWPORT: Viewport = {
	xMin: -10,
	xMax: 10,
	yMin: -10,
	yMax: 10
} as const;

const MIN_SPAN = 1e-6;
const MAX_SPAN = 1e10;

// =============================================================================
// Coordinate Transformer
// =============================================================================

/**
 * Bidirectional coordinate transformation between math (y-up) and SVG (y-down).
 */
export interface CoordinateTransformer {
	mathToSvg(x: number, y: number): Point;
	svgToMath(x: number, y: number): Point;
	readonly scaleX: number;
	readonly scaleY: number;
}

export function createTransformer(
	viewport: Viewport,
	svgWidth: number,
	svgHeight: number
): CoordinateTransformer {
	const mathWidth = viewport.xMax - viewport.xMin;
	const mathHeight = viewport.yMax - viewport.yMin;

	const scaleX = mathWidth > 0 ? svgWidth / mathWidth : 1;
	const scaleY = mathHeight > 0 ? svgHeight / mathHeight : 1;

	return {
		mathToSvg(x: number, y: number): Point {
			return {
				x: (x - viewport.xMin) * scaleX,
				y: (viewport.yMax - y) * scaleY
			};
		},

		svgToMath(x: number, y: number): Point {
			return {
				x: viewport.xMin + x / scaleX,
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

export function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
	return {
		xMin: viewport.xMin + dx,
		xMax: viewport.xMax + dx,
		yMin: viewport.yMin + dy,
		yMax: viewport.yMax + dy
	};
}

export function zoomViewport(
	viewport: Viewport,
	factor: number,
	centerX?: number,
	centerY?: number
): Viewport {
	const cx = centerX ?? (viewport.xMin + viewport.xMax) / 2;
	const cy = centerY ?? (viewport.yMin + viewport.yMax) / 2;

	const halfWidth = (viewport.xMax - viewport.xMin) / 2;
	const halfHeight = (viewport.yMax - viewport.yMin) / 2;

	const newHalfWidth = halfWidth * factor;
	const newHalfHeight = halfHeight * factor;

	const clampedHalfWidth = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, newHalfWidth));
	const clampedHalfHeight = Math.max(MIN_SPAN / 2, Math.min(MAX_SPAN / 2, newHalfHeight));

	const oldCenterX = (viewport.xMin + viewport.xMax) / 2;
	const oldCenterY = (viewport.yMin + viewport.yMax) / 2;

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

export function resetViewport(): Viewport {
	return { ...DEFAULT_VIEWPORT };
}

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

export function getViewportMetrics(viewport: Viewport): ViewportMetrics {
	return {
		width: viewport.xMax - viewport.xMin,
		height: viewport.yMax - viewport.yMin,
		centerX: (viewport.xMin + viewport.xMax) / 2,
		centerY: (viewport.yMin + viewport.yMax) / 2
	};
}

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

export function clampViewport(viewport: Viewport): Viewport {
	if (
		!Number.isFinite(viewport.xMin) ||
		!Number.isFinite(viewport.xMax) ||
		!Number.isFinite(viewport.yMin) ||
		!Number.isFinite(viewport.yMax)
	) {
		return resetViewport();
	}

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

// =============================================================================
// Fit viewport (new for geometry-core)
// =============================================================================

/**
 * Compute a viewport that fits all given points with padding.
 *
 * @param points - Array of points to fit
 * @param padding - Margin around the bounding box in math units (default: 1)
 * @returns A viewport containing all points, or DEFAULT_VIEWPORT if no points
 */
export function fitViewport(points: readonly Point[], padding: number = 1): Viewport {
	if (points.length === 0) return { ...DEFAULT_VIEWPORT };

	const safePadding = Math.max(0, padding);

	let xMin = Infinity;
	let xMax = -Infinity;
	let yMin = Infinity;
	let yMax = -Infinity;

	for (const p of points) {
		if (p.x < xMin) xMin = p.x;
		if (p.x > xMax) xMax = p.x;
		if (p.y < yMin) yMin = p.y;
		if (p.y > yMax) yMax = p.y;
	}

	// Single point: create a small viewport around it
	if (xMin === xMax) {
		xMin -= 1;
		xMax += 1;
	}
	if (yMin === yMax) {
		yMin -= 1;
		yMax += 1;
	}

	return {
		xMin: xMin - safePadding,
		xMax: xMax + safePadding,
		yMin: yMin - safePadding,
		yMax: yMax + safePadding
	};
}
