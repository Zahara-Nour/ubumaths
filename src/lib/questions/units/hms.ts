/**
 * Unit System - HMS (Hours-Minutes-Seconds) Support
 * ===================================================
 *
 * Functions for parsing, formatting, converting, and operating on
 * time values in HMS (Hours-Minutes-Seconds) format.
 *
 * Supports various input formats:
 * - "2h30min", "1h 45min 30s"
 * - "3:25:10" (colon notation)
 * - "45min", "90s"
 * - LaTeX: "\\hms{2h30min}"
 *
 * @module questions/units/hms
 */

import type { HMSValue } from './types';

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse HMS string to HMSValue
 *
 * Supports various formats:
 * - "2h30min", "2h 30 min", "2h30"
 * - "45min", "45 min"
 * - "90s", "90 sec"
 * - "1h 45min 30s"
 * - "3:25" (hours:minutes)
 * - "3:25:10" (hours:minutes:seconds)
 * - "00:45:30" (with leading zeros)
 *
 * @param input - String representation of HMS value
 * @returns Parsed HMSValue or null if invalid format
 *
 * @example Unit notation
 * parseHMS('2h30min') // { hours: 2, minutes: 30, seconds: 0 }
 * parseHMS('1h 45min 30s') // { hours: 1, minutes: 45, seconds: 30 }
 * parseHMS('45min') // { hours: 0, minutes: 45, seconds: 0 }
 * parseHMS('90s') // { hours: 0, minutes: 0, seconds: 90 }
 *
 * @example Colon notation
 * parseHMS('3:25') // { hours: 3, minutes: 25, seconds: 0 }
 * parseHMS('3:25:10') // { hours: 3, minutes: 25, seconds: 10 }
 * parseHMS('00:45:30') // { hours: 0, minutes: 45, seconds: 30 }
 */
export function parseHMS(input: string): HMSValue | null {
	if (!input || typeof input !== 'string') {
		return null;
	}

	const trimmed = input.trim();

	// Try colon notation first (hours:minutes or hours:minutes:seconds)
	const colonResult = parseColonFormat(trimmed);
	if (colonResult) {
		return colonResult;
	}

	// Try unit notation (2h30min, 45min, etc.)
	const unitResult = parseUnitFormat(trimmed);
	if (unitResult) {
		return unitResult;
	}

	return null;
}

/**
 * Parse colon-separated time format (HH:MM or HH:MM:SS)
 *
 * @param input - String in colon format
 * @returns HMSValue or null
 *
 * @example
 * parseColonFormat('3:25') // { hours: 3, minutes: 25, seconds: 0 }
 * parseColonFormat('3:25:10') // { hours: 3, minutes: 25, seconds: 10 }
 */
function parseColonFormat(input: string): HMSValue | null {
	// Match HH:MM or HH:MM:SS (with optional leading zeros)
	const colonRegex = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?$/;
	const match = input.match(colonRegex);

	if (!match) {
		return null;
	}

	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const seconds = match[3] ? parseInt(match[3], 10) : 0;
	const milliseconds = match[4]
		? parseInt(match[4].length > 3 ? match[4].substring(0, 3) : match[4].padEnd(3, '0'), 10)
		: undefined;

	if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
		return null;
	}

	// Validate ranges (minutes and seconds must be 0-59)
	if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
		return null;
	}

	const result: HMSValue = {
		hours,
		minutes,
		seconds
	};

	if (milliseconds !== undefined) {
		result.milliseconds = milliseconds;
	}

	return result;
}

/**
 * Parse unit-based time format (2h30min, 45min, 90s, etc.)
 *
 * @param input - String with unit notation
 * @returns HMSValue or null
 *
 * @example
 * parseUnitFormat('2h30min') // { hours: 2, minutes: 30, seconds: 0 }
 * parseUnitFormat('45min') // { hours: 0, minutes: 45, seconds: 0 }
 */
function parseUnitFormat(input: string): HMSValue | null {
	let hours = 0;
	let minutes = 0;
	let seconds = 0;
	let milliseconds: number | undefined;

	// Normalize spaces around units
	let normalized = input.replace(/\s+/g, ' ');

	// Patterns for each component (with optional spaces)
	const hoursRegex = /(\d+(?:\.\d+)?)\s*h(?:eure)?s?/i;
	const minutesRegex = /(\d+(?:\.\d+)?)\s*(?:min|minute)s?/i;
	const secondsRegex = /(\d+(?:\.\d+)?)\s*(?:s|sec|seconde)s?(?!-)/i; // Negative lookahead to avoid matching 'ms'
	const millisecondsRegex = /(\d+)\s*ms/i;

	// Extract hours
	const hoursMatch = normalized.match(hoursRegex);
	if (hoursMatch) {
		hours = parseFloat(hoursMatch[1]);
		if (isNaN(hours)) {
			return null;
		}
		// Remove matched part
		normalized = normalized.replace(hoursRegex, '');
	}

	// Extract milliseconds (before seconds to avoid conflict)
	const msMatch = normalized.match(millisecondsRegex);
	if (msMatch) {
		milliseconds = parseInt(msMatch[1], 10);
		if (isNaN(milliseconds)) {
			return null;
		}
		// Remove matched part
		normalized = normalized.replace(millisecondsRegex, '');
	}

	// Extract minutes
	const minutesMatch = normalized.match(minutesRegex);
	if (minutesMatch) {
		minutes = parseFloat(minutesMatch[1]);
		if (isNaN(minutes)) {
			return null;
		}
		// Remove matched part
		normalized = normalized.replace(minutesRegex, '');
	}

	// Extract seconds
	const secondsMatch = normalized.match(secondsRegex);
	if (secondsMatch) {
		seconds = parseFloat(secondsMatch[1]);
		if (isNaN(seconds)) {
			return null;
		}
		// Remove matched part
		normalized = normalized.replace(secondsRegex, '');
	}

	// Check if we matched anything
	if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === undefined) {
		return null;
	}

	const result: HMSValue = {
		hours,
		minutes,
		seconds
	};

	if (milliseconds !== undefined) {
		result.milliseconds = milliseconds;
	}

	return result;
}

/**
 * Pattern for extracting HMS from \hms{} wrapper
 *
 * This is the ONLY supported format for HMS in LaTeX input.
 *
 * @example
 * \hms{2h30min} → '2h30min'
 * \hms{1h 45min 30s} → '1h 45min 30s'
 */
const HMS_PATTERN = /\\hms\{([^}]+)\}/;

/**
 * Parse LaTeX HMS expression
 *
 * Supports:
 * - "\\hms{2h30min}"
 * - "\\hms{1h 45min 30s}"
 * - "\\hms{3h}"
 * - "\\hms{45min}"
 *
 * @param latex - LaTeX string containing \hms{} notation
 * @returns Parsed HMSValue or null
 *
 * @example
 * parseLatexHMS('\\hms{2h30min}') // { hours: 2, minutes: 30, seconds: 0 }
 * parseLatexHMS('\\hms{1h 45min 30s}') // { hours: 1, minutes: 45, seconds: 30 }
 */
export function parseLatexHMS(latex: string): HMSValue | null {
	if (!latex || typeof latex !== 'string') {
		return null;
	}

	// Extract content from \hms{} wrapper
	const match = latex.match(HMS_PATTERN);
	if (!match) {
		return null;
	}

	const content = match[1].trim();

	// Now try to parse as regular HMS
	return parseHMS(content);
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format HMSValue to string
 *
 * @param value - HMSValue to format
 * @param format - Output format style
 *   - 'units': "2h 30min" (default, with spaces)
 *   - 'colon': "2:30:00" (HH:MM:SS)
 *   - 'short': "2h30" (no spaces, omit zero seconds)
 * @returns Formatted string
 *
 * @example
 * const hms = { hours: 2, minutes: 30, seconds: 45 };
 * formatHMS(hms, 'units') // "2h 30min 45s"
 * formatHMS(hms, 'colon') // "2:30:45"
 * formatHMS(hms, 'short') // "2h30min45s"
 *
 * @example Zero values
 * formatHMS({ hours: 0, minutes: 45, seconds: 0 }, 'units') // "45min"
 * formatHMS({ hours: 0, minutes: 45, seconds: 0 }, 'colon') // "0:45:00"
 */
export function formatHMS(value: HMSValue, format: 'units' | 'colon' | 'short' = 'units'): string {
	const h = value.hours ?? 0;
	const m = value.minutes ?? 0;
	const s = value.seconds ?? 0;
	const ms = value.milliseconds;

	if (format === 'colon') {
		// Colon format: HH:MM:SS or HH:MM:SS.mmm
		const hours = Math.floor(h).toString().padStart(2, '0');
		const minutes = Math.floor(m).toString().padStart(2, '0');
		const seconds = Math.floor(s).toString().padStart(2, '0');

		let result = `${hours}:${minutes}:${seconds}`;

		if (ms !== undefined && ms > 0) {
			const milliseconds = Math.floor(ms).toString().padStart(3, '0');
			result += `.${milliseconds}`;
		}

		return result;
	}

	// Units format or short format
	const parts: string[] = [];
	const separator = format === 'short' ? '' : ' ';

	if (h !== 0) {
		parts.push(`${h}h`);
	}

	if (m !== 0) {
		parts.push(`${m}min`);
	}

	if (s !== 0) {
		parts.push(`${s}s`);
	}

	if (ms !== undefined && ms > 0) {
		parts.push(`${ms}ms`);
	}

	// If all values are zero, return "0s"
	if (parts.length === 0) {
		return '0s';
	}

	return parts.join(separator);
}

/**
 * Format HMSValue to LaTeX
 *
 * @param value - HMSValue to format
 * @returns LaTeX string using \hms{} wrapper
 *
 * @example
 * formatHMSLatex({ hours: 2, minutes: 30, seconds: 0 })
 * // "\\hms{2h30min}"
 *
 * formatHMSLatex({ hours: 0, minutes: 45, seconds: 30 })
 * // "\\hms{45min30s}"
 */
export function formatHMSLatex(value: HMSValue): string {
	const h = value.hours ?? 0;
	const m = value.minutes ?? 0;
	const s = value.seconds ?? 0;
	const ms = value.milliseconds;

	const parts: string[] = [];

	if (h !== 0) {
		parts.push(`${h}h`);
	}

	if (m !== 0) {
		parts.push(`${m}min`);
	}

	if (s !== 0) {
		parts.push(`${s}s`);
	}

	if (ms !== undefined && ms > 0) {
		parts.push(`${ms}ms`);
	}

	// If all values are zero, return "\hms{0s}"
	if (parts.length === 0) {
		return '\\hms{0s}';
	}

	return `\\hms{${parts.join('')}}`;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert HMSValue to total seconds
 *
 * @param value - HMSValue to convert
 * @returns Total number of seconds (including fractional seconds from milliseconds)
 *
 * @example
 * hmsToSeconds({ hours: 1, minutes: 30, seconds: 45 }) // 5445
 * hmsToSeconds({ hours: 0, minutes: 2, seconds: 30 }) // 150
 * hmsToSeconds({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 }) // 45.5
 */
export function hmsToSeconds(value: HMSValue): number {
	const h = value.hours ?? 0;
	const m = value.minutes ?? 0;
	const s = value.seconds ?? 0;
	const ms = value.milliseconds ?? 0;

	return h * 3600 + m * 60 + s + ms / 1000;
}

/**
 * Convert total seconds to HMSValue
 *
 * @param totalSeconds - Total number of seconds (can be fractional)
 * @returns Normalized HMSValue
 *
 * @example
 * secondsToHMS(5445) // { hours: 1, minutes: 30, seconds: 45 }
 * secondsToHMS(150) // { hours: 0, minutes: 2, seconds: 30 }
 * secondsToHMS(45.5) // { hours: 0, minutes: 0, seconds: 45, milliseconds: 500 }
 */
export function secondsToHMS(totalSeconds: number): HMSValue {
	if (totalSeconds < 0) {
		// For negative durations, negate all components for consistent round-trip
		const positive = secondsToHMS(-totalSeconds);
		return {
			hours: positive.hours > 0 ? -positive.hours : 0,
			minutes: positive.minutes > 0 ? -positive.minutes : 0,
			seconds: positive.seconds !== undefined && positive.seconds > 0 ? -positive.seconds : 0,
			milliseconds:
				positive.milliseconds !== undefined && positive.milliseconds > 0
					? -positive.milliseconds
					: undefined
		};
	}

	const hours = Math.floor(totalSeconds / 3600);
	const remainder = totalSeconds % 3600;
	const minutes = Math.floor(remainder / 60);
	const secondsRemainder = remainder % 60;

	// Check if there's a fractional part (milliseconds)
	const hasMilliseconds = secondsRemainder % 1 !== 0;

	const result: HMSValue = {
		hours,
		minutes,
		seconds: Math.floor(secondsRemainder)
	};

	if (hasMilliseconds) {
		const fractionalPart = secondsRemainder - Math.floor(secondsRemainder);
		result.milliseconds = Math.round(fractionalPart * 1000);
	}

	return result;
}

/**
 * Convert total minutes to HMSValue
 *
 * @param totalMinutes - Total number of minutes (can be fractional)
 * @returns Normalized HMSValue
 *
 * @example
 * minutesToHMS(90) // { hours: 1, minutes: 30, seconds: 0 }
 * minutesToHMS(2.5) // { hours: 0, minutes: 2, seconds: 30 }
 */
export function minutesToHMS(totalMinutes: number): HMSValue {
	return secondsToHMS(totalMinutes * 60);
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize HMS (60s → 1min, 60min → 1h)
 *
 * Converts overflow values to the next higher unit:
 * - 60+ seconds → minutes
 * - 60+ minutes → hours
 * - 1000+ milliseconds → seconds
 *
 * @param value - HMSValue to normalize (possibly with overflow)
 * @returns Normalized HMSValue
 *
 * @example Overflow seconds
 * normalizeHMS({ hours: 0, minutes: 0, seconds: 90 })
 * // { hours: 0, minutes: 1, seconds: 30 }
 *
 * @example Overflow minutes
 * normalizeHMS({ hours: 1, minutes: 75, seconds: 0 })
 * // { hours: 2, minutes: 15, seconds: 0 }
 *
 * @example Multiple overflows
 * normalizeHMS({ hours: 0, minutes: 0, seconds: 3725 })
 * // { hours: 1, minutes: 2, seconds: 5 }
 *
 * @example Milliseconds overflow
 * normalizeHMS({ hours: 0, minutes: 0, seconds: 0, milliseconds: 1500 })
 * // { hours: 0, minutes: 0, seconds: 1, milliseconds: 500 }
 */
export function normalizeHMS(value: HMSValue): HMSValue {
	// Convert to total seconds and back for simplest normalization
	const totalSeconds = hmsToSeconds(value);
	return secondsToHMS(totalSeconds);
}

// ============================================================================
// COMPARISON
// ============================================================================

/**
 * Compare two HMS values
 *
 * @param a - First HMSValue
 * @param b - Second HMSValue
 * @returns Negative if a < b, 0 if equal, positive if a > b
 *
 * @example
 * compareHMS({ hours: 2, minutes: 30 }, { hours: 2, minutes: 30 }) // 0
 * compareHMS({ hours: 1, minutes: 30 }, { hours: 2, minutes: 0 }) // negative
 * compareHMS({ hours: 3, minutes: 0 }, { hours: 2, minutes: 30 }) // positive
 */
export function compareHMS(a: HMSValue, b: HMSValue): number {
	const aSeconds = hmsToSeconds(a);
	const bSeconds = hmsToSeconds(b);
	return aSeconds - bSeconds;
}

// ============================================================================
// ARITHMETIC
// ============================================================================

/**
 * Add two HMS values
 *
 * @param a - First HMSValue
 * @param b - Second HMSValue
 * @returns Sum as normalized HMSValue
 *
 * @example
 * addHMS({ hours: 1, minutes: 30 }, { hours: 0, minutes: 45 })
 * // { hours: 2, minutes: 15, seconds: 0 }
 *
 * @example With overflow
 * addHMS({ hours: 1, minutes: 50 }, { hours: 0, minutes: 20 })
 * // { hours: 2, minutes: 10, seconds: 0 }
 */
export function addHMS(a: HMSValue, b: HMSValue): HMSValue {
	const totalSeconds = hmsToSeconds(a) + hmsToSeconds(b);
	return secondsToHMS(totalSeconds);
}

/**
 * Subtract HMS values (a - b)
 *
 * @param a - First HMSValue (minuend)
 * @param b - Second HMSValue (subtrahend)
 * @returns Difference as normalized HMSValue (can be negative)
 *
 * @example
 * subtractHMS({ hours: 2, minutes: 30 }, { hours: 1, minutes: 15 })
 * // { hours: 1, minutes: 15, seconds: 0 }
 *
 * @example Negative result
 * subtractHMS({ hours: 1, minutes: 0 }, { hours: 1, minutes: 30 })
 * // { hours: -0, minutes: 30, seconds: 0 } (represented as negative hours)
 */
export function subtractHMS(a: HMSValue, b: HMSValue): HMSValue {
	const totalSeconds = hmsToSeconds(a) - hmsToSeconds(b);
	return secondsToHMS(totalSeconds);
}
