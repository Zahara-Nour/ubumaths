/**
 * getProgrammeTree — ce que la lecture interroge.
 *
 * Comportement 6 validé par David (C5, étape 3) : un programme sans aucun tag
 * s'affiche normalement. L'arbre ne se lit que dans `curriculum_points` et
 * `classification_nodes` : aucune table de tags n'est consultée, donc leur
 * absence ne peut rien masquer.
 */

import { describe, it, expect } from 'vitest';
import { getProgrammeTree } from '../programme-tree';

type Row = Record<string, unknown>;

const NODES: Row[] = [
	{ id: 'b', kind: 'branch', name: 'Branche', parent_id: null, position: 0, archived_at: null },
	{ id: 'n', kind: 'notion', name: 'Notion', parent_id: 'b', position: 0, archived_at: null },
	{ id: 's', kind: 'subnotion', name: 'sous', parent_id: 'n', position: 0, archived_at: null }
];

const POINTS: Row[] = [
	{
		id: 'p1',
		code: '5-001',
		name: 'Point',
		display_order: 1,
		rubrique: null,
		archived_at: null,
		node_id: 's',
		grade: '5'
	}
];

type Result = { data: Row[]; error: null };
/** Une vraie promesse qui accepte encore des `.order()` enchaînés. */
type Ordered = Promise<Result> & { order: () => Ordered };

function ordered(result: Result): Ordered {
	const promise = Promise.resolve(result) as Ordered;
	promise.order = () => promise;
	return promise;
}

/**
 * Fausse base : rend les lignes de la table demandée et note les tables lues.
 * Points : `select → eq → not → is? → order → order` ; nœuds : `select → in`.
 */
function fakeSupabase(tablesRead: string[], points: Row[] = POINTS) {
	return {
		from(table: string) {
			tablesRead.push(table);
			const rows: Row[] = table === 'curriculum_points' ? points : NODES;
			const builder = {
				select: () => builder,
				eq: () => builder,
				not: () => builder,
				is: () => builder,
				order: () => ordered({ data: rows, error: null }),
				in: async (col: string, values: string[]): Promise<Result> => ({
					data: rows.filter((r) => values.includes(String(r[col]))),
					error: null
				})
			};
			return builder;
		}
	};
}

describe('getProgrammeTree', () => {
	it('se construit sans aucun tag : seuls les points et les nœuds sont lus', async () => {
		const tablesRead: string[] = [];
		const tree = await getProgrammeTree(fakeSupabase(tablesRead) as never, '5');

		expect(tree).toHaveLength(1);
		expect(tree[0].notions[0].points.map((p) => p.id)).toEqual(['p1']);
		expect(new Set(tablesRead)).toEqual(new Set(['curriculum_points', 'classification_nodes']));
	});

	it('niveau sans point : arbre vide, l’arbre des notions n’est pas lu', async () => {
		const tablesRead: string[] = [];
		expect(await getProgrammeTree(fakeSupabase(tablesRead, []) as never, '5')).toEqual([]);
		expect(tablesRead).toEqual(['curriculum_points']);
	});
});
