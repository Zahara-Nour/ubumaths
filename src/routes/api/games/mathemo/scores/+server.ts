/**
 * GET /api/games/mathemo/scores
 * ==============================
 * Returns the current user's Mathemo game statistics.
 * AUTH: Student only (authenticated)
 *
 * ---
 *
 * POST /api/games/mathemo/scores
 * ===============================
 * Submits a Mathemo game result (win or loss).
 * Calculates rewards on win and checks milestones.
 * AUTH: Student only (authenticated)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	submitMathemoScoreSchema,
	getMathemoScoreResponseSchema,
	submitMathemoScoreWithRewardResponseSchema
} from '$lib/server/validation/games';
import { requireConsent } from '$lib/server/middleware/consent';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { calculateMathemoTheoreticalReward } from '$lib/server/games/reward-mathemo';

// ============================================================================
// GET - Fetch user's current stats
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	try {
		const { data: scoreData, error: fetchError } = await supabase
			.from('mathemo_scores')
			.select('games_played, games_won, best_word_length, first_try_count')
			.eq('user_id', user.id)
			.maybeSingle();

		if (fetchError) {
			console.error('[API] Error fetching mathemo score:', fetchError);
			throw error(500, 'Failed to fetch game score');
		}

		const response = scoreData || {
			games_played: 0,
			games_won: 0,
			best_word_length: 0,
			first_try_count: 0
		};

		const validated = validateJsonResponse(
			getMathemoScoreResponseSchema,
			response,
			'GET /api/games/mathemo/scores'
		);

		return json(validated);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in GET /api/games/mathemo/scores:', err);
		throw error(500, 'An unexpected error occurred');
	}
};

// ============================================================================
// POST - Submit game result
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile, supabase } = locals;

	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	requireConsent(profile, 'play_games');

	try {
		const body = await request.json();
		const validation = submitMathemoScoreSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { word_length, attempts_used, max_attempts, won, found_first_try, score_multiplier } =
			validation.data;

		// Calculate score for leaderboard (theoretical_reward × 100 × multiplier)
		const gameScore = won
			? Math.round(
					calculateMathemoTheoreticalReward(word_length, attempts_used, max_attempts) *
						100 *
						score_multiplier
				)
			: 0;

		// Upsert score stats
		const { data: upsertData, error: upsertError } = await supabase
			.rpc('upsert_mathemo_score', {
				p_user_id: user.id,
				p_word_length: word_length,
				p_won: won,
				p_found_first_try: found_first_try,
				p_score: gameScore
			})
			.maybeSingle();

		if (upsertError) {
			console.error('[API] Error upserting mathemo score:', upsertError);
			throw error(500, 'Failed to save game score');
		}

		if (!upsertData) {
			console.error('[API] Upsert returned no data');
			throw error(500, 'Failed to save game score');
		}

		const stats = upsertData as {
			games_played: number;
			games_won: number;
			best_word_length: number;
			first_try_count: number;
			is_new_best_length: boolean;
		};

		// Reward calculation (only on win)
		let reward: {
			theoretical_reward: number;
			actual_reward: number;
			is_first_win_of_day: boolean;
			week_best_reward: number;
		} | null = null;
		const milestones: { slug: string; name: string; gidouilles_reward: number }[] = [];

		if (won) {
			const theoreticalReward = calculateMathemoTheoreticalReward(
				word_length,
				attempts_used,
				max_attempts
			);

			if (theoreticalReward > 0) {
				// Get school_id
				const { data: membership } = await supabase
					.from('class_members')
					.select('classes!inner(school_id)')
					.eq('student_id', user.id)
					.eq('status', 'active')
					.limit(1)
					.maybeSingle();

				type MembershipWithClass = { classes: { school_id: string } };
				const schoolId = (membership as MembershipWithClass | null)?.classes?.school_id;

				if (schoolId) {
					const gameUuid = crypto.randomUUID();
					const { data: rewardData, error: rewardError } = await supabase
						.rpc('record_game_reward', {
							p_student_id: user.id,
							p_game_type: 'mathemo',
							p_game_id: gameUuid,
							p_theoretical_reward: theoreticalReward,
							p_school_id: schoolId
						})
						.maybeSingle();

					if (rewardError) {
						console.error('[API] Error recording mathemo reward:', rewardError);
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
			}
		}

		// Check milestones (independent of win/loss for games_played milestones)
		await checkAndAwardMathemoMilestones(supabase, user.id, stats, milestones);

		const response = {
			success: true as const,
			games_played: stats.games_played,
			games_won: stats.games_won,
			reward,
			milestones
		};

		const validated = validateJsonResponse(
			submitMathemoScoreWithRewardResponseSchema,
			response,
			'POST /api/games/mathemo/scores'
		);

		return json(validated);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in POST /api/games/mathemo/scores:', err);
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

async function checkAndAwardMathemoMilestones(
	supabase: SupabaseClient,
	userId: string,
	stats: {
		games_played: number;
		games_won: number;
		best_word_length: number;
		first_try_count: number;
	},
	milestones: { slug: string; name: string; gidouilles_reward: number }[]
): Promise<void> {
	const checks: MilestoneCheck[] = [
		{ slug: 'mathemo_first_win', condition: stats.games_won >= 1 },
		{ slug: 'mathemo_10_games', condition: stats.games_played >= 10 },
		{ slug: 'mathemo_50_games', condition: stats.games_played >= 50 },
		{ slug: 'mathemo_long_word', condition: stats.best_word_length >= 10 },
		{ slug: 'mathemo_first_try', condition: stats.first_try_count >= 1 }
	];

	const eligibleSlugs = checks.filter((c) => c.condition).map((c) => c.slug);
	if (eligibleSlugs.length === 0) return;

	const { data: achievements } = await supabase
		.from('achievements')
		.select('id, name, metadata')
		.in('id', eligibleSlugs);

	if (!achievements || achievements.length === 0) return;

	const achievementIds = achievements.map((a) => a.id);
	const { data: existing } = await supabase
		.from('student_achievements')
		.select('achievement_id')
		.eq('student_id', userId)
		.in('achievement_id', achievementIds);

	const existingIds = new Set((existing || []).map((e) => e.achievement_id));

	for (const achievement of achievements) {
		if (existingIds.has(achievement.id)) continue;

		const gidouillesReward =
			(achievement.metadata as { gidouilles_reward?: number })?.gidouilles_reward ?? 0;
		if (gidouillesReward <= 0) continue;

		const { data: insertResult, error: insertError } = await supabase
			.from('student_achievements')
			.insert({
				student_id: userId,
				achievement_id: achievement.id,
				gidouilles_awarded: gidouillesReward,
				points_awarded: 0,
				unlock_reason: 'Game milestone'
			})
			.select('id');

		if (insertError) {
			console.error('[API] Error awarding milestone:', achievement.id, insertError);
			continue;
		}

		if (!insertResult || insertResult.length === 0) continue;

		const { error: gidouillesError } = await supabase.rpc('update_student_gidouilles', {
			p_student_id: userId,
			p_delta: gidouillesReward
		});

		if (gidouillesError) {
			console.error('[API] Error crediting milestone gidouilles:', achievement.id, gidouillesError);
		}

		milestones.push({
			slug: achievement.id,
			name: achievement.name,
			gidouilles_reward: gidouillesReward
		});
	}
}
