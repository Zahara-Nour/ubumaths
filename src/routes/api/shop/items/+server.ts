/**
 * Shop Items API
 * ==============
 *
 * Endpoints:
 * - GET: List available shop items for a student with ownership and purchase status
 *
 * Security: Authenticated students only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { shopItemsQuerySchema } from '$lib/validation/shop';
import type { ShopItemWithStatus } from '$lib/types/shop';

/**
 * GET /api/shop/items
 *
 * Fetch available shop items with filtering, sorting and ownership status
 *
 * Query parameters:
 *   - category?: 'consumable' | 'booster' | 'cosmetic' | 'utility'
 *   - rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 *   - search?: string (searches in display_name and description)
 *   - page?: number (default: 1)
 *   - limit?: number (default: 20, max: 100)
 *   - active_only?: boolean (default: true)
 *   - sort_by?: 'price' | 'name' | 'rarity' | 'sort_order' (default: 'sort_order')
 *   - sort_order?: 'asc' | 'desc' (default: 'asc')
 *
 * Response: {
 *   items: ShopItemWithStatus[]
 *   pagination: { page, limit, total, totalPages }
 * }
 *
 * Errors:
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Not a student
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (students only)
	if (locals.profile.role !== 'student') {
		throw error(403, 'Réservé aux élèves');
	}

	const supabase = locals.supabase;
	const studentId = locals.user!.id;

	try {
		// 3. Validate query parameters
		const queryValidation = shopItemsQuerySchema.safeParse({
			category: url.searchParams.get('category'),
			rarity: url.searchParams.get('rarity'),
			search: url.searchParams.get('search'),
			page: url.searchParams.get('page'),
			limit: url.searchParams.get('limit'),
			active_only: url.searchParams.get('active_only'),
			sort_by: url.searchParams.get('sort_by'),
			sort_order: url.searchParams.get('sort_order')
		});

		if (!queryValidation.success) {
			throw error(400, queryValidation.error.issues[0].message);
		}

		const { category, rarity, search, page, limit, active_only, sort_by, sort_order } =
			queryValidation.data;

		// 4. Call the get_shop_items RPC function
		const { data: items, error: rpcError } = await supabase.rpc('get_shop_items', {
			p_student_id: studentId,
			p_category: category || null,
			p_rarity: rarity || null,
			p_search: search || null,
			p_active_only: active_only,
			p_sort_by: sort_by,
			p_sort_order: sort_order,
			p_limit: limit,
			p_offset: (page - 1) * limit
		});

		if (rpcError) {
			console.error('Error fetching shop items:', rpcError);
			throw error(500, 'Erreur lors de la récupération des articles');
		}

		// 5. Get total count for pagination
		const { count, error: countError } = await supabase
			.from('shop_item_templates')
			.select('*', { count: 'exact', head: true })
			.eq('is_active', active_only)
			.match({
				...(category && { category }),
				...(rarity && { rarity })
			});

		if (countError) {
			console.error('Error counting shop items:', countError);
		}

		// 6. Transform the response data
		const shopItems: ShopItemWithStatus[] = items || [];

		// 7. Return paginated response
		return json({
			items: shopItems,
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages: Math.ceil((count || 0) / limit)
			}
		});
	} catch (err) {
		console.error('Error in GET /api/shop/items:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Erreur serveur interne');
	}
};
