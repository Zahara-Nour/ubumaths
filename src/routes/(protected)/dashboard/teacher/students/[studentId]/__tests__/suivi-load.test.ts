/**
 * Suivi d'un élève (prof) : la garde AVANT toute lecture (admin refusé),
 * et chaque bloc lu à part : un bloc en échec le dit, les autres restent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/middleware/student-access', () => ({ verifyTeacherStudent: vi.fn() }));
vi.mock('$lib/server/stats/student-follow-up', () => ({
	getStudentPointFollowUp: vi.fn(),
	getStudentEvaluations: vi.fn(),
	getStudentRegularity: vi.fn(),
	getStudentCompetences: vi.fn()
}));

import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import {
	getStudentCompetences,
	getStudentEvaluations,
	getStudentPointFollowUp,
	getStudentRegularity
} from '$lib/server/stats/student-follow-up';
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
		evaluations: unknown[];
		evaluationsError: boolean;
		regularity: unknown;
		competences: unknown[];
		competencesError: boolean;
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
	vi.mocked(getStudentEvaluations).mockResolvedValue([]);
	vi.mocked(getStudentRegularity).mockResolvedValue({ weeks: [], tiers: [] });
	vi.mocked(getStudentCompetences).mockResolvedValue([]);
});

const READERS = [
	getStudentPointFollowUp,
	getStudentEvaluations,
	getStudentRegularity,
	getStudentCompetences
];

describe('teacher/students/[studentId] load (suivi)', () => {
	it('prof seulement : l’admin est refusé, avant toute lecture', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'teacher');
		for (const reader of READERS) expect(reader).not.toHaveBeenCalled();
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
		for (const reader of READERS) expect(reader).not.toHaveBeenCalled();
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

	it('rend les trois autres blocs, lus avec le client du prof', async () => {
		const evaluations = [{ evaluation_id: 'e1', title: 'C1', best_grade: 14, status: 'completed' }];
		const regularity = { weeks: [{ start: '2026-09-07', holiday: false }], tiers: [2] };
		const competences = [{ id: 'c1', name: 'Chercher', level: 'fragile' }];
		vi.mocked(getStudentEvaluations).mockResolvedValue(evaluations as never);
		vi.mocked(getStudentRegularity).mockResolvedValue(regularity as never);
		vi.mocked(getStudentCompetences).mockResolvedValue(competences as never);
		const data = await run();
		expect(data.evaluations).toEqual(evaluations);
		expect(data.regularity).toEqual(regularity);
		expect(data.competences).toEqual(competences);
		expect(data.evaluationsError).toBe(false);
		expect(data.competencesError).toBe(false);
		for (const reader of READERS) {
			expect(reader).toHaveBeenCalledWith(SUPABASE, STUDENT_ID);
		}
	});

	it.each([
		['contrôles', getStudentEvaluations],
		['régularité', getStudentRegularity],
		['compétences', getStudentCompetences]
	])('lecture %s en échec : ce bloc le dit, les autres restent', async (_label, failing) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(failing).mockRejectedValue(new Error('boom'));
		vi.mocked(getStudentPointFollowUp).mockResolvedValue([{ id: 'p1' }] as never);
		const data = await run();
		expect(data.points).toEqual([{ id: 'p1' }]);
		expect(data.pointsError).toBe(false);
		expect(data.evaluationsError).toBe(failing === getStudentEvaluations);
		expect(data.regularity === null).toBe(failing === getStudentRegularity);
		expect(data.competencesError).toBe(failing === getStudentCompetences);
	});
});
