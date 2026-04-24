/**
 * Adaptive grid step computation.
 *
 * Picks a major step from the 1-2-5 sequence so that grid lines are
 * visually spaced between ~40px and ~200px at the current zoom level.
 */

export interface GridStep {
	/** Major grid line spacing in math units */
	readonly major: number;
	/** Minor (sub-grid) spacing in math units (major / 5) */
	readonly minor: number;
}

/**
 * Compute grid step for a given zoom level.
 *
 * @param pixelsPerUnit - current zoom (pixels per math unit)
 * @returns major and minor grid step in math units
 */
export function computeGridStep(pixelsPerUnit: number): GridStep {
	// We want: 40 <= major * pixelsPerUnit <= 200
	// So: 40/ppu <= major <= 200/ppu
	// Target the geometric mean: ~89/ppu, then snap to nearest 1-2-5 value.

	const idealStep = 80 / pixelsPerUnit;

	// Find the power of 10 below idealStep
	const pow10 = Math.pow(10, Math.floor(Math.log10(idealStep)));

	// Candidate multipliers in 1-2-5 sequence
	const candidates = [1, 2, 5, 10];

	let best = candidates[0] * pow10;
	let bestDist = Infinity;

	for (const m of candidates) {
		const step = m * pow10;
		const spacingPx = step * pixelsPerUnit;
		// Must be in range [40, 200]
		if (spacingPx >= 40 && spacingPx <= 200) {
			const dist = Math.abs(spacingPx - 80);
			if (dist < bestDist) {
				best = step;
				bestDist = dist;
			}
		}
	}

	return { major: best, minor: best / 5 };
}
