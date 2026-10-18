/**
 * Gains du Palotin : bonus « nouveau thème » et forfait de révision
 * ==================================================================
 *
 * - Une séance d'Entraînement : le bonus « nouveau thème » est donné UNE fois
 *   par thème encore jamais exploré, et les thèmes sont enregistrés en une seule
 *   écriture (plus une écriture par réponse).
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
	vi.fn<(supabase: unknown, buddy: BuddyState, themes: string[]) => Promise<Set<string>>>()
);

vi.mock('../buddy-queries', () => ({
	getStudentBuddy,
	addBuddyXp,
	updateStreak,
	addExploredTheme,
	addExploredThemes
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
		addExploredThemes.mockReset().mockResolvedValue(new Set([THEME_1]));
		updateStreak.mockReset();
	});

	it('un bonus par thème NOUVEAU, une fois, thèmes écrits APRÈS le crédit, payés seulement', async () => {
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

		expect(addExploredThemes).toHaveBeenCalledTimes(1);
		expect(addExploredThemes.mock.calls[0][2]).toEqual([THEME_1]);
		// Crédit d'abord, écriture des thèmes ensuite
		expect(addExploredThemes.mock.invocationCallOrder[0]).toBeGreaterThan(
			addBuddyXp.mock.invocationCallOrder[0]
		);
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

	it('crédit tronqué par la base : seuls les thèmes dont la réponse est couverte sont marqués', async () => {
		// 35 + 35 demandés, 50 crédités : la 1re réponse (THEME_1) est payée, pas la 2de
		addBuddyXp.mockImplementation(async () => ({ ...gain(50), daily_cap_reached: true }));
		await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 },
			{ isCorrect: true, theme: 'theme-3' }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(70);
		expect(addExploredThemes.mock.calls[0][2]).toEqual([THEME_1]);
	});

	it('crédit en échec : aucun thème marqué', async () => {
		addBuddyXp.mockRejectedValue(new Error('panne'));
		await expect(
			addBuddyXpFromTest(supabase, STUDENT, [{ isCorrect: true, theme: THEME_1 }])
		).rejects.toThrow('panne');
		expect(addExploredThemes).not.toHaveBeenCalled();
	});

	it('thème payé mais non écrit (écriture refusée) : pas annoncé comme nouveau', async () => {
		addExploredThemes.mockResolvedValue(new Set());
		const result = await addBuddyXpFromTest(supabase, STUDENT, [
			{ isCorrect: true, theme: THEME_1 }
		]);

		expect(addBuddyXp.mock.calls[0][1]).toBe(XP_SOURCES.correct + XP_SOURCES.new_theme);
		expect(result?.isNewTheme).toBe(false);
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
