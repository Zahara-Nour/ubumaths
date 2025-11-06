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
 * Union type for all VIP card actions
 * These actions require teacher approval to activate
 */
export type VipCardAction =
	| DrawCardsAction
	| RemoveWarningsAction
	| ExchangeCardsAction
	| AddGidouillesAction;

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
 * Complete collection of all VIP cards available in the system.
 * These descriptions are inferred from card names and can be customized by teachers.
 *
 * PERFORMANCE NOTE (2025-10-18):
 * Images now use WebP format for 65% smaller file size (1.5MB → 520KB total).
 * Browsers automatically fall back to JPG if WebP not supported.
 */
export const VIP_CARDS: VipCard[] = [
	{
		id: 'bonus',
		name: 'Bonus',
		description: '+1 sur un devoir au choix',
		imagePath: '/images/vip-cards/bonus1@0.5x.webp',
		category: 'bonus',
		rarity: 'common'
	},
	{
		id: 'super-bonus',
		name: 'Super Bonus',
		description: '+2 sur un devoir au choix',
		imagePath: '/images/vip-cards/super-bonus1@0.5x.webp',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'mega-bonus',
		name: 'Méga Bonus',
		description: '+3 points bonus sur un devoir au choix',
		imagePath: '/images/vip-cards/mega-bonus1@0.5x.webp',
		category: 'bonus',
		rarity: 'epic'
	},
	{
		id: 'coup-double',
		name: 'Coup Double',
		description: 'Choisis une évaluation qui comptera 2 fois dans ta moyenne ce trimestre.',
		imagePath: '/images/vip-cards/coup-double1@0.5x.webp',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'choix',
		name: 'Choix de Place',
		description: 'Choisis ta place en classe pour une semaine',
		imagePath: '/images/vip-cards/choix1@0.5x.webp',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'bougeotte',
		name: 'Bougeotte',
		description: 'Choisis ta place pour un cours',
		imagePath: '/images/vip-cards/bougeotte1@0.5x.webp',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'super-bougeotte',
		name: 'Super Bougeotte',
		description: 'Choisis ta place pendant une semaine',
		imagePath: '/images/vip-cards/super-bougeotte1@0.5x.webp',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'tranquilou',
		name: 'Tranquilou',
		description: 'Tu es excusé d' + "'" + 'avoir "oublié" de faire tes devoirs',
		imagePath: '/images/vip-cards/tranquilou1@0.5x.webp',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'throne',
		name: 'Game of throne',
		description: 'Prends le fauteuil du prof',
		imagePath: '/images/vip-cards/throne1@0.5x.webp',
		category: 'privilege',
		rarity: 'epic'
	},
	// {
	// 	id: 'candy',
	// 	name: 'Candy',
	// 	description: '',
	// 	imagePath: '/images/vip-cards/candy1@0.5x.webp',
	// 	category: 'privilege',
	// 	rarity: 'common'
	// },
	{
		id: 'jeu',
		name: 'Jeu',
		description: 'Choisis le jeu mathématique (avec des avantages !)',
		imagePath: '/images/vip-cards/jeu1@0.5x.webp',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'lalalalala',
		name: 'Lalalalala',
		description: "Choisis une chanson pour l'entrée ou la sortie en classe",
		imagePath: '/images/vip-cards/lalala1@0.5x.webp',
		category: 'privilege',
		rarity: 'rare'
	},
	// {
	// 	id: 'captain',
	// 	name: 'Capitaine',
	// 	description: "Devient capitaine d'équipe pour un projet",
	// 	imagePath: '/images/vip-cards/captain1@0.5x.webp',
	// 	category: 'social',
	// 	rarity: 'common'
	// },
	// {
	// 	id: 'team',
	// 	name: 'My team',
	// 	description: 'Choisis ton groupe pour un travail de groupe',
	// 	imagePath: '/images/vip-cards/team1@0.5x.webp',
	// 	category: 'social',
	// 	rarity: 'rare'
	// },
	{
		id: 'fame',
		name: "Voltaire's got talent",
		description: "C'est ton heure de gloire",
		imagePath: '/images/vip-cards/fame1@0.5x.webp',
		category: 'social',
		rarity: 'epic'
	},
	{
		id: 'help',
		name: 'Help !',
		description: "Fais toi aider par ton professeur pendant l'évaluation",
		imagePath: '/images/vip-cards/help1@0.5x.webp',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'memoire',
		name: 'Trou de mémoire',
		description: "Utilise tes cahiers pendant l'évaluation",
		imagePath: '/images/vip-cards/memoire1@0.5x.webp',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'mathemagie',
		name: 'Mathémagie',
		description: "Deviens l'assistant de Daoudini",
		imagePath: '/images/vip-cards/mathemagie1@0.5x.webp',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'alchimie',
		name: 'Alchimie',
		description: 'Transforme 3 cartes VIP en une carte Bonus',
		imagePath: '/images/vip-cards/alchimie1@0.5x.webp',
		category: 'power',
		rarity: 'epic',
		action: {
			type: 'exchange_cards',
			exchange: { mode: 'discard_for_specific', discardCount: 3, targetCardId: 'bonus' }
		}
	},
	{
		id: 'ecrabouilleur',
		name: 'Écrabouilleur',
		description: 'Enlève un avertissement',
		imagePath: '/images/vip-cards/ecrabouilleur1@0.5x.webp',
		category: 'power',
		rarity: 'rare',
		action: { type: 'remove_warnings', count: 1 }
	},
	{
		id: 'inventeur',
		name: 'Inventeur',
		description: 'Propose une nouvelle carte VIP',
		imagePath: '/images/vip-cards/inventeur1@0.5x.webp',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'batman',
		name: 'Batman and Robin',
		description: 'Deviens le super-assistant du prof',
		imagePath: '/images/vip-cards/batman1@0.5x.webp',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'soldes',
		name: 'Soldes',
		description: 'Pioche 2 nouvelles cartes VIP',
		imagePath: '/images/vip-cards/soldes1@0.5x.webp',
		category: 'bonus',
		rarity: 'common',
		action: { type: 'draw_cards', count: 2 }
	},
	{
		id: 'super-soldes',
		name: 'Super Soldes',
		description: 'Pioche 3 nouvelles cartes VIP',
		imagePath: '/images/vip-cards/soldes1@0.5x.webp',
		category: 'bonus',
		rarity: 'common',
		action: { type: 'draw_cards', count: 3 }
	},
	{
		id: 'mega-soldes',
		name: 'Méga Soldes',
		description: 'Pioche 4 nouvelles cartes VIP',
		imagePath: '/images/vip-cards/mega-soldes1@0.5x.webp',
		category: 'bonus',
		rarity: 'rare',
		action: { type: 'draw_cards', count: 4 }
	},
	// ===== NEW: Cards with Filtered Draws =====
	{
		id: 'tirage-epique',
		name: 'Tirage Épique',
		description: 'Pioche 2 cartes VIP dont au moins 1 épique ou légendaire',
		imagePath: '/images/vip-cards/mega-bonus1@0.5x.webp',
		category: 'power',
		rarity: 'epic',
		action: { type: 'draw_cards', count: 2, filters: { minRarity: 'epic' } }
	},
	{
		id: 'tirage-rare-garanti',
		name: 'Tirage Rare Garanti',
		description: 'Pioche 3 cartes VIP rares garanties',
		imagePath: '/images/vip-cards/super-bonus1@0.5x.webp',
		category: 'power',
		rarity: 'rare',
		action: { type: 'draw_cards', count: 3, filters: { forceRarity: 'rare' } }
	},
	{
		id: 'tirage-actions',
		name: 'Tirage Actions',
		description: 'Pioche 2 cartes VIP avec actions uniquement',
		imagePath: '/images/vip-cards/mathemagie1@0.5x.webp',
		category: 'power',
		rarity: 'rare',
		action: { type: 'draw_cards', count: 2, filters: { onlyCardsWithActions: true } }
	},
	{
		id: 'tirage-legendaire-exclu',
		name: 'Tirage Sélectif',
		description: 'Pioche 3 cartes VIP (exclut les cartes légendaires)',
		imagePath: '/images/vip-cards/inventeur1@0.5x.webp',
		category: 'power',
		rarity: 'rare',
		action: {
			type: 'draw_cards',
			count: 3,
			filters: { excludeCardIds: ['Sheikh', 'fortune'] }
		}
	},
	// ===== END: Cards with Filtered Draws =====
	{
		id: 'fortune',
		name: 'Roue de la Fortune',
		description: 'Remplace tes cartes VIP par des nouvelles',
		imagePath: '/images/vip-cards/fortune1@0.5x.webp',
		category: 'power',
		rarity: 'legendary',
		action: { type: 'exchange_cards', exchange: { mode: 'replace_random', count: 5 } }
	},
	{
		id: 'Sheikh',
		name: 'Sheikh - Sheikha',
		description:
			'Prends le fauteuil du professeur, bois un karak, et fais toi appeler Sheikh ou Sheikha par ton professeur',
		imagePath: '/images/vip-cards/Sheikh1@0.5x.webp',
		category: 'power',
		rarity: 'legendary',
		action: { type: 'add_gidouilles', amount: 50 }
	}
];

/**
 * Get a VIP card definition by ID
 */
export function getVipCardById(id: string): VipCard | undefined {
	return VIP_CARDS.find((card) => card.id === id);
}

/**
 * Get all VIP cards by category
 */
export function getVipCardsByCategory(category: VipCardCategory): VipCard[] {
	return VIP_CARDS.filter((card) => card.category === category);
}

/**
 * Get all VIP cards by rarity
 */
export function getVipCardsByRarity(rarity: VipCardRarity): VipCard[] {
	return VIP_CARDS.filter((card) => card.rarity === rarity);
}

/**
 * Get all VIP cards that have actions
 */
export function getVipCardsWithActions(): VipCard[] {
	return VIP_CARDS.filter((card) => card.action !== undefined);
}

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

/**
 * Get total number of unique VIP cards available
 */
export function getTotalVipCards(): number {
	return VIP_CARDS.length;
}

/**
 * Type for student's VIP cards storage (JSONB in database)
 * Key: unique instance ID (UUID)
 * Value: VipCardInstance
 */
export type StudentVipCards = Record<string, VipCardInstance>;
