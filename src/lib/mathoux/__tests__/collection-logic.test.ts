/**
 * Logique pure de la Chatterie (Mathoux v1).
 *
 * Spec validée : docs/wip/mathoux-conception.md § 9 — un Mathou par notion,
 * race = branche, chaton à la 1re réussite, matou à la moitié (arrondie au
 * supérieur) des points travaillables acquis, grand matou à tous ; sieste si un
 * point est « à revoir ».
 */

import { describe, it, expect } from 'vitest';
import {
	buildMathouCollection,
	mathouGrowth,
	mathouName,
	nappingPhrase,
	collectionCountsPhrase,
	type CollectionTreeNode,
	type PointProgress
} from '../collection-logic';

// =============================================================================
// Décor : deux branches, trois notions, une sous-notion
// =============================================================================

const NODES: CollectionTreeNode[] = [
	{ id: 'b-alg', kind: 'branch', parentId: null, name: 'Algèbre', position: 2 },
	{ id: 'b-nb', kind: 'branch', parentId: null, name: 'Nombres et calculs', position: 0 },
	{ id: 'b-vide', kind: 'branch', parentId: null, name: 'Proportionnalité', position: 1 },
	{ id: 'n-frac', kind: 'notion', parentId: 'b-nb', name: 'Fractions : calculs', position: 1 },
	{ id: 'n-ent', kind: 'notion', parentId: 'b-nb', name: 'Entiers : division', position: 0 },
	{ id: 'n-calc', kind: 'notion', parentId: 'b-alg', name: 'Calcul littéral', position: 0 },
	{ id: 's-frac', kind: 'subnotion', parentId: 'n-frac', name: 'Somme', position: 0 }
];

const NONE = new Map<string, PointProgress>();

function progress(entries: Record<string, Partial<PointProgress>>): Map<string, PointProgress> {
	const map = new Map<string, PointProgress>();
	for (const [id, p] of Object.entries(entries)) {
		map.set(id, { isAcquired: false, hasSuccess: false, ...p });
	}
	return map;
}

// =============================================================================
// Croissance
// =============================================================================

describe('mathouGrowth', () => {
	it('aucune réussite → à découvrir', () => {
		expect(mathouGrowth({ workable: 4, acquired: 0, hasSuccess: false })).toBe('a_decouvrir');
	});

	it('une réussite, rien d’acquis → chaton', () => {
		expect(mathouGrowth({ workable: 4, acquired: 0, hasSuccess: true })).toBe('chaton');
	});

	it('moitié exacte (2 sur 4) → matou', () => {
		expect(mathouGrowth({ workable: 4, acquired: 2, hasSuccess: true })).toBe('matou');
	});

	it('moitié arrondie au supérieur : 2 sur 5 → chaton, 3 sur 5 → matou', () => {
		expect(mathouGrowth({ workable: 5, acquired: 2, hasSuccess: true })).toBe('chaton');
		expect(mathouGrowth({ workable: 5, acquired: 3, hasSuccess: true })).toBe('matou');
	});

	it('tous acquis → grand matou', () => {
		expect(mathouGrowth({ workable: 5, acquired: 5, hasSuccess: true })).toBe('grand_matou');
	});

	it('un seul point travaillable, acquis → grand matou (jamais matou)', () => {
		expect(mathouGrowth({ workable: 1, acquired: 1, hasSuccess: true })).toBe('grand_matou');
	});

	it('un point acquis vaut une réussite, même sans compteur de réussites', () => {
		expect(mathouGrowth({ workable: 4, acquired: 1, hasSuccess: false })).toBe('chaton');
	});
});

// =============================================================================
// Nom
// =============================================================================

describe('mathouName', () => {
	it('premier mot au pluriel → « le Mathou des … »', () => {
		expect(mathouName('Fractions')).toBe('le Mathou des Fractions');
		expect(mathouName('Fractions : calculs')).toBe('le Mathou des Fractions : calculs');
		expect(mathouName('Décimaux : numération')).toBe('le Mathou des Décimaux : numération');
		expect(mathouName('Suites géométriques')).toBe('le Mathou des Suites géométriques');
	});

	it('premier mot au singulier (genre inconnu) → nom entre guillemets', () => {
		expect(mathouName('Dérivation')).toBe('le Mathou « Dérivation »');
		expect(mathouName('Second degré')).toBe('le Mathou « Second degré »');
		expect(mathouName('Théorème de Pythagore')).toBe('le Mathou « Théorème de Pythagore »');
		expect(mathouName('y′ = ay + b')).toBe('le Mathou « y′ = ay + b »');
	});

	it('nom vide ou blanc → « le Mathou » seul', () => {
		expect(mathouName('  ')).toBe('le Mathou');
	});
});

// =============================================================================
// Regroupement
// =============================================================================

describe('buildMathouCollection', () => {
	it('une sous-notion compte pour sa notion parente', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-frac', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 's-frac', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({ p2: { hasSuccess: true } }),
			nappingPointIds: new Set()
		});

		expect(collection.races).toHaveLength(1);
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.notionId).toBe('n-frac');
		expect(mathou.workablePoints).toBe(2);
		expect(mathou.growth).toBe('chaton');
	});

	it('race = rang de la branche dans l’ordre des positions, branches rangées dans cet ordre', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-calc', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set()
		});

		expect(collection.races.map((r) => [r.branchName, r.raceIndex])).toEqual([
			['Nombres et calculs', 0],
			['Algèbre', 2]
		]);
		expect(collection.races[1].mathoux[0].raceIndex).toBe(2);
	});

	it('notions rangées par position dans leur branche', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-frac', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set()
		});
		expect(collection.races[0].mathoux.map((m) => m.notionId)).toEqual(['n-ent', 'n-frac']);
	});

	it('une notion sans point travaillable n’apparaît pas', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: 'T_SPE' }],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set()
		});
		const ids = collection.races.flatMap((r) => r.mathoux.map((m) => m.notionId));
		expect(ids).toEqual(['n-ent']);
	});

	it('un point rattaché à un nœud absent (archivé) ou à une sous-notion orpheline est ignoré', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'inconnu', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 's-orpheline', grade: 'T_SPE' }
			],
			nodes: [
				...NODES,
				{ id: 's-orpheline', kind: 'subnotion', parentId: 'n-archivee', name: 'X', position: 0 }
			],
			progress: NONE,
			nappingPointIds: new Set()
		});
		expect(collection.races).toEqual([]);
		expect(collection.counts).toEqual({ born: 0, napping: 0, toDiscover: 0 });
	});

	it('une notion dont la branche est archivée (absente) est ignorée', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-x', grade: 'T_SPE' }],
			nodes: [{ id: 'n-x', kind: 'notion', parentId: 'b-archivee', name: 'X', position: 0 }],
			progress: NONE,
			nappingPointIds: new Set()
		});
		expect(collection.races).toEqual([]);
	});

	it('sieste : un point de la notion à revoir endort un Mathou né', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(['p2'])
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.growth).toBe('matou');
		expect(mathou.asleep).toBe(true);
		expect(collection.counts).toEqual({ born: 1, napping: 1, toDiscover: 0 });
	});

	it('une silhouette (à découvrir) ne fait jamais la sieste', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: 'T_SPE' }],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set(['p1'])
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.growth).toBe('a_decouvrir');
		expect(mathou.asleep).toBe(false);
		expect(collection.counts).toEqual({ born: 0, napping: 0, toDiscover: 1 });
	});

	it('un point en double dans l’entrée ne compte qu’une fois', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: 'T_SPE' },
				{ id: 'p1', nodeId: 'n-ent', grade: 'T_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set()
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.workablePoints).toBe(2);
		expect(mathou.acquiredPoints).toBe(1);
		expect(mathou.growth).toBe('matou');
	});

	it('parcours : une notion entièrement acquise en 1re spé reste grand matou en Tle spé', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '1_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: '1_SPE' },
				{ id: 'p3', nodeId: 'n-ent', grade: 'T_SPE' },
				{ id: 'p4', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({
				p1: { hasSuccess: true, isAcquired: true },
				p2: { hasSuccess: true, isAcquired: true }
			}),
			nappingPointIds: new Set()
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.growth).toBe('grand_matou');
		expect(mathou.workablePoints).toBe(4);
		expect(mathou.acquiredPoints).toBe(2);
		// Détail par niveau, du plus ancien au plus récent
		expect(mathou.byGrade).toEqual([
			{ grade: '1_SPE', workablePoints: 2, acquiredPoints: 2, growth: 'grand_matou' },
			{ grade: 'T_SPE', workablePoints: 2, acquiredPoints: 0, growth: 'a_decouvrir' }
		]);
	});

	it('parcours : le stade affiché est le meilleur des niveaux, pas celui des totaux', () => {
		// 1 acquis sur 2 en 5e (matou), 0 sur 3 en 4e : les totaux (1 sur 5) diraient chaton
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '4' },
				{ id: 'p2', nodeId: 'n-ent', grade: '4' },
				{ id: 'p3', nodeId: 'n-ent', grade: '4' },
				{ id: 'p4', nodeId: 'n-ent', grade: '5' },
				{ id: 'p5', nodeId: 'n-ent', grade: '5' }
			],
			nodes: NODES,
			progress: progress({ p4: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set()
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.growth).toBe('matou');
		expect(mathou.byGrade.map((g) => [g.grade, g.growth])).toEqual([
			['5', 'matou'],
			['4', 'a_decouvrir']
		]);
	});

	it('parcours : un point d’un niveau antérieur dû en révision endort le Mathou', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '1_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({ p2: { hasSuccess: true } }),
			nappingPointIds: new Set(['p1'])
		});
		expect(collection.races[0].mathoux[0].asleep).toBe(true);
	});

	it('aucun point → collection vide', () => {
		const collection = buildMathouCollection({
			points: [],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set()
		});
		expect(collection).toEqual({ races: [], counts: { born: 0, napping: 0, toDiscover: 0 } });
	});
});

// =============================================================================
// Phrases
// =============================================================================

describe('phrases', () => {
	it('nappingPhrase accorde le singulier et le pluriel', () => {
		expect(nappingPhrase(1)).toBe('1 Mathou fait la sieste');
		expect(nappingPhrase(3)).toBe('3 Mathoux font la sieste');
	});

	it('collectionCountsPhrase', () => {
		expect(collectionCountsPhrase({ born: 7, napping: 2, toDiscover: 12 })).toBe(
			'7 Mathoux, 2 en sieste, 12 à découvrir'
		);
		expect(collectionCountsPhrase({ born: 1, napping: 0, toDiscover: 1 })).toBe(
			'1 Mathou, 0 en sieste, 1 à découvrir'
		);
	});
});
