/**
 * Shop Purchase API
 * =================
 *
 * Endpoints:
 * - POST: Purchase an item from the shop
 *
 * Security: Students only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purchaseRequestSchema } from '$lib/validation/shop';
import type { PurchaseResponse } from '$lib/types/shop';

/**
 * POST /api/shop/purchase
 *
 * Purchase an item from the shop
 *
 * Request body:
 *   - template_id: string (UUID)
 *   - quantity: number (1-100, default: 1)
 *
 * Response: PurchaseResponse {
 *   success: boolean
 *   inventory_id?: string
 *   purchase_id?: string
 *   gidouilles_spent?: number
 *   new_balance?: number
 *   item_name?: string
 *   quantity?: number
 *   error?: string
 * }
 *
 * Errors:
 *   - 400: Validation error or purchase failed
 *   - 401: Not authenticated
 *   - 403: Not a student
 *   - 404: Item not found
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
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
		// 3. Validate request body
		const body = await request.json().catch(() => ({}));
		const validation = purchaseRequestSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { template_id, quantity } = validation.data;

		// 4. Get purchase context (for audit trail)
		const userAgent = request.headers.get('user-agent');
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip') ||
			'unknown';

		const purchaseContext = {
			ip_address: ip,
			user_agent: userAgent ? userAgent.substring(0, 500) : null,
			requested_quantity: quantity
		};

		// 5. Call the purchase_shop_item RPC function
		// This function handles all validations, balance checks, and transaction logic
		const { data: result, error: purchaseError } = await supabase.rpc('purchase_shop_item', {
			p_student_id: studentId,
			p_template_id: template_id,
			p_quantity: quantity,
			p_purchase_context: purchaseContext
		});

		if (purchaseError) {
			console.error('Purchase error:', purchaseError);

			// Handle specific error cases
			if (purchaseError.message?.includes('Item not found')) {
				throw error(404, 'Article non trouvé');
			}
			if (purchaseError.message?.includes('Item not active')) {
				throw error(400, "Article non disponible à l'achat");
			}
			if (purchaseError.message?.includes('Insufficient gidouilles')) {
				throw error(400, 'Gidouilles insuffisantes');
			}
			if (purchaseError.message?.includes('Purchase limit reached')) {
				throw error(400, "Limite d'achat atteinte");
			}
			if (purchaseError.message?.includes('Ownership limit reached')) {
				throw error(400, 'Limite de possession atteinte');
			}
			if (purchaseError.message?.includes('Cooldown period active')) {
				throw error(400, "Période d'attente active");
			}

			// Generic error - don't expose raw database errors
			throw error(500, "Erreur lors de l'achat. Veuillez réessayer.");
		}

		// 6. Prepare success response
		if (!result || !result.success) {
			throw error(500, result?.error || "Échec de l'achat");
		}

		const response: PurchaseResponse = {
			success: true,
			inventory_id: result.inventory_id,
			purchase_id: result.purchase_id,
			gidouilles_spent: result.gidouilles_spent,
			new_balance: result.new_balance,
			item_name: result.item_name,
			quantity: result.quantity
		};

		// 7. Return success response
		return json(response, { status: 201 });
	} catch (err) {
		console.error('Error in POST /api/shop/purchase:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Erreur serveur interne');
	}
};
