/**
 * Tests pour `src/lib/server/stats/class-competence.ts`.
 *
 * Couvre les 2 fonctions famille B avec un mock Supabase qui dispatche
 * sur le nom de la table.
 */

import { describe, it, expect, vi } from 'vitest';
import { getClassCompetenceGrid, getClassTopObservablesToConsolidate } from '../class-competence';

type QueryResult = { data: unknown; error: unknown };
type TableHandler = () => Promise<QueryResult> | QueryResult;
type MockSpec = Record<string, TableHandler>;

function buildMock(tableHandlers: MockSpec) {
	const fromMock = vi.fn().mockImplementation((table: string) => {
		const handler = tableHandlers[table];
		if (!handler) {
			throw new Error(`Unexpected table in mock: ${table}`);
		}
		const terminalPromise = Promise.resolve().then(handler);
		const queryBuilder = {
			select: vi.fn(),
			eq: vi.fn(),
			in: vi.fn(),
			not: vi.fn(),
			gte: vi.fn(),
			order: vi.fn(),
			maybeSingle: vi.fn(),
			single: vi.fn(),
			then: (onFulfilled: (value: QueryResult) => unknown) => terminalPromise.then(onFulfilled)
		};
		queryBuilder.select.mockReturnValue(queryBuilder);
		queryBuilder.eq.mockReturnValue(queryBuilder);
		queryBuilder.in.mockReturnValue(queryBuilder);
		queryBuilder.not.mockReturnValue(queryBuilder);
		queryBuilder.gte.mockReturnValue(queryBuilder);
		queryBuilder.order.mockReturnValue(queryBuilder);
		queryBuilder.maybeSingle.mockImplementation(handler);
		queryBuilder.single.mockImplementation(handler);
		return queryBuilder;
	});
	return { from: fromMock } as unknown as Parameters<typeof getClassCompetenceGrid>[0];
}

// =============================================================================
// getClassCompetenceGrid
// =============================================================================

describe('getClassCompetenceGrid', () => {
	const mathCompetences = [
		{ id: 'c1', code: 'CHER', name: 'Chercher', display_order: 1 },
		{ id: 'c2', code: 'MOD', name: 'Modéliser', display_order: 2 },
		{ id: 'c3', code: 'REP', name: 'Représenter', display_order: 3 },
		{ id: 'c4', code: 'RAI', name: 'Raisonner', display_order: 4 },
		{ id: 'c5', code: 'CAL', name: 'Calculer', display_order: 5 },
		{ id: 'c6', code: 'COM', name: 'Communiquer', display_order: 6 }
	];

	it('returns empty when no students in class', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null }),
			math_competences: () => ({ data: mathCompetences, error: null })
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		expect(grid.students).toEqual([]);
		expect(grid.competences.length).toBe(6);
		expect(grid.cells).toEqual({});
		expect(grid.last_saisie_at).toBeNull();
	});

	it('returns null for cells when no saisie exists', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'Alice', last_name: '' } }],
				error: null
			}),
			math_competences: () => ({ data: mathCompetences, error: null }),
			student_competence_level: () => ({ data: [], error: null })
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		expect(grid.cells['s1:c1']).toBeNull();
		expect(grid.cells['s1:c6']).toBeNull();
		expect(grid.columnSatisfaitPct.c1).toBe(0);
	});

	it('maps niveau values into cells', async () => {
		const lastRecalc = '2026-06-09T12:00:00Z';
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'Alice', last_name: '' } }],
				error: null
			}),
			math_competences: () => ({ data: mathCompetences, error: null }),
			student_competence_level: () => ({
				data: [
					{
						student_id: 's1',
						math_competence_id: 'c1',
						niveau: 'satisfaisante',
						last_recalc_at: lastRecalc
					}
				],
				error: null
			})
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		expect(grid.cells['s1:c1']).toBe('satisfaisante');
		expect(grid.last_saisie_at).toBe(lastRecalc);
	});

	it('computes column % satisfait+ correctly', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } },
					{ student_id: 's2', profiles: { id: 's2', first_name: 'B', last_name: '' } },
					{ student_id: 's3', profiles: { id: 's3', first_name: 'C', last_name: '' } },
					{ student_id: 's4', profiles: { id: 's4', first_name: 'D', last_name: '' } }
				],
				error: null
			}),
			math_competences: () => ({ data: mathCompetences, error: null }),
			student_competence_level: () => ({
				data: [
					{
						student_id: 's1',
						math_competence_id: 'c1',
						niveau: 'tres_bonne',
						last_recalc_at: '2026-06-09T12:00:00Z'
					},
					{
						student_id: 's2',
						math_competence_id: 'c1',
						niveau: 'satisfaisante',
						last_recalc_at: '2026-06-09T12:00:00Z'
					},
					{
						student_id: 's3',
						math_competence_id: 'c1',
						niveau: 'fragile',
						last_recalc_at: '2026-06-09T12:00:00Z'
					}
					// s4: pas de row → null
				],
				error: null
			})
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		// 2/4 satisfaits = 50%
		expect(grid.columnSatisfaitPct.c1).toBe(50);
	});

	it('keeps last_saisie_at as the MAX of last_recalc_at across rows', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } }],
				error: null
			}),
			math_competences: () => ({ data: mathCompetences, error: null }),
			student_competence_level: () => ({
				data: [
					{
						student_id: 's1',
						math_competence_id: 'c1',
						niveau: 'fragile',
						last_recalc_at: '2026-06-01T10:00:00Z'
					},
					{
						student_id: 's1',
						math_competence_id: 'c2',
						niveau: 'satisfaisante',
						last_recalc_at: '2026-06-09T12:00:00Z'
					}
				],
				error: null
			})
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		expect(grid.last_saisie_at).toBe('2026-06-09T12:00:00Z');
	});

	it('sorts students alphabetically', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's3', profiles: { id: 's3', first_name: 'Zoé', last_name: '' } },
					{ student_id: 's1', profiles: { id: 's1', first_name: 'Alice', last_name: '' } },
					{ student_id: 's2', profiles: { id: 's2', first_name: 'Bob', last_name: '' } }
				],
				error: null
			}),
			math_competences: () => ({ data: mathCompetences, error: null }),
			student_competence_level: () => ({ data: [], error: null })
		});
		const grid = await getClassCompetenceGrid(supabase, 'class-1');
		expect(grid.students.map((s) => s.display_name)).toEqual(['Alice', 'Bob', 'Zoé']);
	});
});

// =============================================================================
// getClassTopObservablesToConsolidate
// =============================================================================

describe('getClassTopObservablesToConsolidate', () => {
	it('returns empty when no class members', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null })
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1');
		expect(rows).toEqual([]);
	});

	it('returns empty when no observable_state rows', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } }],
				error: null
			}),
			student_observable_state: () => ({ data: [], error: null })
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1');
		expect(rows).toEqual([]);
	});

	it('only includes observables observed ≥1 time (filter out empty rows)', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } }],
				error: null
			}),
			student_observable_state: () => ({
				data: [
					{
						student_id: 's1',
						skill_id: 'sk1',
						count_minus: 0,
						count_plus: 0,
						last_attempt_at: null
					}
				],
				error: null
			})
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1');
		expect(rows).toEqual([]);
	});

	it('sorts by minus_pct descending', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } },
					{ student_id: 's2', profiles: { id: 's2', first_name: 'B', last_name: '' } }
				],
				error: null
			}),
			student_observable_state: () => ({
				data: [
					{
						student_id: 's1',
						skill_id: 'sk1',
						count_minus: 1,
						count_plus: 0,
						last_attempt_at: '2026-06-09'
					},
					{
						student_id: 's2',
						skill_id: 'sk1',
						count_minus: 1,
						count_plus: 0,
						last_attempt_at: '2026-06-09'
					},
					{
						student_id: 's1',
						skill_id: 'sk2',
						count_minus: 1,
						count_plus: 0,
						last_attempt_at: '2026-06-09'
					},
					{
						student_id: 's2',
						skill_id: 'sk2',
						count_minus: 0,
						count_plus: 1,
						last_attempt_at: '2026-06-09'
					}
				],
				error: null
			}),
			skills: () => ({
				data: [
					{
						id: 'sk1',
						name: 'Obs1',
						observable_code: 'A1.1',
						subdimension_id: 'sd1',
						math_competence_subdimensions: {
							letter: 'A',
							name: 'Sous-A',
							math_competence_id: 'c1',
							math_competences: { code: 'CHER' }
						}
					},
					{
						id: 'sk2',
						name: 'Obs2',
						observable_code: 'B1.1',
						subdimension_id: 'sd2',
						math_competence_subdimensions: {
							letter: 'B',
							name: 'Sous-B',
							math_competence_id: 'c2',
							math_competences: { code: 'MOD' }
						}
					}
				],
				error: null
			})
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1');
		expect(rows.length).toBe(2);
		// sk1: 2 minus / 2 observed = 100%
		// sk2: 1 minus / 2 observed = 50%
		expect(rows[0].skill_id).toBe('sk1');
		expect(rows[0].minus_pct).toBe(100);
		expect(rows[1].skill_id).toBe('sk2');
		expect(rows[1].minus_pct).toBe(50);
	});

	it('lists students_concerned only for minus, sorted by name', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's2', profiles: { id: 's2', first_name: 'Bob', last_name: '' } },
					{ student_id: 's1', profiles: { id: 's1', first_name: 'Alice', last_name: '' } }
				],
				error: null
			}),
			student_observable_state: () => ({
				data: [
					{
						student_id: 's1',
						skill_id: 'sk1',
						count_minus: 2,
						count_plus: 0,
						last_attempt_at: '2026-06-09'
					},
					{
						student_id: 's2',
						skill_id: 'sk1',
						count_minus: 2,
						count_plus: 0,
						last_attempt_at: '2026-06-09'
					}
				],
				error: null
			}),
			skills: () => ({
				data: [
					{
						id: 'sk1',
						name: 'Obs1',
						observable_code: 'A1.1',
						subdimension_id: 'sd1',
						math_competence_subdimensions: null
					}
				],
				error: null
			})
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1');
		expect(rows[0].students_concerned.map((s) => s.display_name)).toEqual(['Alice', 'Bob']);
	});

	it('respects topN limit', async () => {
		const obs = Array.from({ length: 5 }, (_, i) => ({
			student_id: 's1',
			skill_id: `sk${i}`,
			count_minus: 1,
			count_plus: 0,
			last_attempt_at: '2026-06-09'
		}));
		const skills = Array.from({ length: 5 }, (_, i) => ({
			id: `sk${i}`,
			name: `Obs${i}`,
			observable_code: `A${i}.1`,
			subdimension_id: null,
			math_competence_subdimensions: null
		}));

		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', first_name: 'A', last_name: '' } }],
				error: null
			}),
			student_observable_state: () => ({ data: obs, error: null }),
			skills: () => ({ data: skills, error: null })
		});
		const rows = await getClassTopObservablesToConsolidate(supabase, 'class-1', 3);
		expect(rows.length).toBe(3);
	});
});
