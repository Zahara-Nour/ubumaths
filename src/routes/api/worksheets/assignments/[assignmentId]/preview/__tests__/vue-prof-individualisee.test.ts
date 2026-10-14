/**
 * Aperçu « vue prof » d'une affectation individualisée (décision de David, D6)
 * ===========================================================================
 *
 * Chaque élève a sa version (valeurs et/ou ordre) : la vue prof s'appuie sur
 * la copie d'un élève choisi (`copyOf`), comme le corrigé de classe ; la
 * réponse le dit (`per_student_copies`). Le nom de l'élève n'est pas servi
 * (rien à imprimer) et les corrections restent toutes visibles. Affectation
 * non individualisée : rien ne change.
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
	/** L'élève choisi n'est pas destinataire de l'affectation */
	notRecipient?: boolean;
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
		worksheet_assignment_students: {
			data: options.notRecipient ? null : { id: 'was-1' },
			error: null
		},
		worksheet_assignment_classes: { data: [], error: null },
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
	preview_mode: string;
	preview_student_name: string | null;
	per_student_copies?: boolean;
	shuffled?: boolean;
	exercises: Array<{ id: string; correction_visible: boolean }>;
}

async function preview(mock: TableMock, query = ''): Promise<View> {
	currentUser.id = TEACHER;
	const { GET } = await import('../+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		url: new URL(`http://localhost/api/worksheets/assignments/${ASSIGNMENT_ID}/preview${query}`),
		locals: {
			supabase: mock.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		} as unknown as App.Locals
	} as never);
	return (await response.json()) as View;
}

function studentOrder(studentId: string): string[] {
	const scope = assignmentCopyScope(
		{
			id: ASSIGNMENT_ID,
			worksheet_id: WORKSHEET_ID,
			guidance_level: 'guided',
			individualized: true
		},
		{ studentId }
	);
	return (copyExerciseOrder(ROWS, [{ id: SECTION_ID, position: 1 }], scope, SHUFFLE) ?? []).map(
		(row) => row.id
	);
}

const SHUFFLE = { shuffle_exercises: true };

describe('aperçu vue prof d’une affectation individualisée', () => {
	it('sans élève choisi : la réponse dit que chaque élève a sa version', async () => {
		const view = await preview(supabase(true, SHUFFLE));
		expect(view.preview_mode).toBe('teacher');
		expect(view.per_student_copies).toBe(true);
	});

	it('`copyOf` : la copie de cet élève, en vue prof (corrections visibles, aucun nom)', async () => {
		const student = STUDENTS[1];
		const view = await preview(supabase(true, SHUFFLE), `?copyOf=${student}`);
		expect(view.preview_mode).toBe('teacher');
		expect(view.preview_student_name).toBeNull();
		expect(view.per_student_copies).toBe(true);
		expect(view.exercises.map((e) => e.id)).toEqual(studentOrder(student));
		expect(view.exercises.every((e) => e.correction_visible)).toBe(true);
	});

	it('`copyOf` d’un élève hors de l’affectation : 400', async () => {
		await expect(
			preview(supabase(true, SHUFFLE, { notRecipient: true }), `?copyOf=${STUDENTS[0]}`)
		).rejects.toMatchObject({ status: 400 });
	});

	it('non individualisée : copie de la classe, `copyOf` ignoré, rien ne change', async () => {
		const plain = await preview(supabase(false, SHUFFLE));
		const withCopyOf = await preview(supabase(false, SHUFFLE), `?copyOf=${STUDENTS[1]}`);
		expect(plain.per_student_copies).toBe(false);
		expect(withCopyOf.exercises.map((e) => e.id)).toEqual(plain.exercises.map((e) => e.id));
	});
});
