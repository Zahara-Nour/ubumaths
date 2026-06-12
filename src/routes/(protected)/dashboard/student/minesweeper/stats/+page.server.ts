/**
 * Student Minesweeper Stats Page - Server Load
 * ============================================
 *
 * Groups games by effective reward period, bounded by the actual
 * cron trigger time for the school (cron at 00:00/12:00 UTC,
 * condition: local hour >= 12 on rewards_day).
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

type GameStats = {
	difficulty: 'beginner' | 'intermediate' | 'expert';
	gamesPlayed: number;
	gamesWon: number;
	bestTime: number | null;
	totalGidouilles: number;
	totalPoints: number;
	winRate: number;
};

type RecentGame = {
	id: string;
	difficulty: string;
	time_seconds: number;
	status: string;
	created_at: string;
	gidouilles_awarded: number;
	points_earned: number;
	theoretical_reward: number | null;
	effective_period_start: string;
};

export type WeeklyBest = {
	week_start: string;
	week_end: string;
	best_theoretical_reward: number;
	bonus_awarded: number | null;
	bonus_awarded_at: string | null;
};

/**
 * Get hour in a given timezone for a UTC date.
 */
function getHourInTimezone(date: Date, timezone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		hour: 'numeric',
		hour12: false
	}).formatToParts(date);
	return parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
}

/**
 * Determine the local hour at which the cron actually triggers for a school.
 *
 * The cron runs at 00:00 UTC and 12:00 UTC. The RPC checks:
 *   v_current_hour >= 12 (in school's local time)
 *
 * So the trigger fires at the first cron slot where local hour >= 12.
 */
function getCronTriggerLocalHour(timezone: string): number {
	// Check 12:00 UTC first (most common trigger for UTC+ timezones)
	const hour12 = getHourInTimezone(new Date('2026-01-15T12:00:00Z'), timezone);
	if (hour12 >= 12) return hour12;

	// Otherwise 00:00 UTC triggers (common for UTC- timezones)
	const hour0 = getHourInTimezone(new Date('2026-01-15T00:00:00Z'), timezone);
	return hour0;
}

/**
 * Get local date/time components in the school's timezone.
 */
function getSchoolLocalParts(utcTimestamp: string, timezone: string) {
	const date = new Date(utcTimestamp);
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
	const parts = formatter.formatToParts(date);
	const get = (type: string) => parts.find((p) => p.type === type)?.value || '0';
	return {
		year: parseInt(get('year')),
		month: parseInt(get('month')),
		day: parseInt(get('day')),
		hour: parseInt(get('hour')),
		dow: new Date(parseInt(get('year')), parseInt(get('month')) - 1, parseInt(get('day'))).getDay()
	};
}

/**
 * Compute the most recent distribution datetime for a game.
 *
 * The distribution triggers on rewards_day when local hour >= triggerHour.
 * Returns "YYYY-MM-DDTHHh" identifying the effective period start.
 */
function computeEffectivePeriodStart(
	localParts: { year: number; month: number; day: number; hour: number; dow: number },
	rewardsDay: number,
	triggerHour: number
): string {
	const { year, month, day, hour, dow } = localParts;

	let daysSinceRewardsDay = (dow - rewardsDay + 7) % 7;

	// If today IS rewards_day but before the trigger hour,
	// the distribution hasn't fired yet — go back to previous one
	if (daysSinceRewardsDay === 0 && hour < triggerHour) {
		daysSinceRewardsDay = 7;
	}

	const distDate = new Date(year, month - 1, day - daysSinceRewardsDay);
	const y = distDate.getFullYear();
	const m = String(distDate.getMonth() + 1).padStart(2, '0');
	const d = String(distDate.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}T${triggerHour}h`;
}

/**
 * Compute the DB week_start for a game date, matching the SQL
 * calculate_week_boundaries(game_date, first_day) function.
 */
function calculateDbWeekStart(
	localParts: { year: number; month: number; day: number; dow: number },
	firstDay: number
): string {
	const { year, month, day, dow } = localParts;
	const daysSinceWeekStart = (dow - firstDay + 7) % 7;
	const weekStart = new Date(year, month - 1, day - daysSinceWeekStart);
	const y = weekStart.getFullYear();
	const m = String(weekStart.getMonth() + 1).padStart(2, '0');
	const d = String(weekStart.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch school timezone and week config
		const { data: schoolData } = await supabase
			.from('class_members')
			.select('classes(schools(timezone, timetable))')
			.eq('student_id', user.id)
			.limit(1)
			.single();

		const school = (
			schoolData?.classes as unknown as {
				schools: {
					timezone: string;
					timetable: { week_config?: { first_day?: number } } | null;
				};
			}
		)?.schools;
		const schoolTimezone = school?.timezone || 'Europe/Paris';
		const firstDay = school?.timetable?.week_config?.first_day ?? 1;
		const rewardsDay = (firstDay + 5) % 7;
		const triggerHour = getCronTriggerLocalHour(schoolTimezone);

		// Fetch leaderboard data for this student
		const { data: rankData } = await supabase
			.from('minesweeper_leaderboard')
			.select('avg_top_10, top_games_count')
			.eq('student_id', user.id)
			.single();

		// Compute rank among classified students (>= 10 games, excluding teachers)
		let classifiedRank: number | null = null;
		if (rankData && (rankData.top_games_count ?? 0) >= 10) {
			const { count } = await supabase
				.from('minesweeper_leaderboard')
				.select('*', { count: 'exact', head: true })
				.gte('top_games_count', 10)
				.eq('role', 'student')
				.gt('avg_top_10', rankData.avg_top_10);
			classifiedRank = (count ?? 0) + 1;
		}

		// Fetch all minesweeper games for this student
		const { data: games, error: gamesError } = await supabase
			.from('minesweeper_games')
			.select('id, difficulty, time_seconds, status, created_at, gidouilles_awarded, points_earned')
			.eq('student_id', user.id)
			.order('created_at', { ascending: false });

		if (gamesError) {
			console.error('[Stats] Error fetching games:', gamesError);
			throw gamesError;
		}

		// Get IDs of the 20 most recent games to fetch their theoretical rewards
		const recentGameIds = (games || []).slice(0, 20).map((g) => g.id);

		// Fetch theoretical rewards, weekly bests, and leaderboard in parallel
		const [rewardsResult, weeklyBestsResult, leaderboardResult] = await Promise.all([
			recentGameIds.length > 0
				? supabase
						.from('daily_game_rewards')
						.select('game_id, theoretical_reward')
						.in('game_id', recentGameIds)
				: Promise.resolve({ data: [] }),
			supabase
				.from('weekly_best_rewards')
				.select(
					'week_start, week_end, best_theoretical_reward, bonus_awarded, bonus_awarded_at, best_reward_game_id, best_reward_game_type'
				)
				.eq('student_id', user.id)
				.order('week_start', { ascending: false })
				.limit(10),
			supabase
				.from('minesweeper_leaderboard')
				.select('student_id, firstname, lastname, role, avg_top_10, top_games_count')
				.order('rank', { ascending: true })
				.limit(100)
		]);

		const rewards = rewardsResult.data || [];
		const weeklyBests: WeeklyBest[] = (weeklyBestsResult.data || []).map((wb) => ({
			week_start: wb.week_start,
			week_end: wb.week_end,
			best_theoretical_reward: wb.best_theoretical_reward,
			bonus_awarded: wb.bonus_awarded,
			bonus_awarded_at: wb.bonus_awarded_at
		}));

		// Build lookups
		const theoreticalRewardMap = new Map<string, number>();
		for (const r of rewards) {
			theoreticalRewardMap.set(r.game_id, r.theoretical_reward);
		}

		const weeklyBestByDbWeekStart = new Map<string, WeeklyBest>();
		for (const wb of weeklyBests) {
			weeklyBestByDbWeekStart.set(wb.week_start, wb);
		}

		// Calculate statistics by difficulty
		const statsMap = new Map<string, GameStats>();
		for (const difficulty of ['beginner', 'intermediate', 'expert'] as const) {
			statsMap.set(difficulty, {
				difficulty,
				gamesPlayed: 0,
				gamesWon: 0,
				bestTime: null,
				totalGidouilles: 0,
				totalPoints: 0,
				winRate: 0
			});
		}

		// Process games
		const recentGames: RecentGame[] = [];

		for (const game of games || []) {
			const stats = statsMap.get(game.difficulty);
			if (stats) {
				stats.gamesPlayed++;
				if (game.status === 'won') {
					stats.gamesWon++;
					stats.totalGidouilles += game.gidouilles_awarded || 0;
					stats.totalPoints += game.points_earned || 0;
					if (
						stats.bestTime === null ||
						(game.time_seconds && game.time_seconds < stats.bestTime)
					) {
						stats.bestTime = game.time_seconds || null;
					}
				}
			}

			if (recentGames.length < 20) {
				const localParts = getSchoolLocalParts(game.created_at, schoolTimezone);
				recentGames.push({
					id: game.id,
					difficulty: game.difficulty,
					time_seconds: game.time_seconds || 0,
					status: game.status,
					created_at: game.created_at,
					gidouilles_awarded: game.gidouilles_awarded || 0,
					points_earned: game.points_earned || 0,
					theoretical_reward: theoreticalRewardMap.get(game.id) ?? null,
					effective_period_start: computeEffectivePeriodStart(localParts, rewardsDay, triggerHour)
				});
			}
		}

		// Calculate win rates
		for (const stats of statsMap.values()) {
			if (stats.gamesPlayed > 0) {
				stats.winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
			}
		}

		// Build effective periods with their associated weekly bests
		const periodMap = new Map<string, { dbWeekStarts: Set<string>; games: RecentGame[] }>();

		for (const game of recentGames) {
			const key = game.effective_period_start;
			if (!periodMap.has(key)) {
				periodMap.set(key, { dbWeekStarts: new Set(), games: [] });
			}
			const period = periodMap.get(key)!;
			period.games.push(game);
			const localParts = getSchoolLocalParts(game.created_at, schoolTimezone);
			const dbWeekStart = calculateDbWeekStart(localParts, firstDay);
			period.dbWeekStarts.add(dbWeekStart);
		}

		// Current local date/time in school timezone for isPast comparison
		const nowParts = getSchoolLocalParts(new Date().toISOString(), schoolTimezone);

		// For each effective period, find the relevant weekly_best_rewards
		const effectivePeriods: Array<{
			periodStart: string;
			periodEnd: string;
			isPast: boolean;
			weeklyBests: WeeklyBest[];
			games: RecentGame[];
		}> = [];

		for (const [periodStart, { dbWeekStarts, games }] of periodMap) {
			// Period end = period start + 7 days (same hour)
			const [dateStr, hourStr] = periodStart.split('T');
			const hour = parseInt(hourStr);
			const [y, m, d] = dateStr.split('-').map(Number);
			const endDate = new Date(y, m - 1, d + 7);
			const ey = endDate.getFullYear();
			const em = String(endDate.getMonth() + 1).padStart(2, '0');
			const ed = String(endDate.getDate()).padStart(2, '0');

			// Compare period end with current local time
			const endTimestamp = new Date(ey, parseInt(em) - 1, parseInt(ed), hour).getTime();
			const nowTimestamp = new Date(
				nowParts.year,
				nowParts.month - 1,
				nowParts.day,
				nowParts.hour
			).getTime();
			const isPast = endTimestamp <= nowTimestamp;

			const relevantBests: WeeklyBest[] = [];
			for (const dbWs of dbWeekStarts) {
				const wb = weeklyBestByDbWeekStart.get(dbWs);
				if (wb) relevantBests.push(wb);
			}

			effectivePeriods.push({
				periodStart,
				periodEnd: `${ey}-${em}-${ed}T${hour}h`,
				isPast,
				weeklyBests: relevantBests,
				games
			});
		}

		// Sort by periodStart descending
		effectivePeriods.sort((a, b) => b.periodStart.localeCompare(a.periodStart));

		// Add weekly best bonuses to totalGidouilles per difficulty
		// For each period, find the best game and add its theoretical_reward
		for (const period of effectivePeriods) {
			let bestReward = 0;
			let bestDifficulty: string | null = null;
			for (const game of period.games) {
				if (game.theoretical_reward != null && game.theoretical_reward > bestReward) {
					bestReward = game.theoretical_reward;
					bestDifficulty = game.difficulty;
				}
			}
			if (bestDifficulty && bestReward > 0) {
				const stats = statsMap.get(bestDifficulty);
				if (stats) {
					stats.totalGidouilles += bestReward;
				}
			}
		}

		return {
			statistics: Array.from(statsMap.values()),
			effectivePeriods,
			schoolTimezone,
			leaderboardRank: classifiedRank,
			leaderboardScore: classifiedRank ? rankData!.avg_top_10 : null,
			leaderboard: leaderboardResult.data || [],
			currentUserId: user.id
		};
	} catch (err) {
		console.error('[Stats] Error loading stats:', err);
		throw error(500, 'Impossible de charger les statistiques');
	}
};
