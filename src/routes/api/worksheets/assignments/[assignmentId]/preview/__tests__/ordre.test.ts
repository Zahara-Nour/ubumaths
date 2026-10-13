/**
 * Option « mélanger les exercices » : l'ordre arrive à l'élève
 * ============================================================
 *
 * L'API élève et l'aperçu d'affectation servent les exercices dans l'ordre
 * de la copie (`copyExerciseOrder`, la fonction qui ordonne aussi le PDF du
 * prof) et le disent (`shuffled`) : l'écran et le PDF de l'élève ne
 * retrient pas par `position`. Le schéma de réponse retire les clés qu'il ne
 * connaît pas : ces tests passent par lui.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, copyExerciseOrder } from '$lib/worksheets/worksheet-copy';

// ============================================================================
// MOCKS
// ============================================================================

const currentUser = vi.hoisted(() => ({ id: '' }));

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: currentUser.id } })
}));
vi.mock('$lib/server/worksheets/assignment-access', () => ({
	resolveAssignmentAccess: async () => ({ canRead: true, readOnly: false })
}));
vi.mock('$lib/server/worksheets/assignment-classes', () => ({
	fetchAssignmentClasses: async () => [],
	formatClassNames: () => null
}));
vi.mock('$lib/server/worksheets/correction-visibility', () => ({
	getCorrectionVisibilityMap: async (_s: unknown, _a: unknown, ids: string[]) =>
		new Map(ids.map((id) => [id, true]))
}));

// ============================================================================
// FIXTURES — une section de 6 exercices, puis 2 hors section
// ============================================================================

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const SECTION_ID = '550e8400-e29b-41d4-a716-446655440030';
const TEACHER = '550e8400-e29b-41d4-a716-446655440001';
const STUDENTS = [
	'550e8400-e29b-41d4-a716-446655440021',
	'550e8400-e29b-41d4-a716-446655440022',
	'550e8400-e29b-41d4-a716-446655440023',
	'550e8400-e29b-41d4-a716-446655440024'
];

const ROWS = [
	...[1, 2, 3, 4, 5, 6].map((n) => ({
		id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
		position: n,
		section_id: SECTION_ID as string | null
	})),
	...[1, 2].map((n) => ({
		id: `550e8400-e29b-41d4-a716-4466554402${n}0`,
		position: n,
		section_id: null
	}))
];

interface MockOptions {
	/** Exercice dont la jointure rend `null` (exercice orphelin) */
	orphanId?: string;
	/** Lecture des sections en échec */
	sectionsError?: boolean;
}

function supabase(
	individualized: boolean,
	config: Record<string, unknown>,
	options: MockOptions = {}
): TableMock {
	return tableMock({
		worksheet_assignments: {
			data: {
				id: ASSIGNMENT_ID,
				created_by: TEACHER,
				worksheet_id: WORKSHEET_ID,
				guidance_level: 'guided',
				individualized,
				instructions: null,
				available_from: '2026-10-01T08:00:00Z',
				closes_at: null,
				show_corrections: true,
				worksheets: {
					id: WORKSHEET_ID,
					title: 'Fiche',
					description: null,
					type: 'worksheet',
					config,
					translations: null
				}
			},
			error: null
		},
		profiles: { data: { role: 'teacher', firstname: 'Ada', lastname: 'L.' }, error: null },
		worksheet_assignment_students: { data: { id: 'was-1' }, error: null },
		worksheet_exercises: {
			// Ordre de la base : `order('position')`, positions qui redémarrent par section
			data: [...ROWS]
				.sort((a, b) => a.position - b.position)
				.map((row) => ({
					...row,
					points: null,
					custom_instructions: null,
					translations: null,
					correction_visible: true,
					variation_index: null,
					is_essential: false,
					exercise: row.id === options.orphanId ? null : twoLevelExercise()
				})),
			error: null
		},
		worksheet_sections: options.sectionsError
			? { data: null, error: { message: 'panne' } }
			: {
					data: [
						{ id: SECTION_ID, title: 'A', instructions: null, translations: null, position: 1 }
					],
					error: null
				}
	});
}

interface View {
	shuffled?: boolean;
	exercises: Array<{ id: string; statement: string }>;
}

async function studentApi(mock: TableMock, studentId: string): Promise<View> {
	currentUser.id = studentId;
	const { GET } = await import('../../../../../student/worksheets/[assignmentId]/+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		locals: { supabase: mock.client } as unknown as App.Locals
	} as never);
	return (await response.json()) as View;
}

async function preview(mock: TableMock, studentId?: string): Promise<View> {
	currentUser.id = TEACHER;
	const { GET } = await import('../+server');
	const url = new URL(
		`http://localhost/api/worksheets/assignments/${ASSIGNMENT_ID}/preview${
			studentId ? `?studentId=${studentId}` : ''
		}`
	);
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		url,
		locals: {
			supabase: mock.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		} as unknown as App.Locals
	} as never);
	return (await response.json()) as View;
}

/** L'ordre attendu : celui que la copie du prof (et donc le PDF) donnerait */
function expectedOrder(individualized: boolean, studentId?: string): string[] {
	const scope = assignmentCopyScope(
		{ id: ASSIGNMENT_ID, worksheet_id: WORKSHEET_ID, guidance_level: 'guided', individualized },
		{ studentId }
	);
	const sections = [{ id: SECTION_ID, position: 1 }];
	return (copyExerciseOrder(ROWS, sections, scope, { shuffle_exercises: true }) ?? []).map(
		(row) => row.id
	);
}

const ids = (view: View) => view.exercises.map((e) => e.id);

// ============================================================================
// TESTS
// ============================================================================

describe('mélange : l’ordre de la copie arrive à l’élève', () => {
	it('API élève : exercices dans l’ordre de SA copie, marqués `shuffled`', async () => {
		const orders = new Set<string>();
		for (const studentId of STUDENTS) {
			const view = await studentApi(supabase(true, { shuffle_exercises: true }), studentId);
			expect(view.shuffled).toBe(true);
			expect(ids(view)).toEqual(expectedOrder(true, studentId));
			orders.add(ids(view).join());
		}
		// Individualisée : au moins deux élèves n'ont pas le même ordre
		expect(orders.size).toBeGreaterThan(1);
	});

	it('API élève, non individualisée : un seul ordre pour la classe', async () => {
		const orders = new Set<string>();
		for (const studentId of STUDENTS) {
			orders.add(
				ids(await studentApi(supabase(false, { shuffle_exercises: true }), studentId)).join()
			);
		}
		expect([...orders]).toEqual([expectedOrder(false).join()]);
	});

	it('aperçu d’un élève : le même ordre que son API ; sans élève : celui de la classe', async () => {
		for (const studentId of STUDENTS) {
			const fromPreview = await preview(supabase(true, { shuffle_exercises: true }), studentId);
			const fromStudent = await studentApi(supabase(true, { shuffle_exercises: true }), studentId);
			expect(fromPreview.shuffled).toBe(true);
			expect(ids(fromPreview)).toEqual(ids(fromStudent));
		}
		const classView = await preview(supabase(true, { shuffle_exercises: true }));
		expect(ids(classView)).toEqual(expectedOrder(true));
	});

	it('option décochée : ordre de la base, pas de `shuffled` (réponse inchangée)', async () => {
		const dbOrder = [...ROWS].sort((a, b) => a.position - b.position).map((r) => r.id);
		for (const config of [{}, { shuffle_exercises: false }]) {
			const view = await studentApi(supabase(true, config), STUDENTS[0]);
			expect(view.shuffled).toBeUndefined();
			expect(ids(view)).toEqual(dbOrder);
			const teacherView = await preview(supabase(true, config), STUDENTS[0]);
			expect(teacherView.shuffled).toBeUndefined();
			expect(ids(teacherView)).toEqual(dbOrder);
		}
	});

	it('exercice orphelin : les autres gardent l’ordre de la copie du prof', async () => {
		const orphanId = ROWS[2].id;
		const withoutOrphan = (order: string[]) => order.filter((id) => id !== orphanId);
		for (const studentId of STUDENTS) {
			const mock = supabase(true, { shuffle_exercises: true }, { orphanId });
			const fromStudent = await studentApi(mock, studentId);
			expect(ids(fromStudent)).toEqual(withoutOrphan(expectedOrder(true, studentId)));
			const fromPreview = await preview(
				supabase(true, { shuffle_exercises: true }, { orphanId }),
				studentId
			);
			expect(ids(fromPreview)).toEqual(withoutOrphan(expectedOrder(true, studentId)));
		}
	});

	it('sections illisibles + fiche mélangée : erreur 500 plutôt qu’un ordre faux', async () => {
		const mock = () => supabase(true, { shuffle_exercises: true }, { sectionsError: true });
		await expect(studentApi(mock(), STUDENTS[0])).rejects.toMatchObject({ status: 500 });
		await expect(preview(mock(), STUDENTS[0])).rejects.toMatchObject({ status: 500 });
	});

	it('sections illisibles sans mélange : réponse servie, comme avant', async () => {
		const mock = () => supabase(true, {}, { sectionsError: true });
		expect((await studentApi(mock(), STUDENTS[0])).exercises).toHaveLength(ROWS.length);
		expect((await preview(mock(), STUDENTS[0])).exercises).toHaveLength(ROWS.length);
	});
});
