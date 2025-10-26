/**
 * Validation schemas for Exercise Bank import/export
 *
 * Uses Zod for runtime validation of exercise data during import operations.
 * Ensures data integrity and provides helpful error messages.
 *
 * @module exercises/validation
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Schema for difficulty level (1, 2, or 3)
 */
const difficultySchema = z
	.union([z.literal(1), z.literal(2), z.literal(3)])
	.describe('Difficulty must be 1 (easy), 2 (medium), or 3 (hard)');

/**
 * Schema for tags array
 */
const tagsSchema = z
	.array(z.string().trim().min(1, 'Tag cannot be empty'))
	.default([])
	.transform((tags) => tags.filter(Boolean)); // Remove empty strings

/**
 * Schema for grade levels array
 */
const gradeLevelsSchema = z
	.array(z.string().trim())
	.optional()
	.transform((levels) => (levels ? levels.filter(Boolean) : undefined));

// ============================================================================
// EXPORT FORMAT SCHEMA
// ============================================================================

/**
 * Schema for ExerciseExport (clean export format)
 * Used for JSON import/export
 */
export const exerciseExportSchema = z.object({
	version: z.literal('1.0'),

	// Metadata
	title: z.string().trim().optional(),
	source: z.string().trim().optional(),
	difficulty: difficultySchema,
	tags: tagsSchema,

	// Content (required)
	statement_md: z.string().trim().min(1, 'Exercise statement cannot be empty'),
	solution_md: z.string().trim().min(1, 'Exercise solution cannot be empty'),

	// Additional metadata
	estimated_time_minutes: z.number().int().positive().optional(),
	grade_levels: gradeLevelsSchema,
	topic: z.string().trim().optional()
});

/**
 * Type inferred from export schema
 */
export type ValidatedExerciseExport = z.infer<typeof exerciseExportSchema>;

// ============================================================================
// FRONTMATTER SCHEMA
// ============================================================================

/**
 * Schema for ExerciseFrontmatter (YAML frontmatter in Markdown files)
 */
export const exerciseFrontmatterSchema = z.object({
	version: z.literal('1.0'),

	// Metadata
	title: z.string().trim().optional(),
	source: z.string().trim().optional(),
	difficulty: difficultySchema,
	tags: tagsSchema,
	estimated_time_minutes: z.number().int().positive().optional(),
	grade_levels: gradeLevelsSchema,
	topic: z.string().trim().optional()
});

/**
 * Type inferred from frontmatter schema
 */
export type ValidatedExerciseFrontmatter = z.infer<typeof exerciseFrontmatterSchema>;

// ============================================================================
// ARRAY SCHEMAS (for bulk import)
// ============================================================================

/**
 * Schema for array of exercises (for bulk JSON import)
 */
export const exerciseExportArraySchema = z
	.array(exerciseExportSchema)
	.min(1, 'At least one exercise is required');

// ============================================================================
// TEMPLATE SCHEMA
// ============================================================================

/**
 * Schema for exercise template data
 */
export const templateDataSchema = exerciseExportSchema;

/**
 * Schema for template creation
 */
export const templateCreateSchema = z.object({
	title: z.string().trim().min(1, 'Template title is required'),
	description: z.string().trim().optional(),
	template_data: templateDataSchema,
	is_system: z.boolean().default(false)
});

/**
 * Type inferred from template create schema
 */
export type ValidatedTemplateCreate = z.infer<typeof templateCreateSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate a single exercise export
 *
 * @param data - Exercise data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateExerciseExport(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseExport;
	error?: string;
} {
	try {
		const validated = exerciseExportSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Validate an array of exercise exports (bulk import)
 *
 * @param data - Array of exercise data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateExerciseExportArray(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseExport[];
	error?: string;
} {
	try {
		const validated = exerciseExportArraySchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Alias for validateExerciseExportArray (shorter name for convenience)
 */
export const validateExercisesArray = validateExerciseExportArray;

/**
 * Validate frontmatter data from markdown file
 *
 * @param data - Frontmatter data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateFrontmatter(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseFrontmatter;
	error?: string;
} {
	try {
		const validated = exerciseFrontmatterSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Validate template data
 *
 * @param data - Template data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateTemplateCreate(data: unknown): {
	success: boolean;
	data?: ValidatedTemplateCreate;
	error?: string;
} {
	try {
		const validated = templateCreateSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize and prepare exercise data for database insertion
 * Removes any extra fields that aren't in the schema
 *
 * @param data - Validated exercise export data
 * @returns Clean data ready for DB insertion
 */
export function sanitizeExerciseForInsert(
	data: ValidatedExerciseExport
): Omit<ValidatedExerciseExport, 'version'> {
	// Remove version field as it's not stored in the database
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { version, ...exerciseData } = data;
	return exerciseData;
}
