/**
 * School Configuration Validation Tests
 * Phase 6: Test suite for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	updateSchoolConfigSchema,
	partialSchoolConfigSchema,
	weekConfigSchema
} from './school-config';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';

describe('weekConfigSchema', () => {
	// ============================================================
	// Valid Configurations
	// ============================================================
	describe('Valid Configurations', () => {
		it('should accept default Israeli week config', () => {
			const result = weekConfigSchema.safeParse(DEFAULT_WEEK_CONFIG);
			expect(result.success).toBe(true);
		});

		it('should accept Western week config (Monday-Friday)', () => {
			const westernConfig = {
				first_day: 1, // Monday
				last_day: 5, // Friday
				school_days: [1, 2, 3, 4, 5], // Monday-Friday
				weekend_days: [0, 6] // Saturday-Sunday
			};

			const result = weekConfigSchema.safeParse(westernConfig);
			expect(result.success).toBe(true);
		});

		it('should accept Middle East config (Sunday-Thursday)', () => {
			const middleEastConfig = {
				first_day: 0, // Sunday
				last_day: 4, // Thursday
				school_days: [0, 1, 2, 3, 4], // Sunday-Thursday
				weekend_days: [5, 6] // Friday-Saturday
			};

			const result = weekConfigSchema.safeParse(middleEastConfig);
			expect(result.success).toBe(true);
		});

		it('should accept 6-day school week', () => {
			const sixDayConfig = {
				first_day: 1, // Monday
				last_day: 6, // Saturday
				school_days: [1, 2, 3, 4, 5, 6], // Monday-Saturday
				weekend_days: [0] // Sunday only
			};

			const result = weekConfigSchema.safeParse(sixDayConfig);
			expect(result.success).toBe(true);
		});

		it('should accept single school day configuration', () => {
			const singleDayConfig = {
				first_day: 1, // Monday
				last_day: 1, // Monday
				school_days: [1], // Monday only
				weekend_days: [0, 2, 3, 4, 5, 6] // All other days
			};

			const result = weekConfigSchema.safeParse(singleDayConfig);
			expect(result.success).toBe(true);
		});

		it('should accept non-contiguous school days', () => {
			const nonContiguousConfig = {
				first_day: 0,
				last_day: 6,
				school_days: [1, 3, 5], // Monday, Wednesday, Friday
				weekend_days: [0, 2, 4, 6] // Tuesday, Thursday, Saturday, Sunday
			};

			const result = weekConfigSchema.safeParse(nonContiguousConfig);
			expect(result.success).toBe(true);
		});
	});

	// ============================================================
	// Invalid Configurations - Missing Days
	// ============================================================
	describe('Invalid - Missing Days', () => {
		it('should reject config with missing days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5], // 5 days
				weekend_days: [6] // Only 1 day (missing day 0)
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('school_days and weekend_days');
			}
		});

		it('should reject config with no weekend days but missing school days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3], // Only 3 days
				weekend_days: [0, 6] // Only 2 days (total = 5, missing 4,5)
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================
	// Invalid Configurations - Overlapping Days
	// ============================================================
	describe('Invalid - Overlapping Days', () => {
		it('should reject config with overlapping days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5, 6], // 6 is also in weekend_days
				weekend_days: [0, 6] // 6 appears in both
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('school_days and weekend_days');
			}
		});

		it('should reject config where all days overlap', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [0, 1, 2, 3, 4, 5, 6],
				weekend_days: [0, 1, 2, 3, 4, 5, 6] // All days in both
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================
	// Invalid Configurations - Empty Arrays
	// ============================================================
	describe('Invalid - Empty Arrays', () => {
		it('should reject config with empty school_days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [], // Empty
				weekend_days: [0, 1, 2, 3, 4, 5, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('school_days');
			}
		});

		it('should accept config with empty weekend_days if all days are school days', () => {
			const config = {
				first_day: 0,
				last_day: 6,
				school_days: [0, 1, 2, 3, 4, 5, 6], // All days
				weekend_days: [] // Empty
			};

			const result = weekConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
		});
	});

	// ============================================================
	// Invalid Configurations - Out of Range
	// ============================================================
	describe('Invalid - Out of Range', () => {
		it('should reject first_day < 0', () => {
			const invalidConfig = {
				first_day: -1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('first_day');
			}
		});

		it('should reject first_day > 6', () => {
			const invalidConfig = {
				first_day: 7,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject last_day < 0', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: -1,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject last_day > 6', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 8,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject school_days with value > 6', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5, 7], // 7 is out of range
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject school_days with negative value', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [-1, 1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject weekend_days with value > 6', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6, 8] // 8 is out of range
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================
	// Invalid Configurations - Type Errors
	// ============================================================
	describe('Invalid - Type Errors', () => {
		it('should reject non-integer first_day', () => {
			const invalidConfig = {
				first_day: 1.5,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject string first_day', () => {
			const invalidConfig = {
				first_day: '1',
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject non-array school_days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: '1,2,3,4,5',
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject school_days with non-integer values', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3.5, 4, 5],
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject missing required fields', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5
				// Missing school_days and weekend_days
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================
	// Edge Cases
	// ============================================================
	describe('Edge Cases', () => {
		it('should handle first_day === last_day', () => {
			const config = {
				first_day: 1,
				last_day: 1,
				school_days: [1],
				weekend_days: [0, 2, 3, 4, 5, 6]
			};

			const result = weekConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
		});

		it('should handle first_day > last_day (week wraps around)', () => {
			const config = {
				first_day: 5, // Friday
				last_day: 1, // Monday (wraps around)
				school_days: [5, 6, 0, 1],
				weekend_days: [2, 3, 4]
			};

			const result = weekConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
		});

		it('should reject duplicate days in school_days', () => {
			// This is validated by isValidWeekConfig helper
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5, 5], // 5 appears twice
				weekend_days: [0, 6]
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		it('should reject duplicate days in weekend_days', () => {
			const invalidConfig = {
				first_day: 1,
				last_day: 5,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6, 6] // 6 appears twice
			};

			const result = weekConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});
});

describe('updateSchoolConfigSchema', () => {
	describe('Valid Input', () => {
		it('should accept valid timezone and week_config', () => {
			const validInput = {
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(validInput);
			expect(result.success).toBe(true);
		});

		it('should accept different valid timezones', () => {
			const timezones = [
				'America/New_York',
				'Asia/Tokyo',
				'Australia/Sydney',
				'Africa/Cairo',
				'Europe/London'
			];

			timezones.forEach((timezone) => {
				const result = updateSchoolConfigSchema.safeParse({
					timezone,
					week_config: DEFAULT_WEEK_CONFIG
				});
				expect(result.success).toBe(true);
			});
		});

		it('should accept different valid week configs', () => {
			const westernConfig = {
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5],
					weekend_days: [0, 6]
				}
			};

			const result = updateSchoolConfigSchema.safeParse(westernConfig);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid Input', () => {
		it('should reject invalid timezone', () => {
			const invalidInput = {
				timezone: 'Invalid/Timezone',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid timezone');
			}
		});

		it('should reject empty timezone', () => {
			const invalidInput = {
				timezone: '',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it('should reject timezone with only whitespace', () => {
			const invalidInput = {
				timezone: '   ',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it('should reject missing timezone', () => {
			const invalidInput = {
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it('should reject missing week_config', () => {
			const invalidInput = {
				timezone: 'Europe/Paris'
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it('should reject invalid week_config', () => {
			const invalidInput = {
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3], // Missing days
					weekend_days: [0, 6]
				}
			};

			const result = updateSchoolConfigSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});
	});

	describe('Type Safety', () => {
		it('should infer correct type for valid data', () => {
			const validInput = {
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(validInput);

			if (result.success) {
				// TypeScript should infer the correct types
				const data = result.data;
				expect(typeof data.timezone).toBe('string');
				expect(typeof data.week_config.first_day).toBe('number');
				expect(Array.isArray(data.week_config.school_days)).toBe(true);
			}
		});
	});

	describe('Trimming', () => {
		it('should trim timezone whitespace', () => {
			const input = {
				timezone: '  Europe/Paris  ',
				week_config: DEFAULT_WEEK_CONFIG
			};

			const result = updateSchoolConfigSchema.safeParse(input);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.timezone).toBe('Europe/Paris');
			}
		});
	});
});

describe('partialSchoolConfigSchema', () => {
	describe('Valid Partial Updates', () => {
		it('should accept only timezone', () => {
			const result = partialSchoolConfigSchema.safeParse({
				timezone: 'Europe/Paris'
			});
			expect(result.success).toBe(true);
		});

		it('should accept only week_config', () => {
			const result = partialSchoolConfigSchema.safeParse({
				week_config: DEFAULT_WEEK_CONFIG
			});
			expect(result.success).toBe(true);
		});

		it('should accept both timezone and week_config', () => {
			const result = partialSchoolConfigSchema.safeParse({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid Partial Updates', () => {
		it('should reject empty object', () => {
			const result = partialSchoolConfigSchema.safeParse({});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('At least one field');
			}
		});

		it('should reject invalid timezone when provided', () => {
			const result = partialSchoolConfigSchema.safeParse({
				timezone: 'Invalid/Timezone'
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid week_config when provided', () => {
			const result = partialSchoolConfigSchema.safeParse({
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [], // Invalid
					weekend_days: [0, 6]
				}
			});
			expect(result.success).toBe(false);
		});
	});
});

describe('Cross-validation', () => {
	it('should validate timezone matches regional expectations for week config', () => {
		// Israeli timezone with Israeli week config
		const israeliInput = {
			timezone: 'Asia/Jerusalem',
			week_config: {
				first_day: 0,
				last_day: 6,
				school_days: [0, 1, 2, 3, 4],
				weekend_days: [5, 6]
			}
		};

		const result = updateSchoolConfigSchema.safeParse(israeliInput);
		expect(result.success).toBe(true);
	});

	it('should allow mismatched timezone and week config (user choice)', () => {
		// European timezone with Israeli week config (unusual but valid)
		const input = {
			timezone: 'Europe/Paris',
			week_config: {
				first_day: 0,
				last_day: 6,
				school_days: [0, 1, 2, 3, 4],
				weekend_days: [5, 6]
			}
		};

		// Schema doesn't enforce regional matching (by design)
		const result = updateSchoolConfigSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});
