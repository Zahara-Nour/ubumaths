/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine coquille
 * (caches des tableaux de bord, présence du Palotin).
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L44`.
 *
 * Les écarts de la coquille qui demandent un navigateur (L41, L43, L45, L52) ne
 * sont pas ici : ils sont en `it.fails` dans
 * `src/lib/components/__tests__/ecarts-coquille.svelte.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
	isWelcomeBackPending: vi.fn(),
	resetLostConstance: vi.fn()
}));
vi.mock('#lib/server/buddy-queries.ts', () => queries);
const weeks = vi.hoisted(() => ({ loadWeekMoment: vi.fn() }));
vi.mock('#lib/server/buddy-weeks.ts', () => weeks);

import { StudentDashboardCache } from '#lib/stores/studentDashboardCache.svelte.ts';
import { TeacherDashboardCache } from '#lib/stores/teacherDashboardCache.svelte.ts';
import { loadBuddyPresence } from '#lib/server/buddy-presence.ts';
import { utcDay, weekStartOf } from '#lib/utils/buddy-constance.ts';

// Constantes
const MINUTE = 60 * 1000;
const T0 = Date.UTC(2026, 10, 27, 8, 0, 0);
const STUDENT = '11111111-1111-4111-8111-111111111111';
const CLASS_ID = '22222222-2222-4222-8222-222222222222';
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
/**
 * Client Supabase factice : `from().select().eq().maybeSingle()` rend la ligne donnée,
 * et toute écriture tentée par ce client (`update`, `insert`, `upsert`, `delete`, `rpc`)
 * est notée dans `writes`.
 */
function fakeSupabase(row: unknown) {
	const writes: string[] = [];
	const chain: Record<string, unknown> = {};
	chain.select = () => chain;
	chain.eq = () => chain;
	chain.maybeSingle = () => Promise.resolve({ data: row, error: null });
	for (const verb of ['update', 'insert', 'upsert', 'delete']) {
		chain[verb] = () => {
			writes.push(verb);
			return chain;
		};
	}
	const client = {
		from: () => chain,
		rpc: (name: string) => {
			writes.push(`rpc ${name}`);
			return Promise.resolve({ data: null, error: null });
		}
	} as unknown as Parameters<typeof loadBuddyPresence>[0];
	return { client, writes };
}

describe('L44 — une mise à jour optimiste garde l’échéance de l’ancienne lecture', () => {
	// Lecture à T0 (échéance T0 + 10 min), gain de gidouilles à T0 + 9 min, puis
	// lecture à T0 + 11 min : le gain a 2 minutes, il doit encore être là.
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('témoin : cache élève, le gain se lit juste après la mise à jour', () => {
		const cache = new StudentDashboardCache();
		cache.hydrateRewards({ gidouilles: 10, bonus: 0, vip_cards: {} });
		vi.setSystemTime(T0 + 9 * MINUTE);
		cache.updateGidouillesOptimistic(5);
		expect(cache.getRewardsSync()?.gidouilles).toBe(15);
	});

	// Aujourd'hui : null (le cache a expiré à T0 + 10 min, le gain avec lui).
	it('cache élève : le gain se lit encore 2 minutes plus tard', () => {
		const cache = new StudentDashboardCache();
		cache.hydrateRewards({ gidouilles: 10, bonus: 0, vip_cards: {} });
		vi.setSystemTime(T0 + 9 * MINUTE);
		cache.updateGidouillesOptimistic(5);
		vi.setSystemTime(T0 + 11 * MINUTE);
		expect(cache.getRewardsSync()?.gidouilles).toBe(15);
	});

	it('témoin : cache prof, le gain se lit juste après la mise à jour', () => {
		const cache = new TeacherDashboardCache();
		cache.hydrateRewards(CLASS_ID, [{ id: STUDENT, gidouilles: 10, bonus: 0, vip_cards: {} }]);
		vi.setSystemTime(T0 + 9 * MINUTE);
		cache.updateGidouillesOptimistic(CLASS_ID, STUDENT, 5);
		expect(cache.getRewardsSync(CLASS_ID)?.get(STUDENT)?.gidouilles).toBe(15);
	});

	// Aujourd'hui : null, comme pour l'élève.
	it('cache prof : le gain se lit encore 2 minutes plus tard', () => {
		const cache = new TeacherDashboardCache();
		cache.hydrateRewards(CLASS_ID, [{ id: STUDENT, gidouilles: 10, bonus: 0, vip_cards: {} }]);
		vi.setSystemTime(T0 + 9 * MINUTE);
		cache.updateGidouillesOptimistic(CLASS_ID, STUDENT, 5);
		vi.setSystemTime(T0 + 11 * MINUTE);
		expect(cache.getRewardsSync(CLASS_ID)?.get(STUDENT)?.gidouilles).toBe(15);
	});
});

describe('L49 — la lecture de la présence du Palotin écrit en base', () => {
	beforeEach(() => {
		queries.isWelcomeBackPending.mockReset();
		queries.isWelcomeBackPending.mockResolvedValue(false);
		queries.resetLostConstance.mockReset();
		queries.resetLostConstance.mockResolvedValue(null);
		weeks.loadWeekMoment.mockReset();
		weeks.loadWeekMoment.mockResolvedValue(null);
	});

	it('témoin : Constance en cours, la lecture rend le Palotin sans rien écrire', async () => {
		const { client, writes } = fakeSupabase(BUDDY_ROW);
		const presence = await loadBuddyPresence(client, STUDENT);
		expect(presence.buddy?.palotin_type).toBe('pile');
		expect(queries.resetLostConstance).not.toHaveBeenCalled();
		expect(writes).toEqual([]);
	});

	// Aujourd'hui : `resetLostConstance` (une écriture, par le client service) est
	// appelée par cette lecture, que lance un simple GET de présence. Le test ne dit
	// rien de la valeur rendue (Constance à 0 ou non) : seulement qu'on n'écrit pas.
	// ⚠️ Une écriture déplacée dans un autre module, par le client service, ne serait
	// pas vue ici : à la correction, relire `buddy-presence.ts` avant de fermer la ligne.
	it('Constance perdue : la lecture rend le Palotin sans rien écrire', async () => {
		const { client, writes } = fakeSupabase(LOST_ROW);
		const presence = await loadBuddyPresence(client, STUDENT);
		expect(presence.buddy?.palotin_type).toBe('pile');
		expect(queries.resetLostConstance).not.toHaveBeenCalled();
		expect(writes).toEqual([]);
	});
});
