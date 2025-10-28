/**
 * Classes validation schemas
 */

import { z } from 'zod';
import { gradeSchema, formDataTransforms } from './common';

/**
 * School year format: YYYY-YYYY (e.g., "2024-2025")
 */
export const schoolYearSchema = z
	.string()
	.regex(/^\d{4}-\d{4}$/, 'Format invalide (attendu: YYYY-YYYY, ex: 2024-2025)')
	.refine(
		(year) => {
			const [start, end] = year.split('-').map(Number);
			return end === start + 1;
		},
		{ message: "L'année de fin doit être l'année suivant l'année de début" }
	);

/**
 * Schema for creating a class
 */
export const createClassSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long (max 100 caractères)'),
	grade: gradeSchema,
	school_year: schoolYearSchema,
	description: z.string().max(500, 'Description trop longue (max 500 caractères)').optional()
});

/**
 * Schema for updating a class (all fields optional)
 */
export const updateClassSchema = createClassSchema.partial();

/**
 * Schema for getting students in a class
 */
export const getClassStudentsSchema = z.object({
	includeStats: z.coerce.boolean().default(false)
});

// ============================================================================
// CLASS SCHEDULE FORM SCHEMAS
// ============================================================================

/**
 * Day of week (0 = Sunday, 4 = Thursday for Israeli school week)
 */
const dayOfWeekSchema = z.number().int().min(0).max(4);

/**
 * Time format HH:MM
 */
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Format invalide (attendu: HH:MM)');

/**
 * Create schedule entry schema
 */
export const createScheduleEntrySchema = z.object({
	class_id: formDataTransforms.uuid,
	day_of_week: formDataTransforms.int.pipe(dayOfWeekSchema),
	period_number: formDataTransforms.int.pipe(z.number().int().min(1).max(10)),
	start_time: timeSchema,
	end_time: timeSchema,
	subject: formDataTransforms.optionalString.nullable(),
	room: formDataTransforms.optionalString.nullable(),
	notes: formDataTransforms.optionalString.nullable()
});

/**
 * Update schedule entry schema
 */
export const updateScheduleEntrySchema = z.object({
	id: formDataTransforms.uuid,
	day_of_week: formDataTransforms.int.pipe(dayOfWeekSchema),
	period_number: formDataTransforms.int.pipe(z.number().int().min(1).max(10)),
	start_time: timeSchema,
	end_time: timeSchema,
	subject: formDataTransforms.optionalString.nullable(),
	room: formDataTransforms.optionalString.nullable(),
	notes: formDataTransforms.optionalString.nullable()
});

/**
 * Delete schedule entry schema
 */
export const deleteScheduleEntrySchema = z.object({
	id: formDataTransforms.uuid
});
