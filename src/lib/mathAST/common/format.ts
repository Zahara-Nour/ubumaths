/**
 * Shared Formatting Utilities
 *
 * Common functions for formatting numbers and mathematical expressions.
 *
 * @module mathAST/common/format
 */

import { EQUALITY_TOLERANCE } from './constants';

/**
 * Format a number for display, cleaning up floating-point artifacts.
 *
 * - Rounds values very close to integers
 * - Removes trailing zeros from decimal representation
 *
 * @param value - The number to format
 * @returns Clean string representation
 *
 * @example
 * formatNumber(3.0000000001) // "3"
 * formatNumber(2.5) // "2.5"
 * formatNumber(0.123456789012345) // "0.123456789"
 */
export function formatNumber(value: number): string {
	if (Math.abs(value - Math.round(value)) < EQUALITY_TOLERANCE) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Alias for formatNumber for backward compatibility.
 * @deprecated Use formatNumber instead
 */
export const cleanNumber = formatNumber;
