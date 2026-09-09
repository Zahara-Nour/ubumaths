/**
 * Mapping between a slider's integer position and the value it drives.
 *
 * bits-ui validates a slider's value against a precomputed list of allowed
 * values, compared with `===`. That list is built by rounding `min + i·step`
 * to the decimal places of `step`. With a step derived from a viewport — an
 * arbitrary float once the window has been zoomed — no value ever matches, so
 * the component rewrites the value on every change and the thumb springs back.
 *
 * Driving the slider with integers removes the problem at its source: whole
 * numbers compare exactly, the list always contains the value, and nothing is
 * rewritten. The real value is computed from the index on our side.
 *
 * @module grapheur/slider
 */

/** Positions offered between the two bounds. */
export const SLIDER_STEPS = 400;

/**
 * Position of a value on the slider.
 *
 * @param value - Value to place
 * @param min - Lower bound
 * @param max - Upper bound
 * @param steps - Positions between the bounds
 * @returns An integer in `[0 ; steps]`, clamped
 */
export function toSliderIndex(
	value: number,
	min: number,
	max: number,
	steps: number = SLIDER_STEPS
): number {
	const span = max - min;
	if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(value)) return 0;

	return Math.min(Math.max(Math.round(((value - min) / span) * steps), 0), steps);
}

/**
 * Value at a slider position.
 *
 * @param index - Integer position, as handed over by the slider
 * @param min - Lower bound
 * @param max - Upper bound
 * @param steps - Positions between the bounds
 * @returns The value, rounded to a readable number of decimals
 */
export function fromSliderIndex(
	index: number,
	min: number,
	max: number,
	steps: number = SLIDER_STEPS
): number {
	const span = max - min;
	if (!Number.isFinite(span) || span <= 0) return min;

	const raw = min + (index / steps) * span;

	// Trois décimales de plus que ce que le pas distingue : la valeur reste
	// lisible sans que deux positions voisines se confondent.
	const decimals = Math.max(0, Math.ceil(-Math.log10(span / steps)) + 3);
	const factor = Math.pow(10, Math.min(decimals, 12));
	return Math.round(raw * factor) / factor;
}
