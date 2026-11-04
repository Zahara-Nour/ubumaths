/**
 * Catalogue Automaths : rangement des modèles et aperçus à la demande
 * ===================================================================
 *
 * Le catalogue se range dans le navigateur selon l'arbre des notions (branche →
 * notion → sous-notion, ordre de l'arbre, puis niveau) ; un aperçu n'est calculé que pour une rubrique
 * dépliée, une seule fois par modèle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';

const generateInstance = vi.fn((template: QuestionTemplate, _seed: number) =>
	template.id === 'casse'
		? { success: false as const, errors: ['variable inconnue'] }
		: { success: true as const, instance: { templateId: template.id } }
);

vi.mock('$lib/questions/generator/instance-generator', () => ({
	generateInstance: (template: QuestionTemplate, seed: number) => generateInstance(template, seed)
}));

const { buildCatalogue, templatePreview, clearPreviewCache } = await import('../catalogue');
type CatalogueNode = import('../catalogue').CatalogueNode;
const { PREVIEW_SEED } = await import('../cart-preview');

function modele(id: string, nodeId: string | null, level: number, title = id): QuestionTemplate {
	return { id, title, level, classification_node_id: nodeId } as unknown as QuestionTemplate;
}

function noeud(
	id: string,
	kind: 'branch' | 'notion' | 'subnotion',
	name: string,
	parentId: string | null,
	position: number
): CatalogueNode {
	return { id, kind, name, parent_id: parentId, position };
}

/** Arbre de test : positions volontairement contraires à l'ordre alphabétique */
const ARBRE: CatalogueNode[] = [
	noeud('b-nombres', 'branch', 'Nombres et calculs', null, 0),
	noeud('b-geo', 'branch', 'Géométrie', null, 1),
	noeud('b-vide', 'branch', 'Algorithmique', null, 2),
	noeud('n-entiers', 'notion', 'Entiers', 'b-nombres', 1),
	noeud('n-fractions', 'notion', 'Fractions', 'b-nombres', 0),
	noeud('n-aires', 'notion', 'Aires', 'b-geo', 0),
	noeud('n-vide', 'notion', 'Notion vide', 'b-nombres', 2),
	noeud('s-tables', 'subnotion', 'tables', 'n-entiers', 1),
	noeud('s-somme', 'subnotion', 'somme', 'n-entiers', 0),
	noeud('s-vide', 'subnotion', 'sous-notion vide', 'n-entiers', 2)
];

function noms(catalogue: ReturnType<typeof buildCatalogue>) {
	return catalogue.branches.map((b) => ({
		branche: b.name,
		notions: b.notions.map((n) => ({
			notion: n.name,
			rubriques: n.rubrics.map((r) => ({ nom: r.name, modeles: r.templates.map((t) => t.id) }))
		}))
	}));
}

describe('buildCatalogue', () => {
	it('range branche → notion → sous-notion, dans l’ordre de l’arbre, puis par niveau (10 après 2)', () => {
		const catalogue = buildCatalogue(
			[
				modele('t10', 's-tables', 10),
				modele('aire', 'n-aires', 1),
				modele('t2', 's-tables', 2),
				modele('s1', 's-somme', 1),
				modele('f1', 'n-fractions', 1)
			],
			ARBRE
		);

		expect(noms(catalogue)).toEqual([
			{
				branche: 'Nombres et calculs',
				notions: [
					{ notion: 'Fractions', rubriques: [{ nom: 'Général', modeles: ['f1'] }] },
					{
						notion: 'Entiers',
						rubriques: [
							{ nom: 'somme', modeles: ['s1'] },
							{ nom: 'tables', modeles: ['t2', 't10'] }
						]
					}
				]
			},
			{
				branche: 'Géométrie',
				notions: [{ notion: 'Aires', rubriques: [{ nom: 'Général', modeles: ['aire'] }] }]
			}
		]);
		expect(catalogue.unclassified).toEqual([]);
	});

	it('modèles posés sur la notion : rubrique « Général » en tête, avant les sous-notions', () => {
		const catalogue = buildCatalogue(
			[modele('t1', 's-tables', 1), modele('direct', 'n-entiers', 3)],
			ARBRE
		);

		expect(noms(catalogue)[0].notions[0].rubriques).toEqual([
			{ nom: 'Général', modeles: ['direct'] },
			{ nom: 'tables', modeles: ['t1'] }
		]);
	});

	it('branche, notion et sous-notion sans modèle publié n’apparaissent pas', () => {
		const catalogue = buildCatalogue([modele('t1', 's-tables', 1)], ARBRE);

		expect(catalogue.branches.map((b) => b.name)).toEqual(['Nombres et calculs']);
		expect(catalogue.branches[0].notions.map((n) => n.name)).toEqual(['Entiers']);
		expect(catalogue.branches[0].notions[0].rubrics.map((r) => r.name)).toEqual(['tables']);
	});

	it('même nœud, même niveau : par titre, pour un ordre stable', () => {
		const catalogue = buildCatalogue(
			[modele('z', 's-tables', 1, 'Tables de 9'), modele('a', 's-tables', 1, 'Tables de 2')],
			ARBRE
		);

		expect(catalogue.branches[0].notions[0].rubrics[0].templates.map((t) => t.id)).toEqual([
			'a',
			'z'
		]);
	});

	it('même position : par nom', () => {
		const catalogue = buildCatalogue(
			[modele('x', 'n-y', 1), modele('w', 'n-x', 1)],
			[
				noeud('b', 'branch', 'B', null, 0),
				noeud('n-y', 'notion', 'Yaourts', 'b', 0),
				noeud('n-x', 'notion', 'Xylophones', 'b', 0)
			]
		);

		expect(catalogue.branches[0].notions.map((n) => n.name)).toEqual(['Xylophones', 'Yaourts']);
	});

	it('nœud absent de l’arbre lu, ou posé sur une branche : « non classés », jamais perdu', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const catalogue = buildCatalogue(
			[
				modele('perdu', 'inconnu', 1),
				modele('sans', null, 1),
				modele('branche', 'b-geo', 1),
				modele('t1', 's-tables', 1)
			],
			ARBRE
		);

		expect(catalogue.unclassified.map((t) => t.id)).toEqual(['perdu', 'sans', 'branche']);
		expect(noms(catalogue)).toHaveLength(1);
	});

	it('sous-notion dont la notion manque : « non classés »', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const catalogue = buildCatalogue(
			[modele('orphelin', 's-orpheline', 1)],
			[noeud('s-orpheline', 'subnotion', 'orpheline', 'n-absente', 0)]
		);

		expect(catalogue.branches).toEqual([]);
		expect(catalogue.unclassified.map((t) => t.id)).toEqual(['orphelin']);
	});

	it('aucun modèle : catalogue vide', () => {
		expect(buildCatalogue([], ARBRE)).toEqual({ branches: [], unclassified: [] });
	});
});

describe('templatePreview', () => {
	beforeEach(() => {
		clearPreviewCache();
		generateInstance.mockClear();
	});

	it('calcule l’aperçu avec la graine du panier, une seule fois par modèle', () => {
		const m = modele('m1', 's-tables', 1);

		const premier = templatePreview(m);
		const second = templatePreview(m);

		expect(premier).toEqual({ templateId: 'm1' });
		expect(second).toBe(premier);
		expect(generateInstance).toHaveBeenCalledTimes(1);
		expect(generateInstance).toHaveBeenCalledWith(m, PREVIEW_SEED);
	});

	it('aperçu impossible : null, sans relancer le calcul ni lever d’erreur', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const m = modele('casse', 's-tables', 1);

		expect(templatePreview(m)).toBeNull();
		expect(templatePreview(m)).toBeNull();
		expect(generateInstance).toHaveBeenCalledTimes(1);
	});
});
