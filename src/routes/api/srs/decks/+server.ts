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
import { DEFAULT_DESIRED_RETENTION, DEFAULT_MAXIMUM_INTERVAL } from '$lib/srs/config';
import {
	createDeckSchema,
	listDecksQuerySchema,
	deckListResponseSchema,
	createDeckResponseSchema
} from '$lib/server/validation/srs';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/srs/decks
 *
 * List all decks for the authenticated user.
 * Includes deck statistics (total cards, due count, etc.)
 *
 * Query params (optional):
 * - deckType: 'official' | 'personal'
 * - search: string (max 100 chars)
 *
 * @returns Array of decks with stats
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const queryRaw = {
			deckType: url.searchParams.get('deckType'),
			search: url.searchParams.get('search')
		};
		const validation = listDecksQuerySchema.safeParse(queryRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const query = validation.data;

		// ✅ OPTIMIZED: Use deck_stats_view to get decks with stats in single query (eliminates N+1)
		// Previous: 1 + N queries (1 for decks + N RPC calls for stats)
		// Now: 1 query (view pre-computes all stats)
		let dbQuery = locals.supabase
			.from('deck_stats_view')
			.select(
				'deck_id, owner_id, name, description, deck_type, is_assigned, config, created_at, updated_at, total_cards, new_count, learning_count, review_count, due_count'
			)
			.eq('owner_id', user.id);

		// Apply optional filters
		if (query.deckType) {
			dbQuery = dbQuery.eq('deck_type', query.deckType);
		}

		if (query.search) {
			dbQuery = dbQuery.ilike('name', `%${query.search}%`);
		}

		const { data: deckStats, error: decksError } = await dbQuery.order('created_at', {
			ascending: false
		});

		if (decksError) {
			console.error('Error fetching decks:', decksError);
			return json({ error: 'Failed to fetch decks' }, { status: 500 });
		}

		if (!deckStats) {
			return json({ decks: [] });
		}

		// Transform view data to match expected response format
		const decksWithStats = deckStats.map((row) => ({
			id: row.deck_id,
			owner_id: row.owner_id,
			name: row.name,
			description: row.description,
			deck_type: row.deck_type,
			is_assigned: row.is_assigned,
			config: row.config,
			created_at: row.created_at,
			updated_at: row.updated_at,
			stats: {
				total_cards: row.total_cards,
				due_count: row.due_count,
				new_count: row.new_count,
				learning_count: row.learning_count,
				review_count: row.review_count
			}
		}));

		// Validate response
		const validated = validateJsonResponse(
			deckListResponseSchema,
			{ decks: decksWithStats },
			'GET /api/srs/decks'
		);

		return json(validated);
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
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);

	try {
		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = createDeckSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

		// Build config with defaults
		const config = {
			desiredRetention: body.config?.desiredRetention ?? DEFAULT_DESIRED_RETENTION,
			maximumInterval: body.config?.maximumInterval ?? DEFAULT_MAXIMUM_INTERVAL,
			...(body.config?.parameters && { parameters: body.config.parameters })
		};

		// Create deck
		const { data: deck, error: createError } = await locals.supabase
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

		// Validate response
		const validated = validateJsonResponse(
			createDeckResponseSchema,
			{ deck },
			'POST /api/srs/decks'
		);

		return json(validated, { status: 201 });
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/decks:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
