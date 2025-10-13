// VIP Card Utility Functions
// ===========================
// Helper functions for managing VIP cards in the reward system

import {
	VIP_CARDS,
	getVipCardById,
	type VipCard,
	type VipCardInstance,
	type StudentVipCards
} from '$lib/types/vip-card';

/**
 * Cost in gidouilles to purchase one VIP card
 */
export const VIP_CARD_COST = 3;

/**
 * Check if a student can afford to purchase a VIP card
 */
export function canAffordVipCard(gidouilles: number): boolean {
	return gidouilles >= VIP_CARD_COST;
}

/**
 * Get a random VIP card from the collection.
 * Uses weighted random selection based on rarity.
 *
 * Rarity weights:
 * - common: 40%
 * - rare: 30%
 * - epic: 20%
 * - legendary: 10%
 */
export function getRandomVipCard(): VipCard {
	// Build weighted array based on rarity
	const weighted: VipCard[] = [];

	VIP_CARDS.forEach((card) => {
		const weight = getRarityWeight(card.rarity || 'common');
		for (let i = 0; i < weight; i++) {
			weighted.push(card);
		}
	});

	// Select random card from weighted array
	const randomIndex = Math.floor(Math.random() * weighted.length);
	return weighted[randomIndex];
}

/**
 * Get weight for rarity-based random selection
 */
function getRarityWeight(rarity: 'common' | 'rare' | 'epic' | 'legendary'): number {
	switch (rarity) {
		case 'common':
			return 40;
		case 'rare':
			return 30;
		case 'epic':
			return 20;
		case 'legendary':
			return 10;
		default:
			return 30;
	}
}

/**
 * Get count of each card type owned by student (only counting unused cards).
 * Returns a Map where key is cardId and value is count of unused instances.
 */
export function getStudentCardCounts(vipCards: StudentVipCards): Map<string, number> {
	const counts = new Map<string, number>();

	// Count only unused cards
	Object.values(vipCards).forEach((instance) => {
		if (instance.usedAt === null) {
			const current = counts.get(instance.cardId) || 0;
			counts.set(instance.cardId, current + 1);
		}
	});

	return counts;
}

/**
 * Get all unique cards owned by student with their counts and details.
 * Returns array of cards with count property.
 */
export function getStudentCardsWithCounts(vipCards: StudentVipCards): Array<VipCard & { count: number; instances: VipCardInstance[] }> {
	const counts = getStudentCardCounts(vipCards);
	const cardsWithCounts: Array<VipCard & { count: number; instances: VipCardInstance[] }> = [];

	// Get all instances grouped by cardId
	const instancesByCardId = new Map<string, VipCardInstance[]>();
	Object.values(vipCards).forEach((instance) => {
		if (instance.usedAt === null) {
			const instances = instancesByCardId.get(instance.cardId) || [];
			instances.push(instance);
			instancesByCardId.set(instance.cardId, instances);
		}
	});

	// Build array with card definitions and counts
	counts.forEach((count, cardId) => {
		const cardDef = getVipCardById(cardId);
		if (cardDef) {
			cardsWithCounts.push({
				...cardDef,
				count,
				instances: instancesByCardId.get(cardId) || []
			});
		}
	});

	return cardsWithCounts;
}

/**
 * Get total count of unused VIP cards owned by student
 */
export function getTotalUnusedCards(vipCards: StudentVipCards): number {
	return Object.values(vipCards).filter((instance) => instance.usedAt === null).length;
}

/**
 * Get total count of used VIP cards
 */
export function getTotalUsedCards(vipCards: StudentVipCards): number {
	return Object.values(vipCards).filter((instance) => instance.usedAt !== null).length;
}

/**
 * Get count of unique card types owned (regardless of duplicates)
 */
export function getUniqueCardTypesCount(vipCards: StudentVipCards): number {
	const uniqueCardIds = new Set<string>();
	Object.values(vipCards).forEach((instance) => {
		if (instance.usedAt === null) {
			uniqueCardIds.add(instance.cardId);
		}
	});
	return uniqueCardIds.size;
}

/**
 * Add a new VIP card instance to student's collection.
 * This is used client-side for optimistic updates.
 * Server-side addition is handled by RPC function.
 */
export function addCardToStudentCollection(
	vipCards: StudentVipCards,
	cardId: string
): StudentVipCards {
	// Generate a temporary UUID (will be replaced by server)
	const instanceId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	return {
		...vipCards,
		[instanceId]: {
			cardId,
			earnedAt: new Date().toISOString(),
			usedAt: null
		}
	};
}

/**
 * Mark a VIP card instance as used.
 * This is used client-side for optimistic updates.
 * Server-side usage is handled by RPC function.
 */
export function markCardAsUsed(
	vipCards: StudentVipCards,
	cardId: string
): StudentVipCards | null {
	// Find the oldest unused instance of this card
	let oldestInstanceId: string | null = null;
	let oldestDate: string | null = null;

	Object.entries(vipCards).forEach(([instanceId, instance]) => {
		if (instance.cardId === cardId && instance.usedAt === null) {
			if (oldestDate === null || instance.earnedAt < oldestDate) {
				oldestDate = instance.earnedAt;
				oldestInstanceId = instanceId;
			}
		}
	});

	if (oldestInstanceId === null) {
		// No unused instance found
		return null;
	}

	// Mark it as used
	return {
		...vipCards,
		[oldestInstanceId]: {
			...vipCards[oldestInstanceId],
			usedAt: new Date().toISOString()
		}
	};
}

/**
 * Check if student owns at least one unused instance of a specific card
 */
export function hasUnusedCard(vipCards: StudentVipCards, cardId: string): boolean {
	return Object.values(vipCards).some(
		(instance) => instance.cardId === cardId && instance.usedAt === null
	);
}

/**
 * Sort cards by category and then by rarity
 */
export function sortCardsByPriority(
	cards: Array<VipCard & { count: number }>
): Array<VipCard & { count: number }> {
	const categoryOrder: Record<string, number> = {
		legendary: 0,
		epic: 1,
		rare: 2,
		common: 3
	};

	return cards.sort((a, b) => {
		// First sort by rarity
		const rarityA = categoryOrder[a.rarity || 'common'];
		const rarityB = categoryOrder[b.rarity || 'common'];

		if (rarityA !== rarityB) {
			return rarityA - rarityB;
		}

		// Then alphabetically by name
		return a.name.localeCompare(b.name);
	});
}

/**
 * Format earned date for display
 */
export function formatEarnedDate(earnedAt: string): string {
	const date = new Date(earnedAt);
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}
