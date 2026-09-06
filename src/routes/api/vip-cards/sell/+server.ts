/**
 * API Endpoint: Sell VIP Card
 * ============================
 *
 * Student endpoint to sell a VIP card back to the system for gidouilles.
 *
 * POST /api/vip-cards/sell
 *
 * @param cardInstanceId - UUID of the VIP card instance to sell
 *
 * SELL FLOW:
 * ----------
 * 1. Validates card exists, not used, no pending activation, not marketplace-locked
 * 2. Checks 5-minute cooldown since acquisition
 * 3. Calculates sell price (prorated for partial consumables, min 1g)
 * 4. Removes card and credits gidouilles atomically (via RPC)
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only students can sell (checked by RPC via auth.uid())
 * - studentId is taken from session.user.id (not from body)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { sellVipCardBodySchema } from '$lib/server/validation/vip-cards';
import { sellResultSchema } from '$lib/server/validation/vip-card-rpc';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
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

	const validation = sellVipCardBodySchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { cardInstanceId } = validation.data;

	// Call the sell RPC function
	const { data, error: rpcError } = await supabase.rpc('sell_vip_card', {
		p_student_id: user.id,
		p_card_instance_id: cardInstanceId
	});

	if (rpcError) {
		console.error('[sell] RPC error:', rpcError);
		throw error(500, `Failed to sell card: ${rpcError.message}`);
	}

	// `RETURNS jsonb` : forme validée, pas affirmée. Cette fonction crédite le
	// solde de gidouilles de l'élève.
	const result = sellResultSchema.parse(data);

	if (!result.success) {
		const errorMessage = result.error || 'Sale failed';

		if (errorMessage.includes('not found')) {
			throw error(404, errorMessage);
		}
		if (
			errorMessage.includes('Cooldown') ||
			errorMessage.includes('cooldown') ||
			errorMessage.includes('timestamp')
		) {
			return json(
				{ success: false, error: errorMessage, secondsRemaining: result.secondsRemaining },
				{ status: 400 }
			);
		}

		throw error(400, errorMessage);
	}

	return json({
		success: true,
		sellPrice: result.sellPrice,
		cardId: result.cardId,
		cardName: result.cardName,
		newBalance: result.newBalance
	});
};
