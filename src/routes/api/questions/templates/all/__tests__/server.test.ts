/**
 * GET /api/questions/templates/all — liste publique, gardée 5 min par Vercel
 * ==========================================================================
 *
 * La réponse est mise en cache par Vercel et servie à TOUS les visiteurs : elle
 * ne doit dépendre de personne. Elle est donc lue par un client anonyme, jamais
 * par la session de l'appelant ; un échec ne doit pas être mis en cache.
 *
 * Elle porte aussi l'arbre des notions (nœuds non archivés), qui range le
 * catalogue Automaths : même cache, une seule requête. Et, pour la recherche du
 * catalogue, les intitulés des points du programme de chaque modèle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const rows = [{ id: 'm1' }, { id: 'm2' }];
const nodes = [{ id: 'b1', kind: 'branch', name: 'Nombres', parent_id: null, position: 0 }];
const liens = [
	{ template_id: 'm1', point_id: 'p1' },
	{ template_id: 'm1', point_id: 'p2' },
	{ template_id: 'm2', point_id: 'p-archive' }
];
const points = [
	{ id: 'p1', name: 'Utiliser la double distributivité' },
	{ id: 'p2', name: 'Réduire une expression' }
];
const lignesParTable: Record<string, unknown[]> = {
	classification_nodes: nodes,
	question_template_points: liens,
	curriculum_points: points
};
let tableEnEchec: string | null = null;
const filtres: Array<[string, string, unknown]> = [];

function requete(table: string, lignes: unknown[]) {
	const query = {
		select: (colonnes: string) => (filtres.push([table, 'select', colonnes]), query),
		eq: (colonne: string, valeur: unknown) => (
			filtres.push([table, `eq:${colonne}`, valeur]),
			query
		),
		is: (colonne: string, valeur: unknown) => (
			filtres.push([table, `is:${colonne}`, valeur]),
			query
		),
		order: () => query,
		range: async (from: number, to: number) =>
			tableEnEchec === table
				? { data: null, error: { message: 'base indisponible' } }
				: { data: lignes.slice(from, to + 1), error: null }
	};
	return query;
}
const anonFrom = vi.fn((table: string) => requete(table, lignesParTable[table] ?? rows));

vi.mock('#lib/server/anonymous-supabase.ts', () => ({
	createAnonymousSupabase: () => ({ from: anonFrom })
}));

const { GET } = await import('../+server');

function evenement() {
	const sessionFrom = vi.fn((table: string) => requete(table, []));
	const setHeaders = vi.fn();
	return {
		sessionFrom,
		setHeaders,
		event: { locals: { supabase: { from: sessionFrom } }, setHeaders }
	};
}

describe('GET /api/questions/templates/all', () => {
	beforeEach(() => {
		tableEnEchec = null;
		filtres.length = 0;
		anonFrom.mockClear();
	});

	it('lit les modèles publiés avec un client anonyme, pas la session de l’appelant', async () => {
		const { sessionFrom, event } = evenement();

		const reponse = await GET(event as never);

		expect(anonFrom).toHaveBeenCalledWith('question_templates');
		expect(sessionFrom).not.toHaveBeenCalled();
		expect(await reponse.json()).toEqual({
			templates: rows,
			nodes,
			pointNames: {
				m1: ['Utiliser la double distributivité', 'Réduire une expression']
			}
		});
	});

	it('porte l’arbre des notions : nœuds non archivés, colonnes du rangement seulement', async () => {
		const { event } = evenement();

		await GET(event as never);

		expect(anonFrom).toHaveBeenCalledWith('classification_nodes');
		expect(filtres).toContainEqual([
			'classification_nodes',
			'select',
			'id, kind, name, parent_id, position'
		]);
		expect(filtres).toContainEqual(['classification_nodes', 'is:archived_at', null]);
	});

	it('porte les intitulés des points de chaque modèle (recherche) : points archivés exclus', async () => {
		const { event } = evenement();

		const reponse = await GET(event as never);

		expect(anonFrom).toHaveBeenCalledWith('question_template_points');
		expect(filtres).toContainEqual(['curriculum_points', 'is:archived_at', null]);
		const { pointNames } = (await reponse.json()) as { pointNames: Record<string, string[]> };
		// m2 n'a qu'un point archivé : aucun intitulé
		expect(pointNames).toEqual({
			m1: ['Utiliser la double distributivité', 'Réduire une expression']
		});
	});

	it.each(['question_template_points', 'curriculum_points'])(
		'lecture de %s en échec : le catalogue reste servi, sans intitulés de points',
		async (table) => {
			tableEnEchec = table;
			vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { event } = evenement();

			const reponse = await GET(event as never);

			expect(await reponse.json()).toEqual({ templates: rows, nodes, pointNames: {} });
		}
	);

	it('ne lit pas les cas de test des modèles (`test_specs`) : inutiles à Automaths, 31 % du poids', async () => {
		const { event } = evenement();

		await GET(event as never);

		const selection = filtres.find(
			([table, op]) => table === 'question_templates' && op === 'select'
		);
		const colonnes = String(selection?.[2])
			.split(',')
			.map((c) => c.trim());
		expect(colonnes).not.toContain('*');
		expect(colonnes).not.toContain('test_specs');
		// Ce que lisent le catalogue, le panier et le test
		expect(colonnes).toEqual(
			expect.arrayContaining([
				'id',
				'title',
				'variations',
				'shared',
				'options',
				'default_display_options',
				'exercise_instruction',
				'classification_node_id'
			])
		);
	});

	it('gardée 5 min par Vercel, servie périmée pendant la relecture', async () => {
		const { setHeaders, event } = evenement();

		await GET(event as never);

		expect(setHeaders).toHaveBeenCalledTimes(1);
		const entetes = setHeaders.mock.calls[0][0] as Record<string, string>;
		expect(entetes['cache-control']).toContain('s-maxage=300');
		expect(entetes['cache-control']).toContain('stale-while-revalidate');
	});

	it.each(['question_templates', 'classification_nodes'])(
		'lecture de %s en échec : erreur 500, rien de mis en cache (pas de liste vide servie 5 min)',
		async (table) => {
			tableEnEchec = table;
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { setHeaders, event } = evenement();

			const resultat = await Promise.resolve(GET(event as never)).catch((e: unknown) => e);

			expect(isHttpError(resultat) && resultat.status === 500).toBe(true);
			expect(setHeaders).not.toHaveBeenCalled();
		}
	);
});
