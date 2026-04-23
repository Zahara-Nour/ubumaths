/**
 * SVG primitive renderers — pure functions converting GeoElements to SVG attributes.
 *
 * Each function takes an element ID, a Figure (for position lookups),
 * and a CoordinateTransformer. Returns null if the element or its parents
 * cannot be resolved.
 */

import type { Figure } from '../graph/figure';
import type { CoordinateTransformer } from '../viewport/viewport';
import { geoToNumber } from '../compute/to-number';
import {
	isCircleByRadius,
	isCircleByPoint,
	type GeoSegment,
	type GeoLine,
	type GeoRay,
	type GeoCircleByRadius,
	type GeoCircleByPoint
} from '../types/elements';

const POINT_RADIUS = 4;

interface PointSVG {
	cx: number;
	cy: number;
	r: number;
}

interface LineSVG {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

interface CircleSVG {
	cx: number;
	cy: number;
	r: number;
}

/**
 * Convert a point element to SVG circle attributes.
 */
export function pointToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): PointSVG | null {
	const pos = figure.getPosition(id);
	if (!pos) return null;

	const svgPos = transformer.mathToSvg(geoToNumber(pos.x), geoToNumber(pos.y));
	return { cx: svgPos.x, cy: svgPos.y, r: POINT_RADIUS };
}

/**
 * Convert a segment element to SVG line attributes.
 */
export function segmentToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'segment') return null;

	const seg = el as GeoSegment;
	const p1 = figure.getPosition(seg.startId);
	const p2 = figure.getPosition(seg.endId);
	if (!p1 || !p2) return null;

	const sv1 = transformer.mathToSvg(geoToNumber(p1.x), geoToNumber(p1.y));
	const sv2 = transformer.mathToSvg(geoToNumber(p2.x), geoToNumber(p2.y));
	return { x1: sv1.x, y1: sv1.y, x2: sv2.x, y2: sv2.y };
}

/**
 * Convert a line element to SVG line attributes, extended to viewport edges.
 */
export function lineToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'line') return null;

	const line = el as GeoLine;
	const p1 = figure.getPosition(line.point1Id);
	const p2 = figure.getPosition(line.point2Id);
	if (!p1 || !p2) return null;

	const x1 = geoToNumber(p1.x);
	const y1 = geoToNumber(p1.y);
	const x2 = geoToNumber(p2.x);
	const y2 = geoToNumber(p2.y);

	return extendLineToBounds(x1, y1, x2, y2, transformer, dims);
}

/**
 * Convert a ray element to SVG line attributes, extending from origin in one direction.
 */
export function rayToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'ray') return null;

	const ray = el as GeoRay;
	const origin = figure.getPosition(ray.originId);
	const through = figure.getPosition(ray.throughId);
	if (!origin || !through) return null;

	const ox = geoToNumber(origin.x);
	const oy = geoToNumber(origin.y);
	const tx = geoToNumber(through.x);
	const ty = geoToNumber(through.y);

	// Extend in the direction from origin through the through-point
	const extended = extendRayToBounds(ox, oy, tx, ty, transformer, dims);
	if (!extended) return null;

	const svgOrigin = transformer.mathToSvg(ox, oy);
	return { x1: svgOrigin.x, y1: svgOrigin.y, x2: extended.x, y2: extended.y };
}

/**
 * Convert a circle element to SVG circle attributes.
 */
export function circleToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): CircleSVG | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	if (isCircleByRadius(el)) {
		return circleByRadiusToSVG(el, figure, transformer);
	}
	if (isCircleByPoint(el)) {
		return circleByPointToSVG(el, figure, transformer);
	}
	return null;
}

function circleByRadiusToSVG(
	circle: GeoCircleByRadius,
	figure: Figure,
	transformer: CoordinateTransformer
): CircleSVG | null {
	const center = figure.getPosition(circle.centerId);
	if (!center) return null;

	const svgCenter = transformer.mathToSvg(geoToNumber(center.x), geoToNumber(center.y));
	const radiusMath = geoToNumber(circle.radius);
	const radiusPx = radiusMath * transformer.scaleX;
	return { cx: svgCenter.x, cy: svgCenter.y, r: Math.abs(radiusPx) };
}

function circleByPointToSVG(
	circle: GeoCircleByPoint,
	figure: Figure,
	transformer: CoordinateTransformer
): CircleSVG | null {
	const center = figure.getPosition(circle.centerId);
	const edge = figure.getPosition(circle.edgePointId);
	if (!center || !edge) return null;

	const cx = geoToNumber(center.x);
	const cy = geoToNumber(center.y);
	const ex = geoToNumber(edge.x);
	const ey = geoToNumber(edge.y);

	const radiusMath = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
	const svgCenter = transformer.mathToSvg(cx, cy);
	const radiusPx = radiusMath * transformer.scaleX;
	return { cx: svgCenter.x, cy: svgCenter.y, r: Math.abs(radiusPx) };
}

// =============================================================================
// Helpers: extend lines/rays to viewport bounds
// =============================================================================

/**
 * Extend a line defined by two math points to the SVG viewport bounds.
 * Returns SVG coordinates of the two intersection points with the viewport edges.
 */
function extendLineToBounds(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG {
	// We work in SVG space for clipping
	const sv1 = transformer.mathToSvg(x1, y1);
	const sv2 = transformer.mathToSvg(x2, y2);
	const sdx = sv2.x - sv1.x;
	const sdy = sv2.y - sv1.y;

	if (Math.abs(sdx) < 1e-10 && Math.abs(sdy) < 1e-10) {
		// Degenerate: both points are the same
		return { x1: sv1.x, y1: sv1.y, x2: sv1.x, y2: sv1.y };
	}

	// Parametric: P(t) = sv1 + t * (sv2 - sv1)
	// Find t for each edge: x=0, x=width, y=0, y=height
	const tValues: number[] = [];
	if (Math.abs(sdx) > 1e-10) {
		tValues.push(-sv1.x / sdx); // x = 0
		tValues.push((dims.width - sv1.x) / sdx); // x = width
	}
	if (Math.abs(sdy) > 1e-10) {
		tValues.push(-sv1.y / sdy); // y = 0
		tValues.push((dims.height - sv1.y) / sdy); // y = height
	}

	// Filter to t values where the intersection point is within bounds
	const validTs = tValues.filter((t) => {
		const px = sv1.x + t * sdx;
		const py = sv1.y + t * sdy;
		return px >= -1 && px <= dims.width + 1 && py >= -1 && py <= dims.height + 1;
	});

	if (validTs.length < 2) {
		// Line doesn't cross viewport — use the two original points
		return { x1: sv1.x, y1: sv1.y, x2: sv2.x, y2: sv2.y };
	}

	const tMin = Math.min(...validTs);
	const tMax = Math.max(...validTs);

	return {
		x1: sv1.x + tMin * sdx,
		y1: sv1.y + tMin * sdy,
		x2: sv1.x + tMax * sdx,
		y2: sv1.y + tMax * sdy
	};
}

/**
 * Extend a ray from origin through a point to the viewport edge.
 * Returns the SVG coordinates of the far endpoint.
 */
function extendRayToBounds(
	ox: number,
	oy: number,
	tx: number,
	ty: number,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { x: number; y: number } | null {
	const svO = transformer.mathToSvg(ox, oy);
	const svT = transformer.mathToSvg(tx, ty);
	const sdx = svT.x - svO.x;
	const sdy = svT.y - svO.y;

	if (Math.abs(sdx) < 1e-10 && Math.abs(sdy) < 1e-10) return null;

	// Find max t > 0 where P(t) = svO + t*(svT-svO) hits a viewport edge
	const tValues: number[] = [];
	if (Math.abs(sdx) > 1e-10) {
		tValues.push(-svO.x / sdx);
		tValues.push((dims.width - svO.x) / sdx);
	}
	if (Math.abs(sdy) > 1e-10) {
		tValues.push(-svO.y / sdy);
		tValues.push((dims.height - svO.y) / sdy);
	}

	// Keep only t > 0 (forward direction) and within bounds
	const validTs = tValues.filter((t) => {
		if (t <= 0) return false;
		const px = svO.x + t * sdx;
		const py = svO.y + t * sdy;
		return px >= -1 && px <= dims.width + 1 && py >= -1 && py <= dims.height + 1;
	});

	if (validTs.length === 0) {
		// Ray goes away from viewport — use the through point
		return { x: svT.x, y: svT.y };
	}

	const tMax = Math.max(...validTs);
	return { x: svO.x + tMax * sdx, y: svO.y + tMax * sdy };
}
