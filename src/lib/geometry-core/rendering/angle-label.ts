/**
 * Shared helpers for GeoAngle label formatting and positioning.
 *
 * Used by the 4 rendering surfaces (canvas, SVG export, TikZ export, Typst export)
 * and the rough variant to keep label semantics consistent. Avoids the
 * `extendLineToViewport` triplication trap (one helper, four call sites).
 *
 * @module geometry-core/rendering/angle-label
 */

import type { GeoAngle } from '../types/elements';

/**
 * Build the visible label string for a GeoAngle based on its `showLabel` mode
 * and `unite`.
 *
 * Returns `null` when no label should be rendered:
 * - `showLabel === 'aucun'` or missing.
 * - `measureRadians === null` and the mode requires the measure.
 * - The angle has no name and the mode requires it.
 *
 * Format:
 * - `'nom'`        → `el.label ?? null`
 * - `'mesure'`     → `"60°"` (deg) or `"1.05 rad"` (rad, 2 decimals).
 * - `'mesure+nom'` → `"α = 60°"` (joins with `=`), or just the measure
 *                    when no label is set, or just the name when measure is null.
 */
export function formatAngleLabel(angle: GeoAngle, measureRadians: number | null): string | null {
	const mode = angle.showLabel ?? 'aucun';
	if (mode === 'aucun') return null;

	const name = angle.label ?? null;
	const measure = formatMeasure(measureRadians, angle.unite ?? 'rad');

	if (mode === 'nom') return name;
	if (mode === 'mesure') return measure;
	// 'mesure+nom'
	if (name && measure) return `${name} = ${measure}`;
	return name ?? measure;
}

/** Format a radian measure to a human string in the requested unit. */
function formatMeasure(measureRadians: number | null, unite: 'rad' | 'deg'): string | null {
	if (measureRadians === null || !Number.isFinite(measureRadians)) return null;
	if (unite === 'deg') {
		const deg = (measureRadians * 180) / Math.PI;
		// Round to 1 decimal, drop the decimal if integer.
		const rounded = Math.round(deg * 10) / 10;
		const text = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
		return `${text}°`;
	}
	// rad: 2 decimals
	const r = Math.round(measureRadians * 100) / 100;
	return `${r} rad`;
}

/**
 * Compute the unsigned interior angle in radians between two rays emanating
 * from a common vertex, given the direction vectors `(d1x, d1y)` and
 * `(d2x, d2y)` in any consistent coordinate system. Returns a value in
 * `[0, π]`. Returns `null` if either ray is degenerate.
 *
 * This is the value used by `formatAngleLabel` (degree mode multiplies by
 * 180/π). It does NOT account for `kind='rentrant'` — callers wrap that
 * themselves (e.g. `kind === 'rentrant' ? 2 * Math.PI - alpha : alpha`).
 */
export function unsignedAngleBetween(
	d1x: number,
	d1y: number,
	d2x: number,
	d2y: number
): number | null {
	const len1 = Math.hypot(d1x, d1y);
	const len2 = Math.hypot(d2x, d2y);
	if (len1 < 1e-10 || len2 < 1e-10) return null;
	const cos = (d1x * d2x + d1y * d2y) / (len1 * len2);
	const clamped = Math.max(-1, Math.min(1, cos));
	return Math.acos(clamped);
}
