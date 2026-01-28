/**
 * Migration Review Validation Schemas
 * ====================================
 *
 * Zod schemas for migration review API endpoints.
 * Validates approve/reject actions on migrated questions.
 *
 * @module server/validation/migration-review
 */

import { z } from 'zod';

// ============================================================================
// QUESTION TEMPLATE SCHEMAS FOR EDITING
// ============================================================================

/**
 * Question types supported in the migration system
 */
export const questionTypeSchema = z.enum([
	'numerical_exact',
	'numerical_decimal',
	'numerical_rounded',
	'numerical_with_unit',
	'algebraic_transform',
	'fill_in_blanks',
	'multiple_choice'
]);

/**
 * Variable schema for question templates
 */
const variableSchema = z.object({
	name: z.string().min(1, 'Variable name is required').max(50),
	expression: z.string().min(1, 'Expression is required').max(1000)
});

/**
 * Choice schema for multiple choice questions
 */
const choiceSchema = z.object({
	content: z.string().min(1, 'Choice content is required').max(2000),
	isCorrect: z.boolean().optional()
});

/**
 * Correction schema
 */
const correctionSchema = z.object({
	feedback: z
		.object({
			correct: z.string().max(2000).optional(),
			incorrect: z.string().max(2000).optional(),
			partial: z.string().max(2000).optional()
		})
		.optional(),
	steps: z.array(z.string().max(2000)).max(20).optional()
});

/**
 * Variation schema for question templates during migration edit
 */
const variationSchema = z.object({
	statement: z.string().min(1, "L'enonce est requis").max(5000),
	variables: z.array(variableSchema).max(50).optional(),
	solution: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(20)]),
	correction: correctionSchema.optional(),
	blanks: z
		.array(
			z.object({
				position: z.number().int().nonnegative().max(100),
				expectedAnswer: z.string().max(500)
			})
		)
		.max(20)
		.optional(),
	choices: z.array(choiceSchema).max(10).optional()
});

/**
 * Shared defaults schema
 */
const sharedDefaultsSchema = z.object({
	statement: z.string().max(5000).optional(),
	variables: z.array(variableSchema).max(50).optional(),
	solution: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(20)]).optional(),
	correction: correctionSchema.optional(),
	choices: z.array(choiceSchema).max(10).optional()
});

// ============================================================================
// REVIEW ACTION SCHEMAS
// ============================================================================

/**
 * Schema for approving a question
 * Optional notes field for documentation
 */
export const approveQuestionSchema = z.object({
	notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

/**
 * Schema for rejecting a question
 * Requires rejection reason
 */
export const rejectQuestionSchema = z.object({
	reason: z
		.string()
		.min(1, 'Rejection reason is required')
		.max(1000, 'Rejection reason must be less than 1000 characters')
});

/**
 * Schema for batch approving multiple questions
 * Validates array of global indices
 */
export const batchApproveSchema = z.object({
	globalIndexes: z
		.array(
			z
				.number()
				.int('Global index must be an integer')
				.min(0, 'Global index must be non-negative')
				.max(632, 'Global index must not exceed 632')
		)
		.min(1, 'At least one question must be specified')
		.max(100, 'Cannot approve more than 100 questions at once')
});

/**
 * Schema for validating globalIndex parameter
 */
export const globalIndexSchema = z
	.number()
	.int('Global index must be an integer')
	.min(0, 'Global index must be non-negative')
	.max(632, 'Global index must not exceed 632');

// ============================================================================
// EDIT SCHEMAS
// ============================================================================

/**
 * Schema for the edited question template
 * Partial updates allowed - only includes editable fields
 */
export const editedQuestionTemplateSchema = z.object({
	type: questionTypeSchema.optional(),
	title: z.string().min(1, 'Le titre est requis').max(500).optional(),
	description: z.string().max(2000).optional(),
	shared: sharedDefaultsSchema.optional(),
	variations: z.array(variationSchema).min(1, 'Au moins une variation requise').max(50),
	exerciseInstruction: z.string().max(500).optional(),
	grades: z.array(z.string()).min(1).max(20).optional(),
	theme: z.string().max(100).optional(),
	domain: z.string().max(100).optional(),
	subdomain: z.string().max(100).optional(),
	level: z.number().int().positive().max(100).optional(),
	status: z.enum(['draft', 'published']).optional(),
	delay: z.number().int().nonnegative().max(600).optional()
});

/**
 * Schema for saving an edit to a question
 */
export const saveEditSchema = z.object({
	editedTransformed: editedQuestionTemplateSchema,
	notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ApproveQuestionInput = z.infer<typeof approveQuestionSchema>;
export type RejectQuestionInput = z.infer<typeof rejectQuestionSchema>;
export type BatchApproveInput = z.infer<typeof batchApproveSchema>;
export type SaveEditInput = z.infer<typeof saveEditSchema>;
export type EditedQuestionTemplate = z.infer<typeof editedQuestionTemplateSchema>;
