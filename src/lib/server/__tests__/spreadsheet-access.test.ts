/**
 * Garde du tableur : élèves et prof (décision V3, 2026-10-12). Chacun ne voit
 * que ses tableurs : c'est la RLS de `spreadsheets` (`auth.uid() = user_id`)
 * qui le garantit, la garde ne règle que le rôle.
 */

import { describe, it, expect } from 'vitest';
import { requireSpreadsheetUser } from '../spreadsheet-access';

function makeLocals(role: 'student' | 'teacher' | 'admin'): App.Locals {
	const result = { data: { id: 'u1', role }, error: null };
	const chain = {
		select: () => chain,
		eq: () => chain,
		single: async () => result
	};
	return {
		safeGetSession: async () => ({ user: { id: 'u1' }, session: {} }),
		supabase: { from: () => chain }
	} as unknown as App.Locals;
}

describe('requireSpreadsheetUser', () => {
	it("laisse passer l'élève", async () => {
		const { user } = await requireSpreadsheetUser(makeLocals('student'));
		expect(user.id).toBe('u1');
	});

	it('laisse passer le prof', async () => {
		const { user } = await requireSpreadsheetUser(makeLocals('teacher'));
		expect(user.id).toBe('u1');
	});

	it('refuse le compte admin (403)', async () => {
		await expect(requireSpreadsheetUser(makeLocals('admin'))).rejects.toMatchObject({
			status: 403
		});
	});
});
