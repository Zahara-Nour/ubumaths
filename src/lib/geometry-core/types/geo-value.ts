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
import { number as mathNumber } from '$lib/mathAST/factory';

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

/** Convert a GeoValue to a MathNode. Exact values return their node; numeric values are wrapped. */
export function geoValueToMathNode(v: GeoValue): MathNode {
	return v.kind === 'exact' ? v.node : mathNumber(v.value.toString());
}

// =============================================================================
// ScalarParam — parameter that can be a fixed GeoValue OR a reference to a scalar
// =============================================================================

/** Reference to a scalar or slider element whose value is resolved at compute time. */
export interface ScalarRef {
	readonly scalarRef: string;
}

/**
 * Sentinel parameter representing positive or negative mathematical infinity.
 * Used exclusively by improper-integral bounds (V5). Resolves to ±Infinity through
 * `resolveScalarParam`. `GeoNumeric` is intentionally finite-only (coordinate invariant).
 */
export interface InfinityParam {
	readonly infinity: '+' | '-';
}

/**
 * A parameter that can be a fixed GeoValue, a reference to a scalar/slider element,
 * or a sentinel infinity (V5 improper integrals).
 */
export type ScalarParam = GeoValue | ScalarRef | InfinityParam;

/** Type guard: is this parameter a reference to a scalar element? */
export function isScalarRef(param: ScalarParam): param is ScalarRef {
	return typeof param === 'object' && 'scalarRef' in param;
}

/** Type guard: is this parameter the sentinel `InfinityParam` (V5 improper bounds)? */
export function isInfinityParam(param: ScalarParam): param is InfinityParam {
	return typeof param === 'object' && 'infinity' in param;
}
