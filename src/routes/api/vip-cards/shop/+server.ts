/**
 * API Endpoint: VIP Cards Shop
 * =============================
 *
 * Public endpoint to list purchasable VIP cards.
 *
 * GET /api/vip-cards/shop
 *
 * Returns all VIP card templates that are:
 * - is_purchasable = true
 * - is_enabled = true
 *
 * SECURITY:
 * ---------
 * - Requires authentication (any role)
 * - Returns only public card information (no sensitive data)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ShopCard {
	id: string;
	name: string;
	description: string;
	rarity: string;
	base_price: number;
	image_path: string;
	max_owned_per_student: number;
	uses_total: number | null;
	category: string | null;
}

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	// Require authentication (any role can view the shop)
	await requireAuth(locals);
	const supabase = locals.supabase;

	// Fetch all purchasable and enabled cards
	const { data: cards, error: fetchError } = await supabase
		.from('vip_card_templates')
		.select(
			`
			id,
			name,
			description,
			rarity,
			base_price,
			image_path,
			max_owned_per_student,
			uses_total,
			category
		`
		)
		.eq('is_purchasable', true)
		.eq('is_enabled', true)
		.order('rarity', { ascending: true })
		.order('base_price', { ascending: true })
		.order('name', { ascending: true });

	if (fetchError) {
		console.error('[shop] Error fetching cards:', fetchError);
		throw error(500, `Failed to fetch shop cards: ${fetchError.message}`);
	}

	// Return the cards with type assertion
	return json({
		success: true,
		cards: cards as ShopCard[]
	});
};
