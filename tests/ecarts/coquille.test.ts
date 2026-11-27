/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine coquille
 * (caches des tableaux de bord).
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

import { StudentDashboardCache } from '#lib/stores/studentDashboardCache.svelte.ts';
import { TeacherDashboardCache } from '#lib/stores/teacherDashboardCache.svelte.ts';

// Constantes
const MINUTE = 60 * 1000;
const T0 = Date.UTC(2026, 10, 27, 8, 0, 0);
const STUDENT = '11111111-1111-4111-8111-111111111111';
const CLASS_ID = '22222222-2222-4222-8222-222222222222';

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
