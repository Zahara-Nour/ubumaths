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

		// 3. Fetch the item template
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

		// 4. Initialize response with base template data
		const response: ShopItemWithStatus = {
			...template,
			final_price: Math.floor(template.base_price * (1 - template.discount_percentage / 100)),
			owned_quantity: 0,
			can_purchase: !isStudent, // Non-students can't purchase
			purchase_limit_reason: !isStudent ? 'Réservé aux élèves' : null
		};

		// 5. For students, get ownership and purchase status
		if (isStudent) {
			// Get owned quantity
			const { data: inventory, error: inventoryError } = await supabase
				.from('student_item_inventory')
				.select('quantity')
				.eq('student_id', userId)
				.eq('template_id', itemId)
				.maybeSingle();

			if (inventoryError) {
				console.error('Error fetching inventory:', inventoryError);
			} else if (inventory) {
				response.owned_quantity = inventory.quantity;
			}

			// Check purchase limits
			response.can_purchase = template.is_active;

			if (!template.is_active) {
				response.purchase_limit_reason = "Article non disponible à l'achat";
			} else if (template.available_from && new Date(template.available_from) > new Date()) {
				response.purchase_limit_reason = 'Article pas encore disponible';
			} else if (template.available_until && new Date(template.available_until) < new Date()) {
				response.purchase_limit_reason = "Article n'est plus disponible";
			} else if (
				template.max_owned_per_student &&
				response.owned_quantity >= template.max_owned_per_student
			) {
				response.purchase_limit_reason = `Limite de possession atteinte (max: ${template.max_owned_per_student})`;
			} else {
				// Check daily/weekly purchase limits if they exist
				if (template.daily_purchase_limit || template.weekly_purchase_limit) {
					const now = new Date();
					const todayStart = new Date(now);
					todayStart.setHours(0, 0, 0, 0);
					const weekStart = new Date(now);
					weekStart.setDate(weekStart.getDate() - weekStart.getDay());
					weekStart.setHours(0, 0, 0, 0);

					// Check daily limit
					if (template.daily_purchase_limit) {
						const { count: todayCount } = await supabase
							.from('shop_purchase_history')
							.select('*', { count: 'exact', head: true })
							.eq('student_id', userId)
							.eq('template_id', itemId)
							.gte('purchased_at', todayStart.toISOString())
							.is('refunded_at', null);

						if (todayCount && todayCount >= template.daily_purchase_limit) {
							response.can_purchase = false;
							response.purchase_limit_reason = `Limite journalière atteinte (max: ${template.daily_purchase_limit})`;
						}
					}

					// Check weekly limit
					if (response.can_purchase && template.weekly_purchase_limit) {
						const { count: weekCount } = await supabase
							.from('shop_purchase_history')
							.select('*', { count: 'exact', head: true })
							.eq('student_id', userId)
							.eq('template_id', itemId)
							.gte('purchased_at', weekStart.toISOString())
							.is('refunded_at', null);

						if (weekCount && weekCount >= template.weekly_purchase_limit) {
							response.can_purchase = false;
							response.purchase_limit_reason = `Limite hebdomadaire atteinte (max: ${template.weekly_purchase_limit})`;
						}
					}
				}

				// Check cooldown if applicable
				if (response.can_purchase && template.purchase_cooldown_hours) {
					const { data: lastPurchase, error: lastPurchaseError } = await supabase
						.from('shop_purchase_history')
						.select('purchased_at')
						.eq('student_id', userId)
						.eq('template_id', itemId)
						.is('refunded_at', null)
						.order('purchased_at', { ascending: false })
						.limit(1)
						.maybeSingle();

					if (!lastPurchaseError && lastPurchase) {
						const cooldownEnd = new Date(lastPurchase.purchased_at);
						cooldownEnd.setHours(cooldownEnd.getHours() + template.purchase_cooldown_hours);

						if (cooldownEnd > new Date()) {
							response.can_purchase = false;
							const hoursRemaining = Math.ceil(
								(cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60)
							);
							response.purchase_limit_reason = `Temps d'attente: ${hoursRemaining}h restantes`;
						}
					}
				}

				// Check gidouilles balance
				if (response.can_purchase) {
					const { data: profile } = await supabase
						.from('profiles')
						.select('gidouilles')
						.eq('id', userId)
						.single();

					if (profile && profile.gidouilles < response.final_price) {
						response.can_purchase = false;
						response.purchase_limit_reason = 'Gidouilles insuffisantes';
					}
				}
			}
		}

		// 6. Return the item with status
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
