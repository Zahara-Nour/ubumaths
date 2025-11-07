/**
 * VIP Cards Validation Schemas
 * ==============================
 *
 * Zod schemas for validating VIP card-related API requests.
 *
 * USAGE:
 * ```typescript
 * import { useCardSchema } from '$lib/server/validation/vip-cards';
 *
 * const validation = useCardSchema.safeParse(body);
 * if (!validation.success) {
 *   throw error(400, validation.error.issues[0].message);
 * }
 * const { studentId, instanceId } = validation.data;
 * ```
 */

import { z } from 'zod';

// ============================================================================
// USE CARD SCHEMA
// ============================================================================

/**
 * Schema for marking a VIP card instance as used
 *
 * Used by: POST /api/vip-cards/use-card
 *
 * This is the FINAL step in the VIP card usage flow.
 * Action execution happens in specialized endpoints BEFORE calling use-card.
 */
export const useCardSchema = z
	.object({
		/** UUID of the VIP card instance to mark as used */
		instanceId: z.string().uuid('Invalid instance ID format'),
		/** UUID of the student who owns the card */
		studentId: z.string().uuid('Invalid student ID format')
	})
	.strict();

export type UseCardInput = z.infer<typeof useCardSchema>;
