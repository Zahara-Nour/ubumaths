import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type ItemWithTemplate = {
	id: string;
	shop_item_templates: { is_tradeable: boolean } | null;
	expires_at: string | null;
};

type ItemDetailRow = {
	id: string;
	quantity: number;
	is_equipped: boolean;
	is_locked: boolean;
	expires_at: string | null;
	shop_item_templates: {
		id: string;
		name: string;
		description: string | null;
		is_tradeable: boolean;
	} | null;
};

type TemplateDetailRow = {
	id: string;
	name: string;
	description: string | null;
	is_tradeable: boolean;
};

// ============================================================================
// ITEM VALIDATION AND OWNERSHIP
// ============================================================================

/**
 * Validates that a student owns the specified items
 * @param supabase Supabase client
 * @param studentId Student ID to check ownership for
 * @param itemIds Array of item IDs to validate
 * @returns true if student owns all items, false otherwise
 */
export async function validateItemOwnership(
	supabase: SupabaseClient<Database>,
	studentId: string,
	itemIds: string[]
): Promise<boolean> {
	if (itemIds.length === 0) return true;

	// Check all items exist and are owned by the student
	const { data, error } = await supabase
		.from('student_item_inventory')
		.select('id')
		.eq('student_id', studentId)
		.in('id', itemIds);

	if (error || !data) {
		return false;
	}

	// All specified items must be found
	return data.length === itemIds.length;
}

/**
 * Checks if items are tradeable (based on item template settings)
 * @param supabase Supabase client
 * @param itemIds Array of item IDs to check
 * @returns true if all items are tradeable, false otherwise
 */
export async function checkItemsTradeable(
	supabase: SupabaseClient<Database>,
	itemIds: string[]
): Promise<boolean> {
	if (itemIds.length === 0) return true;

	// Check all items exist and get their template info
	const { data, error } = await supabase
		.from('student_item_inventory')
		.select(
			`
			id,
			template_id,
			expires_at,
			shop_item_templates!student_item_inventory_template_id_fkey(
				is_tradeable
			)
		`
		)
		.in('id', itemIds);

	if (error || !data) {
		return false;
	}

	// Check all items are tradeable based on template and not expired
	const now = new Date().toISOString();
	return (data as ItemWithTemplate[]).every((item) => {
		// Check if the template allows trading
		const template = item.shop_item_templates;
		if (!template || !template.is_tradeable) {
			return false;
		}
		// Check item hasn't expired
		if (item.expires_at && item.expires_at < now) {
			return false;
		}
		return true;
	});
}

/**
 * Checks if items are not locked for another entity
 * @param supabase Supabase client
 * @param itemIds Array of item IDs to check
 * @returns true if all items are unlocked, false otherwise
 */
export async function checkItemsUnlocked(
	supabase: SupabaseClient<Database>,
	itemIds: string[]
): Promise<boolean> {
	if (itemIds.length === 0) return true;

	// Check no items are locked
	const { data, error } = await supabase
		.from('student_item_inventory')
		.select('id, is_locked, locked_for_listing_id, locked_for_trade_id')
		.in('id', itemIds);

	if (error || !data) {
		return false;
	}

	// All items must be unlocked (not locked for any entity)
	return data.every(
		(item) => !item.is_locked && !item.locked_for_listing_id && !item.locked_for_trade_id
	);
}

// ============================================================================
// ITEM LOCKING
// ============================================================================

/**
 * Locks items for a marketplace listing
 * @param supabase Supabase client
 * @param studentId Student who owns the items
 * @param itemIds Array of item IDs to lock
 * @param listingId ID of the listing
 * @returns Success status and optional error message
 */
export async function lockItemsForListing(
	supabase: SupabaseClient<Database>,
	studentId: string,
	itemIds: string[],
	listingId: string
): Promise<{ success: boolean; error?: string }> {
	if (itemIds.length === 0) {
		return { success: true };
	}

	// Use the RPC function to lock items
	const { data, error } = await supabase.rpc('lock_items_for_listing', {
		p_student_id: studentId,
		p_item_ids: itemIds,
		p_listing_id: listingId
	});

	if (error) {
		return {
			success: false,
			error: error.message || 'Impossible de verrouiller les objets'
		};
	}

	return { success: !!data };
}

/**
 * Locks items for a marketplace trade
 * @param supabase Supabase client
 * @param studentId Student who owns the items
 * @param itemIds Array of item IDs to lock
 * @param tradeId ID of the trade
 * @returns Success status and optional error message
 */
export async function lockItemsForTrade(
	supabase: SupabaseClient<Database>,
	studentId: string,
	itemIds: string[],
	tradeId: string
): Promise<{ success: boolean; error?: string }> {
	if (itemIds.length === 0) {
		return { success: true };
	}

	// Use the RPC function to lock items
	const { data, error } = await supabase.rpc('lock_items_for_trade', {
		p_student_id: studentId,
		p_item_ids: itemIds,
		p_trade_id: tradeId
	});

	if (error) {
		return {
			success: false,
			error: error.message || 'Impossible de verrouiller les objets'
		};
	}

	return { success: !!data };
}

/**
 * Unlocks all items associated with a listing or trade
 * @param supabase Supabase client
 * @param entityId ID of the listing or trade
 * @param entityType Type of entity ('listing' or 'trade')
 * @returns true if successful, false otherwise
 */
export async function unlockItems(
	supabase: SupabaseClient<Database>,
	entityId: string,
	entityType: 'listing' | 'trade' = 'listing'
): Promise<boolean> {
	// Use the RPC function to unlock items
	const { data, error } = await supabase.rpc('unlock_items', {
		p_entity_id: entityId,
		p_entity_type: entityType
	});

	return !error && !!data;
}

/**
 * Transfers items between students (for completed trades)
 * @param supabase Supabase client
 * @param fromStudentId Student giving the items
 * @param toStudentId Student receiving the items
 * @param itemIds Array of item IDs to transfer
 * @param tradeId The trade ID for the transfer
 * @returns Success status and optional error message
 */
export async function transferItems(
	supabase: SupabaseClient<Database>,
	fromStudentId: string,
	toStudentId: string,
	itemIds: string[],
	tradeId: string
): Promise<{ success: boolean; error?: string }> {
	if (itemIds.length === 0) {
		return { success: true };
	}

	// Use the RPC function to transfer items
	const { data, error } = await supabase.rpc('transfer_items', {
		p_from_student: fromStudentId,
		p_to_student: toStudentId,
		p_item_ids: itemIds,
		p_trade_id: tradeId
	});

	if (error) {
		return {
			success: false,
			error: error.message || 'Impossible de transférer les objets'
		};
	}

	return { success: !!data };
}

// ============================================================================
// ITEM DETAILS
// ============================================================================

/**
 * Gets item details with template information
 * @param supabase Supabase client
 * @param itemIds Array of item IDs
 * @returns Array of item details or empty array on error
 */
export async function getItemDetails(
	supabase: SupabaseClient<Database>,
	itemIds: string[]
): Promise<ItemDetailRow[]> {
	if (itemIds.length === 0) return [];

	const { data, error } = await supabase
		.from('student_item_inventory')
		.select(
			`
      id,
      quantity,
      is_equipped,
      is_locked,
      expires_at,
      item_template:shop_item_templates!student_item_inventory_template_id_fkey(
        id,
        name,
        description,
        rarity,
        icon_url,
        category,
        is_tradeable
      )
    `
		)
		.in('id', itemIds);

	if (error || !data) {
		console.error('Error fetching item details:', error);
		return [];
	}

	return data;
}

/**
 * Gets item template details
 * @param supabase Supabase client
 * @param templateIds Array of template IDs
 * @returns Array of template details or empty array on error
 */
export async function getItemTemplateDetails(
	supabase: SupabaseClient<Database>,
	templateIds: string[]
): Promise<TemplateDetailRow[]> {
	if (templateIds.length === 0) return [];

	const { data, error } = await supabase
		.from('shop_item_templates')
		.select(
			`
      id,
      name,
      description,
      rarity,
      icon_url,
      category
    `
		)
		.in('id', templateIds);

	if (error || !data) {
		console.error('Error fetching item template details:', error);
		return [];
	}

	return data;
}
