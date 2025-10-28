/**
 * Riddles validation schemas
 */

import { z } from 'zod';
import { formDataTransforms, difficultySchema } from './common';

/**
 * Schema for riddle answer submission
 */
export const riddleAnswerSchema = z.object({
	answer: z.union([z.string().max(1000), z.number().finite(), z.boolean()])
});

// ============================================================================
// RIDDLE FORM SCHEMAS
// ============================================================================

/**
 * Create/Update riddle form schema
 */
export const riddleFormSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200)'),
	genre: formDataTransforms.optionalString.nullable(),
	difficulty: formDataTransforms.int.pipe(difficultySchema),
	statement: z.string().min(1, 'Énoncé requis').max(10000, 'Énoncé trop long (max 10000)'),
	correction: z
		.string()
		.min(1, 'Correction requise')
		.max(10000, 'Correction trop longue (max 10000)'),
	image_url: formDataTransforms.optionalString.nullable(),
	answer: z.string().nullable().optional(), // JSON string, parsed separately
	status: z.enum(['draft', 'published'])
});

/**
 * Set riddle of the day schema
 */
export const riddleOfTheDaySchema = z.object({
	riddle_id: formDataTransforms.uuid
});

/**
 * Validate riddle attempt schema
 */
export const validateRiddleAttemptSchema = z.object({
	attempt_id: formDataTransforms.uuid,
	is_valid: formDataTransforms.boolean,
	points_awarded: formDataTransforms.int.pipe(z.number().int().min(0).max(100)),
	teacher_comment: formDataTransforms.optionalString.nullable()
});
