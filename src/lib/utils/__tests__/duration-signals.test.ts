/**
 * Lecture des durées du panier (chantiers `durees-trop-courtes`, `durees-ajustees`) :
 * la forme `{ signals, observed }` passe ; tout le reste rend null (ni marque ni suggestion).
 */
import { describe, expect, it, vi } from 'vitest';
import { fetchDurationSignals } from '../duration-signals';

// Constantes
const T1 = '11111111-1111-4111-8111-111111111111';
const BODY = {
	signals: { [T1]: [{ delaySeconds: 20, students: 6, unansweredInTime: 4, tooShort: true }] },
	observed: { [T1]: { seconds: 35, students: 6 } }
};

// Functions
function fakeFetch(body: unknown, ok = true): typeof fetch {
	return vi.fn(async () => ({ ok, json: async () => body }) as Response);
}

describe('fetchDurationSignals', () => {
	it('rend signaux et durées observées', async () => {
		const fetchFn = fakeFetch(BODY);
		expect(await fetchDurationSignals([T1, T1], fetchFn)).toEqual(BODY);
		expect(vi.mocked(fetchFn).mock.calls[0][0]).toBe(
			`/api/series/duration-signals?templates=${T1}`
		);
	});

	it('aucun modèle : rien à lire', async () => {
		const fetchFn = fakeFetch(BODY);
		expect(await fetchDurationSignals([], fetchFn)).toEqual({ signals: {}, observed: {} });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it.each([
		['ancienne forme (signaux seuls)', BODY.signals],
		['durée observée sans secondes', { ...BODY, observed: { [T1]: { students: 6 } } }],
		['observed absent', { signals: BODY.signals }]
	])('%s : null', async (_, body) => {
		expect(await fetchDurationSignals([T1], fakeFetch(body))).toBeNull();
	});

	it('réponse en échec ou réseau coupé : null', async () => {
		expect(await fetchDurationSignals([T1], fakeFetch(BODY, false))).toBeNull();
		const broken = vi.fn(async () => {
			throw new Error('réseau');
		}) as unknown as typeof fetch;
		expect(await fetchDurationSignals([T1], broken)).toBeNull();
	});
});
