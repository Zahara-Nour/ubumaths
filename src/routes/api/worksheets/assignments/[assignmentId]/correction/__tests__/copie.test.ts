/**
 * GET /api/worksheets/assignments/[assignmentId]/correction — le corrigé du
 * prof est la copie de la classe (ADR 0023)
 * ========================================================================
 *
 * Plus de `worksheet_instances`, plus de tirage : le corrigé du prof est la
 * copie sans élève, au niveau de l'affectation — celle de l'aperçu.
 *
 * Affectation dont chaque élève a sa version (valeurs ou ordre, décision D6) :
 * le corrigé de classe est la copie d'UN élève, choisi par le prof
 * (`studentId`), avec un avertissement imprimé en tête ; sans élève choisi,
 * la route le demande (`needs_student`) au lieu de produire un corrigé qui
 * ne vaut pour personne.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	selectedColumns,
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import {
	assignmentCopyScope,
	buildWorksheetCopy,
	resolveWorksheetExerciseCopy,
	type WorksheetForCopy
} from '$lib/worksheets/worksheet-copy';
import type { InstanceData } from '$lib/types/worksheets';

// Le rendu Typst réel est passé, la copie qu'il reçoit est captée
const rendered = vi.hoisted(() => ({ instances: [] as InstanceData[] }));
vi.mock('$lib/typst/generators', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/typst/generators')>();
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
const STUDENT = '550e8400-e29b-41d4-a716-446655440501';
const NOTICE = 'Chaque élève a sa propre version : consulte ta correction personnelle.';

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
	},
	/** Champs de la fiche à remplacer (config, exercices) */
	worksheetPatch: object = {},
	/** L'élève choisi est-il nommément désigné par l'affectation ? */
	studentAssigned = true
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
						],
						...worksheetPatch
					}
				},
				error: null
			},
			profiles: { data: { role: reader.role, class_ids: [] }, error: null },
			worksheet_assignment_students: {
				data: studentAssigned ? { id: '550e8400-e29b-41d4-a716-446655440600' } : null,
				error: null
			},
			worksheet_assignment_classes: { data: [], error: null },
			worksheet_instances: { data: null, error: { code: 'PGRST116', message: 'aucune' } }
		},
		{ can_access_assignment: { data: reader.access, error: null } }
	);
}

interface CorrectionJson {
	exercises?: Array<{ statement: string; solution: string; exercise_id?: string }>;
	typst?: string;
	per_student_copies?: boolean;
	needs_student?: boolean;
}

async function correction(mock: TableMock, format: 'json' | 'typst' = 'json', studentId?: string) {
	const { GET } = await import('../+server');
	const search = new URLSearchParams({ format });
	if (studentId) search.set('studentId', studentId);
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		url: new URL(`http://localhost/x?${search.toString()}`),
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
		expect(body.exercises?.[0].statement).toBe(expected.statement);
		expect(body.exercises?.[0].solution).toBe(expected.solution);
		expect(body.exercises?.[0].solution).not.toContain('{{');
		expect(mock.tablesRead).not.toContain('worksheet_instances');
	});

	it('déterministe : deux appels, le même corrigé (plus de Math.random)', async () => {
		const one = await correction(supabase('guided', false));
		const two = await correction(supabase('guided', false));
		expect(two.exercises).toEqual(one.exercises);
	});

	it('non individualisée : la copie de la classe, sans avertissement, élève choisi ignoré', async () => {
		const body = await correction(supabase('guided', false), 'typst', STUDENT);
		expect(body.per_student_copies).toBe(false);
		expect(body.typst).toBeDefined();
		expect(body.typst).not.toContain(NOTICE);
		const json = await correction(supabase('guided', false), 'json', STUDENT);
		expect(json.exercises).toEqual((await correction(supabase('guided', false))).exercises);
	});

	it('individualisée sans variables ni mélange : copie commune, rien ne change', async () => {
		const body = await correction(supabase('guided', true, exerciseWithoutVariables()), 'typst');
		expect(body.per_student_copies).toBe(false);
		expect(body.needs_student).toBeUndefined();
		expect(body.typst).not.toContain(NOTICE);
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

	// Option « mélanger les exercices » : le JSON suit l'ordre de la copie, comme le PDF
	it('fiche mélangée : le JSON suit le même ordre que le Typst (`exercise_order`)', async () => {
		const exercises = [1, 2, 3, 4, 5, 6].map((n) => ({
			id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
			worksheet_id: WORKSHEET_ID,
			exercise_id: `550e8400-e29b-41d4-a716-4466554402${n}0`,
			section_id: null,
			position: n,
			points: null,
			custom_instructions: null,
			translations: null,
			variation_index: null,
			exercise: twoLevelExercise(`550e8400-e29b-41d4-a716-4466554402${n}0`)
		}));
		const patch = { config: { shuffle_exercises: true }, worksheet_exercises: exercises };
		rendered.instances = [];
		await correction(supabase('guided', false, twoLevelExercise(), undefined, patch), 'typst');
		const instance = rendered.instances[0];
		expect(instance.exercise_order).toBeDefined();
		const pdfOrder = (instance.exercise_order ?? []).map((i) => instance.exercises[i].exercise_id);
		expect(pdfOrder).not.toEqual(exercises.map((e) => e.exercise_id));

		const body = await correction(supabase('guided', false, twoLevelExercise(), undefined, patch));
		expect(body.exercises?.map((e) => e.exercise_id)).toEqual(pdfOrder);
	});
});

describe('Corrigé de classe d’une affectation individualisée (D6)', () => {
	it.each(['json', 'typst'] as const)(
		'%s sans élève choisi : la route demande l’élève, sans corrigé',
		async (format) => {
			const body = await correction(supabase('guided', true), format);
			expect(body.needs_student).toBe(true);
			expect(body.per_student_copies).toBe(true);
			expect(body.typst).toBeUndefined();
			expect(body.exercises).toBeUndefined();
		}
	);

	it('valeurs propres à chaque élève : la copie de l’élève choisi, avertissement en tête', async () => {
		const json = await correction(supabase('guided', true), 'json', STUDENT);
		const expected = resolveWorksheetExerciseCopy(
			{ id: WE_ID, variation_index: null, exercise: twoLevelExercise() },
			assignmentCopyScope(
				{
					id: ASSIGNMENT_ID,
					worksheet_id: WORKSHEET_ID,
					guidance_level: 'guided',
					individualized: true
				},
				{ studentId: STUDENT }
			)
		);
		expect(json.exercises?.[0].statement).toBe(expected.statement);
		expect(json.per_student_copies).toBe(true);

		const typst = await correction(supabase('guided', true), 'typst', STUDENT);
		expect(typst.typst).toContain(NOTICE);
		expect(typst.per_student_copies).toBe(true);
	});

	it('mélangée (sans variables) : l’ordre de la copie de l’élève choisi', async () => {
		const exercises = [1, 2, 3, 4, 5, 6].map((n) => ({
			id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
			worksheet_id: WORKSHEET_ID,
			exercise_id: `550e8400-e29b-41d4-a716-4466554402${n}0`,
			section_id: null,
			position: n,
			points: null,
			custom_instructions: null,
			translations: null,
			variation_index: null,
			exercise: exerciseWithoutVariables()
		}));
		const patch = { config: { shuffle_exercises: true }, worksheet_exercises: exercises };
		const mock = () => supabase('guided', true, twoLevelExercise(), undefined, patch);
		expect((await correction(mock(), 'json')).needs_student).toBe(true);

		const body = await correction(mock(), 'json', STUDENT);
		const copy = buildWorksheetCopy(
			{
				id: WORKSHEET_ID,
				config: { shuffle_exercises: true },
				worksheet_sections: [],
				worksheet_exercises: exercises
			} as unknown as WorksheetForCopy,
			assignmentCopyScope(
				{
					id: ASSIGNMENT_ID,
					worksheet_id: WORKSHEET_ID,
					guidance_level: 'guided',
					individualized: true
				},
				{ studentId: STUDENT }
			)
		);
		const studentOrder = (copy.exercise_order ?? []).map((i) => copy.exercises[i].exercise_id);
		expect(body.exercises?.map((e) => e.exercise_id)).toEqual(studentOrder);
	});

	it('élève hors de l’affectation : 400', async () => {
		const mock = supabase('guided', true, twoLevelExercise(), undefined, {}, false);
		await expect(correction(mock, 'typst', STUDENT)).rejects.toMatchObject({ status: 400 });
	});

	it('identifiant d’élève invalide : 400', async () => {
		await expect(
			correction(supabase('guided', true), 'typst', 'pas-un-uuid')
		).rejects.toMatchObject({ status: 400 });
	});
});
