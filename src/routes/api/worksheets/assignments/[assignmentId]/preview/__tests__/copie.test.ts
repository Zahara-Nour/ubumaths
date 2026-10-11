/**
 * GET /api/worksheets/assignments/[assignmentId]/preview — même copie que
 * l'élève (ADR 0023)
 * ======================================================================
 *
 * L'aperçu d'un élève choisi montre EXACTEMENT ce que l'API élève lui sert ;
 * l'aperçu sans élève montre la copie de la classe, au niveau de
 * l'affectation.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, resolveWorksheetExerciseCopy } from '$lib/worksheets/worksheet-copy';

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
// FIXTURES
// ============================================================================

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';
const TEACHER = '550e8400-e29b-41d4-a716-446655440001';
const STUDENTS = [
	'550e8400-e29b-41d4-a716-446655440021',
	'550e8400-e29b-41d4-a716-446655440022',
	'550e8400-e29b-41d4-a716-446655440023',
	'550e8400-e29b-41d4-a716-446655440024'
];

function supabase(guidanceLevel: string, individualized: boolean): TableMock {
	return tableMock({
		worksheet_assignments: {
			data: {
				id: ASSIGNMENT_ID,
				created_by: TEACHER,
				worksheet_id: WORKSHEET_ID,
				guidance_level: guidanceLevel,
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
					config: {},
					translations: null
				}
			},
			error: null
		},
		profiles: { data: { role: 'teacher', firstname: 'Ada', lastname: 'L.' }, error: null },
		worksheet_assignment_students: { data: { id: 'was-1' }, error: null },
		worksheet_exercises: {
			data: [
				{
					id: WE_ID,
					position: 1,
					points: null,
					custom_instructions: null,
					translations: null,
					correction_visible: true,
					variation_index: null,
					section_id: null,
					is_essential: false,
					exercise: twoLevelExercise()
				}
			],
			error: null
		},
		worksheet_sections: { data: [], error: null }
	});
}

interface View {
	exercises: Array<{ statement: string; correction: string | null }>;
}

async function preview(mock: TableMock, studentId?: string): Promise<View> {
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

async function studentApi(mock: TableMock, studentId: string): Promise<View> {
	currentUser.id = studentId;
	const { GET } = await import('../../../../../student/worksheets/[assignmentId]/+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		locals: { supabase: mock.client } as unknown as App.Locals
	} as never);
	return (await response.json()) as View;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Aperçu d’affectation : la copie de l’élève', () => {
	it('élève choisi : la même copie que l’API élève, énoncé et corrigé', async () => {
		for (const level of ['guided', 'autonomous']) {
			for (const studentId of STUDENTS) {
				const fromPreview = await preview(supabase(level, true), studentId);
				const fromStudent = await studentApi(supabase(level, true), studentId);
				expect(fromPreview.exercises[0].statement).toBe(fromStudent.exercises[0].statement);
				expect(fromPreview.exercises[0].correction).toBe(fromStudent.exercises[0].correction);
			}
		}
	});

	it('sans élève : la copie de la classe, au niveau de l’affectation', async () => {
		const view = await preview(supabase('autonomous', true));
		const expected = resolveWorksheetExerciseCopy(
			{ id: WE_ID, variation_index: null, exercise: twoLevelExercise() },
			assignmentCopyScope(
				{
					id: ASSIGNMENT_ID,
					worksheet_id: WORKSHEET_ID,
					guidance_level: 'autonomous',
					individualized: true
				},
				{ locale: 'fr' }
			)
		);
		expect(view.exercises[0].statement).toBe(expected.statement);
		expect(view.exercises[0].statement).toMatch(/^Autonome/);
		expect(view.exercises[0].statement).not.toContain('{{');
	});

	it('l’affectation est lue AVEC son niveau et sa case « individualisés »', async () => {
		const mock = supabase('autonomous', true);
		await preview(mock, STUDENTS[0]);
		const columns = mock.selects
			.filter((select) => select.table === 'worksheet_assignments')
			.map((select) => select.columns);
		expect(columns.some((c) => /\bguidance_level\b/.test(c) && /\bindividualized\b/.test(c))).toBe(
			true
		);
	});
});
