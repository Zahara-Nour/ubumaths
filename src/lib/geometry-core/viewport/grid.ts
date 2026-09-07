/**
 * Adaptive grid step computation.
 *
 * Picks a major step from the 1-2-5 sequence so that grid lines land at a
 * comfortable distance on screen. The criterion is expressed in **pixels**, not
 * in a number of lines: it is the only one that still means something when the
 * two axes carry different scales, which the grapheur allows.
 */

export interface GridStep {
	/** Major grid line spacing in math units */
	readonly major: number;
	/** Minor (sub-grid) spacing in math units, itself a 1-2-5 value */
	readonly minor: number;
}

export interface GridStepOptions {
	/** Preferred distance between two major lines, in pixels. */
	readonly targetPx?: number;
	/** Distance never to go below, in pixels. Defaults to half the target. */
	readonly minPx?: number;
}

/** Multipliers of the 1-2-5 sequence, plus 10 to reach the next decade. */
const MULTIPLIERS = [1, 2, 5, 10] as const;

const DEFAULT_TARGET_PX = 80;

/** The widest spacing accepted, relative to the target. */
const MAX_TARGET_RATIO = 2.5;

const EMPTY_STEP: GridStep = { major: 0, minor: 0 };

/**
 * How many parts a major step is cut into, so that the minor step is itself a
 * 1-2-5 value.
 *
 * A major step of 2 cut in 5 would give 0.4 — a sub-step nobody counts squares
 * on. Cut in 4 it gives 0.5. Every other multiplier divides cleanly by 5.
 */
function minorDivisions(multiplier: number): number {
	return multiplier === 2 ? 4 : 5;
}

/**
 * Compute the grid step for one axis.
 *
 * @param pixelsPerUnit - Scale of the axis; the two axes may differ
 * @param options - Preferred and minimum spacing, in pixels
 * @returns Major and minor step in math units, both zero if the scale is unusable
 *
 * @example
 * ```typescript
 * computeGridStep(40);                 // { major: 2, minor: 0.5 }
 * computeGridStep(20, { minPx: 50 });  // never closer than 50 px
 * ```
 */
export function computeGridStep(pixelsPerUnit: number, options: GridStepOptions = {}): GridStep {
	if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return EMPTY_STEP;

	const targetPx = options.targetPx ?? DEFAULT_TARGET_PX;
	const minPx = options.minPx ?? targetPx / 2;
	const maxPx = targetPx * MAX_TARGET_RATIO;

	const idealStep = targetPx / pixelsPerUnit;
	if (!Number.isFinite(idealStep) || idealStep <= 0) return EMPTY_STEP;

	// Power of ten below the ideal step, so that the multipliers sweep the decade.
	const pow10 = Math.pow(10, Math.floor(Math.log10(idealStep)));
	if (!Number.isFinite(pow10) || pow10 <= 0) return EMPTY_STEP;

	let best: number | null = null;
	let bestDistance = Infinity;
	/** Fallback: the tightest step that still honours the minimum. */
	let smallestAboveMin: number | null = null;

	for (const multiplier of MULTIPLIERS) {
		const step = multiplier * pow10;
		const spacingPx = step * pixelsPerUnit;

		if (spacingPx < minPx) continue;
		if (smallestAboveMin === null) smallestAboveMin = step;

		if (spacingPx > maxPx) continue;

		const distance = Math.abs(spacingPx - targetPx);
		if (distance < bestDistance) {
			best = step;
			bestDistance = distance;
		}
	}

	// The minimum outranks the target: better a grid too airy than one too tight.
	const major = best ?? smallestAboveMin ?? MULTIPLIERS[MULTIPLIERS.length - 1] * pow10;
	if (!Number.isFinite(major) || major <= 0) return EMPTY_STEP;

	return { major, minor: major / minorDivisions(Math.round(major / pow10)) };
}
