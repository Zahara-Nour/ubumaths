/**
 * Timezone Utilities Tests
 * Phase 6: Test suite for timezone helper functions
 */

import { describe, it, expect } from 'vitest';
import {
	DEFAULT_TIMEZONE,
	TIMEZONE_GROUPS,
	ALL_TIMEZONES,
	getTimezoneLabel,
	getTimezoneOffset,
	getTimezoneDisplay,
	isValidTimezone,
	getTimezoneSelectItems,
	searchTimezones
} from './timezones';

describe('Timezone Constants', () => {
	it('should have correct DEFAULT_TIMEZONE', () => {
		expect(DEFAULT_TIMEZONE).toBe('Europe/Paris');
	});

	it('should have all required timezone regions', () => {
		expect(TIMEZONE_GROUPS).toHaveProperty('Common');
		expect(TIMEZONE_GROUPS).toHaveProperty('Africa');
		expect(TIMEZONE_GROUPS).toHaveProperty('America');
		expect(TIMEZONE_GROUPS).toHaveProperty('Asia');
		expect(TIMEZONE_GROUPS).toHaveProperty('Australia');
		expect(TIMEZONE_GROUPS).toHaveProperty('Europe');
		expect(TIMEZONE_GROUPS).toHaveProperty('Pacific');
	});

	it('should have common timezones in Common group', () => {
		expect(TIMEZONE_GROUPS.Common).toContain('Europe/Paris');
		expect(TIMEZONE_GROUPS.Common).toContain('America/New_York');
		expect(TIMEZONE_GROUPS.Common).toContain('America/Los_Angeles');
		expect(TIMEZONE_GROUPS.Common).toContain('Asia/Tokyo');
		expect(TIMEZONE_GROUPS.Common).toContain('Europe/London');
		expect(TIMEZONE_GROUPS.Common).toContain('Australia/Sydney');
	});

	it('should have ALL_TIMEZONES flattened from groups', () => {
		const expectedCount = Object.values(TIMEZONE_GROUPS).reduce(
			(sum, group) => sum + group.length,
			0
		);
		expect(ALL_TIMEZONES).toHaveLength(expectedCount);
	});

	it('should have duplicates in ALL_TIMEZONES (common timezones appear twice)', () => {
		// Common timezones appear in both "Common" group and their regional group
		const uniqueTimezones = new Set(ALL_TIMEZONES);
		const commonCount = TIMEZONE_GROUPS.Common.length;

		// Total - unique = duplicates (should equal common timezone count)
		expect(ALL_TIMEZONES.length - uniqueTimezones.size).toBe(commonCount);
	});

	it('should have valid IANA timezone format (Region/City)', () => {
		ALL_TIMEZONES.forEach((tz) => {
			expect(tz).toMatch(/^[A-Z][a-z]+\/[A-Z_a-z]+$/);
		});
	});
});

describe('getTimezoneLabel', () => {
	it('should extract city from timezone string', () => {
		expect(getTimezoneLabel('Europe/Paris')).toBe('Paris');
		expect(getTimezoneLabel('America/New_York')).toBe('New York');
		expect(getTimezoneLabel('Asia/Tokyo')).toBe('Tokyo');
	});

	it('should replace underscores with spaces', () => {
		expect(getTimezoneLabel('America/Los_Angeles')).toBe('Los Angeles');
		expect(getTimezoneLabel('America/New_York')).toBe('New York');
		expect(getTimezoneLabel('America/Buenos_Aires')).toBe('Buenos Aires');
	});

	it('should return original string for invalid format', () => {
		expect(getTimezoneLabel('InvalidTimezone')).toBe('InvalidTimezone');
		expect(getTimezoneLabel('UTC')).toBe('UTC');
	});

	it('should handle multi-level timezones', () => {
		// If we had America/Indiana/Indianapolis, it should still work
		// Current implementation only takes last part after last /
		const multiLevel = 'America/Indiana/Indianapolis';
		const result = getTimezoneLabel(multiLevel);
		// Should handle the two-part format correctly
		expect(result).toBeTruthy();
	});
});

describe('getTimezoneOffset', () => {
	it('should return offset for Europe/Paris', () => {
		const offset = getTimezoneOffset('Europe/Paris');
		// Paris is UTC+01:00 or UTC+02:00 depending on DST
		expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
	});

	it('should return offset for America/New_York', () => {
		const offset = getTimezoneOffset('America/New_York');
		// New York is UTC-05:00 or UTC-04:00 depending on DST
		expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
	});

	it('should return offset for Asia/Tokyo', () => {
		const offset = getTimezoneOffset('Asia/Tokyo');
		// Tokyo is always UTC+09:00 (no DST)
		expect(offset).toBe('+09:00');
	});

	it('should return empty string for invalid timezone', () => {
		const offset = getTimezoneOffset('Invalid/Timezone');
		expect(offset).toBe('');
	});

	it('should use provided date for offset calculation', () => {
		// Test with summer date (DST active in Paris)
		const summerDate = new Date('2025-07-15T12:00:00Z');
		const summerOffset = getTimezoneOffset('Europe/Paris', summerDate);
		expect(summerOffset).toBe('+02:00'); // DST active

		// Test with winter date (DST inactive in Paris)
		const winterDate = new Date('2025-01-15T12:00:00Z');
		const winterOffset = getTimezoneOffset('Europe/Paris', winterDate);
		expect(winterOffset).toBe('+01:00'); // DST inactive
	});

	it('should handle negative offsets', () => {
		const offset = getTimezoneOffset('America/Los_Angeles');
		expect(offset).toMatch(/^-\d{2}:\d{2}$/); // Should be negative
	});

	it('should handle positive offsets', () => {
		const offset = getTimezoneOffset('Asia/Dubai');
		expect(offset).toMatch(/^\+\d{2}:\d{2}$/); // Should be positive
	});
});

describe('getTimezoneDisplay', () => {
	it('should format timezone display string with label and offset', () => {
		const display = getTimezoneDisplay('Europe/Paris');
		expect(display).toMatch(/^Paris \(Europe\/Paris, UTC[+-]\d{2}:\d{2}\)$/);
	});

	it('should handle underscores in city names', () => {
		const display = getTimezoneDisplay('America/New_York');
		expect(display).toMatch(/^New York \(America\/New_York, UTC[+-]\d{2}:\d{2}\)$/);
	});

	it('should handle invalid timezones gracefully', () => {
		const display = getTimezoneDisplay('Invalid/Timezone');
		expect(display).toBe('Timezone (Invalid/Timezone)'); // No offset
	});
});

describe('isValidTimezone', () => {
	it('should return true for valid timezones', () => {
		expect(isValidTimezone('Europe/Paris')).toBe(true);
		expect(isValidTimezone('America/New_York')).toBe(true);
		expect(isValidTimezone('Asia/Tokyo')).toBe(true);
		expect(isValidTimezone('Australia/Sydney')).toBe(true);
	});

	it('should return false for invalid timezones', () => {
		expect(isValidTimezone('Invalid/Timezone')).toBe(false);
		expect(isValidTimezone('Europe/FakeCity')).toBe(false);
		expect(isValidTimezone('UTC')).toBe(false);
		expect(isValidTimezone('')).toBe(false);
	});

	it('should return false for non-string inputs', () => {
		expect(isValidTimezone(123 as unknown as string)).toBe(false);
		expect(isValidTimezone(null as unknown as string)).toBe(false);
		expect(isValidTimezone(undefined as unknown as string)).toBe(false);
		expect(isValidTimezone({} as unknown as string)).toBe(false);
	});

	it('should validate all timezones in TIMEZONE_GROUPS', () => {
		Object.values(TIMEZONE_GROUPS)
			.flat()
			.forEach((tz) => {
				expect(isValidTimezone(tz)).toBe(true);
			});
	});
});

describe('getTimezoneSelectItems', () => {
	it('should return array of items with value and label', () => {
		const items = getTimezoneSelectItems();

		expect(Array.isArray(items)).toBe(true);
		expect(items.length).toBeGreaterThan(0);

		items.forEach((item) => {
			expect(item).toHaveProperty('value');
			expect(item).toHaveProperty('label');
			expect(typeof item.value).toBe('string');
			expect(typeof item.label).toBe('string');
		});
	});

	it('should include offset or UTC in label', () => {
		const items = getTimezoneSelectItems();

		items.forEach((item) => {
			// Offset should be either "UTC+HH:MM", "UTC-HH:MM", or "UTC" (for UTC+00:00)
			expect(item.label).toMatch(/UTC([+-]\d{2}:\d{2})?/);
		});
	});

	it('should prefix common timezones with star', () => {
		const items = getTimezoneSelectItems();
		const commonTimezones = TIMEZONE_GROUPS.Common;

		commonTimezones.forEach((tz) => {
			const item = items.find((i) => i.value === tz);
			expect(item?.label).toMatch(/^★ /);
		});
	});

	it('should not prefix non-common timezones with star', () => {
		const items = getTimezoneSelectItems();
		const nonCommonItem = items.find((i) => i.value === 'Africa/Cairo');

		expect(nonCommonItem?.label).not.toMatch(/^★ /);
	});

	it('should have duplicate values for common timezones', () => {
		const items = getTimezoneSelectItems();
		const values = items.map((i) => i.value);
		const uniqueValues = new Set(values);

		// Common timezones appear twice (once in Common group, once in regional group)
		const commonCount = TIMEZONE_GROUPS.Common.length;
		expect(values.length - uniqueValues.size).toBe(commonCount);
	});

	it('should include all timezones from TIMEZONE_GROUPS', () => {
		const items = getTimezoneSelectItems();
		const itemValues = new Set(items.map((i) => i.value));

		ALL_TIMEZONES.forEach((tz) => {
			expect(itemValues.has(tz)).toBe(true);
		});
	});
});

describe('searchTimezones', () => {
	it('should return first 20 timezones when query is empty', () => {
		const results = searchTimezones('');
		expect(results).toHaveLength(20);
	});

	it('should return first 20 timezones when query is whitespace', () => {
		const results = searchTimezones('   ');
		expect(results).toHaveLength(20);
	});

	it('should search by city name', () => {
		const results = searchTimezones('Paris');
		expect(results).toContain('Europe/Paris');
	});

	it('should search by city name case-insensitively', () => {
		const results = searchTimezones('paris');
		expect(results).toContain('Europe/Paris');

		const results2 = searchTimezones('TOKYO');
		expect(results2).toContain('Asia/Tokyo');
	});

	it('should search by region', () => {
		const results = searchTimezones('Europe');
		const europeTimezones = TIMEZONE_GROUPS.Europe;

		europeTimezones.forEach((tz) => {
			expect(results).toContain(tz);
		});
	});

	it('should search by offset', () => {
		const results = searchTimezones('+09:00');
		expect(results).toContain('Asia/Tokyo'); // UTC+09:00
	});

	it('should search by partial matches', () => {
		const results = searchTimezones('New');
		expect(results).toContain('America/New_York');
	});

	it('should search by full timezone string', () => {
		const results = searchTimezones('America/New_York');
		expect(results).toContain('America/New_York');
	});

	it('should handle searches with no results', () => {
		const results = searchTimezones('NonexistentCity123456789');
		expect(results).toHaveLength(0);
	});

	it('should search across multiple fields', () => {
		// Search for 'Los' should match 'Los Angeles' in label
		const results = searchTimezones('Los');
		expect(results).toContain('America/Los_Angeles');

		// Search for 'America' should match region
		const results2 = searchTimezones('America');
		expect(results2.length).toBeGreaterThan(0);
		results2.forEach((tz) => {
			expect(tz.startsWith('America/')).toBe(true);
		});
	});

	it('should handle special characters gracefully', () => {
		const results = searchTimezones('New_York');
		expect(results).toContain('America/New_York');
	});

	it('should trim query string', () => {
		const results1 = searchTimezones('  Paris  ');
		const results2 = searchTimezones('Paris');

		expect(results1).toEqual(results2);
	});

	it('should return valid timezones only', () => {
		const results = searchTimezones('a'); // Very broad search

		results.forEach((tz) => {
			expect(isValidTimezone(tz)).toBe(true);
		});
	});
});

describe('Timezone Coverage', () => {
	it('should include major world cities', () => {
		const majorCities = [
			'Europe/Paris',
			'Europe/London',
			'America/New_York',
			'America/Los_Angeles',
			'Asia/Tokyo',
			'Asia/Shanghai',
			'Asia/Dubai',
			'Australia/Sydney',
			'Africa/Cairo'
		];

		majorCities.forEach((city) => {
			expect(ALL_TIMEZONES).toContain(city);
		});
	});

	it('should include timezones from all continents', () => {
		const continents = ['Africa', 'America', 'Asia', 'Australia', 'Europe', 'Pacific'];

		continents.forEach((continent) => {
			const hasContinent = ALL_TIMEZONES.some((tz) => tz.startsWith(`${continent}/`));
			expect(hasContinent).toBe(true);
		});
	});

	it('should include Israeli timezone for the project', () => {
		expect(ALL_TIMEZONES).toContain('Asia/Jerusalem');
	});

	it('should include Middle East timezones', () => {
		expect(ALL_TIMEZONES).toContain('Asia/Dubai');
		expect(ALL_TIMEZONES).toContain('Asia/Riyadh');
		expect(ALL_TIMEZONES).toContain('Asia/Baghdad');
	});
});
