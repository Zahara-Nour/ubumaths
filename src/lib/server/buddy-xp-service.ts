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
	addExploredThemes,
	removeExploredThemes
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

/** XP de base d'une séance et réponse qui porte le bonus de chaque thème. */
interface TestXpPlan {
	totalBaseXp: number;
	/** Thème dont la réponse porte le bonus → XP cumulée à la fin de cette réponse. */
	themeDueAt: Map<string, number>;
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
 * `supabase` (client de l'élève) ne sert qu'aux lectures ; les écritures
 * passent par le client service, `studentId` venant de la SESSION.
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

	// Thème réservé AVANT le crédit : de deux envois simultanés, un seul le
	// réserve, donc un seul touche le bonus
	let isNewTheme = false;
	if (params.theme) {
		isNewTheme = await addExploredTheme(studentId, params.theme);
	}

	// Calculate base XP
	const xpEarnedToday = buddy.last_xp_date === today ? buddy.xp_earned_today : 0;
	const { xp: baseXp, capped } = calculateXpGain({
		isCorrect: params.isCorrect,
		isFirstOfDay,
		isNewTheme,
		isCorrectedRetry: false,
		xpEarnedToday
	});

	// Add base XP (subject to daily cap) ; en échec, rendre le thème réservé
	let xpResult: BuddyXpGainResult;
	try {
		xpResult = await addBuddyXp(studentId, baseXp, false);
	} catch (creditError) {
		if (isNewTheme && params.theme) await removeExploredThemes(studentId, [params.theme]);
		throw creditError;
	}

	// Bonus non payé en entier (plafond local ou crédit tronqué par la base) :
	// thème retiré, il restera nouveau (même règle que la séance)
	if (isNewTheme && params.theme && (capped || xpResult.xp_gained < baseXp)) {
		await removeExploredThemes(studentId, [params.theme]);
		isNewTheme = false;
	}

	// Handle streak (only on first activity of the day)
	let streakUpdated = false;
	let newStreak = buddy.current_streak;
	let streakBonusXp = 0;

	if (isFirstOfDay) {
		const streakResult = await updateStreak(studentId);
		streakUpdated = streakResult.wasUpdated;
		newStreak = streakResult.wasUpdated ? streakResult.newStreak : buddy.current_streak;

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
 * XP d'une séance, réponse par réponse. `isEligible` dit si un thème peut
 * encore porter le bonus ; un seul bonus par thème (sa première réponse). Un
 * bonus tronqué par le plafond (calcul local) n'est pas retenu dans
 * `themeDueAt` : son thème restera « nouveau ».
 */
function planTestXp(
	answers: { isCorrect: boolean; theme?: string }[],
	isFirstOfDay: boolean,
	xpEarnedToday: number,
	isEligible: (theme: string) => boolean
): TestXpPlan {
	const bonusThemes = new Set<string>();
	const themeDueAt = new Map<string, number>();
	let totalBaseXp = 0;

	for (let i = 0; i < answers.length; i++) {
		const answer = answers[i];
		const isNewTheme = !!answer.theme && isEligible(answer.theme) && !bonusThemes.has(answer.theme);
		if (isNewTheme && answer.theme) bonusThemes.add(answer.theme);

		const { xp, capped } = calculateXpGain({
			isCorrect: answer.isCorrect,
			isFirstOfDay: i === 0 && isFirstOfDay,
			isNewTheme,
			isCorrectedRetry: false,
			xpEarnedToday: xpEarnedToday + totalBaseXp
		});
		totalBaseXp += xp;
		if (isNewTheme && answer.theme && !capped) themeDueAt.set(answer.theme, totalBaseXp);
	}

	return { totalBaseXp, themeDueAt };
}

/**
 * Award XP from a completed test (batch of questions).
 *
 * Processes each answer individually for XP, but only triggers
 * streak/first-of-day once for the whole test.
 *
 * Bonus « nouveau thème » payé une seule fois, même pour deux envois
 * simultanés : les thèmes sont RÉSERVÉS (écrits sous verrou optimiste) avant le
 * crédit, et seul un thème réservé par CET appel porte le bonus. Un thème
 * réservé dont le bonus n'est finalement pas crédité (crédit en échec, crédit
 * tronqué par la base) est retiré : il restera « nouveau ».
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

	// 1. Thèmes candidats au bonus, d'après les thèmes déjà explorés
	const explored = new Set(buddy.themes_explored);
	let plan = planTestXp(answers, isFirstOfDay, xpEarnedToday, (theme) => !explored.has(theme));
	const candidates = [...plan.themeDueAt.keys()];

	// 2. Les réserver ; un thème réservé ailleurs entre-temps perd le bonus
	const reserved =
		candidates.length > 0 ? await addExploredThemes(studentId, candidates) : new Set<string>();
	const lost = new Set(candidates.filter((theme) => !reserved.has(theme)));
	if (lost.size > 0) {
		// Seul un thème réservé peut porter le bonus : un thème tronqué au premier
		// calcul (donc non réservé) passerait sinon sous le plafond, payé sans
		// être écrit, et serait repayé plus tard
		plan = planTestXp(answers, isFirstOfDay, xpEarnedToday, (theme) => reserved.has(theme));
	}

	// 3. Créditer ; en échec, rendre les thèmes réservés
	if (plan.totalBaseXp > 0) {
		try {
			lastXpResult = await addBuddyXp(studentId, plan.totalBaseXp, false);
		} catch (creditError) {
			await removeExploredThemes(studentId, [...reserved]);
			throw creditError;
		}
		totalXpGained += lastXpResult.xp_gained;
	}

	// 4. Crédit partiel (plafond appliqué par la base) : le crédit couvre les
	// réponses dans l'ordre ; un thème est payé si l'XP cumulée jusqu'à SA
	// réponse l'est. Les thèmes réservés non payés sont retirés.
	const creditedBaseXp = lastXpResult.xp_gained;
	const newThemes = new Set(
		[...reserved].filter((theme) => (plan.themeDueAt.get(theme) ?? Infinity) <= creditedBaseXp)
	);
	const unpaid = [...reserved].filter((theme) => !newThemes.has(theme));
	if (unpaid.length > 0) await removeExploredThemes(studentId, unpaid);

	// Handle streak
	let streakUpdated = false;
	let newStreak = buddy.current_streak;
	let streakBonusXp = 0;

	if (isFirstOfDay) {
		const streakResult = await updateStreak(studentId);
		streakUpdated = streakResult.wasUpdated;
		newStreak = streakResult.wasUpdated ? streakResult.newStreak : buddy.current_streak;

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
