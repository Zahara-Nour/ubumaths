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
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/srs/cards/[id]
 *
 * Get card details.
 *
 * @returns Card
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

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
 * Update card. Trois usages possibles dans le même body :
 *   - frontContent / backContent : carte custom uniquement
 *   - section_id : assignation à une sous-section (cartes template + custom)
 *
 * Le deck doit être propriété de l'utilisateur, non assigné par un prof,
 * et — pour `section_id` — non auto-géré (le deck Programme refuse les sections).
 *
 * Body :
 * {
 *   frontContent?: string,
 *   backContent?: string,
 *   section_id?: string | null  // UUID d'une section du même deck, ou null pour "Non rangées"
 * }
 *
 * @returns Updated card
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid card ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('id', id)
			.single();

		if (cardError || !card) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', card.deck_id)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		if (deck.is_assigned) {
			return json(
				{ error: 'Cannot update cards in assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		const bodyRaw = await request.json();
		const validation = updateCardSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;
		const updates: Record<string, unknown> = {};

		// Front/back content : carte custom uniquement
		if (body.frontContent !== undefined || body.backContent !== undefined) {
			if (card.card_type !== 'custom') {
				return json(
					{ error: 'Only custom cards can have their content updated.' },
					{ status: 403 }
				);
			}
			if (body.frontContent !== undefined) updates.front_content = body.frontContent;
			if (body.backContent !== undefined) updates.back_content = body.backContent;
		}

		// section_id : interdit sur deck auto-géré (Programme)
		if (body.section_id !== undefined) {
			if (deck.is_auto_managed) {
				return json(
					{ error: 'Cannot move cards in auto-managed deck (Programme).' },
					{ status: 403 }
				);
			}
			// Si section_id non-null, vérifier qu'elle appartient bien à ce deck
			if (body.section_id !== null) {
				const { data: section } = await supabase
					.from('srs_deck_sections')
					.select('id')
					.eq('id', body.section_id)
					.eq('deck_id', card.deck_id)
					.maybeSingle();
				if (!section) {
					return json({ error: 'Section does not belong to this deck.' }, { status: 400 });
				}
			}
			updates.section_id = body.section_id;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No updates provided' }, { status: 400 });
		}

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
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

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
