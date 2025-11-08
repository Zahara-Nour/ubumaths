// VIP Card Type Definitions
// =========================
// This file defines the structure and data for the VIP card reward system.

import type { WarningType } from '$lib/server/warnings';

/**
 * Represents an instance of a VIP card owned by a student.
 * Each card can have multiple instances (student can collect duplicates).
 */
export interface VipCardInstance {
	cardId: string; // ID of the card definition
	earnedAt: string; // ISO timestamp when card was earned
	usedAt: string | null; // ISO timestamp when card was consumed, null if not used
	activationRequestedAt?: string | null; // ISO timestamp when activation was requested by student
	activationRequestedBy?: string | null; // UUID of student who requested activation
}

/**
 * Category of VIP card privilege (optional - for UI filtering)
 */
export type VipCardCategory =
	| 'bonus' // Bonus points and academic rewards
	| 'privilege' // Classroom privileges and special permissions
	| 'social' // Social and team-related perks
	| 'power'; // Special abilities and game-changers

/**
 * Rarity level of VIP card (required for all cards)
 */
export type VipCardRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Exchange card action - Mode 1: Replace random cards
 * Student discards N cards and receives N random new cards
 */
interface ExchangeReplaceRandom {
	mode: 'replace_random';
	count: number; // Number of cards to replace
}

/**
 * Exchange card action - Mode 2: Rarity points system
 * Student can discard cards worth points to get a card of specific rarity
 * Points: common=1, rare=3, epic=9, legendary=27
 */
interface ExchangeRarityPoints {
	mode: 'rarity_points';
	targetRarity: VipCardRarity; // Rarity of card to obtain
	pointsRequired: number; // Total points needed
}

/**
 * Exchange card action - Mode 3: Discard for specific card
 * Student discards N cards to get a specific predefined card
 */
interface ExchangeDiscardForSpecific {
	mode: 'discard_for_specific';
	discardCount: number; // Number of cards to discard
	targetCardId: string; // ID of specific card to obtain
}

/**
 * Union type for all exchange card modes
 */
export type ExchangeCardAction =
	| ExchangeReplaceRandom
	| ExchangeRarityPoints
	| ExchangeDiscardForSpecific;

/**
 * Filters for draw_cards action
 * Allows fine-grained control over which cards can be drawn
 */
export interface DrawCardsFilters {
	forceRarity?: VipCardRarity; // Force all drawn cards to be of this rarity
	minRarity?: VipCardRarity; // Guarantee at least 1 card of this minimum rarity
	excludeCardIds?: string[]; // Card IDs to exclude from the draw pool
	onlyCardsWithActions?: boolean; // Only draw cards that have actions
}

/**
 * VIP Card Action - Draw random cards
 * Awards N random VIP cards to the student (no gidouilles cost)
 */
interface DrawCardsAction {
	type: 'draw_cards';
	count: number; // Number of cards to draw
	filters?: DrawCardsFilters; // Optional filters to control which cards can be drawn
}

/**
 * VIP Card Action - Remove warnings
 * Removes N warnings from student record (optionally filtered by type)
 */
interface RemoveWarningsAction {
	type: 'remove_warnings';
	count: number; // Number of warnings to remove
	warningType?: WarningType; // Optional: specific warning type to remove (C, M, R, T)
}

/**
 * VIP Card Action - Exchange cards
 * Various modes for trading cards (see ExchangeCardAction)
 */
interface ExchangeCardsAction {
	type: 'exchange_cards';
	exchange: ExchangeCardAction;
}

/**
 * VIP Card Action - Add gidouilles
 * Adds bonus gidouilles to student balance
 */
interface AddGidouillesAction {
	type: 'add_gidouilles';
	amount: number; // Number of gidouilles to add
}

/**
 * VIP Card Action - Choose specific cards
 * Allows user to select N specific VIP cards to receive (free, no discard cost)
 *
 * Supports 3 filter modes:
 * 1. All cards: filter: 'all' (default)
 * 2. Limited by rarity: maxRarity: 'epic' (e.g., only common/rare/epic)
 * 3. Specific list: possibleCardIds: ['azuka', 'bonus']
 */
interface ChooseCardAction {
	type: 'choose_card';
	count: number; // Number of cards user can choose

	// Filter modes (mutually exclusive - use only one)
	filter?: 'all'; // Mode 1: All cards available (default)
	maxRarity?: VipCardRarity; // Mode 2: Limit by max rarity (e.g., 'epic' = common/rare/epic only)
	possibleCardIds?: string[]; // Mode 3: Specific list of allowed card IDs
}

/**
 * Union type for all VIP card actions
 * These actions require teacher approval to activate
 */
export type VipCardAction =
	| DrawCardsAction
	| RemoveWarningsAction
	| ExchangeCardsAction
	| AddGidouillesAction
	| ChooseCardAction;

/**
 * Definition of a VIP card type
 */
export interface VipCard {
	id: string; // Unique identifier (matches image filename without extension)
	name: string; // Display name in French
	description: string; // Description of the privilege in French
	imagePath: string; // Path to card front image
	category?: VipCardCategory; // Optional category for UI filtering
	rarity: VipCardRarity; // Required rarity level
	action?: VipCardAction; // Optional action that can be activated
}

/**
 * DEPRECATED: VIP_CARDS array removed (2025-11-08)
 * VIP card definitions are now stored in the `vip_card_templates` database table.
 * Use the vipCardTemplates store (client) or vip-card-queries.ts (server) instead.
 */

/**
 * Calculate rarity points for exchange system
 * common=1, rare=3, epic=9, legendary=27
 */
export function getRarityPoints(rarity: VipCardRarity): number {
	const pointsMap: Record<VipCardRarity, number> = {
		common: 1,
		rare: 3,
		epic: 9,
		legendary: 27
	};
	return pointsMap[rarity];
}

export type StudentVipCards = Record<string, VipCardInstance>;

/**
 * REMOVED (2025-11-08):
 * - VIP_CARDS array (~280 lines) - Now in `vip_card_templates` database table
 * - getVipCardById(), getVipCardsByCategory(), getVipCardsByRarity(), getVipCardsWithActions(), getTotalVipCards()
 *
 * Use instead:
 * - Client: vipCardTemplates store (src/lib/stores/vipCardTemplates.svelte.ts)
 * - Server: Query helpers (src/lib/server/vip-card-queries.ts)
 */
