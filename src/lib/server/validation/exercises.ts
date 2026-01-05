/**
 * Exercise API validation schemas
 *
 * Comprehensive Zod validation for all exercise-related API endpoints.
 * Re-exports existing validation from $lib/exercises/validation.ts and adds
 * additional schemas for API endpoints.
 */

import { z } from 'zod';
import { gradeCodeSchema, gradeFlexibleSchema } from './grades';

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
/**
 * Schema for valid function identifier names.
 * Must start with a letter, followed by letters, numbers, or underscores.
 */
const functionIdentifierSchema = z
	.string()
	.min(1, 'Function name cannot be empty')
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_]*$/,
		'Function name must start with a letter and contain only letters, numbers, or underscores'
	);

// ============================================================================
// VARIATIONS SYSTEM SCHEMAS
// ============================================================================

/**
 * Schema for exercise variables (used in variations and shared defaults)
 */
export const variableSchema = z.object({
	name: z.string().trim().min(1, 'Variable name required').max(50, 'Variable name too long'),
	expression: z.string().trim().min(1, 'Expression required').max(1000, 'Expression too long'),
	displayOptions: z.record(z.string(), z.any()).optional()
});

/**
 * Schema for exercise hints (videos, PDFs, links, GeoGebra, images)
 */
export const exerciseHintSchema = z.object({
	id: z
		.string()
		.trim()
		.min(1, 'Hint ID is required')
		.max(50, 'Hint ID too long')
		.regex(
			/^[a-zA-Z][a-zA-Z0-9_-]*$/,
			'Hint ID must start with a letter and contain only letters, numbers, dashes, and underscores'
		),
	type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image'], {
		message: 'Hint type must be video, pdf, link, geogebra, or image'
	}),
	url: z.string().url('Invalid URL').max(2000, 'URL too long'),
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
	description: z.string().trim().max(500, 'Description too long').optional()
});

/**
 * Schema for exercise variations (alternative versions of an exercise)
 */
export const exerciseVariationSchema = z
	.object({
		label: z.string().trim().min(1, 'Label is required').max(50, 'Label too long'),
		statement_md: z
			.string()
			.trim()
			.min(1, 'Statement is required')
			.max(50000, 'Statement too long'),
		solution_md: z.string().trim().min(1, 'Solution is required').max(50000, 'Solution too long'),
		variables: z.array(variableSchema).max(100, 'Maximum 100 variables per variation').optional(),
		hints: z.array(exerciseHintSchema).max(20, 'Maximum 20 hints per variation').optional()
	})
	.refine(
		(data) => {
			// Validate that all {{hint:id}} references in content have corresponding hints defined
			if (!data.hints?.length) {
				// Check if there are any hint references without hints
				const hintRefs = [
					...data.statement_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g),
					...data.solution_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g)
				];
				return hintRefs.length === 0; // No hints defined means no references allowed
			}

			const hintIds = new Set(data.hints.map((h) => h.id));
			const referencedIds = [
				...data.statement_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g),
				...data.solution_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g)
			].map((m) => m[1]);

			return referencedIds.every((id) => hintIds.has(id));
		},
		{ message: 'All {{hint:id}} references must have corresponding hints defined' }
	);

/**
 * Schema for shared exercise defaults (applied to all variations)
 */
export const sharedExerciseDefaultsSchema = z
	.object({
		variables: z.array(variableSchema).max(100, 'Maximum 100 shared variables').optional(),
		statement_md: z.string().trim().max(50000, 'Statement too long').optional(),
		solution_md: z.string().trim().max(50000, 'Solution too long').optional()
	})
	.optional();

// Base schema without refinement (needed for .partial() in Zod v4)
const exerciseBaseSchema = z.object({
	// Statement and solution are optional when using variations system
	statement_md: z.string().trim().max(50000, 'Statement too long').optional(),
	solution_md: z.string().trim().max(50000, 'Solution too long').optional(),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)], {
		message: 'Difficulty must be 1 (easy), 2 (medium), or 3 (hard)'
	}),
	slug: z
		.string()
		.trim()
		.min(3, 'Slug must be at least 3 characters')
		.max(100, 'Slug too long')
		.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with dashes')
		.optional()
		.nullable(),
	tags: z
		.array(z.string().trim().min(1).max(50))
		.max(20, 'Maximum 20 tags allowed')
		.default([])
		.optional()
		.nullable(),
	grades: z
		.array(z.string().trim().min(1).max(20))
		.max(7, 'Maximum 7 grade levels')
		.optional()
		.nullable()
		.default([]),
	topic: z.string().trim().max(100, 'Topic too long').optional().nullable(),
	source: z.string().trim().max(200, 'Source too long').optional().nullable(),
	title: z.string().trim().max(200, 'Title too long').optional().nullable(),
	// Legacy variables format (kept for backward compatibility)
	variables: z
		.union([z.array(z.any()), z.record(z.string(), z.any())])
		.optional()
		.nullable(),
	is_public: z.boolean().default(false).optional(),
	resources: z
		.array(
			z.object({
				type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image'], {
					message: 'Resource type must be video, pdf, link, geogebra, or image'
				}),
				url: z.string().url('Invalid URL').max(2000, 'URL too long'),
				title: z.string().trim().min(1, 'Title required').max(200, 'Title too long'),
				description: z.string().trim().max(500, 'Description too long').optional()
			})
		)
		.max(20, 'Maximum 20 resources')
		.optional()
		.nullable()
		.default([]),
	/**
	 * Custom function identifiers to recognize in math expressions.
	 * When set, these identifiers will be parsed as function calls (e.g., P(x), Q'(x))
	 * instead of implicit multiplication.
	 *
	 * - undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
	 * - null: Use parser defaults
	 * - []: Disable generic function parsing entirely
	 * - ['f', 'P', 'Q']: Recognize only these identifiers as functions
	 */
	generic_functions: z
		.array(functionIdentifierSchema)
		.max(50, 'Maximum 50 function names')
		.optional()
		.nullable(),
	// NEW: Variations system
	shared: sharedExerciseDefaultsSchema,
	variations: z
		.array(exerciseVariationSchema)
		.min(1, 'At least one variation required')
		.max(10, 'Maximum 10 variations')
		.optional()
});

export const createExerciseSchema = exerciseBaseSchema.refine(
	(data) => {
		// Either use variations OR legacy fields (statement_md + solution_md)
		const hasVariations = data.variations && data.variations.length > 0;
		const hasLegacy = data.statement_md && data.solution_md;

		return hasVariations || hasLegacy;
	},
	{ message: 'Must provide either variations or statement_md/solution_md' }
);

/**
 * Schema for updating an exercise (PUT /api/exercises/[id])
 * All fields are optional for partial updates
 * Note: Uses base schema without refinement (Zod v4 limitation)
 */
export const updateExerciseSchema = exerciseBaseSchema.partial();

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
	grades: z
		.string()
		.max(200)
		.optional()
		.transform((val) => {
			if (!val) return undefined;
			const grades = val
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (grades.length === 0) return undefined;
			return grades;
		})
		.pipe(z.array(gradeFlexibleSchema).optional()), // Validates grade codes
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
 * Exercise variation schema for response
 */
const exerciseVariationResponseSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

/**
 * Single exercise response schema
 * Note: statement_md/solution_md are now in variations (single source of truth)
 */
export const exerciseResponseSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().nullable().optional(),
	difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	tags: z.array(z.string()).optional(),
	grades: z.array(gradeCodeSchema).optional(),
	topic: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	title: z.string().nullable().optional(),
	// Variables can be an array (from DB) or a record - accept both
	variables: z
		.union([z.array(z.any()), z.record(z.string(), z.any())])
		.nullable()
		.optional(),
	// Generic function identifiers for math parsing
	generic_functions: z.array(z.string()).nullable().optional(),
	// Variations contain statement_md and solution_md
	variations: z.array(exerciseVariationResponseSchema).nullable().optional(),
	// Shared content across variations
	shared: z.unknown().nullable().optional(),
	// Resources (images, files)
	resources: z.unknown().nullable().optional(),
	is_public: z.boolean(),
	created_by: z.string().uuid(),
	// Supabase returns datetime with +00:00 offset, not Z suffix
	created_at: z.string(),
	updated_at: z.string(),
	// Optional field returned by some queries
	distribution_mode: z.string().optional()
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
	grades: z.array(gradeCodeSchema).optional(),
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

// ============================================================================
// SHARE TOKEN SCHEMAS
// ============================================================================

/**
 * Schema for share token query parameter (GET /exercice/[slug]?token=...)
 */
export const shareTokenQuerySchema = z.object({
	token: z
		.string()
		.length(16, 'Token must be exactly 16 characters')
		.regex(/^[A-Za-z0-9]+$/, 'Token must be alphanumeric')
		.optional()
});

/**
 * Schema for creating a share token (POST /api/exercises/[id]/share)
 */
export const createShareTokenSchema = z.object({
	expires_in_days: z
		.number()
		.int('Days must be an integer')
		.min(1, 'Minimum 1 day')
		.max(365, 'Maximum 365 days')
		.optional()
		.nullable()
});

/**
 * Schema for revoking a share token (DELETE /api/exercises/[id]/share/[tokenId])
 */
export const revokeShareTokenSchema = z.object({
	token_id: z.string().uuid('Invalid token ID')
});

/**
 * Share token response schema
 */
export const shareTokenResponseSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	token: z.string().length(16),
	created_by: z.string().uuid(),
	created_at: z.string(),
	expires_at: z.string().nullable(),
	is_active: z.boolean(),
	access_count: z.number().int().nonnegative(),
	last_accessed_at: z.string().nullable()
});

/**
 * Share tokens list response schema (GET /api/exercises/[id]/share)
 */
export const shareTokensListResponseSchema = z.object({
	tokens: z.array(shareTokenResponseSchema)
});

/**
 * Create share token response schema (POST /api/exercises/[id]/share)
 */
export const createShareTokenResponseSchema = z.object({
	token: shareTokenResponseSchema,
	share_url: z.string().url()
});

// ============================================================================
// SHARE TOKEN VALIDATION HELPERS
// ============================================================================

/**
 * Validate share token query parameter
 */
export function validateShareTokenQuery(params: URLSearchParams) {
	return shareTokenQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate create share token request body
 */
export function validateCreateShareToken(data: unknown) {
	return createShareTokenSchema.safeParse(data);
}

/**
 * Validate revoke share token params
 */
export function validateRevokeShareToken(data: unknown) {
	return revokeShareTokenSchema.safeParse(data);
}
