import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import { notifyTradeCompleted } from '$lib/server/marketplace/notifications';

/**
 * Confirmation timeout in milliseconds (5 minutes)
 */
const CONFIRMATION_TIMEOUT = 5 * 60 * 1000;

/**
 * POST /api/marketplace/trades/[id]/confirm
 * Confirm the trade after both parties have validated
 *
 * This endpoint handles the final confirmation phase:
 * 1. Verifies both parties have validated the current offer
 * 2. Checks the confirmation hasn't expired (5 min window)
 * 3. Records the user's confirmation
 * 4. If BOTH have confirmed, executes the trade via RPC
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
		// Trade already completed or cancelled
		return json({
			success: true,
			confirmed: true,
			executed: trade.status === 'completed',
			message: trade.status === 'completed' ? 'Echange deja complete' : 'Echange annule'
		});
	}

	// Verify both have validated
	if (!trade.validated_by_initiator || !trade.validated_by_partner) {
		throw error(400, "Les deux participants doivent d'abord valider l'offre");
	}

	// Verify confirmation phase has started
	if (!trade.confirmation_started_at) {
		throw error(400, "La phase de confirmation n'a pas encore commence");
	}

	// Verify confirmation hasn't expired
	const confirmationStartedAt = new Date(trade.confirmation_started_at).getTime();
	const now = Date.now();
	if (now - confirmationStartedAt > CONFIRMATION_TIMEOUT) {
		// Reset validations and confirmations since confirmation expired
		await supabase
			.from('marketplace_trades')
			.update({
				validated_by_initiator: false,
				validated_by_partner: false,
				confirmed_by_initiator: false,
				confirmed_by_partner: false,
				confirmation_started_at: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', tradeId);

		throw error(410, 'La confirmation a expire. Veuillez revalider.');
	}

	// Record this user's confirmation
	const confirmField = isInitiator ? 'confirmed_by_initiator' : 'confirmed_by_partner';

	const { error: confirmError } = await supabase
		.from('marketplace_trades')
		.update({
			[confirmField]: true,
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.eq('status', 'negotiating');

	if (confirmError) {
		throw error(500, 'Erreur lors de la confirmation');
	}

	// Re-fetch trade to get LATEST state (handles race condition where both confirm simultaneously)
	const { data: updatedTradeState, error: refetchError } = await supabase
		.from('marketplace_trades')
		.select('confirmed_by_initiator, confirmed_by_partner, status')
		.eq('id', tradeId)
		.single();

	if (refetchError || !updatedTradeState) {
		throw error(500, 'Erreur lors de la verification');
	}

	// Trade may have been completed by the other user in a race condition
	if (updatedTradeState.status !== 'negotiating') {
		return json({
			success: true,
			confirmed: true,
			executed: updatedTradeState.status === 'completed',
			message: updatedTradeState.status === 'completed' ? 'Echange complete' : 'Echange annule'
		});
	}

	// Check if BOTH have now confirmed (using LATEST state)
	if (!updatedTradeState.confirmed_by_initiator || !updatedTradeState.confirmed_by_partner) {
		// Partner hasn't confirmed yet - wait for them
		return json({
			success: true,
			confirmed: true,
			executed: false,
			message: 'En attente de la confirmation du partenaire'
		});
	}

	// BOTH have confirmed - execute the trade!
	// Note: execute_trade RPC handles setting status to 'completed' and all transfers
	// It expects status to be 'negotiating' and returns JSONB with success field

	const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_trade', {
		p_trade_id: tradeId
	});

	// Check for RPC call error (HTTP/connection level)
	if (rpcError) {
		console.error('RPC call error:', rpcError);
		throw error(500, "Erreur lors de l'execution de l'echange");
	}

	// Check for business logic error (RPC returned {success: false, error: '...'})
	if (!rpcResult?.success) {
		const errorMsg = rpcResult?.error || 'Unknown error';
		console.error('Trade execution failed:', errorMsg);

		// If trade was already completed by another request, that's OK
		if (errorMsg.includes('not in negotiating status')) {
			return json({
				success: true,
				confirmed: true,
				executed: true,
				message: 'Echange deja complete'
			});
		}

		throw error(500, `Erreur: ${errorMsg}`);
	}

	// Notify both participants of completion
	const { data: initiatorProfile } = await supabase
		.from('profiles')
		.select('username, firstname, lastname')
		.eq('id', trade.initiator_id)
		.single();

	const { data: partnerProfile } = await supabase
		.from('profiles')
		.select('username, firstname, lastname')
		.eq('id', trade.partner_id)
		.single();

	const initiatorName = initiatorProfile
		? initiatorProfile.username ||
			`${initiatorProfile.firstname || ''} ${initiatorProfile.lastname || ''}`.trim() ||
			'Un eleve'
		: 'Un eleve';

	const partnerName = partnerProfile
		? partnerProfile.username ||
			`${partnerProfile.firstname || ''} ${partnerProfile.lastname || ''}`.trim() ||
			'Un eleve'
		: 'Un eleve';

	// Notify both participants
	await notifyTradeCompleted(supabase, trade.initiator_id, partnerName, tradeId);
	await notifyTradeCompleted(supabase, trade.partner_id, initiatorName, tradeId);

	// Get the updated trade to return
	const { data: completedTrade } = await supabase
		.from('marketplace_trades')
		.select('*')
		.eq('id', tradeId)
		.single();

	return json({
		success: true,
		confirmed: true,
		executed: true,
		trade: completedTrade
	});
};
