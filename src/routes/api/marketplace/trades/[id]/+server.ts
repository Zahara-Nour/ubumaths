import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
// Supabase client is now accessed via locals.supabase
import {
	unlockCardsForEntity,
	createMarketplaceNotification,
	enrichWithUsernames
} from '#lib/server/marketplace/helpers.ts';
import { z } from 'zod';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/marketplace/trades/[id]/+server');

/**
 * Ce que GET lit de l'échange. Écrit à la main : la requête (trois niveaux de
 * jointures) est trop profonde pour que le typage tiré de la chaîne `select`
 * tienne selon l'ordre de vérification des fichiers (cliquet des types rouge
 * sans que ce fichier ait changé, #3188). Les autres colonnes passent telles
 * quelles dans la réponse.
 */
interface TradeDetails extends Record<string, unknown> {
	initiator_id: string;
	partner_id: string;
	offers: Array<{ created_at: string }> | null;
	chat_messages: Array<{ created_at: string }> | null;
}

// ID validation schema
const idSchema = z.string().uuid("ID d'échange invalide");

/**
 * GET /api/marketplace/trades/[id]
 * Get trade details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const { user } = await requireAuth(locals);
	const userId = user.id;

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
        firstname,
        lastname,
        avatar_url
      ),
      partner:profiles!marketplace_trades_partner_id_fkey(
        id,
        firstname,
        lastname,
        avatar_url
      ),
      offers:marketplace_trade_offers(
        *,
        offer_by_profile:profiles!marketplace_trade_offers_offer_by_fkey(
          id,
          firstname,
          lastname,
          avatar_url
        )
      ),
      chat_messages:marketplace_chat_messages(
        *,
        sender:profiles!marketplace_chat_messages_sender_id_fkey(
          id,
          firstname,
          lastname,
          avatar_url
        )
      )
    `
		)
		.eq('id', tradeId)
		.single()
		.overrideTypes<TradeDetails, { merge: false }>();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	// Verify user is a participant
	if (trade.initiator_id !== userId && trade.partner_id !== userId) {
		throw error(403, 'Accès réservé aux participants de cet échange');
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

	return Response.json(enrichWithUsernames(trade));
};

/**
 * DELETE /api/marketplace/trades/[id]
 * Cancel a trade
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const { user } = await requireAuth(locals);
	const userId = user.id;

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
		throw error(403, 'Accès réservé aux participants de cet échange');
	}

	// Verify trade is still negotiating
	if (trade.status !== 'negotiating') {
		throw error(403, 'Cet échange ne peut plus être annulé');
	}

	// Update trade status to cancelled (cancelled_at required by valid_completion constraint)
	const { error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			status: 'cancelled',
			cancelled_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId);

	if (updateError) {
		logger.error('Error cancelling trade:', updateError);
		throw error(500, "Erreur lors de l'annulation de l'échange");
	}

	// Unlock all cards associated with this trade
	await unlockCardsForEntity(tradeId);

	// Create notification for the other participant
	const otherParticipantId = trade.initiator_id === userId ? trade.partner_id : trade.initiator_id;

	await createMarketplaceNotification(otherParticipantId, 'trade_cancelled', {
		trade_id: tradeId,
		cancelled_by: userId
	});

	return Response.json({ success: true });
};
