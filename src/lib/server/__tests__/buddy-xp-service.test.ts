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

const getStudentBuddy = vi.hoisted(() =>
	vi.fn<(supabase: unknown, studentId: string) => Promise<BuddyState | null>>()
);
const addBuddyXp = vi.hoisted(() =>
	vi.fn<(studentId: string, xp: number, isMilestone?: boolean) => Promise<BuddyXpGainResult>>()
);
const updateStreak = vi.hoisted(() => vi.fn());
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
	updateStreak,
	addExploredTheme,
	addExploredThemes,
	removeExploredThemes
}));

import { addBuddyXpFromTest, addBuddyXpFromReviewSession } from '../buddy-xp-service';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const THEME_1 = 'theme-1';
const THEME_2 = 'theme-2';
const TODAY = new Date().toISOString().split('T')[0];
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
		updateStreak.mockReset();
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

	it('série : écrite avec l’identité de la session seule (client service)', async () => {
		getStudentBuddy.mockResolvedValue(buddy({ last_activity_date: '2000-01-01' }));
		updateStreak.mockResolvedValue({ newStreak: 4, wasUpdated: true });
		await addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true }]);
		expect(updateStreak.mock.calls).toEqual([[STUDENT]]);
	});
});

describe('addBuddyXpFromReviewSession — forfait de révision', () => {
	beforeEach(() => {
		getStudentBuddy.mockReset().mockResolvedValue(buddy());
		addBuddyXp.mockReset().mockImplementation(async (_id, xp) => gain(xp));
		updateStreak.mockReset();
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
		// La série n'est pas touchée ici (refaite dans une PR suivante)
		expect(updateStreak).not.toHaveBeenCalled();
	});

	it('élève sans Palotin : rien', async () => {
		getStudentBuddy.mockResolvedValue(null);
		expect(await addBuddyXpFromReviewSession(supabase, STUDENT)).toBeNull();
		expect(addBuddyXp).not.toHaveBeenCalled();
	});
});
