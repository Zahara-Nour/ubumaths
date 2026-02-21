/**
 * Questions validation schemas
 */

import { z } from 'zod';
import { paginationSchema, gradeSchema } from './common';

/**
 * Question types
 */
export const questionTypeSchema = z.enum(['multiple_choice', 'fill_in_blanks']);

/**
 * Variable schema for question templates
 */
export const displayOptionsSchema = z
	.object({
		shuffleTerms: z.boolean().optional(),
		shuffleFactors: z.boolean().optional(),
		shuffleTermsAndFactors: z.boolean().optional(),
		shallowShuffleTerms: z.boolean().optional(),
		shallowShuffleFactors: z.boolean().optional(),
		removeNullTerms: z.boolean().optional(),
		removeUnnecessaryBrackets: z.boolean().optional(),
		removeSpaces: z.boolean().optional()
	})
	.strict();

export const variableSchema = z.object({
	name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be valid identifier'),
	expression: z.string().min(1, 'Expression is required'),
	displayOptions: displayOptionsSchema.optional()
});

/**
 * Blank schema matching TemplateBlank interface
 */
export const blankSchema = z.object({
	expectedAnswer: z.string(),
	prefilled: z.string().optional(),
	pool: z.array(z.string()).optional(),
	precision: z.unknown().optional(),
	requiredForm: z.unknown().optional(),
	removeSpaces: z.boolean().optional(),
	validationRules: z.array(z.unknown()).optional(),
	unit: z
		.object({
			expected: z.boolean(),
			required: z.string().optional()
		})
		.optional()
});

/**
 * Correction schema matching QuestionCorrection interface
 */
export const correctionSchema = z.object({
	feedback: z
		.object({
			correct: z.string().optional(),
			incorrect: z.string().optional(),
			partial: z.string().optional()
		})
		.optional(),
	steps: z.array(z.string()).optional()
});

export const choiceSchema = z.object({
	content: z.string(),
	isCorrect: z.boolean().optional()
});

/**
 * Variation schema for question templates
 */
const variationSchema = z.object({
	statement: z.string().min(1, "L'énoncé est requis"),
	variables: z.array(variableSchema).optional(),
	correctChoiceIndex: z.union([z.string(), z.array(z.string())]).optional(),
	correction: correctionSchema.optional().nullable(),
	blanks: z.array(blankSchema).optional(),
	blankDefaults: z.unknown().optional(),
	choices: z.array(choiceSchema).optional(),
	requiredForm: z.unknown().optional(),
	validationRules: z.array(z.unknown()).optional(),
	answerFormats: z.unknown().optional()
});

/**
 * Schema for creating a question template
 */
export const createQuestionTemplateSchema = z.object({
	type: questionTypeSchema.optional(),
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	description: z.string().max(1000).optional().nullable(),
	variations: z
		.array(variationSchema)
		.min(1, 'Au moins une variation requise')
		.max(50, 'Trop de variations (max 50)')
		.optional(),
	exerciseInstruction: z.string().max(500).optional().nullable(),
	shared: z.unknown().optional().nullable(),
	defaultDisplayOptions: z.unknown().optional().nullable(),
	options: z.unknown().optional().nullable(),
	grades: z.array(gradeSchema).min(1, 'Au moins un niveau requis'),
	theme: z.string().min(1, 'Thème requis').max(100),
	domain: z.string().min(1, 'Domaine requis').max(100),
	subdomain: z.string().max(100).optional().nullable(),
	level: z.number().int().nonnegative('Le niveau doit être >= 0'),
	status: z.enum(['draft', 'published']).default('published'),
	delay: z.number().int().nonnegative().optional().nullable(),
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
 * Question template response schema (matches Supabase snake_case columns)
 */
export const questionTemplateResponseSchema = z.object({
	id: z.string().uuid(),
	type: questionTypeSchema,
	title: z.string(),
	description: z.string().nullable().optional(),
	variations: z.array(z.unknown()).nullable().optional(),
	exercise_instruction: z.string().nullable().optional(),
	shared: z.unknown().nullable().optional(),
	default_display_options: z.unknown().nullable().optional(),
	options: z.unknown().nullable().optional(),
	precision: z.unknown().nullable().optional(),
	grades: z.array(gradeSchema),
	theme: z.string(),
	domain: z.string(),
	subdomain: z.string().nullable().optional(),
	level: z.number().int().nonnegative(),
	status: z.enum(['draft', 'published']),
	delay: z.number().int().nonnegative().nullable().optional(),
	multiple_answers: z.boolean().nullable().optional(),
	created_by: z.string().uuid(),
	created_at: z.string(),
	updated_at: z.string()
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
