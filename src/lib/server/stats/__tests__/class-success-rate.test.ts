/**
 * Taux de réussite de la classe par point et par notion (chantier
 * `taux-par-point`, besoin P3) : calcul pur, puis lecture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProgrammePointRow } from '$lib/utils/programme-tree';
import type { PlacedCurriculumPoint } from '$lib/server/stats/class-knowledge';

const { placeInTree } = vi.hoisted(() => ({ placeInTree: vi.fn() }));

vi.mock('$lib/server/stats/class-knowledge', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/stats/class-knowledge')>();
	return { ...original, placeInTree };
});

import {
	buildClassSuccessRates,
	getClassSuccessRates,
	pointsOfTemplates,
	type TemplateSuccessCount
} from '../class-success-rate';

// =============================================================================
// Données
// =============================================================================

function point(id: string, overrides: Partial<ProgrammePointRow> = {}): ProgrammePointRow {
	return {
		id,
		node_id: `node-${id}`,
		code: id,
		name: `Point ${id}`,
		grade: '5e',
		display_order: 0,
		archived_at: null,
		...overrides
	} as ProgrammePointRow;
}

function placed(
	id: string,
	notion: string | null,
	branch: string | null = notion ? 'Nombres' : null
): PlacedCurriculumPoint {
	return {
		id,
		name: `Point ${id}`,
		notion_id: notion ? `notion-${notion}` : null,
		notion_name: notion,
		branch_name: branch
	};
}

function count(
	student: string,
	template: string,
	proved_done: number,
	proved_succeeded: number,
	declared_done = 0
): TemplateSuccessCount {
	return {
		student_id: student,
		template_id: template,
		proved_done,
		proved_succeeded,
		declared_done
	};
}

const ONE_POINT = new Map([['T1', ['P1']]]);

// =============================================================================
// buildClassSuccessRates
// =============================================================================

describe('buildClassSuccessRates', () => {
	it('classe sans réponse → aucune notion', () => {
		expect(
			buildClassSuccessRates({
				counts: [],
				pointsByTemplate: ONE_POINT,
				placed: [placed('P1', 'Fractions')]
			})
		).toEqual({ notions: [] });
	});

	it('Q3 : chaque élève pèse autant (moyenne des taux, pas toutes les réponses ensemble)', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 1, 1), count('B', 'T1', 1, 1), count('C', 'T1', 8, 0)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		const p1 = rates.notions[0].points[0];
		// (1 + 1 + 0) / 3, et non 2 / 10
		expect(p1.rate).toBeCloseTo(2 / 3);
		expect(p1.students).toBe(3);
		expect(p1.onlyDeclared).toBe(false);
		expect(rates.notions[0].rate).toBeCloseTo(2 / 3);
	});

	it('Q5 : moins de 3 élèves → pas de taux, le nombre d’élèves reste', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 4, 4), count('B', 'T1', 2, 1)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates.notions[0].points[0]).toMatchObject({
			rate: null,
			students: 2,
			onlyDeclared: false
		});
		expect(rates.notions[0]).toMatchObject({ rate: null, students: 2 });
	});

	it('Q2 : le déclaré ne compte pas dans le taux', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 2, 2, 10), count('B', 'T1', 2, 0, 10), count('C', 'T1', 2, 1, 10)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates.notions[0].points[0].rate).toBeCloseTo(0.5);
	});

	it('Q2 : un élève qui n’a que du déclaré n’entre pas dans le taux', () => {
		const rates = buildClassSuccessRates({
			counts: [
				count('A', 'T1', 1, 1),
				count('B', 'T1', 1, 1),
				count('C', 'T1', 1, 0),
				count('D', 'T1', 0, 0, 5)
			],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates.notions[0].points[0]).toMatchObject({ students: 3 });
		expect(rates.notions[0].points[0].rate).toBeCloseTo(2 / 3);
	});

	it('Q2 : point seulement déclaré → mention, pas de taux', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 0, 0, 3), count('B', 'T1', 0, 0, 1)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates.notions[0].points[0]).toEqual({
			id: 'P1',
			name: 'Point P1',
			rate: null,
			students: 0,
			onlyDeclared: true
		});
		expect(rates.notions[0]).toMatchObject({ rate: null, students: 0, onlyDeclared: true });
	});

	it('ligne sans aucune réponse comptée (origine inconnue) → point absent', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 0, 0, 0)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates).toEqual({ notions: [] });
	});

	it('modèle sans point vivant → ignoré', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T9', 3, 3)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions')]
		});
		expect(rates).toEqual({ notions: [] });
	});

	it('notion : un modèle lié à deux points de la même notion compte une seule fois', () => {
		// T1 → P1 et P2 (même notion) ; T2 → P1 seulement
		const pointsByTemplate = new Map([
			['T1', ['P1', 'P2']],
			['T2', ['P1']]
		]);
		const counts = ['A', 'B', 'C'].flatMap((s) => [count(s, 'T1', 2, 0), count(s, 'T2', 2, 2)]);
		const rates = buildClassSuccessRates({
			counts,
			pointsByTemplate,
			placed: [placed('P1', 'Fractions'), placed('P2', 'Fractions')]
		});
		const notion = rates.notions[0];
		// 2 justes sur 4 réponses ; compté deux fois, T1 donnerait 2 sur 6
		expect(notion.rate).toBeCloseTo(0.5);
		expect(notion.students).toBe(3);
		expect(notion.points.map((p) => [p.id, p.rate])).toEqual([
			['P1', 0.5],
			['P2', 0]
		]);
	});

	it('ordre de l’arbre : notions puis points dans l’ordre rangé ; point non placé en dernier', () => {
		const pointsByTemplate = new Map([
			['T1', ['P1']],
			['T2', ['P2']],
			['T3', ['P3']],
			['T4', ['P4']]
		]);
		const counts = ['T1', 'T2', 'T3', 'T4'].map((t) => count('A', t, 1, 1));
		const rates = buildClassSuccessRates({
			counts,
			pointsByTemplate,
			placed: [
				placed('P3', 'Calcul littéral', 'Algèbre'),
				placed('P1', 'Fractions'),
				placed('P2', 'Fractions'),
				placed('P4', null)
			]
		});
		expect(rates.notions.map((n) => [n.name, n.branch_name, n.points.map((p) => p.id)])).toEqual([
			['Calcul littéral', 'Algèbre', ['P3']],
			['Fractions', 'Nombres', ['P1', 'P2']],
			[null, null, ['P4']]
		]);
	});

	it('point rangé sans réponse comptée → absent de sa notion', () => {
		const rates = buildClassSuccessRates({
			counts: [count('A', 'T1', 1, 1)],
			pointsByTemplate: ONE_POINT,
			placed: [placed('P1', 'Fractions'), placed('P2', 'Fractions')]
		});
		expect(rates.notions[0].points.map((p) => p.id)).toEqual(['P1']);
	});
});

// =============================================================================
// pointsOfTemplates
// =============================================================================

describe('pointsOfTemplates', () => {
	it('écarte les points archivés et les anciens points (sans niveau)', () => {
		const { pointsByTemplate, points } = pointsOfTemplates(
			[
				{ template_id: 'T1', point_id: 'P1', curriculum_points: point('P1') },
				{
					template_id: 'T1',
					point_id: 'P2',
					curriculum_points: point('P2', { archived_at: '2026-01-01' })
				},
				{ template_id: 'T1', point_id: 'P3', curriculum_points: point('P3', { grade: null }) },
				{ template_id: 'T2', point_id: 'P4', curriculum_points: null }
			],
			'5e'
		);
		expect(pointsByTemplate).toEqual(new Map([['T1', ['P1']]]));
		expect(points.map((p) => p.id)).toEqual(['P1']);
	});

	it('modèle partagé entre deux niveaux : seuls les points du niveau de la classe', () => {
		const { pointsByTemplate, points } = pointsOfTemplates(
			[
				{ template_id: 'T1', point_id: 'P5', curriculum_points: point('P5', { grade: '5e' }) },
				{ template_id: 'T1', point_id: 'P4', curriculum_points: point('P4', { grade: '4e' }) },
				// Modèle du seul niveau 4e : gardé (la classe l'a travaillé)
				{ template_id: 'T2', point_id: 'P6', curriculum_points: point('P6', { grade: '4e' }) }
			],
			'5e'
		);
		expect(pointsByTemplate).toEqual(
			new Map([
				['T1', ['P5']],
				['T2', ['P6']]
			])
		);
		expect(points.map((p) => p.id)).toEqual(['P5', 'P6']);
	});

	it('un point lié à deux modèles n’apparaît qu’une fois', () => {
		const { points } = pointsOfTemplates(
			[
				{ template_id: 'T1', point_id: 'P1', curriculum_points: point('P1') },
				{ template_id: 'T2', point_id: 'P1', curriculum_points: point('P1') }
			],
			'5e'
		);
		expect(points.map((p) => p.id)).toEqual(['P1']);
	});
});

// =============================================================================
// getClassSuccessRates : lecture
// =============================================================================

type QueryResult = { data: unknown; error: unknown };
type Call = { table: string; method: string; args: unknown[] };

/**
 * Mock Supabase : chaque table (ou fonction, préfixe `rpc:`) rend son résultat
 * au bout de la chaîne ; les appels sont relevés
 */
function buildMock(handlers: Record<string, (calls: Call[]) => QueryResult>, calls: Call[] = []) {
	function chain(table: string) {
		const handler = handlers[table];
		if (!handler) throw new Error(`Table inattendue : ${table}`);
		const builder: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'order', 'range']) {
			builder[method] = (...args: unknown[]) => {
				calls.push({ table, method, args });
				return builder;
			};
		}
		builder.maybeSingle = () => Promise.resolve(handler(calls));
		builder.then = (
			onFulfilled: (v: QueryResult) => unknown,
			onRejected?: (e: unknown) => unknown
		) =>
			Promise.resolve()
				.then(() => handler(calls))
				.then(onFulfilled, onRejected);
		return builder;
	}
	const from = vi.fn().mockImplementation((table: string) => chain(table));
	const rpc = vi.fn().mockImplementation((fn: string, args: unknown) => {
		const builder = chain(`rpc:${fn}`);
		calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] });
		return builder;
	});
	return { from, rpc } as unknown as Parameters<typeof getClassSuccessRates>[0];
}

const RPC = 'rpc:class_template_success';
const NOW = new Date('2026-11-14T10:00:00Z');

/** Une page de la RPC selon le dernier `range` demandé */
function pageOf(rows: TemplateSuccessCount[]) {
	return (calls: Call[]): QueryResult => {
		const range = calls.filter((c) => c.table === RPC && c.method === 'range').at(-1);
		const [from, to] = (range?.args ?? [0, rows.length - 1]) as [number, number];
		return { data: rows.slice(from, to + 1), error: null };
	};
}

function schoolHandlers(counts: (calls: Call[]) => QueryResult) {
	return {
		classes: () => ({ data: { school_id: 'school-1', grade: '5e' }, error: null }),
		school_years: () => ({ data: [{ id: 'y1', start_date: '2026-09-01' }], error: null }),
		school_holidays: () => ({ data: [], error: null }),
		[RPC]: counts,
		question_template_points: () => ({
			data: [{ template_id: 'T1', point_id: 'P1', curriculum_points: point('P1') }],
			error: null
		})
	};
}

describe('getClassSuccessRates', () => {
	beforeEach(() => {
		placeInTree.mockReset();
		placeInTree.mockImplementation(async (_sb: unknown, points: ProgrammePointRow[]) =>
			points.map((p) => placed(p.id, 'Fractions'))
		);
	});

	it('Q4 : fait compter la base depuis la rentrée de l’école, sans lire une trace', async () => {
		const calls: Call[] = [];
		const supabase = buildMock(
			schoolHandlers(pageOf(['A', 'B', 'C'].map((s) => count(s, 'T1', 2, 1)))),
			calls
		);
		const rates = await getClassSuccessRates(supabase, 'class-1', NOW);
		expect(calls.filter((c) => c.method === 'rpc')[0].args).toEqual([
			{ p_class_id: 'class-1', p_first_day: '2026-09-01' }
		]);
		expect(calls.some((c) => c.table === 'skill_attempts')).toBe(false);
		expect(rates.notions[0].points[0]).toMatchObject({ id: 'P1', students: 3 });
		expect(rates.notions[0].points[0].rate).toBeCloseTo(0.5);
	});

	it('lit les comptes par pages (plafond de 1000 lignes de PostgREST)', async () => {
		const calls: Call[] = [];
		const rows = Array.from({ length: 1500 }, (_, i) => count(`S${i}`, 'T1', 1, 1));
		const supabase = buildMock(schoolHandlers(pageOf(rows)), calls);
		const rates = await getClassSuccessRates(supabase, 'class-1', NOW);
		expect(calls.filter((c) => c.table === RPC && c.method === 'range').map((c) => c.args)).toEqual(
			[
				[0, 999],
				[1000, 1999]
			]
		);
		expect(rates.notions[0].points[0].students).toBe(1500);
	});

	it('aucune réponse → aucune notion, sans lire les points', async () => {
		const calls: Call[] = [];
		const supabase = buildMock(schoolHandlers(pageOf([])), calls);
		expect(await getClassSuccessRates(supabase, 'class-1', NOW)).toEqual({ notions: [] });
		expect(calls.some((c) => c.table === 'question_template_points')).toBe(false);
	});

	it('E1 : comptes illisibles → erreur, jamais une liste vide', async () => {
		const supabase = buildMock(schoolHandlers(() => ({ data: null, error: { message: 'boom' } })));
		await expect(getClassSuccessRates(supabase, 'class-1', NOW)).rejects.toThrow();
	});

	it('E1 : liens modèle → point illisibles → erreur', async () => {
		const supabase = buildMock({
			...schoolHandlers(pageOf([count('A', 'T1', 1, 1)])),
			question_template_points: () => ({ data: null, error: { message: 'boom' } })
		});
		await expect(getClassSuccessRates(supabase, 'class-1', NOW)).rejects.toThrow();
	});

	it('E1 : classe illisible → erreur', async () => {
		const supabase = buildMock({
			...schoolHandlers(pageOf([])),
			classes: () => ({ data: null, error: { message: 'boom' } })
		});
		await expect(getClassSuccessRates(supabase, 'class-1', NOW)).rejects.toThrow();
	});
});
