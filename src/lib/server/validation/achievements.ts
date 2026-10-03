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
export type AwardAchievementBody = z.infer<typeof awardAchievementSchema>;
