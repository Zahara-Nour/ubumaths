/**
 * Achievement Leaderboard API
 * ============================
 *
 * Endpoint: GET /api/achievements/leaderboard?context=minesweeper&limit=10
 * Purpose: Get top students ranked by achievement points
 *
 * Query Parameters:
 * - context (required): Achievement context to filter by (minesweeper, questions, etc.)
 * - limit (optional): Maximum number of entries to return (default: 10, max: 100)
 *
 * Returns:
 * - Array of leaderboard entries sorted by total points
 * - Each entry includes: studentId, username, avatarUrl, totalPoints, achievementCount
 * - Status 200: Success
 * - Status 400: Invalid query parameters
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leaderboardQuerySchema } from '$lib/server/validation/achievements';
import {
	getAchievementLeaderboard,
	AchievementServiceError
} from '$lib/server/achievements/service';

export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;

	try {
		// Parse and validate query parameters
		const context = url.searchParams.get('context');
		const limitParam = url.searchParams.get('limit');

		if (!context) {
			throw error(400, 'Context parameter is required');
		}

		// Parse limit parameter - reject decimals
		let parsedLimit = 10;
		if (limitParam) {
			// Check if the parameter contains a decimal point
			if (limitParam.includes('.')) {
				throw error(400, 'Limit must be an integer');
			}
			parsedLimit = parseInt(limitParam, 10);
			if (isNaN(parsedLimit)) {
				throw error(400, 'Limit must be a valid number');
			}
		}

		const validation = leaderboardQuerySchema.safeParse({
			context,
			limit: parsedLimit
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { context: validatedContext, limit } = validation.data;

		// Fetch leaderboard from service layer
		const leaderboard = await getAchievementLeaderboard(supabase, validatedContext, limit);

		return json({
			success: true,
			leaderboard,
			count: leaderboard.length
		});
	} catch (err) {
		console.error('[API] Error fetching leaderboard:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		// Re-throw SvelteKit errors (HttpError) to preserve status codes
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while fetching leaderboard');
	}
};
