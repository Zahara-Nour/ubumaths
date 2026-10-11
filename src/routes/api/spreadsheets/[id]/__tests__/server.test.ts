/**
 * DELETE /api/spreadsheets/:id : une suppression refusée par la RLS ou visant
 * le tableur d'un autre n'affecte aucune ligne, SANS erreur. La route doit le
 * voir (lignes rendues) et répondre 404, pas « succès ».
 */

import { describe, it, expect, vi } from 'vitest';
import { DELETE } from '../+server';

const SHEET_ID = '22222222-2222-4222-8222-222222222222';

function makeLocals(deletedRows: { id: string }[]) {
	const eqCalls: [string, unknown][] = [];
	const from = (table: string) => {
		const result =
			table === 'profiles'
				? { data: { id: 'u1', role: 'teacher' }, error: null }
				: { data: deletedRows, error: null };
		const chain = {
			select: () => chain,
			delete: () => chain,
			eq: (column: string, value: unknown) => {
				eqCalls.push([column, value]);
				return chain;
			},
			single: async () => result,
			// oxlint-disable-next-line unicorn/no-thenable
			then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve)
		};
		return chain;
	};
	const locals = {
		safeGetSession: async () => ({ user: { id: 'u1' }, session: {} }),
		supabase: { from }
	} as unknown as App.Locals;
	return { locals, eqCalls };
}

function callDelete(locals: App.Locals) {
	return DELETE({ locals, params: { id: SHEET_ID } } as unknown as Parameters<typeof DELETE>[0]);
}

describe('DELETE /api/spreadsheets/:id', () => {
	it('supprime le tableur de son propriétaire', async () => {
		const { locals, eqCalls } = makeLocals([{ id: SHEET_ID }]);
		const response = await callDelete(locals);
		expect(response.status).toBe(200);
		expect(eqCalls).toContainEqual(['user_id', 'u1']);
	});

	it("répond 404 quand aucune ligne n'est supprimée", async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { locals } = makeLocals([]);
		await expect(callDelete(locals)).rejects.toMatchObject({ status: 404 });
	});
});
