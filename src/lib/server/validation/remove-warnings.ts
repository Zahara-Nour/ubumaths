/**
 * Remove Warnings Validation Schema
 * ==================================
 *
 * Zod schema for validating bulk warning removal requests.
 *
 * USAGE:
 * ```typescript
 * import { removeWarningsSchema } from '$lib/server/validation/remove-warnings';
 *
 * const validation = removeWarningsSchema.safeParse(body);
 * if (!validation.success) {
 *   throw error(400, validation.error.issues[0].message);
 * }
 * const { studentId, warningIds } = validation.data;
 * ```
 */

import { z } from 'zod';

// ============================================================================
// REMOVE WARNINGS SCHEMA
// ============================================================================

/**
 * Schema for removing multiple warnings
 *
 * Used by: POST /api/warnings/remove-multiple
 *
 * Validates:
 * - studentId must be a valid UUID
 * - warningIds must be an array of UUIDs (1-10 warnings)
 * - vipCardInstanceId (optional) must be a valid UUID
 */
export const removeWarningsSchema = z
	.object({
		/** UUID of the student whose warnings will be removed */
		studentId: z.string().uuid('Invalid student ID format'),

		/** Array of warning IDs to remove (1-10 warnings) */
		warningIds: z
			.array(z.string().uuid('Invalid warning ID format'))
			.min(1, 'Must remove at least 1 warning')
			.max(10, 'Cannot remove more than 10 warnings at once'),

		/** Optional: VIP card instance ID (for remove_warnings action cards) */
		vipCardInstanceId: z.string().uuid('Invalid VIP card instance ID format').optional()
	})
	.strict(); // Reject unknown fields

// ============================================================================
// TYPES
// ============================================================================

export type RemoveWarningsInput = z.infer<typeof removeWarningsSchema>;
