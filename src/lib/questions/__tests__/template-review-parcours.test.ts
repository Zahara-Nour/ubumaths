import { describe, it, expect } from 'vitest';
import {
	DEFAULT_FILTERS,
	formatSeriesDuration,
	neighbourTemplates,
	notionOf,
	parseReviewView,
	pointsWithoutTemplate,
	seriesNotions,
	seriesTotals,
	type PointSummary,
	type TemplateSummary,
	type TreeNodeRow
} from '../template-review';

// Constantes

// Géométrie > Figures planes > { médiatrice, symétrie } ; Géométrie > Solides ; Nombres (branche seule)
const NOEUDS = new Map<string, TreeNodeRow>([
	['geo', { id: 'geo', name: 'Géométrie', parent_id: null, position: 2 }],
	['fig', { id: 'fig', name: 'Figures planes', parent_id: 'geo', position: 1 }],
	['med', { id: 'med', name: 'Médiatrice', parent_id: 'fig', position: 1 }],
	['sym', { id: 'sym', name: 'Symétrie', parent_id: 'fig', position: 2 }],
	['sol', { id: 'sol', name: 'Solides', parent_id: 'geo', position: 2 }],
	['cub', { id: 'cub', name: 'Cubes', parent_id: 'sol', position: 1 }],
	['nb', { id: 'nb', name: 'Nombres', parent_id: null, position: 1 }]
]);

// Functions

function modele(id: string, extra: Partial<TemplateSummary> = {}): TemplateSummary {
	return {
		id,
		title: id,
		status: 'published',
		level: 1,
		nodeId: 'med',
		updatedAt: '2026-10-01T00:00:00Z',
		points: [{ code: '6-001', grade: '6' }],
		review: null,
		...extra
	};
}

function point(code: string, extra: Partial<PointSummary> = {}): PointSummary {
	return {
		code,
		grade: '6',
		name: `point ${code}`,
		nodeId: 'med',
		archived: false,
		tagged: false,
		...extra
	};
}

function parId(templates: TemplateSummary[]): Map<string, TemplateSummary> {
	return new Map(templates.map((t) => [t.id, t]));
}

describe('notionOf', () => {
	it("rend la notion (2e étage) d'une sous-notion ou d'une notion", () => {
		expect(notionOf('med', NOEUDS)).toBe('fig');
		expect(notionOf('fig', NOEUDS)).toBe('fig');
	});

	it('rend null pour une branche seule ou un nœud inconnu', () => {
		expect(notionOf('nb', NOEUDS)).toBeNull();
		expect(notionOf('inconnu', NOEUDS)).toBeNull();
	});
});

describe('seriesNotions', () => {
	it("rend les notions des modèles de la série, sans doublon, dans l'ordre de la série", () => {
		const byId = parId([
			modele('a', { nodeId: 'cub' }),
			modele('b', { nodeId: 'med' }),
			modele('c', { nodeId: 'sym' })
		]);
		expect(seriesNotions(['a', 'b', 'c'], byId, NOEUDS)).toEqual([
			{ id: 'sol', name: 'Solides' },
			{ id: 'fig', name: 'Figures planes' }
		]);
	});

	it('ignore les modèles introuvables, non rangés ou rangés dans une branche seule', () => {
		const byId = parId([modele('a', { nodeId: null }), modele('b', { nodeId: 'nb' })]);
		expect(seriesNotions(['a', 'b', 'disparu'], byId, NOEUDS)).toEqual([]);
	});
});

describe('neighbourTemplates', () => {
	const templates = [
		modele('serie1', { nodeId: 'med' }),
		modele('voisin-sym', { nodeId: 'sym', title: 'B symétrie' }),
		modele('voisin-med', { nodeId: 'med', title: 'Z médiatrice' }),
		modele('voisin-notion', { nodeId: 'fig', title: 'A notion' }),
		modele('autre-notion', { nodeId: 'cub' }),
		modele('cinquieme', { nodeId: 'med', points: [{ code: '5-010', grade: '5' }] }),
		modele('sans-point', { nodeId: 'med', points: [] }),
		modele('deux-niveaux', {
			nodeId: 'sym',
			title: 'C deux niveaux',
			points: [
				{ code: '5-011', grade: '5' },
				{ code: '6-002', grade: '6' }
			]
		})
	];

	it("rend les modèles du niveau de la série dans ses notions, absents de la série, dans l'ordre de l'arbre", () => {
		expect(
			neighbourTemplates({
				seriesTemplateIds: ['serie1'],
				notionIds: ['fig'],
				templates,
				nodes: NOEUDS,
				grade: '6',
				filters: DEFAULT_FILTERS
			})
		).toEqual(['voisin-notion', 'voisin-med', 'voisin-sym', 'deux-niveaux']);
	});

	it('applique les filtres de la vue', () => {
		const filtres = { ...DEFAULT_FILTERS, title: 'symétrie' };
		expect(
			neighbourTemplates({
				seriesTemplateIds: ['serie1'],
				notionIds: ['fig'],
				templates,
				nodes: NOEUDS,
				grade: '6',
				filters: filtres
			})
		).toEqual(['voisin-sym']);
	});

	it('rend une liste vide sans notion', () => {
		expect(
			neighbourTemplates({
				seriesTemplateIds: [],
				notionIds: [],
				templates,
				nodes: NOEUDS,
				grade: '6',
				filters: DEFAULT_FILTERS
			})
		).toEqual([]);
	});
});

describe('pointsWithoutTemplate', () => {
	it('rend les points du niveau, dans ces notions, sans aucun modèle et non archivés, par code', () => {
		const points = [
			point('6-003', { nodeId: 'sym' }),
			point('6-001', { nodeId: 'fig' }),
			point('6-002', { tagged: true }),
			point('6-004', { archived: true }),
			point('5-001', { grade: '5' }),
			point('6-005', { nodeId: 'cub' }),
			point('6-006', { nodeId: null })
		];
		expect(pointsWithoutTemplate(points, ['fig'], NOEUDS, '6')).toEqual([
			{ code: '6-001', name: 'point 6-001' },
			{ code: '6-003', name: 'point 6-003' }
		]);
	});
});

describe('seriesTotals et formatSeriesDuration', () => {
	it('additionne les questions et leurs durées', () => {
		expect(
			seriesTotals([
				{ quantity: 2, delay: 60 },
				{ quantity: 3, delay: 90 }
			])
		).toEqual({ questions: 5, seconds: 390 });
		expect(seriesTotals([])).toEqual({ questions: 0, seconds: 0 });
	});

	it('écrit une durée en minutes et secondes', () => {
		expect(formatSeriesDuration(45)).toBe('45 s');
		expect(formatSeriesDuration(60)).toBe('1 min');
		expect(formatSeriesDuration(90)).toBe('1 min 30');
		expect(formatSeriesDuration(1020)).toBe('17 min');
		expect(formatSeriesDuration(65)).toBe('1 min 05');
	});
});

describe('parseReviewView', () => {
	it('« fiches » seulement si demandé, « parcours » sinon', () => {
		expect(parseReviewView(new URLSearchParams('vue=fiches'))).toBe('fiches');
		expect(parseReviewView(new URLSearchParams('vue=parcours'))).toBe('parcours');
		expect(parseReviewView(new URLSearchParams(''))).toBe('parcours');
		expect(parseReviewView(new URLSearchParams('vue=autre'))).toBe('parcours');
	});
});
