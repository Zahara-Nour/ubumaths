/**
 * Tests for `loadClassCompetenceExport` with a table-dispatching Supabase mock
 * (same approach as stats/class-competence.test.ts). Covers the profile-join
 * unwrap, the competenceId→code mapping and the empty cases.
 */

import { describe, it, expect, vi } from 'vitest';
import { loadClassCompetenceExport } from '../load-export-data';

type QueryResult = { data: unknown; error: unknown };
type TableHandler = () => QueryResult;
type MockSpec = Record<string, TableHandler>;

function buildMock(tableHandlers: MockSpec) {
	const fromMock = vi.fn().mockImplementation((table: string) => {
		const handler = tableHandlers[table];
		if (!handler) throw new Error(`Unexpected table in mock: ${table}`);
		const terminalPromise = Promise.resolve().then(handler);
		const qb = {
			select: vi.fn(),
			eq: vi.fn(),
			in: vi.fn(),
			order: vi.fn(),
			then: (onFulfilled: (value: QueryResult) => unknown) => terminalPromise.then(onFulfilled)
		};
		qb.select.mockReturnValue(qb);
		qb.eq.mockReturnValue(qb);
		qb.in.mockReturnValue(qb);
		qb.order.mockReturnValue(qb);
		return qb;
	});
	return { from: fromMock } as unknown as Parameters<typeof loadClassCompetenceExport>[0];
}

const competences = [
	{ id: 'c1', code: 'chercher', name: 'Chercher', display_order: 1 },
	{ id: 'c2', code: 'calculer', name: 'Calculer', display_order: 2 }
];

describe('loadClassCompetenceExport', () => {
	it('returns competences and empty rows when the class has no active student', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null }),
			math_competences: () => ({ data: competences, error: null })
		});
		const { competences: comps, rows } = await loadClassCompetenceExport(supabase, 'cl1', '6e B');
		expect(comps).toEqual([
			{ code: 'chercher', name: 'Chercher' },
			{ code: 'calculer', name: 'Calculer' }
		]);
		expect(rows).toEqual([]);
	});

	it('maps levels by competence code and unwraps the profile join (object form)', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'Léa', lastname: 'Dupont' } }],
				error: null
			}),
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({
				data: [
					{
						student_id: 's1',
						math_competence_id: 'c1',
						niveau: 'satisfaisante',
						task_count: 5,
						last_recalc_at: '2026-06-10T08:30:00Z'
					}
				],
				error: null
			})
		});
		const { rows } = await loadClassCompetenceExport(supabase, 'cl1', '6e B');
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			firstName: 'Léa',
			lastName: 'Dupont',
			className: '6e B',
			levels: { chercher: 'satisfaisante' },
			taskCounts: { chercher: 5 },
			lastObservations: { chercher: '2026-06-10T08:30:00Z' }
		});
		// calculer was not evaluated → absent from levels
		expect(rows[0].levels.calculer).toBeUndefined();
	});

	it('unwraps the profile join when returned as an array', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's1', profiles: [{ id: 's1', firstname: 'Tom', lastname: 'Martin' }] }
				],
				error: null
			}),
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({ data: [], error: null })
		});
		const { rows } = await loadClassCompetenceExport(supabase, 'cl1', '6e B');
		expect(rows[0]).toMatchObject({ firstName: 'Tom', lastName: 'Martin' });
	});
});
