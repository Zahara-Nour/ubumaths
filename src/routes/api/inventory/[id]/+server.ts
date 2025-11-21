/**
 * Single Inventory Item API
 * =========================
 *
 * Endpoints:
 * - GET: Get a single inventory item with template details
 * - PATCH: Equip/unequip an item
 *
 * Security: Owner only (the student who owns the item)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { equipItemRequestSchema } from '$lib/validation/shop';
import type {
	EquipItemResponse,
	ShopItemProperties,
	ItemAcquisitionData,
	ItemInstanceData
} from '$lib/types/shop';

/**
 * Validate inventory item ID format
 */
const itemIdSchema = z.string().uuid("ID d'inventaire invalide");

/**
 * GET /api/inventory/[id]
 *
 * Get a single inventory item with full template details
 *
 * Path parameters:
 *   - id: UUID of the inventory item
 *
 * Response: StudentItemWithTemplate
 *
 * Errors:
 *   - 400: Invalid item ID
 *   - 401: Not authenticated
 *   - 403: Not the owner of this item
 *   - 404: Item not found
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Authentication check
	if (!locals.profile || !locals.user) {
		throw error(401, 'Non authentifie');
	}

	// 2. Students only can access their inventory items
	if (locals.profile.role !== 'student') {
		throw error(403, 'Reserve aux eleves');
	}

	const supabase = locals.supabase;
	const studentId = locals.user.id;

	try {
		// 3. Validate item ID
		const idValidation = itemIdSchema.safeParse(params.id);
		if (!idValidation.success) {
			throw error(400, idValidation.error.issues[0].message);
		}

		const itemId = idValidation.data;

		// 4. Fetch inventory item with template
		const { data: item, error: queryError } = await supabase
			.from('student_item_inventory')
			.select(
				`
				*,
				template:shop_item_templates (*)
			`
			)
			.eq('id', itemId)
			.single();

		if (queryError) {
			if (queryError.code === 'PGRST116') {
				throw error(404, 'Article non trouve');
			}
			console.error('Error fetching inventory item:', queryError);
			throw error(500, "Erreur lors de la recuperation de l'article");
		}

		// 5. Verify ownership
		if (item.student_id !== studentId) {
			throw error(403, "Vous n'etes pas proprietaire de cet article");
		}

		// 6. Transform data
		// Type the template for proper type inference
		type TemplateRow = {
			id: string;
			internal_name: string;
			display_name: string;
			description: string | null;
			category: string;
			item_type: string;
			rarity: string;
			base_price: number;
			discount_percentage: number | null;
			is_active: boolean | null;
			available_from: string | null;
			available_until: string | null;
			max_owned_per_student: number | null;
			daily_purchase_limit: number | null;
			weekly_purchase_limit: number | null;
			purchase_cooldown_hours: number | null;
			properties: ShopItemProperties | null;
			is_tradeable: boolean | null;
			trade_cooldown_hours: number | null;
			icon_url: string | null;
			sort_order: number | null;
			created_at: string;
			updated_at: string;
			created_by: string | null;
		};

		const template = item.template as TemplateRow | null;

		if (!template) {
			throw error(500, 'Template non trouve pour cet article');
		}

		// Type the inventory response
		type InventoryWithTemplate = {
			id: string;
			student_id: string;
			template_id: string;
			quantity: number | null;
			uses_remaining: number | null;
			is_equipped: boolean | null;
			equipped_at: string | null;
			acquired_at: string;
			acquired_from: string;
			acquisition_data: ItemAcquisitionData | null;
			expires_at: string | null;
			last_used_at: string | null;
			total_uses_count: number | null;
			is_locked: boolean | null;
			locked_for_listing_id: string | null;
			locked_for_trade_id: string | null;
			locked_at: string | null;
			instance_data: ItemInstanceData | null;
			created_at: string;
			updated_at: string;
			template: TemplateRow;
		};

		const response: InventoryWithTemplate = {
			...item,
			template: {
				...template,
				properties: template.properties as ShopItemProperties | null
			}
		};

		// 7. Return item
		return json(response);
	} catch (err) {
		console.error('Error in GET /api/inventory/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur serveur interne');
	}
};

/**
 * PATCH /api/inventory/[id]
 *
 * Equip or unequip an inventory item
 *
 * Path parameters:
 *   - id: UUID of the inventory item
 *
 * Request body:
 *   - equip: boolean - true to equip, false to unequip
 *
 * Response: EquipItemResponse {
 *   success: boolean
 *   is_equipped: boolean
 *   item_name?: string
 *   error?: string
 * }
 *
 * Notes:
 *   - Only cosmetics and boosters can be equipped
 *   - Consumables and utilities cannot be equipped
 *
 * Errors:
 *   - 400: Invalid request or item cannot be equipped
 *   - 401: Not authenticated
 *   - 403: Not the owner of this item
 *   - 404: Item not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// 1. Authentication check
	if (!locals.profile || !locals.user) {
		throw error(401, 'Non authentifie');
	}

	// 2. Students only
	if (locals.profile.role !== 'student') {
		throw error(403, 'Reserve aux eleves');
	}

	const supabase = locals.supabase;
	const studentId = locals.user.id;

	try {
		// 3. Validate item ID
		const idValidation = itemIdSchema.safeParse(params.id);
		if (!idValidation.success) {
			throw error(400, idValidation.error.issues[0].message);
		}

		const itemId = idValidation.data;

		// 4. Validate request body
		const body = await request.json().catch(() => ({}));
		const validation = equipItemRequestSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { equip } = validation.data;

		// 5. Fetch item with template to check category and ownership
		const { data: item, error: queryError } = await supabase
			.from('student_item_inventory')
			.select(
				`
				id,
				student_id,
				is_equipped,
				is_locked,
				template:shop_item_templates (
					category,
					display_name
				)
			`
			)
			.eq('id', itemId)
			.single();

		if (queryError) {
			if (queryError.code === 'PGRST116') {
				throw error(404, 'Article non trouve');
			}
			console.error('Error fetching inventory item:', queryError);
			throw error(500, "Erreur lors de la recuperation de l'article");
		}

		// 6. Verify ownership
		if (item.student_id !== studentId) {
			throw error(403, "Vous n'etes pas proprietaire de cet article");
		}

		// 7. Check if item can be equipped
		// Handle both array and object responses from Supabase join
		const rawTemplate = item.template;
		const template = Array.isArray(rawTemplate)
			? (rawTemplate[0] as { category: string; display_name: string } | undefined)
			: (rawTemplate as { category: string; display_name: string } | null);

		if (!template) {
			throw error(500, 'Template non trouve pour cet article');
		}

		// Only cosmetics and boosters can be equipped
		const equippableCategories = ['cosmetic', 'booster'];
		if (!equippableCategories.includes(template.category)) {
			throw error(400, `Les articles de type "${template.category}" ne peuvent pas etre equipes`);
		}

		// 8. Check if item is locked
		if (item.is_locked) {
			throw error(400, 'Cet article est verrouille pour une transaction');
		}

		// 9. If already in desired state, return early
		if (item.is_equipped === equip) {
			const response: EquipItemResponse = {
				success: true,
				is_equipped: equip,
				item_name: template.display_name
			};
			return json(response);
		}

		// 10. Update equipped status
		const { error: updateError } = await supabase
			.from('student_item_inventory')
			.update({ is_equipped: equip })
			.eq('id', itemId)
			.eq('student_id', studentId); // Double-check ownership

		if (updateError) {
			console.error('Error updating equipped status:', updateError);
			throw error(500, "Erreur lors de la mise a jour de l'equipement");
		}

		// 11. Return success response
		const response: EquipItemResponse = {
			success: true,
			is_equipped: equip,
			item_name: template.display_name
		};

		return json(response);
	} catch (err) {
		console.error('Error in PATCH /api/inventory/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur serveur interne');
	}
};
