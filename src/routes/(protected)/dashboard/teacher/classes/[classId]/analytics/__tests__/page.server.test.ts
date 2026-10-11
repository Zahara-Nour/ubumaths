/**
 * Loader de la page analytique : le compteur de signalements anti-triche ne
 * doit pas se faire passer pour un 0 quand sa lecture échoue (écart L1).
 */

import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page.server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

type Result = { data?: unknown; error: unknown; count?: number | null };

// Supabase simulé : chaque table rend son résultat, quelle que soit la chaîne.
function makeLocals(flagsResult: Result): App.Locals {
	const results: Record<string, Result> = {
		profiles: { data: { id: 'u1', role: 'teacher' }, error: null },
		classes: { data: { id: CLASS_ID, name: '5e A', grade: '5e' }, error: null },
		class_members: {
			data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'Ada', lastname: 'L' } }],
			error: null
		},
		curriculum_themes: { data: [{ id: 't1', name: 'Nombres', code: 'NC' }], error: null },
		srs_anti_fraud_flags: flagsResult
	};
	const from = vi.fn((table: string) => {
		const result = results[table];
		const chain = {
			select: () => chain,
			eq: () => chain,
			in: () => chain,
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
	>[0]) as Promise<{ unresolvedFlagsCount: number | null }>;
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
});
