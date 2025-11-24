/**
 * Achievement Service Layer
 *
 * Provides server-side functions for achievement processing and querying.
 * All functions use Supabase RPC calls to SQL functions from Phase 1.
 *
 * Key Features:
 * - Type-safe responses using achievement types
 * - Comprehensive error handling
 * - JSDoc documentation for all functions
 * - Single source of truth for achievement logic
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import type {
	Achievement,
	StudentAchievement,
	AchievementProgress,
	AchievementContext,
	UnlockedAchievementResponse
} from '$lib/types/achievements';

// ============================================================================
// TYPES
// ============================================================================

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Result of processing an achievement event
 */
export interface ProcessEventResult {
	eventId: string;
	unlockedAchievements: UnlockedAchievementResponse[];
	count: number;
}

/**
 * Result of updating achievement progress
 */
export interface ProgressUpdateResult {
	currentValue: number;
	targetValue: number;
	progressPercentage: number;
	completed: boolean;
	newlyUnlocked: boolean;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
	studentId: string;
	username: string;
	avatarUrl: string | null;
	totalPoints: number;
	achievementCount: number;
}

/**
 * Service error with context
 */
export class AchievementServiceError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: unknown
	) {
		super(message);
		this.name = 'AchievementServiceError';
	}
}

// ============================================================================
// ACHIEVEMENT QUERIES
// ============================================================================

/**
 * Get all achievements for a specific context
 *
 * Returns active achievements filtered by context (e.g., 'minesweeper', 'questions').
 * If no context is provided, returns all active achievements.
 *
 * @param supabase - Authenticated Supabase client
 * @param context - Optional achievement context to filter by
 * @returns Array of achievement definitions
 * @throws AchievementServiceError on database errors
 *
 * @example
 * ```typescript
 * // Get all minesweeper achievements
 * const achievements = await getAchievementsByContext(supabase, 'minesweeper');
 *
 * // Get all achievements
 * const allAchievements = await getAchievementsByContext(supabase);
 * ```
 */
export async function getAchievementsByContext(
	supabase: TypedSupabaseClient,
	context?: AchievementContext
): Promise<Achievement[]> {
	try {
		let query = supabase
			.from('achievements')
			.select('*')
			.eq('is_active', true)
			.order('display_order', { ascending: true });

		if (context) {
			query = query.eq('context', context);
		}

		const { data, error } = await query;

		if (error) {
			throw new AchievementServiceError('Failed to fetch achievements', 'DATABASE_ERROR', error);
		}

		return (data || []) as Achievement[];
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError(
			'Unexpected error fetching achievements',
			'UNKNOWN_ERROR',
			err
		);
	}
}

/**
 * Get achievements unlocked by a specific student
 *
 * Returns all achievements unlocked by a student, optionally filtered by context.
 * Includes unlock timestamps, points awarded, and context data (difficulty, subject, etc.).
 *
 * @param supabase - Authenticated Supabase client
 * @param studentId - UUID of the student
 * @param context - Optional achievement context to filter by
 * @returns Array of student achievement records
 * @throws AchievementServiceError on database errors
 *
 * @example
 * ```typescript
 * // Get all achievements unlocked by a student
 * const achievements = await getStudentAchievements(supabase, studentId);
 *
 * // Get only minesweeper achievements
 * const minesweeperAchievements = await getStudentAchievements(
 *   supabase,
 *   studentId,
 *   'minesweeper'
 * );
 * ```
 */
export async function getStudentAchievements(
	supabase: TypedSupabaseClient,
	studentId: string,
	context?: AchievementContext
): Promise<StudentAchievement[]> {
	try {
		let query = supabase
			.from('student_achievements')
			.select(
				`
				*,
				achievements!inner (
					context,
					category,
					name,
					description,
					icon,
					metadata
				)
			`
			)
			.eq('student_id', studentId)
			.order('unlocked_at', { ascending: false });

		if (context) {
			query = query.eq('achievements.context', context);
		}

		const { data, error } = await query;

		if (error) {
			throw new AchievementServiceError(
				'Failed to fetch student achievements',
				'DATABASE_ERROR',
				error
			);
		}

		return (data || []) as StudentAchievement[];
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError(
			'Unexpected error fetching student achievements',
			'UNKNOWN_ERROR',
			err
		);
	}
}

/**
 * Get student's progress for a specific achievement
 *
 * Returns the current progress for a progressive achievement (e.g., "Answer 100 questions").
 * Returns null if no progress exists for this achievement.
 *
 * @param supabase - Authenticated Supabase client
 * @param studentId - UUID of the student
 * @param achievementId - Achievement ID (e.g., 'questions_master_calculus')
 * @returns Progress record or null if not found
 * @throws AchievementServiceError on database errors
 *
 * @example
 * ```typescript
 * const progress = await getStudentProgress(
 *   supabase,
 *   studentId,
 *   'questions_master_calculus'
 * );
 *
 * if (progress) {
 *   console.log(`Progress: ${progress.progress_percentage}%`);
 * }
 * ```
 */
export async function getStudentProgress(
	supabase: TypedSupabaseClient,
	studentId: string,
	achievementId: string
): Promise<AchievementProgress | null> {
	try {
		const { data, error } = await supabase
			.from('achievement_progress')
			.select('*')
			.eq('student_id', studentId)
			.eq('achievement_id', achievementId)
			.eq('is_active', true)
			.maybeSingle();

		if (error) {
			throw new AchievementServiceError(
				'Failed to fetch achievement progress',
				'DATABASE_ERROR',
				error
			);
		}

		return data as AchievementProgress | null;
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError(
			'Unexpected error fetching achievement progress',
			'UNKNOWN_ERROR',
			err
		);
	}
}

// ============================================================================
// ACHIEVEMENT PROCESSING
// ============================================================================

/**
 * Process an achievement event
 *
 * Main entry point for achievement processing. Processes an event (e.g., game completed,
 * question answered) and automatically unlocks any matching achievements.
 *
 * This function calls the `process_achievement_event` SQL function which:
 * 1. Logs the event
 * 2. Finds matching achievements
 * 3. Evaluates unlock conditions
 * 4. Awards achievements if conditions are met
 * 5. Returns list of newly unlocked achievements
 *
 * @param supabase - Authenticated Supabase client
 * @param eventType - Type of event (e.g., 'minesweeper_game_completed')
 * @param studentId - UUID of the student
 * @param eventData - Event-specific data (score, time, difficulty, etc.)
 * @returns Result with unlocked achievements
 * @throws AchievementServiceError on database or validation errors
 *
 * @example
 * ```typescript
 * // Process a minesweeper game completion
 * const result = await processEvent(
 *   supabase,
 *   'minesweeper_game_completed',
 *   studentId,
 *   {
 *     game_id: gameId,
 *     difficulty: 'expert',
 *     score: 150,
 *     time_seconds: 45,
 *     perfect: true
 *   }
 * );
 *
 * // Show notifications for unlocked achievements
 * result.unlockedAchievements.forEach(achievement => {
 *   showToast(`Achievement unlocked: ${achievement.name}`);
 * });
 * ```
 */
export async function processEvent(
	supabase: TypedSupabaseClient,
	eventType: string,
	studentId: string,
	eventData: Record<string, unknown>
): Promise<ProcessEventResult> {
	try {
		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: eventType,
			p_student_id: studentId,
			p_event_data: eventData as Json
		});

		if (error) {
			throw new AchievementServiceError('Failed to process achievement event', 'RPC_ERROR', error);
		}

		if (!data) {
			throw new AchievementServiceError('No data returned from event processing', 'EMPTY_RESPONSE');
		}

		// Parse the JSONB response from SQL function
		const result = data as unknown as {
			event_id: string;
			unlocked_achievements: UnlockedAchievementResponse[];
			count: number;
		};

		return {
			eventId: result.event_id,
			unlockedAchievements: result.unlocked_achievements || [],
			count: result.count || 0
		};
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError('Unexpected error processing event', 'UNKNOWN_ERROR', err);
	}
}

/**
 * Manually award an achievement to a student
 *
 * Allows teachers to manually award achievements to their students. This is useful for:
 * - Recognizing exceptional behavior not captured by automatic achievements
 * - Awarding achievements for offline activities
 * - Special recognitions or rewards
 *
 * This function calls the `award_achievement_manual` SQL function which:
 * 1. Verifies teacher has access to student (via class membership)
 * 2. Validates achievement exists and allows manual awarding
 * 3. Awards the achievement with teacher ID recorded
 * 4. Returns success (idempotent - duplicate awards are ignored)
 *
 * @param supabase - Authenticated Supabase client
 * @param teacherId - UUID of the teacher awarding the achievement
 * @param studentId - UUID of the student receiving the achievement
 * @param achievementId - Achievement ID to award
 * @param reason - Optional reason for the manual award
 * @returns True if successful
 * @throws AchievementServiceError on database, authorization, or validation errors
 *
 * @example
 * ```typescript
 * // Award achievement for helping classmate
 * await awardAchievement(
 *   supabase,
 *   teacherId,
 *   studentId,
 *   'social_helpful_peer',
 *   'Helped classmate understand quadratic equations'
 * );
 * ```
 */
export async function awardAchievement(
	supabase: TypedSupabaseClient,
	teacherId: string,
	studentId: string,
	achievementId: string,
	reason?: string
): Promise<boolean> {
	try {
		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: teacherId,
			p_student_id: studentId,
			p_achievement_id: achievementId,
			p_reason: reason
		});

		if (error) {
			throw new AchievementServiceError('Failed to award achievement', 'RPC_ERROR', error);
		}

		return data === true;
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError(
			'Unexpected error awarding achievement',
			'UNKNOWN_ERROR',
			err
		);
	}
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

/**
 * Get achievement leaderboard
 *
 * Returns top students ranked by total achievement points within a specific context.
 * Useful for displaying class/school leaderboards and fostering healthy competition.
 *
 * The leaderboard aggregates:
 * - Total points earned from all achievements
 * - Number of achievements unlocked
 * - Student profile information (username, avatar)
 *
 * Results are sorted by total points (descending) and limited to the specified count.
 *
 * @param supabase - Authenticated Supabase client
 * @param context - Achievement context to filter by (e.g., 'minesweeper')
 * @param limit - Maximum number of entries to return (default: 10, max: 100)
 * @returns Array of leaderboard entries sorted by points
 * @throws AchievementServiceError on database errors
 *
 * @example
 * ```typescript
 * // Get top 10 minesweeper players
 * const leaderboard = await getAchievementLeaderboard(
 *   supabase,
 *   'minesweeper',
 *   10
 * );
 *
 * leaderboard.forEach((entry, rank) => {
 *   console.log(`${rank + 1}. ${entry.username}: ${entry.totalPoints} points`);
 * });
 * ```
 */
export async function getAchievementLeaderboard(
	supabase: TypedSupabaseClient,
	context: AchievementContext,
	limit = 10
): Promise<LeaderboardEntry[]> {
	try {
		// Query student_achievements joined with achievements and profiles
		const { data, error } = await supabase
			.from('student_achievements')
			.select(
				`
				student_id,
				points_awarded,
				profiles!inner (
					username,
					avatar_url,
					is_test
				),
				achievements!inner (
					context
				)
			`
			)
			.eq('achievements.context', context)
			.eq('profiles.is_test', false)
			.gte('points_awarded', 1);

		if (error) {
			throw new AchievementServiceError('Failed to fetch leaderboard', 'DATABASE_ERROR', error);
		}

		if (!data || data.length === 0) {
			return [];
		}

		// Aggregate by student (sum points, count achievements)
		const studentMap = new Map<string, LeaderboardEntry>();

		// Define type for profile data from join
		type ProfileData = { username: string; avatar_url: string | null };

		for (const row of data) {
			const studentId = row.student_id;
			const points = row.points_awarded || 0;

			// Extract profile data (handle both array and object responses)
			const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as
				| ProfileData
				| undefined;
			const username = profile?.username ?? 'Unknown';
			const avatarUrl = profile?.avatar_url ?? null;

			if (studentMap.has(studentId)) {
				const entry = studentMap.get(studentId)!;
				entry.totalPoints += points;
				entry.achievementCount += 1;
			} else {
				studentMap.set(studentId, {
					studentId,
					username,
					avatarUrl,
					totalPoints: points,
					achievementCount: 1
				});
			}
		}

		// Convert to array, sort by points, and limit
		const leaderboard = Array.from(studentMap.values())
			.sort((a, b) => b.totalPoints - a.totalPoints)
			.slice(0, limit);

		return leaderboard;
	} catch (err) {
		if (err instanceof AchievementServiceError) {
			throw err;
		}
		throw new AchievementServiceError(
			'Unexpected error fetching leaderboard',
			'UNKNOWN_ERROR',
			err
		);
	}
}
