/**
 * Chargement de la collection de Mathoux (`loadMathouCollection`), base simulée.
 *
 * La logique de stade et de regroupement est testée dans
 * `src/lib/mathoux/__tests__/collection-logic.test.ts` ; ici, ce qui est lu,
 * avec quels filtres, et ce qui arrive quand une lecture échoue. La RLS réelle
 * est prouvée en intégration (`tests/integration/mathoux-collection.test.ts`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/srs/capacity-badge', () => ({
	computePointBadges: vi.fn()
}));

import { computePointBadges } from '$lib/server/srs/capacity-badge';
import { loadMathouCollection } from '../collection';

// =============================================================================
// Mock Supabase : chaque requête enregistre ses filtres, le handler y répond
// =============================================================================

type QueryResult = { data: unknown; error: unknown };
type Call = [method: string, ...args: unknown[]];
type Handler = (calls: Call[]) => QueryResult;

const STUDENT = 'eleve-1';

function buildMock(handlers: Record<string, Handler>, ancestors: () => QueryResult = () => ok([])) {
	const queries: { table: string; calls: Call[] }[] = [];
	const from = vi.fn().mockImplementation((table: string) => {
		const handler = handlers[table];
		if (!handler) throw new Error(`Table inattendue dans le mock : ${table}`);
		const calls: Call[] = [];
		queries.push({ table, calls });
		const qb: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'is', 'not', 'order']) {
			qb[method] = (...args: unknown[]) => {
				calls.push([method, ...args]);
				return qb;
			};
		}
		qb.then = (onFulfilled: (v: QueryResult) => unknown) =>
			Promise.resolve().then(() => onFulfilled(handler(calls)));
		return qb;
	});
	const rpc = vi.fn().mockImplementation(() => Promise.resolve(ancestors()));
	const supabase = { from, rpc } as unknown as Parameters<typeof loadMathouCollection>[0];
	return { supabase, from, rpc, queries };
}

function has(calls: Call[], method: string, ...args: unknown[]): boolean {
	return calls.some(
		([m, ...rest]) => m === method && JSON.stringify(rest) === JSON.stringify(args)
	);
}

function ok(data: unknown): QueryResult {
	return { data, error: null };
}

/** Décor : une branche, deux notions ; p1 et p2 sur n1 (p2 via sous-notion), p3 sur n2 non tagué. */
function nominalHandlers(over: Partial<Record<string, Handler>> = {}): Record<string, Handler> {
	return {
		curriculum_points: (calls) =>
			has(calls, 'eq', 'grade', '1_SPE')
				? ok([
						{ id: 'p1', node_id: 'n1', grade: '1_SPE' },
						{ id: 'p2', node_id: 's1', grade: '1_SPE' },
						{ id: 'p3', node_id: 'n2', grade: '1_SPE' }
					])
				: ok([]),
		question_template_points: () => ok([{ point_id: 'p1' }, { point_id: 'p2' }]),
		classification_nodes: (calls) =>
			has(calls, 'eq', 'kind', 'subnotion')
				? ok([{ id: 's1', kind: 'subnotion', parent_id: 'n1', name: 'Somme', position: 0 }])
				: ok([
						{ id: 'b1', kind: 'branch', parent_id: null, name: 'Nombres', position: 0 },
						{ id: 'n1', kind: 'notion', parent_id: 'b1', name: 'Fractions', position: 0 },
						{ id: 'n2', kind: 'notion', parent_id: 'b1', name: 'Dérivation', position: 1 }
					]),
		student_point_state: () =>
			ok([{ point_id: 'p1', is_acquired: true, total_successes: 2, last_success_at: null }]),
		...over
	} as Record<string, Handler>;
}

beforeEach(() => {
	vi.mocked(computePointBadges).mockReset();
	vi.mocked(computePointBadges).mockResolvedValue(new Map());
});

// =============================================================================
// Tests
// =============================================================================

describe('loadMathouCollection', () => {
	it('sans niveau : collection vide, aucune requête', async () => {
		const { supabase, from } = buildMock({});
		const collection = await loadMathouCollection(supabase, STUDENT, null);
		expect(collection.races).toEqual([]);
		expect(from).not.toHaveBeenCalled();
	});

	it('lit les points du niveau, non archivés, rattachés à un nœud', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const points = queries.find((q) => q.table === 'curriculum_points');
		expect(points).toBeDefined();
		expect(has(points!.calls, 'eq', 'grade', '1_SPE')).toBe(true);
		expect(has(points!.calls, 'is', 'archived_at', null)).toBe(true);
		expect(has(points!.calls, 'not', 'node_id', 'is', null)).toBe(true);
	});

	it('lit les états de L’ÉLÈVE de la session seulement', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const states = queries.find((q) => q.table === 'student_point_state');
		expect(has(states!.calls, 'eq', 'student_id', STUDENT)).toBe(true);
	});

	it('nominal : la sous-notion compte pour sa notion, le point non tagué est ignoré', async () => {
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');

		expect(collection.races).toHaveLength(1);
		const mathoux = collection.races[0].mathoux;
		// n2 n'a que p3, non tagué : pas de Mathou
		expect(mathoux.map((m) => m.notionId)).toEqual(['n1']);
		expect(mathoux[0]).toMatchObject({
			name: 'le Mathou des Fractions',
			workablePoints: 2,
			acquiredPoints: 1,
			growth: 'matou',
			asleep: false
		});
		// Les badges ne sont demandés que pour les points travaillables
		expect(computePointBadges).toHaveBeenCalledWith(supabase, STUDENT, ['p1', 'p2']);
	});

	it('sieste : un badge a_renforcer ou a_remedier endort le Mathou', async () => {
		vi.mocked(computePointBadges).mockResolvedValue(new Map([['p2', 'a_remedier']]));
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].asleep).toBe(true);
		expect(collection.counts).toEqual({ born: 1, napping: 1, toDiscover: 0 });
	});

	it('une réussite datée sans compteur suffit pour un chaton', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				student_point_state: () =>
					ok([
						{
							point_id: 'p2',
							is_acquired: false,
							total_successes: 0,
							last_success_at: '2026-10-01T00:00:00Z'
						}
					])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].growth).toBe('chaton');
	});

	it('aucun point tagué : collection vide, pas de badges demandés', async () => {
		const { supabase } = buildMock(nominalHandlers({ question_template_points: () => ok([]) }));
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races).toEqual([]);
		expect(computePointBadges).not.toHaveBeenCalled();
	});

	it('une lecture d’états en échec lève (une panne ne se lit pas « Chatterie vide »)', async () => {
		const { supabase } = buildMock(
			nominalHandlers({ student_point_state: () => ({ data: null, error: { message: 'boom' } }) })
		);
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/boom/);
	});

	it('parcours : demande les niveaux antérieurs et lit les points de chacun', async () => {
		const { supabase, rpc, queries } = buildMock(nominalHandlers(), () => ok(['2', '3']));
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(rpc).toHaveBeenCalledWith('grade_ancestors', { p_grade: '1_SPE' });
		const grades = queries
			.filter((q) => q.table === 'curriculum_points')
			.map((q) => q.calls.find(([m, col]) => m === 'eq' && col === 'grade')?.[2]);
		expect(grades.sort()).toEqual(['1_SPE', '2', '3']);
	});

	it('parcours : une notion acquise en 1re spé reste grand matou pour un élève de Tle spé', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				curriculum_points: (calls) =>
					has(calls, 'eq', 'grade', '1_SPE')
						? ok([{ id: 'p1', node_id: 'n1', grade: '1_SPE' }])
						: has(calls, 'eq', 'grade', 'T_SPE')
							? ok([{ id: 'p2', node_id: 's1', grade: 'T_SPE' }])
							: ok([])
			}),
			() => ok(['1_SPE', '2'])
		);
		const collection = await loadMathouCollection(supabase, STUDENT, 'T_SPE');
		expect(collection.races[0].mathoux[0]).toMatchObject({
			growth: 'grand_matou',
			byGrade: [
				{ grade: '1_SPE', growth: 'grand_matou' },
				{ grade: 'T_SPE', growth: 'a_decouvrir' }
			]
		});
	});

	it('parcours illisible : lève (pas de repli silencieux sur le seul niveau courant)', async () => {
		const { supabase } = buildMock(nominalHandlers(), () => ({
			data: null,
			error: { message: 'rpc refusée' }
		}));
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/rpc refusée/);
	});

	it('une lecture des points en échec lève', async () => {
		const { supabase } = buildMock({
			curriculum_points: () => ({ data: null, error: { message: 'refus' } })
		});
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/refus/);
	});
});
