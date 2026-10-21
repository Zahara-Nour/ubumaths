/**
 * Loader de la page analytique : le compteur de signalements anti-triche ne
 * doit pas se faire passer pour un 0 quand sa lecture échoue (écart L1) ; le
 * sélecteur de la courbe de rétention propose les branches du niveau de la
 * classe (arbre des notions, PR F).
 */

import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page.server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

type Result = { data?: unknown; error: unknown; count?: number | null };

function node(id: string, kind: string, name: string, parent_id: string | null, position: number) {
	return { id, kind, name, parent_id, position, archived_at: null, created_at: '', updated_at: '' };
}

function point(id: string, node_id: string) {
	return {
		id,
		code: id,
		name: id,
		display_order: 1,
		rubrique: null,
		archived_at: null,
		node_id,
		grade: '6'
	};
}

// Arbre du niveau 6 : « Géométrie » est placée après « Nombres ».
const NODES = [
	node('b-geo', 'branch', 'Géométrie', null, 2),
	node('b-nombres', 'branch', 'Nombres', null, 1),
	node('n-triangles', 'notion', 'Triangles', 'b-geo', 1),
	node('n-fractions', 'notion', 'Fractions', 'b-nombres', 1)
];

// Supabase simulé : chaque table rend son résultat, quelle que soit la chaîne.
function makeLocals(flagsResult: Result, grade: string | null = '6'): App.Locals {
	const results: Record<string, Result> = {
		profiles: { data: { id: 'u1', role: 'teacher' }, error: null },
		classes: { data: { id: CLASS_ID, name: '6e A', grade }, error: null },
		class_members: {
			data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'Ada', lastname: 'L' } }],
			error: null
		},
		curriculum_points: {
			data: [point('p-geo', 'n-triangles'), point('p-frac', 'n-fractions')],
			error: null
		},
		classification_nodes: { data: NODES, error: null },
		srs_anti_fraud_flags: flagsResult
	};
	const from = vi.fn((table: string) => {
		const result = results[table];
		if (!result) throw new Error(`Table inattendue : ${table}`);
		const chain = {
			select: () => chain,
			eq: () => chain,
			in: () => chain,
			not: () => chain,
			is: () => chain,
			order: () => chain,
			single: async () => result,
			maybeSingle: async () => result,
			// Requêtes attendues sans .single() (membres, thèmes, compteur) : la chaîne doit être awaitable.
			// oxlint-disable-next-line unicorn/no-thenable
			then: (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve)
		};
		return chain;
	});
	return {
		safeGetSession: async () => ({ user: { id: 'u1' }, session: {} }),
		supabase: { from }
	} as unknown as App.Locals;
}

function runLoad(locals: App.Locals) {
	return load({ params: { classId: CLASS_ID }, locals } as unknown as Parameters<
		typeof load
	>[0]) as Promise<{
		unresolvedFlagsCount: number | null;
		branches: { id: string; name: string }[];
	}>;
}

describe('analytics +page.server load', () => {
	it('rend le nombre de signalements non résolus', async () => {
		const data = await runLoad(makeLocals({ count: 3, error: null }));
		expect(data.unresolvedFlagsCount).toBe(3);
	});

	it('rend null (pas 0) quand le compteur est illisible', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const data = await runLoad(makeLocals({ count: null, error: { message: 'boom' } }));
		expect(data.unresolvedFlagsCount).toBeNull();
	});

	it('propose les branches du niveau de la classe, dans l’ordre de l’arbre', async () => {
		const data = await runLoad(makeLocals({ count: 0, error: null }));
		expect(data.branches).toEqual([
			{ id: 'b-nombres', name: 'Nombres' },
			{ id: 'b-geo', name: 'Géométrie' }
		]);
	});

	it('classe sans niveau : aucune branche', async () => {
		const data = await runLoad(makeLocals({ count: 0, error: null }, null));
		expect(data.branches).toEqual([]);
	});
});
