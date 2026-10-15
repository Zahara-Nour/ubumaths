/**
 * GET /api/student/worksheets/[assignmentId] — la copie de l'élève (ADR 0023)
 * ==========================================================================
 *
 * La version de chaque exercice suit le niveau de guidage de l'affectation,
 * jamais un tirage ; les valeurs suivent la graine de l'affectation (et de
 * l'élève si elle est individualisée) ; `worksheet_instances` n'est plus lue.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	selectedColumns,
	tableMock,
	twoLevelExercise,
	type TableMock
} from '$lib/server/worksheets/__tests__/table-mock';
import { assignmentCopyScope, resolveWorksheetExerciseCopy } from '$lib/worksheets/worksheet-copy';

// ============================================================================
// MOCKS
// ============================================================================

const currentStudent = vi.hoisted(() => ({ id: '' }));

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: currentStudent.id } })
}));
vi.mock('$lib/server/worksheets/assignment-access', () => ({
	resolveAssignmentAccess: async () => ({ canRead: true, readOnly: false })
}));
vi.mock('$lib/server/worksheets/assignment-classes', () => ({
	fetchAssignmentClasses: async () => []
}));
// Correction visible par défaut ; un test la masque (cadres de réponse, audit S2)
const visibility = vi.hoisted(() => ({ visible: true }));
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
const STUDENTS = [
	'550e8400-e29b-41d4-a716-446655440021',
	'550e8400-e29b-41d4-a716-446655440022',
	'550e8400-e29b-41d4-a716-446655440023',
	'550e8400-e29b-41d4-a716-446655440024',
	'550e8400-e29b-41d4-a716-446655440025',
	'550e8400-e29b-41d4-a716-446655440026'
];

function assignmentRow(
	guidanceLevel: string,
	individualized: boolean,
	config: Record<string, unknown> = {},
	type = 'worksheet'
) {
	return {
		id: ASSIGNMENT_ID,
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
			type,
			config,
			translations: null
		}
	};
}

function supabase(
	guidanceLevel: string,
	individualized: boolean,
	exercise: ReturnType<typeof twoLevelExercise> & { topic?: string | null } = twoLevelExercise(),
	config: Record<string, unknown> = {},
	type = 'worksheet'
): TableMock {
	return tableMock({
		worksheet_assignments: {
			data: assignmentRow(guidanceLevel, individualized, config, type),
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
					correction_visible: true,
					variation_index: null,
					section_id: null,
					is_essential: false,
					exercise
				}
			],
			error: null
		},
		worksheet_sections: { data: [], error: null },
		worksheet_instances: { data: null, error: null }
	});
}

interface StudentView {
	exercises: Array<{
		statement: string;
		correction: string | null;
		correction_visible?: boolean;
		answers?: string | null;
		capital_pairs?: string;
		answer_frame_estimate?: { questions?: string[]; exercise_cm?: number };
	}>;
	answer_frames?: string;
	numbering_style?: string;
	show_points?: boolean;
	calculator?: string;
}

async function fetchCopy(mock: TableMock, studentId: string): Promise<StudentView> {
	currentStudent.id = studentId;
	const { GET } = await import('../+server');
	const response = await GET({
		params: { assignmentId: ASSIGNMENT_ID },
		locals: { supabase: mock.client } as unknown as App.Locals
	} as never);
	return (await response.json()) as StudentView;
}

/** Marque du corrigé : ne doit jamais sortir quand la correction est masquée */
const SECRET = 'SOLUTIONSECRETE';

/** Exercice à deux questions : réponse courte (petit cadre), puis longue (grand) */
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

// ============================================================================
// TESTS
// ============================================================================

describe('API élève : la copie suit l’affectation', () => {
	beforeEach(() => {
		currentStudent.id = '';
		visibility.visible = true;
	});

	it('niveau guidé : TOUS les élèves reçoivent la version guidée (jamais tirée)', async () => {
		for (const studentId of STUDENTS) {
			const view = await fetchCopy(supabase('guided', true), studentId);
			expect(view.exercises[0].statement).toMatch(/^Guidé/);
		}
	});

	it('niveau autonome : TOUS les élèves reçoivent la version autonome', async () => {
		for (const studentId of STUDENTS) {
			const view = await fetchCopy(supabase('autonomous', true), studentId);
			expect(view.exercises[0].statement).toMatch(/^Autonome/);
		}
	});

	it('les variables sont substituées, et la copie est celle de la fonction partagée', async () => {
		const studentId = STUDENTS[2];
		const view = await fetchCopy(supabase('guided', true), studentId);
		const expected = resolveWorksheetExerciseCopy(
			{ id: WE_ID, variation_index: null, exercise: twoLevelExercise() },
			assignmentCopyScope(
				{
					id: ASSIGNMENT_ID,
					worksheet_id: WORKSHEET_ID,
					guidance_level: 'guided',
					individualized: true
				},
				{ studentId, locale: 'fr' }
			)
		);
		expect(view.exercises[0].statement).toBe(expected.statement);
		expect(view.exercises[0].correction).toBe(expected.solution);
		expect(view.exercises[0].statement).not.toContain('{{');
	});

	it('non individualisée : la même copie pour toute la classe', async () => {
		const statements = new Set<string>();
		for (const studentId of STUDENTS) {
			statements.add(
				(await fetchCopy(supabase('guided', false), studentId)).exercises[0].statement
			);
		}
		expect(statements.size).toBe(1);
	});

	it('la copie est recalculée : `worksheet_instances` n’est plus lue', async () => {
		const mock = supabase('guided', true);
		await fetchCopy(mock, STUDENTS[0]);
		expect(mock.tablesRead).not.toContain('worksheet_instances');
	});

	it('l’affectation est lue AVEC son niveau et sa case « individualisés »', async () => {
		// Sans ces colonnes, le mock les fournit quand même : seul le select le dit
		const mock = supabase('autonomous', true);
		await fetchCopy(mock, STUDENTS[0]);
		const columns = selectedColumns(mock, 'worksheet_assignments');
		expect(columns).toMatch(/\bguidance_level\b/);
		expect(columns).toMatch(/\bindividualized\b/);
	});

	// Lot 6 des longueurs (Q-J) : le sens de AB, résolu depuis le thème de l'exercice.
	// Donnée nouvelle pour l'élève : « length » ou « product », jamais le thème lui-même.
	it('le sens de AB suit le thème de l’exercice, lu par le select', async () => {
		const geometry = await fetchCopy(
			supabase('guided', false, { ...twoLevelExercise(), topic: 'Géométrie' }),
			STUDENTS[0]
		);
		expect(geometry.exercises[0].capital_pairs).toBe('length');
		const matrices = supabase('guided', false, {
			...twoLevelExercise(),
			topic: 'Graphes et matrices'
		});
		expect((await fetchCopy(matrices, STUDENTS[0])).exercises[0].capital_pairs).toBe('product');
		expect(selectedColumns(matrices, 'worksheet_exercises')).toMatch(/\btopic\b/);
		expect(JSON.stringify((await fetchCopy(matrices, STUDENTS[0])).exercises[0])).not.toContain(
			'Graphes et matrices'
		);
	});

	// ADR 0030 : les options du type de la fiche arrivent à l'élève, qui les lit
	// par la même règle que le prof. Le schéma de réponse retire les clés qu'il
	// ne connaît pas : ce test passe par lui.
	it('les options du type de la fiche arrivent à l’élève', async () => {
		const options = await fetchCopy(
			supabase('guided', false, twoLevelExercise(), {
				show_points: true,
				calculator: 'forbidden',
				answers_on_sheet: true,
				due_date: '2026-11-12',
				show_student_name: true,
				numbering_style: 'roman'
			}),
			STUDENTS[0]
		);
		expect(options).toMatchObject({
			show_points: true,
			calculator: 'forbidden',
			answers_on_sheet: true,
			due_date: '2026-11-12',
			show_student_name: true
		});
		// Ancienne clé : plus transmise
		expect(options).not.toHaveProperty('numbering_style');

		// Options absentes : absentes de la vue
		const bare = await fetchCopy(supabase('guided', false), STUDENTS[0]);
		expect(bare.show_points).toBeUndefined();
		expect(bare.calculator).toBeUndefined();
	});

	// Lot 3 : les cadres de réponse. La taille vient du corrigé de la copie de
	// l'élève, calculée ici : l'élève dont la correction est masquée a les mêmes
	// cadres que le prof, sans recevoir le texte du corrigé (audit S1, S2).
	it('correction MASQUÉE, mode question : les tailles du vrai corrigé, sans son texte', async () => {
		visibility.visible = false;
		const view = await fetchCopy(
			supabase('guided', false, framedExercise(), { answers_on_sheet: true }, 'assessment'),
			STUDENTS[0]
		);
		const exercise = view.exercises[0];
		expect(exercise.correction_visible).toBe(false);
		expect(exercise.correction).toBeNull();
		expect(exercise.answers).toBeNull();
		// Calculées sur le corrigé (une réponse courte, une longue), pas sur `null`
		// (qui donnerait « moyen » partout) ; pas de hauteur d'exercice en mode question
		expect(exercise.answer_frame_estimate).toEqual({ questions: ['small', 'large'] });
		expect(JSON.stringify(view)).not.toContain(SECRET);
	});

	it('correction MASQUÉE, mode exercice : la hauteur seule, d’après le vrai corrigé', async () => {
		visibility.visible = false;
		const view = await fetchCopy(
			supabase(
				'guided',
				false,
				framedExercise(),
				{ answers_on_sheet: true, answer_frames: 'exercise' },
				'exam'
			),
			STUDENTS[0]
		);
		expect(view.answer_frames).toBe('exercise');
		expect(view.exercises[0].answer_frame_estimate).toEqual({ exercise_cm: 7 });
		expect(JSON.stringify(view)).not.toContain(SECRET);
	});

	it('énoncé sans question numérotée : la hauteur seule, d’après le corrigé', async () => {
		const view = await fetchCopy(
			supabase('guided', false, twoLevelExercise(), { answers_on_sheet: true }, 'exam'),
			STUDENTS[0]
		);
		// « Guidé : 3a » : une ligne, petit cadre (`null` donnerait 4,5)
		expect(view.exercises[0].answer_frame_estimate).toEqual({ exercise_cm: 2.5 });
	});

	it('sans réponses sur le sujet (ou type sans l’option) : aucune taille transmise', async () => {
		const without = await fetchCopy(
			supabase('guided', false, twoLevelExercise(), {}, 'exam'),
			STUDENTS[0]
		);
		expect(without.exercises[0].answer_frame_estimate).toBeUndefined();
		const worksheet = await fetchCopy(
			supabase('guided', false, twoLevelExercise(), { answers_on_sheet: true }),
			STUDENTS[0]
		);
		expect(worksheet.exercises[0].answer_frame_estimate).toBeUndefined();
	});
});
