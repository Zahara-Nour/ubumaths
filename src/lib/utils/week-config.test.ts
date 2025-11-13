import { describe, test, expect } from 'vitest';
import {
	DEFAULT_WEEK_CONFIG,
	getLastDayOfWeek,
	isSchoolDay,
	getSchoolDays,
	getWeekendDays,
	isValidWeekConfig
} from './week-config';
import type { WeekConfig } from '$lib/types/database';

describe('DEFAULT_WEEK_CONFIG', () => {
	test('is a valid Israeli school week', () => {
		expect(DEFAULT_WEEK_CONFIG.first_day).toBe(0); // Sunday
		expect(DEFAULT_WEEK_CONFIG.last_day).toBe(6); // Saturday
		expect(DEFAULT_WEEK_CONFIG.school_days).toEqual([0, 1, 2, 3, 4]); // Sun-Thu
		expect(DEFAULT_WEEK_CONFIG.weekend_days).toEqual([5, 6]); // Fri-Sat
	});

	test('passes validation', () => {
		expect(isValidWeekConfig(DEFAULT_WEEK_CONFIG)).toBe(true);
	});
});

describe('getLastDayOfWeek', () => {
	test('returns last day from config', () => {
		expect(getLastDayOfWeek(DEFAULT_WEEK_CONFIG)).toBe(6);
	});

	test('works with custom week config', () => {
		const westernConfig: WeekConfig = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(getLastDayOfWeek(westernConfig)).toBe(0);
	});
});

describe('isSchoolDay', () => {
	test('returns true for school days (Sun-Thu)', () => {
		expect(isSchoolDay(0, DEFAULT_WEEK_CONFIG)).toBe(true); // Sunday
		expect(isSchoolDay(1, DEFAULT_WEEK_CONFIG)).toBe(true); // Monday
		expect(isSchoolDay(2, DEFAULT_WEEK_CONFIG)).toBe(true); // Tuesday
		expect(isSchoolDay(3, DEFAULT_WEEK_CONFIG)).toBe(true); // Wednesday
		expect(isSchoolDay(4, DEFAULT_WEEK_CONFIG)).toBe(true); // Thursday
	});

	test('returns false for weekend days (Fri-Sat)', () => {
		expect(isSchoolDay(5, DEFAULT_WEEK_CONFIG)).toBe(false); // Friday
		expect(isSchoolDay(6, DEFAULT_WEEK_CONFIG)).toBe(false); // Saturday
	});

	test('works with Western week (Mon-Fri)', () => {
		const westernConfig: WeekConfig = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(isSchoolDay(0, westernConfig)).toBe(false); // Sunday (weekend)
		expect(isSchoolDay(1, westernConfig)).toBe(true); // Monday
		expect(isSchoolDay(5, westernConfig)).toBe(true); // Friday
		expect(isSchoolDay(6, westernConfig)).toBe(false); // Saturday (weekend)
	});
});

describe('getSchoolDays', () => {
	test('returns array of school days', () => {
		expect(getSchoolDays(DEFAULT_WEEK_CONFIG)).toEqual([0, 1, 2, 3, 4]);
	});

	test('returns reference to school_days array', () => {
		const days = getSchoolDays(DEFAULT_WEEK_CONFIG);
		expect(days).toBe(DEFAULT_WEEK_CONFIG.school_days);
	});
});

describe('getWeekendDays', () => {
	test('returns array of weekend days', () => {
		expect(getWeekendDays(DEFAULT_WEEK_CONFIG)).toEqual([5, 6]);
	});

	test('returns reference to weekend_days array', () => {
		const days = getWeekendDays(DEFAULT_WEEK_CONFIG);
		expect(days).toBe(DEFAULT_WEEK_CONFIG.weekend_days);
	});
});

describe('isValidWeekConfig', () => {
	test('validates correct Israeli config', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(true);
	});

	test('validates correct Western config', () => {
		const config = {
			first_day: 1,
			last_day: 0,
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};
		expect(isValidWeekConfig(config)).toBe(true);
	});

	test('rejects null', () => {
		expect(isValidWeekConfig(null)).toBe(false);
	});

	test('rejects undefined', () => {
		expect(isValidWeekConfig(undefined)).toBe(false);
	});

	test('rejects non-object', () => {
		expect(isValidWeekConfig('invalid')).toBe(false);
		expect(isValidWeekConfig(42)).toBe(false);
		expect(isValidWeekConfig(true)).toBe(false);
	});

	test('rejects missing first_day', () => {
		const config = {
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing last_day', () => {
		const config = {
			first_day: 0,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing school_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects missing weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid first_day (< 0)', () => {
		const config = {
			first_day: -1,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid first_day (> 6)', () => {
		const config = {
			first_day: 7,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid last_day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: -1,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid last_day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 7,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects non-array school_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: 'invalid',
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects non-array weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: 'invalid'
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid school day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [-1, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid school day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 7],
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid weekend day (< 0)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [-1, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects invalid weekend day (> 6)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 7]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects overlapping school_days and weekend_days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 5], // Friday in both
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects incomplete week (missing days)', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [6] // Missing day 5
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects week with duplicate days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 4], // Duplicate 4
			weekend_days: [5, 6]
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});

	test('rejects config with extra days', () => {
		const config = {
			first_day: 0,
			last_day: 6,
			school_days: [0, 1, 2, 3, 4, 5],
			weekend_days: [5, 6] // 5 appears twice
		};
		expect(isValidWeekConfig(config)).toBe(false);
	});
});
