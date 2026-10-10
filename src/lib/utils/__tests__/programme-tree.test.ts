/**
 * Arbre du programme (génération neuve) : branche > notion > points du niveau.
 *
 * Comportements validés par David (C5, étape 3) :
 *   1. branches et notions dans l'ordre de l'arbre (`position`, puis nom) ;
 *      points dans l'ordre du BO (`display_order`) ; nom de la sous-notion
 *      quand le point est posé sur une sous-notion ;
 *   2. seules les branches et notions qui portent un point du niveau
 *      apparaissent (un point sur une sous-notion compte pour sa notion) ;
 *   4. les archivés se masquent et se comptent ;
 *   5. un ancien point (sans nœud) n'apparaît jamais ;
 *   7. aucun point → arbre vide.
 */

import { describe, it, expect } from 'vitest';
import {
	buildProgrammeTree,
	countArchivedPoints,
	hideArchivedPoints,
	type ProgrammePointRow
} from '../programme-tree';
import type { ClassificationNode } from '$lib/types/database-helpers';

const STAMP = '2026-10-10T00:00:00Z';

function node(
	id: string,
	kind: ClassificationNode['kind'],
	name: string,
	parent_id: string | null,
	position = 0
): ClassificationNode {
	return {
		id,
		kind,
		name,
		parent_id,
		position,
		archived_at: null,
		created_at: STAMP,
		updated_at: STAMP
	};
}

function point(
	id: string,
	node_id: string | null,
	display_order: number,
	extra: Partial<ProgrammePointRow> = {}
): ProgrammePointRow {
	return {
		id,
		code: `5-${id}`,
		name: `Point ${id}`,
		display_order,
		rubrique: null,
		archived_at: null,
		node_id,
		grade: '5',
		...extra
	};
}

// Deux branches, données dans le désordre ; « Géométrie » a la position 1,
// « Nombres » la position 2. Trois notions dans « Nombres », dont une sans
// point du niveau (elle ne doit pas apparaître) ; deux sous-notions.
const NODES: ClassificationNode[] = [
	node('b-nombres', 'branch', 'Nombres et calculs', null, 2),
	node('b-geo', 'branch', 'Géométrie', null, 1),
	node('b-vide', 'branch', 'Probabilités', null, 0),
	node('n-fractions', 'notion', 'Fractions', 'b-nombres', 2),
	node('n-entiers', 'notion', 'Entiers', 'b-nombres', 1),
	node('n-vide', 'notion', 'Puissances', 'b-nombres', 0),
	node('n-triangles', 'notion', 'Triangles', 'b-geo', 0),
	node('s-simplifier', 'subnotion', 'simplifier', 'n-fractions', 0),
	node('s-comparer', 'subnotion', 'comparer', 'n-fractions', 1)
];

describe('buildProgrammeTree', () => {
	it('range branches et notions dans l’ordre de l’arbre, points dans l’ordre du BO', () => {
		const tree = buildProgrammeTree(
			[
				point('p3', 'n-fractions', 30),
				point('p1', 'n-entiers', 10),
				point('p2', 's-simplifier', 20),
				point('p4', 'n-triangles', 5),
				point('p5', 's-comparer', 25)
			],
			NODES
		);

		expect(tree.map((b) => b.name)).toEqual(['Géométrie', 'Nombres et calculs']);
		const nombres = tree[1];
		expect(nombres.notions.map((n) => n.name)).toEqual(['Entiers', 'Fractions']);
		expect(nombres.notions[1].points.map((p) => p.id)).toEqual(['p2', 'p5', 'p3']);
	});

	it('à position égale, départage par le nom', () => {
		const tree = buildProgrammeTree(
			[point('a', 'n-z', 1), point('b', 'n-a', 2)],
			[
				node('br', 'branch', 'Branche', null, 0),
				node('n-z', 'notion', 'Zèbre', 'br', 0),
				node('n-a', 'notion', 'Abeille', 'br', 0)
			]
		);
		expect(tree[0].notions.map((n) => n.name)).toEqual(['Abeille', 'Zèbre']);
	});

	it('un point sur une sous-notion compte pour sa notion et porte le nom de la sous-notion', () => {
		const tree = buildProgrammeTree(
			[point('p2', 's-simplifier', 1), point('p3', 'n-fractions', 2)],
			NODES
		);

		expect(tree).toHaveLength(1);
		expect(tree[0].notions).toHaveLength(1);
		const [onSub, onNotion] = tree[0].notions[0].points;
		expect(onSub.subnotionName).toBe('simplifier');
		expect(onNotion.subnotionName).toBeNull();
	});

	it('n’affiche que les branches et notions qui portent un point du niveau', () => {
		const tree = buildProgrammeTree([point('p1', 'n-entiers', 1)], NODES);

		expect(tree.map((b) => b.id)).toEqual(['b-nombres']);
		expect(tree[0].notions.map((n) => n.id)).toEqual(['n-entiers']);
	});

	it('écarte un ancien point (sans nœud)', () => {
		const tree = buildProgrammeTree(
			[point('ancien', null, 1, { grade: null }), point('p1', 'n-entiers', 2)],
			NODES
		);

		const ids = tree.flatMap((b) => b.notions.flatMap((n) => n.points.map((p) => p.id)));
		expect(ids).toEqual(['p1']);
	});

	it('aucun point : arbre vide', () => {
		expect(buildProgrammeTree([], NODES)).toEqual([]);
	});

	it('signale les nœuds archivés qui portent encore des points', () => {
		const archivedAt = '2026-10-01T00:00:00Z';
		const tree = buildProgrammeTree(
			[point('p1', 's-arch', 1), point('p2', 'n-entiers', 2)],
			[
				{ ...node('b-nombres', 'branch', 'Nombres et calculs', null, 2), archived_at: archivedAt },
				node('n-fractions', 'notion', 'Fractions', 'b-nombres', 2),
				{ ...node('n-entiers', 'notion', 'Entiers', 'b-nombres', 1), archived_at: archivedAt },
				{ ...node('s-arch', 'subnotion', 'ancienne', 'n-fractions', 0), archived_at: archivedAt }
			]
		);

		expect(tree[0].archived).toBe(true);
		const [entiers, fractions] = tree[0].notions;
		expect(entiers.archived).toBe(true);
		expect(fractions.archived).toBe(false);
		expect(fractions.points[0].subnotionArchived).toBe(true);
		expect(entiers.points[0].subnotionArchived).toBe(false);
	});

	it('refuse bruyamment un point dont le nœud est introuvable (pas de disparition silencieuse)', () => {
		expect(() => buildProgrammeTree([point('p', 'inconnu', 1)], NODES)).toThrow(/introuvable/);
	});
});

describe('archivés', () => {
	const tree = buildProgrammeTree(
		[
			point('p1', 'n-entiers', 1),
			point('p2', 'n-entiers', 2, { archived_at: STAMP }),
			point('p3', 'n-triangles', 3, { archived_at: STAMP })
		],
		NODES
	);

	it('compte les points archivés', () => {
		expect(countArchivedPoints(tree)).toBe(2);
	});

	it('masque les archivés, et les notions et branches qu’ils laissent vides', () => {
		const visible = hideArchivedPoints(tree);
		expect(visible.map((b) => b.id)).toEqual(['b-nombres']);
		expect(visible[0].notions[0].points.map((p) => p.id)).toEqual(['p1']);
	});
});
