/**
 * HMS (Hours-Minutes-Seconds) Unit Tests
 * =====================================
 *
 * Comprehensive test suite for HMS module functionality:
 *
 * Test Categories:
 * 1. parseHMS - Parse HMS strings (unit & colon notation)
 * 2. parseLatexHMS - Parse LaTeX HMS expressions
 * 3. formatHMS - Format HMSValue to various string formats
 * 4. formatHMSLatex - Format HMSValue to LaTeX
 * 5. hmsToSeconds / secondsToHMS - Conversion between formats
 * 6. minutesToHMS - Convert minutes to HMS
 * 7. normalizeHMS - Normalize overflow values
 * 8. compareHMS - Compare two HMS values
 * 9. addHMS - Add two HMS values
 * 10. subtractHMS - Subtract two HMS values
 */

import { describe, test, expect } from 'vitest';
import {
	parseHMS,
	parseLatexHMS,
	formatHMS,
	formatHMSLatex,
	hmsToSeconds,
	secondsToHMS,
	minutesToHMS,
	normalizeHMS,
	compareHMS,
	addHMS,
	subtractHMS
} from '../hms';
import type { HMSValue } from '../types';

// ============================================================================
// PARSING HMS STRINGS - UNIT NOTATION
// ============================================================================

describe('parseHMS - Unit notation', () => {
	test('parses simple hours notation "2h"', () => {
		const result = parseHMS('2h');
		expect(result).toEqual({ hours: 2, minutes: 0, seconds: 0 });
	});

	test('parses hours with minutes "2h30min"', () => {
		const result = parseHMS('2h30min');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses hours with spaces "2h 30min"', () => {
		const result = parseHMS('2h 30min');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses full HMS "1h 45min 30s"', () => {
		const result = parseHMS('1h 45min 30s');
		expect(result).toEqual({ hours: 1, minutes: 45, seconds: 30 });
	});

	test('parses minutes only "45min"', () => {
		const result = parseHMS('45min');
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 0 });
	});

	test('parses minutes with spaces "45 min"', () => {
		const result = parseHMS('45 min');
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 0 });
	});

	test('parses seconds only "90s"', () => {
		const result = parseHMS('90s');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 90 });
	});

	test('parses seconds with spaces "90 s"', () => {
		const result = parseHMS('90 s');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 90 });
	});

	test('parses alternative "sec" notation "90sec"', () => {
		const result = parseHMS('90sec');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 90 });
	});

	test('parses alternative "minute" notation "45minute"', () => {
		const result = parseHMS('45minute');
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 0 });
	});

	test('parses alternative "heure" notation "2heures"', () => {
		const result = parseHMS('2heures');
		expect(result).toEqual({ hours: 2, minutes: 0, seconds: 0 });
	});

	test('parses case-insensitive "2H30MIN"', () => {
		const result = parseHMS('2H30MIN');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses with milliseconds "45s 500ms"', () => {
		const result = parseHMS('45s 500ms');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 });
	});

	test('parses milliseconds in full HMS "1h 30min 45s 250ms"', () => {
		const result = parseHMS('1h 30min 45s 250ms');
		expect(result).toEqual({
			hours: 1,
			minutes: 30,
			seconds: 45,
			milliseconds: 250
		});
	});

	test('parses no-space format "2h30min45s"', () => {
		const result = parseHMS('2h30min45s');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 45 });
	});

	test('parses leading/trailing whitespace " 2h30min "', () => {
		const result = parseHMS(' 2h30min ');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses fractional hours "2.5h"', () => {
		const result = parseHMS('2.5h');
		expect(result).toEqual({ hours: 2.5, minutes: 0, seconds: 0 });
	});

	test('parses fractional minutes "90.5min"', () => {
		const result = parseHMS('90.5min');
		expect(result).toEqual({ hours: 0, minutes: 90.5, seconds: 0 });
	});

	test('returns null for empty string ""', () => {
		const result = parseHMS('');
		expect(result).toBeNull();
	});

	test('returns null for whitespace-only string "   "', () => {
		const result = parseHMS('   ');
		expect(result).toBeNull();
	});

	test('returns null for invalid format "invalid"', () => {
		const result = parseHMS('invalid');
		expect(result).toBeNull();
	});

	test('returns null for non-string input', () => {
		// @ts-expect-error - Testing runtime behavior with invalid input
		const result = parseHMS(null);
		expect(result).toBeNull();
	});

	test('returns null for undefined input', () => {
		// @ts-expect-error - Testing runtime behavior with invalid input
		const result = parseHMS(undefined);
		expect(result).toBeNull();
	});

	test('returns null for missing time value "h min"', () => {
		const result = parseHMS('h min');
		expect(result).toBeNull();
	});

	test('parses mixed unit combinations "2h 45s" (no minutes)', () => {
		const result = parseHMS('2h 45s');
		expect(result).toEqual({ hours: 2, minutes: 0, seconds: 45 });
	});
});

// ============================================================================
// PARSING HMS STRINGS - COLON NOTATION
// ============================================================================

describe('parseHMS - Colon notation', () => {
	test('parses HH:MM format "3:25"', () => {
		const result = parseHMS('3:25');
		expect(result).toEqual({ hours: 3, minutes: 25, seconds: 0 });
	});

	test('parses HH:MM:SS format "3:25:10"', () => {
		const result = parseHMS('3:25:10');
		expect(result).toEqual({ hours: 3, minutes: 25, seconds: 10 });
	});

	test('parses with leading zeros "00:45:30"', () => {
		const result = parseHMS('00:45:30');
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 30 });
	});

	test('parses "0:0:0"', () => {
		const result = parseHMS('0:0:0');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
	});

	test('parses milliseconds with colon notation "1:30:45.500"', () => {
		const result = parseHMS('1:30:45.500');
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45, milliseconds: 500 });
	});

	test('parses single-digit milliseconds "1:30:45.5" as 500ms', () => {
		const result = parseHMS('1:30:45.5');
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45, milliseconds: 500 });
	});

	test('parses two-digit milliseconds "1:30:45.50" as 500ms', () => {
		const result = parseHMS('1:30:45.50');
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45, milliseconds: 500 });
	});

	test('parses large numbers "10:59:59"', () => {
		const result = parseHMS('10:59:59');
		expect(result).toEqual({ hours: 10, minutes: 59, seconds: 59 });
	});

	test('returns null for invalid colon format "1:2:3:4"', () => {
		const result = parseHMS('1:2:3:4');
		expect(result).toBeNull();
	});

	test('returns null for non-numeric colon format "a:b:c"', () => {
		const result = parseHMS('a:b:c');
		expect(result).toBeNull();
	});

	test('returns null for incomplete colon format "1:"', () => {
		const result = parseHMS('1:');
		expect(result).toBeNull();
	});

	test('tries colon notation before unit notation', () => {
		// "3:25" should parse as colon notation, not as random text
		const result = parseHMS('3:25');
		expect(result).toEqual({ hours: 3, minutes: 25, seconds: 0 });
	});
});

// ============================================================================
// PARSING LATEX HMS
// ============================================================================

describe('parseLatexHMS - LaTeX notation', () => {
	test('parses basic LaTeX "\\\\hms{2h30min}"', () => {
		const result = parseLatexHMS('\\hms{2h30min}');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses LaTeX with spaces "\\\\hms{2h 30min}"', () => {
		const result = parseLatexHMS('\\hms{2h 30min}');
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('parses full LaTeX HMS "\\\\hms{1h 45min 30s}"', () => {
		const result = parseLatexHMS('\\hms{1h 45min 30s}');
		expect(result).toEqual({ hours: 1, minutes: 45, seconds: 30 });
	});

	test('parses single unit LaTeX "\\\\hms{45min}"', () => {
		const result = parseLatexHMS('\\hms{45min}');
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 0 });
	});

	test('parses hours only "\\\\hms{3h}"', () => {
		const result = parseLatexHMS('\\hms{3h}');
		expect(result).toEqual({ hours: 3, minutes: 0, seconds: 0 });
	});

	test('parses seconds only "\\\\hms{45s}"', () => {
		const result = parseLatexHMS('\\hms{45s}');
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45 });
	});

	test('parses with milliseconds "\\\\hms{1h30min45s250ms}"', () => {
		const result = parseLatexHMS('\\hms{1h30min45s250ms}');
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45, milliseconds: 250 });
	});

	test('returns null for non-LaTeX string "not latex"', () => {
		const result = parseLatexHMS('not latex');
		expect(result).toBeNull();
	});

	test('returns null for empty LaTeX string ""', () => {
		const result = parseLatexHMS('');
		expect(result).toBeNull();
	});

	test('returns null for old \\\\text{} format (no longer supported)', () => {
		const result = parseLatexHMS('2\\text{h}30\\text{min}');
		expect(result).toBeNull();
	});

	test('returns null for invalid content "\\\\hms{xyz}"', () => {
		const result = parseLatexHMS('\\hms{xyz}');
		expect(result).toBeNull();
	});

	test('returns null for non-string input', () => {
		// @ts-expect-error - Testing runtime behavior with invalid input
		const result = parseLatexHMS(null);
		expect(result).toBeNull();
	});
});

// ============================================================================
// FORMATTING TO STRING
// ============================================================================

describe('formatHMS - units format (default)', () => {
	test('formats with spaces "2h 30min"', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 0 }, 'units');
		expect(result).toBe('2h 30min');
	});

	test('formats with all components "2h 30min 45s"', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 45 }, 'units');
		expect(result).toBe('2h 30min 45s');
	});

	test('formats minutes only "45min"', () => {
		const result = formatHMS({ hours: 0, minutes: 45, seconds: 0 }, 'units');
		expect(result).toBe('45min');
	});

	test('formats seconds only "45s"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 45 }, 'units');
		expect(result).toBe('45s');
	});

	test('formats hours only "3h"', () => {
		const result = formatHMS({ hours: 3, minutes: 0, seconds: 0 }, 'units');
		expect(result).toBe('3h');
	});

	test('formats zero values as "0s"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 0 }, 'units');
		expect(result).toBe('0s');
	});

	test('formats with milliseconds "45s 500ms"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 }, 'units');
		expect(result).toBe('45s 500ms');
	});

	test('formats full HMS with milliseconds "1h 30min 45s 250ms"', () => {
		const result = formatHMS({ hours: 1, minutes: 30, seconds: 45, milliseconds: 250 }, 'units');
		expect(result).toBe('1h 30min 45s 250ms');
	});

	test('omits zero milliseconds', () => {
		const result = formatHMS({ hours: 1, minutes: 30, seconds: 45, milliseconds: 0 }, 'units');
		expect(result).toBe('1h 30min 45s');
	});

	test('defaults to units format when format not specified', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 0 });
		expect(result).toBe('2h 30min');
	});

	test('formats fractional hours "2.5h 30min"', () => {
		const result = formatHMS({ hours: 2.5, minutes: 30, seconds: 0 }, 'units');
		expect(result).toBe('2.5h 30min');
	});
});

describe('formatHMS - colon format', () => {
	test('formats as HH:MM:SS "2:30:00"', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 0 }, 'colon');
		expect(result).toBe('02:30:00');
	});

	test('formats with leading zeros "0:45:30"', () => {
		const result = formatHMS({ hours: 0, minutes: 45, seconds: 30 }, 'colon');
		expect(result).toBe('00:45:30');
	});

	test('formats "3:25:10" with all components', () => {
		const result = formatHMS({ hours: 3, minutes: 25, seconds: 10 }, 'colon');
		expect(result).toBe('03:25:10');
	});

	test('formats with milliseconds "1:30:45.500"', () => {
		const result = formatHMS({ hours: 1, minutes: 30, seconds: 45, milliseconds: 500 }, 'colon');
		expect(result).toBe('01:30:45.500');
	});

	test('omits milliseconds if zero', () => {
		const result = formatHMS({ hours: 1, minutes: 30, seconds: 45, milliseconds: 0 }, 'colon');
		expect(result).toBe('01:30:45');
	});

	test('omits milliseconds if undefined', () => {
		const result = formatHMS({ hours: 1, minutes: 30, seconds: 45 }, 'colon');
		expect(result).toBe('01:30:45');
	});

	test('pads single-digit values "0:05:09"', () => {
		const result = formatHMS({ hours: 0, minutes: 5, seconds: 9 }, 'colon');
		expect(result).toBe('00:05:09');
	});

	test('handles large hours without padding "12:34:56"', () => {
		const result = formatHMS({ hours: 12, minutes: 34, seconds: 56 }, 'colon');
		expect(result).toBe('12:34:56');
	});

	test('pads milliseconds with leading zeros "1:0:5.050"', () => {
		const result = formatHMS({ hours: 1, minutes: 0, seconds: 5, milliseconds: 50 }, 'colon');
		expect(result).toBe('01:00:05.050');
	});
});

describe('formatHMS - short format', () => {
	test('formats without spaces "2h30min"', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 0 }, 'short');
		expect(result).toBe('2h30min');
	});

	test('formats with all components "2h30min45s"', () => {
		const result = formatHMS({ hours: 2, minutes: 30, seconds: 45 }, 'short');
		expect(result).toBe('2h30min45s');
	});

	test('formats "45min"', () => {
		const result = formatHMS({ hours: 0, minutes: 45, seconds: 0 }, 'short');
		expect(result).toBe('45min');
	});

	test('formats "45s"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 45 }, 'short');
		expect(result).toBe('45s');
	});

	test('formats zero values as "0s"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 0 }, 'short');
		expect(result).toBe('0s');
	});

	test('formats with milliseconds "45s500ms"', () => {
		const result = formatHMS({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 }, 'short');
		expect(result).toBe('45s500ms');
	});
});

// ============================================================================
// FORMATTING TO LATEX
// ============================================================================

describe('formatHMSLatex', () => {
	test('formats basic "\\\\hms{2h30min}"', () => {
		const result = formatHMSLatex({ hours: 2, minutes: 30, seconds: 0 });
		expect(result).toBe('\\hms{2h30min}');
	});

	test('formats with all components "\\\\hms{1h30min45s}"', () => {
		const result = formatHMSLatex({ hours: 1, minutes: 30, seconds: 45 });
		expect(result).toBe('\\hms{1h30min45s}');
	});

	test('formats hours only "\\\\hms{3h}"', () => {
		const result = formatHMSLatex({ hours: 3, minutes: 0, seconds: 0 });
		expect(result).toBe('\\hms{3h}');
	});

	test('formats minutes only "\\\\hms{45min}"', () => {
		const result = formatHMSLatex({ hours: 0, minutes: 45, seconds: 0 });
		expect(result).toBe('\\hms{45min}');
	});

	test('formats seconds only "\\\\hms{45s}"', () => {
		const result = formatHMSLatex({ hours: 0, minutes: 0, seconds: 45 });
		expect(result).toBe('\\hms{45s}');
	});

	test('formats zero values as "\\\\hms{0s}"', () => {
		const result = formatHMSLatex({ hours: 0, minutes: 0, seconds: 0 });
		expect(result).toBe('\\hms{0s}');
	});

	test('formats with milliseconds "\\\\hms{1h30min45s250ms}"', () => {
		const result = formatHMSLatex({
			hours: 1,
			minutes: 30,
			seconds: 45,
			milliseconds: 250
		});
		expect(result).toBe('\\hms{1h30min45s250ms}');
	});

	test('omits zero milliseconds', () => {
		const result = formatHMSLatex({
			hours: 1,
			minutes: 30,
			seconds: 45,
			milliseconds: 0
		});
		expect(result).toBe('\\hms{1h30min45s}');
	});

	test('omits undefined milliseconds', () => {
		const result = formatHMSLatex({ hours: 1, minutes: 30, seconds: 45 });
		expect(result).toBe('\\hms{1h30min45s}');
	});
});

// ============================================================================
// CONVERSION: HMS TO SECONDS
// ============================================================================

describe('hmsToSeconds', () => {
	test('converts 1 hour to 3600 seconds', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 0, seconds: 0 });
		expect(result).toBe(3600);
	});

	test('converts 1 minute to 60 seconds', () => {
		const result = hmsToSeconds({ hours: 0, minutes: 1, seconds: 0 });
		expect(result).toBe(60);
	});

	test('converts 1h 30min to 5400 seconds', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 30, seconds: 0 });
		expect(result).toBe(5400);
	});

	test('converts 1h 30min 45s to 5445 seconds', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 30, seconds: 45 });
		expect(result).toBe(5445);
	});

	test('converts 2min 30s to 150 seconds', () => {
		const result = hmsToSeconds({ hours: 0, minutes: 2, seconds: 30 });
		expect(result).toBe(150);
	});

	test('converts with milliseconds 45s 500ms to 45.5', () => {
		const result = hmsToSeconds({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 });
		expect(result).toBe(45.5);
	});

	test('converts 1h with 250ms to 3600.25', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 0, seconds: 0, milliseconds: 250 });
		expect(result).toBe(3600.25);
	});

	test('handles zero values', () => {
		const result = hmsToSeconds({ hours: 0, minutes: 0, seconds: 0 });
		expect(result).toBe(0);
	});

	test('handles undefined milliseconds as zero', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 30, seconds: 45 });
		expect(result).toBe(5445);
	});

	test('handles undefined seconds', () => {
		const result = hmsToSeconds({ hours: 1, minutes: 30 });
		expect(result).toBe(5400);
	});

	test('converts 3h 25min 10s to 12310 seconds', () => {
		const result = hmsToSeconds({ hours: 3, minutes: 25, seconds: 10 });
		expect(result).toBe(12310);
	});
});

// ============================================================================
// CONVERSION: SECONDS TO HMS
// ============================================================================

describe('secondsToHMS', () => {
	test('converts 3600 seconds to 1h', () => {
		const result = secondsToHMS(3600);
		expect(result).toEqual({ hours: 1, minutes: 0, seconds: 0 });
	});

	test('converts 60 seconds to 1min', () => {
		const result = secondsToHMS(60);
		expect(result).toEqual({ hours: 0, minutes: 1, seconds: 0 });
	});

	test('converts 5400 seconds to 1h 30min', () => {
		const result = secondsToHMS(5400);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 0 });
	});

	test('converts 5445 seconds to 1h 30min 45s', () => {
		const result = secondsToHMS(5445);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45 });
	});

	test('converts 150 seconds to 2min 30s', () => {
		const result = secondsToHMS(150);
		expect(result).toEqual({ hours: 0, minutes: 2, seconds: 30 });
	});

	test('converts 45.5 seconds to 45s 500ms', () => {
		const result = secondsToHMS(45.5);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 });
	});

	test('converts 3600.25 to 1h 0min 0s 250ms', () => {
		const result = secondsToHMS(3600.25);
		expect(result).toEqual({ hours: 1, minutes: 0, seconds: 0, milliseconds: 250 });
	});

	test('handles zero seconds', () => {
		const result = secondsToHMS(0);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
	});

	test('handles negative seconds by converting absolute value', () => {
		const result = secondsToHMS(-3600);
		expect(result.hours).toBe(-1);
		expect(result.minutes).toBe(0);
		expect(result.seconds).toBe(0);
	});

	test('round-trip: hmsToSeconds(secondsToHMS(5445)) === 5445', () => {
		const seconds = 5445;
		const hms = secondsToHMS(seconds);
		const roundTrip = hmsToSeconds(hms);
		expect(roundTrip).toBe(seconds);
	});

	test('round-trip: hmsToSeconds(secondsToHMS(150)) === 150', () => {
		const seconds = 150;
		const hms = secondsToHMS(seconds);
		const roundTrip = hmsToSeconds(hms);
		expect(roundTrip).toBe(seconds);
	});

	test('round-trip: hmsToSeconds(secondsToHMS(45.5)) === 45.5', () => {
		const seconds = 45.5;
		const hms = secondsToHMS(seconds);
		const roundTrip = hmsToSeconds(hms);
		expect(roundTrip).toBe(seconds);
	});

	test('converts 12310 seconds to 3h 25min 10s', () => {
		const result = secondsToHMS(12310);
		expect(result).toEqual({ hours: 3, minutes: 25, seconds: 10 });
	});
});

// ============================================================================
// CONVERSION: MINUTES TO HMS
// ============================================================================

describe('minutesToHMS', () => {
	test('converts 90 minutes to 1h 30min', () => {
		const result = minutesToHMS(90);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 0 });
	});

	test('converts 45 minutes to 45min', () => {
		const result = minutesToHMS(45);
		expect(result).toEqual({ hours: 0, minutes: 45, seconds: 0 });
	});

	test('converts fractional 2.5 minutes to 2min 30s', () => {
		const result = minutesToHMS(2.5);
		expect(result).toEqual({ hours: 0, minutes: 2, seconds: 30 });
	});

	test('converts 150 minutes to 2h 30min', () => {
		const result = minutesToHMS(150);
		expect(result).toEqual({ hours: 2, minutes: 30, seconds: 0 });
	});

	test('converts fractional 90.5 minutes to 1h 30min 30s', () => {
		const result = minutesToHMS(90.5);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 30 });
	});

	test('converts 0 minutes to zero HMS', () => {
		const result = minutesToHMS(0);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
	});

	test('round-trip: hmsToSeconds -> secondsToHMS -> hmsToSeconds works', () => {
		const minutes = 90;
		const seconds = minutes * 60;
		const hms = minutesToHMS(minutes);
		const roundTrip = hmsToSeconds(hms);
		expect(roundTrip).toBe(seconds);
	});
});

// ============================================================================
// NORMALIZATION
// ============================================================================

describe('normalizeHMS', () => {
	test('normalizes 90 seconds to 1min 30s', () => {
		const result = normalizeHMS({ hours: 0, minutes: 0, seconds: 90 });
		expect(result).toEqual({ hours: 0, minutes: 1, seconds: 30 });
	});

	test('normalizes 75 minutes to 1h 15min', () => {
		const result = normalizeHMS({ hours: 0, minutes: 75, seconds: 0 });
		expect(result).toEqual({ hours: 1, minutes: 15, seconds: 0 });
	});

	test('normalizes 1500 milliseconds to 1s 500ms', () => {
		const result = normalizeHMS({ hours: 0, minutes: 0, seconds: 0, milliseconds: 1500 });
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 1, milliseconds: 500 });
	});

	test('normalizes multiple overflows 3661s to 1h 1min 1s', () => {
		const result = normalizeHMS({ hours: 0, minutes: 0, seconds: 3661 });
		expect(result).toEqual({ hours: 1, minutes: 1, seconds: 1 });
	});

	test('normalizes chained overflow 90min 90s to 1h 31min 30s', () => {
		const result = normalizeHMS({ hours: 0, minutes: 90, seconds: 90 });
		expect(result).toEqual({ hours: 1, minutes: 31, seconds: 30 });
	});

	test('returns already-normalized values unchanged', () => {
		const input: HMSValue = { hours: 1, minutes: 30, seconds: 45 };
		const result = normalizeHMS(input);
		expect(result).toEqual(input);
	});

	test('handles zero values', () => {
		const result = normalizeHMS({ hours: 0, minutes: 0, seconds: 0 });
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
	});

	test('normalizes large overflow 7200s to 2h', () => {
		const result = normalizeHMS({ hours: 0, minutes: 0, seconds: 7200 });
		expect(result).toEqual({ hours: 2, minutes: 0, seconds: 0 });
	});

	test('normalizes with undefined seconds', () => {
		const result = normalizeHMS({ hours: 0, minutes: 90 });
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 0 });
	});
});

// ============================================================================
// COMPARISON
// ============================================================================

describe('compareHMS', () => {
	test('returns 0 when values are equal', () => {
		const result = compareHMS(
			{ hours: 2, minutes: 30, seconds: 0 },
			{ hours: 2, minutes: 30, seconds: 0 }
		);
		expect(result).toBe(0);
	});

	test('returns negative when first < second', () => {
		const result = compareHMS(
			{ hours: 1, minutes: 30, seconds: 0 },
			{ hours: 2, minutes: 0, seconds: 0 }
		);
		expect(result).toBeLessThan(0);
	});

	test('returns positive when first > second', () => {
		const result = compareHMS(
			{ hours: 3, minutes: 0, seconds: 0 },
			{ hours: 2, minutes: 30, seconds: 0 }
		);
		expect(result).toBeGreaterThan(0);
	});

	test('compares different components correctly', () => {
		// 1h 50min (110min) < 2h (120min)
		const result = compareHMS(
			{ hours: 1, minutes: 50, seconds: 0 },
			{ hours: 2, minutes: 0, seconds: 0 }
		);
		expect(result).toBeLessThan(0);
	});

	test('compares with seconds precision', () => {
		// 1min 30s (90s) > 1min 20s (80s)
		const result = compareHMS(
			{ hours: 0, minutes: 1, seconds: 30 },
			{ hours: 0, minutes: 1, seconds: 20 }
		);
		expect(result).toBeGreaterThan(0);
	});

	test('compares with milliseconds', () => {
		// 1s 500ms (1.5s) > 1s (1s)
		const result = compareHMS(
			{ hours: 0, minutes: 0, seconds: 1, milliseconds: 500 },
			{ hours: 0, minutes: 0, seconds: 1 }
		);
		expect(result).toBeGreaterThan(0);
	});

	test('compares zero values', () => {
		const result = compareHMS(
			{ hours: 0, minutes: 0, seconds: 0 },
			{ hours: 0, minutes: 0, seconds: 0 }
		);
		expect(result).toBe(0);
	});

	test('compares large values', () => {
		const result = compareHMS(
			{ hours: 100, minutes: 30, seconds: 45 },
			{ hours: 100, minutes: 30, seconds: 45 }
		);
		expect(result).toBe(0);
	});
});

// ============================================================================
// ADDITION
// ============================================================================

describe('addHMS', () => {
	test('adds simple HMS "1h 30min + 45min = 2h 15min"', () => {
		const result = addHMS(
			{ hours: 1, minutes: 30, seconds: 0 },
			{ hours: 0, minutes: 45, seconds: 0 }
		);
		expect(result).toEqual({ hours: 2, minutes: 15, seconds: 0 });
	});

	test('adds with overflow "1h 50min + 20min = 2h 10min"', () => {
		const result = addHMS(
			{ hours: 1, minutes: 50, seconds: 0 },
			{ hours: 0, minutes: 20, seconds: 0 }
		);
		expect(result).toEqual({ hours: 2, minutes: 10, seconds: 0 });
	});

	test('adds seconds with overflow "45s + 30s = 1min 15s"', () => {
		const result = addHMS(
			{ hours: 0, minutes: 0, seconds: 45 },
			{ hours: 0, minutes: 0, seconds: 30 }
		);
		expect(result).toEqual({ hours: 0, minutes: 1, seconds: 15 });
	});

	test('adds all components "1h 30min 45s + 0h 20min 30s = 1h 51min 15s"', () => {
		const result = addHMS(
			{ hours: 1, minutes: 30, seconds: 45 },
			{ hours: 0, minutes: 20, seconds: 30 }
		);
		expect(result).toEqual({ hours: 1, minutes: 51, seconds: 15 });
	});

	test('adds zero', () => {
		const result = addHMS(
			{ hours: 1, minutes: 30, seconds: 0 },
			{ hours: 0, minutes: 0, seconds: 0 }
		);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 0 });
	});

	test('adds with milliseconds "45s 500ms + 1s 250ms = 46s 750ms"', () => {
		const result = addHMS(
			{ hours: 0, minutes: 0, seconds: 45, milliseconds: 500 },
			{ hours: 0, minutes: 0, seconds: 1, milliseconds: 250 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 46, milliseconds: 750 });
	});

	test('adds milliseconds with overflow "500ms + 600ms = 1s 100ms"', () => {
		const result = addHMS(
			{ hours: 0, minutes: 0, seconds: 0, milliseconds: 500 },
			{ hours: 0, minutes: 0, seconds: 0, milliseconds: 600 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 1, milliseconds: 100 });
	});

	test('adds complex overflow "59min 59s + 1s = 1h"', () => {
		const result = addHMS(
			{ hours: 0, minutes: 59, seconds: 59 },
			{ hours: 0, minutes: 0, seconds: 1 }
		);
		expect(result).toEqual({ hours: 1, minutes: 0, seconds: 0 });
	});

	test('adds multiple hours', () => {
		const result = addHMS(
			{ hours: 5, minutes: 30, seconds: 0 },
			{ hours: 3, minutes: 45, seconds: 0 }
		);
		expect(result).toEqual({ hours: 9, minutes: 15, seconds: 0 });
	});

	test('commutative: a + b === b + a', () => {
		const a = { hours: 1, minutes: 30, seconds: 45 };
		const b = { hours: 2, minutes: 20, seconds: 15 };
		const result1 = addHMS(a, b);
		const result2 = addHMS(b, a);
		expect(result1).toEqual(result2);
	});
});

// ============================================================================
// SUBTRACTION
// ============================================================================

describe('subtractHMS', () => {
	test('subtracts simple HMS "2h 30min - 1h 15min = 1h 15min"', () => {
		const result = subtractHMS(
			{ hours: 2, minutes: 30, seconds: 0 },
			{ hours: 1, minutes: 15, seconds: 0 }
		);
		expect(result).toEqual({ hours: 1, minutes: 15, seconds: 0 });
	});

	test('subtracts with seconds "2min 30s - 1min = 1min 30s"', () => {
		const result = subtractHMS(
			{ hours: 0, minutes: 2, seconds: 30 },
			{ hours: 0, minutes: 1, seconds: 0 }
		);
		expect(result).toEqual({ hours: 0, minutes: 1, seconds: 30 });
	});

	test('subtracts all components "1h 51min 15s - 0h 20min 30s = 1h 30min 45s"', () => {
		const result = subtractHMS(
			{ hours: 1, minutes: 51, seconds: 15 },
			{ hours: 0, minutes: 20, seconds: 30 }
		);
		expect(result).toEqual({ hours: 1, minutes: 30, seconds: 45 });
	});

	test('returns zero when subtracting equal values', () => {
		const result = subtractHMS(
			{ hours: 1, minutes: 30, seconds: 0 },
			{ hours: 1, minutes: 30, seconds: 0 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
	});

	test('returns negative when subtrahend > minuend', () => {
		// 1h - 1h30min = -30min → { hours: 0, minutes: -30 }
		const result = subtractHMS(
			{ hours: 1, minutes: 0, seconds: 0 },
			{ hours: 1, minutes: 30, seconds: 0 }
		);
		// Overall duration is negative (check via seconds conversion)
		const seconds = hmsToSeconds(result);
		expect(seconds).toBeLessThan(0);
		expect(seconds).toBe(-1800); // -30 minutes
	});

	test('subtracts with milliseconds "2s 500ms - 1s 250ms = 1s 250ms"', () => {
		const result = subtractHMS(
			{ hours: 0, minutes: 0, seconds: 2, milliseconds: 500 },
			{ hours: 0, minutes: 0, seconds: 1, milliseconds: 250 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 1, milliseconds: 250 });
	});

	test('subtracts with milliseconds borrow "1s 100ms - 500ms = 600ms"', () => {
		const result = subtractHMS(
			{ hours: 0, minutes: 0, seconds: 1, milliseconds: 100 },
			{ hours: 0, minutes: 0, seconds: 0, milliseconds: 500 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0, milliseconds: 600 });
	});

	test('subtracts from zero', () => {
		const result = subtractHMS(
			{ hours: 0, minutes: 0, seconds: 0 },
			{ hours: 0, minutes: 1, seconds: 0 }
		);
		expect(result.minutes).toBe(-1);
	});

	test('subtracts with borrowing across minutes "1min 15s - 30s = 45s"', () => {
		const result = subtractHMS(
			{ hours: 0, minutes: 1, seconds: 15 },
			{ hours: 0, minutes: 0, seconds: 30 }
		);
		expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45 });
	});

	test('subtracts with borrowing across hours "2h 30min - 45min = 1h 45min"', () => {
		const result = subtractHMS(
			{ hours: 2, minutes: 30, seconds: 0 },
			{ hours: 0, minutes: 45, seconds: 0 }
		);
		expect(result).toEqual({ hours: 1, minutes: 45, seconds: 0 });
	});

	test('handles large values', () => {
		const result = subtractHMS(
			{ hours: 100, minutes: 30, seconds: 45 },
			{ hours: 50, minutes: 15, seconds: 20 }
		);
		expect(result).toEqual({ hours: 50, minutes: 15, seconds: 25 });
	});

	test('round-trip: addHMS(a, b) = c, then subtractHMS(c, b) = a', () => {
		const a = { hours: 1, minutes: 30, seconds: 45 };
		const b = { hours: 2, minutes: 20, seconds: 15 };
		const c = addHMS(a, b);
		const result = subtractHMS(c, b);
		expect(result).toEqual(a);
	});
});

// ============================================================================
// ROUND-TRIP CONVERSIONS (Integration Tests)
// ============================================================================

describe('Round-trip conversions', () => {
	test('parse -> format -> parse preserves value (unit notation)', () => {
		const original = '2h 30min 45s';
		const parsed = parseHMS(original);
		const formatted = formatHMS(parsed!, 'units');
		const reparsed = parseHMS(formatted);
		expect(reparsed).toEqual(parsed);
	});

	test('parse -> format -> parse preserves value (colon notation)', () => {
		const original = '3:25:10';
		const parsed = parseHMS(original);
		const formatted = formatHMS(parsed!, 'colon');
		const reparsed = parseHMS(formatted);
		expect(reparsed).toEqual(parsed);
	});

	test('parseLatex -> formatLatex -> parseLatex preserves value', () => {
		const original = '\\hms{2h30min45s}';
		const parsed = parseLatexHMS(original);
		const formatted = formatHMSLatex(parsed!);
		const reparsed = parseLatexHMS(formatted);
		expect(reparsed).toEqual(parsed);
	});

	test('parse -> toSeconds -> fromSeconds -> format preserves value', () => {
		const original = '1h 30min 45s';
		const parsed = parseHMS(original);
		const seconds = hmsToSeconds(parsed!);
		const back = secondsToHMS(seconds);
		const formatted = formatHMS(back, 'units');
		expect(parseHMS(formatted)).toEqual(parsed);
	});
});
