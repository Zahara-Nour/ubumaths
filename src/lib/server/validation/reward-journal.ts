/**
 * Zod validation schemas for Reward Journal API endpoints
 *
 * Validates query parameters for the reward events journal endpoints:
 * - GET /api/rewards/journal (student endpoint)
 * - GET /api/rewards/journal/[studentId] (teacher endpoint)
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

/**
 * Reward type enum matching database enum
 */
export const rewardTypeSchema = z.enum(['gidouilles', 'bonus', 'vip_card', 'achievement', 'item']);

/**
 * Reward event type enum matching database enum
 */
export const rewardEventTypeSchema = z.enum([
	'earned',
	'spent',
	'traded',
	'used',
	'expired',
	'unlocked',
	'purchased',
	'awarded',
	'removed'
]);

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for reward journal query parameters
 *
 * Validates and transforms URL search params for the journal endpoints.
 * All parameters are optional with sensible defaults.
 */
export const rewardJournalQuerySchema = z.object({
	// Filter by reward type
	reward_type: rewardTypeSchema.optional(),

	// Filter by event type
	event_type: rewardEventTypeSchema.optional(),

	// Date range filters (ISO 8601 date strings)
	from: z
		.string()
		.refine(
			(val) => {
				const date = new Date(val);
				return !isNaN(date.getTime());
			},
			{ message: 'Invalid date format for "from" parameter. Use ISO 8601 format.' }
		)
		.optional(),

	to: z
		.string()
		.refine(
			(val) => {
				const date = new Date(val);
				return !isNaN(date.getTime());
			},
			{ message: 'Invalid date format for "to" parameter. Use ISO 8601 format.' }
		)
		.optional(),

	// Pagination - using pipe pattern to properly handle string-to-number transformation with defaults
	page: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return 1;
			const parsed = parseInt(val, 10);
			if (isNaN(parsed) || parsed < 1) return 1;
			if (parsed > 10000) return 10000; // Reasonable upper limit
			return parsed;
		}),

	limit: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return 20;
			const parsed = parseInt(val, 10);
			if (isNaN(parsed) || parsed < 1) return 20;
			if (parsed > 100) return 100; // Max 100 per page
			return parsed;
		})
});

/**
 * Schema for student ID path parameter (teacher endpoint)
 */
export const studentIdParamSchema = z.object({
	studentId: z.string().uuid('Invalid student ID format')
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RewardJournalQuery = z.infer<typeof rewardJournalQuerySchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
