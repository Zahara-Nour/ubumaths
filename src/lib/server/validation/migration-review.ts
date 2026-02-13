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
 * @deprecated Type is now inferred from structure (choices → MC, else → FIB).
 * Kept for backward compatibility with existing edits.
 */
export const questionTypeSchema = z.enum(['fill_in_blanks', 'multiple_choice']);

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

// ============================================================================
// V2 FILL-IN-BLANKS SCHEMAS
// ============================================================================

/**
 * Precision schema for numerical answers
 */
const precisionSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('none') }),
	z.object({ type: z.literal('decimal'), digits: z.number().int().nonnegative().max(20) }),
	z.object({ type: z.literal('significant'), digits: z.number().int().positive().max(20) }),
	z.object({ type: z.literal('magnitude'), digits: z.number().int().max(20) }),
	z.object({
		type: z.literal('tolerance'),
		tolerance: z.number().positive(),
		mode: z.enum(['absolute', 'relative'])
	})
]);

/**
 * Required form schema (predefined or custom pattern)
 */
const requiredFormSchema = z.union([
	z.enum(['product', 'sum', 'fraction', 'power']),
	z.object({ pattern: z.string().min(1).max(500) })
]);

/**
 * Validation rule schema (discriminated union by type)
 */
const validationRuleSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('divisor'), dividend: z.string().max(500) }),
	z.object({ type: z.literal('multiple'), base: z.string().max(500) }),
	z.object({
		type: z.literal('range'),
		min: z.string().max(500),
		max: z.string().max(500),
		inclusive: z.boolean().optional()
	}),
	z.object({
		type: z.literal('equation_root'),
		equation: z.string().max(1000),
		variable: z.string().max(50).optional()
	}),
	z.object({ type: z.literal('equivalent'), expression: z.string().max(1000) }),
	z.object({
		type: z.literal('predicate'),
		predicate: z.enum([
			'isPrime',
			'isComposite',
			'isEven',
			'isOdd',
			'isPositive',
			'isNegative',
			'isInteger'
		])
	}),
	z.object({
		type: z.literal('custom'),
		expression: z.string().max(2000),
		description: z.string().max(500).optional()
	})
]);

/**
 * Unit config schema for blanks
 */
const unitConfigSchema = z.object({
	expected: z.boolean(),
	required: z.string().max(50).optional()
});

/**
 * Blank defaults schema (shared validation settings for all blanks)
 */
const blankDefaultsSchema = z.object({
	precision: precisionSchema.optional(),
	requiredForm: requiredFormSchema.optional(),
	unit: unitConfigSchema.optional()
});

/**
 * Blank schema for fill-in-blanks questions (v2 TemplateBlank)
 */
const blankSchema = z.object({
	expectedAnswer: z.string().max(500),
	prefilled: z.string().max(500).optional(),
	pool: z.array(z.string().max(200)).max(50).optional(),
	precision: precisionSchema.optional(),
	requiredForm: requiredFormSchema.optional(),
	validationRules: z.array(validationRuleSchema).max(10).optional(),
	unit: unitConfigSchema.optional()
});

/**
 * Answer formats schema (key = expression var name, value = format with ? markers)
 */
const answerFormatsSchema = z.record(z.string().max(50), z.string().max(500));

/**
 * Variation schema for question templates during migration edit
 */
const variationSchema = z.object({
	statement: z.string().min(1, "L'enonce est requis").max(5000),
	variables: z.array(variableSchema).max(50).optional(),
	solution: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(20)]).optional(),
	correction: correctionSchema.optional(),
	blanks: z.array(blankSchema).max(20).optional(),
	choices: z.array(choiceSchema).max(10).optional(),
	answerFormats: answerFormatsSchema.optional(),
	validationRules: z.array(validationRuleSchema).max(20).optional(),
	requiredForm: requiredFormSchema.optional(),
	blankDefaults: blankDefaultsSchema.optional()
});

/**
 * Shared defaults schema
 */
const sharedDefaultsSchema = z.object({
	statement: z.string().max(5000).optional(),
	variables: z.array(variableSchema).max(50).optional(),
	solution: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(20)]).optional(),
	correction: correctionSchema.optional(),
	choices: z.array(choiceSchema).max(10).optional(),
	validationRules: z.array(validationRuleSchema).max(20).optional(),
	requiredForm: requiredFormSchema.optional(),
	blankDefaults: blankDefaultsSchema.optional(),
	answerFormats: answerFormatsSchema.optional()
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
	title: z.string().min(1, 'Le titre est requis').max(500).optional(),
	description: z.string().max(2000).optional(),
	shared: sharedDefaultsSchema.optional(),
	variations: z.array(variationSchema).min(1, 'Au moins une variation requise').max(50),
	exerciseInstruction: z.string().max(500).optional(),
	options: z
		.object({
			constraints: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
			shuffleChoices: z.boolean().optional(),
			orderIndependent: z.boolean().optional()
		})
		.passthrough()
		.optional(),
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
