/**
 * GET /api/student/worksheets/[assignmentId] — les réponses seules
 * ================================================================
 *
 * Règle de sécurité : l'élève reçoit les réponses d'un exercice EXACTEMENT
 * quand il reçoit sa correction (`correction_visible`), jamais avant. Les
 * réponses donnent le résultat : les servir plus tôt, c'est donner la solution.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';

// ============================================================================
// MOCKS
// ============================================================================

const visibility = vi.hoisted(() => ({ visible: true }));

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: '550e8400-e29b-41d4-a716-446655440021' } })
}));
vi.mock('$lib/server/worksheets/assignment-access', () => ({
	resolveAssignmentAccess: async () => ({ canRead: true, readOnly: false })
}));
vi.mock('$lib/server/worksheets/assignment-classes', () => ({
	fetchAssignmentClasses: async () => []
}));
vi.mock('$lib/server/worksheets/correction-visibility', () => ({
	getCorrectionVisibilityMap: async (_s: unknown, _a: unknown, ids: string[]) =>
		new Map(ids.map((id) => [id, visibility.visible]))
}));

// ============================================================================
// FIXTURES
// ============================================================================

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';

/** L'exercice à deux niveaux, avec des réponses dans chaque version */
function exerciseWithAnswers() {
	const exercise = twoLevelExercise();
	return {
		...exercise,
		variations: exercise.variations.map((v) => ({ ...v, answers_md: 'Réponse : {{t}}' }))
	};
}

function supabase(): TableMock {
	return tableMock({
		worksheet_assignments: {
			data: {
				id: ASSIGNMENT_ID,
				worksheet_id: WORKSHEET_ID,
				guidance_level: 'guided',
				individualized: false,
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
		worksheet_exercises: {
			data: [
				{
					id: WE_ID,
					position: 1,
					points: null,
					custom_instructions: null,
					translations: null,
					correction_visible: visibility.visible,
					variation_index: null,
					section_id: null,
					is_essential: false,
					exercise: exerciseWithAnswers()
				}
			],
			error: null
		},
		worksheet_sections: { data: [], error: null },
		worksheet_instances: { data: null, error: null }
	});
}

interface StudentView {
	exercises: Array<{ correction: string | null; answers?: string | null }>;
}

async function fetchCopy(): Promise<StudentView> {
	const { GET } = await import('../+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		locals: { supabase: supabase().client } as unknown as App.Locals
	} as never);
	return (await response.json()) as StudentView;
}

// ============================================================================
// TESTS
// ============================================================================

describe('API élève : les réponses suivent la visibilité de la correction', () => {
	it('correction visible : les réponses sont servies, variables résolues', async () => {
		visibility.visible = true;
		const view = await fetchCopy();
		expect(view.exercises[0].correction).not.toBeNull();
		expect(view.exercises[0].answers).toMatch(/^Réponse : \d+$/);
	});

	it('correction masquée : aucune réponse servie', async () => {
		visibility.visible = false;
		const view = await fetchCopy();
		expect(view.exercises[0].correction).toBeNull();
		expect(view.exercises[0].answers ?? null).toBeNull();
		expect(JSON.stringify(view)).not.toContain('Réponse :');
	});
});
