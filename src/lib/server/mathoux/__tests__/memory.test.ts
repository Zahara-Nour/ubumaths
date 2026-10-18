/**
 * Mémoire des Mathoux (`student_mathoux`) : lecture et écriture, base simulée.
 *
 * Règle d'écriture (§ 9, « Changement d'année et oubli ») : la mémoire ne
 * redescend JAMAIS, même sous deux calculs concurrents. Les lignes neuves partent
 * en un seul insert groupé qui n'écrase rien (ON CONFLICT DO NOTHING) ; une ligne
 * existante ne se met à jour que si elle n'a pas bougé depuis sa lecture
 * (`updated_at` comparé), sinon elle est relue et fusionnée. La vraie
 * concurrence est prouvée en intégration (`tests/integration/mathoux-collection.test.ts`).
 */

import { describe, it, expect, vi } from 'vitest';
import { readMathouMemory, rememberMathoux, type StoredMathouMemory } from '../memory';

// =============================================================================
// Mock : chaque requête enregistre ses appels ; le handler de la table répond
// =============================================================================

type QueryResult = { data: unknown; error: unknown };
type Call = [method: string, ...args: unknown[]];
type Query = { table: string; calls: Call[] };

const STUDENT = 'eleve-1';
const T0 = '2026-10-18T10:00:00.000001+00:00';
const T1 = '2026-10-18T10:00:05.000002+00:00';

function buildMock(respond: (query: Query) => QueryResult) {
	const queries: Query[] = [];
	const from = vi.fn().mockImplementation((table: string) => {
		const query: Query = { table, calls: [] };
		queries.push(query);
		const qb: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'upsert', 'update', 'maybeSingle']) {
			qb[method] = (...args: unknown[]) => {
				query.calls.push([method, ...args]);
				return qb;
			};
		}
		qb.then = (onFulfilled: (v: QueryResult) => unknown) =>
			Promise.resolve().then(() => onFulfilled(respond(query)));
		return qb;
	});
	const client = { from } as unknown as Parameters<typeof rememberMathoux>[0];
	return { client, queries };
}

function callOf(query: Query, method: string): unknown[] | undefined {
	return query.calls.find(([m]) => m === method)?.slice(1);
}

function isWrite(query: Query, method: 'upsert' | 'update'): boolean {
	return query.calls.some(([m]) => m === method);
}

function stored(entry: Omit<StoredMathouMemory, 'updatedAt'>, updatedAt = T0) {
	return { ...entry, updatedAt };
}

// =============================================================================
// Lecture
// =============================================================================

describe('readMathouMemory', () => {
	it('lit les lignes de l’élève de la session et les range par notion', async () => {
		const { client, queries } = buildMock(() => ({
			data: [
				{ notion_id: 'n1', best_stage: 'matou', starred_grades: ['2'], updated_at: T0 },
				{ notion_id: 'n2', best_stage: 'n_importe', starred_grades: [], updated_at: T0 }
			],
			error: null
		}));
		const memory = await readMathouMemory(client, STUDENT);
		expect(queries[0].table).toBe('student_mathoux');
		expect(callOf(queries[0], 'eq')).toEqual(['student_id', STUDENT]);
		// Un stade inconnu est écarté (la base l'interdit : défense en profondeur)
		expect([...memory.entries()]).toEqual([
			['n1', { bestStage: 'matou', starredGrades: ['2'], updatedAt: T0 }]
		]);
	});

	it('une lecture en échec lève : sans mémoire, le Mathou rapetisserait à l’écran', async () => {
		const { client } = buildMock(() => ({ data: null, error: { message: 'boom' } }));
		await expect(readMathouMemory(client, STUDENT)).rejects.toThrow(/boom/);
	});
});

// =============================================================================
// Écriture
// =============================================================================

describe('rememberMathoux', () => {
	it('rien à retenir → aucune requête', async () => {
		const { client, queries } = buildMock(() => ({ data: [], error: null }));
		await rememberMathoux(client, STUDENT, [], new Map());
		expect(queries).toHaveLength(0);
	});

	it('lignes neuves : un seul insert groupé, étoiles toujours fournies, sans rien écraser', async () => {
		const { client, queries } = buildMock(() => ({
			data: [{ notion_id: 'n1' }, { notion_id: 'n2' }],
			error: null
		}));
		await rememberMathoux(
			client,
			STUDENT,
			[
				{ notionId: 'n1', bestStage: 'chaton', starredGrades: [] },
				{ notionId: 'n2', bestStage: 'grand_matou', starredGrades: ['1_SPE'] }
			],
			new Map()
		);
		expect(queries).toHaveLength(1);
		const [rows, options] = callOf(queries[0], 'upsert') as [unknown[], Record<string, unknown>];
		expect(rows).toEqual([
			{ student_id: STUDENT, notion_id: 'n1', best_stage: 'chaton', starred_grades: [] },
			{ student_id: STUDENT, notion_id: 'n2', best_stage: 'grand_matou', starred_grades: ['1_SPE'] }
		]);
		expect(options).toMatchObject({
			onConflict: 'student_id,notion_id',
			ignoreDuplicates: true,
			defaultToNull: false
		});
		// `.select()` : on sait quelles lignes ont vraiment été insérées
		expect(callOf(queries[0], 'select')).toBeDefined();
	});

	it('ligne existante : mise à jour conditionnée à son `updated_at` lu', async () => {
		const { client, queries } = buildMock(() => ({ data: [{ notion_id: 'n1' }], error: null }));
		await rememberMathoux(
			client,
			STUDENT,
			[{ notionId: 'n1', bestStage: 'grand_matou', starredGrades: ['2'] }],
			new Map([['n1', stored({ bestStage: 'matou', starredGrades: [] })]])
		);
		expect(queries).toHaveLength(1);
		expect(callOf(queries[0], 'update')).toEqual([
			{ best_stage: 'grand_matou', starred_grades: ['2'] }
		]);
		const eqs = queries[0].calls.filter(([m]) => m === 'eq').map((c) => c.slice(1));
		expect(eqs).toEqual([
			['student_id', STUDENT],
			['notion_id', 'n1'],
			['updated_at', T0]
		]);
	});

	it('concurrence : la ligne a bougé → relue, fusionnée, jamais redescendue', async () => {
		// Un autre calcul a écrit grand matou ★ 2nde entre la lecture et l'écriture
		let updates = 0;
		const { client, queries } = buildMock((query) => {
			if (isWrite(query, 'update')) {
				updates += 1;
				return { data: updates === 1 ? [] : [{ notion_id: 'n1' }], error: null };
			}
			return {
				data: { notion_id: 'n1', best_stage: 'grand_matou', starred_grades: ['2'], updated_at: T1 },
				error: null
			};
		});
		await rememberMathoux(
			client,
			STUDENT,
			[{ notionId: 'n1', bestStage: 'matou', starredGrades: ['1_SPE'] }],
			new Map([['n1', stored({ bestStage: 'chaton', starredGrades: [] })]])
		);
		const writes = queries.filter((q) => isWrite(q, 'update'));
		expect(writes).toHaveLength(2);
		// 2e essai : le stade relu (grand matou) gardé, les deux étoiles, sur le nouvel `updated_at`
		expect(callOf(writes[1], 'update')).toEqual([
			{ best_stage: 'grand_matou', starred_grades: ['2', '1_SPE'] }
		]);
		expect(writes[1].calls).toContainEqual(['eq', 'updated_at', T1]);
	});

	it('concurrence : la ligne relue contient déjà tout → plus aucune écriture', async () => {
		const { client, queries } = buildMock((query) =>
			isWrite(query, 'update')
				? { data: [], error: null }
				: {
						data: {
							notion_id: 'n1',
							best_stage: 'grand_matou',
							starred_grades: ['1_SPE'],
							updated_at: T1
						},
						error: null
					}
		);
		await rememberMathoux(
			client,
			STUDENT,
			[{ notionId: 'n1', bestStage: 'matou', starredGrades: ['1_SPE'] }],
			new Map([['n1', stored({ bestStage: 'chaton', starredGrades: [] })]])
		);
		expect(queries.filter((q) => isWrite(q, 'update'))).toHaveLength(1);
	});

	it('insert concurrent : la ligne créée entre-temps est relue puis mise à jour par fusion', async () => {
		const { client, queries } = buildMock((query) => {
			if (isWrite(query, 'upsert')) return { data: [], error: null }; // conflit : rien inséré
			if (isWrite(query, 'update')) return { data: [{ notion_id: 'n1' }], error: null };
			return {
				data: [{ notion_id: 'n1', best_stage: 'matou', starred_grades: ['2'], updated_at: T1 }],
				error: null
			};
		});
		await rememberMathoux(
			client,
			STUDENT,
			[{ notionId: 'n1', bestStage: 'grand_matou', starredGrades: [] }],
			new Map()
		);
		const update = queries.find((q) => isWrite(q, 'update'));
		expect(update).toBeDefined();
		expect(callOf(update!, 'update')).toEqual([
			{ best_stage: 'grand_matou', starred_grades: ['2'] }
		]);
		expect(update!.calls).toContainEqual(['eq', 'updated_at', T1]);
	});

	it('une écriture en échec lève (l’appelant journalise, l’affichage tient)', async () => {
		const { client } = buildMock(() => ({ data: null, error: { message: 'refus' } }));
		await expect(
			rememberMathoux(
				client,
				STUDENT,
				[{ notionId: 'n1', bestStage: 'chaton', starredGrades: [] }],
				new Map()
			)
		).rejects.toThrow(/refus/);
	});
});
