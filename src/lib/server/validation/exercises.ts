/**
 * Exercise API validation schemas
 *
 * Comprehensive Zod validation for all exercise-related API endpoints.
 * Re-exports existing validation from $lib/exercises/validation.ts and adds
 * additional schemas for API endpoints.
 */

import { z } from 'zod';

// ============================================================================
// RE-EXPORT EXISTING VALIDATION
// ============================================================================

// Re-export existing excellent validation from exercise import/export
export {
	exerciseExportSchema,
	exerciseFrontmatterSchema,
	exerciseExportArraySchema,
	templateDataSchema,
	templateCreateSchema,
	validateExerciseExport,
	validateExerciseExportArray,
	validateExercisesArray,
	validateFrontmatter,
	validateTemplateCreate,
	sanitizeExerciseForInsert,
	type ValidatedExerciseExport,
	type ValidatedExerciseFrontmatter,
	type ValidatedTemplateCreate
} from '$lib/exercises/validation';

// ============================================================================
// API ENDPOINT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new exercise (POST /api/exercises)
 */
export const createExerciseSchema = z.object({
	statement_md: z.string().trim().min(1, 'Statement is required').max(50000, 'Statement too long'),
	solution_md: z.string().trim().min(1, 'Solution is required').max(50000, 'Solution too long'),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)], {
		message: 'Difficulty must be 1 (easy), 2 (medium), or 3 (hard)'
	}),
	tags: z
		.array(z.string().trim().min(1).max(50))
		.max(20, 'Maximum 20 tags allowed')
		.default([])
		.optional(),
	grade_levels: z
		.array(z.string().trim().min(1).max(20))
		.min(1, 'At least one grade level required')
		.max(7, 'Maximum 7 grade levels')
		.optional(),
	topic: z.string().trim().max(100, 'Topic too long').optional(),
	source: z.string().trim().max(200, 'Source too long').optional(),
	title: z.string().trim().max(200, 'Title too long').optional(),
	variables: z.record(z.string(), z.any()).optional(),
	is_public: z.boolean().default(false).optional()
});

/**
 * Schema for updating an exercise (PUT /api/exercises/[id])
 * All fields are optional for partial updates
 */
export const updateExerciseSchema = createExerciseSchema.partial();

/**
 * Schema for listing exercises query parameters (GET /api/exercises)
 */
export const listExercisesQuerySchema = z.object({
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
	difficulty: z.coerce
		.number()
		.int()
		.min(1, 'Difficulty must be 1, 2, or 3')
		.max(3, 'Difficulty must be 1, 2, or 3')
		.optional(),
	grade_levels: z.string().max(200).optional(), // Comma-separated
	topic: z.string().trim().max(100).optional(),
	tags: z.string().max(500).optional(), // Comma-separated
	search: z.string().trim().max(200, 'Search query too long').optional()
});

/**
 * Schema for bulk assignment (POST /api/exercises/[id]/assign - bulk mode)
 */
export const bulkAssignSchema = z
	.object({
		students: z
			.array(z.string().uuid('Invalid student ID'))
			.max(200, 'Maximum 200 students')
			.optional(),
		classes: z.array(z.string().uuid('Invalid class ID')).max(50, 'Maximum 50 classes').optional(),
		make_public: z.boolean().optional(),
		optional_deadline: z.string().datetime('Invalid datetime format').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes too long').optional()
	})
	.refine(
		(data) =>
			(data.students && data.students.length > 0) ||
			(data.classes && data.classes.length > 0) ||
			data.make_public === true,
		{
			message: 'Must specify at least one student, class, or make_public=true'
		}
	);

/**
 * Schema for single assignment (POST /api/exercises/[id]/assign - single mode)
 */
export const singleAssignSchema = z
	.object({
		assigned_to_type: z.enum(['student', 'class', 'public'], {
			message: 'Invalid assignment type'
		}),
		student_id: z.string().uuid('Invalid student ID').optional(),
		class_id: z.string().uuid('Invalid class ID').optional(),
		optional_deadline: z.string().datetime('Invalid datetime format').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes too long').optional()
	})
	.refine(
		(data) => {
			if (data.assigned_to_type === 'student') return !!data.student_id;
			if (data.assigned_to_type === 'class') return !!data.class_id;
			return true; // public doesn't need student_id or class_id
		},
		{
			message: 'Must provide student_id for student assignments or class_id for class assignments'
		}
	);

/**
 * Schema for assignment query parameters (GET /api/exercises/[id]/assign)
 */
export const assignmentQuerySchema = z.object({
	type: z
		.enum(['student', 'class', 'public'], {
			message: 'Invalid type filter'
		})
		.optional(),
	active: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	has_deadline: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
});

/**
 * Schema for student exercise filters (GET /api/exercises/assigned)
 */
export const studentExerciseFiltersSchema = z.object({
	completed: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	assigned_only: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	public: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	has_deadline: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	search: z.string().trim().max(200, 'Search query too long').optional()
});

/**
 * Schema for export request body (POST /api/exercises/export)
 */
export const exportExercisesSchema = z.object({
	exercise_ids: z
		.array(z.string().uuid('Invalid exercise ID'))
		.min(1, 'At least one exercise ID required')
		.max(100, 'Maximum 100 exercises per export'),
	format: z.enum(['json', 'markdown'], {
		message: 'Format must be "json" or "markdown"'
	}),
	pretty_print: z.boolean().default(true).optional()
});

/**
 * Schema for single exercise export query params (GET /api/exercises/[id]/export)
 */
export const exportSingleExerciseQuerySchema = z.object({
	format: z
		.enum(['json', 'markdown'], {
			message: 'Format must be "json" or "markdown"'
		})
		.default('json'),
	pretty: z
		.string()
		.default('true')
		.transform((val) => val !== 'false')
});

/**
 * Schema for marking exercise as viewed (POST /api/exercises/[id]/view)
 */
export const viewExerciseSchema = z.object({
	assignment_id: z.string().uuid('Invalid assignment ID').optional()
});

/**
 * Schema for importing exercises (POST /api/exercises/import)
 * Supports both JSON and Markdown formats with import options
 */
export const importExercisesSchema = z.object({
	format: z.enum(['json', 'markdown'], {
		message: 'Format must be "json" or "markdown"'
	}),
	content: z.union([z.string().min(1, 'Content is required'), z.record(z.string(), z.any())]),
	options: z
		.object({
			on_duplicate: z
				.enum(['skip', 'replace', 'create-copy'], {
					message: 'on_duplicate must be "skip", "replace", or "create-copy"'
				})
				.default('skip')
				.optional(),
			validate: z.boolean().default(true).optional()
		})
		.optional()
});

/**
 * Schema for updating assignment (PATCH /api/exercises/assignments/[assignmentId])
 */
export const updateAssignmentSchema = z
	.object({
		optional_deadline: z.string().datetime('Invalid datetime format').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes too long').optional(),
		is_active: z.boolean().optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create exercise request body
 */
export function validateCreateExercise(data: unknown) {
	return createExerciseSchema.safeParse(data);
}

/**
 * Validate update exercise request body
 */
export function validateUpdateExercise(data: unknown) {
	return updateExerciseSchema.safeParse(data);
}

/**
 * Validate list exercises query parameters
 */
export function validateListExercisesQuery(params: URLSearchParams) {
	return listExercisesQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate bulk assignment request body
 */
export function validateBulkAssign(data: unknown) {
	return bulkAssignSchema.safeParse(data);
}

/**
 * Validate single assignment request body
 */
export function validateSingleAssign(data: unknown) {
	return singleAssignSchema.safeParse(data);
}

/**
 * Validate assignment query parameters
 */
export function validateAssignmentQuery(params: URLSearchParams) {
	return assignmentQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student exercise filters
 */
export function validateStudentExerciseFilters(params: URLSearchParams) {
	return studentExerciseFiltersSchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate export exercises request body
 */
export function validateExportExercises(data: unknown) {
	return exportExercisesSchema.safeParse(data);
}

/**
 * Validate single exercise export query parameters
 */
export function validateExportSingleExerciseQuery(params: URLSearchParams) {
	return exportSingleExerciseQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate view exercise request body
 */
export function validateViewExercise(data: unknown) {
	return viewExerciseSchema.safeParse(data);
}

/**
 * Validate update assignment request body
 */
export function validateUpdateAssignment(data: unknown) {
	return updateAssignmentSchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Single exercise response schema
 */
export const exerciseResponseSchema = z.object({
	id: z.string().uuid(),
	statement_md: z.string(),
	solution_md: z.string(),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	tags: z.array(z.string()).optional(),
	grade_levels: z.array(z.string()).optional(),
	topic: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	title: z.string().nullable().optional(),
	variables: z.record(z.string(), z.any()).nullable().optional(),
	is_public: z.boolean(),
	created_by: z.string().uuid(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Exercise list response schema (GET /api/exercises)
 */
export const exerciseListResponseSchema = z.object({
	exercises: z.array(exerciseResponseSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Exercise detail response schema (GET /api/exercises/[id])
 */
export const exerciseDetailResponseSchema = z.object({
	exercise: exerciseResponseSchema
});

/**
 * Create exercise response schema (POST /api/exercises)
 */
export const createExerciseResponseSchema = z.object({
	exercise: exerciseResponseSchema
});

/**
 * Exercise assignment schema
 */
export const exerciseAssignmentSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	assigned_to_type: z.enum(['student', 'class', 'public']),
	student_id: z.string().uuid().nullable().optional(),
	class_id: z.string().uuid().nullable().optional(),
	assigned_by: z.string().uuid(),
	optional_deadline: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	is_active: z.boolean(),
	created_at: z.string().datetime()
});

/**
 * Exercise assignments response schema
 */
export const exerciseAssignmentsResponseSchema = z.object({
	assignments: z.array(exerciseAssignmentSchema)
});

/**
 * Assigned exercise (for student view) schema
 */
export const assignedExerciseSchema = z.object({
	id: z.string().uuid(),
	statement_md: z.string(),
	solution_md: z.string(),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	tags: z.array(z.string()).optional(),
	grade_levels: z.array(z.string()).optional(),
	topic: z.string().nullable().optional(),
	title: z.string().nullable().optional(),
	assignment_id: z.string().uuid().nullable().optional(),
	optional_deadline: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	completed: z.boolean().optional(),
	completed_at: z.string().datetime().nullable().optional()
});

/**
 * Student exercises response schema (GET /api/exercises/assigned)
 */
export const studentExercisesResponseSchema = z.object({
	exercises: z.array(assignedExerciseSchema)
});

/**
 * Exercise stats schema
 */
export const exerciseStatsSchema = z.object({
	total_assignments: z.number().int().nonnegative(),
	completed_count: z.number().int().nonnegative(),
	completion_rate: z.number().min(0).max(100),
	average_time_minutes: z.number().nonnegative().nullable().optional()
});

/**
 * Exercise stats response schema (GET /api/exercises/[id]/stats)
 */
export const exerciseStatsResponseSchema = z.object({
	stats: exerciseStatsSchema
});

/**
 * Exercise export response schema
 */
export const exerciseExportResponseSchema = z.object({
	exercise: exerciseResponseSchema,
	format: z.enum(['json', 'markdown'])
});

/**
 * Bulk assignment response schema
 */
export const bulkAssignmentResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	assignments_created: z.number().int().nonnegative()
});

/**
 * View exercise response schema (POST /api/exercises/[id]/view)
 */
export const viewExerciseResponseSchema = z.object({
	success: z.literal(true),
	viewed_at: z.string().datetime()
});

/**
 * Complete exercise response schema (POST /api/exercises/[id]/complete)
 */
export const completeExerciseResponseSchema = z.object({
	success: z.literal(true),
	completed_at: z.string().datetime()
});
