/**
 * Buddy XP Service — Orchestration
 * ==================================
 *
 * High-level functions that coordinate XP gains from interactive systems
 * (tests, riddles, chapter quizzes). Combines pure XP calculations with DB operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyState, BuddyXpGainResult } from '$lib/types/buddy';
import { calculateXpGain, calculateConstanceBonus, XP_SOURCES } from './buddy-xp';
import { isDayCounted, utcDay } from '$lib/utils/buddy-constance';
import {
	getStudentBuddy,
	addBuddyXp,
	recordWorkedDay,
	addExploredTheme,
	addExploredThemes,
	removeExploredThemes
} from './buddy-queries';

export interface ExerciseXpParams {
	isCorrect: boolean;
	theme?: string;
}

/**
 * Gain renvoyé aux routes (`buddy_xp`). Constance Royale (en semaines) :
 * `streakUpdated` = ce crédit a compté le jour travaillé ; `newStreak` = la
 * Constance après lui ; `streakBonusXp` = récompense de la semaine tenue (+30
 * ou palier). `constanceWeekStart` / `constanceDaysThisWeek` : présents quand
 * le jour a été compté (affichage « Cette semaine : x jours sur 3 »).
 */
export interface BuddyXpFromExerciseResult {
	xpResult: BuddyXpGainResult;
	streakUpdated: boolean;
	newStreak: number;
	streakBonusXp: number;
	isNewTheme: boolean;
	constanceWeekStart?: string;
	constanceDaysThisWeek?: number;
}

/** Effet d'un crédit sur la Constance Royale. */
interface WorkedDayReward {
	streakUpdated: boolean;
	newStreak: number;
	streakBonusXp: number;
	/** Dernier crédit fait ici (récompense de la semaine), sinon null */
	bonusResult: BuddyXpGainResult | null;
	constanceWeekStart?: string;
	constanceDaysThisWeek?: number;
}

/** XP de base d'une séance et réponse qui porte le bonus de chaque thème. */
interface TestXpPlan {
	totalBaseXp: number;
	/** Thème dont la réponse porte le bonus → XP cumulée à la fin de cette réponse. */
	themeDueAt: Map<string, number>;
}

// Functions

/**
 * Constance Royale après un crédit (spécification du 2026-10-18) : un jour
 * travaillé = un jour où l'élève a gagné des pansées. Le jour n'est compté que
 * si CE crédit a rapporté (`creditedXp` > 0) et que la ligne lue ne le dit pas
 * déjà compté. Le 3e jour de la semaine, la semaine est tenue : +30 dans le
 * plafond, ou le palier de 4 / 8 / 16 semaines hors plafond.
 */
async function rewardWorkedDay(
	studentId: string,
	buddy: BuddyState,
	creditedXp: number
): Promise<WorkedDayReward> {
	const unchanged: WorkedDayReward = {
		streakUpdated: false,
		newStreak: buddy.current_streak,
		streakBonusXp: 0,
		bonusResult: null
	};
	if (creditedXp <= 0 || isDayCounted(buddy, utcDay())) return unchanged;

	const day = await recordWorkedDay(studentId);
	if (day.status !== 'counted') return unchanged;

	let streakBonusXp = 0;
	let bonusResult: BuddyXpGainResult | null = null;
	if (day.weekHeld) {
		const bonus = calculateConstanceBonus(day.newStreak);
		bonusResult = await addBuddyXp(studentId, bonus.xp, bonus.isMilestone);
		streakBonusXp = bonusResult.xp_gained;
	}

	return {
		streakUpdated: true,
		newStreak: day.newStreak,
		streakBonusXp,
		bonusResult,
		constanceWeekStart: day.constanceWeekStart,
		constanceDaysThisWeek: day.constanceDaysThisWeek
	};
}

/** Champs Constance du gain rendu. */
function constanceFields(reward: WorkedDayReward) {
	return {
		streakUpdated: reward.streakUpdated,
		newStreak: reward.newStreak,
		streakBonusXp: reward.streakBonusXp,
		...(reward.streakUpdated
			? {
					constanceWeekStart: reward.constanceWeekStart,
					constanceDaysThisWeek: reward.constanceDaysThisWeek
				}
			: {})
	};
}

/**
 * Award XP to a student's buddy from a single exercise/question answer.
 *
 * Handles:
 * - Base XP (correct/incorrect)
 * - First exercise of the day bonus
 * - New theme bonus
 * - Constance Royale (jour travaillé, semaine tenue, paliers)
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

	// Constance Royale : ce crédit compte-t-il le jour travaillé ?
	const reward = await rewardWorkedDay(studentId, buddy, xpResult.xp_gained);
	const finalResult = reward.bonusResult ?? xpResult;

	return {
		xpResult: {
			...finalResult,
			xp_gained: xpResult.xp_gained + reward.streakBonusXp
		},
		...constanceFields(reward),
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
 * Constance/first-of-day once for the whole test.
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

	// Constance Royale : ce crédit compte-t-il le jour travaillé ?
	const reward = await rewardWorkedDay(studentId, buddy, totalXpGained);
	if (reward.bonusResult) {
		totalXpGained += reward.bonusResult.xp_gained;
		lastXpResult = reward.bonusResult;
	}

	return {
		xpResult: {
			...lastXpResult,
			xp_gained: totalXpGained
		},
		...constanceFields(reward),
		isNewTheme: newThemes.size > 0
	};
}

/**
 * Forfait d'une séance de révision espacée TERMINÉE (décision de David,
 * 2026-10-18 : l'effort, pas la réussite — les cartes sont auto-évaluées).
 *
 * L'appelant a déjà établi que la séance est terminée et que le forfait du jour
 * n'a pas été donné (`rewardFinishedReviewSession`). Soumis au plafond du jour
 * (`add_buddy_xp`). Il compte le jour travaillé de la Constance Royale (sans
 * le +5 du premier travail du jour, réservé aux réponses).
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

	// Constance Royale : le forfait est du travail, il compte le jour
	const reward = await rewardWorkedDay(studentId, buddy, xpResult.xp_gained);
	const finalResult = reward.bonusResult ?? xpResult;

	return {
		xpResult: { ...finalResult, xp_gained: xpResult.xp_gained + reward.streakBonusXp },
		...constanceFields(reward),
		isNewTheme: false
	};
}
