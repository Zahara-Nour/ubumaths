/**
 * Exchange Cards Validation Schemas
 * ==================================
 *
 * Zod schemas for validating VIP card exchange requests.
 *
 * USAGE:
 * ```typescript
 * import { exchangeCardsSchema } from '$lib/server/validation/exchange-cards';
 *
 * const validation = exchangeCardsSchema.safeParse(body);
 * if (!validation.success) {
 *   throw error(400, validation.error.issues[0].message);
 * }
 * const { studentId, mode, cardsToDiscard } = validation.data;
 * ```
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMA (SHARED FIELDS)
// ============================================================================

const baseSchema = z.object({
	/** UUID of the student performing the exchange */
	studentId: z.string().uuid('Identifiant d’élève invalide'),

	/** Array of VIP card instance IDs to discard (1-20 cards) */
	cardsToDiscard: z
		.array(z.string().uuid('Identifiant de carte VIP invalide'))
		.min(1, 'Défausse au moins une carte VIP')
		.max(20, 'Impossible de défausser plus de 20 cartes VIP'),

	/** UUID of the action card instance being used to perform this exchange */
	actionCardInstanceId: z.string().uuid('Identifiant de carte d’action invalide')
});

// ============================================================================
// MODE-SPECIFIC SCHEMAS (DISCRIMINATED UNION)
// ============================================================================

/**
 * Schema for replace_random mode
 *
 * Discard N random cards and draw N new random cards.
 */
const replaceRandomSchema = baseSchema.extend({
	mode: z.literal('replace_random')
});

/**
 * Schema for rarity_points mode
 *
 * Use rarity points system to exchange cards for a card of specific rarity.
 * Points: common=1, rare=3, epic=9, legendary=27
 */
const rarityPointsSchema = baseSchema.extend({
	mode: z.literal('rarity_points'),

	/** Target rarity to obtain */
	targetRarity: z.enum(['common', 'rare', 'epic', 'legendary'], {
		message: 'Rareté visée invalide'
	})
});

/**
 * Schema for discard_for_specific mode
 *
 * Discard N cards to get a specific predefined card.
 */
const discardForSpecificSchema = baseSchema.extend({
	mode: z.literal('discard_for_specific'),

	/** ID of the specific card to obtain */
	targetCardId: z
		.string()
		.min(1, 'Choisis la carte VIP à obtenir')
		.max(50, 'Identifiant de carte VIP trop long')
});

// ============================================================================
// MAIN SCHEMA (DISCRIMINATED UNION)
// ============================================================================

/**
 * Main exchange cards schema
 *
 * Discriminated union based on 'mode' field.
 * Ensures that required fields are present based on the exchange mode.
 */
export const exchangeCardsSchema = z.discriminatedUnion('mode', [
	replaceRandomSchema,
	rarityPointsSchema,
	discardForSpecificSchema
]); // Note: discriminatedUnion doesn't support .strict()

// ============================================================================
// TYPES
// ============================================================================

export type ExchangeCardsInput = z.infer<typeof exchangeCardsSchema>;
export type ReplaceRandomInput = z.infer<typeof replaceRandomSchema>;
export type RarityPointsInput = z.infer<typeof rarityPointsSchema>;
export type DiscardForSpecificInput = z.infer<typeof discardForSpecificSchema>;
