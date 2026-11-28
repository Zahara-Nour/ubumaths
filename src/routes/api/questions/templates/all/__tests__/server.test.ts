/**
 * GET /api/questions/templates/all — liste publique, gardée 5 min par Vercel
 * ==========================================================================
 *
 * La réponse est mise en cache par Vercel et servie à TOUS les visiteurs : elle
 * ne doit dépendre de personne. Elle est donc lue par un client anonyme, jamais
 * par la session de l'appelant ; un échec ne doit pas être mis en cache.
 *
 * Elle porte aussi l'arbre des notions (nœuds non archivés), qui range le
 * catalogue Automaths : même cache, une seule requête. Et le programme : les
 * points non archivés de tous les niveaux (vue « Programme ») et les ids des
 * points de chaque modèle publié (vue « Programme » et recherche).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const rows = [{ id: 'm1' }, { id: 'm2' }];
const nodes = [{ id: 'b1', kind: 'branch', name: 'Nombres', parent_id: null, position: 0 }];
const liens = [
	{ template_id: 'm1', point_id: 'p1' },
	{ template_id: 'm1', point_id: 'p2' },
	{ template_id: 'm2', point_id: 'p-archive' },
	// Modèle absent de la liste des publiés : son lien n'est jamais rendu
	{ template_id: 'brouillon', point_id: 'p1' }
];
const points = [
	{
		id: 'p1',
		name: 'Utiliser la double distributivité',
		grade: '3',
		rubrique: 'Nombres > Calcul littéral',
		display_order: 1,
		node_id: 'n1'
	},
	{
		id: 'p2',
		name: 'Réduire une expression',
		grade: '3',
		rubrique: 'Nombres > Calcul littéral',
		display_order: 2,
		node_id: 'n1'
	}
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
		not: (colonne: string, op: string, valeur: unknown) => (
			filtres.push([table, `not:${colonne}:${op}`, valeur]),
			query
		),
		order: (colonne: string) => (filtres.push([table, 'order', colonne]), query),
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
			points,
			templatePoints: { m1: ['p1', 'p2'] }
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

	it('porte le programme : points non archivés avec un niveau, colonnes de la vue seulement', async () => {
		const { event } = evenement();

		const reponse = await GET(event as never);

		expect(filtres).toContainEqual([
			'curriculum_points',
			'select',
			'id, name, grade, rubrique, display_order, node_id'
		]);
		expect(filtres).toContainEqual(['curriculum_points', 'is:archived_at', null]);
		expect(filtres).toContainEqual(['curriculum_points', 'not:grade:is', null]);
		const corps = (await reponse.json()) as { points: unknown[] };
		expect(corps.points).toEqual(points);
	});

	it('points de chaque modèle : liens vers un point archivé (absent de la lecture) écartés', async () => {
		const { event } = evenement();

		const reponse = await GET(event as never);

		expect(anonFrom).toHaveBeenCalledWith('question_template_points');
		const { templatePoints } = (await reponse.json()) as {
			templatePoints: Record<string, string[]>;
		};
		// m2 n'a qu'un point archivé : aucun lien
		expect(templatePoints).toEqual({ m1: ['p1', 'p2'] });
	});

	it('liens lus page par page dans un ordre stable (clé du lien : modèle puis point)', async () => {
		const { event } = evenement();

		await GET(event as never);

		const tris = filtres.filter(([t, op]) => t === 'question_template_points' && op === 'order');
		// Chaque page lue porte le même tri (`readAllRows` relit jusqu'à une page incomplète)
		expect(tris.length).toBeGreaterThan(0);
		for (let i = 0; i < tris.length; i += 2) {
			expect([tris[i][2], tris[i + 1]?.[2]]).toEqual(['template_id', 'point_id']);
		}
	});

	it('lien d’un modèle absent de la liste des publiés : jamais rendu', async () => {
		const { event } = evenement();

		const { templatePoints } = (await (await GET(event as never)).json()) as {
			templatePoints: Record<string, string[]>;
		};

		expect(Object.keys(templatePoints)).toEqual(['m1']);
	});

	it.each(['question_template_points', 'curriculum_points'])(
		'lecture de %s en échec : le catalogue reste servi, sans programme',
		async (table) => {
			tableEnEchec = table;
			vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { event } = evenement();

			const reponse = await GET(event as never);

			expect(await reponse.json()).toEqual({
				templates: rows,
				nodes,
				points: [],
				templatePoints: {}
			});
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

	it('gardée 5 min par Vercel seul, servie périmée pendant la relecture', async () => {
		const { setHeaders, event } = evenement();

		await GET(event as never);

		expect(setHeaders).toHaveBeenCalledTimes(1);
		const entetes = setHeaders.mock.calls[0][0] as Record<string, string>;
		expect(entetes['vercel-cdn-cache-control']).toBe('max-age=300, stale-while-revalidate=300');
	});

	it('le navigateur relit toujours (E85) : ni s-maxage ni stale-while-revalidate pour lui', async () => {
		const { setHeaders, event } = evenement();

		await GET(event as never);

		const entetes = setHeaders.mock.calls[0][0] as Record<string, string>;
		expect(entetes['cache-control']).toBe('public, max-age=0');
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
