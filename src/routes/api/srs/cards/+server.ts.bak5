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
import {
	createCardSchema,
	listCardsQuerySchema,
	cardListResponseSchema,
	createCardResponseSchema
} from '$lib/server/validation/srs';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

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
	const { user } = await safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate query parameters with Zod
	const queryRaw = {
		deck_id: url.searchParams.get('deck_id')
	};
	const validation = listCardsQuerySchema.safeParse(queryRaw);

	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	const { deck_id: deckId } = validation.data;

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

		// Validate response
		const validated = validateJsonResponse(
			cardListResponseSchema,
			{ cards: cards || [] },
			'GET /api/srs/cards'
		);

		return json(validated);
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
	const { user } = await safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = createCardSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

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

		// Handle discriminated union - Zod has already validated the structure
		if (body.cardType === 'template') {
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
				return json({ error: 'Template must be published for SRS use' }, { status: 400 });
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

			// Validate response
			const validated = validateJsonResponse(
				createCardResponseSchema,
				{ card },
				'POST /api/srs/cards (template)'
			);

			return json(validated, { status: 201 });
		} else {
			// Custom card - Zod has already validated frontContent and backContent exist and are non-empty
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

			// Validate response
			const validated = validateJsonResponse(
				createCardResponseSchema,
				{ card },
				'POST /api/srs/cards (custom)'
			);

			return json(validated, { status: 201 });
		}
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/cards:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
