/**
 * Teacher - Edit SRS Deck (Server)
 * =================================
 *
 * Load deck details and cards for editing.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
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

		// Fetch deck cards
		const { data: cards, error: cardsError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckId)
			.order('created_at', { ascending: false });

		if (cardsError) {
			console.error('Error fetching cards:', cardsError);
		}

		return {
			deck,
			cards: cards || []
		};
	} catch (err) {
		console.error('Error in edit deck page load:', err);
		throw error(500, 'Internal server error');
	}
};
