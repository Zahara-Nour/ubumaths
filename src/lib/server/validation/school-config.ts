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
			.int('Le premier jour doit être un nombre entier')
			.min(0, 'Le premier jour doit être compris entre 0 et 6')
			.max(6, 'Le premier jour doit être compris entre 0 et 6'),
		last_day: z
			.number()
			.int('Le dernier jour doit être un nombre entier')
			.min(0, 'Le dernier jour doit être compris entre 0 et 6')
			.max(6, 'Le dernier jour doit être compris entre 0 et 6'),
		school_days: z
			.array(
				z
					.number()
					.int('Les jours de classe doivent être des nombres entiers')
					.min(0, 'Les jours de classe doivent être compris entre 0 et 6')
					.max(6, 'Les jours de classe doivent être compris entre 0 et 6')
			)
			.min(1, 'Au moins un jour de classe requis')
			.max(7, 'Sept jours de classe au maximum'),
		weekend_days: z
			.array(
				z
					.number()
					.int('Les jours de week-end doivent être des nombres entiers')
					.min(0, 'Les jours de week-end doivent être compris entre 0 et 6')
					.max(6, 'Les jours de week-end doivent être compris entre 0 et 6')
			)
			.min(0, 'Les jours de week-end doivent former une liste')
			.max(7, 'Sept jours de week-end au maximum')
	})
	.refine((data) => isValidWeekConfig(data), {
		message:
			'Semaine invalide : les jours de classe et de week-end doivent couvrir les 7 jours sans se chevaucher'
	});

/**
 * Timezone validation schema
 * Must be a valid IANA timezone string
 */
const timezoneSchema = z
	.string()
	.trim()
	.min(1, 'Fuseau horaire requis')
	.refine(
		(tz): tz is (typeof ALL_TIMEZONES)[number] =>
			ALL_TIMEZONES.includes(tz as (typeof ALL_TIMEZONES)[number]),
		{
			message: 'Fuseau horaire invalide (ex. Europe/Paris, America/New_York)'
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
 * Export week config schema for reuse
 */
export { weekConfigSchema };
