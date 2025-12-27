/**
 * Tutor Rate Limits Configuration
 *
 * Shared constants for tutor rate limiting.
 * Used by both server-side rate limiter and client-side UI components.
 *
 * IMPORTANT: If you change these values, also update:
 * - src/lib/server/tutor/tutor-rate-limiter.ts (TUTOR_RATE_LIMITS)
 * - Documentation in src/lib/components/tutor/README.md
 */

/**
 * Maximum messages allowed per exercise
 * No time window - persists across sessions
 */
export const TUTOR_MAX_PER_EXERCISE = 15;

/**
 * Maximum messages allowed per hour
 * Rolling window of 60 minutes
 */
export const TUTOR_MAX_PER_HOUR = 30;

/**
 * Maximum messages allowed per day
 * Rolling window of 24 hours (1440 minutes)
 */
export const TUTOR_MAX_PER_DAY = 100;

/**
 * Maximum help level for progressive assistance
 * Ranges from 0 (minimal) to 7 (maximum)
 */
export const TUTOR_MAX_HELP_LEVEL = 7;

/**
 * All limits as an object for convenience
 */
export const TUTOR_LIMITS = {
	perExercise: TUTOR_MAX_PER_EXERCISE,
	perHour: TUTOR_MAX_PER_HOUR,
	perDay: TUTOR_MAX_PER_DAY,
	maxHelpLevel: TUTOR_MAX_HELP_LEVEL
} as const;
