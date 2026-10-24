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
	memoryCountsPhrase,
	isPointLost,
	memoryUpdates,
	mergeMemory,
	starGradeLabel,
	selectTrainingTemplates,
	trainingCategories,
	trainingQuery,
	trainingTemplateFrom,
	MAX_TRAINING_QUESTIONS,
	type CollectionTreeNode,
	type TrainingTemplate,
	type MathouMemory,
	type PointProgress
} from '../collection-logic';
import { MATHOU_NAMES } from '../mathou-noms';
import { resolveTestLaunch } from '$lib/utils/test-launch';
import { buildSeriesLink } from '$lib/validation/series';

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
		map.set(id, { isAcquired: false, hasSuccess: false, lost: false, ...p });
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
	it('notion de l’arbre → son nom propre (table relue par David)', () => {
		expect(mathouName('Dérivation')).toBe('Tangentin');
		expect(mathouName('Raisonnement par récurrence')).toBe('Domino');
		// remplacements de David sur la page à cocher, repris tels quels
		expect(mathouName('Fractions : sens et écritures')).toBe('Tarte');
		expect(mathouName('Calcul littéral')).toBe('Viète');
		// espaces autour du nom de la notion : même Mathou
		expect(mathouName('  Dérivation ')).toBe('Tangentin');
	});

	it('notion hors table, premier mot au pluriel → « le Mathou des … »', () => {
		expect(mathouName('Fractions')).toBe('le Mathou des Fractions');
		expect(mathouName('Dérivées partielles')).toBe('le Mathou des Dérivées partielles');
		expect(mathouName('Décimaux : approximations')).toBe('le Mathou des Décimaux : approximations');
	});

	it('notion hors table, premier mot au singulier (genre inconnu) → nom entre guillemets', () => {
		expect(mathouName('Théorème de Fermat')).toBe('le Mathou « Théorème de Fermat »');
		expect(mathouName('y′ = ay²')).toBe('le Mathou « y′ = ay² »');
	});

	it('nom vide ou blanc → « le Mathou » seul', () => {
		expect(mathouName('  ')).toBe('le Mathou');
	});
});

describe('MATHOU_NAMES', () => {
	it('134 notions, un nom propre chacune, sans doublon ni blanc', () => {
		const names = Object.values(MATHOU_NAMES);
		expect(names).toHaveLength(134);
		expect(new Set(names).size).toBe(134);
		for (const [notion, name] of Object.entries(MATHOU_NAMES)) {
			expect(name.trim(), notion).toBe(name);
			expect(name.length, notion).toBeGreaterThan(0);
		}
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
// Mémoire : un Mathou ne rapetisse jamais (§ 9, « Changement d'année et oubli »)
// =============================================================================

/** Mémoire de test ; `asleep` faux sauf mention. */
function memory(
	entries: Record<string, Omit<MathouMemory, 'asleep'> & { asleep?: boolean }>
): Map<string, MathouMemory> {
	return new Map(
		Object.entries(entries).map(([id, entry]) => [id, { asleep: false, ...entry }] as const)
	);
}

describe('buildMathouCollection avec la mémoire', () => {
	it('un point acquis puis perdu : le Mathou reste matou et s’endort (oubli)', () => {
		// 2 points, plus aucun acquis (calcul : chaton), p1 perdu (seuil atteint, non acquis)
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '2' },
				{ id: 'p2', nodeId: 'n-ent', grade: '2' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, lost: true } }),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'matou', starredGrades: [] } })
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou).toMatchObject({ growth: 'matou', asleep: true });
		expect(collection.counts).toEqual({ born: 1, napping: 1, toDiscover: 0 });
	});

	it('un Mathou mémorisé dont le calcul est au même stade ne dort pas', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: '2' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'] } })
		});
		expect(collection.races[0].mathoux[0]).toMatchObject({
			growth: 'grand_matou',
			asleep: false,
			stars: ['2']
		});
	});

	it('la décoration portée vient de la mémoire ; sans elle, aucune', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '2' },
				{ id: 'p2', nodeId: 'n-calc', grade: '2' }
			],
			nodes: NODES,
			progress: progress({
				p1: { hasSuccess: true },
				p2: { hasSuccess: true }
			}),
			nappingPointIds: new Set(),
			memory: memory({
				'n-ent': { bestStage: 'chaton', starredGrades: [], decoration: 'cockade' },
				'n-calc': { bestStage: 'chaton', starredGrades: [] }
			})
		});
		const decorations = collection.races
			.flatMap((race) => race.mathoux)
			.map((m) => [m.notionId, m.decoration]);
		expect(decorations).toEqual(
			expect.arrayContaining([
				['n-ent', 'cockade'],
				['n-calc', null]
			])
		);
	});

	it('la décoration ne fait jamais écrire la mémoire', () => {
		const mem = memory({
			'n-ent': { bestStage: 'chaton', starredGrades: [], decoration: 'heart' }
		});
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: '2' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true } }),
			nappingPointIds: new Set(),
			memory: mem
		});
		expect(memoryUpdates(collection, mem)).toEqual([]);
	});

	it('le calcul plus avancé que la mémoire l’emporte', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: '2' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'chaton', starredGrades: [] } })
		});
		expect(collection.races[0].mathoux[0]).toMatchObject({
			growth: 'grand_matou',
			asleep: false
		});
	});

	it('étoiles : un niveau entièrement acquis en donne une, la mémoire garde les anciennes', () => {
		// 1re spé : tout acquis ; 2nde : étoile mémorisée, points de 2nde partis du parcours
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '1_SPE' },
				{ id: 'p2', nodeId: 'n-ent', grade: 'T_SPE' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'matou', starredGrades: ['2'] } })
		});
		expect(collection.races[0].mathoux[0]).toMatchObject({
			growth: 'grand_matou',
			// du plus ancien au plus récent
			stars: ['2', '1_SPE'],
			asleep: false
		});
	});

	// Règle d'oubli tranchée par David le 2026-10-18 (option 2) : seul un point déjà
	// réussi puis perdu endort ; un point jamais acquis empêche seulement l'étoile.
	function starredNotion(p2: Partial<PointProgress> | undefined) {
		return buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '2' },
				{ id: 'p2', nodeId: 'n-ent', grade: '2' },
				{ id: 'p3', nodeId: 'n-ent', grade: '1_SPE' }
			],
			nodes: NODES,
			progress: progress({
				p1: { hasSuccess: true, isAcquired: true },
				p3: { hasSuccess: true, isAcquired: true },
				...(p2 ? { p2 } : {})
			}),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: ['2', '1_SPE'] } })
		}).races[0].mathoux[0];
	}

	it('nouveau point tagué jamais tenté (grand matou ★) → reste grand matou, réveillé, étoile gardée', () => {
		expect(starredNotion(undefined)).toMatchObject({
			growth: 'grand_matou',
			stars: ['2', '1_SPE'],
			asleep: false
		});
	});

	it('point en cours d’apprentissage (1 réussite, pas perdu) → pas de sieste', () => {
		expect(starredNotion({ hasSuccess: true })).toMatchObject({
			growth: 'grand_matou',
			asleep: false
		});
	});

	it('point au seuil atteint mais non acquis (perdu) → sieste', () => {
		expect(starredNotion({ hasSuccess: true, lost: true })).toMatchObject({
			growth: 'grand_matou',
			stars: ['2', '1_SPE'],
			asleep: true
		});
	});

	it('stade mémorisé au-dessus du calcul sans point perdu → pas de sieste', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '2' },
				{ id: 'p2', nodeId: 'n-ent', grade: '2' },
				{ id: 'p3', nodeId: 'n-ent', grade: '2' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(),
			memory: memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: [] } })
		});
		expect(collection.races[0].mathoux[0]).toMatchObject({ growth: 'grand_matou', asleep: false });
	});

	it('un point perdu endort aussi un Mathou sans mémoire', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: '2' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, lost: true } }),
			nappingPointIds: new Set()
		});
		expect(collection.races[0].mathoux[0]).toMatchObject({ growth: 'chaton', asleep: true });
	});

	it('un Mathou mémorisé sans point travaillable dans le parcours reste dans la Chatterie', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-calc', grade: '2' }],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set(),
			memory: memory({ 'n-frac': { bestStage: 'matou', starredGrades: [] } })
		});
		const frac = collection.races.flatMap((r) => r.mathoux).find((m) => m.notionId === 'n-frac');
		expect(frac).toMatchObject({
			growth: 'matou',
			asleep: false,
			workablePoints: 0,
			byGrade: [],
			stars: []
		});
		expect(collection.counts).toEqual({ born: 1, napping: 0, toDiscover: 1 });
	});

	it('une notion mémorisée archivée (absente de l’arbre) est ignorée', () => {
		const collection = buildMathouCollection({
			points: [],
			nodes: NODES,
			progress: NONE,
			nappingPointIds: new Set(),
			memory: memory({ 'n-archivee': { bestStage: 'matou', starredGrades: [] } })
		});
		expect(collection.races).toEqual([]);
	});

	it('sans mémoire, aucune étoile n’est perdue de vue : celles du calcul sont là', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: '2' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set()
		});
		expect(collection.races[0].mathoux[0].stars).toEqual(['2']);
	});
});

describe('isPointLost (seuil de réussites atteint, mais pas acquis)', () => {
	const base = { isAcquired: false, totalSuccesses: 0, distinctTemplateSuccesses: 0 };

	it('régime diversité : au moins 2 modèles réussis et non acquis → perdu', () => {
		expect(isPointLost('diversite', { ...base, distinctTemplateSuccesses: 2 })).toBe(true);
		expect(
			isPointLost('diversite', { ...base, distinctTemplateSuccesses: 1, totalSuccesses: 9 })
		).toBe(false);
		expect(
			isPointLost('diversite', { ...base, distinctTemplateSuccesses: 3, isAcquired: true })
		).toBe(false);
	});

	it('régime répétition (fluence) : au moins 5 réussites et non acquis → perdu', () => {
		expect(isPointLost('fluence', { ...base, totalSuccesses: 5 })).toBe(true);
		expect(
			isPointLost('fluence', { ...base, totalSuccesses: 4, distinctTemplateSuccesses: 4 })
		).toBe(false);
		expect(isPointLost('fluence', { ...base, totalSuccesses: 7, isAcquired: true })).toBe(false);
	});

	it('jamais tenté → jamais perdu', () => {
		expect(isPointLost('diversite', base)).toBe(false);
		expect(isPointLost('fluence', base)).toBe(false);
	});
});

describe('memoryUpdates', () => {
	function collectionOf(acquired: boolean, mem: Map<string, MathouMemory>, napping = false) {
		return buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-ent', grade: '2' },
				{ id: 'p2', nodeId: 'n-calc', grade: '2' }
			],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: acquired } }),
			nappingPointIds: new Set(napping ? ['p1'] : []),
			memory: mem
		});
	}

	it('un Mathou né sans mémoire est à retenir ; une silhouette jamais', () => {
		const mem = new Map<string, MathouMemory>();
		expect(memoryUpdates(collectionOf(true, mem), mem)).toEqual([
			{ notionId: 'n-ent', bestStage: 'grand_matou', starredGrades: ['2'], asleep: false }
		]);
	});

	it('rien de nouveau → aucune écriture', () => {
		const mem = memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'] } });
		expect(memoryUpdates(collectionOf(true, mem), mem)).toEqual([]);
	});

	it('un oubli n’écrit rien (la mémoire ne redescend pas)', () => {
		const mem = memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'] } });
		expect(memoryUpdates(collectionOf(false, mem), mem)).toEqual([]);
	});

	it('une nouvelle étoile ou un meilleur stade → la ligne complète, étoiles comprises', () => {
		const mem = memory({ 'n-ent': { bestStage: 'chaton', starredGrades: ['6'] } });
		expect(memoryUpdates(collectionOf(true, mem), mem)).toEqual([
			{ notionId: 'n-ent', bestStage: 'grand_matou', starredGrades: ['6', '2'], asleep: false }
		]);
	});

	it('un code de niveau inconnu ne devient jamais une étoile (la base le refuserait)', () => {
		const collection = buildMathouCollection({
			points: [{ id: 'p1', nodeId: 'n-ent', grade: 'ZZ' }],
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set()
		});
		expect(collection.races[0].mathoux[0].stars).toEqual([]);
		expect(memoryUpdates(collection, new Map())).toEqual([
			{ notionId: 'n-ent', bestStage: 'grand_matou', starredGrades: [], asleep: false }
		]);
	});

	it('il s’endort → la ligne est réécrite endormie ; il se réveille → éveillée', () => {
		const awake = memory({ 'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'] } });
		expect(memoryUpdates(collectionOf(true, awake, true), awake)).toEqual([
			{ notionId: 'n-ent', bestStage: 'grand_matou', starredGrades: ['2'], asleep: true }
		]);
		const asleep = memory({
			'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'], asleep: true }
		});
		expect(memoryUpdates(collectionOf(true, asleep), asleep)).toEqual([
			{ notionId: 'n-ent', bestStage: 'grand_matou', starredGrades: ['2'], asleep: false }
		]);
	});

	it('même sieste qu’en mémoire → aucune écriture', () => {
		const asleep = memory({
			'n-ent': { bestStage: 'grand_matou', starredGrades: ['2'], asleep: true }
		});
		expect(memoryUpdates(collectionOf(true, asleep, true), asleep)).toEqual([]);
	});

	it('Mathou de la seule mémoire (aucun point travaillable) : sa sieste mémorisée ne bouge pas', () => {
		const mem = memory({ 'n-frac': { bestStage: 'matou', starredGrades: [], asleep: true } });
		const collection = collectionOf(false, mem);
		const frac = collection.races.flatMap((r) => r.mathoux).find((m) => m.notionId === 'n-frac');
		expect(frac?.workablePoints).toBe(0);
		expect(frac?.asleep).toBe(false);
		expect(memoryUpdates(collection, mem).map((u) => u.notionId)).not.toContain('n-frac');
	});
});

describe('mergeMemory', () => {
	it('garde le meilleur stade et l’union des étoiles, dans l’ordre de la scolarité', () => {
		expect(
			mergeMemory(
				{ bestStage: 'grand_matou', starredGrades: ['1_SPE'], asleep: false },
				{ bestStage: 'matou', starredGrades: ['2', '1_SPE'], asleep: false }
			)
		).toEqual({ bestStage: 'grand_matou', starredGrades: ['2', '1_SPE'], asleep: false });
	});

	it('la sieste est celle du calcul (le second), pas un maximum', () => {
		const stored = { bestStage: 'matou' as const, starredGrades: [], asleep: true };
		expect(mergeMemory(stored, { ...stored, asleep: false }).asleep).toBe(false);
		expect(mergeMemory({ ...stored, asleep: false }, stored).asleep).toBe(true);
	});
});

describe('starGradeLabel', () => {
	it('libellé court du projet ; un code inconnu reste tel quel', () => {
		expect(starGradeLabel('1_SPE')).toBe('1ère Spé');
		expect(starGradeLabel('2')).toBe('2nde');
		expect(starGradeLabel('ZZ')).toBe('ZZ');
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

	it('memoryCountsPhrase : la ligne d’un élève dans la liste du professeur', () => {
		expect(memoryCountsPhrase({ born: 0, grandMatous: 0 })).toBe('Aucun Mathou');
		expect(memoryCountsPhrase({ born: 1, grandMatous: 0 })).toBe('1 Mathou');
		expect(memoryCountsPhrase({ born: 1, grandMatous: 1 })).toBe('1 Mathou, dont 1 grand matou');
		expect(memoryCountsPhrase({ born: 7, grandMatous: 2 })).toBe('7 Mathoux, dont 2 grands matous');
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

// =============================================================================
// « Faire grandir » : l'Entraînement sur la notion (v1.1, spec du 2026-10-18)
// =============================================================================

/** Modèle publié fictif : sa catégorie porte son identifiant (niveau = rang). */
function template(id: string, level = 1): TrainingTemplate {
	return {
		id,
		category: { theme: 'Nombres', domain: `Domaine ${id}`, subdomain: null, level },
		delay: 20
	};
}

function templatesMap(entries: Record<string, string[]>): Map<string, TrainingTemplate[]> {
	return new Map(
		Object.entries(entries).map(([pointId, ids]) => [pointId, ids.map((id) => template(id))])
	);
}

describe('selectTrainingTemplates', () => {
	it('d’abord les points perdus, puis les non acquis, puis les acquis', () => {
		const chosen = selectTrainingTemplates(
			['p-acquis', 'p-neuf', 'p-perdu'],
			progress({
				'p-acquis': { isAcquired: true, hasSuccess: true },
				'p-perdu': { hasSuccess: true, lost: true }
			}),
			templatesMap({ 'p-acquis': ['t-a'], 'p-neuf': ['t-n'], 'p-perdu': ['t-p'] })
		);
		expect(chosen.map((t) => t.id)).toEqual(['t-p', 't-n', 't-a']);
	});

	it('un point jamais travaillé (absent des états) compte comme non acquis', () => {
		const chosen = selectTrainingTemplates(
			['p-acquis', 'p-jamais'],
			progress({ 'p-acquis': { isAcquired: true, hasSuccess: true } }),
			templatesMap({ 'p-acquis': ['t-a'], 'p-jamais': ['t-j'] })
		);
		expect(chosen.map((t) => t.id)).toEqual(['t-j', 't-a']);
	});

	it('au plus 10 modèles, les plus prioritaires gardés', () => {
		const ids = Array.from({ length: 14 }, (_, i) => `t-${String(i).padStart(2, '0')}`);
		const chosen = selectTrainingTemplates(
			['p-acquis', 'p-perdu'],
			progress({
				'p-acquis': { isAcquired: true, hasSuccess: true },
				'p-perdu': { hasSuccess: true, lost: true }
			}),
			templatesMap({ 'p-acquis': ids.slice(0, 7), 'p-perdu': ids.slice(7) })
		);
		expect(MAX_TRAINING_QUESTIONS).toBe(10);
		expect(chosen).toHaveLength(10);
		// Les 7 modèles du point perdu d'abord, puis 3 du point acquis
		expect(chosen.slice(0, 7).map((t) => t.id)).toEqual(ids.slice(7));
	});

	it('un modèle qui tague plusieurs points ne vient qu’une fois, au rang du plus prioritaire', () => {
		const chosen = selectTrainingTemplates(
			['p-acquis', 'p-perdu'],
			progress({
				'p-acquis': { isAcquired: true, hasSuccess: true },
				'p-perdu': { hasSuccess: true, lost: true }
			}),
			templatesMap({ 'p-acquis': ['t-commun', 't-a'], 'p-perdu': ['t-commun'] })
		);
		expect(chosen.map((t) => t.id)).toEqual(['t-commun', 't-a']);
	});

	it('à priorité égale, les points sont servis tour à tour (un modèle chacun)', () => {
		const chosen = selectTrainingTemplates(
			['p1', 'p2'],
			NONE,
			templatesMap({ p1: ['t-1a', 't-1b', 't-1c'], p2: ['t-2a'] })
		);
		expect(chosen.map((t) => t.id)).toEqual(['t-1a', 't-2a', 't-1b', 't-1c']);
	});

	it('aucun modèle publié : liste vide', () => {
		expect(selectTrainingTemplates(['p1'], NONE, new Map())).toEqual([]);
	});
});

describe('trainingTemplateFrom (ligne lue → modèle d’Entraînement)', () => {
	const ROW = {
		id: 't1',
		theme: 'Nombres',
		domain: 'Fractions',
		subdomain: 'Somme',
		level: 2,
		delay: 30,
		status: 'published'
	};

	it('un modèle publié donne sa catégorie et sa durée', () => {
		expect(trainingTemplateFrom(ROW)).toEqual({
			id: 't1',
			category: { theme: 'Nombres', domain: 'Fractions', subdomain: 'Somme', level: 2 },
			delay: 30
		});
	});

	it('aucun brouillon, même si la ligne arrive', () => {
		expect(trainingTemplateFrom({ ...ROW, status: 'draft' })).toBeNull();
	});

	it('durée absente → 20 s (défaut du panier) ; durée hors bornes → 600 s au plus', () => {
		expect(trainingTemplateFrom({ ...ROW, delay: null })?.delay).toBe(20);
		expect(trainingTemplateFrom({ ...ROW, delay: 9999 })?.delay).toBe(600);
	});

	it('une catégorie que le lien refuserait (thème vide) est écartée', () => {
		expect(trainingTemplateFrom({ ...ROW, theme: '' })).toBeNull();
	});
});

describe('trainingCategories et trainingQuery', () => {
	it('aucun modèle : pas de catégories, pas de lien', () => {
		expect(trainingCategories([])).toBeNull();
		expect(trainingQuery(null)).toBeNull();
	});

	it('catégories minimales : catégorie, une question, durée (rien d’autre, pas l’id du modèle)', () => {
		expect(trainingCategories([template('t1')])).toEqual([
			{ category: template('t1').category, quantity: 1, delay: 20 }
		]);
	});

	it('un Entraînement (mode interactif) d’une question par modèle, que resolveTestLaunch accepte', () => {
		const templates = Array.from({ length: 10 }, (_, i) =>
			trainingTemplateFrom({
				id: `t${i}`,
				theme: 'Fonctions de référence',
				domain: 'Équations du second degré',
				subdomain: 'Résolution par le discriminant',
				level: i + 1,
				delay: 20,
				status: 'published'
			})
		).filter((t): t is TrainingTemplate => t !== null);
		const categories = trainingCategories(templates);
		const query = trainingQuery(categories);
		expect(query).not.toBeNull();
		// Même encodage que les liens de série (`buildSeriesLink`)
		expect(`/automaths/test?${query}`).toBe(
			buildSeriesLink('', categories ?? [], { mode: 'interactive' })
		);
		const url = new URL(`/automaths/test?${query}`, 'https://chiph.re');

		const launch = resolveTestLaunch(url.searchParams);
		expect(launch.kind).toBe('start');
		if (launch.kind !== 'start') return;
		expect(launch.mode).toBe('interactive');
		expect(launch.categories).toHaveLength(10);
		expect(launch.categories.every((c) => c.quantity === 1)).toBe(true);
		expect(launch.categories[0].category).toEqual(templates[0].category);
		// Longueur raisonnable avec 10 modèles aux noms accentués et longs
		expect((query as string).length).toBeLessThan(6000);
	});
});

describe('buildMathouCollection : Entraînement et réveil', () => {
	const POINTS = [
		{ id: 'p1', nodeId: 'n-frac', grade: '2' },
		{ id: 'p2', nodeId: 's-frac', grade: '1_SPE' }
	];

	it('un Mathou né porte le lien de son Entraînement, sur tout le parcours', () => {
		const collection = buildMathouCollection({
			points: POINTS,
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, isAcquired: true } }),
			nappingPointIds: new Set(),
			templatesByPoint: templatesMap({ p1: ['t-2de'], p2: ['t-1re'] })
		});
		const [mathou] = collection.races[0].mathoux;
		const launch = resolveTestLaunch(
			new URLSearchParams(trainingQuery(mathou.trainingCategories) ?? '')
		);
		expect(launch.kind).toBe('start');
		if (launch.kind !== 'start') return;
		// p2 (1re, non acquis) avant p1 (2de, acquis)
		expect(launch.categories.map((c) => c.category.domain)).toEqual([
			'Domaine t-1re',
			'Domaine t-2de'
		]);
	});

	it('une silhouette n’a pas de lien ; une notion sans modèle publié non plus', () => {
		const collection = buildMathouCollection({
			points: [
				{ id: 'p1', nodeId: 'n-frac', grade: '2' },
				{ id: 'p3', nodeId: 'n-ent', grade: '2' }
			],
			nodes: NODES,
			progress: progress({ p3: { hasSuccess: true } }),
			nappingPointIds: new Set(),
			templatesByPoint: templatesMap({ p1: ['t1'] })
		});
		const byId = new Map(collection.races.flatMap((r) => r.mathoux).map((m) => [m.notionId, m]));
		expect(byId.get('n-frac')?.growth).toBe('a_decouvrir');
		expect(byId.get('n-frac')?.trainingCategories).toBeNull();
		expect(byId.get('n-ent')?.growth).toBe('chaton');
		expect(byId.get('n-ent')?.trainingCategories).toBeNull();
	});

	it('poids : la collection porte les catégories, jamais un lien encodé', () => {
		const ids = Array.from({ length: 12 }, (_, i) => `t-${i}`);
		const collection = buildMathouCollection({
			points: POINTS,
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true } }),
			nappingPointIds: new Set(),
			templatesByPoint: templatesMap({ p1: ids })
		});
		const [mathou] = collection.races[0].mathoux;
		expect(mathou.trainingCategories).toHaveLength(10);
		const json = JSON.stringify(collection);
		expect(json).not.toMatch(/automaths|%7B|%257B/);
	});

	it('endormi par une carte due : dueForRevision ; par un point perdu seul : non', () => {
		const due = buildMathouCollection({
			points: POINTS,
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true } }),
			nappingPointIds: new Set(['p1']),
			templatesByPoint: templatesMap({ p1: ['t1'] })
		}).races[0].mathoux[0];
		expect(due).toMatchObject({ asleep: true, dueForRevision: true });

		const lost = buildMathouCollection({
			points: POINTS,
			nodes: NODES,
			progress: progress({ p1: { hasSuccess: true, lost: true } }),
			nappingPointIds: new Set(),
			templatesByPoint: templatesMap({ p1: ['t1'] })
		}).races[0].mathoux[0];
		expect(lost).toMatchObject({ asleep: true, dueForRevision: false });
	});
});
