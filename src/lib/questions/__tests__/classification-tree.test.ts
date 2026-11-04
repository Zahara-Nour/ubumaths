import { describe, it, expect } from 'vitest';
import {
	UNRANKED_LABEL,
	childrenOf,
	filterNodeIds,
	indexNodes,
	nodeIdOfSelection,
	nodePathLabel,
	placeOfNode,
	selectionOf,
	type TreeNode
} from '../classification-tree';

function node(
	id: string,
	kind: TreeNode['kind'],
	name: string,
	parent_id: string | null,
	position = 0
): TreeNode {
	return { id, kind, name, parent_id, position };
}

const NODES: TreeNode[] = [
	node('b-calc', 'branch', 'Calcul', null, 1),
	node('b-geo', 'branch', 'Géométrie', null, 0),
	node('n-frac', 'notion', 'Fractions', 'b-calc', 0),
	node('n-dec', 'notion', 'Décimaux', 'b-calc', 0),
	node('s-add', 'subnotion', 'Additionner', 'n-frac', 0),
	node('s-mul', 'subnotion', 'Multiplier', 'n-frac', 1),
	node('n-tri', 'notion', 'Triangles', 'b-geo', 0),
	node('s-orphan', 'subnotion', 'Orpheline', 'inconnu', 0)
];
const BY_ID = indexNodes(NODES);

describe('placeOfNode', () => {
	it('retrouve branche et notion d’une notion', () => {
		const place = placeOfNode('n-frac', BY_ID);
		expect(place?.branch.id).toBe('b-calc');
		expect(place?.notion.id).toBe('n-frac');
		expect(place?.subnotion).toBeNull();
	});

	it('retrouve la notion et la branche d’une sous-notion', () => {
		const place = placeOfNode('s-add', BY_ID);
		expect(place?.subnotion?.id).toBe('s-add');
		expect(place?.notion.id).toBe('n-frac');
		expect(place?.branch.id).toBe('b-calc');
	});

	it('refuse une branche, un nœud inconnu, une chaîne cassée, null', () => {
		expect(placeOfNode('b-calc', BY_ID)).toBeNull();
		expect(placeOfNode('absent', BY_ID)).toBeNull();
		expect(placeOfNode('s-orphan', BY_ID)).toBeNull();
		expect(placeOfNode(null, BY_ID)).toBeNull();
	});
});

describe('nodePathLabel', () => {
	it('écrit le chemin branche › notion › sous-notion', () => {
		expect(nodePathLabel('s-add', BY_ID)).toBe('Calcul › Fractions › Additionner');
	});

	it('s’arrête à la notion quand le modèle est posé dessus', () => {
		expect(nodePathLabel('n-tri', BY_ID)).toBe('Géométrie › Triangles');
	});

	it('dit « Non rangé » sans nœud', () => {
		expect(nodePathLabel(null, BY_ID)).toBe(UNRANKED_LABEL);
		expect(nodePathLabel(undefined, BY_ID)).toBe(UNRANKED_LABEL);
	});

	it('n’invente rien quand le nœud est introuvable', () => {
		expect(nodePathLabel('absent', BY_ID)).toBeNull();
		expect(nodePathLabel('s-orphan', BY_ID)).toBeNull();
	});
});

describe('cascade du sélecteur', () => {
	it('liste les branches dans l’ordre position puis nom', () => {
		expect(childrenOf(NODES, null, 'branch').map((n) => n.id)).toEqual(['b-geo', 'b-calc']);
	});

	it('à position égale, trie par nom', () => {
		expect(childrenOf(NODES, 'b-calc', 'notion').map((n) => n.name)).toEqual([
			'Décimaux',
			'Fractions'
		]);
	});

	it('liste les sous-notions d’une notion, et aucune pour une notion sans enfant', () => {
		expect(childrenOf(NODES, 'n-frac', 'subnotion').map((n) => n.id)).toEqual(['s-add', 's-mul']);
		expect(childrenOf(NODES, 'n-tri', 'subnotion')).toEqual([]);
	});

	it('relit la sélection d’un nœud enregistré', () => {
		expect(selectionOf('s-mul', BY_ID)).toEqual({
			branchId: 'b-calc',
			notionId: 'n-frac',
			subnotionId: 's-mul'
		});
		expect(selectionOf('n-tri', BY_ID)).toEqual({
			branchId: 'b-geo',
			notionId: 'n-tri',
			subnotionId: null
		});
		expect(selectionOf(null, BY_ID)).toEqual({ branchId: null, notionId: null, subnotionId: null });
	});

	it('écrit le nœud choisi : sous-notion, sinon notion, sinon rien', () => {
		expect(nodeIdOfSelection({ branchId: 'b', notionId: 'n', subnotionId: 's' })).toBe('s');
		expect(nodeIdOfSelection({ branchId: 'b', notionId: 'n', subnotionId: null })).toBe('n');
		expect(nodeIdOfSelection({ branchId: 'b', notionId: null, subnotionId: null })).toBeNull();
		expect(nodeIdOfSelection({ branchId: null, notionId: null, subnotionId: null })).toBeNull();
	});
});

describe('filterNodeIds', () => {
	it('une notion inclut ses sous-notions', () => {
		expect(filterNodeIds(NODES, { branchId: 'b-calc', notionId: 'n-frac' })?.sort()).toEqual(
			['n-frac', 's-add', 's-mul'].sort()
		);
	});

	it('une branche seule inclut notions et sous-notions, pas celles d’une autre branche', () => {
		const ids = filterNodeIds(NODES, { branchId: 'b-calc' });
		expect(ids?.sort()).toEqual(['n-dec', 'n-frac', 's-add', 's-mul'].sort());
	});

	it('sans filtre : null ; notion inconnue : liste vide', () => {
		expect(filterNodeIds(NODES, {})).toBeNull();
		expect(filterNodeIds(NODES, { notionId: 'absent' })).toEqual([]);
	});
});
