/**
 * SRS Cards API
 * ==============
 *
 * List and create SRS cards.
 *
 * Endpoints:
 * - GET  /api/srs/cards?deck_id=X - List cards in deck
 * - POST /api/srs/cards - Add card to deck
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateCardRequest } from '$lib/srs/types';

/**
 * GET /api/srs/cards?deck_id=X
 *
 * List all cards in a deck.
 *
 * Query params:
 * - deck_id (required): Deck ID
 *
 * @returns Array of cards
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

		// Get cards (RLS ensures user owns deck)
		const { data: cards, error: cardsError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckId)
			.order('created_at', { ascending: false });

		if (cardsError) {
			console.error('Error fetching cards:', cardsError);
			return json({ error: 'Failed to fetch cards' }, { status: 500 });
		}

		return json({ cards: cards || [] });
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/cards:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * POST /api/srs/cards
 *
 * Add card to deck.
 *
 * Body (template card):
 * {
 *   deckId: string,
 *   cardType: 'template',
 *   templateId: string
 * }
 *
 * Body (custom card):
 * {
 *   deckId: string,
 *   cardType: 'custom',
 *   frontContent: ContentField[],
 *   backContent: ContentField[]
 * }
 *
 * @returns Created card
 */
export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = (await request.json()) as CreateCardRequest;

		// Validate required fields
		if (!body.deckId) {
			return json({ error: 'deckId is required' }, { status: 400 });
		}

		if (!body.cardType || !['template', 'custom'].includes(body.cardType)) {
			return json({ error: 'Invalid cardType. Must be "template" or "custom"' }, { status: 400 });
		}

		// Verify user owns deck and deck is not assigned (editable)
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', body.deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		if (deck.is_assigned) {
			return json(
				{ error: 'Cannot add cards to assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		// Validate card type specific fields
		if (body.cardType === 'template') {
			if (!body.templateId) {
				return json({ error: 'templateId is required for template cards' }, { status: 400 });
			}

			// Verify template exists and is published
			const { data: template, error: templateError } = await supabase
				.from('question_templates')
				.select('id, status')
				.eq('id', body.templateId)
				.single();

			if (templateError || !template) {
				return json({ error: 'Question template not found' }, { status: 404 });
			}

			if (template.status !== 'published') {
				return json(
					{ error: 'Template must be published for SRS use' },
					{ status: 400 }
				);
			}

			// Create template card
			const { data: card, error: createError } = await supabase
				.from('srs_cards')
				.insert({
					deck_id: body.deckId,
					card_type: 'template',
					template_id: body.templateId,
					front_content: null,
					back_content: null
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating template card:', createError);
				return json({ error: 'Failed to create card' }, { status: 500 });
			}

			return json({ card }, { status: 201 });
		} else {
			// Custom card
			if (!body.frontContent || !Array.isArray(body.frontContent)) {
				return json({ error: 'frontContent is required for custom cards' }, { status: 400 });
			}

			if (!body.backContent || !Array.isArray(body.backContent)) {
				return json({ error: 'backContent is required for custom cards' }, { status: 400 });
			}

			// Validate content is not empty
			if (body.frontContent.length === 0) {
				return json({ error: 'frontContent cannot be empty' }, { status: 400 });
			}

			if (body.backContent.length === 0) {
				return json({ error: 'backContent cannot be empty' }, { status: 400 });
			}

			// Create custom card
			const { data: card, error: createError } = await supabase
				.from('srs_cards')
				.insert({
					deck_id: body.deckId,
					card_type: 'custom',
					template_id: null,
					front_content: body.frontContent,
					back_content: body.backContent
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating custom card:', createError);
				return json({ error: 'Failed to create card' }, { status: 500 });
			}

			return json({ card }, { status: 201 });
		}
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/cards:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
