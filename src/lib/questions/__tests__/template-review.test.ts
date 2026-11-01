import { describe, it, expect } from 'vitest';
import {
	buildReviewTree,
	DEFAULT_FILTERS,
	matchesFilters,
	parseFilters,
	summaryAlerts,
	templatesUnder,
	changedSinceReview,
	findReviewNode,
	type TemplateSummary,
	type TreeNodeRow
} from '../template-review';

// Constantes

const NOEUDS = new Map<string, TreeNodeRow>([
	['b1', { id: 'b1', name: 'Nombres', parent_id: null, position: 1 }],
	['n1', { id: 'n1', name: 'Fractions', parent_id: 'b1', position: 2 }],
	['s1', { id: 's1', name: 'Comparer', parent_id: 'n1', position: 1 }],
	['b2', { id: 'b2', name: 'Géométrie', parent_id: null, position: 2 }]
]);

// Functions

function modele(id: string, extra: Partial<TemplateSummary> = {}): TemplateSummary {
	return {
		id,
		title: id,
		status: 'draft',
		level: 1,
		nodeId: 's1',
		updatedAt: '2026-10-01T00:00:00Z',
		points: [{ code: '6-001', grade: '6' }],
		review: null,
		...extra
	};
}

describe('buildReviewTree', () => {
	it('range par programme > branche > notion > sous-notion et compte les verdicts', () => {
		const arbre = buildReviewTree(
			[
				modele('a', {
					review: { verdict: 'valide', comment: '', reviewedAt: '2026-10-02T00:00:00Z' }
				}),
				modele('b', {
					review: { verdict: 'a_revoir', comment: 'x', reviewedAt: '2026-10-02T00:00:00Z' }
				}),
				modele('c')
			],
			NOEUDS
		);
		expect(arbre.map((p) => p.name)).toEqual(['6ème']);
		const [six] = arbre;
		expect(six.count).toEqual({ total: 3, valide: 1, aRevoir: 1, none: 1, changed: 0 });
		const sous = findReviewNode(arbre, '6~s1');
		expect(sous?.templateIds).toEqual(['a', 'b', 'c']);
		expect(six.children[0].name).toBe('Nombres');
		expect(six.children[0].children[0].name).toBe('Fractions');
	});

	it('un modèle de deux programmes apparaît dans les deux ; sans point → Hors programme', () => {
		const arbre = buildReviewTree(
			[
				modele('a', {
					points: [
						{ code: '1SPE-001', grade: '1_SPE' },
						{ code: '2-001', grade: '2' }
					]
				}),
				modele('h', { points: [] })
			],
			NOEUDS
		);
		expect(arbre.map((p) => p.key)).toEqual(['2', '1_SPE', 'hors-programme']);
		expect(findReviewNode(arbre, '2~s1')?.templateIds).toEqual(['a']);
		expect(findReviewNode(arbre, '1_SPE~s1')?.templateIds).toEqual(['a']);
		expect(findReviewNode(arbre, 'hors-programme~s1')?.templateIds).toEqual(['h']);
	});

	it('un modèle sans nœud (ou au nœud inconnu) va dans « Non rangé », en dernier', () => {
		const arbre = buildReviewTree(
			[modele('a', { nodeId: null }), modele('b', { nodeId: 'inconnu' }), modele('c')],
			NOEUDS
		);
		const six = arbre[0];
		expect(six.children.map((e) => e.name)).toEqual(['Nombres', 'Non rangé']);
		expect(findReviewNode(arbre, '6~non-range')?.templateIds).toEqual(['a', 'b']);
	});

	it('trie les branches par position', () => {
		const arbre = buildReviewTree(
			[modele('g', { nodeId: 'b2' }), modele('n', { nodeId: 's1' })],
			NOEUDS
		);
		expect(arbre[0].children.map((e) => e.name)).toEqual(['Nombres', 'Géométrie']);
	});

	it('templatesUnder rassemble les modèles du nœud et de ses descendants', () => {
		const arbre = buildReviewTree(
			[modele('n', { nodeId: 'n1' }), modele('s', { nodeId: 's1' })],
			NOEUDS
		);
		const branche = findReviewNode(arbre, '6~b1');
		expect(branche && templatesUnder(branche)).toEqual(['n', 's']);
	});
});

describe('changedSinceReview', () => {
	it('vrai seulement si le modèle a changé après le verdict', () => {
		const review = { verdict: 'valide' as const, comment: '', reviewedAt: '2026-10-05T00:00:00Z' };
		expect(changedSinceReview({ updatedAt: '2026-10-06T00:00:00Z', review })).toBe(true);
		expect(changedSinceReview({ updatedAt: '2026-10-04T00:00:00Z', review })).toBe(false);
		expect(changedSinceReview({ updatedAt: '2026-10-06T00:00:00Z', review: null })).toBe(false);
	});
});

describe('summaryAlerts, matchesFilters, parseFilters', () => {
	const review = { verdict: 'a_revoir' as const, comment: '', reviewedAt: '2026-10-05T00:00:00Z' };

	it('signale sans point, sans nœud, deux points d’un programme, modifié depuis le verdict', () => {
		expect(summaryAlerts(modele('a', { points: [], nodeId: null }))).toEqual([
			'sans point',
			'sans nœud'
		]);
		expect(
			summaryAlerts(
				modele('b', {
					points: [
						{ code: '6-001', grade: '6' },
						{ code: '6-002', grade: '6' }
					]
				})
			)
		).toEqual(['2 points de 6 (ADR 0020 : un par programme)']);
		expect(summaryAlerts(modele('c', { review, updatedAt: '2026-10-06T00:00:00Z' }))).toEqual([
			'modifié depuis le verdict'
		]);
	});

	it('filtre par verdict, statut et alertes', () => {
		const f = { ...DEFAULT_FILTERS };
		const aRevoir = modele('a', { review, updatedAt: '2026-10-01T00:00:00Z' });
		const sans = modele('s', { status: 'published' });
		expect(matchesFilters(aRevoir, { ...f, verdict: 'a_revoir' })).toBe(true);
		expect(matchesFilters(sans, { ...f, verdict: 'a_revoir' })).toBe(false);
		expect(matchesFilters(sans, { ...f, verdict: 'sans' })).toBe(true);
		expect(matchesFilters(aRevoir, { ...f, status: 'published' })).toBe(false);
		expect(matchesFilters(sans, { ...f, alertsOnly: true })).toBe(false);
	});

	it("lit les filtres de l'adresse, valeur inconnue = défaut", () => {
		expect(parseFilters(new URLSearchParams('verdict=a_revoir&statut=draft&alertes=1'))).toEqual({
			verdict: 'a_revoir',
			status: 'draft',
			alertsOnly: true
		});
		expect(parseFilters(new URLSearchParams('verdict=ok&statut=x'))).toEqual(DEFAULT_FILTERS);
	});
});
