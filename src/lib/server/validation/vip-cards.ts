/**
 * VIP Cards Validation Schemas
 * ==============================
 *
 * Zod schemas for validating VIP card-related API requests.
 *
 * USAGE:
 * ```typescript
 * import { useCardSchema, purchaseVipCardSchema } from '$lib/server/validation/vip-cards';
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

// ============================================================================
// PURCHASE VIP CARD SCHEMA
// ============================================================================

/**
 * Schema for purchasing a VIP card with gidouilles
 *
 * Used by: POST /api/vip-cards/purchase
 *
 * The purchase process:
 * 1. Validates card exists and is purchasable
 * 2. Checks student has sufficient gidouilles
 * 3. Verifies max ownership limit not reached
 * 4. Deducts gidouilles and creates instance
 */
export const purchaseVipCardSchema = z
	.object({
		/** UUID of the student making the purchase */
		studentId: z.string().uuid('Invalid student ID format'),
		/** ID of the VIP card template to purchase */
		cardId: z
			.string()
			.min(1, 'Card ID is required')
			.max(50, 'Card ID too long')
			.regex(/^[a-zA-Z0-9-]+$/, 'Card ID must be alphanumeric with hyphens only')
	})
	.strict();

export type PurchaseVipCardInput = z.infer<typeof purchaseVipCardSchema>;

// ============================================================================
// USE CONSUMABLE CARD SCHEMA
// ============================================================================

/**
 * Schema for using a consumable VIP card (decrements usesRemaining)
 *
 * Used by: POST /api/vip-cards/use-consumable
 *
 * For multi-use cards (usesRemaining > 0):
 * - Decrements usesRemaining by 1
 * - When usesRemaining reaches 0, marks card as usedAt
 *
 * For single-use cards (usesRemaining = null):
 * - Marks card as usedAt immediately
 */
export const useConsumableSchema = z
	.object({
		/** UUID of the student who owns the card */
		studentId: z.string().uuid('Invalid student ID format'),
		/** UUID of the VIP card instance to use */
		instanceId: z.string().uuid('Invalid instance ID format')
	})
	.strict();

export type UseConsumableInput = z.infer<typeof useConsumableSchema>;

// ============================================================================
// GET PURCHASABLE CARDS SCHEMA
// ============================================================================

/**
 * Schema for querying purchasable cards
 *
 * Used by: GET /api/vip-cards/purchasable
 */
export const getPurchasableCardsSchema = z
	.object({
		/** Optional: Filter by rarity */
		rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
		/** Optional: Maximum price filter */
		maxPrice: z.coerce.number().int().min(0).max(10000).optional(),
		/** Optional: Only show cards the student can afford */
		studentId: z.string().uuid('Invalid student ID format').optional()
	})
	.strict();

export type GetPurchasableCardsInput = z.infer<typeof getPurchasableCardsSchema>;

// ============================================================================
// PURCHASE VIP CARD BODY SCHEMA (for API endpoint)
// ============================================================================

/**
 * Schema for the purchase endpoint body
 *
 * Used by: POST /api/vip-cards/purchase
 *
 * Note: studentId is NOT accepted in the body for security.
 * The endpoint uses session.user.id instead.
 */
export const purchaseVipCardBodySchema = z
	.object({
		/** ID of the VIP card template to purchase */
		cardId: z
			.string()
			.min(1, 'Card ID is required')
			.max(50, 'Card ID too long')
			.regex(/^[a-zA-Z0-9-]+$/, 'Card ID must be alphanumeric with hyphens only')
	})
	.strict();

export type PurchaseVipCardBodyInput = z.infer<typeof purchaseVipCardBodySchema>;
