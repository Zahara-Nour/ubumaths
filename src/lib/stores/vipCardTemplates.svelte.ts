/**
 * Client-side store for VIP card templates
 * Loaded once at app startup from database via root layout
 * Provides fast access to card data for client components
 */

import { writable } from 'svelte/store';
import type { VipCard, VipCardAction, VipCardCategory, VipCardRarity } from '$lib/types/vip-card';
import type { Database } from '$lib/types/database';

// Template type from database with properly typed action field
type VipCardTemplateRow = Database['public']['Tables']['vip_card_templates']['Row'];

export interface VipCardTemplate extends Omit<VipCardTemplateRow, 'action'> {
	action: VipCardAction | null;
}

// Create the writable store
export const vipCardTemplates = writable<VipCardTemplate[]>([]);

/**
 * Initialize the store with templates from database
 * Called once at app startup from root layout
 */
export function initializeTemplates(templates: VipCardTemplate[]) {
	vipCardTemplates.set(templates);
}

/**
 * Get a template by ID
 */
export function getTemplateById(
	id: string,
	templates: VipCardTemplate[]
): VipCardTemplate | undefined {
	return templates.find((card) => card.id === id);
}

/**
 * Get all templates filtered by category
 */
export function getTemplatesByCategory(
	category: VipCardCategory,
	templates: VipCardTemplate[]
): VipCardTemplate[] {
	return templates.filter((card) => card.category === category);
}

/**
 * Get all templates filtered by rarity
 */
export function getTemplatesByRarity(
	rarity: VipCardRarity,
	templates: VipCardTemplate[]
): VipCardTemplate[] {
	return templates.filter((card) => card.rarity === rarity);
}

/**
 * Get all templates that have actions (non-null action field)
 */
export function getTemplatesWithActions(templates: VipCardTemplate[]): VipCardTemplate[] {
	return templates.filter((card) => card.action !== null);
}

/**
 * Get all enabled templates (is_enabled = true)
 */
export function getEnabledTemplates(templates: VipCardTemplate[]): VipCardTemplate[] {
	return templates.filter((card) => card.is_enabled);
}

/**
 * Convert a database template to VipCard format (for backward compatibility)
 * Maps database snake_case fields to camelCase VipCard interface
 */
export function templateToVipCard(template: VipCardTemplate): VipCard {
	return {
		id: template.id,
		name: template.name,
		description: template.description,
		imagePath: template.image_path,
		category: template.category as VipCardCategory | undefined,
		rarity: template.rarity as VipCardRarity,
		action: template.action ?? undefined
	};
}

/**
 * Get all templates sorted by sort_order (ascending)
 */
export function getSortedTemplates(templates: VipCardTemplate[]): VipCardTemplate[] {
	return [...templates].sort((a, b) => {
		const orderA = a.sort_order ?? 999;
		const orderB = b.sort_order ?? 999;
		return orderA - orderB;
	});
}

/**
 * Search templates by name or description (case-insensitive)
 */
export function searchTemplates(query: string, templates: VipCardTemplate[]): VipCardTemplate[] {
	const lowerQuery = query.toLowerCase();
	return templates.filter(
		(card) =>
			card.name.toLowerCase().includes(lowerQuery) ||
			card.description.toLowerCase().includes(lowerQuery)
	);
}
