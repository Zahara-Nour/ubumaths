/**
 * API Endpoint: Update Eliminated Numbers in Guess Who Game
 * Path: PATCH /api/games/guess-who/[id]/eliminate
 *
 * Allows a player to update their list of eliminated numbers on the grid.
 * This is purely for client-side tracking and does not affect game logic.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { eliminateSchema } from '$lib/server/validation/guess-who';
import { sanitizePostgresError } from '$lib/server/utils/error-handler';

/**
 * PATCH /api/games/guess-who/[id]/eliminate
 *
 * Update the player's eliminated numbers list.
 *
 * **Security**:
 * - Requires authentication
 * - User must be a participant
 * - Eliminated numbers validated with Zod:
 *   - Must be integers 2-99
 *   - Max 24 numbers
 *   - No duplicates
 *
 * **Note**: This is for tracking purposes only.
 * The eliminated numbers do not affect game logic.
 *
 * **Request Body**:
 * ```json
 * { "eliminatedNumbers": [5, 12, 37, 89] }
 * ```
 *
 * **Response**:
 * ```json
 * { "success": true }
 * ```
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const gameId = validateUuidParam(params.id);

	// Require authentication
	const { user } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = eliminateSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { eliminatedNumbers } = validation.data;

	try {
		// Verify user is a participant in this game
		const { data: game, error: gameError } = await locals.supabase
			.from('guess_who_games')
			.select('player1_id, player2_id')
			.eq('id', gameId)
			.single();

		if (gameError || !game) {
			throw error(404, 'Partie introuvable');
		}

		if (game.player1_id !== user.id && game.player2_id !== user.id) {
			throw error(403, "Vous n'etes pas participant de cette partie");
		}

		// Upsert eliminated numbers
		const { error: upsertError } = await locals.supabase.from('guess_who_eliminated').upsert(
			{
				game_id: gameId,
				player_id: user.id,
				eliminated_numbers: eliminatedNumbers
			},
			{
				onConflict: 'game_id,player_id'
			}
		);

		if (upsertError) {
			sanitizePostgresError(upsertError, 'GUESS_WHO_ELIMINATE_UPSERT');
		}

		return json({ success: true });
	} catch (err) {
		sanitizePostgresError(err, 'GUESS_WHO_ELIMINATE');
	}
};
