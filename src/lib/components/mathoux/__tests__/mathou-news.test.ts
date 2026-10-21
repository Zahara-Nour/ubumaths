/**
 * fetchMathouNews — demandée en fin de séance ; ne lève jamais : compte non
 * élève, panne ou réponse inattendue → `null` (les résultats restent affichés).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMathouNews } from '../mathou-news';
import { NO_NEWS, type MathouNews } from '$lib/mathoux/news';

const NEWS: MathouNews = {
	firstVisit: false,
	total: 1,
	items: [
		{
			kind: 'birth',
			notionId: 'n1',
			name: 'Pile-Poil',
			raceIndex: 0,
			stage: 'chaton',
			newStars: []
		}
	]
};

function stubFetch(body: unknown, ok = true) {
	const fetchMock = vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('fetchMathouNews', () => {
	it('rend les nouveautés du résumé de la Chatterie', async () => {
		const fetchMock = stubFetch({ born: 1, napping: 0, toDiscover: 0, news: NEWS });
		expect(await fetchMathouNews()).toEqual(NEWS);
		expect(fetchMock).toHaveBeenCalledWith('/api/student/mathoux');
	});

	it('rien de nouveau → null', async () => {
		stubFetch({ born: 1, napping: 0, toDiscover: 0, news: NO_NEWS });
		expect(await fetchMathouNews()).toBeNull();
	});

	it('compte non élève (403) → null', async () => {
		stubFetch({ message: 'Interdit' }, false);
		expect(await fetchMathouNews()).toBeNull();
	});

	it('réponse inattendue → null', async () => {
		stubFetch({ born: 1, napping: 0, toDiscover: 0, news: { total: 'beaucoup' } });
		expect(await fetchMathouNews()).toBeNull();
	});

	it('panne réseau → null, sans lever', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('hors ligne')));
		expect(await fetchMathouNews()).toBeNull();
	});
});
