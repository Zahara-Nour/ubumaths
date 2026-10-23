/**
 * getProgrammeMap — ce que la lecture de la carte interroge.
 *
 * Comportements validés par David (2026-10-23) :
 *   - l'arbre complet est lu, même pour un niveau sans point (carte grisée) ;
 *   - un nœud archivé qui porte un point du niveau est lu aussi ;
 *   - une erreur de lecture lève, jamais de carte amputée en silence.
 * Et le plafond PostgREST (1 000 lignes) ne tronque pas l'arbre : il se lit
 * par pages.
 */

import { describe, it, expect } from 'vitest';
import { getProgrammeMap } from '../programme-tree';

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };

const ACTIVE: Row[] = [
	{ id: 'b', kind: 'branch', name: 'Branche', parent_id: null, position: 0, archived_at: null },
	{ id: 'n', kind: 'notion', name: 'Notion', parent_id: 'b', position: 0, archived_at: null },
	{ id: 's', kind: 'subnotion', name: 'sous', parent_id: 'n', position: 0, archived_at: null }
];

const ARCHIVED: Row = {
	id: 's-old',
	kind: 'subnotion',
	name: 'ancienne',
	parent_id: 'n',
	position: 1,
	archived_at: '2026-10-01T00:00:00Z'
};

function pointRow(id: string, node_id: string): Row {
	return {
		id,
		code: `2-${id}`,
		name: `Point ${id}`,
		display_order: 1,
		archived_at: null,
		node_id,
		grade: '2',
		exigence: 'attendu'
	};
}

interface Call {
	table: string;
	ops: string[];
}

/**
 * Fausse base : chaque requête note ses opérations ; à l'`await`, elle rend
 * les points, une page de nœuds actifs (`range`) ou les nœuds demandés (`in`).
 */
function fakeSupabase(opts: {
	points?: Row[];
	active?: Row[];
	extra?: Row[];
	fail?: string;
	calls: Call[];
}) {
	const { points = [], active = ACTIVE, extra = [], calls } = opts;
	return {
		from(table: string) {
			const call: Call = { table, ops: [] };
			calls.push(call);
			let range: [number, number] | null = null;
			let inIds: string[] | null = null;
			const resolve = (): Result => {
				if (opts.fail === table) return { data: null, error: { message: 'boom' } };
				if (table === 'curriculum_points') return { data: points, error: null };
				if (inIds) {
					const ids = inIds;
					return {
						data: [...active, ...extra].filter((r) => ids.includes(String(r.id))),
						error: null
					};
				}
				const [from, to] = range ?? [0, active.length - 1];
				return { data: active.slice(from, to + 1), error: null };
			};
			const builder = {
				select: () => (call.ops.push('select'), builder),
				eq: () => (call.ops.push('eq'), builder),
				is: () => (call.ops.push('is'), builder),
				order: () => (call.ops.push('order'), builder),
				range: (from: number, to: number) => (
					call.ops.push('range'),
					(range = [from, to]),
					builder
				),
				in: (_col: string, values: string[]) => (call.ops.push('in'), (inIds = values), builder),
				then: (ok: (r: Result) => unknown, ko?: (e: unknown) => unknown) =>
					Promise.resolve(resolve()).then(ok, ko)
			};
			return builder;
		}
	};
}

describe('getProgrammeMap', () => {
	it('lit l’arbre complet même sans aucun point du niveau', async () => {
		const calls: Call[] = [];
		const map = await getProgrammeMap(fakeSupabase({ calls }) as never, '2');

		expect(map.map((b) => b.name)).toEqual(['Branche']);
		expect(map[0].notions[0].subnotions.map((s) => s.name)).toEqual(['sous']);
		expect(calls.map((c) => c.table)).toContain('classification_nodes');
	});

	it('pose les points du niveau, et ne lit aucune table de tags', async () => {
		const calls: Call[] = [];
		const map = await getProgrammeMap(
			fakeSupabase({ calls, points: [pointRow('1', 's')] }) as never,
			'2'
		);
		expect(map[0].notions[0].subnotions[0].points.map((p) => p.code)).toEqual(['2-1']);
		expect(new Set(calls.map((c) => c.table))).toEqual(
			new Set(['curriculum_points', 'classification_nodes'])
		);
	});

	it('lit aussi le nœud archivé qui porte un point', async () => {
		const calls: Call[] = [];
		const map = await getProgrammeMap(
			fakeSupabase({ calls, points: [pointRow('1', 's-old')], extra: [ARCHIVED] }) as never,
			'2'
		);
		expect(map[0].notions[0].subnotions.find((s) => s.id === 's-old')).toMatchObject({
			archived: true
		});
	});

	it('lit l’arbre par pages quand il dépasse 1 000 nœuds', async () => {
		const many: Row[] = [
			ACTIVE[0],
			ACTIVE[1],
			...Array.from({ length: 1200 }, (_, i) => ({
				id: `s${i}`,
				kind: 'subnotion',
				name: `sous ${String(i).padStart(4, '0')}`,
				parent_id: 'n',
				position: i,
				archived_at: null
			}))
		];
		const calls: Call[] = [];
		const map = await getProgrammeMap(fakeSupabase({ calls, active: many }) as never, '2');

		expect(map[0].notions[0].subnotions).toHaveLength(1200);
		expect(calls.filter((c) => c.ops.includes('range'))).toHaveLength(2);
	});

	it('refuse une réponse de points pleine (plafond PostgREST) plutôt que de la tronquer', async () => {
		const points = Array.from({ length: 1000 }, (_, i) => pointRow(String(i), 's'));
		await expect(
			getProgrammeMap(fakeSupabase({ calls: [], points }) as never, '2')
		).rejects.toThrow(/paginer/);
	});

	it('lève une erreur si les points sont illisibles', async () => {
		await expect(
			getProgrammeMap(fakeSupabase({ calls: [], fail: 'curriculum_points' }) as never, '2')
		).rejects.toThrow(/boom/);
	});

	it('lève une erreur si l’arbre est illisible', async () => {
		await expect(
			getProgrammeMap(fakeSupabase({ calls: [], fail: 'classification_nodes' }) as never, '2')
		).rejects.toThrow(/boom/);
	});
});
