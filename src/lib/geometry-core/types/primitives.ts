/**
 * Geometric primitives - low-level types for geometry-core.
 */

import type { GeoValue } from './geo-value';

/** Branded type for angles in radians. Cannot be accidentally mixed with plain numbers. */
export type Radians = number & { readonly __brand: 'Radians' };

/** Convert degrees to radians. */
export function radians(degrees: number): Radians {
	return ((degrees * Math.PI) / 180) as Radians;
}

/** Convert radians to degrees. */
export function radiansToDegrees(rad: Radians): number {
	return (rad * 180) / Math.PI;
}

/** 2D vector/point, generic over coordinate type. */
export interface Vec2<T = number> {
	readonly x: T;
	readonly y: T;
}

/** A 2D point with exact or numeric coordinates. */
export type GeoPoint = Vec2<GeoValue>;

/** A 2D point with numeric coordinates (for SVG rendering). */
export type NumericPoint = Vec2<number>;

/** Axis-aligned bounding box in numeric coordinates (for rendering / hit-testing). */
export interface Box {
	readonly xMin: number;
	readonly xMax: number;
	readonly yMin: number;
	readonly yMax: number;
}
