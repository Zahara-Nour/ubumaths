/**
 * Caches des tableaux de bord : une mise à jour optimiste fait repartir
 * l'échéance de la lecture (écart L44, corrigé).
 *
 * Avant : le gain gardait l'échéance de l'ancienne lecture, et disparaissait
 * du cache avec elle.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentDashboardCache } from '../studentDashboardCache.svelte.ts';
import { TeacherDashboardCache } from '../teacherDashboardCache.svelte.ts';

// Constantes
const MINUTE = 60 * 1000;
const T0 = Date.UTC(2026, 10, 27, 8, 0, 0);
const STUDENT = '11111111-1111-4111-8111-111111111111';
const CLASS_ID = '22222222-2222-4222-8222-222222222222';

describe('une mise à jour optimiste fait repartir l’échéance', () => {
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

	it('cache prof : le gain se lit encore 2 minutes plus tard', () => {
		const cache = new TeacherDashboardCache();
		cache.hydrateRewards(CLASS_ID, [{ id: STUDENT, gidouilles: 10, bonus: 0, vip_cards: {} }]);
		vi.setSystemTime(T0 + 9 * MINUTE);
		cache.updateGidouillesOptimistic(CLASS_ID, STUDENT, 5);
		vi.setSystemTime(T0 + 11 * MINUTE);
		expect(cache.getRewardsSync(CLASS_ID)?.get(STUDENT)?.gidouilles).toBe(15);
	});
});
