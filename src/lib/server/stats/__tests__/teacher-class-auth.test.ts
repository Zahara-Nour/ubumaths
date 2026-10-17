/**
 * Garde `requireTeacherOfClass` : réservée au rôle `teacher` (décision D1,
 * 2026-10-11). L'admin passe par l'élévation depuis son compte prof ; le compte
 * admin lui-même n'a rien à faire dans l'analytique ni l'export des compétences.
 */

import { describe, it, expect, vi } from 'vitest';
import { requireTeacherOfClass } from '../teacher-class-auth';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const classRow = { id: CLASS_ID, name: '5e A', grade: '5e' };

// Supabase simulé : `profiles` rend le profil, `classes` rend la classe.
function makeLocals(role: 'student' | 'teacher' | 'admin'): App.Locals {
	const profile = { id: 'u1', role };
	const from = vi.fn((table: string) => {
		const result =
			table === 'profiles' ? { data: profile, error: null } : { data: classRow, error: null };
		const chain = {
			select: () => chain,
			eq: () => chain,
			single: async () => result,
			maybeSingle: async () => result
		};
		return chain;
	});
	return {
		safeGetSession: async () => ({ user: { id: 'u1' }, session: {} }),
		supabase: { from }
	} as unknown as App.Locals;
}

describe('requireTeacherOfClass', () => {
	it('laisse passer le prof et rend la classe', async () => {
		const result = await requireTeacherOfClass(makeLocals('teacher'), CLASS_ID);
		expect(result.classRow).toEqual(classRow);
	});

	it("refuse le compte admin (403) : l'admin n'utilise pas l'espace prof", async () => {
		await expect(requireTeacherOfClass(makeLocals('admin'), CLASS_ID)).rejects.toMatchObject({
			status: 403
		});
	});

	it("refuse l'élève (403)", async () => {
		await expect(requireTeacherOfClass(makeLocals('student'), CLASS_ID)).rejects.toMatchObject({
			status: 403
		});
	});
});
