/**
 * Cache élève : une donnée arrivée à échéance est relue toute seule (écart L43).
 *
 * Comportement suivi par David le 2026-11-28 :
 * - à l'échéance (10 min), le cache relit les récompenses et les avertissements
 *   déjà lus ;
 * - l'écran garde l'ancienne valeur jusqu'à l'arrivée de la nouvelle, jamais rien ;
 * - un onglet caché ne relit pas : il relit quand l'élève revient dessus.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { StudentDashboardCache } from '../studentDashboardCache.svelte.ts';
import type { StudentRewards, StudentWarnings } from '#lib/types/student-cache.ts';

vi.mock('$app/env', () => ({ browser: true, building: false, dev: true, version: '1' }));

// Constantes
const MINUTE = 60 * 1000;
const AVANT: StudentRewards = { gidouilles: 10, bonus: 0, vip_cards: {} };
const APRES: StudentRewards = { gidouilles: 15, bonus: 0, vip_cards: {} };
const AVERTISSEMENTS: StudentWarnings = { counts: { C: 1, M: 0, R: 0, T: 0 }, warnings: [] };
const originalFetch = globalThis.fetch;

// Functions
function reponse(body: object): Response {
	return { ok: true, json: () => Promise.resolve(body) } as Response;
}

/** Simule un onglet caché ou visible, et prévient le cache comme le navigateur. */
function onglet(etat: 'hidden' | 'visible') {
	Object.defineProperty(document, 'visibilityState', { value: etat, configurable: true });
	document.dispatchEvent(new Event('visibilitychange'));
}

/** Laisse passer la lecture simulée (promesses) puis met l'écran à jour. */
async function laisserLire() {
	await vi.advanceTimersByTimeAsync(0);
	flushSync();
}

describe('cache élève : relecture à l’échéance', () => {
	let cache: StudentDashboardCache;
	let vu: StudentRewards | null | undefined;
	let stop: () => void;

	// Un écran qui lit les récompenses par `getRewardsSync`, comme un `$derived`.
	beforeEach(() => {
		vi.useFakeTimers();
		onglet('visible');
		globalThis.fetch = vi.fn(() => Promise.resolve(reponse({ rewards: APRES })));
		cache = new StudentDashboardCache();
		cache.hydrateRewards(AVANT);
		stop = $effect.root(() => {
			$effect(() => {
				vu = cache.getRewardsSync();
			});
		});
		flushSync();
	});
	afterEach(() => {
		stop();
		cache.destroy();
		globalThis.fetch = originalFetch;
		vi.useRealTimers();
	});

	it('témoin : avant l’échéance, rien n’est relu', async () => {
		await vi.advanceTimersByTimeAsync(9 * MINUTE);
		expect(globalThis.fetch).not.toHaveBeenCalled();
		expect(vu?.gidouilles).toBe(10);
	});

	it('écart L43 : à l’échéance, les récompenses sont relues et l’écran les montre', async () => {
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		await laisserLire();
		expect(globalThis.fetch).toHaveBeenCalledWith('/api/student/rewards');
		expect(vu?.gidouilles).toBe(15);
	});

	it('pendant la relecture, l’écran garde l’ancienne valeur (jamais rien)', async () => {
		globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})); // ne répond jamais
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		flushSync();
		expect(vu?.gidouilles).toBe(10);
	});

	it('relecture en échec : l’écran garde l’ancienne valeur', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		await laisserLire();
		expect(vu?.gidouilles).toBe(10);
	});

	it('onglet caché : pas de relecture, puis relecture au retour sur l’onglet', async () => {
		onglet('hidden');
		await vi.advanceTimersByTimeAsync(15 * MINUTE);
		expect(globalThis.fetch).not.toHaveBeenCalled();

		onglet('visible');
		await laisserLire();
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		expect(vu?.gidouilles).toBe(15);
	});

	it('la relecture repart pour 10 minutes', async () => {
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		await laisserLire();
		await vi.advanceTimersByTimeAsync(9 * MINUTE);
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1 * MINUTE);
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it('avertissements déjà lus : relus à l’échéance, période comprise', async () => {
		cache.hydrateWarnings('p1', AVERTISSEMENTS);
		globalThis.fetch = vi.fn((url: string) =>
			Promise.resolve(
				url.startsWith('/api/student/warnings/')
					? reponse({ warnings: { ...AVERTISSEMENTS, counts: { C: 2, M: 0, R: 0, T: 0 } } })
					: reponse({ rewards: APRES })
			)
		) as typeof fetch;
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		await laisserLire();
		expect(globalThis.fetch).toHaveBeenCalledWith('/api/student/warnings/p1');
		expect(cache.getWarningsSync('p1')?.counts.C).toBe(2);
	});
});
