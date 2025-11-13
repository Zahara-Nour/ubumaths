/**
 * Validation schemas for school configuration
 * Phase 5: Timezone and week configuration for daily summaries
 */

import { z } from 'zod';
import { ALL_TIMEZONES } from '$lib/utils/timezones';
import { isValidWeekConfig } from '$lib/utils/week-config';

/**
 * Week configuration schema
 * Validates:
 * - first_day and last_day are 0-6
 * - school_days and weekend_days are arrays of 0-6
 * - No overlap between school_days and weekend_days
 * - All 7 days are covered
 */
const weekConfigSchema = z
	.object({
		first_day: z
			.number()
			.int('first_day must be an integer')
			.min(0, 'first_day must be between 0-6')
			.max(6, 'first_day must be between 0-6'),
		last_day: z
			.number()
			.int('last_day must be an integer')
			.min(0, 'last_day must be between 0-6')
			.max(6, 'last_day must be between 0-6'),
		school_days: z
			.array(
				z
					.number()
					.int('school_days must contain integers')
					.min(0, 'school_days must be 0-6')
					.max(6, 'school_days must be 0-6')
			)
			.min(1, 'school_days must contain at least 1 day')
			.max(7, 'school_days cannot exceed 7 days'),
		weekend_days: z
			.array(
				z
					.number()
					.int('weekend_days must contain integers')
					.min(0, 'weekend_days must be 0-6')
					.max(6, 'weekend_days must be 0-6')
			)
			.min(0, 'weekend_days must be an array')
			.max(7, 'weekend_days cannot exceed 7 days')
	})
	.refine((data) => isValidWeekConfig(data), {
		message:
			'Invalid week configuration: school_days and weekend_days must cover all 7 days without overlap'
	});

/**
 * Timezone validation schema
 * Must be a valid IANA timezone string
 */
const timezoneSchema = z
	.string()
	.trim()
	.min(1, 'Timezone cannot be empty')
	.refine(
		(tz): tz is (typeof ALL_TIMEZONES)[number] =>
			ALL_TIMEZONES.includes(tz as (typeof ALL_TIMEZONES)[number]),
		{
			message:
				'Invalid timezone. Must be a valid IANA timezone (e.g., Europe/Paris, America/New_York)'
		}
	);

/**
 * School configuration update schema (API body)
 * Used by PUT /api/admin/schools/[schoolId]/config
 */
export const updateSchoolConfigSchema = z.object({
	timezone: timezoneSchema,
	week_config: weekConfigSchema
});

/**
 * Type for validated school configuration
 */
export type ValidatedSchoolConfig = z.infer<typeof updateSchoolConfigSchema>;

/**
 * Partial school configuration update schema
 * Allows updating only timezone OR week_config
 */
export const partialSchoolConfigSchema = z
	.object({
		timezone: timezoneSchema.optional(),
		week_config: weekConfigSchema.optional()
	})
	.refine((data) => data.timezone !== undefined || data.week_config !== undefined, {
		message: 'At least one field (timezone or week_config) must be provided'
	});

/**
 * Export week config schema for reuse
 */
export { weekConfigSchema };
