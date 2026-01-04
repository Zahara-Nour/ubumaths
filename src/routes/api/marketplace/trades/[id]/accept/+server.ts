import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { acceptTradeSchema } from '$lib/server/marketplace/validation';
import { notifyTradeCompleted } from '$lib/server/marketplace/notifications';
import { validateUuidParam } from '$lib/server/validation/params';
// TODO: Implement cache invalidation
// import {
//   invalidateMarketplaceCaches,
//   invalidateTeacherCachesForStudents
// } from '$lib/server/marketplace/cache-manager';

/**
 * POST /api/marketplace/trades/[id]/accept
 * Accept the current offer in a trade
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const tradeId = validateUuidParam(params.id);
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body (body not used in this endpoint)
	await request.json().catch(() => ({}));

	// Override trade_id from params to ensure consistency
	const acceptData = { trade_id: tradeId };
	const validation = acceptTradeSchema.safeParse(acceptData);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { trade_id } = validation.data;

	// Get trade details
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('*')
		.eq('id', trade_id)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	// Verify user is a participant
	const isInitiator = trade.initiator_id === userId;
	const isPartner = trade.partner_id === userId;

	if (!isInitiator && !isPartner) {
		throw error(403, "Vous n'êtes pas participant à cet échange");
	}

	// Verify trade is still negotiating
	if (trade.status !== 'negotiating') {
		throw error(403, "Cet échange n'est plus en négociation");
	}

	// Verify there is a current offer
	if (!trade.current_offer) {
		throw error(400, 'Aucune offre en cours à accepter');
	}

	// Get the last offer to verify it wasn't made by the accepting user
	const { data: lastOffer, error: offerError } = await supabase
		.from('marketplace_trade_offers')
		.select('offer_by')
		.eq('trade_id', trade_id)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (offerError || !lastOffer) {
		throw error(500, "Erreur lors de la vérification de l'offre");
	}

	// User cannot accept their own offer
	if (lastOffer.offer_by === userId) {
		throw error(403, 'Vous ne pouvez pas accepter votre propre offre');
	}

	// Set final trade data and mark as completed
	const { error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			status: 'completed',
			final_trade: trade.current_offer,
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', trade_id);

	if (updateError) {
		console.error('Error completing trade:', updateError);
		throw error(500, "Erreur lors de la finalisation de l'échange");
	}

	// Execute the trade using RPC
	const { error: executeError } = await supabase.rpc('execute_trade', {
		p_trade_id: trade_id
	});

	if (executeError) {
		console.error('Error executing trade:', executeError);

		// Rollback: revert trade status
		await supabase
			.from('marketplace_trades')
			.update({
				status: 'negotiating',
				final_trade: null,
				completed_at: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', trade_id);

		throw error(500, "Erreur lors de l'exécution de l'échange");
	}

	// Notify both participants of completion
	// Get both participants' names
	const { data: initiatorProfile } = await supabase
		.from('profiles')
		.select('firstname, lastname')
		.eq('id', trade.initiator_id)
		.single();

	const { data: partnerProfile } = await supabase
		.from('profiles')
		.select('firstname, lastname')
		.eq('id', trade.partner_id)
		.single();

	const initiatorName = initiatorProfile
		? `${initiatorProfile.firstname || ''} ${initiatorProfile.lastname || ''}`.trim() || 'Un élève'
		: 'Un élève';

	const partnerName = partnerProfile
		? `${partnerProfile.firstname || ''} ${partnerProfile.lastname || ''}`.trim() || 'Un élève'
		: 'Un élève';

	// Notify both participants
	await notifyTradeCompleted(supabase, trade.initiator_id, partnerName, trade_id);
	await notifyTradeCompleted(supabase, trade.partner_id, initiatorName, trade_id);

	// Invalidate caches for both participants
	// TODO: Implement cache invalidation
	// await invalidateMarketplaceCaches(trade.initiator_id, trade.partner_id);
	// await invalidateTeacherCachesForStudents(supabase, [trade.initiator_id, trade.partner_id]);

	return json({
		success: true,
		trade: {
			...trade,
			status: 'completed',
			final_trade: trade.current_offer,
			completed_at: new Date().toISOString()
		}
	});
};
