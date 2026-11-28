/**
 * Grille de régularité (chantier `regularite`, P5) : élève × semaine, palier de
 * jours actifs. Comportements N1-N4, L1-L3, validés le 2026-11-12.
 *
 * Depuis `regularite-sql`, la base compte les jours actifs
 * (`class_regularity_weeks`) : jour de Paris, seuil de 5 traces, contrôles
 * exclus sont prouvés par `tests/integration/regularite-comptee-en-base.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	activeDaysTier,
	buildRegularityGrid,
	countActiveWeeks,
	getClassRegularityGrid,
	isAutonomousTrace,
	regularityFirstDay,
	weekStartOf,
	type RegularityWeekCount
} from '../class-regularity';

// Constantes

const ALICE = { id: 's1', display_name: 'Alice' };
const BOB = { id: 's2', display_name: 'Bob' };

describe('weekStartOf', () => {
	it('rend le lundi de la semaine (lundi → dimanche)', () => {
		expect(weekStartOf('2026-11-12')).toBe('2026-11-09'); // jeudi
		expect(weekStartOf('2026-11-09')).toBe('2026-11-09'); // lundi
		expect(weekStartOf('2026-11-15')).toBe('2026-11-09'); // dimanche
		expect(weekStartOf('2026-09-01')).toBe('2026-08-31'); // mardi, lundi en août
	});
});

describe('activeDaysTier (N2)', () => {
	it('0 → 0 · 1 → 1 · 2-3 → 2 · 4+ → 3', () => {
		expect([0, 1, 2, 3, 4, 5, 7].map(activeDaysTier)).toEqual([0, 1, 2, 2, 3, 3, 3]);
	});
});

describe('isAutonomousTrace (N3, R6)', () => {
	it('compte les formes autonomes et la révision', () => {
		for (const place of ['flash_cards', 'typing', 'mock_test', 'number_race', 'review']) {
			expect(isAutonomousTrace({ source: 'student_self', place })).toBe(true);
		}
		expect(isAutonomousTrace({ source: 'auto', place: 'typing' })).toBe(true);
		expect(isAutonomousTrace({ source: 'srs', place: 'review' })).toBe(true);
	});

	it('écarte les contrôles et les traces du prof', () => {
		expect(isAutonomousTrace({ source: 'auto', place: 'evaluation' })).toBe(false);
		expect(isAutonomousTrace({ source: 'teacher', place: null })).toBe(false);
	});

	it('R6 : une trace sans lieu (avant formes-de-serie) compte', () => {
		expect(isAutonomousTrace({ source: 'student_self', place: null })).toBe(true);
	});
});

describe('regularityFirstDay (N1, L1)', () => {
	const now = new Date('2026-11-12T10:00:00Z');

	it("N1 : la rentrée de l'année scolaire active", () => {
		expect(regularityFirstDay('2026-09-02', now)).toBe('2026-09-02');
	});

	it('L1 : sans année scolaire, le 1er septembre de l’année en cours', () => {
		expect(regularityFirstDay(null, now)).toBe('2026-09-01');
		expect(regularityFirstDay(null, new Date('2027-02-03T10:00:00Z'))).toBe('2026-09-01');
	});

	it('une rentrée à venir retombe sur le 1er septembre écoulé', () => {
		expect(regularityFirstDay('2027-09-01', now)).toBe('2026-09-01');
	});
});

describe('countActiveWeeks (suivi d’un élève : mêmes règles que la base)', () => {
	/** n traces autonomes de l'élève s1 à l'instant UTC donné */
	function traces(n: number, at: string, extra: { source?: string; place?: string | null } = {}) {
		return Array.from({ length: n }, () => ({
			student_id: 's1',
			created_at: at,
			source: extra.source ?? 'auto',
			place: extra.place === undefined ? 'typing' : extra.place
		}));
	}

	it('un jour à 5 traces est actif, un jour à 4 ne l’est pas', () => {
		const result = countActiveWeeks(
			[...traces(5, '2026-11-10T10:00:00Z'), ...traces(4, '2026-11-11T10:00:00Z')],
			'2026-09-01'
		);
		expect(result).toEqual([{ student_id: 's1', week_start: '2026-11-09', active_days: 1 }]);
	});

	it('compte les jours actifs par semaine (lundi → dimanche)', () => {
		const result = countActiveWeeks(
			[
				...traces(5, '2026-11-09T10:00:00Z'),
				...traces(5, '2026-11-15T10:00:00Z'),
				...traces(5, '2026-11-16T10:00:00Z')
			],
			'2026-09-01'
		);
		expect(result).toEqual(
			expect.arrayContaining([
				{ student_id: 's1', week_start: '2026-11-09', active_days: 2 },
				{ student_id: 's1', week_start: '2026-11-16', active_days: 1 }
			])
		);
		expect(result).toHaveLength(2);
	});

	it('jour de Paris : 23 h 30 UTC un dimanche tombe le lundi suivant', () => {
		const result = countActiveWeeks(traces(5, '2026-11-15T23:30:00Z'), '2026-09-01');
		expect(result).toEqual([{ student_id: 's1', week_start: '2026-11-16', active_days: 1 }]);
	});

	it('écarte les contrôles et les traces du prof ; une trace sans lieu compte', () => {
		const result = countActiveWeeks(
			[
				...traces(3, '2026-11-10T10:00:00Z', { place: 'evaluation' }),
				...traces(3, '2026-11-10T10:00:00Z', { source: 'teacher' }),
				...traces(4, '2026-11-10T10:00:00Z', { place: null })
			],
			'2026-09-01'
		);
		expect(result).toEqual([]);
		expect(
			countActiveWeeks(traces(5, '2026-11-10T10:00:00Z', { place: null }), '2026-09-01')
		).toHaveLength(1);
	});

	it('ignore les jours avant la rentrée', () => {
		expect(countActiveWeeks(traces(5, '2026-08-31T10:00:00Z'), '2026-09-01')).toEqual([]);
	});
});

describe('buildRegularityGrid', () => {
	const today = '2026-09-23'; // mercredi de la 4e semaine

	/** Jours actifs comptés par la base (`class_regularity_weeks`) */
	function week(studentId: string, weekStart: string, activeDays: number): RegularityWeekCount {
		return { student_id: studentId, week_start: weekStart, active_days: activeDays };
	}

	it('N1 : une colonne par semaine, de la rentrée à la semaine en cours', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			activeWeeks: [],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.weeks.map((w) => w.start)).toEqual([
			'2026-08-31',
			'2026-09-07',
			'2026-09-14',
			'2026-09-21'
		]);
		expect(grid.students).toEqual([{ id: 's1', display_name: 'Alice', tiers: [0, 0, 0, 0] }]);
	});

	it('N2 : la semaine dit le palier du nombre de jours actifs', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			activeWeeks: [week('s1', '2026-09-07', 3), week('s1', '2026-09-14', 4)],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 2, 3, 0]);
	});

	it('N2 : la grille ne contient ni compte ni date de jour actif', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			activeWeeks: [week('s1', '2026-09-07', 7)],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		const json = JSON.stringify(grid);
		expect(json).not.toMatch(/\b7\b/);
		expect(Object.keys(grid.students[0]).sort()).toEqual(['display_name', 'id', 'tiers']);
	});

	it('ignore une semaine hors de la grille et un élève hors de la liste', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			activeWeeks: [
				week('s1', '2026-08-24', 2),
				week('s1', '2026-09-28', 2),
				week('s9', '2026-09-07', 2)
			],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 0, 0, 0]);
	});

	it('N4 : une semaine qui touche des vacances porte le repère, et se colore quand même', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			activeWeeks: [week('s1', '2026-09-14', 1)],
			firstDay: '2026-09-02',
			today,
			// du samedi 12 au mardi 15 : touche les semaines du 07 et du 14
			holidays: [{ start_date: '2026-09-12', end_date: '2026-09-15' }]
		});
		expect(grid.weeks.map((w) => w.holiday)).toEqual([false, true, true, false]);
		expect(grid.students[0].tiers).toEqual([0, 0, 1, 0]);
	});

	it('L2 : un élève arrivé en cours d’année a des semaines vides avant', () => {
		const grid = buildRegularityGrid({
			students: [ALICE, BOB],
			activeWeeks: [week('s2', '2026-09-21', 1)],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students.find((s) => s.id === 's2')?.tiers).toEqual([0, 0, 0, 1]);
	});
});

// =============================================================================
// getClassRegularityGrid : lecture
// =============================================================================

type QueryResult = { data: unknown; error: unknown };
type Calls = { table: string; method: string; args: unknown[] }[];

/**
 * Mock Supabase : chaque table (ou fonction, préfixe `rpc:`) rend son résultat
 * au bout de la chaîne ; les appels sont relevés
 */
function buildMock(handlers: Record<string, (calls: Calls) => QueryResult>, calls: Calls = []) {
	const from = vi.fn().mockImplementation((table: string) => {
		const handler = handlers[table];
		if (!handler) throw new Error(`Table inattendue : ${table}`);
		const builder: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'range', 'limit']) {
			builder[method] = (...args: unknown[]) => {
				calls.push({ table, method, args });
				return builder;
			};
		}
		builder.maybeSingle = () => Promise.resolve(handler(calls));
		builder.then = (onFulfilled: (v: QueryResult) => unknown) =>
			Promise.resolve(handler(calls)).then(onFulfilled);
		return builder;
	});
	const rpc = vi.fn().mockImplementation((fn: string, args: unknown) => {
		const handler = handlers[`rpc:${fn}`];
		if (!handler) throw new Error(`Fonction inattendue : ${fn}`);
		calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] });
		return Promise.resolve(handler(calls));
	});
	return { from, rpc } as unknown as Parameters<typeof getClassRegularityGrid>[0];
}

const MEMBERS = {
	data: [
		{ student_id: 's2', profiles: { id: 's2', firstname: 'Bob', lastname: 'B' } },
		{ student_id: 's1', profiles: { id: 's1', firstname: 'Alice', lastname: 'A' } }
	],
	error: null
};

const RPC = 'rpc:class_regularity_weeks';

describe('getClassRegularityGrid', () => {
	const now = new Date('2026-09-23T10:00:00Z');

	it("lit la rentrée et les vacances de l'année active de l'école", async () => {
		const calls: Calls = [];
		const supabase = buildMock(
			{
				classes: () => ({ data: { school_id: 'school-1' }, error: null }),
				school_years: () => ({
					data: [{ id: 'y1', start_date: '2026-09-02' }],
					error: null
				}),
				school_holidays: () => ({
					data: [{ start_date: '2026-09-12', end_date: '2026-09-15' }],
					error: null
				}),
				class_members: () => MEMBERS,
				[RPC]: () => ({
					data: [{ student_id: 's1', week_start: '2026-09-07', active_days: 1 }],
					error: null
				})
			},
			calls
		);
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.weeks.map((w) => [w.start, w.holiday])).toEqual([
			['2026-08-31', false],
			['2026-09-07', true],
			['2026-09-14', true],
			['2026-09-21', false]
		]);
		// élèves triés par nom
		expect(grid.students.map((s) => [s.display_name, s.tiers])).toEqual([
			['Alice A', [0, 1, 0, 0]],
			['Bob B', [0, 0, 0, 0]]
		]);
		expect(calls).toContainEqual({
			table: 'school_years',
			method: 'eq',
			args: ['school_id', 'school-1']
		});
		expect(calls).toContainEqual({
			table: 'school_holidays',
			method: 'eq',
			args: ['school_year_id', 'y1']
		});
	});

	it('fait compter la base : classe, rentrée et seuil de 5 traces, sans lire une trace', async () => {
		const calls: Calls = [];
		const supabase = buildMock(
			{
				classes: () => ({ data: { school_id: 'school-1' }, error: null }),
				school_years: () => ({
					data: [{ id: 'y1', start_date: '2026-09-02' }],
					error: null
				}),
				school_holidays: () => ({ data: [], error: null }),
				class_members: () => MEMBERS,
				[RPC]: () => ({ data: [], error: null })
			},
			calls
		);
		await getClassRegularityGrid(supabase, 'class-1', now);
		expect(calls.filter((c) => c.method === 'rpc')).toEqual([
			{
				table: RPC,
				method: 'rpc',
				args: [{ p_class_id: 'class-1', p_first_day: '2026-09-02', p_min_traces: 5 }]
			}
		]);
		expect(calls.some((c) => c.table === 'skill_attempts')).toBe(false);
	});

	it('L1 : école sans année scolaire active → depuis le 1er septembre, sans vacances', async () => {
		const calls: Calls = [];
		const supabase = buildMock(
			{
				classes: () => ({ data: { school_id: 'school-1' }, error: null }),
				school_years: () => ({ data: [], error: null }),
				class_members: () => MEMBERS,
				[RPC]: () => ({ data: [], error: null })
			},
			calls
		);
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.weeks[0]).toEqual({ start: '2026-08-31', holiday: false });
		expect(grid.weeks.every((w) => !w.holiday)).toBe(true);
		expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
			{ p_class_id: 'class-1', p_first_day: '2026-09-01', p_min_traces: 5 }
		]);
	});

	it('classe vide → aucune ligne, sans appeler la base', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => ({ data: [], error: null })
		});
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.students).toEqual([]);
		expect(grid.weeks.length).toBe(4);
	});

	it('E1 : comptes illisibles → erreur, jamais une grille vide', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => MEMBERS,
			[RPC]: () => ({ data: null, error: { message: 'boom' } })
		});
		await expect(getClassRegularityGrid(supabase, 'class-1', now)).rejects.toThrow();
	});

	it('E1 : élèves illisibles → erreur', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => ({ data: null, error: { message: 'boom' } })
		});
		await expect(getClassRegularityGrid(supabase, 'class-1', now)).rejects.toThrow();
	});
});
