/**
 * Carte du programme : l'arbre COMPLET (branche > notion > sous-notion), avec
 * les points d'un niveau en feuilles.
 *
 * Comportements validés par David (2026-10-23) :
 *   1. tout l'arbre apparaît, même les nœuds sans point du niveau (grisés à
 *      l'écran) ; ordre de l'arbre (`position`, puis nom), points dans l'ordre
 *      du BO (`display_order`, puis code) ;
 *   2. un point posé sur une notion est une feuille de la notion, un point posé
 *      sur une sous-notion une feuille de la sous-notion ;
 *   3. compteurs attendus / approfondissements sur chaque nœud, descendants
 *      compris ;
 *   4. points archivés masqués ; nœud archivé montré seulement s'il porte
 *      encore un point du niveau ;
 *   5. « Masquer les nœuds vides » retire les nœuds sans point ;
 *   6. nœud visé introuvable ou point posé sur une branche → erreur, jamais
 *      d'arbre amputé en silence.
 */

import { describe, it, expect } from 'vitest';
import {
	BRANCH_COLORS,
	branchColor,
	buildProgrammeMap,
	countsLabel,
	defaultOpenIds,
	pointHolderIds,
	hideEmptyNodes,
	isEmptyNode,
	linkPath,
	type MapPointRow
} from '../programme-map';
import type { ClassificationNode } from '$lib/types/database-helpers';

const STAMP = '2026-10-23T00:00:00Z';

function node(
	id: string,
	kind: ClassificationNode['kind'],
	name: string,
	parent_id: string | null,
	position = 0,
	archived_at: string | null = null
): ClassificationNode {
	return { id, kind, name, parent_id, position, archived_at, created_at: STAMP, updated_at: STAMP };
}

function point(
	id: string,
	node_id: string,
	display_order: number,
	extra: Partial<MapPointRow> = {}
): MapPointRow {
	return {
		id,
		code: `2-${id}`,
		name: `Point ${id}`,
		display_order,
		archived_at: null,
		node_id,
		grade: '2',
		exigence: 'attendu',
		...extra
	};
}

const NODES: ClassificationNode[] = [
	node('b-fo', 'branch', 'Fonctions', null, 2),
	node('b-al', 'branch', 'Algèbre', null, 1),
	node('n-ref', 'notion', 'Fonctions de référence', 'b-fo', 0),
	node('n-var', 'notion', 'Variations', 'b-fo', 1),
	node('s-carre', 'subnotion', 'fonction carré', 'n-ref', 0),
	node('s-inv', 'subnotion', 'fonction inverse', 'n-ref', 1),
	node('n-eq', 'notion', 'Équations', 'b-al', 0)
];

describe('buildProgrammeMap — arbre complet', () => {
	it('montre toutes les branches, notions et sous-notions, dans l’ordre de l’arbre', () => {
		const map = buildProgrammeMap([point('1', 's-carre', 1)], NODES);

		expect(map.map((b) => b.name)).toEqual(['Algèbre', 'Fonctions']);
		const fo = map[1];
		expect(fo.notions.map((n) => n.name)).toEqual(['Fonctions de référence', 'Variations']);
		expect(fo.notions[0].subnotions.map((s) => s.name)).toEqual([
			'fonction carré',
			'fonction inverse'
		]);
		// Sans point : présents quand même.
		expect(map[0].notions.map((n) => n.name)).toEqual(['Équations']);
	});

	it('à position égale, range par nom', () => {
		const nodes = [
			node('b', 'branch', 'B', null),
			node('n2', 'notion', 'Zèbre', 'b', 0),
			node('n1', 'notion', 'Abaque', 'b', 0)
		];
		expect(buildProgrammeMap([], nodes)[0].notions.map((n) => n.name)).toEqual(['Abaque', 'Zèbre']);
	});

	it('pose un point sur sa notion ou sur sa sous-notion, dans l’ordre du BO', () => {
		const map = buildProgrammeMap(
			[
				point('3', 's-carre', 2),
				point('1', 'n-ref', 5),
				point('2', 's-carre', 1),
				point('4', 'n-ref', 5, { code: '2-000' })
			],
			NODES
		);
		const ref = map[1].notions[0];
		expect(ref.points.map((p) => p.code)).toEqual(['2-000', '2-1']);
		expect(ref.subnotions[0].points.map((p) => p.code)).toEqual(['2-2', '2-3']);
		expect(ref.subnotions[1].points).toEqual([]);
	});

	it('garde l’exigence de chaque point', () => {
		const map = buildProgrammeMap(
			[point('1', 's-carre', 1, { exigence: 'approfondissement' })],
			NODES
		);
		expect(map[1].notions[0].subnotions[0].points[0]).toMatchObject({
			id: '1',
			code: '2-1',
			name: 'Point 1',
			exigence: 'approfondissement'
		});
	});
});

describe('buildProgrammeMap — compteurs', () => {
	it('compte attendus et approfondissements, descendants compris', () => {
		const map = buildProgrammeMap(
			[
				point('1', 's-carre', 1),
				point('2', 's-carre', 2, { exigence: 'approfondissement' }),
				point('3', 's-inv', 3),
				point('4', 'n-ref', 4)
			],
			NODES
		);
		const fo = map[1];
		expect(fo.counts).toEqual({ attendus: 3, approfondissements: 1 });
		expect(fo.notions[0].counts).toEqual({ attendus: 3, approfondissements: 1 });
		expect(fo.notions[0].subnotions[0].counts).toEqual({ attendus: 1, approfondissements: 1 });
		expect(fo.notions[1].counts).toEqual({ attendus: 0, approfondissements: 0 });
		expect(map[0].counts).toEqual({ attendus: 0, approfondissements: 0 });
	});

	it('niveau sans point : arbre entier, tous les compteurs à zéro', () => {
		const map = buildProgrammeMap([], NODES);
		expect(map).toHaveLength(2);
		expect(map.every(isEmptyNode)).toBe(true);
	});
});

describe('buildProgrammeMap — archivés', () => {
	it('masque les points archivés (et ne les compte pas)', () => {
		const map = buildProgrammeMap(
			[point('1', 's-carre', 1), point('2', 's-carre', 2, { archived_at: STAMP })],
			NODES
		);
		const carre = map[1].notions[0].subnotions[0];
		expect(carre.points.map((p) => p.id)).toEqual(['1']);
		expect(carre.counts.attendus).toBe(1);
	});

	it('montre un nœud archivé qui porte un point du niveau, marqué archivé', () => {
		const nodes = [...NODES, node('s-old', 'subnotion', 'ancienne', 'n-ref', 9, STAMP)];
		const map = buildProgrammeMap([point('1', 's-old', 1)], nodes);
		const old = map[1].notions[0].subnotions.find((s) => s.id === 's-old');
		expect(old).toMatchObject({ archived: true, counts: { attendus: 1, approfondissements: 0 } });
	});

	it('cache un nœud archivé sans point du niveau, et tout ce qu’il contient', () => {
		const nodes = [
			...NODES,
			node('n-old', 'notion', 'Ancienne notion', 'b-fo', 9, STAMP),
			node('s-sous', 'subnotion', 'sous active', 'n-old', 0)
		];
		const map = buildProgrammeMap([], nodes);
		expect(map[1].notions.map((n) => n.id)).not.toContain('n-old');
	});

	it('une notion archivée reste quand une de ses sous-notions porte un point', () => {
		const nodes = [
			...NODES,
			node('n-old', 'notion', 'Ancienne notion', 'b-fo', 9, STAMP),
			node('s-sous', 'subnotion', 'sous active', 'n-old', 0)
		];
		const map = buildProgrammeMap([point('1', 's-sous', 1)], nodes);
		expect(map[1].notions.find((n) => n.id === 'n-old')).toMatchObject({ archived: true });
	});
});

describe('buildProgrammeMap — erreurs', () => {
	it('lève une erreur si le nœud d’un point est introuvable', () => {
		expect(() => buildProgrammeMap([point('1', 'fantome', 1)], NODES)).toThrow(/2-1/);
	});

	it('lève une erreur si un point est posé sur une branche', () => {
		expect(() => buildProgrammeMap([point('1', 'b-fo', 1)], NODES)).toThrow(/branche/);
	});

	it('lève une erreur si une exigence est inconnue', () => {
		expect(() =>
			buildProgrammeMap([point('1', 's-carre', 1, { exigence: 'facultatif' })], NODES)
		).toThrow(/exigence/);
	});

	it('ignore un point sans niveau', () => {
		const map = buildProgrammeMap([point('1', 's-carre', 1, { grade: null })], NODES);
		expect(map[1].counts.attendus).toBe(0);
	});
});

describe('hideEmptyNodes', () => {
	it('retire branches, notions et sous-notions sans point, garde le reste', () => {
		const map = hideEmptyNodes(buildProgrammeMap([point('1', 's-carre', 1)], NODES));
		expect(map.map((b) => b.name)).toEqual(['Fonctions']);
		expect(map[0].notions.map((n) => n.name)).toEqual(['Fonctions de référence']);
		expect(map[0].notions[0].subnotions.map((s) => s.name)).toEqual(['fonction carré']);
	});

	it('garde une notion qui ne porte que des points directs', () => {
		const map = hideEmptyNodes(buildProgrammeMap([point('1', 'n-ref', 1)], NODES));
		expect(map[0].notions[0]).toMatchObject({ name: 'Fonctions de référence', subnotions: [] });
	});
});

describe('branchColor', () => {
	it('une teinte claire / sombre par branche, en boucle au-delà de la palette', () => {
		expect(branchColor(0)).toBe(`light-dark(${BRANCH_COLORS[0][0]}, ${BRANCH_COLORS[0][1]})`);
		expect(branchColor(BRANCH_COLORS.length)).toBe(branchColor(0));
	});
});

describe('linkPath', () => {
	it('relie le bord droit du parent au bord gauche de l’enfant, à mi-hauteur', () => {
		const parent = { left: 0, top: 0, width: 100, height: 40 };
		const child = { left: 140, top: 80, width: 50, height: 20 };
		expect(linkPath(parent, child)).toBe('M100 20 C 120 20, 120 90, 140 90');
	});
});

describe('countsLabel', () => {
	it('« 12 att. · 2 approf. », sans approfondissement « 3 att. », vide « aucun point »', () => {
		expect(countsLabel({ attendus: 12, approfondissements: 2 })).toBe('12 att. · 2 approf.');
		expect(countsLabel({ attendus: 3, approfondissements: 0 })).toBe('3 att.');
		expect(countsLabel({ attendus: 0, approfondissements: 1 })).toBe('0 att. · 1 approf.');
		expect(countsLabel({ attendus: 0, approfondissements: 0 })).toBe('aucun point');
	});
});

describe('dépliage', () => {
	const map = buildProgrammeMap([point('1', 's-carre', 1), point('2', 'n-ref', 2)], NODES);

	it('au départ : branches et notions ouvertes (jusqu’aux sous-notions)', () => {
		expect(new Set(defaultOpenIds(map))).toEqual(
			new Set(['b-al', 'b-fo', 'n-ref', 'n-var', 'n-eq'])
		);
	});

	it('« Tout déplier » ouvre les points de chaque nœud qui en porte', () => {
		expect(new Set(pointHolderIds(map))).toEqual(new Set(['n-ref', 's-carre']));
	});
});
