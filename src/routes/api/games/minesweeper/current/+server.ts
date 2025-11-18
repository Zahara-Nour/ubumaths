import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Load current in-progress Minesweeper game
 * GET /api/games/minesweeper/current
 *
 * Fetches the most recent in-progress game for the authenticated student.
 * Returns null if no in-progress game exists.
 *
 * **Security**:
 * - Requires authentication (students only)
 * - RLS policies ensure students only see their own games
 *
 * **Response**:
 * ```json
 * {
 *   "game": {
 *     "id": "uuid",
 *     "difficulty": "beginner",
 *     "status": "in_progress",
 *     "grid_state": { ... },
 *     "flags_used": 3,
 *     "cells_revealed": 15,
 *     "mines_count": 10,
 *     "created_at": "timestamp",
 *     "updated_at": "timestamp"
 *   }
 * }
 * ```
 *
 * Or `{ "game": null }` if no in-progress game exists.
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ✅ SECURITY: Require student authentication
	const { user } = await requireRole(locals, 'student');

	try {
		// ✅ SECURITY: RLS policies ensure student_id = auth.uid()
		// Fetch most recent in-progress game
		const { data: game, error: fetchError } = await locals.supabase
			.from('minesweeper_games')
			.select('*')
			.eq('student_id', user.id)
			.eq('status', 'in_progress')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (fetchError) {
			console.error('Error fetching current game:', fetchError);
			throw error(500, 'Erreur lors de la récupération de la partie');
		}

		// Return game or null if none found
		return json({ game: game || null });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in current game endpoint:', err);
		throw error(500, 'Erreur serveur lors de la récupération de la partie');
	}
};
