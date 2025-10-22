/**
 * SRS Decks API
 * ==============
 *
 * List and create SRS decks.
 *
 * Endpoints:
 * - GET  /api/srs/decks - List user's decks (with stats)
 * - POST /api/srs/decks - Create new deck
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateDeckRequest } from '$lib/srs/types';
import { DEFAULT_DESIRED_RETENTION, DEFAULT_MAXIMUM_INTERVAL } from '$lib/srs/config';

/**
 * GET /api/srs/decks
 *
 * List all decks for the authenticated user.
 * Includes deck statistics (total cards, due count, etc.)
 *
 * @returns Array of decks with stats
 */
export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get user's decks
		const { data: decks, error: decksError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('owner_id', user.id)
			.order('created_at', { ascending: false });

		if (decksError) {
			console.error('Error fetching decks:', decksError);
			return json({ error: 'Failed to fetch decks' }, { status: 500 });
		}

		if (!decks) {
			return json({ decks: [] });
		}

		// Get stats for each deck using helper function
		const decksWithStats = await Promise.all(
			decks.map(async (deck) => {
				const { data: stats, error: statsError } = await supabase.rpc('get_deck_stats', {
					p_user_id: user.id,
					p_deck_id: deck.id
				});

				if (statsError) {
					console.error(`Error fetching stats for deck ${deck.id}:`, statsError);
					// Return deck without stats on error
					return {
						...deck,
						stats: {
							total_cards: 0,
							due_count: 0,
							new_count: 0,
							learning_count: 0,
							review_count: 0
						}
					};
				}

				// RPC returns array with single row
				const deckStats = stats?.[0] || {
					total_cards: 0,
					due_count: 0,
					new_count: 0,
					learning_count: 0,
					review_count: 0
				};

				return {
					...deck,
					stats: deckStats
				};
			})
		);

		return json({ decks: decksWithStats });
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/decks:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * POST /api/srs/decks
 *
 * Create a new deck.
 *
 * Body:
 * {
 *   name: string,
 *   description?: string,
 *   deckType: 'official' | 'personal',
 *   config?: { desiredRetention, parameters, maximumInterval }
 * }
 *
 * @returns Created deck
 */
export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = (await request.json()) as CreateDeckRequest;

		// Validate required fields
		if (!body.name || body.name.trim().length === 0) {
			return json({ error: 'Deck name is required' }, { status: 400 });
		}

		if (!body.deckType || !['official', 'personal'].includes(body.deckType)) {
			return json({ error: 'Invalid deck type. Must be "official" or "personal"' }, { status: 400 });
		}

		// Build config with defaults
		const config = {
			desiredRetention: body.config?.desiredRetention ?? DEFAULT_DESIRED_RETENTION,
			maximumInterval: body.config?.maximumInterval ?? DEFAULT_MAXIMUM_INTERVAL,
			...(body.config?.parameters && { parameters: body.config.parameters })
		};

		// Validate desiredRetention
		if (config.desiredRetention < 0.7 || config.desiredRetention > 0.97) {
			return json(
				{ error: 'Desired retention must be between 0.7 and 0.97' },
				{ status: 400 }
			);
		}

		// Create deck
		const { data: deck, error: createError } = await supabase
			.from('srs_decks')
			.insert({
				name: body.name.trim(),
				description: body.description?.trim() || null,
				owner_id: user.id,
				deck_type: body.deckType,
				is_assigned: false,
				config
			})
			.select()
			.single();

		if (createError) {
			console.error('Error creating deck:', createError);
			return json({ error: 'Failed to create deck' }, { status: 500 });
		}

		return json({ deck }, { status: 201 });
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/decks:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
