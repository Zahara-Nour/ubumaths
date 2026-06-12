/**
 * Assessment validation schemas
 */

import { z } from 'zod';
import { gradeSchema, uuidSchema } from './common';

// ============================================================================
// ASSESSMENT STATUS
// ============================================================================

/**
 * Valid assessment status values
 */
export const assessmentStatusSchema = z.enum(['draft', 'published', 'archived']);

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/**
 * Question category descriptor (matches QuestionCategory in questionCart.svelte.ts)
 */
export const questionCategorySchema = z.object({
	theme: z.string().min(1, 'Theme required').max(100, 'Theme too long'),
	domain: z.string().min(1, 'Domain required').max(100, 'Domain too long'),
	subdomain: z.string().max(100, 'Subdomain too long').nullable(),
	level: z.number().int('Level must be an integer').nonnegative('Level must be >= 0').max(100)
});

/**
 * Cart item: a selected question category with a quantity (matches CartItem)
 */
export const cartItemSchema = z.object({
	category: questionCategorySchema,
	quantity: z
		.number()
		.int('Quantity must be an integer')
		.positive('Quantity must be positive')
		.max(50, 'Too many questions per category'),
	delay: z.number().int('Delay must be an integer').nonnegative('Delay must be >= 0').max(3600)
});

/**
 * Assessment settings (matches AssessmentSettings)
 */
export const assessmentSettingsSchema = z.object({
	max_attempts: z
		.number()
		.int('Max attempts must be an integer')
		.positive('Max attempts must be positive')
		.max(10, 'Too many attempts allowed')
		.nullable(),
	time_limit: z
		.number()
		.int('Time limit must be an integer')
		.positive('Time limit must be positive')
		.nullable(),
	deadline: z.string().datetime('Invalid deadline').nullable(),
	shuffle_questions: z.boolean()
});

/**
 * Schema for creating an assessment.
 * Mirrors CreateAssessmentData (the shape sent by the frontend and stored as JSONB):
 * categories is a CartItem[], plus a settings object — NOT { category_id, question_count }.
 */
export const createAssessmentSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
	grade: gradeSchema,
	description: z.string().trim().max(2000, 'Description too long').optional(),
	categories: z
		.array(cartItemSchema)
		.min(1, 'At least one category required')
		.max(50, 'Too many categories'),
	settings: assessmentSettingsSchema,
	status: z.enum(['draft', 'published']).default('draft')
});

/**
 * Schema for updating an assessment
 */
export const updateAssessmentSchema = createAssessmentSchema.partial();

/**
 * Schema for assessment edit form (from +page.server.ts)
 * Validates the form data including stringified JSON settings
 */
export const assessmentEditFormSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	grade: gradeSchema,
	description: z.string().trim().optional(),
	settings: z
		.string()
		.min(1, 'Paramètres requis')
		.transform((str, ctx) => {
			try {
				return JSON.parse(str);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Format JSON invalide pour les paramètres'
				});
				return z.NEVER;
			}
		})
		.pipe(
			z.object({
				duration: z
					.number()
					.int()
					.positive()
					.max(180, 'Durée trop longue (max 180 minutes)')
					.optional(),
				max_attempts: z
					.number()
					.int()
					.positive()
					.max(10, 'Trop de tentatives autorisées')
					.default(1),
				show_solutions: z.boolean().optional().default(false),
				shuffle_questions: z.boolean().optional().default(false),
				shuffle_answers: z.boolean().optional().default(false)
			})
		)
});

// ============================================================================
// ASSIGNMENT SCHEMAS
// ============================================================================

/**
 * Schema for assigning an assessment
 */
export const assignAssessmentSchema = z
	.object({
		class_ids: z
			.array(z.string().uuid('Invalid class ID format'))
			.max(50, 'Too many classes')
			.optional(),
		student_ids: z
			.array(z.string().uuid('Invalid student ID format'))
			.max(200, 'Too many students')
			.optional()
	})
	.refine(
		(data) =>
			(data.class_ids && data.class_ids.length > 0) ||
			(data.student_ids && data.student_ids.length > 0),
		{ message: 'Must specify at least one class or student' }
	);

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Query parameters for listing assessments
 */
export const listAssessmentsQuerySchema = z.object({
	status: assessmentStatusSchema.optional(),
	grade: gradeSchema.optional(),
	page: z.coerce.number().int().positive().max(1000).default(1).optional(),
	limit: z.coerce.number().int().positive().max(100).default(50).optional()
});

/**
 * Query parameters for getting assessment results
 */
export const getResultsQuerySchema = z.object({
	stats: z
		.string()
		.transform((val) => val === 'true')
		.pipe(z.boolean())
		.optional(),
	class_stats: z
		.string()
		.transform((val) => val === 'true')
		.pipe(z.boolean())
		.optional(),
	student_id: uuidSchema.optional(),
	class_id: uuidSchema.optional()
});

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * URL parameter validation for assessment ID
 */
export const assessmentIdParamSchema = z.object({
	id: uuidSchema
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Assessment category response schema
 */
export const assessmentCategoryResponseSchema = z.object({
	category_id: z.string().uuid(),
	question_count: z.number().int().positive()
});

/**
 * Single assessment response schema
 */
export const assessmentResponseSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	grade: gradeSchema,
	categories: z.array(assessmentCategoryResponseSchema),
	duration: z.number().int().positive().nullable().optional(),
	max_attempts: z.number().int().positive(),
	status: assessmentStatusSchema,
	created_at: z.string().datetime(),
	created_by: z.string().uuid(),
	updated_at: z.string().datetime()
});

/**
 * Assessment list response schema (GET /api/assessments)
 */
export const assessmentListResponseSchema = z.object({
	assessments: z.array(assessmentResponseSchema)
});

/**
 * Assessment stats schema
 */
export const assessmentStatsSchema = z.object({
	total_attempts: z.number().int().nonnegative(),
	average_score: z.number().min(0).max(100).nullable(),
	completion_rate: z.number().min(0).max(100)
});

/**
 * Assessment with stats response schema
 */
export const assessmentWithStatsResponseSchema = assessmentResponseSchema.extend({
	stats: assessmentStatsSchema
});

/**
 * Assessment detail response schema (GET /api/assessments/[id])
 */
export const assessmentDetailResponseSchema = z.object({
	assessment: assessmentResponseSchema
});

/**
 * Create assessment response schema (POST /api/assessments)
 */
export const createAssessmentResponseSchema = z.object({
	assessment: assessmentResponseSchema
});

/**
 * Assessment result student schema
 */
export const assessmentResultStudentSchema = z.object({
	student_id: z.string().uuid(),
	student_name: z.string(),
	score: z.number().min(0).max(100),
	completed_at: z.string().datetime(),
	attempt_number: z.number().int().positive()
});

/**
 * Assessment results response schema (GET /api/assessments/[id]/results)
 */
export const assessmentResultsResponseSchema = z.object({
	results: z.array(assessmentResultStudentSchema),
	stats: assessmentStatsSchema.optional()
});

/**
 * Assignment confirmation response schema
 */
export const assignmentResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	assigned_count: z.number().int().nonnegative().optional()
});
