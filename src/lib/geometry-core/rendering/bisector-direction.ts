/**
 * Shared helper for computing the bisector direction of an angle.
 *
 * Used by svg-primitives.ts, export-tikz.ts, and export-typst.ts to avoid
 * duplicating the same numerical formula in three rendering surfaces.
 */

/**
 * Compute the bisector direction (unit vector along the angle bisector).
 *
 * Given two direction vectors (d1x, d1y) and (d2x, d2y) emanating from a
 * common vertex, returns the bisector direction normalized. The `kind`
 * parameter selects between the interior bisector ('saillant', default) and
 * the exterior bisector ('rentrant', opposite direction).
 *
 * Edge cases:
 * - If d1 and d2 are anti-parallel (angle ≈ π), falls back to the
 *   perpendicular of d1 to avoid an indeterminate (0,0) bisector.
 * - Returns null if either direction is degenerate (zero length).
 *
 * The caller is responsible for normalizing d1 and d2 before passing them
 * (i.e. passing unit vectors u1 and u2).
 */
export function computeBisectorDirection(
	d1x: number,
	d1y: number,
	d2x: number,
	d2y: number,
	kind: 'saillant' | 'rentrant' = 'saillant'
): { bisX: number; bisY: number; blen: number } | null {
	// Validate that inputs are non-degenerate unit vectors (caller normalized).
	const len1 = Math.hypot(d1x, d1y);
	const len2 = Math.hypot(d2x, d2y);
	if (len1 < 1e-10 || len2 < 1e-10) return null;

	let bisX = d1x + d2x;
	let bisY = d1y + d2y;
	const bisLen = Math.hypot(bisX, bisY);

	if (bisLen < 1e-6) {
		// Sides anti-parallel (flat angle). Use the perpendicular to side 1
		// so the label still has a stable position.
		bisX = -d1y;
		bisY = d1x;
	} else {
		bisX /= bisLen;
		bisY /= bisLen;
	}

	if (kind === 'rentrant') {
		bisX = -bisX;
		bisY = -bisY;
	}

	return { bisX, bisY, blen: bisLen };
}
