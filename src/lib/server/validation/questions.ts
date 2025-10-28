/**
 * Questions validation schemas
 */

import { z } from 'zod';
import { paginationSchema, gradeSchema } from './common';

/**
 * Question types
 */
export const questionTypeSchema = z.enum([
	'multiple_choice',
	'numerical',
	'algebraic',
	'fill_blanks',
	'ordering',
	'matrix',
	'true_false'
]);

/**
 * Schema for creating a question template
 */
export const createQuestionTemplateSchema = z.object({
	type: questionTypeSchema,
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	description: z.string().max(1000).optional(),
	variations: z.array(z.unknown()).max(50, 'Trop de variations (max 50)').optional(),
	exerciseInstruction: z.string().max(500).optional(),
	precision: z
		.object({
			type: z.enum(['none', 'absolute', 'relative']),
			value: z.number().optional()
		})
		.optional()
		.default({ type: 'none' }),
	options: z.unknown().optional().nullable(),
	grades: z.array(gradeSchema).min(1, 'Au moins un niveau requis'),
	theme: z.string().min(1, 'Thème requis').max(100),
	domain: z.string().min(1, 'Domaine requis').max(100),
	subdomain: z.string().max(100).optional().nullable(),
	level: z.number().int().positive('Le niveau doit être positif'),
	status: z.enum(['draft', 'published']).default('published'),
	delay: z.number().int().nonnegative().optional().nullable(),
	transformType: z.string().max(50).optional().nullable(),
	multipleAnswers: z.boolean().optional().nullable()
});

/**
 * Schema for updating a question template (all fields optional)
 */
export const updateQuestionTemplateSchema = createQuestionTemplateSchema.partial();

/**
 * Schema for listing question templates
 */
export const listQuestionsQuerySchema = paginationSchema.extend({
	type: questionTypeSchema.optional(),
	grades: z.string().optional(), // comma-separated string
	status: z.enum(['draft', 'published']).optional()
});

/**
 * Schema for generating a question from a template
 */
export const generateQuestionSchema = z.object({
	seed: z.number().int().nonnegative().optional(),
	variationIndex: z.number().int().nonnegative().optional()
});

/**
 * Schema for question categories
 */
export const questionCategorySchema = z.object({
	theme: z.string().min(1).max(100),
	domain: z.string().min(1).max(100),
	subdomain: z.string().max(100).optional().nullable()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Question template response schema
 */
export const questionTemplateResponseSchema = z.object({
	id: z.string().uuid(),
	type: questionTypeSchema,
	title: z.string(),
	description: z.string().nullable().optional(),
	variations: z.array(z.unknown()).nullable().optional(),
	exerciseInstruction: z.string().nullable().optional(),
	precision: z
		.object({
			type: z.enum(['none', 'absolute', 'relative']),
			value: z.number().optional()
		})
		.nullable()
		.optional(),
	options: z.unknown().nullable().optional(),
	grades: z.array(gradeSchema),
	theme: z.string(),
	domain: z.string(),
	subdomain: z.string().nullable().optional(),
	level: z.number().int().positive(),
	status: z.enum(['draft', 'published']),
	delay: z.number().int().nonnegative().nullable().optional(),
	transformType: z.string().nullable().optional(),
	multipleAnswers: z.boolean().nullable().optional(),
	created_by: z.string().uuid(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Question templates list response schema (GET /api/questions/templates)
 * Note: Uses simple total count instead of full pagination object
 */
export const questionTemplatesListResponseSchema = z.object({
	templates: z.array(questionTemplateResponseSchema),
	total: z.number().int().nonnegative()
});

/**
 * Question template detail response schema (GET /api/questions/templates/[id])
 */
export const questionTemplateDetailResponseSchema = z.object({
	template: questionTemplateResponseSchema
});

/**
 * Create question template response schema (POST /api/questions/templates)
 * Note: Includes level adjustment metadata
 */
export const createQuestionTemplateResponseSchema = z.object({
	success: z.literal(true),
	template: questionTemplateResponseSchema,
	levelAdjusted: z.boolean(),
	adjustedLevel: z.number().int().positive().optional()
});

/**
 * Generated question response schema (GET /api/questions/generate/[id])
 */
export const generatedQuestionResponseSchema = z.object({
	question: z.object({
		id: z.string().uuid(),
		type: questionTypeSchema,
		title: z.string(),
		statement: z.string(),
		correctAnswer: z.unknown(),
		options: z.unknown().optional(),
		explanation: z.string().optional(),
		seed: z.number().int().nonnegative(),
		variationIndex: z.number().int().nonnegative().optional()
	})
});

/**
 * Question categories response schema (GET /api/questions/categories)
 */
export const questionCategoriesResponseSchema = z.object({
	categories: z.array(
		z.object({
			id: z.string().uuid(),
			theme: z.string(),
			domain: z.string(),
			subdomain: z.string().nullable().optional(),
			question_count: z.number().int().nonnegative()
		})
	)
});
