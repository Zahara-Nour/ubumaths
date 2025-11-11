// VIP Card Utility Functions
// ===========================
// Helper functions for managing VIP cards in the reward system

import type { StudentVipCards, VipCardAction } from '$lib/types/vip-card';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
import { getTemplateById } from '$lib/stores/vipCardTemplates.svelte';

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
 * NOTE: Returns the full VipCard definition, not just the instance
 */
export function getStudentCardsWithCounts(
	vipCards: StudentVipCards,
	templates: VipCardTemplate[]
): Array<{
	id: string;
	name: string;
	description: string;
	imagePath: string;
	category?: string;
	rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	action?: VipCardAction;
	count: number;
}> {
	const cardMap = new Map<
		string,
		{
			id: string;
			name: string;
			description: string;
			imagePath: string;
			category?: string;
			rarity?: 'common' | 'rare' | 'epic' | 'legendary';
			action?: VipCardAction;
			count: number;
		}
	>();

	Object.values(vipCards).forEach((instance) => {
		if (instance.usedAt === null) {
			const template = getTemplateById(instance.cardId, templates);
			if (!template) return; // Skip if card template not found

			const existing = cardMap.get(instance.cardId);
			if (existing) {
				existing.count++;
			} else {
				cardMap.set(instance.cardId, {
					id: template.id,
					name: template.name,
					description: template.description,
					imagePath: template.image_path,
					category: template.category || undefined,
					rarity: template.rarity as 'common' | 'rare' | 'epic' | 'legendary',
					action: template.action ?? undefined,
					count: 1
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
	cards: Array<{
		id: string;
		name: string;
		description: string;
		imagePath: string;
		category?: string;
		rarity?: 'common' | 'rare' | 'epic' | 'legendary';
		action?: VipCardAction;
		count: number;
	}>
): Array<{
	id: string;
	name: string;
	description: string;
	imagePath: string;
	category?: string;
	rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	action?: VipCardAction;
	count: number;
}> {
	const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };

	return cards.sort((a, b) => {
		// First sort by rarity (legendary first)
		const rarityA = a.rarity ? rarityOrder[a.rarity as keyof typeof rarityOrder] : 99;
		const rarityB = b.rarity ? rarityOrder[b.rarity as keyof typeof rarityOrder] : 99;

		if (rarityA !== rarityB) {
			return rarityA - rarityB;
		}

		// Then sort by count (higher count first)
		return b.count - a.count;
	});
}

/**
 * Get human-readable French description of a VIP card action
 */
export function getActionDescription(action: VipCardAction, templates: VipCardTemplate[]): string {
	switch (action.type) {
		case 'draw_cards':
			return `Piocher ${action.count} carte${action.count > 1 ? 's' : ''} VIP`;

		case 'remove_warnings':
			if (action.warningType) {
				const typeNames = {
					C: 'Comportement',
					M: 'Matériel',
					R: 'Retard',
					T: 'Travail'
				};
				return `Enlever ${action.count} avertissement${action.count > 1 ? 's' : ''} (${typeNames[action.warningType]})`;
			}
			return `Enlever ${action.count} avertissement${action.count > 1 ? 's' : ''}`;

		case 'exchange_cards':
			if (action.exchange.mode === 'replace_random') {
				const count = action.exchange.count ?? 0;
				return count
					? `Échanger ${count} carte${count > 1 ? 's' : ''} contre de nouvelles cartes`
					: `Échanger des cartes contre de nouvelles cartes`;
			} else if (action.exchange.mode === 'rarity_points') {
				const rarityNames = {
					common: 'commune',
					rare: 'rare',
					epic: 'épique',
					legendary: 'légendaire'
				};
				return `Échanger des cartes contre une carte ${rarityNames[action.exchange.targetRarity]}`;
			} else {
				// discard_for_specific
				const targetTemplate = getTemplateById(action.exchange.targetCardId, templates);
				return `Échanger ${action.exchange.discardCount} carte${action.exchange.discardCount > 1 ? 's' : ''} contre ${targetTemplate?.name || action.exchange.targetCardId}`;
			}

		case 'add_gidouilles':
			return `Gagner ${action.amount} gidouille${action.amount > 1 ? 's' : ''}`;

		default:
			return 'Action spéciale';
	}
}
