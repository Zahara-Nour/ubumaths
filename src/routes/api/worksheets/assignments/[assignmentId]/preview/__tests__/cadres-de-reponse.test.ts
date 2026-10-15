/**
 * GET /api/worksheets/assignments/[assignmentId]/preview — cadres de réponse
 * =========================================================================
 *
 * L'aperçu « vue élève » du prof reçoit les mêmes tailles de cadres que
 * l'élève (ADR 0030, lot 3) : calculées sur le corrigé de la copie, même
 * quand la correction de l'élève simulé est masquée, sans son texte.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tableMock, twoLevelExercise } from '$lib/server/worksheets/__tests__/table-mock';

// ============================================================================
// MOCKS
// ============================================================================

const visibility = vi.hoisted(() => ({ visible: false }));

vi.mock('$lib/server/worksheets/correction-visibility', () => ({
	getCorrectionVisibilityMap: async (_s: unknown, _a: unknown, ids: string[]) =>
		new Map(ids.map((id) => [id, visibility.visible]))
}));
vi.mock('$lib/server/worksheets/assignment-classes', () => ({
	fetchAssignmentClasses: async () => [],
	formatClassNames: () => null
}));
vi.mock('$lib/server/worksheets/assignment-recipients', () => ({
	isStudentOfAssignment: async () => true
}));
vi.mock('$lib/server/worksheets/worksheet-styles', () => ({
	loadAuthorStyleTemplate: async () => null
}));

// ============================================================================
// FIXTURES
// ============================================================================

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440021';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const SECRET = 'SOLUTIONSECRETE';

/** Deux questions : réponse courte (petit cadre), puis longue (grand) */
function framedExercise() {
	const exercise = twoLevelExercise();
	const long = 'Tripler revient à ajouter trois fois le même nombre. '.repeat(6);
	exercise.variations[0] = {
		label: 'guided',
		statement_md: '1. Calcule {{a}} fois 3.\n2. Justifie.',
		solution_md: `1. {{t}}\n2. ${SECRET} ${long}`
	};
	return exercise;
}

function supabase(config: Record<string, unknown>) {
	return tableMock({
		worksheet_assignments: {
			data: {
				id: ASSIGNMENT_ID,
				created_by: TEACHER_ID,
				worksheet_id: WORKSHEET_ID,
				guidance_level: 'guided',
				individualized: false,
				instructions: null,
				available_from: '2026-10-01T08:00:00Z',
				closes_at: null,
				show_corrections: false,
				worksheets: {
					id: WORKSHEET_ID,
					title: 'Évaluation',
					description: null,
					type: 'assessment',
					config,
					translations: null,
					style_id: null,
					template_id: null,
					created_by: TEACHER_ID,
					total_points: null,
					estimated_duration_minutes: null
				}
			},
			error: null
		},
		profiles: { data: { role: 'teacher', firstname: 'Léa', lastname: 'Martin' }, error: null },
		worksheet_exercises: {
			data: [
				{
					id: '550e8400-e29b-41d4-a716-446655440012',
					position: 1,
					points: null,
					custom_instructions: null,
					translations: null,
					correction_visible: false,
					variation_index: null,
					section_id: null,
					is_essential: false,
					exercise: framedExercise()
				}
			],
			error: null
		},
		worksheet_sections: { data: [], error: null }
	});
}

interface PreviewExercise {
	correction: string | null;
	correction_visible: boolean;
	answers?: string | null;
	answer_frame_estimate?: { questions?: string[]; exercise_cm?: number };
}

async function preview(config: Record<string, unknown>, studentId?: string) {
	const { GET } = await import('../+server');
	const url = new URL('http://localhost/preview');
	if (studentId) url.searchParams.set('studentId', studentId);
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		url,
		locals: {
			supabase: supabase(config).client,
			safeGetSession: async () => ({ user: { id: TEACHER_ID } })
		} as unknown as App.Locals
	} as never);
	return (await response.json()) as { exercises: PreviewExercise[] };
}

// ============================================================================
// TESTS
// ============================================================================

describe('aperçu de l’affectation : cadres de réponse', () => {
	beforeEach(() => {
		visibility.visible = false;
	});

	it('élève simulé, correction MASQUÉE : tailles du vrai corrigé, sans son texte', async () => {
		const view = await preview({ answers_on_sheet: true }, STUDENT_ID);
		const exercise = view.exercises[0];
		expect(exercise.correction_visible).toBe(false);
		expect(exercise.correction).toBeNull();
		expect(exercise.answers).toBeNull();
		expect(exercise.answer_frame_estimate).toEqual({ questions: ['small', 'large'] });
		expect(JSON.stringify(view)).not.toContain(SECRET);
	});

	it('vue prof, mode exercice : la hauteur seule', async () => {
		const view = await preview({ answers_on_sheet: true, answer_frames: 'exercise' });
		expect(view.exercises[0].answer_frame_estimate).toEqual({ exercise_cm: 7 });
	});

	it('sans réponses sur le sujet : aucune taille', async () => {
		const view = await preview({}, STUDENT_ID);
		expect(view.exercises[0].answer_frame_estimate).toBeUndefined();
	});
});
