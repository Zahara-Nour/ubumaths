/**
 * Présence du Palotin : ce que lit le composant de présence après l'affichage
 * ============================================================================
 *
 * Reprend ce que faisait le layout de l'espace élève (chantier `palotins`) :
 * Constance perdue remise à zéro, retour à fêter LU seulement (un préchargement
 * ne consomme rien, c'est le client qui acquitte). Seul « oui/non » sort ; faux
 * sans Palotin ou quand une lecture secondaire échoue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queries = vi.hoisted(() => ({
	isWelcomeBackPending: vi.fn(),
	resetLostConstance: vi.fn()
}));
vi.mock('$lib/server/buddy-queries', () => queries);
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
});

describe('loadBuddyPresence — retour après une longue absence', () => {
	it('lit le retour à fêter avec l’identité donnée et le transmet', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(queries.isWelcomeBackPending).toHaveBeenCalledWith(STUDENT);
		expect(presence.longAbsence).toBe(true);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('sans Palotin : rien à dire, aucune lecture secondaire', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const presence = await loadBuddyPresence(fakeSupabase(null), STUDENT);
		expect(presence).toEqual({ buddy: null, streakLost: false, longAbsence: false });
		expect(queries.isWelcomeBackPending).not.toHaveBeenCalled();
	});

	it('lecture du retour qui lève : le Palotin est rendu, sans longue absence', async () => {
		queries.isWelcomeBackPending.mockRejectedValue(new Error('panne'));
		const presence = await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(presence.longAbsence).toBe(false);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('ligne du Palotin illisible : lève (la route rend 500)', async () => {
		await expect(
			loadBuddyPresence(fakeSupabase(null, { code: 'XX000', message: 'panne' }), STUDENT)
		).rejects.toBeTruthy();
	});
});

describe('loadBuddyPresence — Constance perdue', () => {
	it('semaine manquée : remise à zéro écrite, réplique demandée, ligne écrite rendue', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockResolvedValue({
			kind: 'lost',
			buddy: { ...LOST_ROW, current_streak: 0 }
		});
		const presence = await loadBuddyPresence(fakeSupabase(LOST_ROW), STUDENT);
		expect(queries.resetLostConstance).toHaveBeenCalledWith(STUDENT);
		expect(presence.streakLost).toBe(true);
		expect(presence.buddy?.current_streak).toBe(0);
	});

	it('remise à zéro non écrite (conflit) : pas de réplique', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockResolvedValue(null);
		const presence = await loadBuddyPresence(fakeSupabase(LOST_ROW), STUDENT);
		expect(presence.streakLost).toBe(false);
	});

	it('remise à zéro qui lève : le Palotin est rendu, sans réplique', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockRejectedValue(new Error('panne'));
		const presence = await loadBuddyPresence(fakeSupabase(LOST_ROW), STUDENT);
		expect(presence.streakLost).toBe(false);
		expect(presence.buddy?.palotin_type).toBe('pile');
	});

	it('Constance qui tient : aucune écriture', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(false);
		await loadBuddyPresence(fakeSupabase(BUDDY_ROW), STUDENT);
		expect(queries.resetLostConstance).not.toHaveBeenCalled();
	});
});
