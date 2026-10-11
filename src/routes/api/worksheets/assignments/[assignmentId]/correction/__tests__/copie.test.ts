/**
 * GET /api/worksheets/assignments/[assignmentId]/correction — le corrigé du
 * prof est la copie de la classe (ADR 0023)
 * ========================================================================
 *
 * Plus de `worksheet_instances`, plus de tirage : le corrigé du prof est la
 * copie sans élève, au niveau de l'affectation — celle de l'aperçu. Si les
 * valeurs changent d'un élève à l'autre, la réponse le dit.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	selectedColumns,
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, resolveWorksheetExerciseCopy } from '$lib/worksheets/worksheet-copy';
import type { InstanceData } from '$lib/types/worksheets';

// Le rendu Typst réel est passé, la copie qu'il reçoit est captée
const rendered = vi.hoisted(() => ({ instances: [] as InstanceData[] }));
vi.mock('$lib/worksheets/typst-generator', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/worksheets/typst-generator')>();
	return {
		...original,
		generateWorksheetTypst: (options: Parameters<typeof original.generateWorksheetTypst>[0]) => {
			rendered.instances.push(options.instance);
			return original.generateWorksheetTypst(options);
		}
	};
});

vi.mock('$lib/server/worksheets/assignment-classes', () => ({
	fetchAssignmentClasses: async () => [],
	formatClassNames: () => null
}));

// ============================================================================
// FIXTURES
// ============================================================================

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';
const TEACHER = '550e8400-e29b-41d4-a716-446655440001';
const NOTICE =
	'Valeurs propres à chaque élève : ce corrigé montre la copie commune ; chaque élève voit le sien sur sa copie (écran et PDF).';

function exerciseWithoutVariables() {
	const exercise = twoLevelExercise();
	return {
		...exercise,
		shared: null,
		variations: exercise.variations.map((v) => ({
			...v,
			statement_md: v.statement_md.replace('{{a}}', '7'),
			solution_md: v.solution_md.replace('{{t}}', '21')
		}))
	};
}

function supabase(
	guidanceLevel: string,
	individualized: boolean,
	exercise: object = twoLevelExercise(),
	reader: { role: string; createdBy: string; access: boolean } = {
		role: 'teacher',
		createdBy: TEACHER,
		access: false
	}
): TableMock {
	return tableMock(
		{
			worksheet_assignments: {
				data: {
					id: ASSIGNMENT_ID,
					title: null,
					created_by: reader.createdBy,
					worksheet_id: WORKSHEET_ID,
					guidance_level: guidanceLevel,
					individualized,
					closes_at: null,
					correction_release_mode: 'immediate',
					status: 'active',
					worksheet: {
						id: WORKSHEET_ID,
						title: 'Fiche',
						type: 'worksheet',
						config: {},
						worksheet_sections: [],
						worksheet_exercises: [
							{
								id: WE_ID,
								worksheet_id: WORKSHEET_ID,
								exercise_id: twoLevelExercise().id,
								section_id: null,
								position: 1,
								points: null,
								custom_instructions: null,
								translations: null,
								variation_index: null,
								exercise
							}
						]
					}
				},
				error: null
			},
			profiles: { data: { role: reader.role, class_ids: [] }, error: null },
			worksheet_instances: { data: null, error: { code: 'PGRST116', message: 'aucune' } }
		},
		{ can_access_assignment: { data: reader.access, error: null } }
	);
}

interface CorrectionJson {
	exercises: Array<{ statement: string; solution: string }>;
	per_student_values_notice?: string | null;
}

async function correction(mock: TableMock, format: 'json' | 'typst' = 'json') {
	const { GET } = await import('../+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		url: new URL(`http://localhost/x?format=${format}`),
		locals: {
			supabase: mock.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		} as unknown as App.Locals
	} as never);
	return (await response.json()) as CorrectionJson;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Corrigé du prof : la copie de la classe', () => {
	it('version du niveau de l’affectation, variables substituées, sans worksheet_instances', async () => {
		const mock = supabase('autonomous', false);
		const body = await correction(mock);
		const expected = resolveWorksheetExerciseCopy(
			{ id: WE_ID, variation_index: null, exercise: twoLevelExercise() },
			assignmentCopyScope({
				id: ASSIGNMENT_ID,
				worksheet_id: WORKSHEET_ID,
				guidance_level: 'autonomous',
				individualized: false
			})
		);
		expect(body.exercises[0].statement).toBe(expected.statement);
		expect(body.exercises[0].solution).toBe(expected.solution);
		expect(body.exercises[0].solution).not.toContain('{{');
		expect(mock.tablesRead).not.toContain('worksheet_instances');
	});

	it('déterministe : deux appels, le même corrigé (plus de Math.random)', async () => {
		const one = await correction(supabase('guided', true));
		const two = await correction(supabase('guided', true));
		expect(two.exercises).toEqual(one.exercises);
	});

	it('individualisée avec variables : la réponse prévient que les valeurs varient', async () => {
		expect((await correction(supabase('guided', true))).per_student_values_notice).toBe(NOTICE);
		expect((await correction(supabase('guided', true), 'typst')).per_student_values_notice).toBe(
			NOTICE
		);
	});

	it('non individualisée, ou sans variables : aucun avertissement', async () => {
		expect((await correction(supabase('guided', false))).per_student_values_notice).toBeNull();
		expect(
			(await correction(supabase('guided', true, exerciseWithoutVariables())))
				.per_student_values_notice
		).toBeNull();
	});

	it('un élève n’a pas le corrigé de la classe (404, comme avant)', async () => {
		// Corrigés publiés, élève de l'affectation : la route ne filtre pas les
		// exercices masqués, il lit les siens par l'API élève.
		const mock = supabase('guided', false, twoLevelExercise(), {
			role: 'student',
			createdBy: '550e8400-e29b-41d4-a716-446655440099',
			access: true
		});
		await expect(correction(mock)).rejects.toMatchObject({ status: 404 });
	});

	it("les fonctions déclarées de l’exercice sont lues et passées au rendu (sinon `C'(x)` en erreur)", async () => {
		rendered.instances = [];
		const mock = supabase('guided', false, { ...twoLevelExercise(), generic_functions: ['C'] });
		await correction(mock, 'typst');
		expect(selectedColumns(mock, 'worksheet_assignments')).toMatch(/\bgeneric_functions\b/);
		expect(rendered.instances[0].exercises[0].generic_functions).toEqual(['C']);
	});
});
