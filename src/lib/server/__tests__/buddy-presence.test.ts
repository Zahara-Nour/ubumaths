/**
 * Présence du Palotin : ce que lit le composant de présence après l'affichage
 * ============================================================================
 *
 * Reprend ce que faisait le layout de l'espace élève (chantier `palotins`) :
 * Constance perdue remise à zéro EN SILENCE (R1, 2026-11-12 : aucune réplique,
 * rien ne sort), retour après une pause LU seulement, fêté une fois que
 * l'élève a travaillé depuis (R2). Seul « oui/non » sort ; faux sans Palotin
 * ou quand une lecture secondaire échoue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queries = vi.hoisted(() => ({
	isWelcomeBackPending: vi.fn(),
	resetLostConstance: vi.fn()
}));
vi.mock('$lib/server/buddy-queries', () => queries);
const weeks = vi.hoisted(() => ({ loadWeekMoment: vi.fn() }));
vi.mock('$lib/server/buddy-weeks', () => weeks);
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

import { loadBuddyPresence } from '../buddy-presence';
import { utcDay, weekStartOf } from '$lib/utils/buddy-constance';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const BUDDY_ROW = {
	student_id: STUDENT,
	palotin_type: 'pile',
	xp: 100,
	level: 3,
	current_streak: 0,
	longest_streak: 0,
	last_activity_date: null,
	xp_earned_today: 0,
	last_xp_date: null,
	themes_explored: [],
	change_count: 0,
	equipped_skin_id: null,
	// Semaine en cours : rien à remettre à zéro
	constance_week_start: weekStartOf(utcDay()),
	constance_days_this_week: 1
};
/** Constance de 4 semaines dont la dernière semaine enregistrée est loin : perdue. */
const LOST_ROW = {
	...BUDDY_ROW,
	current_streak: 4,
	longest_streak: 4,
	constance_week_start: '2020-01-06',
	constance_days_this_week: 1
};

// Functions
/** Client Supabase factice : `from().select().eq().maybeSingle()` rend la ligne donnée. */
function fakeSupabase(row: unknown, error: unknown = null) {
	const chain: Record<string, unknown> = {};
	chain.select = () => chain;
	chain.eq = () => chain;
	chain.maybeSingle = () => Promise.resolve({ data: row, error });
	return { from: () => chain } as unknown as Parameters<typeof loadBuddyPresence>[0];
}

beforeEach(() => {
	queries.isWelcomeBackPending.mockReset();
	queries.resetLostConstance.mockReset();
	weeks.loadWeekMoment.mockReset();
	weeks.loadWeekMoment.mockResolvedValue(null);
});

describe('loadBuddyPresence — retour après une pause', () => {
	it('lit le retour avec l’identité donnée et le dernier jour travaillé, et le transmet', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const row = { ...BUDDY_ROW, last_activity_date: '2026-11-10' };
		const presence = await loadBuddyPresence(fakeSupabase(row), STUDENT);
		expect(queries.isWelcomeBackPending).toHaveBeenCalledWith(STUDENT, '2026-11-10');
		expect(presence.returnAfterPause).toBe(true);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('sans Palotin : rien à dire, aucune lecture secondaire', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const presence = await loadBuddyPresence(fakeSupabase(null), STUDENT);
		expect(presence).toEqual({ buddy: null, returnAfterPause: false, weekMoment: null });
		expect(weeks.loadWeekMoment).not.toHaveBeenCalled();
		expect(queries.isWelcomeBackPending).not.toHaveBeenCalled();
	});

	it('lecture du retour qui lève : le Palotin est rendu, sans retour', async () => {
		queries.isWelcomeBackPending.mockRejectedValue(new Error('panne'));
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(presence.returnAfterPause).toBe(false);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('ligne du Palotin illisible : lève (la route rend 500)', async () => {
		await expect(
			loadBuddyPresence(fakeSupabase(null, { code: 'XX000', message: 'panne' }), STUDENT)
		).rejects.toBeTruthy();
	});
});

describe('loadBuddyPresence — Constance perdue, remise à zéro en silence (R1)', () => {
	it('semaine manquée : remise à zéro écrite, ligne écrite rendue, rien d’autre ne sort', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockResolvedValue({
			kind: 'lost',
			buddy: { ...LOST_ROW, current_streak: 0 }
		});
		const presence = await loadBuddyPresence(fakeSupabase(LOST_ROW), STUDENT);
		expect(queries.resetLostConstance).toHaveBeenCalledWith(STUDENT);
		expect(presence.buddy?.current_streak).toBe(0);
		expect(Object.keys(presence).sort()).toEqual(['buddy', 'returnAfterPause', 'weekMoment']);
	});

	it('remise à zéro qui lève : le Palotin est rendu', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockRejectedValue(new Error('panne'));
		const presence = await loadBuddyPresence(fakeSupabase(LOST_ROW), STUDENT);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('Constance qui tient : aucune écriture', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(queries.resetLostConstance).not.toHaveBeenCalled();
	});
});

describe('loadBuddyPresence — semaine qui devient active (B2)', () => {
	it('transmet le moment de la semaine, lu pour l’élève de la session', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		weeks.loadWeekMoment.mockResolvedValue('active_weeks_3');
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(weeks.loadWeekMoment).toHaveBeenCalledWith(STUDENT);
		expect(presence.weekMoment).toBe('active_weeks_3');
	});

	it('un retour à fêter passe d’abord : pas de moment de la semaine (T4)', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		weeks.loadWeekMoment.mockResolvedValue('week_first_activity');
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(presence.returnAfterPause).toBe(true);
		expect(presence.weekMoment).toBeNull();
		expect(weeks.loadWeekMoment).not.toHaveBeenCalled();
	});

	it('lecture de la semaine qui lève : le Palotin est rendu, sans moment', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		weeks.loadWeekMoment.mockRejectedValue(new Error('panne'));
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(presence.weekMoment).toBeNull();
		expect(presence.buddy?.palotin_type).toBe('pile');
	});
});
