/**
 * Teacher - Edit SRS Deck (Server)
 * =================================
 *
 * Load deck details and cards for editing.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { id: deckId } = params;

	// Check if user is teacher or admin
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
		throw error(403, 'Forbidden. Only teachers can access this page.');
	}

	try {
		// Fetch deck details
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			console.error('Error fetching deck:', deckError);
			throw error(404, 'Deck not found');
		}

		// Check if deck is assigned (cannot edit)
		if (deck.is_assigned) {
			throw error(403, 'Cannot edit assigned deck. Assigned decks are read-only.');
		}

		// Map deck to camelCase
		const mappedDeck = {
			id: deck.id,
			name: deck.name,
			description: deck.description,
			ownerId: deck.owner_id,
			deckType: deck.deck_type,
			isAssigned: deck.is_assigned,
			config: deck.config,
			createdAt: deck.created_at,
			updatedAt: deck.updated_at
		};

		// Fetch deck cards
		const { data: cards, error: cardsError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckId)
			.order('created_at', { ascending: false });

		if (cardsError) {
			console.error('Error fetching cards:', cardsError);
		}

		// Map cards to camelCase
		const mappedCards = (cards || []).map((card) => ({
			id: card.id,
			deckId: card.deck_id,
			cardType: card.card_type,
			templateId: card.template_id,
			frontContent: card.front_content,
			backContent: card.back_content,
			createdAt: card.created_at,
			updatedAt: card.updated_at
		}));

		return {
			deck: mappedDeck,
			cards: mappedCards
		};
	} catch (err) {
		console.error('Error in edit deck page load:', err);
		throw error(500, 'Internal server error');
	}
};
