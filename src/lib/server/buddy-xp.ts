/**
 * Re-export from shared utils.
 * The pure calculation functions live in $lib/utils/buddy-xp.ts
 * so they can be imported by both server and client code.
 */
export {
	XP_TABLE,
	MAX_LEVEL,
	DAILY_XP_CAP,
	XP_SOURCES,
	calculateLevel,
	xpForNextLevel,
	xpProgress,
	calculateXpGain,
	calculateStreakBonus,
	scoreQuiz
} from '$lib/utils/buddy-xp';
