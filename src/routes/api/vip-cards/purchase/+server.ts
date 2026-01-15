/**
 * API Endpoint: Purchase VIP Card
 * ================================
 *
 * Student endpoint to purchase a VIP card with gidouilles.
 *
 * POST /api/vip-cards/purchase
 *
 * @param cardId - ID of the VIP card template to purchase
 *
 * PURCHASE FLOW:
 * --------------
 * 1. Validates card exists and is_purchasable = true
 * 2. Checks student has sufficient gidouilles (>= base_price)
 * 3. Verifies max ownership limit not reached (via RPC)
 * 4. Deducts gidouilles and creates instance atomically (via RPC)
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only students can purchase (checked by RPC via role)
 * - studentId is taken from session.user.id (not from body)
 * - All validation happens in purchase_vip_card RPC for atomicity
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { purchaseVipCardBodySchema } from '$lib/server/validation/vip-cards';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PurchaseResult {
	success: boolean;
	instance?: {
		instanceId: string;
		cardId: string;
		purchasedAt: string;
		acquiredFrom: 'purchase';
	};
	newBalance?: number;
	error?: string;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (students only)
	const { user, profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'purchase_items');
	const supabase = locals.supabase;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = purchaseVipCardBodySchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { cardId } = validation.data;

	// Call the purchase RPC function
	// The RPC handles all validation and atomicity:
	// - Checks card exists and is_purchasable = true
	// - Verifies student balance >= base_price
	// - Checks max_owned_per_student limit
	// - Deducts gidouilles and creates instance atomically
	const { data, error: rpcError } = await supabase.rpc('purchase_vip_card', {
		p_student_id: user.id,
		p_card_id: cardId
	});

	if (rpcError) {
		console.error('[purchase] RPC error:', rpcError);
		throw error(500, `Failed to purchase card: ${rpcError.message}`);
	}

	// The RPC returns a JSON object with the result
	const result = data as PurchaseResult;

	if (!result.success) {
		// Return appropriate status based on error type
		const errorMessage = result.error || 'Purchase failed';

		// Determine appropriate status code from error message
		if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
			throw error(404, errorMessage);
		}
		if (
			errorMessage.includes('Insufficient') ||
			errorMessage.includes('limit') ||
			errorMessage.includes('not purchasable')
		) {
			throw error(400, errorMessage);
		}

		throw error(400, errorMessage);
	}

	// Return success response
	return json({
		success: true,
		instance: result.instance,
		newBalance: result.newBalance
	});
};
