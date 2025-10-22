/**
 * SRS Review API - Due Cards
 * ===========================
 *
 * Get cards due for review in a deck.
 *
 * Endpoint:
 * - GET /api/srs/review/due?deck_id=X
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ReviewCard } from '$lib/srs/types';
import { generateSRSInstance } from '$lib/srs/generator';

/**
 * GET /api/srs/review/due?deck_id=X
 *
 * Get cards due for review in a specific deck.
 * For template cards, generates a new instance with random seed.
 * For custom cards, returns stored content.
 *
 * Query params:
 * - deck_id (required): Deck ID
 *
 * @returns Array of ReviewCard objects ready for study
 */
export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const deckId = url.searchParams.get('deck_id');

	if (!deckId) {
		return json({ error: 'deck_id query parameter is required' }, { status: 400 });
	}

	try {
		// Verify user owns deck
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('id')
			.eq('id', deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Get due cards using helper function
		console.log(`[SRS] Fetching due cards for user ${user.id}, deck ${deckId}`);
		const { data: dueCards, error: dueCardsError } = await supabase.rpc('get_due_cards_for_deck', {
			p_user_id: user.id,
			p_deck_id: deckId
		});

		if (dueCardsError) {
			console.error('Error fetching due cards:', dueCardsError);
			return json({ error: 'Failed to fetch due cards' }, { status: 500 });
		}

		console.log(`[SRS] RPC returned ${dueCards?.length || 0} due cards`);

		if (!dueCards || dueCards.length === 0) {
			console.log('[SRS] No due cards found - returning empty array');
			return json({ cards: [] });
		}

		// Process each card to prepare ReviewCard objects
		const reviewCards: ReviewCard[] = [];

		console.log('[SRS] Processing due cards...');
		for (const dueCard of dueCards) {
			try {
				console.log(`[SRS] Processing card ${dueCard.card_id}, type: ${dueCard.card_type}`);
				if (dueCard.card_type === 'template') {
					// Fetch template and generate instance
					console.log(`[SRS] Fetching template ${dueCard.template_id}`);
					const { data: template, error: templateError } = await supabase
						.from('question_templates')
						.select('*')
						.eq('id', dueCard.template_id)
						.single();

					if (templateError || !template) {
						console.error(`[SRS] Template ${dueCard.template_id} not found for card ${dueCard.card_id}:`, templateError);
						continue;
					}

					console.log(`[SRS] Generating instance for template ${dueCard.template_id}`);
					// Generate new instance with random seed
					const result = generateSRSInstance(template);

					if (!result.success || !result.instance) {
						console.error(
							`[SRS] Failed to generate instance for template ${dueCard.template_id}:`,
							result.errors
						);
						continue;
					}

					reviewCards.push({
						cardId: dueCard.card_id,
						cardType: 'template',
						templateId: dueCard.template_id,
						instance: result.instance,
						stats: {
							state: dueCard.state,
							difficulty: dueCard.difficulty,
							stability: dueCard.stability,
							totalReviews: dueCard.total_reviews,
							lastReview: dueCard.last_review,
							nextReview: dueCard.next_review
						}
					});
					console.log(`[SRS] ✓ Template card added to review session`);
				} else {
					// Custom card - fetch from srs_cards to get content
					const { data: customCard, error: customCardError } = await supabase
						.from('srs_cards')
						.select('front_content, back_content')
						.eq('id', dueCard.card_id)
						.single();

					if (customCardError || !customCard) {
						console.error(`Custom card ${dueCard.card_id} not found`);
						continue;
					}

					// Custom card - use stored content
					reviewCards.push({
						cardId: dueCard.card_id,
						cardType: 'custom',
						frontContent: customCard.front_content,
						backContent: customCard.back_content,
						stats: {
							state: dueCard.state,
							difficulty: dueCard.difficulty,
							stability: dueCard.stability,
							totalReviews: dueCard.total_reviews,
							lastReview: dueCard.last_review,
							nextReview: dueCard.next_review
						}
					});
				}
			} catch (error) {
				console.error(`Error processing card ${dueCard.card_id}:`, error);
				// Skip this card and continue with others
				continue;
			}
		}

		console.log(`[SRS] Returning ${reviewCards.length} review cards to client`);
		return json({ cards: reviewCards });
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/review/due:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
