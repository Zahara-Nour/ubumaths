/**
 * SRS Deck API (Single Deck)
 * ===========================
 *
 * CRUD operations on a specific deck.
 *
 * Endpoints:
 * - GET    /api/srs/decks/[id] - Get deck details
 * - PUT    /api/srs/decks/[id] - Update deck (non-assigned only)
 * - DELETE /api/srs/decks/[id] - Delete deck (non-assigned only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateDeckSchema, uuidParamSchema } from '$lib/server/validation/srs';

/**
 * GET /api/srs/decks/[id]
 *
 * Get deck details with statistics.
 *
 * @returns Deck with stats
 */
export const GET: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid deck ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Get deck (RLS ensures user owns it)
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', id)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		// Get deck stats
		const { data: stats, error: _statsError } = await supabase.rpc('get_deck_stats', {
			p_user_id: user.id,
			p_deck_id: id
		});

		const deckStats = stats?.[0] || {
			total_cards: 0,
			due_count: 0,
			new_count: 0,
			learning_count: 0,
			review_count: 0
		};

		return json({
			deck: {
				...deck,
				stats: deckStats
			}
		});
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/decks/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * PUT /api/srs/decks/[id]
 *
 * Update deck.
 * Only non-assigned decks can be updated.
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   config?: { desiredRetention, parameters, maximumInterval }
 * }
 *
 * @returns Updated deck
 */
export const PUT: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid deck ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Check if deck exists and is owned by user
		const { data: existingDeck, error: fetchError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', id)
			.eq('owner_id', user.id)
			.single();

		if (fetchError || !existingDeck) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		// Check if deck is assigned (read-only)
		if (existingDeck.is_assigned) {
			return json(
				{ error: 'Cannot update assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = updateDeckSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

		// Build update object
		const updates: Record<string, unknown> = {};

		if (body.name !== undefined) {
			updates.name = body.name.trim();
		}

		if (body.description !== undefined) {
			updates.description = body.description?.trim() || null;
		}

		if (body.config !== undefined) {
			// Merge with existing config
			const newConfig = {
				...existingDeck.config,
				...body.config
			};

			updates.config = newConfig;
		}

		// Update deck
		const { data: deck, error: updateError } = await supabase
			.from('srs_decks')
			.update(updates)
			.eq('id', id)
			.eq('owner_id', user.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating deck:', updateError);
			return json({ error: 'Failed to update deck' }, { status: 500 });
		}

		return json({ deck });
	} catch (error) {
		console.error('Unexpected error in PUT /api/srs/decks/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE /api/srs/decks/[id]
 *
 * Delete deck.
 * Only non-assigned decks can be deleted.
 * Cascades to delete all cards and stats.
 *
 * @returns Success message
 */
export const DELETE: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid deck ID' }, { status: 400 });
	}

	const { id } = paramValidation.data;

	try {
		// Check if deck exists and is owned by user
		const { data: existingDeck, error: fetchError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', id)
			.eq('owner_id', user.id)
			.single();

		if (fetchError || !existingDeck) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		// Check if deck is assigned (cannot delete)
		if (existingDeck.is_assigned) {
			return json(
				{ error: 'Cannot delete assigned deck. Assigned decks are read-only.' },
				{ status: 403 }
			);
		}

		// Delete deck (cascade deletes cards)
		const { error: deleteError } = await supabase
			.from('srs_decks')
			.delete()
			.eq('id', id)
			.eq('owner_id', user.id);

		if (deleteError) {
			console.error('Error deleting deck:', deleteError);
			return json({ error: 'Failed to delete deck' }, { status: 500 });
		}

		return json({ success: true, message: 'Deck deleted successfully' });
	} catch (error) {
		console.error('Unexpected error in DELETE /api/srs/decks/[id]:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
