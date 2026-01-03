/**
 * Trade Cancel Endpoint
 * =====================
 * Cancels an ongoing trade.
 *
 * POST /api/marketplace/trades/[id]/cancel
 *
 * Authorization: User must be a participant (initiator or partner)
 * Constraint: Trade must be in 'negotiating' status
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// Validate trade ID
const tradeIdSchema = z.string().uuid('Invalid trade ID');

export const POST: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifie');
	}

	// Validate trade ID
	const tradeIdValidation = tradeIdSchema.safeParse(params.id);
	if (!tradeIdValidation.success) {
		throw error(400, tradeIdValidation.error.issues[0].message);
	}
	const tradeId = tradeIdValidation.data;

	// Fetch trade to verify participant
	const { data: trade, error: fetchError } = await supabase
		.from('marketplace_trades')
		.select('id, status, initiator_id, partner_id')
		.eq('id', tradeId)
		.single();

	if (fetchError || !trade) {
		throw error(404, 'Echange non trouve');
	}

	// Check user is a participant
	const isInitiator = trade.initiator_id === userId;
	const isPartner = trade.partner_id === userId;

	if (!isInitiator && !isPartner) {
		throw error(403, 'Vous ne participez pas a cet echange');
	}

	// Check trade is still negotiating
	if (trade.status !== 'negotiating') {
		throw error(400, 'Cet echange ne peut plus etre annule');
	}

	// Cancel the trade - set status and cancelled_at (required by valid_completion constraint)
	const { error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			status: 'cancelled',
			cancelled_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.eq('status', 'negotiating'); // Extra safety

	if (updateError) {
		console.error('Error cancelling trade:', updateError);
		throw error(500, "Erreur lors de l'annulation");
	}

	return json({
		success: true,
		message: 'Echange annule'
	});
};
