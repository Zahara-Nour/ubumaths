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

interface ShopCardDb {
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

interface ShopCardResponse {
	id: string;
	name: string;
	description: string;
	rarity: string;
	basePrice: number;
	imagePath: string;
	maxOwnedPerStudent: number;
	usesTotal: number | null;
	category: string | null;
}

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	// Require authentication (any role can view the shop)
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Fetch all purchasable and enabled cards + user balance in parallel
	const [cardsResult, profileResult] = await Promise.all([
		supabase
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
			.order('name', { ascending: true }),
		supabase.from('profiles').select('gidouilles').eq('id', user.id).single()
	]);

	if (cardsResult.error) {
		console.error('[shop] Error fetching cards:', cardsResult.error);
		throw error(500, `Failed to fetch shop cards: ${cardsResult.error.message}`);
	}

	// Transform snake_case to camelCase for frontend consumption
	const cards: ShopCardResponse[] = (cardsResult.data as ShopCardDb[]).map((card) => ({
		id: card.id,
		name: card.name,
		description: card.description,
		rarity: card.rarity,
		basePrice: card.base_price,
		imagePath: card.image_path,
		maxOwnedPerStudent: card.max_owned_per_student,
		usesTotal: card.uses_total,
		category: card.category
	}));

	return json({
		success: true,
		cards,
		balance: profileResult.data?.gidouilles ?? 0
	});
};
