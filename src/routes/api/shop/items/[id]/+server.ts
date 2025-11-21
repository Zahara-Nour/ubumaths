/**
 * Shop Item Detail API
 * =====================
 *
 * Endpoints:
 * - GET: Get single shop item details with ownership status
 *
 * Security: Authenticated users only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { sanitizeRPCError } from '$lib/server/utils/error-handler';
import type { ShopItemWithStatus } from '$lib/types/shop';

/**
 * GET /api/shop/items/[id]
 *
 * Get single shop item details with ownership and purchase status
 *
 * Path parameters:
 *   - id: UUID of the shop item template
 *
 * Response: ShopItemWithStatus
 *
 * Errors:
 *   - 400: Invalid item ID
 *   - 401: Not authenticated
 *   - 404: Item not found
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	const supabase = locals.supabase;
	const userId = locals.user!.id;
	const isStudent = locals.profile.role === 'student';

	try {
		// 2. Validate item ID
		const idValidation = z.string().uuid("ID de l'article invalide").safeParse(params.id);

		if (!idValidation.success) {
			throw error(400, idValidation.error.issues[0].message);
		}

		const itemId = idValidation.data;

		// 3. For students, use the optimized RPC that replaces 6 sequential queries
		if (isStudent) {
			const { data: rpcResult, error: rpcError } = await supabase.rpc('get_shop_item_detail', {
				p_student_id: userId,
				p_template_id: itemId
			});

			if (rpcError) {
				sanitizeRPCError(rpcError, 'get_shop_item_detail');
			}

			// RPC returns JSONB with success flag and error message if not found
			if (!rpcResult?.success) {
				const errorMessage = rpcResult?.error ?? 'Article non trouvé';
				if (errorMessage.includes('non trouvé') || errorMessage.includes('not found')) {
					throw error(404, 'Article non trouvé');
				}
				throw error(400, errorMessage);
			}

			// Transform RPC response to ShopItemWithStatus format
			const response: ShopItemWithStatus = {
				id: rpcResult.id,
				internal_name: rpcResult.internal_name,
				display_name: rpcResult.display_name,
				description: rpcResult.description,
				category: rpcResult.category,
				item_type: rpcResult.item_type,
				rarity: rpcResult.rarity,
				base_price: rpcResult.base_price,
				discount_percentage: rpcResult.discount_percentage,
				icon_url: rpcResult.icon_url,
				properties: rpcResult.properties,
				is_active: rpcResult.is_active,
				available_from: rpcResult.available_from,
				available_until: rpcResult.available_until,
				max_owned_per_student: rpcResult.max_owned_per_student,
				daily_purchase_limit: rpcResult.daily_purchase_limit,
				weekly_purchase_limit: rpcResult.weekly_purchase_limit,
				purchase_cooldown_hours: rpcResult.purchase_cooldown_hours,
				is_tradeable: rpcResult.is_tradeable,
				trade_cooldown_hours: rpcResult.trade_cooldown_hours,
				sort_order: rpcResult.sort_order,
				created_at: rpcResult.created_at,
				updated_at: rpcResult.updated_at,
				created_by: rpcResult.created_by,
				// Computed fields from RPC
				final_price: rpcResult.final_price,
				owned_quantity: rpcResult.owned_quantity,
				can_purchase: rpcResult.can_purchase,
				purchase_limit_reason: rpcResult.cannot_purchase_reason
			};

			return json(response);
		}

		// 4. For non-students, fetch basic template data (they can't purchase anyway)
		const { data: template, error: templateError } = await supabase
			.from('shop_item_templates')
			.select('*')
			.eq('id', itemId)
			.single();

		if (templateError) {
			if (templateError.code === 'PGRST116') {
				throw error(404, 'Article non trouvé');
			}
			console.error('Error fetching shop item:', templateError);
			throw error(500, "Erreur lors de la récupération de l'article");
		}

		// Return template with non-student defaults
		const response: ShopItemWithStatus = {
			...template,
			final_price: Math.floor(template.base_price * (1 - template.discount_percentage / 100)),
			owned_quantity: 0,
			can_purchase: false,
			purchase_limit_reason: 'Réservé aux élèves'
		};

		return json(response);
	} catch (err) {
		console.error('Error in GET /api/shop/items/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Erreur serveur interne');
	}
};
