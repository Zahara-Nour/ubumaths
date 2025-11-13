/**
 * Timezone Utilities Tests
 *
 * Comprehensive test suite for timezone-aware date calculations
 * used in the daily/weekly summaries system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getYesterdayInTimezone,
	getCurrentDayOfWeekInTimezone,
	getWeekRangeInTimezone,
	formatDateForDisplay,
	isDateInRange,
	getDayBoundariesInTimezone
} from './timezone-utils';
import type { WeekConfig } from '$lib/types/database';

describe('getYesterdayInTimezone', () => {
	beforeEach(() => {
		// Mock a fixed date for consistent testing
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return yesterday at 00:00 in Europe/Paris timezone', () => {
		// Set system time to 2025-11-13 10:00 UTC
		vi.setSystemTime(new Date('2025-11-13T10:00:00Z'));

		const yesterday = getYesterdayInTimezone('Europe/Paris');

		// Yesterday in Paris = 2025-11-12 00:00 Europe/Paris
		// Europe/Paris is UTC+1 (winter) or UTC+2 (summer)
		// 2025-11-12 is winter, so UTC+1
		// 2025-11-12 00:00 Paris = 2025-11-11 23:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-11T23:00:00.000Z');
	});

	it('should return yesterday at 00:00 in America/New_York timezone', () => {
		// Set system time to 2025-11-13 10:00 UTC
		vi.setSystemTime(new Date('2025-11-13T10:00:00Z'));

		const yesterday = getYesterdayInTimezone('America/New_York');

		// Yesterday in New York = 2025-11-12 00:00 America/New_York
		// America/New_York is UTC-5 (winter) or UTC-4 (summer)
		// 2025-11-12 is winter, so UTC-5
		// 2025-11-12 00:00 NY = 2025-11-12 05:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-12T05:00:00.000Z');
	});

	it('should return yesterday at 00:00 in Asia/Tokyo timezone', () => {
		// Set system time to 2025-11-13 10:00 UTC
		vi.setSystemTime(new Date('2025-11-13T10:00:00Z'));

		const yesterday = getYesterdayInTimezone('Asia/Tokyo');

		// Yesterday in Tokyo = 2025-11-12 00:00 Asia/Tokyo
		// Asia/Tokyo is UTC+9 (no DST)
		// 2025-11-12 00:00 Tokyo = 2025-11-11 15:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-11T15:00:00.000Z');
	});

	it('should handle midnight edge case in Europe/Paris', () => {
		// Set system time to midnight UTC
		vi.setSystemTime(new Date('2025-11-13T00:00:00Z'));

		const yesterday = getYesterdayInTimezone('Europe/Paris');

		// At midnight UTC, it's 01:00 in Paris (UTC+1)
		// Yesterday = 2025-11-12 00:00 Paris = 2025-11-11 23:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-11T23:00:00.000Z');
	});
});

describe('getCurrentDayOfWeekInTimezone', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return correct day of week for Europe/Paris', () => {
		// Wednesday 2025-11-13 10:00 UTC
		vi.setSystemTime(new Date('2025-11-13T10:00:00Z'));

		const dayOfWeek = getCurrentDayOfWeekInTimezone('Europe/Paris');

		// 2025-11-13 is a Thursday (4)
		expect(dayOfWeek).toBe(4);
	});

	it('should return correct day of week across midnight boundary', () => {
		// Set time to 23:30 UTC on Wednesday 2025-11-12
		vi.setSystemTime(new Date('2025-11-12T23:30:00Z'));

		const parisDay = getCurrentDayOfWeekInTimezone('Europe/Paris');
		const nyDay = getCurrentDayOfWeekInTimezone('America/New_York');

		// Paris: 23:30 UTC = 00:30 Thursday (4)
		expect(parisDay).toBe(4);

		// New York: 23:30 UTC = 18:30 Wednesday (3)
		expect(nyDay).toBe(3);
	});
});

describe('getWeekRangeInTimezone', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should calculate previous week for Sunday-Saturday week', () => {
		// Set time to Sunday 2025-11-16 10:00 UTC
		vi.setSystemTime(new Date('2025-11-16T10:00:00Z'));

		const weekConfig: WeekConfig = {
			first_day: 0, // Sunday
			last_day: 6, // Saturday
			school_days: [0, 1, 2, 3, 4, 5, 6],
			weekend_days: []
		};

		const { start, end } = getWeekRangeInTimezone('Europe/Paris', weekConfig);

		// Previous week: Sun Nov 9 - Sat Nov 15
		// Start: 2025-11-09 00:00 Paris = 2025-11-08 23:00 UTC (UTC+1)
		// End: 2025-11-15 23:59:59.999 Paris = 2025-11-15 22:59:59.999 UTC
		expect(start.toISOString()).toBe('2025-11-08T23:00:00.000Z');
		expect(end.toISOString().startsWith('2025-11-15T22:59:59')).toBe(true);
	});

	it('should calculate previous week for Monday-Sunday week', () => {
		// Set time to Monday 2025-11-17 10:00 UTC
		vi.setSystemTime(new Date('2025-11-17T10:00:00Z'));

		const weekConfig: WeekConfig = {
			first_day: 1, // Monday
			last_day: 0, // Sunday (wraps around)
			school_days: [1, 2, 3, 4, 5, 6, 0],
			weekend_days: []
		};

		const { start, end } = getWeekRangeInTimezone('Europe/Paris', weekConfig);

		// Current week starts Monday Nov 10, so previous week: Mon Nov 10 - Sun Nov 16
		// But we're on Monday Nov 17, so previous week is Mon Nov 10 - Sun Nov 16
		// Start: 2025-11-10 00:00 Paris = 2025-11-09 23:00 UTC
		// End: 2025-11-16 23:59:59.999 Paris = 2025-11-16 22:59:59.999 UTC
		expect(start.toISOString()).toBe('2025-11-09T23:00:00.000Z');
		expect(end.toISOString().startsWith('2025-11-16T22:59:59')).toBe(true);
	});

	it('should handle 5-day week (Monday-Friday)', () => {
		// Set time to Monday 2025-11-17 10:00 UTC
		vi.setSystemTime(new Date('2025-11-17T10:00:00Z'));

		const weekConfig: WeekConfig = {
			first_day: 1, // Monday
			last_day: 5, // Friday
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [6, 0]
		};

		const { start, end } = getWeekRangeInTimezone('Europe/Paris', weekConfig);

		// Previous week: Mon Nov 10 - Fri Nov 14
		expect(start.toISOString()).toBe('2025-11-09T23:00:00.000Z');
		expect(end.toISOString().startsWith('2025-11-14T22:59:59')).toBe(true);
	});
});

describe('formatDateForDisplay', () => {
	it('should format date in French locale by default', () => {
		const date = new Date('2025-11-13T12:00:00Z');
		const formatted = formatDateForDisplay(date);

		// French format: "13 novembre 2025"
		expect(formatted).toMatch(/13 novembre 2025/);
	});

	it('should format date in English locale when specified', () => {
		const date = new Date('2025-11-13T12:00:00Z');
		const formatted = formatDateForDisplay(date, 'en-US');

		// English format: "November 13, 2025"
		expect(formatted).toMatch(/November 13, 2025/);
	});

	it('should handle January dates correctly', () => {
		const date = new Date('2025-01-15T12:00:00Z');
		const formatted = formatDateForDisplay(date);

		expect(formatted).toMatch(/15 janvier 2025/);
	});

	it('should fallback to ISO string on error', () => {
		// Create a spy on toLocaleDateString to force an error
		const date = new Date('2025-11-13T12:00:00Z');
		const spy = vi.spyOn(date, 'toLocaleDateString').mockImplementation(() => {
			throw new Error('Format error');
		});

		const formatted = formatDateForDisplay(date);

		// Should fallback to ISO date
		expect(formatted).toBe('2025-11-13');

		spy.mockRestore();
	});
});

describe('isDateInRange', () => {
	it('should return true for date within range', () => {
		const date = new Date('2025-11-13T12:00:00Z');
		const start = new Date('2025-11-10T00:00:00Z');
		const end = new Date('2025-11-15T23:59:59Z');

		expect(isDateInRange(date, start, end)).toBe(true);
	});

	it('should return true for date at range start', () => {
		const date = new Date('2025-11-10T00:00:00Z');
		const start = new Date('2025-11-10T00:00:00Z');
		const end = new Date('2025-11-15T23:59:59Z');

		expect(isDateInRange(date, start, end)).toBe(true);
	});

	it('should return true for date at range end', () => {
		const date = new Date('2025-11-15T23:59:59Z');
		const start = new Date('2025-11-10T00:00:00Z');
		const end = new Date('2025-11-15T23:59:59Z');

		expect(isDateInRange(date, start, end)).toBe(true);
	});

	it('should return false for date before range', () => {
		const date = new Date('2025-11-09T23:59:59Z');
		const start = new Date('2025-11-10T00:00:00Z');
		const end = new Date('2025-11-15T23:59:59Z');

		expect(isDateInRange(date, start, end)).toBe(false);
	});

	it('should return false for date after range', () => {
		const date = new Date('2025-11-16T00:00:00Z');
		const start = new Date('2025-11-10T00:00:00Z');
		const end = new Date('2025-11-15T23:59:59Z');

		expect(isDateInRange(date, start, end)).toBe(false);
	});
});

describe('getDayBoundariesInTimezone', () => {
	it('should return correct boundaries for Europe/Paris timezone', () => {
		const date = new Date('2025-11-13T12:00:00Z'); // Some time during the day

		const { start, end } = getDayBoundariesInTimezone(date, 'Europe/Paris');

		// 2025-11-13 00:00 Paris = 2025-11-12 23:00 UTC (UTC+1)
		// 2025-11-13 23:59:59.999 Paris = 2025-11-13 22:59:59.999 UTC
		expect(start.toISOString()).toBe('2025-11-12T23:00:00.000Z');
		expect(end.toISOString().startsWith('2025-11-13T22:59:59')).toBe(true);
	});

	it('should return correct boundaries for America/New_York timezone', () => {
		const date = new Date('2025-11-13T12:00:00Z');

		const { start, end } = getDayBoundariesInTimezone(date, 'America/New_York');

		// 2025-11-13 00:00 NY = 2025-11-13 05:00 UTC (UTC-5)
		// 2025-11-13 23:59:59.999 NY = 2025-11-14 04:59:59.999 UTC
		expect(start.toISOString()).toBe('2025-11-13T05:00:00.000Z');
		expect(end.toISOString().startsWith('2025-11-14T04:59:59')).toBe(true);
	});

	it('should span exactly 24 hours', () => {
		const date = new Date('2025-11-13T12:00:00Z');

		const { start, end } = getDayBoundariesInTimezone(date, 'Europe/Paris');

		// Difference should be 86,399,999 milliseconds (23:59:59.999)
		const diff = end.getTime() - start.getTime();
		expect(diff).toBeGreaterThan(86399000); // At least 23:59:59
		expect(diff).toBeLessThan(86400000); // Less than 24:00:00
	});
});
