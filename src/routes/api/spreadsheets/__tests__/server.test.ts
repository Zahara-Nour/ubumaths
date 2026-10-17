/**
 * GET /api/spreadsheets : le prof liste ses tableurs comme l'élève (écart V3 :
 * la garde exigeait le rôle `student` exact, le prof recevait 403).
 */

import { describe, it, expect } from 'vitest';
import { GET } from '../+server';

type Role = 'student' | 'teacher' | 'admin';

// Supabase simulé : `profiles` rend le profil, `spreadsheets` un tableur.
const eqCalls: [string, unknown][] = [];

function makeLocals(role: Role): App.Locals {
	const from = (table: string) => {
		const result =
			table === 'profiles'
				? { data: { id: 'u1', role }, error: null }
				: { data: [{ id: 's1', name: 'Relevés' }], error: null, count: 1 };
		const chain = {
			select: () => chain,
			eq: (column: string, value: unknown) => {
				eqCalls.push([column, value]);
				return chain;
			},
			order: () => chain,
			single: async () => result,
			range: async () => result
		};
		return chain;
	};
	return {
		safeGetSession: async () => ({ user: { id: 'u1' }, session: {} }),
		supabase: { from }
	} as unknown as App.Locals;
}

function callGet(role: Role) {
	const url = new URL('http://localhost/api/spreadsheets?page=1&limit=10');
	return GET({ locals: makeLocals(role), url } as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/spreadsheets', () => {
	it('liste les tableurs du prof', async () => {
		const response = await callGet('teacher');
		expect(response.status).toBe(200);
		expect((await response.json()).spreadsheets).toHaveLength(1);
		// La liste est bornée à SES tableurs, en plus de la RLS.
		expect(eqCalls).toContainEqual(['user_id', 'u1']);
	});

	it("liste les tableurs de l'élève", async () => {
		const response = await callGet('student');
		expect(response.status).toBe(200);
	});

	it('refuse le compte admin (403)', async () => {
		await expect(callGet('admin')).rejects.toMatchObject({ status: 403 });
	});
});
