/**
 * Suivi d'un élève (prof) : la garde AVANT toute lecture (admin refusé),
 * et une lecture des points en échec qui se dit (`pointsError`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/middleware/student-access', () => ({ verifyTeacherStudent: vi.fn() }));
vi.mock('$lib/server/stats/student-follow-up', () => ({ getStudentPointFollowUp: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { getStudentPointFollowUp } from '$lib/server/stats/student-follow-up';
import { load } from '../+page.server';

const STUDENT_ID = '7d3f6c2e-1b4a-4c8d-9e0f-123456789abc';

let profileRow: Record<string, unknown> | null;

const SUPABASE = {
	from: vi.fn(() => ({
		select: () => ({
			eq: () => ({ maybeSingle: async () => ({ data: profileRow, error: null }) })
		})
	}))
};
const locals = { supabase: SUPABASE } as unknown as App.Locals;

function run(studentId = STUDENT_ID) {
	return load({ locals, params: { studentId } } as unknown as Parameters<
		typeof load
	>[0]) as Promise<{
		student: { id: string; fullName: string };
		points: unknown[];
		pointsError: boolean;
	}>;
}

beforeEach(() => {
	vi.clearAllMocks();
	profileRow = { id: STUDENT_ID, firstname: 'Alix', lastname: 'Martin' };
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'prof-1' },
		profile: { id: 'prof-1', role: 'teacher' }
	} as never);
	vi.mocked(verifyTeacherStudent).mockResolvedValue(true);
	vi.mocked(getStudentPointFollowUp).mockResolvedValue([]);
});

describe('teacher/students/[studentId] load (suivi)', () => {
	it('prof seulement : l’admin est refusé, avant toute lecture', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'teacher');
		expect(getStudentPointFollowUp).not.toHaveBeenCalled();
	});

	it('identifiant invalide → 400, sans aucune lecture', async () => {
		await expect(run('pas-un-uuid')).rejects.toMatchObject({ status: 400 });
		expect(verifyTeacherStudent).not.toHaveBeenCalled();
		expect(getStudentPointFollowUp).not.toHaveBeenCalled();
	});

	it('pas un élève du prof → 403, sans aucune lecture', async () => {
		vi.mocked(verifyTeacherStudent).mockResolvedValue(false);
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(SUPABASE.from).not.toHaveBeenCalled();
		expect(getStudentPointFollowUp).not.toHaveBeenCalled();
	});

	it('rend l’élève et ses points', async () => {
		const points = [{ id: 'p1', name: 'Point un' }];
		vi.mocked(getStudentPointFollowUp).mockResolvedValue(points as never);
		const data = await run();
		expect(data.student).toEqual({ id: STUDENT_ID, fullName: 'Alix Martin' });
		expect(data.points).toEqual(points);
		expect(data.pointsError).toBe(false);
		expect(getStudentPointFollowUp).toHaveBeenCalledWith(SUPABASE, STUDENT_ID);
	});

	it('lecture des points en échec → pointsError, la page reste', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(getStudentPointFollowUp).mockRejectedValue(new Error('boom'));
		const data = await run();
		expect(data.pointsError).toBe(true);
		expect(data.points).toEqual([]);
		expect(data.student.fullName).toBe('Alix Martin');
	});
});
