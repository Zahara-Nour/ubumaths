/**
 * Buddy XP — Pure calculation functions
 * ======================================
 *
 * All functions are pure (no DB, no side effects) and easily testable.
 * The XP table and daily cap are defined here as the single source of truth.
 */

import type { PalotinType } from '$lib/config/buddy-messages';
import type { BuddyQuizAnswer, BuddyQuizResult } from '$lib/types/buddy';

/** Cumulative XP required for each level (index = level, value = total XP) */
export const XP_TABLE = [
	0, // level 1
	30, // level 2
	70, // level 3
	120, // level 4
	180, // level 5
	260, // level 6
	360, // level 7
	480, // level 8
	620, // level 9
	780, // level 10
	960, // level 11
	1160, // level 12
	1400, // level 13
	1680, // level 14
	2000, // level 15
	2400, // level 16
	2900, // level 17
	3500, // level 18
	4200, // level 19
	5000 // level 20
];

export const MAX_LEVEL = 20;
export const DAILY_XP_CAP = 100;

/** XP awarded per action */
export const XP_SOURCES = {
	correct: 10,
	incorrect: 3,
	corrected_retry: 7,
	first_of_day: 5,
	new_theme: 25,
	daily_streak: 15,
	streak_7: 50,
	streak_14: 100,
	streak_30: 300
} as const;

/**
 * Calculate level from total cumulative XP.
 */
export function calculateLevel(totalXp: number): number {
	for (let i = XP_TABLE.length - 1; i >= 0; i--) {
		if (totalXp >= XP_TABLE[i]) {
			return i + 1;
		}
	}
	return 1;
}

/**
 * Get XP required to reach the next level (from current total).
 * Returns 0 if already at max level.
 */
export function xpForNextLevel(currentLevel: number): number {
	if (currentLevel >= MAX_LEVEL) return 0;
	return XP_TABLE[currentLevel]; // XP_TABLE[level] = XP needed for level+1
}

/**
 * Get XP progress within current level (for progress bar).
 */
export function xpProgress(
	totalXp: number,
	currentLevel: number
): { current: number; needed: number } {
	if (currentLevel >= MAX_LEVEL) return { current: 0, needed: 0 };
	const levelStart = XP_TABLE[currentLevel - 1];
	const levelEnd = XP_TABLE[currentLevel];
	return {
		current: totalXp - levelStart,
		needed: levelEnd - levelStart
	};
}

/**
 * Calculate XP gain from an exercise/question answer.
 * Enforces daily cap (milestone-exempt XP is handled separately).
 */
export function calculateXpGain(params: {
	isCorrect: boolean;
	isFirstOfDay: boolean;
	isNewTheme: boolean;
	isCorrectedRetry: boolean;
	xpEarnedToday: number;
}): { xp: number; capped: boolean } {
	let xp = 0;

	if (params.isCorrectedRetry) {
		xp += XP_SOURCES.corrected_retry;
	} else if (params.isCorrect) {
		xp += XP_SOURCES.correct;
	} else {
		xp += XP_SOURCES.incorrect;
	}

	if (params.isFirstOfDay) {
		xp += XP_SOURCES.first_of_day;
	}

	if (params.isNewTheme) {
		xp += XP_SOURCES.new_theme;
	}

	// Enforce daily cap
	const remaining = Math.max(0, DAILY_XP_CAP - params.xpEarnedToday);
	if (xp > remaining) {
		return { xp: remaining, capped: true };
	}

	return { xp, capped: false };
}

/**
 * Calculate streak bonus XP.
 * Returns the XP bonus and whether it's a milestone (exempt from daily cap).
 */
export function calculateStreakBonus(streakDays: number): { xp: number; isMilestone: boolean } {
	if (streakDays === 30 || (streakDays > 30 && streakDays % 30 === 0)) {
		return { xp: XP_SOURCES.streak_30, isMilestone: true };
	}
	if (streakDays === 14) {
		return { xp: XP_SOURCES.streak_14, isMilestone: true };
	}
	if (streakDays === 7) {
		return { xp: XP_SOURCES.streak_7, isMilestone: true };
	}
	// Daily streak bonus (not a milestone, counts toward cap)
	return { xp: XP_SOURCES.daily_streak, isMilestone: false };
}

/**
 * Score the personality quiz and suggest a Palotin.
 * Each answer maps to a Palotin. Highest score wins.
 * On tie, the first in order (giron, pile, cotice) wins.
 */
export function scoreQuiz(answers: BuddyQuizAnswer[]): BuddyQuizResult {
	const scores: Record<PalotinType, number> = { giron: 0, pile: 0, cotice: 0 };

	for (const answer of answers) {
		scores[answer.palotin] += 1;
	}

	let suggested: PalotinType = 'giron';
	let maxScore = scores.giron;

	if (scores.pile > maxScore) {
		suggested = 'pile';
		maxScore = scores.pile;
	}
	if (scores.cotice > maxScore) {
		suggested = 'cotice';
	}

	return { suggested, scores };
}
