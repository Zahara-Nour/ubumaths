/**
 * Le PDF ouvert par un lien de partage a les cadres du prof (ADR 0030, lot 4)
 * ===========================================================================
 *
 * Décision de David (2026-10-16) : le visiteur d'un cahier de texte ou d'un
 * cours partagé imprime les mêmes cadres de réponse que le prof. Les RPC
 * `get_worksheet_by_share_token` et `get_course_worksheet_by_share_token`
 * rendent `answer_frame_lines` pour chaque exercice (migration
 * 20261016104000) ; ce test suit la valeur depuis la réponse jsonb de la RPC,
 * à travers la lecture serveur (`resolve…ByShareToken`, dont un schéma Zod
 * qui retirerait une clé non déclarée), jusqu'au Typst que compose la page
 * publique (`PdfPreview` : `buildWorksheetCopy` puis `generateWorksheetTypst`).
 */
import { describe, expect, it, vi } from 'vitest';
import { resolveWorksheetByShareToken } from '../journal-share-tokens';
import { resolveCourseWorksheetByShareToken } from '../course-share-tokens';
import { buildWorksheetCopy } from '$lib/worksheets/worksheet-copy';
import { generateWorksheetTypst } from '$lib/typst/generators/worksheet-generator';
import { answerFrameLinesToCm } from '$lib/worksheets/document/answer-frame-lines';
import type { WorksheetWithRelations } from '$lib/types/worksheets';

// ============================================================================
// CONSTANTES
// ============================================================================

const WORKSHEET_ID = '808e2eee-162a-4493-81f6-8a945c81db3c';
const TOKEN = 'abcdefghijklmnop0123';

/** Un exercice à deux questions, deux réponses courtes */
const CONTENT = {
	id: '02a099dd-ff75-4a75-835b-056cd3565f8f',
	title: 'Deux questions',
	variables: null,
	shared: null,
	variations: [
		{
			label: 'guided',
			statement_md: '1. QUESTIONUN\n2. QUESTIONDEUX',
			solution_md: '1. $3$\n2. $4$'
		}
	],
	generic_functions: null
};

/** Réglages du prof : question 1 sans cadre, question 2 au plafond ; cadre unique */
const QUESTION_LINES = { questions: [0, 25] };
const EXERCISE_LINES = { exercise: 7 };

function exerciseRow(id: string, position: number, lines: unknown) {
	return {
		id,
		worksheet_id: WORKSHEET_ID,
		exercise_id: CONTENT.id,
		section_id: null,
		position,
		points: null,
		is_essential: false,
		custom_instructions: null,
		variant_mode: 'none',
		variant_config: {},
		variation_index: null,
		translations: null,
		answer_frame_lines: lines,
		exercise: CONTENT
	};
}

/** La réponse jsonb de la RPC, clé pour clé (migration 20261016104000) */
function rpcPayload(config: Record<string, unknown>) {
	return {
		id: WORKSHEET_ID,
		title: 'Évaluation partagée',
		description: null,
		type: 'assessment',
		config,
		status: 'published',
		grades: null,
		translations: null,
		total_points: null,
		estimated_duration_minutes: null,
		style_id: null,
		template_id: null,
		template: null,
		sections: [],
		exercises: [
			exerciseRow('5b1f3c0e-7d2a-4f7e-9a51-0c2d6b7e8f90', 1, QUESTION_LINES),
			exerciseRow('6c2f4d1f-8e3b-4a8f-8b62-1d3e7c8f9a01', 2, null)
		]
	};
}

const FRAME = /rect\(width: 100%, height: ([\d.]+)cm/g;

// ============================================================================
// FONCTIONS
// ============================================================================

function frames(typst: string): number[] {
	return [...typst.matchAll(FRAME)].map((m) => Number(m[1]));
}

/** Un client dont la RPC rend `payload` */
function client(payload: unknown) {
	return { rpc: vi.fn().mockResolvedValue({ data: payload, error: null }) } as never;
}

/** Le Typst que compose `PdfPreview` pour une fiche (copie hors affectation, niveau guidé) */
function pdf(worksheet: WorksheetWithRelations): string {
	const instance = buildWorksheetCopy(worksheet, {
		assignmentId: null,
		worksheetId: worksheet.id,
		level: 'guided',
		individualized: false
	});
	return generateWorksheetTypst({
		worksheet,
		instance,
		config: worksheet.config || {},
		mode: 'worksheet'
	});
}

const OPEN = [
	['cahier de texte', resolveWorksheetByShareToken],
	['cours partagé', resolveCourseWorksheetByShareToken]
] as const;

// ============================================================================
// SUITE
// ============================================================================

describe.each(OPEN)('PDF ouvert par le lien du %s', (_, resolve) => {
	it('la lecture serveur garde `answer_frame_lines` de chaque exercice', async () => {
		const shared = await resolve(
			client(rpcPayload({ answers_on_sheet: true })),
			TOKEN,
			WORKSHEET_ID
		);
		const exercises = (shared?.exercises ?? []) as { answer_frame_lines: unknown }[];

		expect(exercises.map((exercise) => exercise.answer_frame_lines)).toEqual([
			QUESTION_LINES,
			null
		]);
	});

	it('mode question : les cadres du prof (0 ligne : aucun ; 25 lignes : 20 cm ; auto sinon)', async () => {
		const payload = rpcPayload({ answers_on_sheet: true });
		const shared = await resolve(client(payload), TOKEN, WORKSHEET_ID);
		const visitor = frames(pdf(shared as unknown as WorksheetWithRelations));
		// Le prof : la même fiche, lue en base avec ses exercices
		const teacher = frames(pdf(payload as unknown as WorksheetWithRelations));

		expect(visitor).toEqual(teacher);
		// Exercice 1 : question 1 sans cadre, question 2 au plafond ; exercice 2 : auto (3 lignes)
		expect(visitor).toEqual([
			answerFrameLinesToCm(25),
			answerFrameLinesToCm(3),
			answerFrameLinesToCm(3)
		]);
	});

	it('mode exercice : le cadre unique réglé', async () => {
		const payload = rpcPayload({ answers_on_sheet: true, answer_frames: 'exercise' });
		payload.exercises[0].answer_frame_lines = EXERCISE_LINES;
		const shared = await resolve(client(payload), TOKEN, WORKSHEET_ID);
		const visitor = frames(pdf(shared as unknown as WorksheetWithRelations));

		expect(visitor).toEqual(frames(pdf(payload as unknown as WorksheetWithRelations)));
		expect(visitor[0]).toBe(answerFrameLinesToCm(7));
	});

	it('sans « réponses sur le sujet » : aucun cadre, même avec des lignes réglées', async () => {
		const shared = await resolve(client(rpcPayload({})), TOKEN, WORKSHEET_ID);
		expect(frames(pdf(shared as unknown as WorksheetWithRelations))).toEqual([]);
	});
});
