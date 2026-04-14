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
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	submit2048ScoreSchema,
	get2048ScoreResponseSchema,
	submit2048ScoreWithRewardResponseSchema
} from '$lib/server/validation/games';
import { requireConsent } from '$lib/server/middleware/consent';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { calculate2048TheoreticalReward } from '$lib/server/games/reward-2048';

// ============================================================================
// GET - Fetch user's current score
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
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
		// Fetch user's 2048 score record
		const { data: scoreData, error: fetchError } = await supabase
			.from('game_2048_scores')
			.select('best_score, games_played, tiles_2048_reached, tiles_4096_reached')
			.eq('user_id', user.id)
			.eq('mode', 'classic')
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
			tiles_4096_reached: 0
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

	requireConsent(profile, 'play_games');

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = submit2048ScoreSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { score, reached_2048, reached_4096 } = validation.data;

		// Use atomic UPSERT function to eliminate race condition
		const { data: upsertData, error: upsertError } = await supabase
			.rpc('upsert_2048_score', {
				p_user_id: user.id,
				p_mode: 'classic',
				p_score: score,
				p_reached_2048: reached_2048,
				p_reached_4096: reached_4096
			})
			.maybeSingle();

		if (upsertError) {
			console.error('[API] Error upserting score:', upsertError);
			throw error(500, 'Failed to save game score');
		}

		if (!upsertData) {
			console.error('[API] Upsert returned no data');
			throw error(500, 'Failed to save game score');
		}

		const { best_score, games_played, is_new_best } = upsertData as {
			best_score: number;
			games_played: number;
			is_new_best: boolean;
		};

		// ================================================================
		// Gidouilles reward calculation
		// ================================================================
		let reward: {
			theoretical_reward: number;
			actual_reward: number;
			is_first_win_of_day: boolean;
			week_best_reward: number;
		} | null = null;
		const milestones: { slug: string; name: string; gidouilles_reward: number }[] = [];

		const theoreticalReward = calculate2048TheoreticalReward(score);

		if (theoreticalReward > 0) {
			// Get school_id from student's active class membership
			const { data: membership } = await supabase
				.from('class_members')
				.select('classes!inner(school_id)')
				.eq('student_id', user.id)
				.eq('status', 'active')
				.limit(1)
				.maybeSingle();

			const schoolId = (membership?.classes as unknown as { school_id: string })?.school_id;

			if (schoolId) {
				// Record reward via atomic RPC (handles daily cap per game type)
				const gameUuid = crypto.randomUUID();
				const { data: rewardData, error: rewardError } = await supabase
					.rpc('record_game_reward', {
						p_student_id: user.id,
						p_game_type: '2048',
						p_game_id: gameUuid,
						p_theoretical_reward: theoreticalReward,
						p_school_id: schoolId
					})
					.maybeSingle();

				if (rewardError) {
					console.error('[API] Error recording 2048 reward:', rewardError);
					// Non-blocking: score is already saved, reward is bonus
				} else if (rewardData) {
					const rd = rewardData as {
						actual_reward: number;
						is_first_win: boolean;
						week_best_reward: number;
					};
					reward = {
						theoretical_reward: theoreticalReward,
						actual_reward: rd.actual_reward,
						is_first_win_of_day: rd.is_first_win,
						week_best_reward: rd.week_best_reward
					};
				}
			}

			// ================================================================
			// Milestones (one-time achievements)
			// ================================================================
			await checkAndAward2048Milestones(
				supabase,
				user.id,
				{ reached_2048, reached_4096, games_played, best_score },
				milestones
			);
		}

		// Build and validate response
		const response = {
			success: true as const,
			best_score,
			is_new_best,
			games_played,
			reward,
			milestones
		};

		const validated = validateJsonResponse(
			submit2048ScoreWithRewardResponseSchema,
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

// ============================================================================
// Milestone checking helper
// ============================================================================

interface MilestoneCheck {
	slug: string;
	condition: boolean;
}

async function checkAndAward2048Milestones(
	supabase: SupabaseClient,
	userId: string,
	stats: {
		reached_2048: boolean;
		reached_4096: boolean;
		games_played: number;
		best_score: number;
	},
	milestones: { slug: string; name: string; gidouilles_reward: number }[]
): Promise<void> {
	// Define which milestones to check based on current game stats
	const checks: MilestoneCheck[] = [
		{ slug: '2048_first_2048', condition: stats.reached_2048 },
		{ slug: '2048_first_4096', condition: stats.reached_4096 },
		{ slug: '2048_10_games', condition: stats.games_played >= 10 },
		{ slug: '2048_50_games', condition: stats.games_played >= 50 },
		{ slug: '2048_score_50k', condition: stats.best_score >= 50000 }
	];

	// Filter to only conditions that are met
	const eligibleSlugs = checks.filter((c) => c.condition).map((c) => c.slug);
	if (eligibleSlugs.length === 0) return;

	// Fetch achievement definitions for eligible milestones
	const { data: achievements } = await supabase
		.from('game_achievements')
		.select('id, slug, name, gidouilles_reward')
		.in('slug', eligibleSlugs);

	if (!achievements || achievements.length === 0) return;

	// Check which ones the student already has
	const achievementIds = achievements.map((a) => a.id);
	const { data: existing } = await supabase
		.from('student_achievements')
		.select('achievement_id')
		.eq('student_id', userId)
		.in('achievement_id', achievementIds);

	const existingIds = new Set((existing || []).map((e) => e.achievement_id));

	// Award new milestones
	for (const achievement of achievements) {
		if (existingIds.has(achievement.id)) continue;

		// Insert into student_achievements
		const { error: insertError } = await supabase.from('student_achievements').insert({
			student_id: userId,
			achievement_id: achievement.id,
			gidouilles_awarded: achievement.gidouilles_reward,
			points_awarded: 0,
			unlock_reason: 'Game milestone'
		});

		if (insertError) {
			console.error('[API] Error awarding milestone:', achievement.slug, insertError);
			continue;
		}

		// Credit gidouilles to profile
		const { error: gidouillesError } = await supabase.rpc('update_student_gidouilles', {
			p_student_id: userId,
			p_delta: achievement.gidouilles_reward
		});

		if (gidouillesError) {
			console.error(
				'[API] Error crediting milestone gidouilles:',
				achievement.slug,
				gidouillesError
			);
		}

		milestones.push({
			slug: achievement.slug,
			name: achievement.name,
			gidouilles_reward: achievement.gidouilles_reward
		});
	}
}
