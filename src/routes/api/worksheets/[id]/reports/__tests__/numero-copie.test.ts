/**
 * Signalements de toute une fiche : le numéro de la copie de l'élève (D6)
 * =======================================================================
 *
 * L'onglet « Signalements » de la fiche (toutes affectations) montre, pour
 * chaque signalement, le numéro que SON élève lit sur sa copie — et non la
 * position, qui redémarre à chaque section et ignore le mélange.
 */
import { describe, expect, it, vi } from 'vitest';
import { tableMock } from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, copyDisplayNumbers } from '$lib/worksheets/worksheet-copy';

const TEACHER = '550e8400-e29b-41d4-a716-446655440001';
vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async () => ({ user: { id: TEACHER }, profile: { role: 'teacher' } })
}));

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENTS = [1, 2, 3, 4, 5, 6].map((n) => `550e8400-e29b-41d4-a716-44665544050${n}`);
const CONFIG = { shuffle_exercises: true };

const ROWS = [1, 2, 3, 4, 5, 6].map((n) => ({
	id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
	section_id: null,
	position: n
}));

const ASSIGNMENT = {
	id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
	guidance_level: 'guided',
	individualized: true,
	title: 'Contrôle',
	worksheet_assignment_classes: []
};

describe('GET /api/worksheets/[id]/reports', () => {
	it('chaque signalement porte le numéro de la copie de SON élève', async () => {
		const reports = STUDENTS.map((studentId, i) => ({
			id: `550e8400-e29b-41d4-a716-44665544030${i}`,
			assignment_id: ASSIGNMENT_ID,
			worksheet_exercise_id: ROWS[0].id,
			student_id: studentId,
			description: 'Erreur',
			status: 'pending',
			response: null,
			created_at: '2026-10-13T10:00:00Z',
			updated_at: '2026-10-13T10:00:00Z',
			student: { firstname: 'Léa', lastname: 'Martin' }
		}));
		const mock = tableMock({
			worksheets: {
				data: { id: WORKSHEET_ID, created_by: TEACHER, title: 'Fiche', config: CONFIG },
				error: null
			},
			worksheet_assignments: { data: [ASSIGNMENT], error: null },
			worksheet_exercises: { data: ROWS, error: null },
			worksheet_sections: { data: [], error: null },
			worksheet_error_reports: { data: reports, error: null, count: reports.length }
		});
		const { GET } = await import('../+server');
		const response = await GET({
			locals: { supabase: mock.client } as unknown as App.Locals,
			params: { id: WORKSHEET_ID },
			url: new URL('http://localhost/x')
		} as never);
		const body = (await response.json()) as {
			reports: Array<{ student_id: string; exercise_position: number }>;
		};
		for (const r of body.reports) {
			const expected = copyDisplayNumbers(
				ROWS,
				[],
				assignmentCopyScope(ASSIGNMENT, { studentId: r.student_id }),
				CONFIG
			).get(ROWS[0].id);
			expect(r.exercise_position).toBe(expected);
		}
		expect(new Set(body.reports.map((r) => r.exercise_position)).size).toBeGreaterThan(1);
	});
});
