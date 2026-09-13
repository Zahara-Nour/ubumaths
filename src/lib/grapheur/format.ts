/**
 * Grapheur Formatting — the decimal form of a value shown on the graph
 *
 * Shared by the hover label and the labels a click leaves behind, so the same
 * number never appears two different ways.
 *
 * @module grapheur/format
 */

/** Significant digits kept for an ordinary value. */
const SIGNIFICANT_DIGITS = 4;

/** Below this, a non-zero value switches to scientific notation. */
const SMALL_VALUE = 0.0001;

/** From this, a value switches to scientific notation. */
const LARGE_VALUE = 10000;

/**
 * Format a value for display on the graph.
 *
 * @param value - The number to write
 *
 * @example
 * ```typescript
 * formatGraphValue(0.375);   // '0.375'
 * formatGraphValue(1 / 3);   // '0.3333'
 * formatGraphValue(0.00001); // '1.00e-5'
 * ```
 */
export function formatGraphValue(value: number): string {
	// A tiny value must not read as zero on a graph.
	if (Math.abs(value) < SMALL_VALUE && value !== 0) return value.toExponential(2);
	if (Math.abs(value) >= LARGE_VALUE) return value.toExponential(2);
	if (Math.abs(value) < SMALL_VALUE) return '0';

	return parseFloat(value.toPrecision(SIGNIFICANT_DIGITS)).toString();
}
