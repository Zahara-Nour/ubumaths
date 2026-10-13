/**
 * Choose Cards Validation Schema
 * ===============================
 *
 * Zod schema for validating VIP card "choose" requests.
 * This action allows users to select specific VIP cards to receive.
 *
 * USAGE:
 * ```typescript
 * import { chooseCardsSchema } from '$lib/server/validation/choose-cards';
 *
 * const validation = chooseCardsSchema.safeParse(body);
 * if (!validation.success) {
 *   throw error(400, validation.error.issues[0].message);
 * }
 * const { studentId, actionCardInstanceId, chosenCardIds } = validation.data;
 * ```
 */

import { z } from 'zod';

// ============================================================================
// MAIN SCHEMA
// ============================================================================

/**
 * Schema for choose_card action
 *
 * User provides:
 * - studentId: UUID of student receiving cards
 * - actionCardInstanceId: UUID of the VIP card action being consumed
 * - chosenCardIds: Array of card IDs the user wants to receive (1-10 cards)
 *
 * Server validates:
 * - User owns the action card
 * - Number of chosen cards matches action.count
 * - Chosen cards respect action filters (all/maxRarity/possibleCardIds)
 */
export const chooseCardsSchema = z.object({
	/** UUID of the student receiving the chosen cards */
	studentId: z.string().uuid('Identifiant d’élève invalide'),

	/** UUID of the VIP card instance with choose_card action being used */
	actionCardInstanceId: z.string().uuid('Identifiant de carte d’action invalide'),

	/** Array of VIP card IDs to receive (e.g., ['bonus', 'azuka']) */
	chosenCardIds: z
		.array(
			z
				.string()
				.min(1, 'Identifiant de carte VIP vide')
				.max(50, 'Identifiant de carte VIP trop long')
				.regex(/^[a-z0-9-]+$/i, 'Identifiant de carte VIP invalide')
		)
		.min(1, 'Choisis au moins une carte VIP')
		.max(10, 'Impossible de choisir plus de 10 cartes VIP')
});

// ============================================================================
// TYPES
// ============================================================================

export type ChooseCardsInput = z.infer<typeof chooseCardsSchema>;
