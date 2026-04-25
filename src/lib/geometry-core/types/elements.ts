/**
 * GeoElement - Discriminated union of all geometric element types.
 *
 * Each element has:
 * - id: unique string identifier
 * - type: discriminant for the union
 * - dependsOn: array of parent element IDs (in GeoElementBase for generic access)
 */

import type { GeoValue } from './geo-value';
import type { GeoPoint } from './primitives';
import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';

// =============================================================================
// Style
// =============================================================================

export interface GeoStyle {
	readonly color?: string;
	readonly opacity?: number;
	readonly strokeWidth?: number;
	readonly dash?: 'solid' | 'dashed' | 'dotted';
	readonly pointShape?: 'dot' | 'circle' | 'cross' | 'square';
	readonly pointSize?: number;
	readonly fillColor?: string;
	readonly fillOpacity?: number;
	/** Rendering style override for mixed mode ('normal' | 'rough'). */
	readonly render?: 'normal' | 'rough';
	/** Roughness level for rough rendering (0..5, default 1). */
	readonly roughness?: number;
	/** Explicit seed for deterministic rough rendering. */
	readonly roughSeed?: number;
	/** Bowing: how much lines curve (0 = straight, higher = more bowed). Default 1. */
	readonly roughBowing?: number;
	/** Fill pattern for rough mode. */
	readonly roughFillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed';
	/** If true, endpoints/vertices are not randomly offset (cleaner joints). */
	readonly roughPreserveVertices?: boolean;
}

// =============================================================================
// Common properties
// =============================================================================

export interface GeoElementBase {
	readonly id: string;
	readonly label?: string;
	readonly labelOffset?: { readonly dx: number; readonly dy: number };
	readonly color: string;
	readonly visible: boolean;
	readonly style?: GeoStyle;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Point types
// =============================================================================

export interface GeoFreePoint extends GeoElementBase {
	readonly type: 'freePoint';
	readonly position: GeoPoint;
	readonly draggable: boolean;
	readonly dependsOn: readonly [];
}

export interface GeoMidpoint extends GeoElementBase {
	readonly type: 'midpoint';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two line-like elements. Depends on the two line elements. */
export interface GeoIntersectionLL extends GeoElementBase {
	readonly type: 'intersectionLL';
	readonly line1Id: string;
	readonly line2Id: string;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by central symmetry (reflection through a center). */
export interface GeoReflectedPoint extends GeoElementBase {
	readonly type: 'reflectedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by rotation around a center. */
export interface GeoRotatedPoint extends GeoElementBase {
	readonly type: 'rotatedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly angle: GeoValue;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by translation defined by a vector (two points). */
export interface GeoTranslatedPoint extends GeoElementBase {
	readonly type: 'translatedPoint';
	readonly sourceId: string;
	readonly vectorStartId: string;
	readonly vectorEndId: string;
	readonly dependsOn: readonly [string, string, string];
}

/** Image of a point by homothety (dilation) from a center with a factor. */
export interface GeoDilatedPoint extends GeoElementBase {
	readonly type: 'dilatedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly factor: GeoValue;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by axial symmetry (reflection over a line defined by two points). */
export interface GeoReflectedOverLine extends GeoElementBase {
	readonly type: 'reflectedOverLine';
	readonly sourceId: string;
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly dependsOn: readonly [string, string, string];
}

/** Point constrained to a function curve y=f(x). Draggable along x unless draggable=false. */
export interface GeoPointOnCurve extends GeoElementBase {
	readonly type: 'pointOnCurve';
	readonly functionId: string;
	readonly x0: GeoValue;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

// =============================================================================
// Annotation types
// =============================================================================

/** Angle mark (arc or right-angle square) at a vertex defined by three points. */
export interface GeoAngleMark extends GeoElementBase {
	readonly type: 'angleMark';
	readonly p1Id: string;
	readonly vertexId: string;
	readonly p2Id: string;
	readonly arcCount: 1 | 2 | 3;
	readonly rightAngle: boolean;
	readonly dependsOn: readonly [string, string, string];
}

/** Tick marks on a segment to indicate equal lengths. */
export interface GeoSegmentMark extends GeoElementBase {
	readonly type: 'segmentMark';
	readonly startId: string;
	readonly endId: string;
	readonly markCount: 1 | 2 | 3;
	readonly dependsOn: readonly [string, string];
}

/** Dynamic measurement displayed on the figure (distance, angle, area). */
export interface GeoMeasure extends GeoElementBase {
	readonly type: 'measure';
	readonly measureType: 'distance' | 'angle' | 'area';
	readonly targetIds: readonly string[];
	readonly format: 'exact' | 'approx' | 'degrees' | 'radians';
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Line-like types
// =============================================================================

export interface GeoSegment extends GeoElementBase {
	readonly type: 'segment';
	readonly startId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string];
}

/** Equation ax + by + c = 0 with exact coefficients and original expression string. */
export interface LineEquation {
	readonly a: MathNode;
	readonly b: MathNode;
	readonly c: MathNode;
	readonly expression: string;
}

export interface GeoLine extends GeoElementBase {
	readonly type: 'line';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly equation?: LineEquation;
	readonly dependsOn: readonly [string, string];
}

export interface GeoRay extends GeoElementBase {
	readonly type: 'ray';
	readonly originId: string;
	readonly throughId: string;
	readonly dependsOn: readonly [string, string];
}

// =============================================================================
// Arc (two construction variants)
// =============================================================================

/**
 * Arc defined by center, radius, and start/end angles (radians internally).
 * DSL accepts angles in degrees and converts.
 */
export interface GeoArcByAngles extends GeoElementBase {
	readonly type: 'arcByAngles';
	readonly centerId: string;
	readonly radius: GeoValue;
	readonly startAngle: GeoValue; // radians
	readonly endAngle: GeoValue; // radians
	readonly dependsOn: readonly [string];
}

/**
 * Arc from startPoint to endPoint around center.
 * Used to trace angles: arc(A, O, B) draws the arc of angle AOB.
 * The arc goes counterclockwise from OA to OB direction.
 */
export interface GeoArcByPoints extends GeoElementBase {
	readonly type: 'arcByPoints';
	readonly startId: string;
	readonly centerId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string, string];
}

export type GeoArc = GeoArcByAngles | GeoArcByPoints;

// =============================================================================
// Circle (two construction variants)
// =============================================================================

/**
 * Circle defined by center point and a fixed radius value.
 * `radius` is a GeoValue (not a point ID) because it may be an exact symbolic
 * value (e.g. sqrt(2)) not tied to any constructed point. The dependency graph
 * depends only on `centerId`; `radius` is an intrinsic parameter.
 */
export interface GeoCircleByRadius extends GeoElementBase {
	readonly type: 'circleByRadius';
	readonly centerId: string;
	readonly radius: GeoValue;
	readonly dependsOn: readonly [string];
}

/** Circle defined by center point and a point on the circle. */
export interface GeoCircleByPoint extends GeoElementBase {
	readonly type: 'circleByPoint';
	readonly centerId: string;
	readonly edgePointId: string;
	readonly dependsOn: readonly [string, string];
}

export type GeoCircle = GeoCircleByRadius | GeoCircleByPoint;

// =============================================================================
// Polygon (minimum 3 vertices, dependsOn IS the vertex list)
// =============================================================================

export interface GeoPolygon extends GeoElementBase {
	readonly type: 'polygon';
	/** Vertex IDs in order. Also serves as the dependency list. Minimum 3. */
	readonly dependsOn: readonly [string, string, string, ...string[]];
}

/** Tangent line to a function curve at a given x₀. */
export interface GeoTangentLine extends GeoElementBase {
	readonly type: 'tangentLine';
	readonly functionId: string;
	/** Point on curve that defines x₀ dynamically (mutually exclusive with x0). */
	readonly pointOnCurveId?: string;
	/** Fixed x₀ value (mutually exclusive with pointOnCurveId). */
	readonly x0?: GeoValue;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Function curve (y = f(x), from courbe() builtin)
// =============================================================================

export interface GeoFunction extends GeoElementBase {
	readonly type: 'function';
	/** f(x) as a symbolic MathNode (for exact analysis: derivative, zeros, domain). */
	readonly expression: MathNode;
	/** f'(x) as a symbolic MathNode (for adaptive sampling and tangent lines). */
	readonly derivative: MathNode;
	/** Compiled closure for fast numerical evaluation of f(x). */
	readonly compiledFn: CompiledFn;
	/** Compiled closure for fast numerical evaluation of f'(x). */
	readonly compiledDerivative: CompiledFn;
	/** Original equation string as entered by the user (for serialization). */
	readonly equation: string;
	/** Autonomous element — no dependencies on other elements. */
	readonly dependsOn: readonly [];
}

// =============================================================================
// Quadratic curve (conic section, from courbe() builtin)
// =============================================================================

/** Conic type after classification. */
export type ConicType = 'circle' | 'ellipse' | 'hyperbola' | 'parabola' | 'degenerate';

/** Classified conic parameters for parametric rendering. */
export interface ConicParams {
	readonly type: ConicType;
	readonly center?: { readonly x: number; readonly y: number };
	/** Semi-axis a (≥ b for ellipse; transverse for hyperbola; focal param for parabola). */
	readonly a: number;
	/** Semi-axis b (≤ a for ellipse; conjugate for hyperbola). */
	readonly b: number;
	/** Rotation angle in radians. */
	readonly rotation: number;
	/** For parabolas: focal parameter p. */
	readonly p?: number;
	/** For parabolas: vertex position. */
	readonly vertex?: { readonly x: number; readonly y: number };
}

export interface GeoQuadraticCurve extends GeoElementBase {
	readonly type: 'quadraticCurve';
	/** Original F(x,y) as a symbolic MathNode. */
	readonly expression: MathNode;
	/** Original equation string as entered by the user. */
	readonly equation: string;
	/** Numeric coefficients [A, B, C, D, E, F] of Ax²+Bxy+Cy²+Dx+Ey+F=0. */
	readonly coefficients: readonly [number, number, number, number, number, number];
	/** Classified conic parameters for rendering. */
	readonly conic: ConicParams;
	/** Autonomous element — no dependencies on other elements. */
	readonly dependsOn: readonly [];
}

// =============================================================================
// Union type
// =============================================================================

export type GeoPointElement =
	| GeoFreePoint
	| GeoMidpoint
	| GeoIntersectionLL
	| GeoReflectedPoint
	| GeoRotatedPoint
	| GeoTranslatedPoint
	| GeoDilatedPoint
	| GeoReflectedOverLine
	| GeoPointOnCurve;
export type GeoLineLikeElement = GeoSegment | GeoLine | GeoRay;

export type GeoElement =
	| GeoFreePoint
	| GeoMidpoint
	| GeoIntersectionLL
	| GeoReflectedPoint
	| GeoRotatedPoint
	| GeoTranslatedPoint
	| GeoDilatedPoint
	| GeoReflectedOverLine
	| GeoAngleMark
	| GeoSegmentMark
	| GeoMeasure
	| GeoSegment
	| GeoLine
	| GeoRay
	| GeoCircleByRadius
	| GeoCircleByPoint
	| GeoArcByAngles
	| GeoArcByPoints
	| GeoPolygon
	| GeoFunction
	| GeoQuadraticCurve
	| GeoPointOnCurve
	| GeoTangentLine;

export type GeoElementType = GeoElement['type'];

// =============================================================================
// Type guards
// =============================================================================

export function isFreePoint(el: GeoElement): el is GeoFreePoint {
	return el.type === 'freePoint';
}

export function isMidpoint(el: GeoElement): el is GeoMidpoint {
	return el.type === 'midpoint';
}

export function isIntersectionLL(el: GeoElement): el is GeoIntersectionLL {
	return el.type === 'intersectionLL';
}

export function isReflectedPoint(el: GeoElement): el is GeoReflectedPoint {
	return el.type === 'reflectedPoint';
}

export function isRotatedPoint(el: GeoElement): el is GeoRotatedPoint {
	return el.type === 'rotatedPoint';
}

export function isTranslatedPoint(el: GeoElement): el is GeoTranslatedPoint {
	return el.type === 'translatedPoint';
}

export function isDilatedPoint(el: GeoElement): el is GeoDilatedPoint {
	return el.type === 'dilatedPoint';
}

export function isReflectedOverLine(el: GeoElement): el is GeoReflectedOverLine {
	return el.type === 'reflectedOverLine';
}

export function isPointOnCurve(el: GeoElement): el is GeoPointOnCurve {
	return el.type === 'pointOnCurve';
}

export function isPointElement(el: GeoElement): el is GeoPointElement {
	return (
		el.type === 'freePoint' ||
		el.type === 'midpoint' ||
		el.type === 'intersectionLL' ||
		el.type === 'reflectedPoint' ||
		el.type === 'rotatedPoint' ||
		el.type === 'translatedPoint' ||
		el.type === 'dilatedPoint' ||
		el.type === 'reflectedOverLine' ||
		el.type === 'pointOnCurve'
	);
}

export function isAngleMark(el: GeoElement): el is GeoAngleMark {
	return el.type === 'angleMark';
}

export function isSegmentMark(el: GeoElement): el is GeoSegmentMark {
	return el.type === 'segmentMark';
}

export function isMeasure(el: GeoElement): el is GeoMeasure {
	return el.type === 'measure';
}

export function isSegment(el: GeoElement): el is GeoSegment {
	return el.type === 'segment';
}

export function isLine(el: GeoElement): el is GeoLine {
	return el.type === 'line';
}

export function isRay(el: GeoElement): el is GeoRay {
	return el.type === 'ray';
}

export function isLineLike(el: GeoElement): el is GeoLineLikeElement {
	return el.type === 'segment' || el.type === 'line' || el.type === 'ray';
}

export function isCircle(el: GeoElement): el is GeoCircle {
	return el.type === 'circleByRadius' || el.type === 'circleByPoint';
}

export function isCircleByRadius(el: GeoElement): el is GeoCircleByRadius {
	return el.type === 'circleByRadius';
}

export function isCircleByPoint(el: GeoElement): el is GeoCircleByPoint {
	return el.type === 'circleByPoint';
}

export function isPolygon(el: GeoElement): el is GeoPolygon {
	return el.type === 'polygon';
}

export function isArc(el: GeoElement): el is GeoArc {
	return el.type === 'arcByAngles' || el.type === 'arcByPoints';
}

export function isArcByAngles(el: GeoElement): el is GeoArcByAngles {
	return el.type === 'arcByAngles';
}

export function isArcByPoints(el: GeoElement): el is GeoArcByPoints {
	return el.type === 'arcByPoints';
}

export function isQuadraticCurve(el: GeoElement): el is GeoQuadraticCurve {
	return el.type === 'quadraticCurve';
}

export function isFunction(el: GeoElement): el is GeoFunction {
	return el.type === 'function';
}

export function isTangentLine(el: GeoElement): el is GeoTangentLine {
	return el.type === 'tangentLine';
}
