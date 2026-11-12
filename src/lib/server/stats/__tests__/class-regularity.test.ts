/**
 * Grille de régularité (chantier `regularite`, P5) : élève × semaine, palier de
 * jours actifs. Comportements N1-N4, L1-L3, validés le 2026-11-12.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	activeDaysTier,
	buildRegularityGrid,
	getClassRegularityGrid,
	isAutonomousTrace,
	regularityFirstDay,
	weekStartOf,
	type RegularityTrace
} from '../class-regularity';

// Fonctions

/** `n` traces autonomes de l'élève, le même instant */
function traces(studentId: string, createdAt: string, n: number): RegularityTrace[] {
	return Array.from({ length: n }, () => ({
		student_id: studentId,
		created_at: createdAt,
		source: 'student_self',
		place: 'flash_cards'
	}));
}

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

describe('buildRegularityGrid', () => {
	const today = '2026-09-23'; // mercredi de la 4e semaine

	it('N1 : une colonne par semaine, de la rentrée à la semaine en cours', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: [],
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

	it('N3 : un jour actif = au moins 5 traces autonomes le même jour', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: [
				...traces('s1', '2026-09-08T09:00:00Z', 5), // lundi : actif
				...traces('s1', '2026-09-09T09:00:00Z', 4) // mardi : 4, pas actif
			],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 1, 0, 0]);
	});

	it('N3 : les contrôles et les traces du prof ne font pas un jour actif', () => {
		const controle = traces('s1', '2026-09-08T09:00:00Z', 5).map((t) => ({
			...t,
			source: 'auto',
			place: 'evaluation'
		}));
		const prof = traces('s1', '2026-09-08T09:00:00Z', 5).map((t) => ({
			...t,
			source: 'teacher',
			place: null
		}));
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: [...controle, ...prof],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 0, 0, 0]);
	});

	it('N2 : la semaine dit le palier du nombre de jours actifs', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: [
				// semaine du 07 : 3 jours actifs → palier 2
				...traces('s1', '2026-09-07T09:00:00Z', 5),
				...traces('s1', '2026-09-08T09:00:00Z', 5),
				...traces('s1', '2026-09-10T09:00:00Z', 6),
				// semaine du 14 : 4 jours actifs → palier 3
				...traces('s1', '2026-09-14T09:00:00Z', 5),
				...traces('s1', '2026-09-15T09:00:00Z', 5),
				...traces('s1', '2026-09-16T09:00:00Z', 5),
				...traces('s1', '2026-09-20T09:00:00Z', 5)
			],
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 2, 3, 0]);
	});

	it('N2 : la grille ne contient ni compte ni date de trace', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: traces('s1', '2026-09-08T09:00:00Z', 9),
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		const json = JSON.stringify(grid);
		expect(json).not.toContain('2026-09-08');
		expect(json).not.toMatch(/\b9\b/);
		expect(Object.keys(grid.students[0]).sort()).toEqual(['display_name', 'id', 'tiers']);
	});

	it('N3 : le jour est celui de Paris, pas celui d’UTC', () => {
		// dimanche 13 à 23 h 30 UTC = lundi 14 à 1 h 30 à Paris
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: traces('s1', '2026-09-13T23:30:00Z', 5),
			firstDay: '2026-09-02',
			today,
			holidays: []
		});
		expect(grid.students[0].tiers).toEqual([0, 0, 1, 0]);
	});

	it('ignore les traces d’avant la rentrée et celles d’un élève hors de la liste', () => {
		const grid = buildRegularityGrid({
			students: [ALICE],
			traces: [
				...traces('s1', '2026-08-20T09:00:00Z', 5),
				...traces('s9', '2026-09-08T09:00:00Z', 5)
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
			traces: traces('s1', '2026-09-15T09:00:00Z', 5),
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
			traces: traces('s2', '2026-09-22T09:00:00Z', 5),
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

/** Mock Supabase : chaque table rend son résultat au bout de la chaîne ; les appels sont relevés */
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
	return { from } as unknown as Parameters<typeof getClassRegularityGrid>[0];
}

/** Page de traces : la 1re page rend `rows`, les suivantes rien */
function pagedTraces(rows: RegularityTrace[]) {
	return (calls: Calls): QueryResult => {
		const ranges = calls.filter((c) => c.table === 'skill_attempts' && c.method === 'range');
		const [fromRow] = ranges[ranges.length - 1].args as number[];
		return { data: fromRow === 0 ? rows : [], error: null };
	};
}

const MEMBERS = {
	data: [
		{ student_id: 's2', profiles: { id: 's2', firstname: 'Bob', lastname: 'B' } },
		{ student_id: 's1', profiles: { id: 's1', firstname: 'Alice', lastname: 'A' } }
	],
	error: null
};

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
				skill_attempts: pagedTraces(traces('s1', '2026-09-08T09:00:00Z', 5))
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

	it('ne lit que les traces des élèves de la classe, aux sources de l’élève', async () => {
		const calls: Calls = [];
		const supabase = buildMock(
			{
				classes: () => ({ data: { school_id: null }, error: null }),
				class_members: () => MEMBERS,
				skill_attempts: pagedTraces([])
			},
			calls
		);
		await getClassRegularityGrid(supabase, 'class-1', now);
		const ins = calls.filter((c) => c.table === 'skill_attempts' && c.method === 'in');
		expect(ins).toContainEqual({
			table: 'skill_attempts',
			method: 'in',
			args: ['student_id', ['s2', 's1']]
		});
		expect(ins).toContainEqual({
			table: 'skill_attempts',
			method: 'in',
			args: ['source', ['auto', 'srs', 'student_self']]
		});
	});

	it('L1 : école sans année scolaire active → depuis le 1er septembre, sans vacances', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: 'school-1' }, error: null }),
			school_years: () => ({ data: [], error: null }),
			class_members: () => MEMBERS,
			skill_attempts: pagedTraces([])
		});
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.weeks[0]).toEqual({ start: '2026-08-31', holiday: false });
		expect(grid.weeks.every((w) => !w.holiday)).toBe(true);
	});

	it('lit toutes les pages de traces (plafond de 1000 lignes)', async () => {
		const page = traces('s1', '2026-09-08T09:00:00Z', 1000);
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => MEMBERS,
			skill_attempts: (calls) => {
				const ranges = calls.filter((c) => c.table === 'skill_attempts' && c.method === 'range');
				const [fromRow] = ranges[ranges.length - 1].args as number[];
				if (fromRow === 0) return { data: page, error: null };
				if (fromRow === 1000) return { data: traces('s1', '2026-09-15T09:00:00Z', 5), error: null };
				return { data: [], error: null };
			}
		});
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.students[0].tiers).toEqual([0, 1, 1, 0]);
	});

	it('classe vide → aucune ligne', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => ({ data: [], error: null })
		});
		const grid = await getClassRegularityGrid(supabase, 'class-1', now);
		expect(grid.students).toEqual([]);
		expect(grid.weeks.length).toBe(4);
	});

	it('E1 : traces illisibles → erreur, jamais une grille vide', async () => {
		const supabase = buildMock({
			classes: () => ({ data: { school_id: null }, error: null }),
			class_members: () => MEMBERS,
			skill_attempts: () => ({ data: null, error: { message: 'boom' } })
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
