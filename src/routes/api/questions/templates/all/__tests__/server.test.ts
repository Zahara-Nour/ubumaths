/**
 * GET /api/questions/templates/all — liste publique, gardée 5 min par Vercel
 * ==========================================================================
 *
 * La réponse est mise en cache par Vercel et servie à TOUS les visiteurs : elle
 * ne doit dépendre de personne. Elle est donc lue par un client anonyme, jamais
 * par la session de l'appelant ; un échec ne doit pas être mis en cache.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const rows = [{ id: 'm1' }, { id: 'm2' }];
let lectureEnEchec = false;

const query = {
	select: () => query,
	eq: () => query,
	order: () => query,
	range: async (from: number, to: number) =>
		lectureEnEchec
			? { data: null, error: { message: 'base indisponible' } }
			: { data: rows.slice(from, to + 1), error: null }
};
const anonFrom = vi.fn(() => query);

vi.mock('$lib/server/anonymous-supabase', () => ({
	createAnonymousSupabase: () => ({ from: anonFrom })
}));

const { GET } = await import('../+server');

function evenement() {
	const sessionFrom = vi.fn(() => query);
	const setHeaders = vi.fn();
	return {
		sessionFrom,
		setHeaders,
		event: { locals: { supabase: { from: sessionFrom } }, setHeaders }
	};
}

describe('GET /api/questions/templates/all', () => {
	beforeEach(() => {
		lectureEnEchec = false;
		anonFrom.mockClear();
	});

	it('lit les modèles publiés avec un client anonyme, pas la session de l’appelant', async () => {
		const { sessionFrom, event } = evenement();

		const reponse = await GET(event as never);

		expect(anonFrom).toHaveBeenCalledWith('question_templates');
		expect(sessionFrom).not.toHaveBeenCalled();
		expect(await reponse.json()).toEqual({ templates: rows });
	});

	it('gardée 5 min par Vercel, servie périmée pendant la relecture', async () => {
		const { setHeaders, event } = evenement();

		await GET(event as never);

		expect(setHeaders).toHaveBeenCalledTimes(1);
		const entetes = setHeaders.mock.calls[0][0] as Record<string, string>;
		expect(entetes['cache-control']).toContain('s-maxage=300');
		expect(entetes['cache-control']).toContain('stale-while-revalidate');
	});

	it('lecture en échec : erreur 500, rien de mis en cache (pas de liste vide servie 5 min)', async () => {
		lectureEnEchec = true;
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { setHeaders, event } = evenement();

		const resultat = await Promise.resolve(GET(event as never)).catch((e: unknown) => e);

		expect(isHttpError(resultat) && resultat.status === 500).toBe(true);
		expect(setHeaders).not.toHaveBeenCalled();
	});
});
