/**
 * Teacher - Edit SRS Deck (Server)
 * =================================
 *
 * Load deck details and cards for editing.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/srs/decks/[id]/edit/+page.server');

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const { id: deckId } = params;

	// Check if user is teacher or admin
	const { data: profileData, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouvé');
	}

	if (profileData.role !== 'teacher' && profileData.role !== 'admin') {
		throw error(403, 'Page réservée aux professeurs');
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
			logger.error('Error fetching deck:', deckError);
			throw error(404, 'Deck introuvable');
		}

		// Check if deck is assigned (cannot edit)
		if (deck.is_assigned) {
			throw error(403, 'Un deck déjà affecté ne se modifie plus');
		}

		// Map deck to camelCase
		const mappedDeck = {
			id: deck.id,
			name: deck.name,
			description: deck.description,
			ownerId: deck.owner_id,
			deckType: deck.deck_type,
			isAssigned: deck.is_assigned,
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
			logger.error('Error fetching cards:', cardsError);
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
		logger.error('Error in edit deck page load:', err);
		throw error(500, 'Internal server error');
	}
};
