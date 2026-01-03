import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * POST /api/marketplace/trades/[id]/validate
 * Toggle validation status for the current user
 *
 * This endpoint allows a trade participant to toggle their validation
 * of the current offer. Both parties must validate before the trade
 * can proceed to confirmation.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const tradeId = validateUuidParam(params.id);
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifie');
	}

	// Get trade details
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('*')
		.eq('id', tradeId)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Echange non trouve');
	}

	// Verify user is a participant
	const isInitiator = trade.initiator_id === userId;
	const isPartner = trade.partner_id === userId;

	if (!isInitiator && !isPartner) {
		throw error(403, "Vous n'etes pas participant a cet echange");
	}

	// Verify trade is still negotiating
	if (trade.status !== 'negotiating') {
		throw error(403, "Cet echange n'est plus en negociation");
	}

	// Prevent toggling validation after confirmation phase started
	if (trade.confirmation_started_at) {
		throw error(403, 'La phase de confirmation a deja commence');
	}

	// Determine which validation field to toggle
	const validationField = isInitiator ? 'validated_by_initiator' : 'validated_by_partner';
	const currentValidation = isInitiator ? trade.validated_by_initiator : trade.validated_by_partner;
	const newValidation = !currentValidation;

	// Update validation status
	const { data: updatedTrade, error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			[validationField]: newValidation,
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating trade validation:', updateError);
		throw error(500, 'Erreur lors de la mise a jour de la validation');
	}

	return json({
		success: true,
		validated: newValidation,
		trade: updatedTrade
	});
};
