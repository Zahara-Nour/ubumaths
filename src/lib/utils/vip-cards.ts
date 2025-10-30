// VIP Card Utility Functions
// ===========================
// Helper functions for managing VIP cards in the reward system

import type { StudentVipCards } from '$lib/types/vip-card';
import { getVipCardById } from '$lib/types/vip-card';

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
 * Get student cards with their counts, grouped by card ID
 * Returns an array of objects with card data and count
 */
export function getStudentCardsWithCounts(vipCards: StudentVipCards): Array<{
	cardId: string;
	count: number;
	card: StudentVipCards[string];
}> {
	const cardMap = new Map<
		string,
		{ cardId: string; count: number; card: StudentVipCards[string] }
	>();

	Object.values(vipCards).forEach((instance) => {
		if (instance.usedAt === null) {
			const existing = cardMap.get(instance.cardId);
			if (existing) {
				existing.count++;
			} else {
				cardMap.set(instance.cardId, {
					cardId: instance.cardId,
					count: 1,
					card: instance
				});
			}
		}
	});

	return Array.from(cardMap.values());
}

/**
 * Get the number of unique card types owned by student (only unused cards)
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
 * Get total number of unused cards owned by student
 */
export function getTotalUnusedCards(vipCards: StudentVipCards): number {
	return Object.values(vipCards).filter((instance) => instance.usedAt === null).length;
}

/**
 * Sort cards by priority: rarity (legendary > epic > rare > common) then by count (desc)
 */
export function sortCardsByPriority(
	cards: Array<{ cardId: string; count: number; card: StudentVipCards[string] }>
): Array<{ cardId: string; count: number; card: StudentVipCards[string] }> {
	const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };

	return cards.sort((a, b) => {
		// Look up card definitions to get rarity
		const cardDefA = getVipCardById(a.cardId);
		const cardDefB = getVipCardById(b.cardId);

		// First sort by rarity (legendary first)
		const rarityA = cardDefA?.rarity ? rarityOrder[cardDefA.rarity as keyof typeof rarityOrder] : 99;
		const rarityB = cardDefB?.rarity ? rarityOrder[cardDefB.rarity as keyof typeof rarityOrder] : 99;

		if (rarityA !== rarityB) {
			return rarityA - rarityB;
		}

		// Then sort by count (higher count first)
		return b.count - a.count;
	});
}
