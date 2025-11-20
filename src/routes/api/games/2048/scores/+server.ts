/**
 * GET /api/games/2048/scores
 * ===========================
 *
 * Returns the current user's 2048 game score and statistics.
 *
 * AUTH: Student only (authenticated)
 *
 * RESPONSE:
 * {
 *   best_score: number,
 *   games_played: number,
 *   tiles_2048_reached: number,
 *   tiles_4096_reached: number
 * }
 *
 * If no record exists, returns default values (all zeros).
 *
 * ---
 *
 * POST /api/games/2048/scores
 * ============================
 *
 * Submits a new game score for the current user.
 *
 * AUTH: Student only (authenticated)
 *
 * REQUEST BODY:
 * {
 *   score: number,           // Final game score (0 - 100,000,000)
 *   reached_2048: boolean,   // Did the player reach the 2048 tile?
 *   reached_4096: boolean    // Did the player reach the 4096 tile?
 * }
 *
 * LOGIC:
 * - If no existing score: INSERT new row
 * - If existing score:
 *   - Update best_score to max(current, new)
 *   - Increment games_played by 1
 *   - Increment tiles_2048_reached if reached_2048 is true
 *   - Increment tiles_4096_reached if reached_4096 is true
 *
 * RESPONSE:
 * {
 *   success: true,
 *   best_score: number,      // Updated best score
 *   is_new_best: boolean,    // True if this score is the new personal best
 *   games_played: number     // Updated total games played
 * }
 *
 * ERRORS:
 * - 400: Invalid request body (Zod validation failure)
 * - 401: Not authenticated
 * - 403: Not a student
 * - 500: Database or server error
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	submit2048ScoreSchema,
	submit2048ScoreResponseSchema,
	get2048ScoreResponseSchema
} from '$lib/server/validation/games';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

// ============================================================================
// GET - Fetch user's current score
// ============================================================================

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile, supabase } = locals;

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	try {
		// Get mode from query parameter (default: classic)
		const mode = url.searchParams.get('mode') || 'classic';

		// Fetch user's 2048 score record for the specified mode
		const { data: scoreData, error: fetchError } = await supabase
			.from('game_2048_scores')
			.select('best_score, games_played, tiles_2048_reached, tiles_4096_reached, mode')
			.eq('user_id', user.id)
			.eq('mode', mode)
			.maybeSingle();

		if (fetchError) {
			console.error('[API] Error fetching 2048 score:', fetchError);
			throw error(500, 'Failed to fetch game score');
		}

		// If no record exists, return default values
		const response = scoreData || {
			best_score: 0,
			games_played: 0,
			tiles_2048_reached: 0,
			tiles_4096_reached: 0,
			mode: mode as 'classic' | 'multiplication' | 'equations' | 'fractions'
		};

		// Validate response before sending
		const validated = validateJsonResponse(
			get2048ScoreResponseSchema,
			response,
			'GET /api/games/2048/scores'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/games/2048/scores:', err);
		throw error(500, 'An unexpected error occurred');
	}
};

// ============================================================================
// POST - Submit new game score
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile, supabase } = locals;

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = submit2048ScoreSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { score, reached_2048, reached_4096, mode } = validation.data;

		// Fetch existing score record (if any) for this specific mode
		const { data: existingScore, error: fetchError } = await supabase
			.from('game_2048_scores')
			.select('best_score, games_played, tiles_2048_reached, tiles_4096_reached')
			.eq('user_id', user.id)
			.eq('mode', mode)
			.maybeSingle();

		if (fetchError) {
			console.error('[API] Error fetching existing score:', fetchError);
			throw error(500, 'Failed to fetch existing score');
		}

		let best_score: number;
		let games_played: number;
		let is_new_best: boolean;

		if (!existingScore) {
			// No existing record - INSERT new row
			const { data: insertedData, error: insertError } = await supabase
				.from('game_2048_scores')
				.insert({
					user_id: user.id,
					best_score: score,
					games_played: 1,
					tiles_2048_reached: reached_2048 ? 1 : 0,
					tiles_4096_reached: reached_4096 ? 1 : 0,
					mode
				})
				.select('best_score, games_played')
				.single();

			if (insertError) {
				console.error('[API] Error inserting new score:', insertError);
				throw error(500, 'Failed to save game score');
			}

			best_score = insertedData.best_score;
			games_played = insertedData.games_played;
			is_new_best = true;
		} else {
			// Existing record - UPDATE
			const newBestScore = Math.max(existingScore.best_score, score);
			is_new_best = score > existingScore.best_score;

			const { data: updatedData, error: updateError } = await supabase
				.from('game_2048_scores')
				.update({
					best_score: newBestScore,
					games_played: existingScore.games_played + 1,
					tiles_2048_reached: existingScore.tiles_2048_reached + (reached_2048 ? 1 : 0),
					tiles_4096_reached: existingScore.tiles_4096_reached + (reached_4096 ? 1 : 0)
				})
				.eq('user_id', user.id)
				.eq('mode', mode)
				.select('best_score, games_played')
				.single();

			if (updateError) {
				console.error('[API] Error updating score:', updateError);
				throw error(500, 'Failed to update game score');
			}

			best_score = updatedData.best_score;
			games_played = updatedData.games_played;
		}

		// Build and validate response
		const response = {
			success: true as const,
			best_score,
			is_new_best,
			games_played
		};

		const validated = validateJsonResponse(
			submit2048ScoreResponseSchema,
			response,
			'POST /api/games/2048/scores'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in POST /api/games/2048/scores:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
