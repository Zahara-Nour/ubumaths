import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createOfferSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	checkCardsUnused,
	lockCardsForEntity,
	getStudentGidouilles
} from '$lib/server/marketplace/helpers';
import { notifyNewTradeOffer } from '$lib/server/marketplace/notifications';

/**
 * POST /api/marketplace/trades/[id]/offers
 * Submit a counter-offer in a trade
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body
	const body = await request.json().catch(() => ({}));

	// Override trade_id from params to ensure consistency
	const offerData = { ...body, trade_id: params.id };
	const validation = createOfferSchema.safeParse(offerData);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Get trade details
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('*')
		.eq('id', data.trade_id)
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

	// Determine which cards to validate based on user's role
	const userCards = isInitiator ? data.initiator_cards : data.partner_cards;
	const userGidouilles = isInitiator ? data.initiator_gidouilles : data.partner_gidouilles;

	// Validate card ownership if offering cards
	if (userCards.length > 0) {
		const ownsCards = await validateCardOwnership(supabase, userId, userCards);
		if (!ownsCards) {
			throw error(403, 'Vous ne possédez pas toutes les cartes spécifiées');
		}

		const cardsUnused = await checkCardsUnused(supabase, userCards);
		if (!cardsUnused) {
			throw error(403, 'Certaines cartes ont déjà été utilisées');
		}
	}

	// Validate user has enough gidouilles if offering them
	if (userGidouilles > 0) {
		const availableGidouilles = await getStudentGidouilles(supabase, userId);
		if (availableGidouilles < userGidouilles) {
			throw error(403, "Vous n'avez pas assez de gidouilles");
		}
	}

	// Get current offer to compare and unlock old cards
	const currentOffer = trade.current_offer as
		| {
				initiator_cards?: string[];
				partner_cards?: string[];
		  }
		| null
		| undefined;
	const oldUserCards = isInitiator
		? currentOffer?.initiator_cards || []
		: currentOffer?.partner_cards || [];

	// Determine which cards are new (not in old offer)
	const newCards = userCards.filter((cardId: string) => !oldUserCards.includes(cardId));
	const removedCards = oldUserCards.filter((cardId: string) => !userCards.includes(cardId));

	// Create the offer record
	const { data: offer, error: offerError } = await supabase
		.from('marketplace_trade_offers')
		.insert({
			trade_id: data.trade_id,
			offer_by: userId,
			initiator_cards: data.initiator_cards,
			initiator_gidouilles: data.initiator_gidouilles,
			partner_cards: data.partner_cards,
			partner_gidouilles: data.partner_gidouilles,
			message: data.message || null
		})
		.select()
		.single();

	if (offerError) {
		console.error('Error creating offer:', offerError);
		throw error(500, "Erreur lors de la création de l'offre");
	}

	// Update current offer in trade
	const { error: updateError } = await supabase
		.from('marketplace_trades')
		.update({
			current_offer: {
				initiator_cards: data.initiator_cards,
				initiator_gidouilles: data.initiator_gidouilles,
				partner_cards: data.partner_cards,
				partner_gidouilles: data.partner_gidouilles
			},
			updated_at: new Date().toISOString()
		})
		.eq('id', data.trade_id);

	if (updateError) {
		console.error('Error updating trade offer:', updateError);
		// Rollback: delete the offer
		await supabase.from('marketplace_trade_offers').delete().eq('id', offer.id);
		throw error(500, "Erreur lors de la mise à jour de l'échange");
	}

	// Lock new cards
	if (newCards.length > 0) {
		const lockResult = await lockCardsForEntity(supabase, userId, newCards, data.trade_id, 'trade');

		if (!lockResult.success) {
			// Rollback: revert trade offer and delete offer record
			await supabase
				.from('marketplace_trades')
				.update({
					current_offer: currentOffer,
					updated_at: new Date().toISOString()
				})
				.eq('id', data.trade_id);

			await supabase.from('marketplace_trade_offers').delete().eq('id', offer.id);

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// Unlock removed cards (cards that were in old offer but not in new offer)
	if (removedCards.length > 0) {
		// TODO: Enhancement needed - Unlock specific cards from an offer
		// Current limitation: The unlockCardsForEntity function unlocks ALL cards for an entity,
		// but we need to unlock only specific cards that were removed from the offer.
		// This would require a new function like unlockSpecificCards(cardIds) or modifying
		// the existing unlock function to accept an optional cardIds parameter.
		// For now, removed cards remain locked as they're still part of the trade negotiation.
	}

	// Create notification for the other participant
	const otherParticipantId = isInitiator ? trade.partner_id : trade.initiator_id;

	await notifyNewTradeOffer(supabase, otherParticipantId, userId, data.trade_id);

	return json(offer, { status: 201 });
};
