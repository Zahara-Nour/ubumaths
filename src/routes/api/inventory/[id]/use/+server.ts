/**
 * Use Inventory Item API
 * ======================
 *
 * Endpoints:
 * - POST: Use a consumable item
 *
 * Security: Owner only (the student who owns the item)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { useItemRequestSchema } from '$lib/validation/shop';
import type { UseItemResponse, ItemEffectData } from '$lib/types/shop';

/**
 * Validate inventory item ID format
 */
const itemIdSchema = z.string().uuid("ID d'inventaire invalide");

/**
 * POST /api/inventory/[id]/use
 *
 * Use a consumable inventory item
 *
 * Path parameters:
 *   - id: UUID of the inventory item
 *
 * Request body:
 *   - context: string - Where the item is being used (e.g., 'minesweeper', 'questions')
 *   - usage_data?: object - Additional context for the item usage
 *
 * Response: UseItemResponse {
 *   success: boolean
 *   effect?: ItemEffectData
 *   remaining_uses?: number | null
 *   item_name?: string
 *   item_consumed?: boolean
 *   error?: string
 * }
 *
 * Notes:
 *   - Only consumable items can be used
 *   - Locked items cannot be used
 *   - Calls the use_item RPC function which handles:
 *     - Decrementing uses
 *     - Logging the usage
 *     - Applying effects
 *     - Removing item when uses reach 0
 *
 * Errors:
 *   - 400: Invalid request or item cannot be used
 *   - 401: Not authenticated
 *   - 403: Not the owner of this item
 *   - 404: Item not found
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
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
		const validation = useItemRequestSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { context, usage_data } = validation.data;

		// 5. First verify ownership by checking the item exists and belongs to user
		const { data: itemCheck, error: checkError } = await supabase
			.from('student_item_inventory')
			.select('id, student_id')
			.eq('id', itemId)
			.single();

		if (checkError) {
			if (checkError.code === 'PGRST116') {
				throw error(404, 'Article non trouve');
			}
			console.error('Error checking inventory item:', checkError);
			throw error(500, "Erreur lors de la verification de l'article");
		}

		// 6. Verify ownership before calling RPC
		if (itemCheck.student_id !== studentId) {
			throw error(403, "Vous n'etes pas proprietaire de cet article");
		}

		// 7. Call the use_item RPC function
		// This function handles all the logic:
		// - Verifies item is in user's inventory (using auth.uid())
		// - Checks item is not locked
		// - Checks item is consumable
		// - Decrements uses if applicable
		// - Logs the usage
		// - Returns effect data
		const { data: result, error: rpcError } = await supabase.rpc('use_item', {
			p_inventory_id: itemId,
			p_context: context,
			p_usage_data: usage_data || {}
		});

		if (rpcError) {
			console.error('Error using item:', rpcError);

			// Handle specific error messages from the RPC
			if (rpcError.message?.includes('not found')) {
				throw error(404, 'Article non trouve dans votre inventaire');
			}
			if (rpcError.message?.includes('locked')) {
				throw error(400, 'Cet article est verrouille pour une transaction');
			}
			if (rpcError.message?.includes('not consumable')) {
				throw error(400, "Cet article n'est pas consommable");
			}

			throw error(500, "Erreur lors de l'utilisation de l'article");
		}

		// 8. Parse RPC response
		// The use_item function returns a JSONB object
		const rpcResult = result as {
			success: boolean;
			error?: string;
			effect?: ItemEffectData;
			remaining_uses?: number | null;
			item_name?: string;
			item_consumed?: boolean;
		};

		if (!rpcResult.success) {
			// RPC returned an error response
			throw error(400, rpcResult.error || "Echec de l'utilisation de l'article");
		}

		// 9. Build success response
		const response: UseItemResponse = {
			success: true,
			effect: rpcResult.effect,
			remaining_uses: rpcResult.remaining_uses,
			item_name: rpcResult.item_name,
			item_consumed: rpcResult.item_consumed
		};

		return json(response);
	} catch (err) {
		console.error('Error in POST /api/inventory/[id]/use:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur serveur interne');
	}
};
