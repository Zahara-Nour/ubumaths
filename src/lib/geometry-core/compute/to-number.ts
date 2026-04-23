/**
 * GeoValue -> float conversion.
 *
 * This is the ONLY place where exact values lose precision.
 * Used for SVG rendering coordinates.
 */

import type { GeoValue } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import type { Point } from '../viewport/types';
import { evaluate } from '$lib/mathAST/eval';

/**
 * Convert a GeoValue to a JavaScript number.
 * For exact values, evaluates the MathNode in decimal mode.
 * For numeric values, returns the value directly.
 */
export function geoToNumber(v: GeoValue): number {
	if (v.kind === 'numeric') return v.value;

	const result = evaluate(v.node, { mode: 'decimal' });
	if (result.status === 'value' && typeof result.value === 'number') {
		return result.value;
	}
	// Fallback: try to extract number from the result node
	if (result.status === 'value' && result.node.type === 'number') {
		return parseFloat(result.node.value);
	}
	return NaN;
}

/**
 * Convert a GeoPoint (Vec2<GeoValue>) to a numeric Point for SVG rendering.
 */
export function vec2ToPoint(v: GeoPoint): Point {
	return {
		x: geoToNumber(v.x),
		y: geoToNumber(v.y)
	};
}
