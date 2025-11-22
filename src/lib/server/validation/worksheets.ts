/**
 * Worksheet API validation schemas
 *
 * Comprehensive Zod validation for all worksheet-related API endpoints.
 * Based on types from $lib/types/worksheets.ts
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

/**
 * Worksheet type enum
 */
export const worksheetTypeSchema = z.enum(['worksheet', 'assessment', 'exam', 'quiz', 'homework'], {
	message: 'Invalid worksheet type'
});

/**
 * Worksheet status enum
 */
export const worksheetStatusSchema = z.enum(['draft', 'published', 'archived'], {
	message: 'Invalid worksheet status'
});

/**
 * Variant mode enum
 */
export const variantModeSchema = z.enum(['none', 'individual', 'n_versions', 'group'], {
	message: 'Invalid variant mode'
});

/**
 * Numbering style enum
 */
export const numberingStyleSchema = z.enum(['numeric', 'alphabetic', 'roman'], {
	message: 'Invalid numbering style'
});

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

/**
 * Worksheet config schema (for JSONB column)
 */
export const worksheetConfigSchema = z
	.object({
		show_title: z.boolean().optional(),
		show_date: z.boolean().optional(),
		show_student_name: z.boolean().optional(),
		show_class: z.boolean().optional(),
		show_points: z.boolean().optional(),
		numbering_style: numberingStyleSchema.optional(),
		shuffle_exercises: z.boolean().optional(),
		shuffle_within_sections: z.boolean().optional(),
		page_layout: z.enum(['A4', 'Letter']).optional(),
		font_size: z
			.number()
			.int('Font size must be an integer')
			.min(8, 'Font size too small')
			.max(24, 'Font size too large')
			.optional(),
		margins: z
			.object({
				top: z.number().min(0).max(100),
				bottom: z.number().min(0).max(100),
				left: z.number().min(0).max(100),
				right: z.number().min(0).max(100)
			})
			.optional()
	})
	.optional()
	.default({});

/**
 * Variant config schema (for JSONB column)
 */
export const variantConfigSchema = z
	.object({
		mode: variantModeSchema.optional(),
		n_versions: z
			.number()
			.int('Number of versions must be an integer')
			.positive('Number of versions must be positive')
			.max(50, 'Maximum 50 versions')
			.optional(),
		group_size: z
			.number()
			.int('Group size must be an integer')
			.positive('Group size must be positive')
			.max(100, 'Maximum group size is 100')
			.optional(),
		seed_base: z.number().int().optional(),
		parameter_overrides: z.record(z.string(), z.unknown()).optional()
	})
	.optional()
	.default({});

// ============================================================================
// WORKSHEET CRUD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new worksheet (POST /api/worksheets)
 */
export const createWorksheetSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().trim().max(5000, 'Description too long').optional().nullable(),
	type: worksheetTypeSchema.default('worksheet'),
	config: worksheetConfigSchema,
	template_id: uuidSchema.optional().nullable(),
	estimated_duration_minutes: z
		.number()
		.int('Duration must be an integer')
		.positive('Duration must be positive')
		.max(600, 'Duration too long (max 600 minutes)')
		.optional()
		.nullable(),
	total_points: z
		.number()
		.int('Points must be an integer')
		.positive('Points must be positive')
		.max(10000, 'Points too high')
		.optional()
		.nullable(),
	grade_levels: z
		.array(z.number().int().min(1).max(13))
		.max(13, 'Maximum 13 grade levels')
		.optional()
		.default([]),
	tags: z.array(z.string().trim().min(1).max(50)).max(30, 'Maximum 30 tags').optional().default([])
});

/**
 * Schema for updating a worksheet (PUT /api/worksheets/[id])
 * All fields are optional for partial updates
 */
export const updateWorksheetSchema = createWorksheetSchema.partial().extend({
	status: worksheetStatusSchema.optional()
});

/**
 * Schema for listing worksheets query parameters (GET /api/worksheets)
 */
export const listWorksheetsQuerySchema = z.object({
	page: z.coerce
		.number()
		.int('Page must be an integer')
		.positive('Page must be positive')
		.max(1000, 'Page too high')
		.default(1),
	limit: z.coerce
		.number()
		.int('Limit must be an integer')
		.positive('Limit must be positive')
		.max(100, 'Maximum 100 items per page')
		.default(50),
	status: worksheetStatusSchema.optional(),
	type: worksheetTypeSchema.optional(),
	search: z.string().trim().max(200, 'Search query too long').optional()
});

// ============================================================================
// WORKSHEET SECTION SCHEMAS
// ============================================================================

/**
 * Schema for creating a worksheet section (POST /api/worksheets/[id]/sections)
 */
export const createWorksheetSectionSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
	instructions: z.string().trim().max(5000, 'Instructions too long').optional().nullable(),
	position: z
		.number()
		.int('Position must be an integer')
		.nonnegative('Position must be non-negative')
		.max(100, 'Position too high'),
	points_total: z
		.number()
		.int('Points must be an integer')
		.positive('Points must be positive')
		.max(10000, 'Points too high')
		.optional()
		.nullable()
});

/**
 * Schema for updating a worksheet section
 */
export const updateWorksheetSectionSchema = createWorksheetSectionSchema.partial();

// ============================================================================
// WORKSHEET EXERCISE SCHEMAS
// ============================================================================

/**
 * Schema for adding an exercise to a worksheet (POST /api/worksheets/[id]/exercises)
 */
export const createWorksheetExerciseSchema = z.object({
	exercise_id: uuidSchema,
	section_id: uuidSchema.optional().nullable(),
	position: z
		.number()
		.int('Position must be an integer')
		.nonnegative('Position must be non-negative')
		.max(1000, 'Position too high'),
	points: z
		.number()
		.int('Points must be an integer')
		.positive('Points must be positive')
		.max(1000, 'Points too high')
		.optional()
		.nullable(),
	variant_mode: variantModeSchema.default('none'),
	variant_config: variantConfigSchema,
	custom_instructions: z.string().trim().max(5000, 'Instructions too long').optional().nullable()
});

/**
 * Schema for updating a worksheet exercise
 */
export const updateWorksheetExerciseSchema = createWorksheetExerciseSchema.partial();

/**
 * Schema for reordering exercises (PUT /api/worksheets/[id]/exercises)
 */
export const reorderExercisesSchema = z.object({
	exercises: z
		.array(
			z.object({
				id: uuidSchema,
				position: z.number().int().nonnegative().max(1000),
				section_id: uuidSchema.optional().nullable()
			})
		)
		.min(1, 'At least one exercise required')
		.max(200, 'Maximum 200 exercises per batch')
});

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * URL parameter validation for worksheet ID
 */
export const worksheetIdParamSchema = z.object({
	id: uuidSchema
});

/**
 * URL parameter validation for section ID
 */
export const sectionIdParamSchema = z.object({
	id: uuidSchema,
	sectionId: uuidSchema
});

/**
 * URL parameter validation for exercise ID in worksheet
 */
export const worksheetExerciseIdParamSchema = z.object({
	id: uuidSchema,
	exerciseId: uuidSchema
});

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create worksheet request body
 */
export function validateCreateWorksheet(data: unknown) {
	return createWorksheetSchema.safeParse(data);
}

/**
 * Validate update worksheet request body
 */
export function validateUpdateWorksheet(data: unknown) {
	return updateWorksheetSchema.safeParse(data);
}

/**
 * Validate list worksheets query parameters
 */
export function validateListWorksheetsQuery(params: URLSearchParams) {
	return listWorksheetsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate create section request body
 */
export function validateCreateWorksheetSection(data: unknown) {
	return createWorksheetSectionSchema.safeParse(data);
}

/**
 * Validate update section request body
 */
export function validateUpdateWorksheetSection(data: unknown) {
	return updateWorksheetSectionSchema.safeParse(data);
}

/**
 * Validate create worksheet exercise request body
 */
export function validateCreateWorksheetExercise(data: unknown) {
	return createWorksheetExerciseSchema.safeParse(data);
}

/**
 * Validate update worksheet exercise request body
 */
export function validateUpdateWorksheetExercise(data: unknown) {
	return updateWorksheetExerciseSchema.safeParse(data);
}

/**
 * Validate reorder exercises request body
 */
export function validateReorderExercises(data: unknown) {
	return reorderExercisesSchema.safeParse(data);
}

/**
 * Validate worksheet ID URL parameter
 */
export function validateWorksheetId(params: Record<string, string>) {
	return worksheetIdParamSchema.safeParse(params);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Single worksheet response schema
 */
export const worksheetResponseSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	description: z.string().nullable(),
	type: worksheetTypeSchema,
	config: z.record(z.string(), z.unknown()),
	status: worksheetStatusSchema,
	version: z.number().int(),
	published_at: z.string().datetime().nullable(),
	archived_at: z.string().datetime().nullable(),
	template_id: z.string().uuid().nullable(),
	estimated_duration_minutes: z.number().int().nullable(),
	total_points: z.number().int().nullable(),
	grade_levels: z.array(z.number().int()),
	tags: z.array(z.string()),
	created_by: z.string().uuid(),
	school_id: z.string().uuid().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Worksheet section response schema
 */
export const worksheetSectionResponseSchema = z.object({
	id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	instructions: z.string().nullable(),
	position: z.number().int(),
	points_total: z.number().int().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Worksheet exercise response schema
 */
export const worksheetExerciseResponseSchema = z.object({
	id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	section_id: z.string().uuid().nullable(),
	position: z.number().int(),
	points: z.number().int().nullable(),
	variant_mode: variantModeSchema,
	variant_config: z.record(z.string(), z.unknown()),
	custom_instructions: z.string().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Worksheet exercise with joined exercise data
 */
export const worksheetExerciseWithDataResponseSchema = worksheetExerciseResponseSchema.extend({
	exercise: z
		.object({
			id: z.string().uuid(),
			title: z.string().nullable(),
			statement_md: z.string(),
			solution_md: z.string().nullable(),
			difficulty: z.number().int().nullable(),
			variables: z.unknown().nullable()
		})
		.optional()
});

/**
 * Worksheet list response schema (GET /api/worksheets)
 */
export const worksheetListResponseSchema = z.object({
	worksheets: z.array(worksheetResponseSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Worksheet with sections and exercises response schema (GET /api/worksheets/[id])
 */
export const worksheetDetailResponseSchema = z.object({
	worksheet: worksheetResponseSchema.extend({
		sections: z.array(worksheetSectionResponseSchema).optional(),
		exercises: z.array(worksheetExerciseWithDataResponseSchema).optional()
	})
});

/**
 * Create worksheet response schema (POST /api/worksheets)
 */
export const createWorksheetResponseSchema = z.object({
	worksheet: worksheetResponseSchema
});

/**
 * Delete worksheet response schema
 */
export const deleteWorksheetResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

/**
 * Sections list response schema
 */
export const worksheetSectionsResponseSchema = z.object({
	sections: z.array(worksheetSectionResponseSchema)
});

/**
 * Create section response schema
 */
export const createSectionResponseSchema = z.object({
	section: worksheetSectionResponseSchema
});

/**
 * Exercises list response schema
 */
export const worksheetExercisesResponseSchema = z.object({
	exercises: z.array(worksheetExerciseWithDataResponseSchema)
});

/**
 * Create worksheet exercise response schema
 */
export const createWorksheetExerciseResponseSchema = z.object({
	exercise: worksheetExerciseResponseSchema
});

/**
 * Reorder exercises response schema
 */
export const reorderExercisesResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	updated_count: z.number().int().nonnegative()
});
