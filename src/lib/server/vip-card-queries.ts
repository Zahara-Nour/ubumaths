/**
 * Server-side VIP Card Template Query Helpers
 * Used by API endpoints and +page.server.ts files
 *
 * These functions provide direct database access for server-side code.
 * For client-side components, use the vipCardTemplates store instead.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
import type { VipCardCategory, VipCardRarity } from '$lib/types/vip-card';

/**
 * Get all VIP card templates from database
 * @param supabase - Supabase client instance
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getAllTemplates(
	supabase: SupabaseClient<Database>,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching all templates:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get a single VIP card template by ID
 * @param supabase - Supabase client instance
 * @param cardId - Card template ID
 * @returns VIP card template or null if not found
 */
export async function getTemplateById(
	supabase: SupabaseClient<Database>,
	cardId: string
): Promise<VipCardTemplate | null> {
	const { data, error } = await supabase
		.from('vip_card_templates')
		.select('*')
		.eq('id', cardId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// Not found - expected case
			return null;
		}
		console.error(`❌ [vip-card-queries] Error fetching template ${cardId}:`, error);
		throw error;
	}

	return data as VipCardTemplate;
}

/**
 * Get multiple VIP card templates by IDs
 * @param supabase - Supabase client instance
 * @param cardIds - Array of card template IDs
 * @returns Array of VIP card templates (only found cards)
 */
export async function getTemplatesByIds(
	supabase: SupabaseClient<Database>,
	cardIds: string[]
): Promise<VipCardTemplate[]> {
	if (cardIds.length === 0) {
		return [];
	}

	const { data, error } = await supabase.from('vip_card_templates').select('*').in('id', cardIds);

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching templates by IDs:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates filtered by category
 * @param supabase - Supabase client instance
 * @param category - Card category to filter by
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getTemplatesByCategory(
	supabase: SupabaseClient<Database>,
	category: VipCardCategory,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.eq('category', category)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error(`❌ [vip-card-queries] Error fetching templates by category ${category}:`, error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates filtered by rarity
 * @param supabase - Supabase client instance
 * @param rarity - Card rarity to filter by
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getTemplatesByRarity(
	supabase: SupabaseClient<Database>,
	rarity: VipCardRarity,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.eq('rarity', rarity)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error(`❌ [vip-card-queries] Error fetching templates by rarity ${rarity}:`, error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates that have actions
 * @param supabase - Supabase client instance
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates with non-null actions
 */
export async function getTemplatesWithActions(
	supabase: SupabaseClient<Database>,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.not('action', 'is', null)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching templates with actions:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get only enabled VIP card templates
 * @param supabase - Supabase client instance
 * @returns Array of enabled VIP card templates
 */
export async function getEnabledTemplates(
	supabase: SupabaseClient<Database>
): Promise<VipCardTemplate[]> {
	return getAllTemplates(supabase, true);
}

/**
 * Check if a card template exists by ID
 * @param supabase - Supabase client instance
 * @param cardId - Card template ID
 * @returns True if template exists, false otherwise
 */
export async function templateExists(
	supabase: SupabaseClient<Database>,
	cardId: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('vip_card_templates')
		.select('id')
		.eq('id', cardId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return false; // Not found
		}
		console.error(`❌ [vip-card-queries] Error checking template existence for ${cardId}:`, error);
		throw error;
	}

	return data !== null;
}
