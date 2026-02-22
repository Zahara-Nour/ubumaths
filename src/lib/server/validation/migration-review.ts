/**
 * Migration Review Validation Schemas
 * ====================================
 *
 * Zod schemas for migration review API endpoints.
 * Validates approve/reject actions on migrated questions.
 *
 * Shared question schemas (variableSchema, displayOptionsSchema, correctionSchema,
 * blankSchema, choiceSchema) are imported from ./questions to avoid duplication.
 *
 * @module server/validation/migration-review
 */

import { z } from 'zod';
import {
	variableSchema,
	displayOptionsSchema,
	correctionSchema,
	blankSchema,
	choiceSchema
} from './questions';

// ============================================================================
// QUESTION TEMPLATE SCHEMAS FOR EDITING
// ============================================================================

/**
 * Variation schema for question templates during migration edit
 *
 * Extends base question schemas with migration-specific fields:
 * - statement is optional (can be inherited from shared)
 * - solution field for legacy migration data
 */
const variationSchema = z.object({
	statement: z.string().max(5000).optional().default(''),
	variables: z.array(variableSchema).max(50).optional(),
	solution: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(20)]).optional(),
	correction: correctionSchema.optional(),
	blanks: z.array(blankSchema).max(20).optional(),
	choices: z.array(choiceSchema).max(10).optional(),
	correctChoiceIndex: z.union([z.string(), z.array(z.string())]).optional(),
	answerFormats: z.unknown().optional(),
	validationRules: z.array(z.unknown()).optional(),
	requiredForm: z.unknown().optional(),
	blankDefaults: z.unknown().optional(),
	conditions: z.array(z.string()).optional()
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
	correctChoiceIndex: z.union([z.string(), z.array(z.string())]).optional(),
	validationRules: z.array(z.unknown()).optional(),
	requiredForm: z.unknown().optional(),
	blankDefaults: z.unknown().optional(),
	answerFormats: z.unknown().optional(),
	conditions: z.array(z.string()).optional()
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
export const editedQuestionTemplateSchema = z
	.object({
		title: z.string().min(1, 'Le titre est requis').max(500).optional(),
		description: z.string().max(2000).optional(),
		shared: sharedDefaultsSchema.optional(),
		defaultDisplayOptions: displayOptionsSchema.optional(),
		multipleAnswers: z.boolean().optional(),
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
		level: z.number().int().nonnegative().max(100).optional(),
		status: z.enum(['draft', 'published']).optional(),
		delay: z.number().int().nonnegative().max(600).optional()
	})
	.refine(
		(data) => {
			const hasSharedStatement = data.shared?.statement && data.shared.statement.trim().length > 0;
			return data.variations.every(
				(v) => (v.statement && v.statement.trim().length > 0) || hasSharedStatement
			);
		},
		{
			message: 'Chaque variation doit avoir un enonce, ou un enonce partage doit etre defini',
			path: ['variations']
		}
	);

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
