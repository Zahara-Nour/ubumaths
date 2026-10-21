/**
 * GET knowledge-retention : la courbe se lit par BRANCHE de l'arbre, dans le
 * programme du niveau de la classe (étape 3 de l'arbre des notions, PR F).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requireTeacherOfClass, getStudentRetentionCurve } = vi.hoisted(() => ({
	requireTeacherOfClass: vi.fn(),
	getStudentRetentionCurve: vi.fn()
}));

vi.mock('$lib/server/stats/teacher-class-auth', () => ({ requireTeacherOfClass }));
vi.mock('$lib/server/stats', () => ({ getStudentRetentionCurve }));

import { GET } from '../+server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const BRANCH_ID = '33333333-3333-4333-8333-333333333333';

// Supabase simulé : l'élève est membre actif de la classe.
function makeLocals(): App.Locals {
	const chain = {
		select: () => chain,
		eq: () => chain,
		maybeSingle: async () => ({ data: { student_id: STUDENT_ID }, error: null })
	};
	return { supabase: { from: () => chain } } as unknown as App.Locals;
}

async function call(query: string) {
	const url = new URL(`http://localhost/api?${query}`);
	return GET({
		params: { classId: CLASS_ID, studentId: STUDENT_ID },
		url,
		locals: makeLocals()
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET knowledge-retention', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireTeacherOfClass.mockResolvedValue({
			classRow: { id: CLASS_ID, name: '6e A', grade: '6' }
		});
		getStudentRetentionCurve.mockResolvedValue([]);
	});

	it('lit la courbe de la branche, dans le niveau de la classe', async () => {
		const res = await call(`branch=${BRANCH_ID}`);
		expect(res.status).toBe(200);
		expect(getStudentRetentionCurve).toHaveBeenCalledWith(
			expect.anything(),
			STUDENT_ID,
			{ branchId: BRANCH_ID, grade: '6' },
			8
		);
	});

	it('400 sans branche', async () => {
		const res = await call('');
		expect(res.status).toBe(400);
		expect(getStudentRetentionCurve).not.toHaveBeenCalled();
	});

	it('400 quand la branche n’est pas un uuid (ancien code de thème)', async () => {
		const res = await call('theme=NUM&branch=NUM');
		expect(res.status).toBe(400);
		expect(getStudentRetentionCurve).not.toHaveBeenCalled();
	});

	it('classe sans niveau : courbe vide, sans lecture', async () => {
		requireTeacherOfClass.mockResolvedValue({ classRow: { id: CLASS_ID, name: 'X', grade: null } });
		const res = await call(`branch=${BRANCH_ID}`);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ points: [] });
		expect(getStudentRetentionCurve).not.toHaveBeenCalled();
	});
});
