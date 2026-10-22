/**
 * Layout du tableau de bord élève : retour après une longue absence
 * ==================================================================
 *
 * Le layout LIT le retour à fêter (la présence est notée par le hook, sur toute
 * page) : un préchargement ne consomme rien. Seul « longue absence oui/non »
 * sort ; il reste faux sans Palotin (celui choisi ensuite est tout neuf) ou
 * quand la lecture échoue (docs/systeme/buddy-palotins.md).
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

import { load } from '../+layout.server';
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

// Functions
/** Client Supabase factice : chaque chaîne rend `{ data, error: null }` selon la table. */
function fakeSupabase(buddy: unknown) {
	const dataFor = (table: string): unknown => {
		if (table === 'student_buddies') return buddy;
		if (table === 'profiles') return { gidouilles: 0, bonus: 0, vip_cards: {} };
		return [];
	};
	const chain = (data: unknown): unknown =>
		new Proxy(
			{},
			{
				get(_target, prop) {
					if (prop === 'then') {
						return (resolve: (value: unknown) => void) => resolve({ data, error: null });
					}
					return () => chain(data);
				}
			}
		);
	return { from: (table: string) => chain(dataFor(table)) };
}

function event(buddy: unknown) {
	return {
		locals: {
			user: { id: STUDENT },
			profile: { id: STUDENT, role: 'student', email: 'e@local.test' },
			supabase: fakeSupabase(buddy)
		}
	} as unknown as Parameters<typeof load>[0];
}

async function run(buddy: unknown) {
	return (await load(event(buddy))) as { longAbsence: boolean };
}

beforeEach(() => {
	queries.isWelcomeBackPending.mockReset();
	queries.resetLostConstance.mockReset();
});

describe('layout élève — longue absence', () => {
	it('lit le retour à fêter avec l’identité de la session et le transmet', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const data = await run(BUDDY_ROW);
		expect(queries.isWelcomeBackPending).toHaveBeenCalledWith(STUDENT);
		expect(data.longAbsence).toBe(true);
	});

	it('sans Palotin : pas de longue absence', async () => {
		queries.isWelcomeBackPending.mockResolvedValue(true);
		const data = await run(null);
		expect(queries.isWelcomeBackPending).toHaveBeenCalledWith(STUDENT);
		expect(data.longAbsence).toBe(false);
	});

	it('lecture qui lève : le chargement aboutit, sans longue absence', async () => {
		queries.isWelcomeBackPending.mockRejectedValue(new Error('panne'));
		const data = await run(BUDDY_ROW);
		expect(data.longAbsence).toBe(false);
		expect(data).toHaveProperty('buddy.palotin_type', 'pile');
	});
});
