/**
 * Achievements API - List All Achievements
 * =========================================
 *
 * Endpoint: GET /api/achievements?context=minesweeper
 * Purpose: Get all active achievements, optionally filtered by context
 *
 * Query Parameters:
 * - context (optional): Achievement context to filter by (minesweeper, questions, etc.)
 *
 * Returns:
 * - Array of achievement definitions
 * - Status 200: Success
 * - Status 400: Invalid query parameters
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { achievementContextSchema } from '$lib/server/validation/achievements';
import {
	getAchievementsByContext,
	AchievementServiceError
} from '$lib/server/achievements/service';

export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;

	try {
		// Parse and validate query parameters
		const context = url.searchParams.get('context');
		const validation = achievementContextSchema.safeParse({
			context: context || undefined
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { context: validatedContext } = validation.data;

		// Fetch achievements from service layer
		const achievements = await getAchievementsByContext(supabase, validatedContext);

		return json({
			success: true,
			achievements,
			count: achievements.length
		});
	} catch (err) {
		console.error('[API] Error fetching achievements:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		throw error(500, 'An error occurred while fetching achievements');
	}
};
