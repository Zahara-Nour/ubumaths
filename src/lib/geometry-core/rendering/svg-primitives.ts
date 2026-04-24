/**
 * SVG primitive renderers — pure functions converting GeoElements to SVG attributes.
 *
 * Each function takes an element ID, a Figure (for position lookups),
 * and a CoordinateTransformer. Returns null if the element or its parents
 * cannot be resolved.
 */

import type { Figure, FigureDefaults } from '../graph/figure';
import type { CoordinateTransformer } from '../viewport/viewport';
import { geoToNumber } from '../compute/to-number';
import {
	isCircleByRadius,
	isCircleByPoint,
	isAngleMark,
	isSegmentMark,
	type GeoElementBase,
	type GeoAngleMark,
	type GeoSegmentMark,
	type GeoSegment,
	type GeoLine,
	type GeoRay,
	type GeoCircleByRadius,
	type GeoCircleByPoint
} from '../types/elements';

// =============================================================================
// Style resolution
// =============================================================================

export interface GeoStyleResolved {
	readonly color: string;
	readonly strokeWidth: number;
	readonly dash: 'solid' | 'dashed' | 'dotted';
	readonly dashArray: string;
	readonly opacity: number;
	readonly pointShape: 'dot' | 'circle' | 'cross' | 'square';
	readonly pointSize: number;
	readonly fillColor?: string;
	readonly fillOpacity: number;
}

const DASH_ARRAYS: Record<'solid' | 'dashed' | 'dotted', string> = {
	solid: '',
	dashed: '8 4',
	dotted: '2 4'
};

export function resolveStyle(element: GeoElementBase, defaults?: FigureDefaults): GeoStyleResolved {
	const dash = element.style?.dash ?? defaults?.defaultDash ?? 'solid';
	return {
		color: element.style?.color ?? element.color ?? defaults?.defaultColor ?? '#1e40af',
		strokeWidth: element.style?.strokeWidth ?? defaults?.defaultStrokeWidth ?? 2,
		dash,
		dashArray: DASH_ARRAYS[dash],
		opacity: element.style?.opacity ?? defaults?.defaultOpacity ?? 1,
		pointShape: element.style?.pointShape ?? defaults?.defaultPointShape ?? 'dot',
		pointSize: element.style?.pointSize ?? defaults?.defaultPointSize ?? 5,
		fillColor: element.style?.fillColor,
		fillOpacity: element.style?.fillOpacity ?? 0
	};
}

interface PointSVG {
	cx: number;
	cy: number;
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
	return { cx: svgPos.x, cy: svgPos.y };
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

	const svgCenter = transformer.mathToSvg(geoToNumber(center.x), geoToNumber(center.y));
	const svgEdge = transformer.mathToSvg(geoToNumber(edge.x), geoToNumber(edge.y));
	// Radius in SVG pixels (distance between SVG center and SVG edge point)
	const radiusPx = Math.sqrt((svgEdge.x - svgCenter.x) ** 2 + (svgEdge.y - svgCenter.y) ** 2);
	return { cx: svgCenter.x, cy: svgCenter.y, r: radiusPx };
}

// =============================================================================
// Angle mark rendering
// =============================================================================

const ARC_RADIUS_PX = 25;
const ARC_SPACING_PX = 6;
const RIGHT_ANGLE_SIZE_PX = 14;

export interface AngleMarkSVG {
	/** SVG path strings for the arc(s) or right-angle square. */
	paths: string[];
	/** Vertex position in SVG coordinates. */
	vx: number;
	vy: number;
}

/**
 * Convert an angle mark element to SVG paths.
 *
 * Returns arc path(s) (or a right-angle square) centered at the vertex.
 * Arc radius is fixed in pixels (not math units).
 */
export function angleMarkToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): AngleMarkSVG | null {
	const el = figure.getElementById(id);
	if (!el || !isAngleMark(el)) return null;

	const mark = el as GeoAngleMark;
	const posP1 = figure.getPosition(mark.p1Id);
	const posV = figure.getPosition(mark.vertexId);
	const posP2 = figure.getPosition(mark.p2Id);
	if (!posP1 || !posV || !posP2) return null;

	const svgV = transformer.mathToSvg(geoToNumber(posV.x), geoToNumber(posV.y));
	const svgP1 = transformer.mathToSvg(geoToNumber(posP1.x), geoToNumber(posP1.y));
	const svgP2 = transformer.mathToSvg(geoToNumber(posP2.x), geoToNumber(posP2.y));

	// Direction vectors from vertex to p1 and p2 (in SVG space)
	const d1x = svgP1.x - svgV.x;
	const d1y = svgP1.y - svgV.y;
	const d2x = svgP2.x - svgV.x;
	const d2y = svgP2.y - svgV.y;

	const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
	const len2 = Math.sqrt(d2x * d2x + d2y * d2y);
	if (len1 < 1e-6 || len2 < 1e-6) return null; // degenerate

	// Unit vectors
	const u1x = d1x / len1;
	const u1y = d1y / len1;
	const u2x = d2x / len2;
	const u2y = d2y / len2;

	if (mark.rightAngle) {
		// Right-angle square
		const s = RIGHT_ANGLE_SIZE_PX;
		const cx = svgV.x + u1x * s + u2x * s;
		const cy = svgV.y + u1y * s + u2y * s;
		const path =
			`M ${svgV.x + u1x * s} ${svgV.y + u1y * s}` +
			` L ${cx} ${cy}` +
			` L ${svgV.x + u2x * s} ${svgV.y + u2y * s}`;
		return { paths: [path], vx: svgV.x, vy: svgV.y };
	}

	// Arc(s)
	const angle1 = Math.atan2(d1y, d1x);
	const angle2 = Math.atan2(d2y, d2x);

	const paths: string[] = [];
	for (let i = 0; i < mark.arcCount; i++) {
		const r = ARC_RADIUS_PX + i * ARC_SPACING_PX;
		paths.push(buildArcPath(svgV.x, svgV.y, r, angle1, angle2));
	}

	return { paths, vx: svgV.x, vy: svgV.y };
}

/**
 * Build an SVG arc path from startAngle to endAngle (shortest arc).
 * Angles are in radians, measured from positive X axis in SVG space.
 */
function buildArcPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number
): string {
	// Normalize the sweep to go from startAngle to endAngle via the shortest path
	let sweep = endAngle - startAngle;
	// Normalize to [-PI, PI]
	while (sweep > Math.PI) sweep -= 2 * Math.PI;
	while (sweep < -Math.PI) sweep += 2 * Math.PI;

	const sx = cx + r * Math.cos(startAngle);
	const sy = cy + r * Math.sin(startAngle);
	const ex = cx + r * Math.cos(startAngle + sweep);
	const ey = cy + r * Math.sin(startAngle + sweep);

	const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
	const sweepFlag = sweep > 0 ? 1 : 0;

	return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`;
}

// =============================================================================
// Segment mark rendering
// =============================================================================

const TICK_LENGTH_PX = 18;
const TICK_SPACING_PX = 5;

export interface SegmentMarkSVG {
	/** Array of tick lines, each with start and end SVG coordinates. */
	ticks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

/**
 * Convert a segment mark element to SVG tick lines.
 *
 * Returns 1-3 small perpendicular lines at the midpoint of the segment.
 */
export function segmentMarkToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): SegmentMarkSVG | null {
	const el = figure.getElementById(id);
	if (!el || !isSegmentMark(el)) return null;

	const mark = el as GeoSegmentMark;
	const posStart = figure.getPosition(mark.startId);
	const posEnd = figure.getPosition(mark.endId);
	if (!posStart || !posEnd) return null;

	const svgS = transformer.mathToSvg(geoToNumber(posStart.x), geoToNumber(posStart.y));
	const svgE = transformer.mathToSvg(geoToNumber(posEnd.x), geoToNumber(posEnd.y));

	// Midpoint in SVG space
	const mx = (svgS.x + svgE.x) / 2;
	const my = (svgS.y + svgE.y) / 2;

	// Direction along segment
	const dx = svgE.x - svgS.x;
	const dy = svgE.y - svgS.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len < 1e-6) return null;

	// Unit vectors: along segment and perpendicular
	const ux = dx / len;
	const uy = dy / len;
	const px = -uy; // perpendicular
	const py = ux;

	const half = TICK_LENGTH_PX / 2;
	const ticks: SegmentMarkSVG['ticks'] = [];
	const count = mark.markCount;

	// Center the group of ticks on the midpoint
	const totalWidth = (count - 1) * TICK_SPACING_PX;
	const startOffset = -totalWidth / 2;

	for (let i = 0; i < count; i++) {
		const offset = startOffset + i * TICK_SPACING_PX;
		const cx = mx + ux * offset;
		const cy = my + uy * offset;
		ticks.push({
			x1: cx + px * half,
			y1: cy + py * half,
			x2: cx - px * half,
			y2: cy - py * half
		});
	}

	return { ticks };
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
