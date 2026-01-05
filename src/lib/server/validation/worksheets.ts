/**
 * Worksheet API validation schemas
 *
 * Comprehensive Zod validation for all worksheet-related API endpoints.
 * Based on types from $lib/types/worksheets.ts
 */

import { z } from 'zod';
import { uuidSchema } from './common';
import { exerciseHintSchema } from './exercises';

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
 * Base worksheet config object schema (without optional/default wrappers)
 */
const worksheetConfigObjectSchema = z.object({
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
});

/**
 * Worksheet config schema for CREATE (with default empty object)
 */
export const worksheetConfigSchema = worksheetConfigObjectSchema.optional().default({});

/**
 * Worksheet config schema for UPDATE (no default - only include if explicitly provided)
 */
export const worksheetConfigSchemaForUpdate = worksheetConfigObjectSchema.optional();

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
		.array(z.string().trim().min(1).max(10))
		.max(20, 'Maximum 20 grade levels')
		.optional()
		.default([]),
	tags: z.array(z.string().trim().min(1).max(50)).max(30, 'Maximum 30 tags').optional().default([])
});

/**
 * Schema for updating a worksheet (PUT /api/worksheets/[id])
 * All fields are optional for partial updates.
 * IMPORTANT: No defaults are applied - only explicitly provided fields are included.
 * This prevents overwriting DB values when a field is not in the request.
 */
export const updateWorksheetSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long').optional(),
	description: z.string().trim().max(5000, 'Description too long').optional().nullable(),
	type: worksheetTypeSchema.optional(),
	config: worksheetConfigSchemaForUpdate, // No default - won't be set if not in request
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
		.array(z.string().trim().min(1).max(10))
		.max(20, 'Maximum 20 grade levels')
		.optional(), // No default - won't be set if not in request
	tags: z.array(z.string().trim().min(1).max(50)).max(30, 'Maximum 30 tags').optional(), // No default - won't be set if not in request
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
// STUDENT WORKSHEET API SCHEMAS
// ============================================================================

/**
 * Query params for student worksheets list (GET /api/student/worksheets)
 */
export const studentWorksheetsQuerySchema = z.object({
	class_id: uuidSchema.optional(),
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
		.default(50)
});

/**
 * URL param for student worksheet detail
 */
export const studentWorksheetParamSchema = z.object({
	assignmentId: uuidSchema
});

// ============================================================================
// ASSIGNMENT STUDENT MANAGEMENT SCHEMAS (Teacher API)
// ============================================================================

/**
 * Schema for adding individual students to assignment
 * POST /api/worksheets/[id]/assignments/[assignmentId]/students
 */
export const addAssignmentStudentsSchema = z.object({
	student_ids: z
		.array(uuidSchema)
		.min(1, 'At least one student required')
		.max(200, 'Maximum 200 students per request')
});

/**
 * Schema for removing individual student from assignment
 * DELETE /api/worksheets/[id]/assignments/[assignmentId]/students
 */
export const removeAssignmentStudentSchema = z.object({
	student_id: uuidSchema
});

// ============================================================================
// CORRECTION SETTINGS SCHEMAS (Teacher API)
// ============================================================================

/**
 * Schema for updating global correction setting
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections
 */
export const updateCorrectionSettingsSchema = z.object({
	show_corrections: z.boolean()
});

/**
 * Schema for updating per-exercise correction setting
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections/exercises
 */
export const updateExerciseCorrectionSchema = z.object({
	worksheet_exercise_id: uuidSchema,
	show_correction: z.boolean()
});

/**
 * Schema for bulk updating exercise correction settings
 */
export const bulkUpdateExerciseCorrectionsSchema = z.object({
	settings: z
		.array(
			z.object({
				worksheet_exercise_id: uuidSchema,
				show_correction: z.boolean()
			})
		)
		.min(1, 'At least one setting required')
		.max(200, 'Maximum 200 settings per request')
});

// ============================================================================
// ASSIGNMENT URL PARAMS (extended)
// ============================================================================

/**
 * URL params for assignment-level operations
 */
export const assignmentParamSchema = z.object({
	id: uuidSchema,
	assignmentId: uuidSchema
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

/**
 * Validate student worksheets query params
 */
export function validateStudentWorksheetsQuery(params: URLSearchParams) {
	return studentWorksheetsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student worksheet assignment ID param
 */
export function validateStudentWorksheetParam(params: Record<string, string>) {
	return studentWorksheetParamSchema.safeParse(params);
}

/**
 * Validate add students to assignment request
 */
export function validateAddAssignmentStudents(data: unknown) {
	return addAssignmentStudentsSchema.safeParse(data);
}

/**
 * Validate remove student from assignment request
 */
export function validateRemoveAssignmentStudent(data: unknown) {
	return removeAssignmentStudentSchema.safeParse(data);
}

/**
 * Validate correction settings update
 */
export function validateUpdateCorrectionSettings(data: unknown) {
	return updateCorrectionSettingsSchema.safeParse(data);
}

/**
 * Validate exercise correction update
 */
export function validateUpdateExerciseCorrection(data: unknown) {
	return updateExerciseCorrectionSchema.safeParse(data);
}

/**
 * Validate bulk exercise corrections update
 */
export function validateBulkUpdateExerciseCorrections(data: unknown) {
	return bulkUpdateExerciseCorrectionsSchema.safeParse(data);
}

/**
 * Validate assignment URL params
 */
export function validateAssignmentParams(params: Record<string, string>) {
	return assignmentParamSchema.safeParse(params);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Single worksheet response schema
 */
// Helper for Supabase timestamps (accepts both Z and +00:00 formats)
const timestampSchema = z
	.string()
	.refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid timestamp' });

export const worksheetResponseSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	description: z.string().nullable(),
	type: worksheetTypeSchema,
	config: z.record(z.string(), z.unknown()),
	status: worksheetStatusSchema,
	version: z.number().int(),
	published_at: timestampSchema.nullable(),
	archived_at: timestampSchema.nullable(),
	template_id: z.string().uuid().nullable(),
	estimated_duration_minutes: z.number().int().nullable(),
	total_points: z.number().nullable(),
	grade_levels: z.array(z.string()),
	tags: z.array(z.string()),
	created_by: z.string().uuid(),
	school_id: z.string().uuid().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
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
	created_at: timestampSchema,
	updated_at: timestampSchema
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
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Worksheet exercise with joined exercise data
 * Note: statement_md/solution_md are now in variations (single source of truth)
 */
export const worksheetExerciseWithDataResponseSchema = worksheetExerciseResponseSchema.extend({
	correction_visible: z.boolean().optional(),
	variation_index: z.number().int().nullable().optional(),
	exercise: z
		.object({
			id: z.string().uuid(),
			title: z.string().nullable(),
			difficulty: z.number().int().nullable(),
			variables: z.unknown().nullable(),
			shared: z.unknown().nullable(),
			variations: z.array(z.unknown()).nullable()
		})
		.nullable()
		.optional()
});

/**
 * Worksheet list item schema (includes exercise_count)
 */
export const worksheetListItemSchema = worksheetResponseSchema.extend({
	exercise_count: z.number().int().nonnegative()
});

/**
 * Worksheet list response schema (GET /api/worksheets)
 */
export const worksheetListResponseSchema = z.object({
	worksheets: z.array(worksheetListItemSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Worksheet with sections, exercises and template response schema (GET /api/worksheets/[id])
 */
export const worksheetDetailResponseSchema = z.object({
	worksheet: worksheetResponseSchema.extend({
		sections: z.array(worksheetSectionResponseSchema).optional(),
		exercises: z.array(worksheetExerciseWithDataResponseSchema).optional(),
		template: z
			.object({
				id: z.string().uuid(),
				name: z.string(),
				description: z.string().nullable()
			})
			.nullable()
			.optional()
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

// ============================================================================
// WORKSHEET TEMPLATE SCHEMAS
// ============================================================================

/**
 * Placeholder definition schema
 */
export const templatePlaceholderSchema = z.object({
	key: z.string().trim().min(1, 'Key is required').max(50, 'Key too long'),
	type: z.enum(['text', 'date', 'dynamic']),
	label: z.string().trim().max(100, 'Label too long').optional(),
	default_value: z.string().trim().max(500, 'Default value too long').optional()
});

/**
 * Schema for creating a new template (POST /api/worksheets/templates)
 */
export const createTemplateSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(255, 'Name too long'),
	description: z.string().trim().max(2000, 'Description too long').optional().nullable(),
	template_content: z
		.string()
		.min(1, 'Template content is required')
		.max(50000, 'Template too long'),
	placeholders: z
		.array(templatePlaceholderSchema)
		.max(50, 'Maximum 50 placeholders')
		.optional()
		.default([]),
	is_public: z.boolean().optional().default(false)
});

/**
 * Schema for updating a template (PUT /api/worksheets/templates/[id])
 */
export const updateTemplateSchema = createTemplateSchema.partial();

/**
 * Schema for listing templates query parameters (GET /api/worksheets/templates)
 */
export const listWorksheetTemplatesQuerySchema = z.object({
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
	include_public: z.coerce.boolean().optional().default(true),
	search: z.string().trim().max(200, 'Search query too long').optional()
});

/**
 * Template response schema
 */
export const templateResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	template_content: z.string(),
	placeholders: z.array(templatePlaceholderSchema),
	is_public: z.boolean(),
	created_by: z.string().uuid().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Template list response schema
 */
export const templateListResponseSchema = z.object({
	templates: z.array(templateResponseSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Create template response schema
 */
export const createTemplateResponseSchema = z.object({
	template: templateResponseSchema
});

/**
 * Delete template response schema
 */
export const deleteTemplateResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

// ============================================================================
// TEMPLATE VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create template request body
 */
export function validateCreateTemplate(data: unknown) {
	return createTemplateSchema.safeParse(data);
}

/**
 * Validate update template request body
 */
export function validateUpdateTemplate(data: unknown) {
	return updateTemplateSchema.safeParse(data);
}

/**
 * Validate list templates query parameters
 */
export function validateListTemplatesQuery(params: URLSearchParams) {
	return listWorksheetTemplatesQuerySchema.safeParse(Object.fromEntries(params));
}

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

// ============================================================================
// STUDENT WORKSHEET RESPONSE SCHEMAS
// ============================================================================

/**
 * Student worksheet list item response
 */
export const studentWorksheetListItemSchema = z.object({
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	type: worksheetTypeSchema,
	class_id: z.string().uuid().nullable(),
	class_name: z.string().nullable(),
	available_from: timestampSchema,
	closes_at: timestampSchema.nullable(),
	show_corrections: z.boolean(),
	exercise_count: z.number().int().nonnegative()
});

/**
 * Student worksheets list response
 */
export const studentWorksheetsListResponseSchema = z.object({
	worksheets: z.array(studentWorksheetListItemSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Schema for exercise resources (videos, PDFs, links, etc.)
 */
export const exerciseResourceSchema = z.object({
	type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image'], {
		message: 'Resource type must be video, pdf, link, geogebra, or image'
	}),
	url: z.string().url('Invalid URL').max(2000, 'URL too long'),
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().trim().max(500, 'Description too long').optional()
});

/**
 * Student exercise view response
 */
export const studentExerciseViewSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	/** Exercise title (displayed next to the exercise number) */
	title: z.string().nullable(),
	position: z.number().int().nonnegative(),
	points: z.number().int().nullable(),
	custom_instructions: z.string().nullable(),
	statement: z.string(),
	correction: z.string().nullable(),
	correction_visible: z.boolean(),
	/** Hints from selected variation (for guided exercises) */
	hints: z.array(exerciseHintSchema).optional(),
	/** Supplementary resources (videos, PDFs, links) */
	resources: z.array(exerciseResourceSchema).optional(),
	/** Exercise tags for categorization */
	tags: z.array(z.string()).optional()
});

/**
 * Student worksheet detail response
 */
export const studentWorksheetDetailResponseSchema = z.object({
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	description: z.string().nullable(),
	type: worksheetTypeSchema,
	instructions: z.string().nullable(),
	available_from: timestampSchema,
	closes_at: timestampSchema.nullable(),
	show_corrections: z.boolean(),
	class_name: z.string().nullable(),
	exercises: z.array(studentExerciseViewSchema)
});

// ============================================================================
// TEACHER MANAGEMENT RESPONSE SCHEMAS
// ============================================================================

/**
 * Assignment students response
 */
export const assignmentStudentsResponseSchema = z.object({
	students: z.array(
		z.object({
			id: z.string().uuid(),
			student_id: z.string().uuid(),
			first_name: z.string().nullable(),
			last_name: z.string().nullable(),
			created_at: timestampSchema
		})
	)
});

/**
 * Add students response
 */
export const addStudentsResponseSchema = z.object({
	success: z.literal(true),
	added_count: z.number().int().nonnegative()
});

/**
 * Remove student response
 */
export const removeStudentResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

/**
 * Correction settings response
 */
export const correctionSettingsResponseSchema = z.object({
	show_corrections: z.boolean(),
	exercise_settings: z.array(
		z.object({
			worksheet_exercise_id: z.string().uuid(),
			show_correction: z.boolean()
		})
	)
});

/**
 * Update correction settings response
 */
export const updateCorrectionSettingsResponseSchema = z.object({
	success: z.literal(true),
	show_corrections: z.boolean()
});

/**
 * Update exercise correction response
 */
export const updateExerciseCorrectionResponseSchema = z.object({
	success: z.literal(true),
	worksheet_exercise_id: z.string().uuid(),
	show_correction: z.boolean()
});

// ============================================================================
// WORKSHEET ERROR REPORTS SCHEMAS
// ============================================================================

/**
 * Error report status enum
 */
export const errorReportStatusSchema = z.enum(['pending', 'fixed', 'rejected'], {
	message: 'Invalid error report status'
});

/**
 * Schema for creating an error report (POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report)
 */
export const createErrorReportSchema = z.object({
	// Description is HTML from RichTextEditor with math support
	// Frontend validates plain text length (1000 chars max for UX)
	// Backend accepts up to 5000 chars to accommodate HTML markup + math formulas
	description: z
		.string()
		.trim()
		.min(10, 'La description doit contenir au moins 10 caractères')
		.max(5000, 'La description ne peut pas dépasser 5000 caractères')
});

/**
 * Schema for student updating their own pending report
 * Only allows updating description (status remains pending)
 */
export const updateStudentErrorReportSchema = z.object({
	description: z
		.string()
		.trim()
		.min(10, 'La description doit contenir au moins 10 caractères')
		.max(1000, 'La description ne peut pas dépasser 1000 caractères')
});

/**
 * Schema for teacher reviewing an error report
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * When status is 'fixed':
 * - statement_md is required (updated exercise content)
 * - solution_md is optional (can be null)
 * - response is optional
 *
 * When status is 'rejected':
 * - response is required (rejection reason)
 * - statement_md and solution_md are ignored
 */
/**
 * Variation schema for review error report
 */
const reviewVariationSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

export const reviewErrorReportSchema = z
	.object({
		status: z.enum(['fixed', 'rejected'], {
			message: 'Status must be "fixed" or "rejected"'
		}),
		response: z
			.string()
			.trim()
			.min(1, 'La reponse ne peut pas etre vide')
			.max(2000, 'La reponse ne peut pas depasser 2000 caracteres')
			.nullable()
			.optional()
			.default(null),
		// New: Accept full variations array
		variations: z.array(reviewVariationSchema).optional(),
		// Legacy: Keep for backwards compatibility
		statement_md: z
			.string()
			.trim()
			.min(1, "L'enonce ne peut pas etre vide")
			.max(50000, "L'enonce ne peut pas depasser 50000 caracteres")
			.optional(),
		solution_md: z
			.string()
			.trim()
			.max(50000, 'La solution ne peut pas depasser 50000 caracteres')
			.nullable()
			.optional()
	})
	.refine(
		(data) => {
			// If status is 'rejected', response is required
			if (data.status === 'rejected') {
				return data.response !== null && data.response !== undefined && data.response.length > 0;
			}
			return true;
		},
		{
			message: 'Le motif de rejet est requis',
			path: ['response']
		}
	)
	.refine(
		(data) => {
			// If status is 'fixed', either variations or statement_md is required
			if (data.status === 'fixed') {
				// New format: variations array
				if (data.variations && data.variations.length > 0) {
					return true;
				}
				// Legacy format: statement_md
				return (
					data.statement_md !== undefined &&
					data.statement_md !== null &&
					data.statement_md.length > 0
				);
			}
			return true;
		},
		{
			message: "Les variations ou l'enonce corrige sont requis pour valider la correction",
			path: ['variations']
		}
	);

/**
 * Query params for listing error reports (GET /api/worksheets/[id]/assignments/[assignmentId]/reports)
 */
export const errorReportsQuerySchema = z.object({
	status: errorReportStatusSchema.optional(),
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
		.default(50)
});

/**
 * URL params for error report operations
 */
export const errorReportParamSchema = z.object({
	id: uuidSchema,
	assignmentId: uuidSchema,
	reportId: uuidSchema
});

/**
 * URL params for student error report creation
 */
export const studentErrorReportParamSchema = z.object({
	assignmentId: uuidSchema,
	exerciseId: uuidSchema
});

// ============================================================================
// WORKSHEET ERROR REPORTS RESPONSE SCHEMAS
// ============================================================================

/**
 * Student view of their own error report
 */
export const studentErrorReportViewSchema = z.object({
	id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	exercise_position: z.number().int().nonnegative(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Teacher view of an error report
 */
export const teacherErrorReportViewSchema = z.object({
	id: z.string().uuid(),
	assignment_id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	exercise_position: z.number().int().nonnegative(),
	student_id: z.string().uuid(),
	student_first_name: z.string().nullable(),
	student_last_name: z.string().nullable(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	/** Index of the variation the student saw (0-based). NULL for legacy reports. */
	variation_index: z.number().int().nonnegative().nullable(),
	/** Seed used to generate the student instance. NULL for legacy reports. */
	seed: z.number().int().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Student error reports list response
 */
export const studentErrorReportsListResponseSchema = z.object({
	reports: z.array(studentErrorReportViewSchema)
});

/**
 * Teacher error reports list response with pagination and counts
 */
export const teacherErrorReportsListResponseSchema = z.object({
	reports: z.array(teacherErrorReportViewSchema),
	counts: z.object({
		pending: z.number().int().nonnegative(),
		fixed: z.number().int().nonnegative(),
		rejected: z.number().int().nonnegative(),
		total: z.number().int().nonnegative()
	}),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Create error report response
 */
export const createErrorReportResponseSchema = z.object({
	report: studentErrorReportViewSchema
});

/**
 * Review error report response
 */
export const reviewErrorReportResponseSchema = z.object({
	success: z.literal(true),
	report: teacherErrorReportViewSchema
});

/**
 * Exercise variation schema for error report detail response
 */
const exerciseVariationSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

/**
 * Get single error report detail response (for teacher review page)
 * GET /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Now returns the full exercise with all variations for editing
 */
export const getErrorReportDetailResponseSchema = z.object({
	report: teacherErrorReportViewSchema,
	exercise: z.object({
		id: z.string().uuid(),
		slug: z.string(),
		variations: z.array(exerciseVariationSchema),
		shared: z.unknown().nullable(),
		generic_functions: z.array(z.string()).nullable()
	}),
	context: z.object({
		worksheet_title: z.string(),
		student_name: z.string(),
		exercise_position: z.number().int().nonnegative()
	}),
	next_pending_report_id: z.string().uuid().nullable()
});

// ============================================================================
// WORKSHEET ERROR REPORTS VALIDATION HELPERS
// ============================================================================

/**
 * Validate create error report request body
 */
export function validateCreateErrorReport(data: unknown) {
	return createErrorReportSchema.safeParse(data);
}

/**
 * Validate student update error report request body
 */
export function validateUpdateStudentErrorReport(data: unknown) {
	return updateStudentErrorReportSchema.safeParse(data);
}

/**
 * Validate teacher review error report request body
 */
export function validateReviewErrorReport(data: unknown) {
	return reviewErrorReportSchema.safeParse(data);
}

/**
 * Validate error reports query params
 */
export function validateErrorReportsQuery(params: URLSearchParams) {
	return errorReportsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate error report URL params (teacher)
 */
export function validateErrorReportParams(params: Record<string, string>) {
	return errorReportParamSchema.safeParse(params);
}

/**
 * Validate student error report URL params
 */
export function validateStudentErrorReportParams(params: Record<string, string>) {
	return studentErrorReportParamSchema.safeParse(params);
}

// ============================================================================
// STUDENT ERROR REPORTS API SCHEMAS (GET /api/student/reports)
// ============================================================================

/**
 * Status filter for student reports query
 * 'all' returns all statuses
 */
export const studentReportsStatusFilterSchema = z.enum(['pending', 'fixed', 'rejected', 'all'], {
	message: 'Invalid status filter'
});

/**
 * Query params for student reports list (GET /api/student/reports)
 */
export const studentReportsQuerySchema = z.object({
	status: studentReportsStatusFilterSchema.default('all'),
	assignmentId: uuidSchema.optional(),
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
		.max(50, 'Maximum 50 items per page')
		.default(10)
});

/**
 * URL param for student report ID (DELETE /api/student/reports/[reportId])
 */
export const studentReportIdParamSchema = z.object({
	reportId: uuidSchema
});

// ============================================================================
// STUDENT ERROR REPORTS RESPONSE SCHEMAS
// ============================================================================

// Helper for Supabase timestamps (accepts both Z and +00:00 formats)
const studentReportsTimestampSchema = z
	.string()
	.refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid timestamp' });

/**
 * Extended student error report view with display information
 */
export const studentErrorReportWithDisplaySchema = z.object({
	id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	exercise_position: z.number().int().nonnegative(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	created_at: studentReportsTimestampSchema,
	updated_at: studentReportsTimestampSchema,
	// Extended display fields
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	worksheet_title: z.string(),
	assignment_title: z.string().nullable()
});

/**
 * Student reports list response with pagination
 */
export const studentReportsListResponseSchema = z.object({
	reports: z.array(studentErrorReportWithDisplaySchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Delete report success response
 */
export const deleteStudentReportResponseSchema = z.object({
	success: z.literal(true)
});

// ============================================================================
// STUDENT ERROR REPORTS VALIDATION HELPERS
// ============================================================================

/**
 * Validate student reports query params
 */
export function validateStudentReportsQuery(params: URLSearchParams) {
	return studentReportsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student report ID URL param
 */
export function validateStudentReportIdParam(params: Record<string, string>) {
	return studentReportIdParamSchema.safeParse(params);
}
