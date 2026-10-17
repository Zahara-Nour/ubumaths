/**
 * Écart L30 : le badge Surveillance ne garde pas un nombre périmé quand son
 * rafraîchissement échoue. Échec → `null`, que la page affiche « ? » (comme L1
 * au chargement, #1139).
 */
import { describe, expect, it } from 'vitest';
import { fetchUnresolvedCount } from '../unresolved-count';

const CLASS_ID = '11111111-1111-1111-1111-111111111111';

function fakeFetch(response: Response | Error) {
	return async (url: string) => {
		expect(url).toBe(`/api/teacher/classes/${CLASS_ID}/anti-fraud/count`);
		if (response instanceof Error) throw response;
		return response;
	};
}

describe('fetchUnresolvedCount', () => {
	it('rend le nombre lu', async () => {
		const count = await fetchUnresolvedCount(
			CLASS_ID,
			fakeFetch(new Response(JSON.stringify({ count: 3 })))
		);
		expect(count).toBe(3);
	});

	it('rend 0 quand il n’y a aucun signalement', async () => {
		const count = await fetchUnresolvedCount(
			CLASS_ID,
			fakeFetch(new Response(JSON.stringify({ count: 0 })))
		);
		expect(count).toBe(0);
	});

	it('rend null sur une réponse en erreur', async () => {
		const count = await fetchUnresolvedCount(
			CLASS_ID,
			fakeFetch(new Response('{}', { status: 500 }))
		);
		expect(count).toBeNull();
	});

	it('rend null sur une panne réseau', async () => {
		const count = await fetchUnresolvedCount(CLASS_ID, fakeFetch(new TypeError('Failed to fetch')));
		expect(count).toBeNull();
	});

	it('rend null sur une réponse sans nombre', async () => {
		const count = await fetchUnresolvedCount(
			CLASS_ID,
			fakeFetch(new Response(JSON.stringify({ total: 3 })))
		);
		expect(count).toBeNull();
	});
});
