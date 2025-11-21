/**
 * Admin Shop Items API
 * ====================
 *
 * Endpoints:
 * - GET: List all shop items (including inactive) with filtering
 * - POST: Create new shop item template
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { shopItemsQuerySchema, createShopItemSchema } from '$lib/validation/shop';
import type { ShopItemTemplate } from '$lib/types/shop';

/**
 * GET /api/admin/shop/items
 *
 * Fetch all shop items for admin management
 *
 * Query parameters:
 *   - category?: 'consumable' | 'booster' | 'cosmetic' | 'utility'
 *   - rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 *   - is_active?: boolean (show only active/inactive items)
 *   - search?: string (searches in display_name, internal_name and description)
 *   - sort_by?: 'price' | 'name' | 'rarity' | 'sort_order' | 'created_at' (default: 'sort_order')
 *   - sort_order?: 'asc' | 'desc' (default: 'asc')
 *   - page?: number (default: 1)
 *   - limit?: number (default: 50, max: 100)
 *
 * Response: {
 *   items: ShopItemTemplate[]
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	const supabase = locals.supabase;

	try {
		// 3. Parse query parameters (reuse shop query schema with adjustments)
		const params = {
			category: url.searchParams.get('category'),
			rarity: url.searchParams.get('rarity'),
			search: url.searchParams.get('search'),
			page: url.searchParams.get('page'),
			limit: url.searchParams.get('limit'),
			active_only: url.searchParams.get('is_active'), // Map to active_only
			sort_by: url.searchParams.get('sort_by'),
			sort_order: url.searchParams.get('sort_order')
		};

		const queryValidation = shopItemsQuerySchema.safeParse(params);
		if (!queryValidation.success) {
			throw error(400, queryValidation.error.issues[0].message);
		}

		const { category, rarity, search, page, limit, active_only, sort_by, sort_order } =
			queryValidation.data;

		// 4. Build query
		let query = supabase.from('shop_item_templates').select('*', { count: 'exact' });

		// Apply filters
		if (category) {
			query = query.eq('category', category);
		}
		if (rarity) {
			query = query.eq('rarity', rarity);
		}
		if (active_only !== undefined) {
			query = query.eq('is_active', active_only);
		}
		if (search) {
			// Search in display_name, internal_name, and description
			query = query.or(
				`display_name.ilike.%${search}%,internal_name.ilike.%${search}%,description.ilike.%${search}%`
			);
		}

		// Sorting
		const sortColumn =
			sort_by === 'name'
				? 'display_name'
				: sort_by === 'price'
					? 'base_price'
					: sort_by || 'sort_order';
		query = query.order(sortColumn, { ascending: sort_order === 'asc' });

		// Add secondary sort for stability
		if (sortColumn !== 'created_at') {
			query = query.order('created_at', { ascending: false });
		}

		// Pagination
		const offset = (page - 1) * limit;
		query = query.range(offset, offset + limit - 1);

		// 5. Execute query
		const { data: items, count, error: queryError } = await query;

		if (queryError) {
			console.error('Error fetching shop items:', queryError);
			throw error(500, 'Erreur lors de la récupération des articles');
		}

		// 6. Return paginated response
		return json({
			items: items as ShopItemTemplate[],
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages: Math.ceil((count || 0) / limit)
			}
		});
	} catch (err) {
		console.error('Error in GET /api/admin/shop/items:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};

/**
 * POST /api/admin/shop/items
 *
 * Create a new shop item template
 *
 * Body: CreateShopItemRequest (see shop.ts types)
 *
 * Response: The created ShopItemTemplate
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	const supabase = locals.supabase;

	try {
		// 3. Parse and validate request body
		const body = await request.json();
		const validation = createShopItemSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Check if internal_name already exists
		const { data: existing, error: checkError } = await supabase
			.from('shop_item_templates')
			.select('id')
			.eq('internal_name', data.internal_name)
			.single();

		if (existing && !checkError) {
			throw error(400, `Un article avec le nom interne "${data.internal_name}" existe déjà`);
		}

		// 5. Create the shop item template
		const { data: newItem, error: insertError } = await supabase
			.from('shop_item_templates')
			.insert({
				internal_name: data.internal_name,
				display_name: data.display_name,
				description: data.description || null,
				category: data.category,
				item_type: data.item_type,
				rarity: data.rarity,
				base_price: data.base_price,
				discount_percentage: data.discount_percentage,
				is_active: data.is_active,
				available_from: data.available_from || null,
				available_until: data.available_until || null,
				max_owned_per_student: data.max_owned_per_student || null,
				daily_purchase_limit: data.daily_purchase_limit || null,
				weekly_purchase_limit: data.weekly_purchase_limit || null,
				purchase_cooldown_hours: data.purchase_cooldown_hours || null,
				properties: data.properties || null,
				is_tradeable: data.is_tradeable,
				trade_cooldown_hours: data.trade_cooldown_hours,
				icon_url: data.icon_url || null,
				sort_order: data.sort_order
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating shop item:', insertError);
			throw error(500, "Erreur lors de la création de l'article");
		}

		// 6. Return the created item
		return json(newItem as ShopItemTemplate, { status: 201 });
	} catch (err) {
		console.error('Error in POST /api/admin/shop/items:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};
