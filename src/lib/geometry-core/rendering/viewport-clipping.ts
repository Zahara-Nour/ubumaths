/**
 * Viewport clipping helpers for exporters that work in MATH coordinates.
 *
 * Both `extendLineToViewport` and `extendRayToViewport` use a Liang-Barsky-like
 * parametric clipping: `P(t) = P1 + t·(P2 − P1)`, intersect with the 4 viewport
 * edges, keep the valid `t` range.
 *
 * Used by:
 * - `export-tikz.ts` — produces TikZ in math coords
 * - `export-typst.ts` — produces CeTZ/Typst in math coords
 * - any future math-coords exporter (PNG via CeTZ, PDF, etc.)
 *
 * NOT used by `svg-primitives.ts` which has its own SVG-pixel-coords variants
 * (`extendLineToBounds`, `extendRayToBounds`) — same algorithm but different
 * coord system + signature (takes `transformer + dims` instead of `Viewport`).
 * Keeping the two flavors separate avoids cross-coord transforms inside hot
 * rendering paths.
 *
 * @module geometry-core/rendering/viewport-clipping
 */

import type { Viewport } from '../viewport/types';

/** Clipped line endpoints in math coordinates. */
export interface LineEndpoints {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/**
 * Extend the line through `(x1, y1)` and `(x2, y2)` so it spans the entire
 * viewport. Returns the two endpoints where the (infinite) line enters and
 * leaves the rectangular `vp` box, or `null` if the line is degenerate
 * (both input points coincide) or fully outside the viewport.
 *
 * All coordinates are in MATH units (Viewport's `xMin/xMax/yMin/yMax`).
 *
 * @param x1 - math x of the first defining point
 * @param y1 - math y of the first defining point
 * @param x2 - math x of the second defining point
 * @param y2 - math y of the second defining point
 * @param vp - the viewport bounding box
 */
export function extendLineToViewport(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	vp: Viewport
): LineEndpoints | null {
	const dx = x2 - x1;
	const dy = y2 - y1;
	if (Math.abs(dx) < 1e-15 && Math.abs(dy) < 1e-15) return null;

	const tValues: number[] = [];
	if (Math.abs(dx) > 1e-15) {
		tValues.push((vp.xMin - x1) / dx);
		tValues.push((vp.xMax - x1) / dx);
	}
	if (Math.abs(dy) > 1e-15) {
		tValues.push((vp.yMin - y1) / dy);
		tValues.push((vp.yMax - y1) / dy);
	}

	const validTs = tValues.filter((t) => {
		const px = x1 + t * dx;
		const py = y1 + t * dy;
		return (
			px >= vp.xMin - 0.01 && px <= vp.xMax + 0.01 && py >= vp.yMin - 0.01 && py <= vp.yMax + 0.01
		);
	});

	if (validTs.length < 2) return null;
	const tMin = Math.min(...validTs);
	const tMax = Math.max(...validTs);
	return {
		x1: x1 + tMin * dx,
		y1: y1 + tMin * dy,
		x2: x1 + tMax * dx,
		y2: y1 + tMax * dy
	};
}

/**
 * Extend a ray from origin `(ox, oy)` through `(tx, ty)` to the far edge of
 * the viewport. Returns the math coordinates of the far endpoint, or `null`
 * if the ray is degenerate or never enters the viewport.
 *
 * Only positive `t` values are considered (rays don't extend backwards).
 *
 * @param ox - math x of the ray origin
 * @param oy - math y of the ray origin
 * @param tx - math x of a point the ray passes through
 * @param ty - math y of a point the ray passes through
 * @param vp - the viewport bounding box
 */
export function extendRayToViewport(
	ox: number,
	oy: number,
	tx: number,
	ty: number,
	vp: Viewport
): { x: number; y: number } | null {
	const dx = tx - ox;
	const dy = ty - oy;
	if (Math.abs(dx) < 1e-15 && Math.abs(dy) < 1e-15) return null;

	const tValues: number[] = [];
	if (Math.abs(dx) > 1e-15) {
		tValues.push((vp.xMin - ox) / dx);
		tValues.push((vp.xMax - ox) / dx);
	}
	if (Math.abs(dy) > 1e-15) {
		tValues.push((vp.yMin - oy) / dy);
		tValues.push((vp.yMax - oy) / dy);
	}

	const validTs = tValues.filter((t) => {
		if (t <= 0) return false;
		const px = ox + t * dx;
		const py = oy + t * dy;
		return (
			px >= vp.xMin - 0.01 && px <= vp.xMax + 0.01 && py >= vp.yMin - 0.01 && py <= vp.yMax + 0.01
		);
	});

	if (validTs.length === 0) return null;
	const tMax = Math.max(...validTs);
	return { x: ox + tMax * dx, y: oy + tMax * dy };
}
