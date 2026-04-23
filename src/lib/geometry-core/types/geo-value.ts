/**
 * GeoValue - The fundamental value type for geometry-core.
 *
 * Represents a geometric value that is either:
 * - exact: a symbolic MathNode (e.g., sqrt(2), 3/4, pi)
 * - numeric: a JavaScript float (e.g., from drag coordinates or transcendentals)
 *
 * Exact + exact operations produce exact results.
 * Any operation involving a numeric value produces a numeric result.
 */

import type { MathNode } from '$lib/mathAST/types';

export interface GeoExact {
	readonly kind: 'exact';
	readonly node: MathNode;
}

export interface GeoNumeric {
	readonly kind: 'numeric';
	readonly value: number;
}

export type GeoValue = GeoExact | GeoNumeric;

/** Create an exact GeoValue from a MathNode. */
export function exact(node: MathNode): GeoExact {
	return { kind: 'exact', node };
}

/** Create a numeric GeoValue from a finite JavaScript number. NaN and Infinity are rejected. */
export function numeric(value: number): GeoNumeric {
	if (!Number.isFinite(value)) {
		throw new Error('GeoNumeric: only finite numbers are valid coordinate values');
	}
	return { kind: 'numeric', value };
}

/** Type guard: is this value exact (symbolic MathNode)? */
export function isExact(v: GeoValue): v is GeoExact {
	return v.kind === 'exact';
}

/** Type guard: is this value numeric (float)? */
export function isNumeric(v: GeoValue): v is GeoNumeric {
	return v.kind === 'numeric';
}
