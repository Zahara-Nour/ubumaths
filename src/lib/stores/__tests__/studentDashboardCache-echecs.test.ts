/**
 * Cache élève : un échec réseau n'est jamais mis en cache (écart L34).
 *
 * Un échec rend la dernière valeur connue (même expirée) ou la valeur vide,
 * sans écrire le cache ; l'accès suivant refait la lecture. Une réponse
 * réussie mais vide (0 gidouille) est stockée normalement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StudentDashboardCache } from '../studentDashboardCache.svelte';
const originalFetch = global.fetch;

function okFetch(body: object) {
	return vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response));
}
const failingFetch = () => vi.fn(() => Promise.reject(new Error('Network error')));

let now = Date.now();
function setNow(t: number) {
	now = t;
	vi.spyOn(Date, 'now').mockReturnValue(now);
}

describe('StudentDashboardCache : échec réseau jamais stocké', () => {
	let cache: StudentDashboardCache;

	beforeEach(() => {
		cache = new StudentDashboardCache();
		setNow(Date.now());
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("récompenses : un échec rend 0 sans stocker, l'accès suivant relit", async () => {
		global.fetch = failingFetch();
		expect((await cache.getRewards()).gidouilles).toBe(0);
		expect(cache.getRewardsSync()).toBeNull();

		global.fetch = okFetch({ rewards: { gidouilles: 12, bonus: 0, vip_cards: {} } });
		expect((await cache.getRewards()).gidouilles).toBe(12);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("avertissements : un échec n'est pas stocké, l'accès suivant relit", async () => {
		global.fetch = failingFetch();
		expect((await cache.getWarnings('p1')).warnings).toEqual([]);
		expect(cache.getWarningsSync('p1')).toBeNull();

		const warnings = { counts: { C: 1, M: 0, R: 0, T: 0 }, warnings: [] };
		global.fetch = okFetch({ warnings });
		expect(await cache.getWarnings('p1')).toEqual(warnings);
	});

	it("échec après expiration : l'ancienne valeur est rendue, l'horodatage n'est pas rafraîchi", async () => {
		global.fetch = okFetch({ rewards: { gidouilles: 5, bonus: 1, vip_cards: {} } });
		await cache.getRewards();

		setNow(now + 11 * 60 * 1000); // TTL de 10 min dépassé
		global.fetch = failingFetch();
		expect((await cache.getRewards()).gidouilles).toBe(5);
		// L'écran garde la dernière valeur connue (écart L43), l'entrée reste expirée
		expect(cache.getRewardsSync()?.gidouilles).toBe(5);

		await cache.getRewards();
		expect(global.fetch).toHaveBeenCalledTimes(2); // relit à chaque accès
	});

	it('réponse réussie à 0 gidouille : stockée normalement', async () => {
		global.fetch = okFetch({ rewards: { gidouilles: 0, bonus: 0, vip_cards: {} } });
		await cache.getRewards();
		expect(cache.getRewardsSync()).toEqual({ gidouilles: 0, bonus: 0, vip_cards: {} });

		await cache.getRewards();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});
});
