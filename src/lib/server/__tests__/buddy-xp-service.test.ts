/**
 * Gains du Palotin : bonus « nouveau thème » et forfait de révision
 * ==================================================================
 *
 * - Une séance d'Entraînement : le bonus « nouveau thème » est donné UNE fois
 *   par thème encore jamais exploré, et les thèmes sont enregistrés en une seule
 *   écriture (plus une écriture par réponse). Les thèmes sont RÉSERVÉS avant le
 *   crédit (écriture verrouillée, client service) : de deux envois simultanés,
 *   un seul touche le bonus ; un thème réservé mais non payé est retiré.
 * - Une séance de révision espacée terminée : un forfait (l'effort, pas la
 *   réussite : les cartes sont auto-évaluées), soumis au plafond du jour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyState, BuddyXpGainResult } from '$lib/types/buddy';
import { XP_SOURCES } from '$lib/utils/buddy-xp';
import type { WorkedDayResult } from '../buddy-queries';
import { weekStartOf } from '$lib/utils/buddy-constance';

const getStudentBuddy = vi.hoisted(() =>
	vi.fn<(supabase: unknown, studentId: string) => Promise<BuddyState | null>>()
);
const addBuddyXp = vi.hoisted(() =>
	vi.fn<(studentId: string, xp: number, isMilestone?: boolean) => Promise<BuddyXpGainResult>>()
);
const recordWorkedDay = vi.hoisted(() =>
	vi.fn<(studentId: string) => Promise<WorkedDayResult>>(async () => ({ status: 'already' }))
);
const addExploredTheme = vi.hoisted(() => vi.fn());
const addExploredThemes = vi.hoisted(() =>
	vi.fn<(studentId: string, themes: string[]) => Promise<Set<string>>>()
);
const removeExploredThemes = vi.hoisted(() =>
	vi.fn<(studentId: string, themes: string[]) => Promise<void>>()
);

vi.mock('../buddy-queries', () => ({
	getStudentBuddy,
	addBuddyXp,
	recordWorkedDay,
	addExploredTheme,
	addExploredThemes,
	removeExploredThemes
}));

import {
	addBuddyXpFromTest,
	addBuddyXpFromExercise,
	addBuddyXpFromReviewSession
} from '../buddy-xp-service';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const THEME_1 = 'theme-1';
const THEME_2 = 'theme-2';
const TODAY = new Date().toISOString().split('T')[0];
const WEEK = weekStartOf(TODAY);
const supabase = {} as SupabaseClient<Database>;

// Functions
function buddy(overrides: Partial<BuddyState> = {}): BuddyState {
	return {
		student_id: STUDENT,
		palotin_type: 'giron',
		xp: 40,
		level: 2,
		current_streak: 3,
		longest_streak: 3,
		// Déjà actif aujourd'hui : ni bonus du premier exercice, ni série
		last_activity_date: TODAY,
		xp_earned_today: 0,
		last_xp_date: TODAY,
		themes_explored: [],
		change_count: 0,
		equipped_skin_id: null,
		constance_week_start: WEEK,
		constance_days_this_week: 1,
		...overrides
	};
}

function gain(xp: number): BuddyXpGainResult {
	return {
		xp_gained: xp,
		new_xp: 40 + xp,
		new_level: 2,
		leveled_up: false,
		daily_cap_reached: false
	};
}

describe('addBuddyXpFromTest — bonus « nouveau thème »', () => {
	beforeEach(() => {
		getStudentBuddy.mockReset().mockResolvedValue(buddy({ themes_explored: [THEME_2] }));
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		addExploredTheme.mockReset();
		// Réservation acceptée : rend tous les thèmes demandés
		addExploredThemes.mockReset().mockImplementation(async (_id, themes) => new Set(themes));
		removeExploredThemes.mockReset().mockResolvedValue(undefined);
		recordWorkedDay.mockReset().mockResolvedValue({ status: 'already' });
	});

	it('un bonus par thème NOUVEAU, une fois, thème RÉSERVÉ avant le crédit', async () => {
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: THEME_2 },
			{ isCorrect: true }
		]);

		// 4 justes + 1 seul bonus (THEME_1 ; THEME_2 était déjà exploré)
		expect(addBuddyXp).toHaveBeenCalledTimes(1);
		expect(addBuddyXp.mock.calls[0][1]).toBe(4 * XP_SOURCES.correct + XP_SOURCES.new_theme);
		expect(result?.isNewTheme).toBe(true);

		// Identité de la session, une seule écriture, AVANT le crédit
		expect(addExploredThemes).toHaveBeenCalledTimes(1);
		expect(addExploredThemes.mock.calls[0]).toEqual([STUDENT, [THEME_1]]);
		expect(addExploredThemes.mock.invocationCallOrder[0]).toBeLessThan(
			addBuddyXp.mock.invocationCallOrder[0]
		);
		expect(removeExploredThemes).not.toHaveBeenCalled();
		expect(addExploredTheme).not.toHaveBeenCalled();
	});

	it('aucun thème dans la séance : aucune écriture de thème, aucun bonus', async () => {
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: false }]);

		expect(addExploredThemes).not.toHaveBeenCalled();
		expect(addBuddyXp.mock.calls[0][1]).toBe(XP_SOURCES.incorrect);
		expect(result?.isNewTheme).toBe(false);
	});

	it('bonus tronqué par le plafond (calcul local) : thème NON marqué, il restera nouveau', async () => {
		// 70 déjà gagnés : 10 + 25 = 35 > 30 restants
		getStudentBuddy.mockResolvedValue(buddy({ xp_earned_today: 70 }));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(30);
		expect(addExploredThemes).not.toHaveBeenCalled();
		expect(result?.isNewTheme).toBe(false);
	});

	it('crédit tronqué par la base : le thème réservé dont la réponse n’est pas couverte est retiré', async () => {
		// 35 + 35 demandés, 50 crédités : la 1re réponse (THEME_1) est payée, pas la 2de
		addBuddyXp.mockImplementation(async () => ({ ...gain(50), daily_cap_reached: true }));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: 'theme-3' }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(70);
		expect(addExploredThemes.mock.calls[0]).toEqual([STUDENT, [THEME_1, 'theme-3']]);
		expect(removeExploredThemes.mock.calls).toEqual([[STUDENT, ['theme-3']]]);
		expect(result?.isNewTheme).toBe(true);
	});

	it('crédit en échec : les thèmes réservés sont retirés, l’erreur remonte', async () => {
		addBuddyXp.mockRejectedValue(new Error('panne'));
		await expect(
			addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true, theme: THEME_1 }])
		).rejects.toThrow('panne');
		expect(removeExploredThemes.mock.calls).toEqual([[STUDENT, [THEME_1]]]);
	});

	it('thème non réservé (envoi simultané ou écriture refusée) : PAS de bonus payé', async () => {
		addExploredThemes.mockResolvedValue(new Set());
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(XP_SOURCES.correct);
		expect(result?.isNewTheme).toBe(false);
		expect(removeExploredThemes).not.toHaveBeenCalled();
	});

	it('réservation partielle : bonus pour le seul thème réservé par CET envoi', async () => {
		addExploredThemes.mockResolvedValue(new Set(['theme-3']));
		await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: 'theme-3' }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(2 * XP_SOURCES.correct + XP_SOURCES.new_theme);
		expect(removeExploredThemes).not.toHaveBeenCalled();
	});

	it('Constance : écrite avec l’identité de la session seule (client service)', async () => {
		getStudentBuddy.mockResolvedValue(buddy({ last_activity_date: '2000-01-01' }));
		await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(recordWorkedDay.mock.calls).toEqual([[STUDENT]]);
	});
});

describe('addBuddyXpFromTest — thème perdu au profit d’un envoi simultané', () => {
	beforeEach(() => {
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		addExploredThemes.mockReset();
		removeExploredThemes.mockReset().mockResolvedValue(undefined);
		recordWorkedDay.mockReset().mockResolvedValue({ status: 'already' });
	});

	it('second calcul : seul un thème RÉSERVÉ porte le bonus (un thème tronqué au 1er calcul ne le devient pas)', async () => {
		// 50 déjà gagnés (reste 50) : 1er calcul T1 = 35, T2 tronqué (70 > 50) → seul T1 candidat.
		// T1 perdu (réservé ailleurs) : sans bonus T1, T2 passerait sous le plafond (10 + 35 = 45),
		// payé sans être réservé, donc jamais écrit et repayé plus tard.
		getStudentBuddy.mockReset().mockResolvedValue(buddy({ xp_earned_today: 50 }));
		addExploredThemes.mockResolvedValue(new Set());
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: 'theme-3' }
		]);

		expect(addExploredThemes.mock.calls[0]).toEqual([STUDENT, [THEME_1]]);
		expect(addBuddyXp.mock.calls[0][1]).toBe(2 * XP_SOURCES.correct);
		expect(result?.isNewTheme).toBe(false);
	});
});

describe('addBuddyXpFromExercise — thème réservé mais non payé', () => {
	beforeEach(() => {
		getStudentBuddy.mockReset().mockResolvedValue(buddy());
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		addExploredTheme.mockReset().mockResolvedValue(true);
		removeExploredThemes.mockReset().mockResolvedValue(undefined);
		recordWorkedDay.mockReset().mockResolvedValue({ status: 'already' });
	});

	it('crédit entier : le thème reste marqué', async () => {
		const result = await addBuddyXpFromExercise(supabase, STUDENT, {
			isCorrect: true,
			theme: THEME_1
		});
		expect(addExploredTheme.mock.calls[0]).toEqual([STUDENT, THEME_1]);
		expect(addBuddyXp.mock.calls[0][1]).toBe(XP_SOURCES.correct + XP_SOURCES.new_theme);
		expect(removeExploredThemes).not.toHaveBeenCalled();
		expect(result?.isNewTheme).toBe(true);
	});

	it('crédit en échec : le thème réservé est retiré, l’erreur remonte', async () => {
		addBuddyXp.mockRejectedValue(new Error('panne'));
		await expect(
			addBuddyXpFromExercise(supabase, STUDENT, { isCorrect: true, theme: THEME_1 })
		).rejects.toThrow('panne');
		expect(removeExploredThemes.mock.calls).toEqual([[STUDENT, [THEME_1]]]);
	});

	it('crédit tronqué par la base : le thème réservé est retiré, pas annoncé nouveau', async () => {
		addBuddyXp.mockImplementation(async () => ({ ...gain(12), daily_cap_reached: true }));
		const result = await addBuddyXpFromExercise(supabase, STUDENT, {
			isCorrect: true,
			theme: THEME_1
		});
		expect(removeExploredThemes.mock.calls).toEqual([[STUDENT, [THEME_1]]]);
		expect(result?.isNewTheme).toBe(false);
	});

	it('bonus tronqué par le plafond (calcul local) : le thème réservé est retiré', async () => {
		getStudentBuddy.mockResolvedValue(buddy({ xp_earned_today: 70 }));
		await addBuddyXpFromExercise(supabase, STUDENT, { isCorrect: true, theme: THEME_1 });
		expect(removeExploredThemes.mock.calls).toEqual([[STUDENT, [THEME_1]]]);
	});
});

describe('addBuddyXpFromReviewSession — forfait de révision', () => {
	beforeEach(() => {
		getStudentBuddy.mockReset().mockResolvedValue(buddy());
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		recordWorkedDay.mockReset().mockResolvedValue({ status: 'already' });
	});

	it('le forfait vaut 20, soumis au plafond du jour (pas un palier)', () => {
		expect(XP_SOURCES.review_session).toBe(20);
	});

	it('crédite le forfait et rend la même forme que la séance d’Entraînement', async () => {
		const result = await addBuddyXpFromReviewSession(supabase, STUDENT);

		expect(addBuddyXp).toHaveBeenCalledWith(STUDENT, XP_SOURCES.review_session, false);
		expect(result).toEqual({
			xpResult: gain(XP_SOURCES.review_session),
			streakUpdated: false,
			newStreak: 3,
			streakBonusXp: 0,
			isNewTheme: false
		});
		// Jour déjà compté aujourd'hui (lu sur la ligne) : Constance non touchée
		expect(recordWorkedDay).not.toHaveBeenCalled();
	});

	it('élève sans Palotin : rien', async () => {
		getStudentBuddy.mockResolvedValue(null);
		expect(await addBuddyXpFromReviewSession(supabase, STUDENT)).toBeNull();
		expect(addBuddyXp).not.toHaveBeenCalled();
	});
});

/** Jour compté par `recordWorkedDay`. */
function counted(weekHeld: boolean, newStreak: number, days: number): WorkedDayResult {
	return {
		status: 'counted',
		weekHeld,
		newStreak,
		constanceWeekStart: WEEK,
		constanceDaysThisWeek: days
	};
}

describe('Constance Royale — un jour travaillé', () => {
	beforeEach(() => {
		// Premier travail du jour (hier déjà compté)
		getStudentBuddy.mockReset().mockResolvedValue(buddy({ last_activity_date: '2000-01-01' }));
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		addExploredTheme.mockReset().mockResolvedValue(false);
		addExploredThemes.mockReset().mockImplementation(async () => new Set());
		removeExploredThemes.mockReset().mockResolvedValue(undefined);
		recordWorkedDay.mockReset();
	});

	it('jour compté, semaine pas encore tenue : +5 du premier travail du jour, aucun bonus de série', async () => {
		recordWorkedDay.mockResolvedValue(counted(false, 2, 2));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);

		expect(addBuddyXp.mock.calls).toEqual([
			[STUDENT, XP_SOURCES.correct + XP_SOURCES.first_of_day, false]
		]);
		expect(result).toMatchObject({
			streakUpdated: true,
			newStreak: 2,
			streakBonusXp: 0,
			constanceWeekStart: WEEK,
			constanceDaysThisWeek: 2
		});
		expect(result?.xpResult.xp_gained).toBe(XP_SOURCES.correct + XP_SOURCES.first_of_day);
	});

	it('3e jour : semaine tenue, +30 dans le plafond du jour, dans le gain rendu', async () => {
		recordWorkedDay.mockResolvedValue(counted(true, 3, 3));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);

		expect(addBuddyXp.mock.calls[1]).toEqual([STUDENT, XP_SOURCES.week_held, false]);
		expect(result?.streakBonusXp).toBe(XP_SOURCES.week_held);
		expect(result?.xpResult.xp_gained).toBe(
			XP_SOURCES.correct + XP_SOURCES.first_of_day + XP_SOURCES.week_held
		);
	});

	it('4e semaine tenue : palier +50 hors plafond, à la place des +30', async () => {
		recordWorkedDay.mockResolvedValue(counted(true, 4, 3));
		await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(addBuddyXp.mock.calls[1]).toEqual([STUDENT, XP_SOURCES.constance_4, true]);
		expect(addBuddyXp).toHaveBeenCalledTimes(2);
	});

	it('aucune pansée gagnée (plafond du jour) : le jour n’est pas compté', async () => {
		addBuddyXp.mockImplementation(async () => ({ ...gain(0), daily_cap_reached: true }));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(recordWorkedDay).not.toHaveBeenCalled();
		expect(result?.streakUpdated).toBe(false);
	});

	it('jour déjà compté (lu sur la ligne) : aucune écriture de Constance', async () => {
		getStudentBuddy.mockResolvedValue(buddy());
		await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(recordWorkedDay).not.toHaveBeenCalled();
	});

	it('jour compté par un envoi simultané : rien d’annoncé, aucun bonus', async () => {
		recordWorkedDay.mockResolvedValue({ status: 'already' });
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(result).toMatchObject({ streakUpdated: false, newStreak: 3, streakBonusXp: 0 });
		expect(addBuddyXp).toHaveBeenCalledTimes(1);
	});

	it('énigme : une réponse qui rapporte compte le jour', async () => {
		recordWorkedDay.mockResolvedValue(counted(true, 1, 3));
		const result = await addBuddyXpFromExercise(supabase, STUDENT, { isCorrect: false });
		expect(recordWorkedDay.mock.calls).toEqual([[STUDENT]]);
		expect(addBuddyXp.mock.calls[1]).toEqual([STUDENT, XP_SOURCES.week_held, false]);
		expect(result?.xpResult.xp_gained).toBe(
			XP_SOURCES.incorrect + XP_SOURCES.first_of_day + XP_SOURCES.week_held
		);
	});

	it('forfait de révision : compte le jour, sans +5 du premier travail', async () => {
		recordWorkedDay.mockResolvedValue(counted(true, 2, 3));
		const result = await addBuddyXpFromReviewSession(supabase, STUDENT);
		expect(addBuddyXp.mock.calls).toEqual([
			[STUDENT, XP_SOURCES.review_session, false],
			[STUDENT, XP_SOURCES.week_held, false]
		]);
		expect(result).toMatchObject({ streakUpdated: true, newStreak: 2 });
		expect(result?.xpResult.xp_gained).toBe(XP_SOURCES.review_session + XP_SOURCES.week_held);
	});

	it('ancienne série en jours marquée aujourd’hui : le jour est tout de même compté', async () => {
		getStudentBuddy.mockResolvedValue(buddy({ constance_week_start: null }));
		recordWorkedDay.mockResolvedValue(counted(false, 0, 1));
		await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(recordWorkedDay.mock.calls).toEqual([[STUDENT]]);
	});
});

describe('Constance Royale — une panne après le crédit ne remonte pas', () => {
	beforeEach(() => {
		getStudentBuddy.mockReset().mockResolvedValue(buddy({ last_activity_date: '2000-01-01' }));
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		addExploredThemes.mockReset().mockImplementation(async () => new Set());
		removeExploredThemes.mockReset().mockResolvedValue(undefined);
		recordWorkedDay.mockReset();
	});

	it('forfait de révision : Constance en panne → gain du forfait rendu, sans exception (pas de relâche)', async () => {
		recordWorkedDay.mockRejectedValue(new Error('panne'));
		const result = await addBuddyXpFromReviewSession(supabase, STUDENT);
		expect(result).toMatchObject({ streakUpdated: false, streakBonusXp: 0 });
		expect(result?.xpResult.xp_gained).toBe(XP_SOURCES.review_session);
	});

	it('séance : +30 en panne après le jour compté → gain de base rendu, sans exception', async () => {
		recordWorkedDay.mockResolvedValue(counted(true, 1, 3));
		addBuddyXp
			.mockImplementationOnce(async (_id, xp) => gain(xp))
			.mockRejectedValueOnce(new Error('panne'));
		const result = await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(result?.xpResult.xp_gained).toBe(XP_SOURCES.correct + XP_SOURCES.first_of_day);
		expect(result?.streakBonusXp).toBe(0);
	});

	it('énigme : Constance en panne → gain de base rendu, sans exception', async () => {
		recordWorkedDay.mockRejectedValue(new Error('panne'));
		const result = await addBuddyXpFromExercise(supabase, STUDENT, { isCorrect: true });
		expect(result?.xpResult.xp_gained).toBe(XP_SOURCES.correct + XP_SOURCES.first_of_day);
	});
});
