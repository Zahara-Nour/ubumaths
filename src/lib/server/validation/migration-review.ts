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
// TYPE EXPORTS
// ============================================================================

export type ApproveQuestionInput = z.infer<typeof approveQuestionSchema>;
export type RejectQuestionInput = z.infer<typeof rejectQuestionSchema>;
export type BatchApproveInput = z.infer<typeof batchApproveSchema>;
