/**
 * SRS Card API (Single Card)
 * ===========================
 *
 * Operations on a specific card.
 *
 * Endpoints:
 * - GET    /api/srs/cards/[id] - Get card details
 * - PUT    /api/srs/cards/[id] - Update card (custom only, non-assigned deck)
 * - DELETE /api/srs/cards/[id] - Delete card (non-assigned deck only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateCardSchema, uuidParamSchema } from '$lib/server/validation/srs';

/**
 * GET /api/srs/cards/[id]
 *
 * Get card details.
 *
 * @returns Card
 */
export const GET: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid card ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Get card (RLS ensures user owns deck)
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('id', id)
			.single();

		if (cardError || !card) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		// Verify user owns the deck this card belongs to
		const { data: deck } = await supabase
			.from('srs_decks')
			.select('id')
			.eq('id', card.deck_id)
			.eq('owner_id', user.id)
			.single();

		if (!deck) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		return json({ card });
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/cards/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * PUT /api/srs/cards/[id]
 *
 * Update card.
 * Only custom cards in non-assigned decks can be updated.
 *
 * Body:
 * {
 *   frontContent?: ContentField[],
 *   backContent?: ContentField[]
 * }
 *
 * @returns Updated card
 */
export const PUT: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const { user } = await safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid card ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Get card
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('id', id)
			.single();

		if (cardError || !card) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		// Verify user owns deck
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', card.deck_id)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Check if deck is assigned (read-only)
		if (deck.is_assigned) {
			return json(
				{ error: 'Cannot update cards in assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		// Only custom cards can be updated
		if (card.card_type !== 'custom') {
			return json(
				{ error: 'Only custom cards can be updated. Template cards are read-only.' },
				{ status: 403 }
			);
		}

		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = updateCardSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

		// Build update object
		const updates: Record<string, unknown> = {};

		if (body.frontContent !== undefined) {
			updates.front_content = body.frontContent;
		}

		if (body.backContent !== undefined) {
			updates.back_content = body.backContent;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No updates provided' }, { status: 400 });
		}

		// Update card
		const { data: updatedCard, error: updateError } = await supabase
			.from('srs_cards')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating card:', updateError);
			return json({ error: 'Failed to update card' }, { status: 500 });
		}

		return json({ card: updatedCard });
	} catch (error) {
		console.error('Unexpected error in PUT /api/srs/cards/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE /api/srs/cards/[id]
 *
 * Delete card.
 * Only cards in non-assigned decks can be deleted.
 *
 * @returns Success message
 */
export const DELETE: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid card ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Get card
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('id', id)
			.single();

		if (cardError || !card) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		// Verify user owns deck
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', card.deck_id)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Check if deck is assigned (cannot delete)
		if (deck.is_assigned) {
			return json(
				{ error: 'Cannot delete cards from assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		// Delete card
		const { error: deleteError } = await supabase.from('srs_cards').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting card:', deleteError);
			return json({ error: 'Failed to delete card' }, { status: 500 });
		}

		return json({ success: true, message: 'Card deleted successfully' });
	} catch (error) {
		console.error('Unexpected error in DELETE /api/srs/cards/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
