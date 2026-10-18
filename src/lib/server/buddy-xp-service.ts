/**
 * Buddy XP Service — Orchestration
 * ==================================
 *
 * High-level functions that coordinate XP gains from interactive systems
 * (tests, riddles, chapter quizzes). Combines pure XP calculations with DB operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyXpGainResult } from '$lib/types/buddy';
import { calculateXpGain, calculateStreakBonus, XP_SOURCES } from './buddy-xp';
import {
	getStudentBuddy,
	addBuddyXp,
	updateStreak,
	addExploredTheme,
	addExploredThemes
} from './buddy-queries';

export interface ExerciseXpParams {
	isCorrect: boolean;
	theme?: string;
}

export interface BuddyXpFromExerciseResult {
	xpResult: BuddyXpGainResult;
	streakUpdated: boolean;
	newStreak: number;
	streakBonusXp: number;
	isNewTheme: boolean;
}

/**
 * Award XP to a student's buddy from a single exercise/question answer.
 *
 * Handles:
 * - Base XP (correct/incorrect)
 * - First exercise of the day bonus
 * - New theme bonus
 * - Streak update + milestone bonuses
 *
 * Returns null if student has no buddy.
 */
export async function addBuddyXpFromExercise(
	supabase: SupabaseClient<Database>,
	studentId: string,
	params: ExerciseXpParams
): Promise<BuddyXpFromExerciseResult | null> {
	const buddy = await getStudentBuddy(supabase, studentId);
	if (!buddy) return null;

	const today = new Date().toISOString().split('T')[0];
	const isFirstOfDay = buddy.last_activity_date !== today;

	// Check if theme is new
	let isNewTheme = false;
	if (params.theme) {
		isNewTheme = await addExploredTheme(supabase, studentId, params.theme);
	}

	// Calculate base XP
	const xpEarnedToday = buddy.last_xp_date === today ? buddy.xp_earned_today : 0;
	const { xp: baseXp } = calculateXpGain({
		isCorrect: params.isCorrect,
		isFirstOfDay,
		isNewTheme,
		isCorrectedRetry: false,
		xpEarnedToday
	});

	// Add base XP (subject to daily cap)
	const xpResult = await addBuddyXp(studentId, baseXp, false);

	// Handle streak (only on first activity of the day)
	let streakUpdated = false;
	let newStreak = buddy.current_streak;
	let streakBonusXp = 0;

	if (isFirstOfDay) {
		const streakResult = await updateStreak(supabase, studentId);
		streakUpdated = streakResult.wasUpdated;
		newStreak = streakResult.newStreak;

		if (streakUpdated) {
			const bonus = calculateStreakBonus(newStreak);
			if (bonus.xp > 0) {
				streakBonusXp = bonus.xp;
				await addBuddyXp(studentId, bonus.xp, bonus.isMilestone);
			}
		}
	}

	return {
		xpResult: {
			...xpResult,
			xp_gained: xpResult.xp_gained + streakBonusXp
		},
		streakUpdated,
		newStreak,
		streakBonusXp,
		isNewTheme
	};
}

/**
 * Award XP from a completed test (batch of questions).
 *
 * Processes each answer individually for XP, but only triggers
 * streak/first-of-day once for the whole test.
 */
export async function addBuddyXpFromTest(
	supabase: SupabaseClient<Database>,
	studentId: string,
	answers: { isCorrect: boolean; theme?: string }[]
): Promise<BuddyXpFromExerciseResult | null> {
	if (answers.length === 0) return null;

	const buddy = await getStudentBuddy(supabase, studentId);
	if (!buddy) return null;

	const today = new Date().toISOString().split('T')[0];
	const isFirstOfDay = buddy.last_activity_date !== today;
	const xpEarnedToday = buddy.last_xp_date === today ? buddy.xp_earned_today : 0;
	let totalXpGained = 0;
	let lastXpResult: BuddyXpGainResult = {
		xp_gained: 0,
		new_xp: buddy.xp,
		new_level: buddy.level,
		leveled_up: false,
		daily_cap_reached: false
	};

	// Bonus « nouveau thème » : calculé sur les thèmes déjà explorés, CRÉDITÉ, puis
	// seuls les thèmes payés sont marqués (un thème non payé restera « nouveau »).
	const explored = new Set(buddy.themes_explored);
	const bonusThemes = new Set<string>();
	/** Thème dont la réponse porte le bonus → XP cumulée à la fin de cette réponse. */
	const themeDueAt = new Map<string, number>();

	let totalBaseXp = 0;
	for (let i = 0; i < answers.length; i++) {
		const answer = answers[i];
		// Un seul bonus par thème : la première réponse qui le porte
		const isNewTheme =
			!!answer.theme && !explored.has(answer.theme) && !bonusThemes.has(answer.theme);
		if (isNewTheme && answer.theme) bonusThemes.add(answer.theme);

		const { xp, capped } = calculateXpGain({
			isCorrect: answer.isCorrect,
			isFirstOfDay: i === 0 && isFirstOfDay,
			isNewTheme,
			isCorrectedRetry: false,
			xpEarnedToday: xpEarnedToday + totalBaseXp
		});
		totalBaseXp += xp;
		// Bonus tronqué par le plafond (calcul local) : pas payé, thème non marqué
		if (isNewTheme && answer.theme && !capped) themeDueAt.set(answer.theme, totalBaseXp);
	}

	// Add all XP in one RPC call
	if (totalBaseXp > 0) {
		lastXpResult = await addBuddyXp(studentId, totalBaseXp, false);
		totalXpGained += lastXpResult.xp_gained;
	}

	// Crédit partiel (plafond appliqué par la base) : le crédit couvre les réponses
	// dans l'ordre ; un thème est payé si l'XP cumulée jusqu'à SA réponse l'est.
	const creditedBaseXp = lastXpResult.xp_gained;
	const paidThemes = [...themeDueAt]
		.filter(([, dueAt]) => dueAt <= creditedBaseXp)
		.map(([theme]) => theme);
	const newThemes =
		paidThemes.length > 0
			? await addExploredThemes(supabase, buddy, paidThemes)
			: new Set<string>();

	// Handle streak
	let streakUpdated = false;
	let newStreak = buddy.current_streak;
	let streakBonusXp = 0;

	if (isFirstOfDay) {
		const streakResult = await updateStreak(supabase, studentId);
		streakUpdated = streakResult.wasUpdated;
		newStreak = streakResult.newStreak;

		if (streakUpdated) {
			const bonus = calculateStreakBonus(newStreak);
			if (bonus.xp > 0) {
				streakBonusXp = bonus.xp;
				const bonusResult = await addBuddyXp(studentId, bonus.xp, bonus.isMilestone);
				totalXpGained += bonusResult.xp_gained;
				lastXpResult = bonusResult;
			}
		}
	}

	return {
		xpResult: {
			...lastXpResult,
			xp_gained: totalXpGained
		},
		streakUpdated,
		newStreak,
		streakBonusXp,
		isNewTheme: newThemes.size > 0
	};
}

/**
 * Forfait d'une séance de révision espacée TERMINÉE (décision de David,
 * 2026-10-18 : l'effort, pas la réussite — les cartes sont auto-évaluées).
 *
 * L'appelant a déjà établi que la séance est terminée et que le forfait du jour
 * n'a pas été donné (`rewardFinishedReviewSession`). Soumis au plafond du jour
 * (`add_buddy_xp`). La série n'est pas touchée ici.
 *
 * Rend la même forme que `addBuddyXpFromTest` (`buddy_xp` des deux routes).
 * Rend null si l'élève n'a pas de Palotin.
 */
export async function addBuddyXpFromReviewSession(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<BuddyXpFromExerciseResult | null> {
	const buddy = await getStudentBuddy(supabase, studentId);
	if (!buddy) return null;

	const xpResult = await addBuddyXp(studentId, XP_SOURCES.review_session, false);

	return {
		xpResult,
		streakUpdated: false,
		newStreak: buddy.current_streak,
		streakBonusXp: 0,
		isNewTheme: false
	};
}
