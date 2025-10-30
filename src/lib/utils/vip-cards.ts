// VIP Card Utility Functions
// ===========================
// Helper functions for managing VIP cards in the reward system

import type { StudentVipCards } from '$lib/types/vip-card';

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
