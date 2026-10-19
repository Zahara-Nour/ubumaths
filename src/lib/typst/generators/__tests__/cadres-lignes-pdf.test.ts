/**
 * Lignes des cadres réglées par le prof, dans le PDF (ADR 0030, lot 4)
 * ====================================================================
 *
 * La valeur du prof (`answer_frame_lines`) l'emporte sur l'estimation ; 0 ligne :
 * aucun cadre ; nombre de questions changé : tout en auto. Le PDF de l'élève
 * imprime les mêmes cadres, d'après les lignes résolues que le serveur lui envoie.
 */
import { describe, expect, it } from 'vitest';
import { generateWorksheetTypst } from '../worksheet-generator';
import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
import { answerFrameLinesToCm } from '$lib/worksheets/document/answer-frame-lines';
import type {
	AnswerFrameLines,
	InstanceData,
	PrintedAnswerFrames,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow
} from '$lib/types/worksheets';

const STATEMENT = ['1. QUESTIONUN', '2. QUESTIONDEUX', '', 'FINENONCE'].join('\n');
/** Deux réponses courtes : deux petits cadres (3 lignes) */
const SOLUTION = ['1. $x = 1$', '2. $x = 2$'].join('\n');

const FRAME = /rect\(width: 100%, height: ([\d.]+)cm/g;

function frames(typst: string): number[] {
	return [...typst.matchAll(FRAME)].map((m) => Number(m[1]));
}

function teacher(config: WorksheetConfig, lines: AnswerFrameLines | null): string {
	const instance: InstanceData = {
		exercises: [
			{
				exercise_id: 'ex-1',
				title: 'Deux questions',
				position: 1,
				parameters: {},
				statement: STATEMENT,
				solution: SOLUTION,
				answer_frame_lines: lines
			}
		]
	};
	return generateWorksheetTypst({
		worksheet: {
			id: 'w-1',
			title: 'Évaluation',
			description: null,
			type: 'assessment',
			config
		} as unknown as WorksheetRow,
		instance,
		config,
		mode: 'worksheet'
	});
}

function student(config: Partial<StudentWorksheetView>, printed: PrintedAnswerFrames): string {
	const view = {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Évaluation',
		description: null,
		type: 'assessment',
		instructions: null,
		show_corrections: false,
		language: 'fr',
		sections: [],
		exercises: [
			{
				id: '1',
				exercise_id: 'ex-1',
				title: 'Deux questions',
				position: 1,
				section_id: null,
				points: null,
				is_essential: false,
				custom_instructions: null,
				statement: STATEMENT,
				correction: null,
				correction_visible: false,
				answers: null,
				printed_frame_lines: printed
			}
		],
		...config
	} as unknown as StudentWorksheetView;
	return generateStudentWorksheetTypst(view, 'none');
}

describe('prof : lignes réglées', () => {
	it('question 1 à 0 ligne (aucun cadre), question 2 à 12 lignes (9,6 cm)', () => {
		const typst = teacher({ answers_on_sheet: true }, { questions: [0, 12] });
		expect(frames(typst)).toEqual([9.6]);
		expect(typst.search(FRAME)).toBeGreaterThan(typst.indexOf('QUESTIONDEUX'));
	});

	it('null : l’estimation (petit = 3 lignes)', () => {
		const typst = teacher({ answers_on_sheet: true }, { questions: [null, 12] });
		expect(frames(typst)).toEqual([answerFrameLinesToCm(3), 9.6]);
	});

	it('nombre de questions changé : tout en auto', () => {
		const typst = teacher({ answers_on_sheet: true }, { questions: [12, 12, 12] });
		expect(frames(typst)).toEqual([2.4, 2.4]);
	});

	it('mode exercice : le cadre unique réglé ; 0 : aucun cadre', () => {
		const config: WorksheetConfig = { answers_on_sheet: true, answer_frames: 'exercise' };
		expect(frames(teacher(config, { exercise: 10 }))).toEqual([8]);
		expect(frames(teacher(config, { exercise: 0 }))).toEqual([]);
	});
});

describe('élève : les lignes résolues par le serveur, même rendu', () => {
	it('mode question', () => {
		expect(frames(student({ answers_on_sheet: true }, { questions: [0, 12] }))).toEqual(
			frames(teacher({ answers_on_sheet: true }, { questions: [0, 12] }))
		);
	});

	it('mode exercice', () => {
		expect(
			frames(student({ answers_on_sheet: true, answer_frames: 'exercise' }, { exercise: 10 }))
		).toEqual([8]);
	});

	it('sans « réponses sur le sujet » : aucun cadre, même si des lignes arrivent', () => {
		expect(frames(student({}, { questions: [12, 12] }))).toEqual([]);
	});
});
