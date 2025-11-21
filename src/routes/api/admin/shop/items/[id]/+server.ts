/**
 * Admin Single Shop Item API
 * ==========================
 *
 * Endpoints:
 * - GET: Get single shop item by ID
 * - PATCH: Update shop item
 * - DELETE: Soft delete (set is_active = false)
 *
 * Security: Admin only
 */

/* eslint-disable-next-line custom/require-zod-validation */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { updateShopItemSchema } from '$lib/validation/shop';
import type { ShopItemTemplate } from '$lib/types/shop';

// ID validation schema
const idSchema = z.string().uuid('ID invalide');

/**
 * GET /api/admin/shop/items/[id]
 *
 * Get single shop item details
 *
 * Response: ShopItemTemplate
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	// 3. Validate ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const supabase = locals.supabase;

	try {
		// 4. Fetch the item
		const { data: item, error: fetchError } = await supabase
			.from('shop_item_templates')
			.select('*')
			.eq('id', params.id)
			.single();

		if (fetchError || !item) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Article non trouvé');
			}
			console.error('Error fetching shop item:', fetchError);
			throw error(500, "Erreur lors de la récupération de l'article");
		}

		// 5. Return the item
		return json(item as ShopItemTemplate);
	} catch (err) {
		console.error('Error in GET /api/admin/shop/items/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};

/**
 * PATCH /api/admin/shop/items/[id]
 *
 * Update shop item properties
 *
 * Body: Partial CreateShopItemRequest (see shop.ts types)
 *
 * Response: Updated ShopItemTemplate
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	// 3. Validate ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const supabase = locals.supabase;

	try {
		// 4. Parse and validate request body
		const body = await request.json();

		// Add ID to body for validation
		const bodyWithId = { ...body, id: params.id };
		const validation = updateShopItemSchema.safeParse(bodyWithId);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { id: _id, ...updateData } = validation.data;

		// 5. Check if item exists
		const { data: existing, error: checkError } = await supabase
			.from('shop_item_templates')
			.select('id')
			.eq('id', params.id)
			.single();

		if (checkError || !existing) {
			throw error(404, 'Article non trouvé');
		}

		// 6. If internal_name is being changed, check for duplicates
		if (updateData.internal_name) {
			const { data: duplicate, error: dupError } = await supabase
				.from('shop_item_templates')
				.select('id')
				.eq('internal_name', updateData.internal_name)
				.neq('id', params.id)
				.single();

			if (duplicate && !dupError) {
				throw error(
					400,
					`Un article avec le nom interne "${updateData.internal_name}" existe déjà`
				);
			}
		}

		// 7. Build update object with only defined fields
		const updates: Record<string, unknown> = {};
		if (updateData.internal_name !== undefined) updates.internal_name = updateData.internal_name;
		if (updateData.display_name !== undefined) updates.display_name = updateData.display_name;
		if (updateData.description !== undefined) updates.description = updateData.description || null;
		if (updateData.category !== undefined) updates.category = updateData.category;
		if (updateData.item_type !== undefined) updates.item_type = updateData.item_type;
		if (updateData.rarity !== undefined) updates.rarity = updateData.rarity;
		if (updateData.base_price !== undefined) updates.base_price = updateData.base_price;
		if (updateData.discount_percentage !== undefined)
			updates.discount_percentage = updateData.discount_percentage;
		if (updateData.is_active !== undefined) updates.is_active = updateData.is_active;
		if (updateData.available_from !== undefined)
			updates.available_from = updateData.available_from || null;
		if (updateData.available_until !== undefined)
			updates.available_until = updateData.available_until || null;
		if (updateData.max_owned_per_student !== undefined)
			updates.max_owned_per_student = updateData.max_owned_per_student || null;
		if (updateData.daily_purchase_limit !== undefined)
			updates.daily_purchase_limit = updateData.daily_purchase_limit || null;
		if (updateData.weekly_purchase_limit !== undefined)
			updates.weekly_purchase_limit = updateData.weekly_purchase_limit || null;
		if (updateData.purchase_cooldown_hours !== undefined)
			updates.purchase_cooldown_hours = updateData.purchase_cooldown_hours || null;
		if (updateData.properties !== undefined) updates.properties = updateData.properties || null;
		if (updateData.is_tradeable !== undefined) updates.is_tradeable = updateData.is_tradeable;
		if (updateData.trade_cooldown_hours !== undefined)
			updates.trade_cooldown_hours = updateData.trade_cooldown_hours;
		if (updateData.icon_url !== undefined) updates.icon_url = updateData.icon_url || null;
		if (updateData.sort_order !== undefined) updates.sort_order = updateData.sort_order;

		// Add updated_at timestamp
		updates.updated_at = new Date().toISOString();

		// 8. Update the item
		const { data: updatedItem, error: updateError } = await supabase
			.from('shop_item_templates')
			.update(updates)
			.eq('id', params.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating shop item:', updateError);
			throw error(500, "Erreur lors de la mise à jour de l'article");
		}

		// 9. Return the updated item
		return json(updatedItem as ShopItemTemplate);
	} catch (err) {
		console.error('Error in PATCH /api/admin/shop/items/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};

/**
 * DELETE /api/admin/shop/items/[id]
 *
 * Soft delete a shop item (set is_active = false)
 *
 * Response: { success: true, message: string }
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	// 3. Validate ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const supabase = locals.supabase;

	try {
		// 4. Check if item exists and is active
		const { data: existing, error: checkError } = await supabase
			.from('shop_item_templates')
			.select('id, is_active, display_name')
			.eq('id', params.id)
			.single();

		if (checkError || !existing) {
			throw error(404, 'Article non trouvé');
		}

		if (!existing.is_active) {
			throw error(400, 'Cet article est déjà désactivé');
		}

		// 5. Soft delete (set is_active = false)
		const { error: updateError } = await supabase
			.from('shop_item_templates')
			.update({
				is_active: false,
				updated_at: new Date().toISOString()
			})
			.eq('id', params.id);

		if (updateError) {
			console.error('Error soft deleting shop item:', updateError);
			throw error(500, "Erreur lors de la désactivation de l'article");
		}

		// 6. Return success response
		return json({
			success: true,
			message: `L'article "${existing.display_name}" a été désactivé`
		});
	} catch (err) {
		console.error('Error in DELETE /api/admin/shop/items/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};
