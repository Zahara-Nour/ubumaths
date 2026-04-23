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

// =============================================================================
// Common properties
// =============================================================================

export interface GeoElementBase {
	readonly id: string;
	readonly label?: string;
	readonly color: string;
	readonly visible: boolean;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Point types
// =============================================================================

export interface GeoFreePoint extends GeoElementBase {
	readonly type: 'freePoint';
	readonly position: GeoPoint;
	readonly dependsOn: readonly [];
}

export interface GeoMidpoint extends GeoElementBase {
	readonly type: 'midpoint';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly dependsOn: readonly [string, string];
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

export interface GeoLine extends GeoElementBase {
	readonly type: 'line';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly dependsOn: readonly [string, string];
}

export interface GeoRay extends GeoElementBase {
	readonly type: 'ray';
	readonly originId: string;
	readonly throughId: string;
	readonly dependsOn: readonly [string, string];
}

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

// =============================================================================
// Union type
// =============================================================================

export type GeoPointElement = GeoFreePoint | GeoMidpoint;
export type GeoLineLikeElement = GeoSegment | GeoLine | GeoRay;

export type GeoElement =
	| GeoFreePoint
	| GeoMidpoint
	| GeoSegment
	| GeoLine
	| GeoRay
	| GeoCircleByRadius
	| GeoCircleByPoint
	| GeoPolygon;

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

export function isPointElement(el: GeoElement): el is GeoPointElement {
	return el.type === 'freePoint' || el.type === 'midpoint';
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
