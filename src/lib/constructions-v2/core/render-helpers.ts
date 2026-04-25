/**
 * Render helpers — pure functions for partial rendering of animated elements.
 *
 * These combine svg-primitives coordinate logic with animator.ts interpolation
 * to render segments/arcs/circles at a given draw progress.
 *
 * We replicate minimal coordinate math from svg-primitives.ts here because
 * that module doesn't support progress parameters and is shared by the whole app.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import type { CoordinateTransformer } from '$lib/geometry-core/viewport/viewport';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import {
	isSegment,
	isArcByAngles,
	isArcByPoints,
	isCircleByRadius,
	isCircleByPoint,
	type GeoCircleByRadius,
	type GeoCircleByPoint
} from '$lib/geometry-core/types/elements';
import { resolveStyle, type GeoStyleResolved } from '$lib/geometry-core/rendering/svg-primitives';
import { partialSegment, type Point2D } from './animator';

// =============================================================================
// Partial segment
// =============================================================================

export interface PartialLineSVG {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	style: GeoStyleResolved;
}

export function partialSegmentSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	progress: number
): PartialLineSVG | null {
	const el = figure.getElementById(id);
	if (!el || !isSegment(el)) return null;

	const p1 = figure.getPosition(el.startId);
	const p2 = figure.getPosition(el.endId);
	if (!p1 || !p2) return null;

	const sv1 = transformer.mathToSvg(geoToNumber(p1.x), geoToNumber(p1.y));
	const sv2 = transformer.mathToSvg(geoToNumber(p2.x), geoToNumber(p2.y));
	const tip = partialSegment(sv1, sv2, progress);
	const style = resolveStyle(el, figure.defaults);

	return { x1: sv1.x, y1: sv1.y, x2: tip.x, y2: tip.y, style };
}

// =============================================================================
// Partial arc (by angles or by points)
// =============================================================================

export interface PartialArcSVG {
	path: string;
	style: GeoStyleResolved;
}

export function partialArcSVGPath(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	progress: number
): PartialArcSVG | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	if (isArcByAngles(el)) {
		const center = figure.getPosition(el.centerId);
		if (!center) return null;
		const cx = geoToNumber(center.x);
		const cy = geoToNumber(center.y);
		const r = geoToNumber(el.radius);
		const startAngle = geoToNumber(el.startAngle);
		const endAngle = geoToNumber(el.endAngle);
		const partialEnd = startAngle + (endAngle - startAngle) * Math.max(0, Math.min(1, progress));
		const path = buildArcPath(cx, cy, r, startAngle, partialEnd, transformer);
		if (!path) return null;
		return { path, style: resolveStyle(el, figure.defaults) };
	}

	if (isArcByPoints(el)) {
		const startPos = figure.getPosition(el.startId);
		const centerPos = figure.getPosition(el.centerId);
		const endPos = figure.getPosition(el.endId);
		if (!startPos || !centerPos || !endPos) return null;
		const cx = geoToNumber(centerPos.x);
		const cy = geoToNumber(centerPos.y);
		const sx = geoToNumber(startPos.x);
		const sy = geoToNumber(startPos.y);
		const ex = geoToNumber(endPos.x);
		const ey = geoToNumber(endPos.y);
		const r = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
		const startAngle = Math.atan2(sy - cy, sx - cx);
		const endAngle = Math.atan2(ey - cy, ex - cx);
		const partialEnd = startAngle + (endAngle - startAngle) * Math.max(0, Math.min(1, progress));
		const path = buildArcPath(cx, cy, r, startAngle, partialEnd, transformer);
		if (!path) return null;
		return { path, style: resolveStyle(el, figure.defaults) };
	}

	return null;
}

// =============================================================================
// Partial circle
// =============================================================================

export function partialCircleSVGPath(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	progress: number
): PartialArcSVG | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	let cx: number, cy: number, r: number;

	if (isCircleByRadius(el)) {
		const center = figure.getPosition(el.centerId);
		if (!center) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		r = geoToNumber(el.radius);
	} else if (isCircleByPoint(el)) {
		const center = figure.getPosition(el.centerId);
		const edge = figure.getPosition(el.edgePointId);
		if (!center || !edge) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		const dx = geoToNumber(edge.x) - cx;
		const dy = geoToNumber(edge.y) - cy;
		r = Math.sqrt(dx * dx + dy * dy);
	} else {
		return null;
	}

	const sweepEnd = 2 * Math.PI * Math.max(0, Math.min(1, progress));
	if (sweepEnd < 1e-6) return null;
	const path = buildArcPath(cx, cy, r, 0, sweepEnd, transformer);
	if (!path) return null;
	return { path, style: resolveStyle(el, figure.defaults) };
}

// =============================================================================
// Drawing tip position (for pencil tracking)
// =============================================================================

/**
 * Returns the SVG position of the "drawing tip" — where the pencil should be.
 * Looks at the first animating element and returns its current endpoint.
 */
export function drawingTipPosition(
	animatingIds: Set<string>,
	figure: Figure,
	transformer: CoordinateTransformer,
	progress: number
): Point2D | null {
	for (const id of animatingIds) {
		const el = figure.getElementById(id);
		if (!el) continue;

		if (isSegment(el)) {
			const p1 = figure.getPosition(el.startId);
			const p2 = figure.getPosition(el.endId);
			if (!p1 || !p2) continue;
			const sv1 = transformer.mathToSvg(geoToNumber(p1.x), geoToNumber(p1.y));
			const sv2 = transformer.mathToSvg(geoToNumber(p2.x), geoToNumber(p2.y));
			return partialSegment(sv1, sv2, progress);
		}

		if (isArcByAngles(el)) {
			const center = figure.getPosition(el.centerId);
			if (!center) continue;
			const cx = geoToNumber(center.x);
			const cy = geoToNumber(center.y);
			const r = geoToNumber(el.radius);
			const startAngle = geoToNumber(el.startAngle);
			const endAngle = geoToNumber(el.endAngle);
			const angle = startAngle + (endAngle - startAngle) * Math.max(0, Math.min(1, progress));
			return transformer.mathToSvg(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
		}

		if (isArcByPoints(el)) {
			const startPos = figure.getPosition(el.startId);
			const centerPos = figure.getPosition(el.centerId);
			const endPos = figure.getPosition(el.endId);
			if (!startPos || !centerPos || !endPos) continue;
			const cx = geoToNumber(centerPos.x);
			const cy = geoToNumber(centerPos.y);
			const sx = geoToNumber(startPos.x);
			const sy = geoToNumber(startPos.y);
			const ex = geoToNumber(endPos.x);
			const ey = geoToNumber(endPos.y);
			const r = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
			const startAngle = Math.atan2(sy - cy, sx - cx);
			const endAngle = Math.atan2(ey - cy, ex - cx);
			const angle = startAngle + (endAngle - startAngle) * Math.max(0, Math.min(1, progress));
			return transformer.mathToSvg(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
		}

		if (isCircleByRadius(el) || isCircleByPoint(el)) {
			const tip = circleTipPosition(el, figure, progress);
			if (tip) return transformer.mathToSvg(tip.x, tip.y);
		}
	}
	return null;
}

// =============================================================================
// Internal: circle tip position (for pencil tracking)
// =============================================================================

function circleTipPosition(
	el: GeoCircleByRadius | GeoCircleByPoint,
	figure: Figure,
	progress: number
): { x: number; y: number } | null {
	let cx: number, cy: number, r: number;
	if (isCircleByRadius(el)) {
		const center = figure.getPosition(el.centerId);
		if (!center) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		r = geoToNumber(el.radius);
	} else {
		const center = figure.getPosition(el.centerId);
		const edge = figure.getPosition(el.edgePointId);
		if (!center || !edge) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		const dx = geoToNumber(edge.x) - cx;
		const dy = geoToNumber(edge.y) - cy;
		r = Math.sqrt(dx * dx + dy * dy);
	}
	const angle = 2 * Math.PI * Math.max(0, Math.min(1, progress));
	return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// =============================================================================
// Internal: build SVG arc path (replicated from svg-primitives.ts)
// =============================================================================

function buildArcPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	transformer: CoordinateTransformer
): string | null {
	if (r < 1e-10) return null;

	const sx = cx + r * Math.cos(startAngle);
	const sy = cy + r * Math.sin(startAngle);
	const ex = cx + r * Math.cos(endAngle);
	const ey = cy + r * Math.sin(endAngle);

	const svgStart = transformer.mathToSvg(sx, sy);
	const svgEnd = transformer.mathToSvg(ex, ey);
	const rPx = r * transformer.scaleX;

	let sweep = endAngle - startAngle;
	while (sweep < 0) sweep += 2 * Math.PI;
	while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI;

	const largeArc = sweep > Math.PI ? 1 : 0;
	// In SVG, y is inverted: counterclockwise in math = clockwise in SVG = sweep-flag 0
	const sweepFlag = 0;

	return `M ${svgStart.x} ${svgStart.y} A ${rPx} ${rPx} 0 ${largeArc} ${sweepFlag} ${svgEnd.x} ${svgEnd.y}`;
}
