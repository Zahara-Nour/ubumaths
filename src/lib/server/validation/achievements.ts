/**
 * Achievement system validation schemas
 *
 * Provides Zod validation for all achievement-related API endpoints.
 * Ensures type-safe and validated inputs for:
 * - Event processing
 * - Achievement awarding
 * - Query parameters
 * - Leaderboard requests
 */

import { z } from 'zod';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Valid achievement contexts
 */
const ACHIEVEMENT_CONTEXTS = [
	'minesweeper',
	'questions',
	'assessments',
	'srs',
	'riddles',
	'social',
	'meta'
] as const;

/**
 * Valid achievement event types
 */
const ACHIEVEMENT_EVENT_TYPES = [
	// Minesweeper
	'minesweeper_game_completed',
	'minesweeper_game_won',
	'minesweeper_game_lost',
	// Questions
	'question_answered',
	'question_streak',
	'subject_mastery',
	// Assessments
	'assessment_completed',
	'assessment_perfect_score',
	// SRS
	'srs_card_reviewed',
	'srs_daily_streak',
	'srs_retention_milestone',
	// Riddles
	'riddle_solved',
	'riddle_daily_solved',
	// Social
	'friend_added',
	'message_sent',
	'help_given',
	// Meta
	'achievement_unlocked',
	'level_up'
] as const;

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for optional achievement context query parameter
 * Used in: GET /api/achievements?context=minesweeper
 */
export const achievementContextSchema = z.object({
	context: z.enum(ACHIEVEMENT_CONTEXTS).optional()
});

/**
 * Schema for student ID path parameter
 * Used in: GET /api/achievements/student/[studentId]
 */
export const studentIdSchema = z.object({
	studentId: z.string().uuid('Invalid student ID')
});

/**
 * Schema for achievement ID path parameter
 * Used in: GET /api/achievements/student/[studentId]/progress/[achievementId]
 */
export const achievementIdSchema = z.object({
	achievementId: z
		.string()
		.min(1, 'Achievement ID is required')
		.max(100, 'Achievement ID is too long')
		.regex(
			/^[a-z0-9_]+$/,
			'Achievement ID must contain only lowercase letters, numbers, and underscores'
		)
});

/**
 * Schema for leaderboard query parameters
 * Used in: GET /api/achievements/leaderboard?context=minesweeper&limit=10
 */
export const leaderboardQuerySchema = z.object({
	context: z.enum(ACHIEVEMENT_CONTEXTS),
	limit: z
		.number()
		.int('Limit must be an integer')
		.min(1, 'Limit must be at least 1')
		.max(100, 'Limit cannot exceed 100')
		.default(10)
});

// ============================================================================
// REQUEST BODY SCHEMAS
// ============================================================================

/**
 * Schema for processing achievement events
 * Used in: POST /api/achievements/events
 *
 * Example:
 * ```json
 * {
 *   "eventType": "minesweeper_game_completed",
 *   "studentId": "123e4567-e89b-12d3-a456-426614174000",
 *   "eventData": {
 *     "game_id": "uuid",
 *     "difficulty": "expert",
 *     "score": 150,
 *     "time_seconds": 45,
 *     "perfect": true
 *   }
 * }
 * ```
 */
export const processEventSchema = z.object({
	eventType: z.enum(ACHIEVEMENT_EVENT_TYPES, {
		errorMap: () => ({ message: 'Invalid event type' })
	}),
	studentId: z.string().uuid('Invalid student ID'),
	eventData: z
		.object({})
		.passthrough() // Allow any additional properties
		.default({})
		.refine(
			(data) => {
				// Event data must be a valid object (not null, not array)
				return typeof data === 'object' && data !== null && !Array.isArray(data);
			},
			{ message: 'Event data must be a valid object' }
		)
		.refine(
			(data) => {
				// Payload size limit: max 10KB to prevent DoS
				const json = JSON.stringify(data);
				return json.length <= 10000;
			},
			{ message: 'Event data too large (maximum 10KB allowed)' }
		)
});

/**
 * Schema for manually awarding achievements
 * Used in: POST /api/achievements/award
 *
 * Example:
 * ```json
 * {
 *   "studentId": "123e4567-e89b-12d3-a456-426614174000",
 *   "achievementId": "minesweeper_first_win",
 *   "reason": "Exceptional performance in class"
 * }
 * ```
 */
export const awardAchievementSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	achievementId: z
		.string()
		.min(1, 'Achievement ID is required')
		.max(100, 'Achievement ID is too long')
		.regex(
			/^[a-z0-9_]+$/,
			'Achievement ID must contain only lowercase letters, numbers, and underscores'
		),
	reason: z
		.string()
		.min(1, 'Reason is required')
		.max(500, 'Reason cannot exceed 500 characters')
		.optional()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * TypeScript types derived from Zod schemas
 */
export type AchievementContextQuery = z.infer<typeof achievementContextSchema>;
export type StudentIdParam = z.infer<typeof studentIdSchema>;
export type AchievementIdParam = z.infer<typeof achievementIdSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type ProcessEventBody = z.infer<typeof processEventSchema>;
export type AwardAchievementBody = z.infer<typeof awardAchievementSchema>;
