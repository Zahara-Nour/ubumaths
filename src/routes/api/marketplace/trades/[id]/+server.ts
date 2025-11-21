import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import {
	unlockCardsForEntity,
	createMarketplaceNotification
} from '$lib/server/marketplace/helpers';
import { unlockItems } from '$lib/server/marketplace/item-helpers';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid("ID d'échange invalide");

/**
 * GET /api/marketplace/trades/[id]
 * Get trade details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate trade ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const tradeId = idValidation.data;

	// Get trade with all related data
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select(
			`
      *,
      initiator:profiles!marketplace_trades_initiator_id_fkey(
        id,
        username,
        avatar_url
      ),
      partner:profiles!marketplace_trades_partner_id_fkey(
        id,
        username,
        avatar_url
      ),
      offers:marketplace_trade_offers(
        *,
        offer_by_profile:profiles!marketplace_trade_offers_offer_by_fkey(
          id,
          username,
          avatar_url
        )
      ),
      chat_messages:marketplace_chat_messages(
        *,
        sender:profiles!marketplace_chat_messages_sender_id_fkey(
          id,
          username,
          avatar_url
        )
      )
    `
		)
		.eq('id', tradeId)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	// Verify user is a participant
	if (trade.initiator_id !== userId && trade.partner_id !== userId) {
		throw error(403, "Vous n'êtes pas participant à cet échange");
	}

	// Sort offers and messages by created_at
	if (trade.offers) {
		trade.offers.sort(
			(a: { created_at: string }, b: { created_at: string }) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		);
	}

	if (trade.chat_messages) {
		trade.chat_messages.sort(
			(a: { created_at: string }, b: { created_at: string }) =>
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);
	}

	return json(trade);
};

/**
 * DELETE /api/marketplace/trades/[id]
 * Cancel a trade
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate trade ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const tradeId = idValidation.data;

	// Get trade
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('*')
		.eq('id', tradeId)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	// Verify user is a participant
	if (trade.initiator_id !== userId && trade.partner_id !== userId) {
		throw error(403, "Vous n'êtes pas participant à cet échange");
	}

	// Verify trade is still negotiating
	if (trade.status !== 'negotiating') {
		throw error(403, 'Cet échange ne peut plus être annulé');
	}

	// Update trade status to cancelled
	const { error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			status: 'cancelled',
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId);

	if (updateError) {
		console.error('Error cancelling trade:', updateError);
		throw error(500, "Erreur lors de l'annulation de l'échange");
	}

	// Unlock all cards associated with this trade
	await unlockCardsForEntity(supabase, tradeId);

	// Unlock all items associated with this trade
	await unlockItems(supabase, tradeId, 'trade');

	// Create notification for the other participant
	const otherParticipantId = trade.initiator_id === userId ? trade.partner_id : trade.initiator_id;

	await createMarketplaceNotification(supabase, otherParticipantId, 'trade_cancelled', {
		trade_id: tradeId,
		cancelled_by: userId
	});

	return json({ success: true });
};
