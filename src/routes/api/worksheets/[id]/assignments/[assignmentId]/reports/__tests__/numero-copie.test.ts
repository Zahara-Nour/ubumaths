/**
 * Signalements : le numéro de l'exercice dans LA COPIE de l'élève (D6)
 * ====================================================================
 *
 * Fiche mélangée, affectation individualisée : chaque élève a son ordre. La
 * liste du prof, la page du signalement et la notification envoyée à l'élève
 * citent le numéro que CET élève lit sur sa copie — le même calcul que la
 * copie (`copyDisplayNumbers`), pas l'ordre des positions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tableMock, type TableMock } from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, copyDisplayNumbers } from '$lib/worksheets/worksheet-copy';

const notified = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));
vi.mock('$lib/server/auto-notifications', () => ({
	notifyErrorReportValidated: async (data: Record<string, unknown>) => {
		notified.calls.push({ kind: 'validated', ...data });
	},
	notifyErrorReportRejected: async (data: Record<string, unknown>) => {
		notified.calls.push({ kind: 'rejected', ...data });
	}
}));

const TEACHER = '550e8400-e29b-41d4-a716-446655440001';
vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async () => ({ user: { id: TEACHER }, profile: { role: 'teacher' } })
}));

// ============================================================================
// FIXTURES
// ============================================================================

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440030';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-4466554402e0';
const STUDENTS = [1, 2, 3, 4, 5, 6].map((n) => `550e8400-e29b-41d4-a716-44665544050${n}`);

const ROWS = [1, 2, 3, 4, 5, 6].map((n) => ({
	id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
	worksheet_id: WORKSHEET_ID,
	exercise_id: EXERCISE_ID,
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
const CONFIG = { shuffle_exercises: true };

/** Le numéro de l'exercice signalé dans la copie de l'élève */
function copyNumber(studentId: string, weId = REPORTED.id): number {
	const numbers = copyDisplayNumbers(
		ROWS,
		[],
		assignmentCopyScope(ASSIGNMENT, { studentId }),
		CONFIG
	);
	return numbers.get(weId)!;
}

/** Un élève dont le numéro diffère de la position : le test prouve quelque chose */
const STUDENT = STUDENTS.find((s) => copyNumber(s) !== REPORTED.position)!;

function report(studentId: string, weId = REPORTED.id) {
	return {
		id: REPORT_ID,
		assignment_id: ASSIGNMENT_ID,
		worksheet_exercise_id: weId,
		student_id: studentId,
		description: 'Il manque une parenthèse',
		status: 'pending',
		response: null,
		variation_index: 0,
		seed: 12,
		created_at: '2026-10-13T10:00:00Z',
		updated_at: '2026-10-13T10:00:00Z',
		student: { firstname: 'Léa', lastname: 'Martin' }
	};
}

function supabase(
	reports: object,
	worksheetExercisesSingle: object = REPORTED,
	overrides: Record<string, object> = {}
): TableMock {
	return tableMock(
		{
			worksheets: {
				data: { id: WORKSHEET_ID, created_by: TEACHER, title: 'Dérivées', config: CONFIG },
				error: null
			},
			worksheet_assignments: {
				data: [ASSIGNMENT],
				error: null,
				single: { data: { ...ASSIGNMENT, created_by: TEACHER }, error: null }
			},
			worksheet_exercises: {
				data: ROWS,
				error: null,
				single: { data: worksheetExercisesSingle, error: null }
			},
			worksheet_sections: { data: [], error: null },
			worksheet_error_reports: { data: reports, error: null, count: 1 },
			worksheet_assignment_classes: { data: [], error: null },
			worksheet_assignment_students: { data: { id: 'was-1' }, error: null },
			exercises: { data: null, error: null },
			...overrides
		},
		{ update_student_bonus: { data: null, error: null } }
	);
}

const PARAMS = { id: WORKSHEET_ID, assignmentId: ASSIGNMENT_ID, reportId: REPORT_ID };

function locals(mock: TableMock): App.Locals {
	return { supabase: mock.client } as unknown as App.Locals;
}

beforeEach(() => {
	notified.calls = [];
});

// ============================================================================
// TESTS
// ============================================================================

describe('liste des signalements d’une affectation', () => {
	it('chaque signalement porte le numéro de la copie de SON élève', async () => {
		const { GET } = await import('../+server');
		const reports = STUDENTS.map((s, i) => ({
			...report(s),
			id: `550e8400-e29b-41d4-a716-44665544030${i}`
		}));
		const response = await GET({
			locals: locals(supabase(reports)),
			params: PARAMS,
			url: new URL('http://localhost/x')
		} as never);
		const body = (await response.json()) as {
			reports: Array<{ student_id: string; exercise_position: number }>;
		};
		for (const r of body.reports) {
			expect(r.exercise_position).toBe(copyNumber(r.student_id));
		}
		expect(new Set(body.reports.map((r) => r.exercise_position)).size).toBeGreaterThan(1);
	});
});

describe('page d’un signalement', () => {
	it('numéro de la copie de l’élève, dans le signalement et le contexte', async () => {
		const { GET } = await import('../[reportId]/+server');
		const detail = {
			...report(STUDENT),
			worksheet_exercise: {
				id: REPORTED.id,
				position: REPORTED.position,
				exercise_id: EXERCISE_ID,
				exercise: {
					id: EXERCISE_ID,
					slug: 'derivee',
					shared: null,
					variations: [{ label: 'guided', statement_md: 'Dériver', solution_md: 'x' }],
					generic_functions: null,
					topic: null
				}
			}
		};
		const response = await GET({ locals: locals(supabase(detail)), params: PARAMS } as never);
		const body = (await response.json()) as {
			report: { exercise_position: number };
			context: { exercise_position: number };
			exercise: { id: string };
		};
		expect(body.report.exercise_position).toBe(copyNumber(STUDENT));
		expect(body.context.exercise_position).toBe(copyNumber(STUDENT));
		// L'identifiant de l'exercice d'origine, pour le lien « Corriger l'exercice »
		expect(body.exercise.id).toBe(EXERCISE_ID);
	});

	it('l’élève est-il encore destinataire ? (lien « Voir la copie » proposé ou non)', async () => {
		const { GET } = await import('../[reportId]/+server');
		const detail = {
			...report(STUDENT),
			worksheet_exercise: {
				id: REPORTED.id,
				position: REPORTED.position,
				exercise_id: EXERCISE_ID,
				exercise: {
					id: EXERCISE_ID,
					slug: 'derivee',
					shared: null,
					variations: [{ label: 'guided', statement_md: 'Dériver', solution_md: 'x' }],
					generic_functions: null,
					topic: null
				}
			}
		};
		const read = async (overrides: Record<string, object>) => {
			const response = await GET({
				locals: locals(supabase(detail, REPORTED, overrides)),
				params: PARAMS
			} as never);
			return ((await response.json()) as { context: { student_is_recipient: boolean | null } })
				.context.student_is_recipient;
		};
		expect(await read({})).toBe(true);
		// A quitté la classe : ni nommé, ni membre actif d'une classe visée
		expect(await read({ worksheet_assignment_students: { data: null, error: null } })).toBe(false);
		// Lecture en panne : inconnu, pas « a quitté la classe »
		expect(
			await read({ worksheet_assignment_students: { data: null, error: { message: 'panne' } } })
		).toBeNull();
	});
});

describe('traitement d’un signalement : la notification de l’élève', () => {
	async function review(status: 'fixed' | 'rejected', mock: TableMock) {
		const { PUT } = await import('../[reportId]/+server');
		const body =
			status === 'fixed'
				? { status, variations: [{ label: 'guided', statement_md: 'Corrigé', solution_md: 'x' }] }
				: { status, response: '<p>Relis la consigne.</p>' };
		return PUT({
			locals: locals(mock),
			params: PARAMS,
			request: new Request('http://localhost/x', { method: 'PUT', body: JSON.stringify(body) })
		} as never);
	}

	it.each(['fixed', 'rejected'] as const)(
		'%s : numéro de SA copie, affectation et exercice de fiche pour le lien',
		async (status) => {
			await review(status, supabase(report(STUDENT)));
			expect(notified.calls).toHaveLength(1);
			expect(notified.calls[0]).toMatchObject({
				kind: status === 'fixed' ? 'validated' : 'rejected',
				studentId: STUDENT,
				exerciseNumber: copyNumber(STUDENT),
				assignmentId: ASSIGNMENT_ID,
				worksheetExerciseId: REPORTED.id
			});
		}
	);

	it('fiche illisible : aucun numéro cité (pas l’ordre des positions)', async () => {
		await review(
			'rejected',
			supabase(report(STUDENT), REPORTED, {
				worksheet_sections: { data: null, error: { message: 'panne' } }
			})
		);
		expect(notified.calls[0]).toMatchObject({ exerciseNumber: null });
	});
});
