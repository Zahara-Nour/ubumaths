/**
 * Rough.js rendering adapter for geometry-core.
 *
 * Converts svg-primitives output (LineSVG, CircleSVG, ArcSVG, etc.) into
 * hand-drawn SVG elements via rough.js. Reuses patterns from the whiteboard
 * rough-renderer (deterministic seeds, dash handling, fill mapping).
 *
 * @module geometry-core/rendering/rough-geometry
 */

import type { RoughSVG } from 'roughjs/bin/svg';
import type { Options as RoughOptions } from 'roughjs/bin/core';
import type {
	GeoStyleResolved,
	LineSVG,
	CircleSVG,
	AngleMarkSVG,
	SegmentMarkSVG,
	VectorSVG
} from './svg-primitives';

// =============================================================================
// Types for elements that should always render normally
// =============================================================================

/** Element types that are never rendered in rough mode. */
const ALWAYS_NORMAL_TYPES = new Set([
	'freePoint',
	'midpoint',
	'intersectionLL',
	'reflectedPoint',
	'rotatedPoint',
	'translatedPoint',
	'dilatedPoint',
	'reflectedOverLine',
	'measure'
]);

// =============================================================================
// Seed generation
// =============================================================================

/**
 * Generate a deterministic seed from an element ID.
 * Same algorithm as whiteboard's getOrCreateSeed.
 * If an explicit seed is provided, it takes precedence.
 */
export function seedFromId(id: string, explicitSeed?: number): number {
	if (explicitSeed !== undefined) return explicitSeed;

	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		const char = id.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

// =============================================================================
// Render mode decision
// =============================================================================

/**
 * Determine if an element should be rendered in rough mode.
 *
 * @param renderStyle - The element's resolved render style ('normal' | 'rough')
 * @param elementType - The GeoElement type string
 * @param figureMode  - The figure-level render mode
 */
export function shouldRenderRough(
	renderStyle: 'normal' | 'rough',
	elementType: string,
	figureMode: 'normal' | 'rough' | 'mixed'
): boolean {
	// Points, measures always render normally
	if (ALWAYS_NORMAL_TYPES.has(elementType)) return false;

	switch (figureMode) {
		case 'normal':
			return false;
		case 'rough':
			return true;
		case 'mixed':
			return renderStyle === 'rough';
	}
}

// =============================================================================
// Style → RoughOptions conversion
// =============================================================================

/** Dash arrays matching the whiteboard's Excalidraw-style approach. */
function getDashArrayDashed(strokeWidth: number): number[] {
	return [8, 8 + strokeWidth];
}

function getDashArrayDotted(strokeWidth: number): number[] {
	return [1.5, 6 + strokeWidth];
}

/**
 * Convert a resolved geometry style to rough.js options.
 */
export function styleToRoughOptions(
	sty: GeoStyleResolved,
	seed: number,
	roughness?: number
): RoughOptions {
	const isNonSolid = sty.dash === 'dashed' || sty.dash === 'dotted';
	const effectiveStrokeWidth = isNonSolid ? sty.strokeWidth + 0.5 : sty.strokeWidth;

	let strokeLineDash: number[] | undefined;
	if (sty.dash === 'dashed') strokeLineDash = getDashArrayDashed(sty.strokeWidth);
	else if (sty.dash === 'dotted') strokeLineDash = getDashArrayDotted(sty.strokeWidth);

	return {
		seed,
		roughness: roughness ?? sty.roughness,
		bowing: sty.roughBowing,
		stroke: sty.color,
		strokeWidth: effectiveStrokeWidth,
		strokeLineDash,
		disableMultiStroke: isNonSolid,
		preserveVertices: sty.roughPreserveVertices,
		fill: sty.fillColor ?? undefined,
		fillStyle: sty.fillColor ? sty.roughFillStyle : undefined,
		fillWeight: sty.strokeWidth * 0.5,
		hachureAngle: 45,
		hachureGap: sty.strokeWidth * 4
	};
}

// =============================================================================
// Rough renderers — SVGGElement output
// =============================================================================

export function roughLine(rc: RoughSVG, svg: LineSVG, opts: RoughOptions): SVGGElement {
	return rc.line(svg.x1, svg.y1, svg.x2, svg.y2, opts);
}

export function roughCircle(rc: RoughSVG, svg: CircleSVG, opts: RoughOptions): SVGGElement {
	return rc.circle(svg.cx, svg.cy, svg.r * 2, opts);
}

export function roughArc(rc: RoughSVG, svgPath: string, opts: RoughOptions): SVGGElement {
	return rc.path(svgPath, { ...opts, fill: 'none' });
}

export function roughPolygon(
	rc: RoughSVG,
	points: [number, number][],
	opts: RoughOptions
): SVGGElement {
	return rc.polygon(points, opts);
}

export function roughAngleMark(rc: RoughSVG, svg: AngleMarkSVG, opts: RoughOptions): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	for (const path of svg.paths) {
		const el = rc.path(path, { ...opts, fill: 'none' });
		g.appendChild(el);
	}
	return g;
}

export function roughSegmentMark(
	rc: RoughSVG,
	svg: SegmentMarkSVG,
	opts: RoughOptions
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	for (const tick of svg.ticks) {
		const el = rc.line(tick.x1, tick.y1, tick.x2, tick.y2, opts);
		g.appendChild(el);
	}
	return g;
}

// =============================================================================
// HTML string helpers — for {@html} injection in Svelte
// =============================================================================

export function roughLineHTML(rc: RoughSVG, svg: LineSVG, opts: RoughOptions): string {
	return roughLine(rc, svg, opts).outerHTML;
}

export function roughCircleHTML(rc: RoughSVG, svg: CircleSVG, opts: RoughOptions): string {
	return roughCircle(rc, svg, opts).outerHTML;
}

export function roughArcHTML(rc: RoughSVG, svgPath: string, opts: RoughOptions): string {
	return roughArc(rc, svgPath, opts).outerHTML;
}

export function roughPolygonHTML(
	rc: RoughSVG,
	points: [number, number][],
	opts: RoughOptions
): string {
	return roughPolygon(rc, points, opts).outerHTML;
}

export function roughAngleMarkHTML(rc: RoughSVG, svg: AngleMarkSVG, opts: RoughOptions): string {
	return roughAngleMark(rc, svg, opts).outerHTML;
}

export function roughSegmentMarkHTML(
	rc: RoughSVG,
	svg: SegmentMarkSVG,
	opts: RoughOptions
): string {
	return roughSegmentMark(rc, svg, opts).outerHTML;
}

export function roughVectorHTML(
	rc: RoughSVG,
	svg: VectorSVG,
	opts: RoughOptions,
	color: string
): string {
	// Shaft line (rough)
	const shaft = rc.line(svg.x1, svg.y1, svg.shaftX2, svg.shaftY2, opts);
	// Filled arrowhead polygon (rough) — uses raw vertices, no string parsing
	const arrow = rc.polygon(svg.arrowVertices, { ...opts, fill: color, fillStyle: 'solid' });
	return shaft.outerHTML + arrow.outerHTML;
}
