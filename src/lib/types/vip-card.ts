// VIP Card Type Definitions
// =========================
// This file defines the structure and data for the VIP card reward system.

import type { WarningType } from '$lib/server/warnings';

/**
 * How the VIP card was acquired.
 *
 * Instance JSONB (profiles.vip_cards) values:
 *   purchase, draw, teacher_draw, teacher_award, trade, choose, exchange
 *
 * Activity metadata (vip_cards_activity.metadata.acquired_from) also uses:
 *   draw_gidouilles, draw_vip_card (more granular draw sources)
 */
export type VipCardAcquisitionSource =
	| 'purchase' // Student bought with gidouilles
	| 'draw' // Generic random draw (legacy / award_vip_card_no_cost default)
	| 'draw_gidouilles' // Draw paid with gidouilles (draw_multiple_vip_cards)
	| 'draw_vip_card' // Draw paid with VIP card (draw_multiple_vip_cards)
	| 'teacher_draw' // Teacher-initiated random draw (costs 3 gidouilles)
	| 'teacher_award' // Teacher gave specific card for free
	| 'trade' // Received via student-to-student trade
	| 'choose' // Selected via choose_card action
	| 'exchange'; // Obtained via exchange_cards action

/**
 * Represents an instance of a VIP card owned by a student.
 * Each card can have multiple instances (student can collect duplicates).
 *
 * STATE FLOW:
 * 1. Owned (not requested): activationRequestedAt = null
 * 2. Pending approval: activationRequestedAt != null && activationApprovedAt = null
 * 3. Approved (ready to activate): activationApprovedAt != null && usedAt = null
 * 4. Activated (used): usedAt != null
 *
 * CONSUMABLE CARDS:
 * - usesRemaining starts at uses_total from template
 * - Each use decrements usesRemaining
 * - When usesRemaining = 0, usedAt is set
 */
export interface VipCardInstance {
	cardId: string; // ID of the card definition
	earnedAt: string; // ISO timestamp when card was earned
	usedAt: string | null; // ISO timestamp when card was consumed, null if not used
	activationRequestedAt?: string | null; // ISO timestamp when activation was requested by student
	activationRequestedBy?: string | null; // UUID of student who requested activation
	activationApprovedAt?: string | null; // ISO timestamp when teacher approved the activation
	activationApprovedBy?: string | null; // UUID of teacher who approved activation
	// Purchase fields
	purchasedAt?: string | null; // ISO timestamp when card was purchased (null if not purchased)
	acquiredFrom?: VipCardAcquisitionSource; // How the card was acquired
	// Consumable fields
	usesRemaining?: number | null; // For consumables: remaining uses. null = single-use card
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
 * Narrows the `category` text column to {@link VipCardCategory}.
 *
 * Postgres stores it as plain text and allows NULL, so every read arrives as
 * `string | null`. An unrecognised value becomes `null`, which the UI already
 * handles as "uncategorised".
 */
export function asVipCardCategory(value: string | null | undefined): VipCardCategory | null {
	return value === 'bonus' || value === 'privilege' || value === 'social' || value === 'power'
		? value
		: null;
}

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
	count?: number; // Optional: Fixed number of cards to replace. If omitted, user can choose 1-maxCount cards
	maxCount?: number; // Optional: Max cards to exchange in flexible mode (default 10)
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
	context?: string; // Activation context (e.g., 'any', 'minesweeper')
}

/**
 * VIP Card Action - Remove warnings
 * Removes N warnings from student record (optionally filtered by type)
 */
interface RemoveWarningsAction {
	type: 'remove_warnings';
	count: number; // Number of warnings to remove
	warningType?: WarningType; // Optional: specific warning type to remove (C, M, R, T)
	context?: string; // Activation context (e.g., 'any', 'minesweeper')
}

/**
 * VIP Card Action - Exchange cards
 * Various modes for trading cards (see ExchangeCardAction)
 */
interface ExchangeCardsAction {
	type: 'exchange_cards';
	exchange: ExchangeCardAction;
	context?: string; // Activation context (e.g., 'any', 'minesweeper')
}

/**
 * VIP Card Action - Add gidouilles
 * Adds bonus gidouilles to student balance
 */
interface AddGidouillesAction {
	type: 'add_gidouilles';
	amount: number; // Number of gidouilles to add
	context?: string; // Activation context (e.g., 'any', 'minesweeper')
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
	context?: string; // Activation context (e.g., 'any', 'minesweeper')
}

/**
 * VIP Card Action - Hint
 * Provides a hint in a specific game context.
 * Behavior varies by context (e.g., minesweeper = reveal a safe cell).
 */
interface HintAction {
	type: 'hint';
	context?: string; // Activation context (e.g., 'minesweeper')
}

/**
 * VIP Card Action - Undo
 * Reverts the last action in a specific game context.
 * The game context is determined by the action's context field.
 */
interface UndoAction {
	type: 'undo';
	context?: string; // Activation context (e.g., 'minesweeper')
}

/**
 * VIP Card Action - Freeze Timer
 * Freezes the game timer for a specified duration.
 * The timer resumes automatically when the duration expires or the game ends.
 */
interface FreezeTimerAction {
	type: 'freeze_timer';
	duration: number; // Duration in seconds (e.g., 60)
	context?: string; // Activation context (e.g., 'minesweeper')
}

/**
 * VIP Card Action - Detector
 * Detects a mine and flags it in a specific game context.
 * Behavior varies by context (e.g., minesweeper = flag a random mine cell).
 */
interface DetectorAction {
	type: 'detector';
	context?: string; // Activation context (e.g., 'minesweeper')
}

/**
 * VIP Card Action - Bomb
 * Removes a tile up to a maximum value from the 2048 board.
 * The max_target_value determines which tiles can be targeted.
 */
interface BombAction {
	type: 'bomb';
	max_target_value: number; // Max tile value that can be removed (e.g., 4, 16, 64)
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Freeze Spawn
 * Prevents a new tile from spawning after the next move in 2048.
 */
interface FreezeSpawnAction {
	type: 'freeze_spawn';
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Fusion
 * Merges two adjacent identical tiles without a global move in 2048.
 */
interface FusionAction {
	type: 'fusion';
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Joker
 * Changes a tile's value to match its highest-value adjacent neighbor in 2048.
 */
interface JokerAction {
	type: 'joker';
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Vision
 * Pre-shows where the next tile will spawn for N moves in 2048.
 */
interface VisionAction {
	type: 'vision';
	duration: number; // Number of moves to preview (e.g., 3)
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Multiplier
 * Multiplies score gained from each merge for the rest of the game in 2048.
 */
interface MultiplierAction {
	type: 'multiplier';
	factor: number; // Multiplier factor (e.g., 1.5, 2)
	context?: string; // Activation context (e.g., '2048')
}

/**
 * VIP Card Action - Reveal Vowels
 * Reveals a limited number of vowel positions in a Wordle-style game.
 */
interface RevealVowelsAction {
	type: 'reveal_vowels';
	context?: string; // Activation context (e.g., 'mathemo')
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
	| ChooseCardAction
	| HintAction
	| UndoAction
	| FreezeTimerAction
	| DetectorAction
	| BombAction
	| FreezeSpawnAction
	| FusionAction
	| JokerAction
	| VisionAction
	| MultiplierAction
	| RevealVowelsAction;

/**
 * Narrows the `action` jsonb column to {@link VipCardAction}.
 *
 * The union is large and discriminated by `type`; validating each member here
 * would duplicate the whole catalogue and drift from it. The guard therefore
 * checks the shape that every member shares — an object carrying a string
 * `type` — and leaves the exhaustive dispatch to the consumer, which already
 * switches on that discriminant.
 *
 * Anything else becomes `null`: a card whose action was written by an older
 * revision must stay displayable, simply without an action.
 */
export function asVipCardAction(value: unknown): VipCardAction | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const type = (value as Record<string, unknown>).type;
	return typeof type === 'string' ? (value as VipCardAction) : null;
}

/**
 * Definition of a VIP card type (template)
 */
export interface VipCard {
	id: string; // Unique identifier (matches image filename without extension)
	name: string; // Display name in French
	description: string; // Description of the privilege in French
	imagePath?: string; // Path to card front image (optional, computed from id if not provided)
	category?: VipCardCategory | null; // Optional category for UI filtering (null from database)
	rarity: VipCardRarity; // Required rarity level
	action?: VipCardAction | null; // Optional action that can be activated (null from database)
	// Purchase fields (from database)
	basePrice?: number; // Price in gidouilles (from DB, varies per card)
	isPurchasable?: boolean; // Whether this card can be purchased
	maxOwnedPerStudent?: number; // Maximum active copies a student can own (default: 5)
	// Consumable fields
	usesTotal?: number | null; // Number of uses for consumables (null = single-use)
}

/**
 * Rarity-based pricing map (fallback for passive cards when basePrice is missing)
 */
export const RARITY_PRICES: Record<VipCardRarity, number> = {
	common: 5,
	rare: 15,
	epic: 40,
	legendary: 80
};

/**
 * Get the base price for a card based on its rarity
 */
export function getRarityPrice(rarity: VipCardRarity): number {
	return RARITY_PRICES[rarity];
}

/**
 * Result of a VIP card purchase attempt
 */
export interface PurchaseVipCardResult {
	success: boolean;
	instance?: {
		instanceId: string;
		cardId: string;
		purchasedAt: string;
		acquiredFrom: 'purchase';
		usesRemaining: number | null;
	};
	oldBalance?: number;
	newBalance?: number;
	priceDeducted?: number;
	currentOwned?: number;
	maxOwned?: number;
	error?: string;
}

/**
 * Result of using a VIP card (unified for all roles)
 */
export interface UseCardResult {
	success: boolean;
	cardName?: string;
	instanceId?: string;
	cardId?: string;
	usesRemaining?: number | null;
	isFullyConsumed?: boolean;
	usedAt?: string | null;
	error?: string;
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
 * Narrows the `profiles.vip_cards` jsonb column to {@link StudentVipCards}.
 *
 * The column holds a map of instance id to card instance. Its generated type
 * is `Json`, so the value was cast — inside a `try/catch` that could never
 * fire, since a cast throws nothing. The safety was imaginary.
 *
 * Entries missing the two fields every consumer reads (`cardId`, `earnedAt`)
 * are dropped: a malformed instance would otherwise surface in the inventory
 * as a card with no identity.
 */
export function asStudentVipCards(value: unknown): StudentVipCards {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

	const cartes: StudentVipCards = {};
	for (const [instanceId, instance] of Object.entries(value)) {
		if (typeof instance !== 'object' || instance === null || Array.isArray(instance)) continue;
		const brut = instance as Record<string, unknown>;
		if (typeof brut.cardId !== 'string' || typeof brut.earnedAt !== 'string') continue;
		cartes[instanceId] = brut as unknown as VipCardInstance;
	}
	return cartes;
}

/**
 * REMOVED (2025-11-08):
 * - VIP_CARDS array (~280 lines) - Now in `vip_card_templates` database table
 * - getVipCardById(), getVipCardsByCategory(), getVipCardsByRarity(), getVipCardsWithActions(), getTotalVipCards()
 *
 * Use instead:
 * - Client: vipCardTemplates store (src/lib/stores/vipCardTemplates.svelte.ts)
 * - Server: Query helpers (src/lib/server/vip-card-queries.ts)
 */
