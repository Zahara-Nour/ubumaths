/**
 * Les signalements de l'élève : le numéro de SA copie (décision de David, D6)
 * ==========================================================================
 *
 * Fiche mélangée, affectation individualisée : l'élève lit ses exercices dans
 * son ordre. Ses signalements (onglet de la fiche, page « Mes signalements »,
 * réponse à l'envoi) citent le numéro de SA copie — calcul de la copie de CET
 * élève, jamais celle d'un autre. Fiche illisible : aucun numéro (`null`)
 * plutôt qu'un numéro faux (la position redémarre à chaque section et ignore
 * le mélange).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tableMock, twoLevelExercise } from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, copyDisplayNumbers } from '$lib/worksheets/worksheet-copy';

const user = vi.hoisted(() => ({ id: '' }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: user.id } })
}));

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENTS = [1, 2, 3, 4, 5, 6].map((n) => `550e8400-e29b-41d4-a716-44665544050${n}`);
const CONFIG = { shuffle_exercises: true };
const EXERCISE = twoLevelExercise();

const ROWS = [1, 2, 3, 4, 5, 6].map((n) => ({
	id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
	section_id: null,
	position: n
}));
const REPORTED = ROWS[0];

const ASSIGNMENT = {
	id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
	guidance_level: 'guided',
	individualized: true
};

function copyNumber(studentId: string): number {
	return copyDisplayNumbers(ROWS, [], assignmentCopyScope(ASSIGNMENT, { studentId }), CONFIG).get(
		REPORTED.id
	)!;
}

/** Un élève dont le numéro diffère de la position : le test prouve quelque chose */
const STUDENT = STUDENTS.find((s) => copyNumber(s) !== REPORTED.position)!;

const REPORT = {
	id: '550e8400-e29b-41d4-a716-446655440030',
	assignment_id: ASSIGNMENT_ID,
	worksheet_exercise_id: REPORTED.id,
	worksheet_id: WORKSHEET_ID,
	worksheet_title: 'Dérivées',
	assignment_title: null,
	exercise_position: REPORTED.position,
	description: 'Il manque une parenthèse',
	status: 'pending',
	response: null,
	created_at: '2026-10-13T10:00:00Z',
	updated_at: '2026-10-13T10:00:00Z',
	worksheet_exercises: { position: REPORTED.position }
};

function supabase(overrides: Record<string, object> = {}) {
	return tableMock(
		{
			worksheets: { data: { config: CONFIG }, error: null },
			worksheet_assignments: {
				data: [ASSIGNMENT],
				error: null,
				single: {
					data: {
						...ASSIGNMENT,
						worksheets: { id: WORKSHEET_ID, title: 'Dérivées', created_by: 'prof' }
					},
					error: null
				}
			},
			worksheet_exercises: {
				data: ROWS,
				error: null,
				single: {
					data: { id: REPORTED.id, position: 1, variation_index: null, exercise: EXERCISE },
					error: null
				}
			},
			worksheet_sections: { data: [], error: null },
			worksheet_error_reports: {
				data: [REPORT],
				error: null,
				count: 0,
				single: { data: REPORT, error: null }
			},
			...overrides
		},
		{
			can_access_assignment: { data: true, error: null },
			get_my_error_reports: { data: [REPORT], error: null }
		}
	);
}

const UNREADABLE = { worksheet_sections: { data: null, error: { message: 'refusé' } } };

beforeEach(() => {
	user.id = STUDENT;
});

async function tabList(mock = supabase()) {
	const { GET } = await import('../../worksheets/[assignmentId]/reports/+server');
	const response = await GET({
		locals: { supabase: mock.client } as unknown as App.Locals,
		params: { assignmentId: ASSIGNMENT_ID }
	} as never);
	return ((await response.json()) as { reports: Array<{ exercise_position: number | null }> })
		.reports;
}

async function ownList(mock = supabase()) {
	const { GET } = await import('../+server');
	const response = await GET({
		locals: { supabase: mock.client } as unknown as App.Locals,
		url: new URL('http://localhost/api/student/reports')
	} as never);
	return ((await response.json()) as { reports: Array<{ exercise_position: number | null }> })
		.reports;
}

async function created(mock = supabase()) {
	const { POST } =
		await import('../../worksheets/[assignmentId]/exercises/[exerciseId]/report/+server');
	const response = await POST({
		params: { assignmentId: ASSIGNMENT_ID, exerciseId: EXERCISE.id },
		locals: { supabase: mock.client } as unknown as App.Locals,
		request: { json: async () => ({ description: 'Il manque une parenthèse' }) }
	} as never);
	return ((await response.json()) as { report: { exercise_position: number | null } }).report;
}

describe('signalements de l’élève : numéro de SA copie', () => {
	it('onglet de la fiche : le numéro de la copie de cet élève', async () => {
		expect((await tabList())[0].exercise_position).toBe(copyNumber(STUDENT));
	});

	it('page « Mes signalements » : le numéro de la copie de cet élève', async () => {
		expect((await ownList())[0].exercise_position).toBe(copyNumber(STUDENT));
	});

	it('réponse à l’envoi : le numéro de la copie de cet élève', async () => {
		expect((await created()).exercise_position).toBe(copyNumber(STUDENT));
	});

	it('chaque élève reçoit le numéro de SA copie, pas celui d’un autre', async () => {
		const other = STUDENTS.find((s) => copyNumber(s) !== copyNumber(STUDENT))!;
		user.id = other;
		expect((await tabList())[0].exercise_position).toBe(copyNumber(other));
	});

	it.each([
		['onglet', tabList],
		['Mes signalements', ownList],
		['envoi', created]
	] as const)('%s, fiche illisible : aucun numéro plutôt que la position', async (_n, read) => {
		const result = await read(supabase(UNREADABLE));
		const report = Array.isArray(result) ? result[0] : result;
		expect(report.exercise_position).toBeNull();
	});
});
