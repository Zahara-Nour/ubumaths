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
import { circumcircle } from '../geometry/circumcircle';
import {
	isCircleByRadius,
	isCircleByPoint,
	isCircleBy3Points,
	isAngleMark,
	isSegmentMark,
	isText,
	isMathText,
	isRichText,
	isImage,
	isArcByAngles,
	isArcByPoints,
	isTransformation,
	type GeoElementBase,
	type GeoAngleMark,
	type GeoSegmentMark,
	type GeoText,
	type GeoMathText,
	type GeoRichText,
	type GeoSegment,
	type GeoLine,
	type GeoRay,
	type GeoCircleByRadius,
	type GeoCircleByPoint,
	type GeoCircleBy3Points,
	type GeoArcByAngles,
	type GeoArcByPoints,
	type GeoImage,
	isVector
} from '../types/elements';
import { computeImageVisualTransform } from '../dsl/transform-apply';

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
	/** Rendering style for this element ('normal' | 'rough'). */
	readonly render: 'normal' | 'rough';
	/** Roughness level (0..5, default 1). */
	readonly roughness: number;
	/** Explicit seed for deterministic rough rendering. */
	readonly roughSeed?: number;
	/** Bowing: how much lines curve (default 1). */
	readonly roughBowing: number;
	/** Fill pattern for rough mode. */
	readonly roughFillStyle: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed';
	/** If true, endpoints/vertices are not randomly offset. */
	readonly roughPreserveVertices: boolean;
}

const DASH_ARRAYS: Record<'solid' | 'dashed' | 'dotted', string> = {
	solid: '',
	dashed: '12 8',
	dotted: '2 6'
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
		fillOpacity: element.style?.fillOpacity ?? 0,
		render: element.style?.render ?? 'normal',
		roughness: element.style?.roughness ?? defaults?.defaultRoughness ?? 1,
		roughSeed: element.style?.roughSeed,
		roughBowing: element.style?.roughBowing ?? 1,
		roughFillStyle: element.style?.roughFillStyle ?? 'hachure',
		roughPreserveVertices: element.style?.roughPreserveVertices ?? false
	};
}

export interface PointSVG {
	cx: number;
	cy: number;
}

export interface LineSVG {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface CircleSVG {
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

// =============================================================================
// Vector rendering
// =============================================================================

export interface VectorSVG extends LineSVG {
	/** SVG points string for the arrowhead polygon: "x1,y1 x2,y2 x3,y3" */
	arrowPoints: string;
	/** Raw arrowhead vertices [wing1, tip, wing2] for rough rendering (avoids string parsing). */
	arrowVertices: [number, number][];
	/** Shaft endpoint (shortened so it doesn't poke through the arrowhead) */
	shaftX2: number;
	shaftY2: number;
}

/** Size of the arrowhead in SVG pixels. */
const ARROW_HEAD_LENGTH = 10;
/** Half-angle of the arrowhead opening (radians). ~25 degrees. */
const ARROW_HEAD_ANGLE = Math.PI / 7;

/**
 * Convert a vector element (bound or free) to SVG attributes including arrowhead.
 */
export function vectorToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): VectorSVG | null {
	const el = figure.getElementById(id);
	if (!el || !isVector(el)) return null;

	// Get anchor (start) and compute end from components
	const comp = figure.getVectorComponents(id);
	if (!comp) return null;

	let anchorX: number, anchorY: number;

	if (el.type === 'vectorByPoints') {
		const p1 = figure.getPosition(el.startId);
		if (!p1) return null;
		anchorX = geoToNumber(p1.x);
		anchorY = geoToNumber(p1.y);
	} else if (el.type === 'freeVector') {
		anchorX = geoToNumber(el.anchorX);
		anchorY = geoToNumber(el.anchorY);
	} else {
		// Derived vectors (sum, scaled, negate): anchor at stored position or (0,0)
		const pos = figure.getPosition(id);
		anchorX = pos ? geoToNumber(pos.x) : 0;
		anchorY = pos ? geoToNumber(pos.y) : 0;
	}

	const endMathX = anchorX + geoToNumber(comp.dx);
	const endMathY = anchorY + geoToNumber(comp.dy);

	const sv1 = transformer.mathToSvg(anchorX, anchorY);
	const sv2 = transformer.mathToSvg(endMathX, endMathY);
	const sx = sv1.x,
		sy = sv1.y,
		ex = sv2.x,
		ey = sv2.y;

	const dx = ex - sx;
	const dy = ey - sy;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len < 1e-6) return null;

	const angle = Math.atan2(dy, dx);

	// Arrowhead tip is at (ex, ey). Two wing points at ARROW_HEAD_LENGTH back.
	const wing1x = ex - ARROW_HEAD_LENGTH * Math.cos(angle - ARROW_HEAD_ANGLE);
	const wing1y = ey - ARROW_HEAD_LENGTH * Math.sin(angle - ARROW_HEAD_ANGLE);
	const wing2x = ex - ARROW_HEAD_LENGTH * Math.cos(angle + ARROW_HEAD_ANGLE);
	const wing2y = ey - ARROW_HEAD_LENGTH * Math.sin(angle + ARROW_HEAD_ANGLE);

	// Shaft stops at the base of the arrowhead (midpoint of wings)
	const shaftX2 = (wing1x + wing2x) / 2;
	const shaftY2 = (wing1y + wing2y) / 2;

	const arrowVertices: [number, number][] = [
		[wing1x, wing1y],
		[ex, ey],
		[wing2x, wing2y]
	];

	const r = (v: number) => Math.round(v * 100) / 100;
	const arrowPoints = arrowVertices.map(([x, y]) => `${r(x)},${r(y)}`).join(' ');

	return { x1: sx, y1: sy, x2: ex, y2: ey, shaftX2, shaftY2, arrowPoints, arrowVertices };
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
	if (isCircleBy3Points(el)) {
		return circleBy3PointsToSVG(el, figure, transformer);
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
	const radiusMath = figure.resolveParam(circle.radius);
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

function circleBy3PointsToSVG(
	circle: GeoCircleBy3Points,
	figure: Figure,
	transformer: CoordinateTransformer
): CircleSVG | null {
	const p1 = figure.getPosition(circle.point1Id);
	const p2 = figure.getPosition(circle.point2Id);
	const p3 = figure.getPosition(circle.point3Id);
	if (!p1 || !p2 || !p3) return null;

	const cc = circumcircle(
		geoToNumber(p1.x),
		geoToNumber(p1.y),
		geoToNumber(p2.x),
		geoToNumber(p2.y),
		geoToNumber(p3.x),
		geoToNumber(p3.y)
	);
	if (!cc) return null;

	const svgCenter = transformer.mathToSvg(cc.ux, cc.uy);
	const radiusPx = Math.abs(cc.r * transformer.scaleX);
	return { cx: svgCenter.x, cy: svgCenter.y, r: radiusPx };
}

/**
 * Convert a circle to an SVG path (two half-arcs).
 * Used instead of <circle> when stroke-dasharray is needed, so the dash
 * pattern starts from the edge point (circleByPoint) instead of 3 o'clock.
 */
export function circleToPathSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): { path: string; cx: number; cy: number; r: number } | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	let cx: number,
		cy: number,
		rMath: number,
		startAngle = 0;
	if (isCircleByRadius(el)) {
		const center = figure.getPosition(el.centerId);
		if (!center) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		rMath = figure.resolveParam(el.radius);
	} else if (isCircleByPoint(el)) {
		const center = figure.getPosition(el.centerId);
		const edge = figure.getPosition(el.edgePointId);
		if (!center || !edge) return null;
		cx = geoToNumber(center.x);
		cy = geoToNumber(center.y);
		const dx = geoToNumber(edge.x) - cx;
		const dy = geoToNumber(edge.y) - cy;
		rMath = Math.sqrt(dx * dx + dy * dy);
		startAngle = Math.atan2(dy, dx);
	} else if (isCircleBy3Points(el)) {
		const p1 = figure.getPosition(el.point1Id);
		const p2 = figure.getPosition(el.point2Id);
		const p3 = figure.getPosition(el.point3Id);
		if (!p1 || !p2 || !p3) return null;
		const cc = circumcircle(
			geoToNumber(p1.x),
			geoToNumber(p1.y),
			geoToNumber(p2.x),
			geoToNumber(p2.y),
			geoToNumber(p3.x),
			geoToNumber(p3.y)
		);
		if (!cc) return null;
		cx = cc.ux;
		cy = cc.uy;
		rMath = cc.r;
	} else {
		return null;
	}

	const rPx = Math.abs(rMath * transformer.scaleX);
	const svgCenter = transformer.mathToSvg(cx, cy);

	// Build two half-arcs using the same logic as the animation overlay (buildArcPath)
	// to ensure dash patterns align perfectly.
	const midAngle = startAngle + Math.PI;
	const endAngle = startAngle + 2 * Math.PI;

	const svgS = transformer.mathToSvg(
		cx + rMath * Math.cos(startAngle),
		cy + rMath * Math.sin(startAngle)
	);
	const svgM = transformer.mathToSvg(
		cx + rMath * Math.cos(midAngle),
		cy + rMath * Math.sin(midAngle)
	);
	const svgE = transformer.mathToSvg(
		cx + rMath * Math.cos(endAngle),
		cy + rMath * Math.sin(endAngle)
	);

	// sweepFlag=0 (counterclockwise in SVG = math positive direction)
	// Each half is exactly π, so largeArc=0
	const path =
		`M ${svgS.x} ${svgS.y} A ${rPx} ${rPx} 0 0 0 ${svgM.x} ${svgM.y}` +
		` A ${rPx} ${rPx} 0 0 0 ${svgE.x} ${svgE.y}`;
	return { path, cx: svgCenter.x, cy: svgCenter.y, r: rPx };
}

// =============================================================================
// Arc rendering
// =============================================================================

export interface ArcSVG {
	/** SVG path string using the A (arc) command. */
	path: string;
}

/**
 * Convert an arc element to an SVG path string.
 */
export function arcToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): ArcSVG | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	if (isArcByAngles(el)) {
		return arcByAnglesToSVG(el, figure, transformer);
	}
	if (isArcByPoints(el)) {
		return arcByPointsToSVG(el, figure, transformer);
	}
	return null;
}

function arcByAnglesToSVG(
	arc: GeoArcByAngles,
	figure: Figure,
	transformer: CoordinateTransformer
): ArcSVG | null {
	const center = figure.getPosition(arc.centerId);
	if (!center) return null;

	const cx = geoToNumber(center.x);
	const cy = geoToNumber(center.y);
	const r = figure.resolveParam(arc.radius);
	const startAngle = figure.resolveParam(arc.startAngle);
	const endAngle = figure.resolveParam(arc.endAngle);

	return buildArcSVGPath(cx, cy, r, startAngle, endAngle, transformer);
}

function arcByPointsToSVG(
	arc: GeoArcByPoints,
	figure: Figure,
	transformer: CoordinateTransformer
): ArcSVG | null {
	const startPos = figure.getPosition(arc.startId);
	const centerPos = figure.getPosition(arc.centerId);
	const endPos = figure.getPosition(arc.endId);
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

	return buildArcSVGPath(cx, cy, r, startAngle, endAngle, transformer);
}

/**
 * Build an SVG path for an arc. Angles in radians (math convention).
 * The arc goes counterclockwise from startAngle to endAngle.
 */
function buildArcSVGPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	transformer: CoordinateTransformer
): ArcSVG | null {
	if (r < 1e-10) return null;

	// Compute start and end points in math coordinates
	const sx = cx + r * Math.cos(startAngle);
	const sy = cy + r * Math.sin(startAngle);
	const ex = cx + r * Math.cos(endAngle);
	const ey = cy + r * Math.sin(endAngle);

	// Convert to SVG coordinates
	const svgStart = transformer.mathToSvg(sx, sy);
	const svgEnd = transformer.mathToSvg(ex, ey);
	const rPx = r * transformer.scaleX;

	// Compute sweep: counterclockwise in math = clockwise in SVG (y inverted)
	let sweep = endAngle - startAngle;
	// Normalize to [0, 2*PI)
	while (sweep < 0) sweep += 2 * Math.PI;
	while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI;

	const largeArc = sweep > Math.PI ? 1 : 0;
	// In SVG, y is inverted so counterclockwise in math = clockwise in SVG = sweep-flag 0
	const sweepFlag = 0;

	const path = `M ${svgStart.x} ${svgStart.y} A ${rPx} ${rPx} 0 ${largeArc} ${sweepFlag} ${svgEnd.x} ${svgEnd.y}`;
	return { path };
}

// =============================================================================
// Sector rendering
// =============================================================================

export interface SectorSVG {
	/** SVG path: center → arc start → arc → arc end → center (closed). */
	path: string;
}

/**
 * Convert a sector element to an SVG path string.
 * The path is: M center L arcStart A ... arcEnd Z (closed for fill).
 */
export function sectorToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): SectorSVG | null {
	const el = figure.getElementById(id);
	if (!el) return null;

	let cx: number, cy: number, r: number, startAngle: number, endAngle: number;

	if (el.type === 'sectorByPoints') {
		const centerPos = figure.getPosition(el.centerId);
		const startPos = figure.getPosition(el.startId);
		const endPos = figure.getPosition(el.endId);
		if (!centerPos || !startPos || !endPos) return null;
		cx = geoToNumber(centerPos.x);
		cy = geoToNumber(centerPos.y);
		const sx = geoToNumber(startPos.x);
		const sy = geoToNumber(startPos.y);
		const ex = geoToNumber(endPos.x);
		const ey = geoToNumber(endPos.y);
		r = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
		startAngle = Math.atan2(sy - cy, sx - cx);
		endAngle = Math.atan2(ey - cy, ex - cx);
	} else if (el.type === 'sectorByAngles') {
		const centerPos = figure.getPosition(el.centerId);
		if (!centerPos) return null;
		cx = geoToNumber(centerPos.x);
		cy = geoToNumber(centerPos.y);
		r = figure.resolveParam(el.radius);
		startAngle = figure.resolveParam(el.startAngle);
		endAngle = figure.resolveParam(el.endAngle);
	} else {
		return null;
	}

	if (r < 1e-10) return null;

	const rPx = r * transformer.scaleX;
	const svgCenter = transformer.mathToSvg(cx, cy);
	const svgStart = transformer.mathToSvg(
		cx + r * Math.cos(startAngle),
		cy + r * Math.sin(startAngle)
	);
	const svgEnd = transformer.mathToSvg(cx + r * Math.cos(endAngle), cy + r * Math.sin(endAngle));

	let sweep = endAngle - startAngle;
	while (sweep < 0) sweep += 2 * Math.PI;
	while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI;

	const largeArc = sweep > Math.PI ? 1 : 0;
	const sweepFlag = 0;

	const path = `M ${svgCenter.x} ${svgCenter.y} L ${svgStart.x} ${svgStart.y} A ${rPx} ${rPx} 0 ${largeArc} ${sweepFlag} ${svgEnd.x} ${svgEnd.y} Z`;
	return { path };
}

// =============================================================================
// Annulus rendering
// =============================================================================

export interface AnnulusSVG {
	cx: number;
	cy: number;
	innerR: number;
	outerR: number;
	/** SVG path with two circles (outer CW, inner CCW) for fill-rule: evenodd. */
	path: string;
}

/**
 * Convert an annulus element to an SVG path.
 * Two concentric circles drawn in opposite directions with fill-rule: evenodd.
 */
export function annulusToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): AnnulusSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'annulus') return null;

	const centerPos = figure.getPosition(el.centerId);
	if (!centerPos) return null;

	const cx = geoToNumber(centerPos.x);
	const cy = geoToNumber(centerPos.y);
	const r1 = figure.resolveParam(el.innerRadius);
	const r2 = figure.resolveParam(el.outerRadius);

	const svgCenter = transformer.mathToSvg(cx, cy);
	const r1Px = Math.abs(r1 * transformer.scaleX);
	const r2Px = Math.abs(r2 * transformer.scaleX);

	// Outer circle (clockwise in SVG = two half-arcs with sweepFlag=1)
	const outerPath =
		`M ${svgCenter.x - r2Px} ${svgCenter.y} ` +
		`A ${r2Px} ${r2Px} 0 1 1 ${svgCenter.x + r2Px} ${svgCenter.y} ` +
		`A ${r2Px} ${r2Px} 0 1 1 ${svgCenter.x - r2Px} ${svgCenter.y} `;

	// Inner circle (sweepFlag=0 = opposite parity to outer for evenodd fill)
	const innerPath =
		`M ${svgCenter.x - r1Px} ${svgCenter.y} ` +
		`A ${r1Px} ${r1Px} 0 1 0 ${svgCenter.x + r1Px} ${svgCenter.y} ` +
		`A ${r1Px} ${r1Px} 0 1 0 ${svgCenter.x - r1Px} ${svgCenter.y} `;

	return {
		cx: svgCenter.x,
		cy: svgCenter.y,
		innerR: r1Px,
		outerR: r2Px,
		path: outerPath + innerPath
	};
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
// Text rendering
// =============================================================================

const TEXT_OFFSET_PX = 16;

export interface TextSVG {
	/** Position of the text in SVG coordinates. */
	x: number;
	y: number;
	/** Resolved text content to display. */
	text: string;
}

/**
 * Convert a GeoText element to SVG text attributes.
 *
 * Supports three positioning modes:
 * - Free position: explicit (x, y) math coordinates
 * - Anchor: offset from an anchor point
 * - Auto-position: midpoint/bisector/centroid based on target points
 */
export function textToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): TextSVG | null {
	const el = figure.getElementById(id);
	if (!el || (!isText(el) && !isMathText(el) && !isRichText(el))) return null;

	const textEl = el as GeoText | GeoMathText | GeoRichText;
	const text = figure.resolveTemplate(id);
	if (text === undefined) return null;

	// Mode 1: Auto-positioned (used by mesure() sugar)
	if (textEl.autoPosition && textEl.autoTargetIds) {
		const positions = textEl.autoTargetIds.map((tid) => figure.getPosition(tid));
		if (positions.some((p) => !p)) return null;

		if (textEl.autoPosition === 'midpoint') {
			const [a, b] = positions;
			const svgA = transformer.mathToSvg(geoToNumber(a!.x), geoToNumber(a!.y));
			const svgB = transformer.mathToSvg(geoToNumber(b!.x), geoToNumber(b!.y));
			const mx = (svgA.x + svgB.x) / 2;
			const my = (svgA.y + svgB.y) / 2;
			const dx = svgB.x - svgA.x;
			const dy = svgB.y - svgA.y;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len < 1e-6) return { x: mx, y: my, text };
			const px = -dy / len;
			const py = dx / len;
			return { x: mx + px * TEXT_OFFSET_PX, y: my + py * TEXT_OFFSET_PX, text };
		}

		if (textEl.autoPosition === 'bisector') {
			const [, v] = positions;
			const svgV = transformer.mathToSvg(geoToNumber(v!.x), geoToNumber(v!.y));
			const svgP1 = transformer.mathToSvg(
				geoToNumber(positions[0]!.x),
				geoToNumber(positions[0]!.y)
			);
			const svgP2 = transformer.mathToSvg(
				geoToNumber(positions[2]!.x),
				geoToNumber(positions[2]!.y)
			);
			const d1x = svgP1.x - svgV.x;
			const d1y = svgP1.y - svgV.y;
			const d2x = svgP2.x - svgV.x;
			const d2y = svgP2.y - svgV.y;
			const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
			const len2 = Math.sqrt(d2x * d2x + d2y * d2y);
			if (len1 < 1e-6 || len2 < 1e-6) return { x: svgV.x, y: svgV.y, text };
			const bx = d1x / len1 + d2x / len2;
			const by = d1y / len1 + d2y / len2;
			const blen = Math.sqrt(bx * bx + by * by);
			if (blen < 1e-6) return { x: svgV.x + 35, y: svgV.y, text };
			return { x: svgV.x + (bx / blen) * 40, y: svgV.y + (by / blen) * 40, text };
		}

		// centroid
		let cx = 0;
		let cy = 0;
		for (const pos of positions) {
			const svg = transformer.mathToSvg(geoToNumber(pos!.x), geoToNumber(pos!.y));
			cx += svg.x;
			cy += svg.y;
		}
		cx /= positions.length;
		cy /= positions.length;
		return { x: cx, y: cy, text };
	}

	// Mode 2: Anchored to a point
	if (textEl.anchorId) {
		const anchorPos = figure.getPosition(textEl.anchorId);
		if (!anchorPos) return null;
		const svgAnchor = transformer.mathToSvg(geoToNumber(anchorPos.x), geoToNumber(anchorPos.y));
		const dx = (textEl.anchorOffset?.dx ?? 0.5) * transformer.scaleX;
		const dy = -(textEl.anchorOffset?.dy ?? 0.5) * transformer.scaleY; // negate: math y-up → SVG y-down
		return { x: svgAnchor.x + dx, y: svgAnchor.y + dy, text };
	}

	// Mode 3: Free position
	if (textEl.position) {
		const svgPos = transformer.mathToSvg(textEl.position.x, textEl.position.y);
		return { x: svgPos.x, y: svgPos.y, text };
	}

	return null;
}

// =============================================================================
// Image rendering
// =============================================================================

/**
 * Resolve the visual rotation/flip for an image reactively.
 * Walks the chain of _transformId/_srcImageId to recompute from current state.
 */
function resolveImageVisualTransform(
	img: GeoImage,
	figure: Figure
): { rotation: number; flipped: boolean } {
	if (img._transformId) {
		const transformEl = figure.getElementById(img._transformId);
		if (transformEl && isTransformation(transformEl)) {
			// Resolve source image's visual transform (recursive for chained transforms)
			let srcRot = 0,
				srcFlip = false;
			if (img._srcImageId) {
				const srcImg = figure.getElementById(img._srcImageId);
				if (srcImg && isImage(srcImg)) {
					const srcVisual = resolveImageVisualTransform(srcImg as GeoImage, figure);
					srcRot = srcVisual.rotation;
					srcFlip = srcVisual.flipped;
				}
			}
			return computeImageVisualTransform(srcRot, srcFlip, transformEl, figure);
		}
	}
	return { rotation: img.rotation ?? 0, flipped: img.flipped ?? false };
}

export interface ImageSVG {
	/** Top-left corner X in SVG coordinates. */
	x: number;
	/** Top-left corner Y in SVG coordinates. */
	y: number;
	/** Width in SVG pixels. */
	width: number;
	/** Height in SVG pixels (undefined = preserve aspect ratio). */
	height?: number;
	/** Image URL. */
	url: string;
	/** Visual rotation in radians (from geometric transforms). */
	rotation?: number;
	/** Whether image is visually flipped/mirrored (from axial symmetry). */
	flipped?: boolean;
}

/**
 * Convert a GeoImage element to SVG image attributes.
 *
 * Position (x, y) in math coordinates is the bottom-left corner of the image
 * (math y-up). In SVG (y-down), we convert to the top-left corner.
 */
export function imageToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): ImageSVG | null {
	const el = figure.getElementById(id);
	if (!el || !isImage(el)) return null;

	// 2-point rectangle mode
	if (el.point1Id && el.point2Id) {
		const p1Pos = figure.getPosition(el.point1Id);
		const p2Pos = figure.getPosition(el.point2Id);
		if (!p1Pos || !p2Pos) return null;
		const svg1 = transformer.mathToSvg(geoToNumber(p1Pos.x), geoToNumber(p1Pos.y));
		const svg2 = transformer.mathToSvg(geoToNumber(p2Pos.x), geoToNumber(p2Pos.y));

		// Resolve visual transform reactively (handles axis/source point movement)
		const visual = resolveImageVisualTransform(el, figure);
		const hasTransform = Math.abs(visual.rotation) > 1e-10 || visual.flipped;
		if (hasTransform) {
			const mathDx = geoToNumber(p2Pos.x) - geoToNumber(p1Pos.x);
			const mathDy = geoToNumber(p2Pos.y) - geoToNumber(p1Pos.y);
			let w: number, h: number, rotation: number;

			// Try reactive mode: look up source points to get current original dimensions
			const srcP1 = el._srcPoint1Id ? figure.getPosition(el._srcPoint1Id) : null;
			const srcP2 = el._srcPoint2Id ? figure.getPosition(el._srcPoint2Id) : null;
			if (srcP1 && srcP2) {
				// Reactive: compute origW/origH from current source point positions
				const origW = geoToNumber(srcP2.x) - geoToNumber(srcP1.x);
				const origH = geoToNumber(srcP2.y) - geoToNumber(srcP1.y);
				w = Math.abs(origW) * Math.abs(transformer.scaleX);
				h = Math.abs(origH) * Math.abs(transformer.scaleY);
				const diagAngle = Math.atan2(mathDy, mathDx);
				const hEff = visual.flipped ? -origH : origH;
				const origDiagAngle = Math.atan2(hEff, origW);
				rotation = diagAngle - origDiagAngle;
			} else {
				// Fallback: un-rotate diagonal with static rotation value
				const rot = visual.rotation;
				const cos = Math.cos(rot);
				const sin = Math.sin(rot);
				const origW = mathDx * cos + mathDy * sin;
				const origH = -mathDx * sin + mathDy * cos;
				w = Math.abs(origW) * Math.abs(transformer.scaleX);
				h = Math.abs(origH) * Math.abs(transformer.scaleY);
				rotation = rot;
			}

			const cx = (svg1.x + svg2.x) / 2;
			const cy = (svg1.y + svg2.y) / 2;
			return {
				x: cx - w / 2,
				y: cy - h / 2,
				width: w,
				height: h,
				url: el.url,
				rotation,
				flipped: visual.flipped
			};
		}

		return {
			x: Math.min(svg1.x, svg2.x),
			y: Math.min(svg1.y, svg2.y),
			width: Math.abs(svg2.x - svg1.x),
			height: Math.abs(svg2.y - svg1.y),
			url: el.url,
			rotation: visual.rotation,
			flipped: visual.flipped
		};
	}

	// Resolve visual transform reactively for non-2-point images
	const visual = resolveImageVisualTransform(el, figure);

	const widthPx = el.width * Math.abs(transformer.scaleX);
	const heightPx = el.height !== undefined ? el.height * Math.abs(transformer.scaleY) : undefined;

	// Anchored to a point
	if (el.anchorId) {
		const anchorPos = figure.getPosition(el.anchorId);
		if (!anchorPos) return null;
		const svgAnchor = transformer.mathToSvg(geoToNumber(anchorPos.x), geoToNumber(anchorPos.y));
		const dx = (el.anchorOffset?.dx ?? 0) * transformer.scaleX;
		const dy = -(el.anchorOffset?.dy ?? 0) * transformer.scaleY;
		return {
			x: svgAnchor.x + dx,
			y: svgAnchor.y + dy,
			width: widthPx,
			height: heightPx,
			url: el.url,
			rotation: visual.rotation,
			flipped: visual.flipped
		};
	}

	// Free position — (x,y) in math is the center; SVG <image> starts top-left
	if (el.position) {
		const svgCenter = transformer.mathToSvg(el.position.x, el.position.y);
		const hPx = heightPx ?? widthPx;
		return {
			x: svgCenter.x - widthPx / 2,
			y: svgCenter.y - hPx / 2,
			width: widthPx,
			height: heightPx,
			url: el.url,
			rotation: visual.rotation,
			flipped: visual.flipped
		};
	}

	return null;
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

// =============================================================================
// Function curve rendering
// =============================================================================

import type {
	GeoFunction,
	GeoIntegralArea,
	GeoQuadraticCurve,
	GeoTangentLine,
	GeoTangentToQuadratic
} from '../types/elements';
import type { ScalarParam } from '../types/geo-value';
import { isScalarRef } from '../types/geo-value';
import type { ConicParams } from '../types/elements';
import { conicPointFromParam } from '../graph/conic-helpers';
import { polarLine } from '../geometry/conic-properties';
import type { Viewport, SampledCurve, Point } from '../viewport/types';
import { sampleWithDerivative } from '$lib/grapheur/sampler';
import { curveToSVGPath } from '../rendering/bezier';
import { marchingSquares } from './marching-squares';

/** Number of sample points for function curve rendering. */
const FUNCTION_SAMPLE_POINTS = 300;

/**
 * Convert a GeoFunction to an SVG path string.
 * Uses adaptive sampling based on the derivative for optimal point distribution.
 */
export function functionToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { path: string } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'function') return null;

	const fn = el as GeoFunction;

	// Compute viewport in math coordinates
	const topLeft = transformer.svgToMath(0, 0);
	const bottomRight = transformer.svgToMath(dims.width, dims.height);
	const viewport: Viewport = {
		xMin: topLeft.x,
		xMax: bottomRight.x,
		yMin: bottomRight.y, // y is inverted in SVG
		yMax: topLeft.y
	};

	// Safe evaluators: return null for NaN/Infinity
	const evaluator = (x: number): number | null => {
		const y = fn.compiledFn({ x });
		return Number.isFinite(y) ? y : null;
	};
	const derivativeEvaluator = (x: number): number | null => {
		const d = fn.compiledDerivative({ x });
		return Number.isFinite(d) ? d : null;
	};

	// Adaptive sampling with derivative
	const curve = sampleWithDerivative(
		evaluator,
		derivativeEvaluator,
		viewport,
		FUNCTION_SAMPLE_POINTS
	);
	if (curve.points.length === 0) return null;

	// Convert to SVG path with Catmull-Rom smoothing
	const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
	return path ? { path } : null;
}

/**
 * Convert a GeoTangentLine to SVG line attributes.
 * Computes the tangent at x₀ using f(x₀) and f'(x₀), then extends to viewport bounds.
 */
export function tangentLineToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'tangentLine') return null;

	const tl = el as GeoTangentLine;
	const fnEl = figure.getElementById(tl.functionId);
	if (!fnEl || fnEl.type !== 'function') return null;

	// Get x₀
	let x0: number;
	if (tl.pointOnCurveId) {
		const pos = figure.getPosition(tl.pointOnCurveId);
		if (!pos) return null;
		x0 = geoToNumber(pos.x);
	} else if (tl.x0 !== undefined) {
		x0 = geoToNumber(tl.x0);
	} else {
		return null;
	}

	// Compute y₀ and slope m = f'(x₀)
	const y0 = fnEl.compiledFn({ x: x0 });
	const m = fnEl.compiledDerivative({ x: x0 });
	if (!Number.isFinite(y0) || !Number.isFinite(m)) return null;

	// Tangent line: passes through (x₀, y₀) with slope m
	// Second point: (x₀ + 1, y₀ + m)
	return extendLineToBounds(x0, y0, x0 + 1, y0 + m, transformer, dims);
}

/**
 * Convert a GeoTangentToQuadratic to SVG line attributes.
 * Tangent at (x₀,y₀) on F(x,y)=0: ∂F/∂x·(x-x₀) + ∂F/∂y·(y-y₀) = 0
 */
export function tangentToQuadraticToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'tangentToQuadratic') return null;

	const tq = el as GeoTangentToQuadratic;
	const curveEl = figure.getElementById(tq.curveId);
	if (!curveEl || curveEl.type !== 'quadraticCurve') return null;

	// Get the point on the curve
	let x0: number, y0: number;
	if (tq.pointOnCurveId) {
		const pos = figure.getPosition(tq.pointOnCurveId);
		if (!pos) return null;
		x0 = geoToNumber(pos.x);
		y0 = geoToNumber(pos.y);
	} else if (tq.t !== undefined) {
		const pt = conicPointFromParam(curveEl.conic, tq.t);
		if (!pt) return null;
		x0 = pt.x;
		y0 = pt.y;
	} else {
		return null;
	}

	// Gradient of F = Ax² + Bxy + Cy² + Dx + Ey + F
	const [A, B, C, D, E, _F] = curveEl.coefficients;
	const dFx = 2 * A * x0 + B * y0 + D;
	const dFy = B * x0 + 2 * C * y0 + E;

	// Tangent direction is perpendicular to gradient: (-dFy, dFx)
	// Second point on tangent: (x0 - dFy, y0 + dFx)
	if (Math.abs(dFx) < 1e-12 && Math.abs(dFy) < 1e-12) return null;

	return extendLineToBounds(x0, y0, x0 - dFy, y0 + dFx, transformer, dims);
}

/**
 * Polar line of a point P w.r.t. a quadratic curve.
 * Delegates to polarLine() from conic-properties for the math.
 */
export function conicPolarToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): LineSVG | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'conicPolar') return null;

	const curveEl = figure.getElementById(el.curveId);
	if (!curveEl || curveEl.type !== 'quadraticCurve') return null;

	const pos = figure.getPosition(el.pointId);
	if (!pos) return null;

	const line = polarLine(curveEl.coefficients, geoToNumber(pos.x), geoToNumber(pos.y));
	if (!line) return null;

	return extendLineToBounds(line.p1.x, line.p1.y, line.p2.x, line.p2.y, transformer, dims);
}

// =============================================================================
// Quadratic curve (conic section) rendering
// =============================================================================

/** Number of sample points for parametric conic rendering. */
const CONIC_SAMPLE_POINTS = 200;

/**
 * Convert a GeoQuadraticCurve to SVG path string(s) via parametric sampling.
 */
export function quadraticCurveToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { paths: string[] } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'quadraticCurve') return null;

	const qc = el as GeoQuadraticCurve;
	const conic = qc.conic;

	if (conic.type === 'degenerate') return null;

	const topLeft = transformer.svgToMath(0, 0);
	const bottomRight = transformer.svgToMath(dims.width, dims.height);
	const viewport: Viewport = {
		xMin: topLeft.x,
		xMax: bottomRight.x,
		yMin: bottomRight.y,
		yMax: topLeft.y
	};

	const paths: string[] = [];

	switch (conic.type) {
		case 'circle':
		case 'ellipse': {
			const curve = sampleEllipse(conic, CONIC_SAMPLE_POINTS);
			const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
			if (path) paths.push(path);
			break;
		}
		case 'hyperbola': {
			// Two branches
			const [branch1, branch2] = sampleHyperbola(conic, viewport, CONIC_SAMPLE_POINTS);
			const p1 = curveToSVGPath(branch1, (p) => transformer.mathToSvg(p.x, p.y));
			const p2 = curveToSVGPath(branch2, (p) => transformer.mathToSvg(p.x, p.y));
			if (p1) paths.push(p1);
			if (p2) paths.push(p2);
			break;
		}
		case 'parabola': {
			const curve = sampleParabola(conic, viewport, CONIC_SAMPLE_POINTS);
			const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
			if (path) paths.push(path);
			break;
		}
	}

	return paths.length > 0 ? { paths } : null;
}

// =============================================================================
// Parametric sampling helpers
// =============================================================================

/** Transform a point from local (rotated) to world coordinates. */
function localToWorld(
	lx: number,
	ly: number,
	cx: number,
	cy: number,
	cos: number,
	sin: number
): Point {
	return {
		x: cx + lx * cos - ly * sin,
		y: cy + lx * sin + ly * cos
	};
}

/** Sample an ellipse (or circle) parametrically. Returns a closed curve. */
function sampleEllipse(conic: ConicParams, n: number): SampledCurve {
	const { a, b, rotation } = conic;
	const cx = conic.center?.x ?? 0;
	const cy = conic.center?.y ?? 0;
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);

	const points: Point[] = [];
	// Sample full circle + close
	for (let i = 0; i <= n; i++) {
		const t = (2 * Math.PI * i) / n;
		const lx = a * Math.cos(t);
		const ly = b * Math.sin(t);
		points.push(localToWorld(lx, ly, cx, cy, cos, sin));
	}

	return { points, discontinuityIndices: [] };
}

/** Sample both branches of a hyperbola. */
function sampleHyperbola(
	conic: ConicParams,
	viewport: Viewport,
	n: number
): [SampledCurve, SampledCurve] {
	const { a, b, rotation } = conic;
	const cx = conic.center?.x ?? 0;
	const cy = conic.center?.y ?? 0;
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);

	// t range: enough to cover viewport diagonal
	const diag = Math.sqrt(
		(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
	);
	const tMax = Math.acosh(Math.max(2, diag / a + 1));

	const branch1: Point[] = [];
	const branch2: Point[] = [];

	for (let i = 0; i <= n; i++) {
		const t = -tMax + (2 * tMax * i) / n;
		// Right branch: x = a·cosh(t), y = b·sinh(t)
		const lx = a * Math.cosh(t);
		const ly = b * Math.sinh(t);
		branch1.push(localToWorld(lx, ly, cx, cy, cos, sin));
		// Left branch: x = -a·cosh(t), y = b·sinh(t)  (or equivalently negate x)
		branch2.push(localToWorld(-lx, ly, cx, cy, cos, sin));
	}

	return [
		{ points: branch1, discontinuityIndices: [] },
		{ points: branch2, discontinuityIndices: [] }
	];
}

/** Sample a parabola parametrically. */
function sampleParabola(conic: ConicParams, viewport: Viewport, n: number): SampledCurve {
	const p = conic.p ?? conic.a;
	const vx = conic.vertex?.x ?? 0;
	const vy = conic.vertex?.y ?? 0;
	const cos = Math.cos(conic.rotation);
	const sin = Math.sin(conic.rotation);

	// t range: cover viewport
	const diag = Math.sqrt(
		(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
	);
	const tMax = Math.sqrt(diag * 2 * p);

	const points: Point[] = [];
	for (let i = 0; i <= n; i++) {
		const t = -tMax + (2 * tMax * i) / n;
		// Standard parabola: y² = 4px → parametric: (t²/(4p), t)
		// Opens along x-axis from vertex
		const lx = (t * t) / (2 * p);
		const ly = t;
		points.push(localToWorld(lx, ly, vx, vy, cos, sin));
	}

	return { points, discontinuityIndices: [] };
}

// =============================================================================
// Implicit curve rendering (marching squares)
// =============================================================================

/**
 * Convert a GeoImplicitCurve to SVG path string(s) via marching squares.
 */
export function implicitCurveToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { paths: string[] } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'implicitCurve') return null;

	const topLeft = transformer.svgToMath(0, 0);
	const bottomRight = transformer.svgToMath(dims.width, dims.height);
	const viewport: Viewport = {
		xMin: topLeft.x,
		xMax: bottomRight.x,
		yMin: bottomRight.y,
		yMax: topLeft.y
	};

	const curves = marchingSquares(el.compiledFn, viewport);
	const paths: string[] = [];
	for (const curve of curves) {
		const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
		if (path) paths.push(path);
	}

	return paths.length > 0 ? { paths } : null;
}

/**
 * Convert a GeoLocus to an SVG path string.
 * Computes the locus curve on the fly from the figure's elements and positions.
 */
export function locusToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { path: string } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'locus') return null;

	const topLeft = transformer.svgToMath(0, 0);
	const bottomRight = transformer.svgToMath(dims.width, dims.height);
	const viewport: Viewport = {
		xMin: topLeft.x,
		xMax: bottomRight.x,
		yMin: bottomRight.y,
		yMax: topLeft.y
	};

	const curve = figure.computeLocusCurveForElement(id, viewport);
	if (!curve || curve.points.length < 2) return null;

	const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
	return path ? { path } : null;
}

/**
 * Convert a GeoTrace to an SVG path string.
 * Uses the accumulated trace points from the figure.
 */
export function traceToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer
): { path: string } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'trace') return null;

	const points = figure.getTracePoints(id);
	if (points.length < 2) return null;

	const curve: SampledCurve = { points: points as Point[], discontinuityIndices: [] };
	const path = curveToSVGPath(curve, (p) => transformer.mathToSvg(p.x, p.y));
	return path ? { path } : null;
}

// =============================================================================
// Integral area rendering
// =============================================================================

const ZERO_Y_EPS = 1e-12;

/** A sub-region of a sampled curve where y keeps a constant sign. */
export interface SignedSubRegion {
	readonly points: readonly Point[];
	readonly sign: 'positive' | 'negative' | 'zero';
}

/**
 * Split a sampled curve into sub-regions where y keeps a constant sign.
 * Sign changes between consecutive samples are split at the linearly
 * interpolated zero crossing. Discontinuities break the path without
 * connecting the new sub-region to the previous one.
 *
 * Sub-regions with fewer than 2 points are dropped.
 */
export function splitOnZeros(curve: SampledCurve): SignedSubRegion[] {
	const { points, discontinuityIndices } = curve;
	if (points.length === 0) return [];

	const discSet = new Set(discontinuityIndices);
	const regions: SignedSubRegion[] = [];
	let currentPoints: Point[] = [];
	let currentSign: 'positive' | 'negative' | 'zero' = 'zero';

	const signOf = (y: number): 'positive' | 'negative' | 'zero' => {
		if (y > ZERO_Y_EPS) return 'positive';
		if (y < -ZERO_Y_EPS) return 'negative';
		return 'zero';
	};

	const flush = () => {
		if (currentPoints.length >= 2) {
			regions.push({ points: currentPoints, sign: currentSign });
		}
	};

	for (let i = 0; i < points.length; i++) {
		const p = points[i];

		if (i === 0) {
			currentPoints = [p];
			currentSign = signOf(p.y);
			continue;
		}

		// Discontinuity break: end current region, start fresh from this point.
		if (discSet.has(i)) {
			flush();
			currentPoints = [p];
			currentSign = signOf(p.y);
			continue;
		}

		const prev = points[i - 1];
		const prevSign = currentSign;
		const newSign = signOf(p.y);

		// Sign change with strict opposite signs: interpolate zero crossing,
		// close current region at the zero, start new region at the zero.
		if (
			(prevSign === 'positive' && newSign === 'negative') ||
			(prevSign === 'negative' && newSign === 'positive')
		) {
			if (Math.abs(prev.y) < ZERO_Y_EPS) {
				// `prev` is already on the axis (an exact-zero sample landed
				// here). Reuse it as the boundary instead of interpolating to
				// avoid a duplicate zero point.
				flush();
				currentPoints = [prev, p];
				currentSign = newSign;
				continue;
			}
			const t = prev.y / (prev.y - p.y);
			const zx = prev.x + t * (p.x - prev.x);
			const zPoint: Point = { x: zx, y: 0 };
			currentPoints.push(zPoint);
			flush();
			currentPoints = [zPoint, p];
			currentSign = newSign;
			continue;
		}

		// Transition through zero region (e.g., 'positive' → 'zero' or 'zero' → 'positive').
		// We absorb 'zero' samples into whichever non-zero region is active.
		if (prevSign === 'zero' && newSign !== 'zero') {
			currentPoints.push(p);
			currentSign = newSign;
			continue;
		}
		if (prevSign !== 'zero' && newSign === 'zero') {
			// Treat as endpoint of current region; if more samples follow with the
			// same prevSign, the upcoming iteration will keep extending. If they
			// follow with the opposite sign, the next iteration will see prev.y=0
			// and treat it as a regular extension.
			currentPoints.push(p);
			continue;
		}

		// Same sign (including both zero): just extend.
		currentPoints.push(p);
	}

	flush();
	return regions;
}

/** Resolve a ScalarParam to a JS number using the figure's current scalar values. */
function resolveBoundToNumber(param: ScalarParam, figure: Figure): number {
	if (isScalarRef(param)) {
		return figure.getScalarValue(param.scalarRef) ?? NaN;
	}
	return geoToNumber(param);
}

/**
 * Convert a GeoIntegralArea to a list of closed SVG paths (one per sub-region
 * where f keeps a constant sign). Returns null when the element is missing,
 * not an integral area, or when the geometry cannot be resolved.
 */
export function integralAreaToSVG(
	id: string,
	figure: Figure,
	transformer: CoordinateTransformer,
	dims: { width: number; height: number }
): { paths: Array<{ d: string; sign: 'positive' | 'negative' }> } | null {
	const el = figure.getElementById(id);
	if (!el || el.type !== 'integralArea') return null;
	const area = el as GeoIntegralArea;

	const fnEl = figure.getElementById(area.functionId);
	if (!fnEl || fnEl.type !== 'function') return null;

	const a = resolveBoundToNumber(area.lowerBound, figure);
	const b = resolveBoundToNumber(area.upperBound, figure);
	if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
	if (a === b) return null;

	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	const topLeft = transformer.svgToMath(0, 0);
	const bottomRight = transformer.svgToMath(dims.width, dims.height);
	const subViewport: Viewport = {
		xMin: lo,
		xMax: hi,
		yMin: bottomRight.y,
		yMax: topLeft.y
	};

	const evaluator = (x: number): number | null => {
		const y = fnEl.compiledFn({ x });
		return Number.isFinite(y) ? y : null;
	};
	const derivativeEvaluator = (x: number): number | null => {
		const d = fnEl.compiledDerivative({ x });
		return Number.isFinite(d) ? d : null;
	};

	const sampled = sampleWithDerivative(
		evaluator,
		derivativeEvaluator,
		subViewport,
		FUNCTION_SAMPLE_POINTS
	);
	if (sampled.points.length < 2) return null;

	const regions = splitOnZeros(sampled);
	const paths: Array<{ d: string; sign: 'positive' | 'negative' }> = [];

	for (const region of regions) {
		if (region.sign === 'zero') continue;
		if (region.points.length < 2) continue;

		const curveSegment: SampledCurve = {
			points: region.points,
			discontinuityIndices: []
		};
		const curvePath = curveToSVGPath(curveSegment, (p) => transformer.mathToSvg(p.x, p.y));
		if (!curvePath) continue;

		const first = region.points[0];
		const last = region.points[region.points.length - 1];
		const lastAxis = transformer.mathToSvg(last.x, 0);
		const firstAxis = transformer.mathToSvg(first.x, 0);

		const d =
			`${curvePath} L${lastAxis.x.toFixed(4)},${lastAxis.y.toFixed(4)} ` +
			`L${firstAxis.x.toFixed(4)},${firstAxis.y.toFixed(4)} Z`;

		paths.push({ d, sign: region.sign });
	}

	if (paths.length === 0) return null;
	return { paths };
}
