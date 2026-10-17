/**
 * POST .../exercises/[exerciseId]/report — la version signalée est celle que
 * l'élève a vue (ADR 0023)
 * ========================================================================
 *
 * La copie est recalculée, `worksheet_instances` n'est plus lue (elle est
 * vide : le signalement enregistrait toujours « version inconnue », et la page
 * du prof montrait la première version). Le signalement enregistre la version
 * et la graine de la copie de l'élève, celles de l'API élève.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	selectedColumns,
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import { copySeed } from '$lib/worksheets/student-copy';

const STUDENT = '550e8400-e29b-41d4-a716-446655440021';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: '550e8400-e29b-41d4-a716-446655440021' } })
}));

// ============================================================================
// FIXTURES
// ============================================================================

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';
const EXERCISE = twoLevelExercise();

function supabase(guidanceLevel: string, individualized: boolean): TableMock {
	return tableMock(
		{
			worksheet_assignments: {
				// Liste : le numéro de la copie (`fetchCopyNumbering`) ; une ligne : la route
				data: [
					{
						id: ASSIGNMENT_ID,
						worksheet_id: WORKSHEET_ID,
						guidance_level: guidanceLevel,
						individualized
					}
				],
				error: null,
				single: {
					data: {
						id: ASSIGNMENT_ID,
						worksheet_id: WORKSHEET_ID,
						guidance_level: guidanceLevel,
						individualized,
						worksheets: { id: WORKSHEET_ID, title: 'Fiche', created_by: 'prof' }
					},
					error: null
				}
			},
			worksheet_exercises: {
				data: [{ id: WE_ID, section_id: null, position: 1 }],
				error: null,
				single: {
					data: { id: WE_ID, position: 1, variation_index: null, exercise: EXERCISE },
					error: null
				}
			},
			worksheets: { data: { config: {} }, error: null },
			worksheet_sections: { data: [], error: null },
			worksheet_instances: { data: null, error: { code: 'PGRST116', message: 'aucune' } },
			worksheet_error_reports: {
				data: {
					id: '550e8400-e29b-41d4-a716-446655440030',
					worksheet_exercise_id: WE_ID,
					description: 'Le résultat est faux.',
					status: 'pending',
					response: null,
					created_at: '2026-10-11T08:00:00.000Z',
					updated_at: '2026-10-11T08:00:00.000Z'
				},
				error: null,
				count: 0
			}
		},
		{ can_access_assignment: { data: true, error: null } }
	);
}

async function report(mock: TableMock) {
	const { POST } = await import('../+server');
	return POST({
		params: { assignmentId: ASSIGNMENT_ID, exerciseId: EXERCISE.id },
		locals: { supabase: mock.client } as unknown as App.Locals,
		request: { json: async () => ({ description: 'Le résultat est faux.' }) }
	} as never);
}

function inserted(mock: TableMock) {
	return mock.writes.find((w) => w.table === 'worksheet_error_reports' && w.kind === 'insert')
		?.values as { variation_index: number | null; seed: number | null } | undefined;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Signalement d’erreur : la version que l’élève a vue', () => {
	it('affectation « autonome » : la version autonome est enregistrée', async () => {
		const mock = supabase('autonomous', true);
		const response = await report(mock);
		expect(response.status).toBe(201);
		expect(inserted(mock)?.variation_index).toBe(1);
	});

	it('affectation « guidée » : la version guidée', async () => {
		const mock = supabase('guided', true);
		await report(mock);
		expect(inserted(mock)?.variation_index).toBe(0);
	});

	it('la graine est celle de la copie de l’élève, et tient dans la colonne (int4)', async () => {
		const mock = supabase('autonomous', true);
		await report(mock);
		const seed = inserted(mock)?.seed;
		expect(seed).not.toBeNull();
		expect(seed).toBeGreaterThanOrEqual(0);
		expect(seed).toBeLessThan(2 ** 31);
		expect(seed).toBe(
			copySeed({
				assignmentId: ASSIGNMENT_ID,
				worksheetId: WORKSHEET_ID,
				worksheetExerciseId: WE_ID,
				studentId: STUDENT,
				individualized: true
			})
		);
	});

	it('`worksheet_instances` n’est plus lue ; l’affectation l’est avec son niveau', async () => {
		const mock = supabase('autonomous', false);
		await report(mock);
		expect(mock.tablesRead).not.toContain('worksheet_instances');
		const columns = selectedColumns(mock, 'worksheet_assignments');
		expect(columns).toMatch(/\bguidance_level\b/);
		expect(columns).toMatch(/\bindividualized\b/);
	});
});
