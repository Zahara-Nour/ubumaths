/**
 * Cadres de réponse dans le PDF (ADR 0030, lot 3), côté prof ET côté élève
 * ========================================================================
 *
 * Seulement sur la fiche (jamais dans Réponses, Corrigé, la partie de fin, ni
 * avec les corrections en ligne), et seulement avec « réponses sur le sujet ».
 * Mode « question » (défaut) : un cadre à la fin de chaque question, après ses
 * sous-questions ; mode « exercise » : un seul cadre à la fin de l'énoncé.
 */
import { describe, expect, it } from 'vitest';
import { generateWorksheetTypst } from '../worksheet-generator';
import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
import {
	estimateAnswerFrames,
	ANSWER_FRAME_HEIGHT_CM
} from '$lib/worksheets/document/answer-frames';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow,
	WorksheetType
} from '$lib/types/worksheets';

const STATEMENT = [
	'Soit $f(x) = x^2$.',
	'',
	'1. QUESTIONUN',
	'   1. SOUSQUESTIONA',
	'   2. SOUSQUESTIONB',
	'2. QUESTIONDEUX',
	'',
	'FINENONCE'
].join('\n');

/** Corrigé découpé comme l'énoncé : une réponse longue, puis une courte */
const SOLUTION = [
	`1. ${Array.from({ length: 9 }, (_, i) => `Étape ${i + 1}.`).join('\n\n   ')}`,
	'',
	'2. $x = 2$'
].join('\n');

const FRAME = /rect\(width: 100%, height: ([\d.]+)cm/g;

function frames(typst: string): number[] {
	return [...typst.matchAll(FRAME)].map((m) => Number(m[1]));
}

// ----------------------------------------------------------------------------
// Prof
// ----------------------------------------------------------------------------

const INSTANCE: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Fonction carré',
			position: 1,
			parameters: {},
			statement: STATEMENT,
			solution: SOLUTION,
			answers: 'REPONSES'
		}
	]
};

function row(type: WorksheetType, config: WorksheetConfig): WorksheetRow {
	return {
		id: 'w-1',
		title: 'Évaluation',
		description: null,
		type,
		config,
		template_id: null,
		style_id: null,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
}

function teacher(
	config: WorksheetConfig,
	options: {
		type?: WorksheetType;
		mode?: 'worksheet' | 'answers' | 'correction';
		inlineCorrections?: boolean;
		withCorrections?: 'answers' | 'correction';
	} = {}
): string {
	const type = options.type ?? 'assessment';
	return generateWorksheetTypst({
		worksheet: row(type, config),
		instance: INSTANCE,
		config,
		mode: options.mode ?? 'worksheet',
		inlineCorrections: options.inlineCorrections,
		withCorrections: options.withCorrections
	});
}

describe('prof : cadres après chaque question (défaut)', () => {
	it('un cadre par question, à la taille de sa réponse dans le corrigé', () => {
		const typst = teacher({ answers_on_sheet: true });
		expect(frames(typst)).toEqual([ANSWER_FRAME_HEIGHT_CM.large, ANSWER_FRAME_HEIGHT_CM.small]);
	});

	it('le cadre de la question 1 vient après ses sous-questions, avant la question 2', () => {
		const typst = teacher({ answers_on_sheet: true, answer_frames: 'question' });
		const first = typst.search(FRAME);
		expect(first).toBeGreaterThan(typst.indexOf('SOUSQUESTIONB'));
		expect(first).toBeLessThan(typst.indexOf('QUESTIONDEUX'));
		// Le dernier cadre suit la question 2, avant la fin de l'énoncé
		const last = typst.lastIndexOf('rect(width: 100%');
		expect(last).toBeGreaterThan(typst.indexOf('QUESTIONDEUX'));
		expect(last).toBeLessThan(typst.indexOf('FINENONCE'));
	});

	it('nombre de réponses différent : chaque question en taille moyenne', () => {
		const typst = generateWorksheetTypst({
			worksheet: row('assessment', { answers_on_sheet: true }),
			instance: { exercises: [{ ...INSTANCE.exercises[0], solution: '1. $x=2$' }] },
			config: { answers_on_sheet: true },
			mode: 'worksheet'
		});
		expect(frames(typst)).toEqual([ANSWER_FRAME_HEIGHT_CM.medium, ANSWER_FRAME_HEIGHT_CM.medium]);
	});

	it('énoncé sans question numérotée : un seul cadre, à la fin', () => {
		const typst = generateWorksheetTypst({
			worksheet: row('exam', { answers_on_sheet: true }),
			instance: {
				exercises: [
					{ ...INSTANCE.exercises[0], statement: 'Calculer ENONCESEUL.', solution: '$5$' }
				]
			},
			config: { answers_on_sheet: true },
			mode: 'worksheet'
		});
		expect(frames(typst)).toEqual([ANSWER_FRAME_HEIGHT_CM.small]);
		expect(typst.search(FRAME)).toBeGreaterThan(typst.indexOf('ENONCESEUL'));
	});
});

describe('prof : un cadre après l’exercice', () => {
	it('un seul cadre, après tout l’énoncé, d’après tout le corrigé', () => {
		const typst = teacher({ answers_on_sheet: true, answer_frames: 'exercise' });
		const heights = frames(typst);
		expect(heights).toHaveLength(1);
		expect(heights[0]).toBe(estimateAnswerFrames(STATEMENT, SOLUTION).exercise_cm);
		expect(typst.search(FRAME)).toBeGreaterThan(typst.indexOf('FINENONCE'));
	});
});

describe('prof : jamais de cadre ailleurs', () => {
	it('sans « réponses sur le sujet »', () => {
		expect(frames(teacher({}))).toEqual([]);
		expect(frames(teacher({ answer_frames: 'question' }))).toEqual([]);
	});

	it('type qui ne propose pas l’option (fiche d’exercices, devoir maison)', () => {
		expect(frames(teacher({ answers_on_sheet: true }, { type: 'worksheet' }))).toEqual([]);
		expect(frames(teacher({ answers_on_sheet: true }, { type: 'homework' }))).toEqual([]);
	});

	it('Réponses et Corrigé', () => {
		expect(frames(teacher({ answers_on_sheet: true }, { mode: 'answers' }))).toEqual([]);
		expect(frames(teacher({ answers_on_sheet: true }, { mode: 'correction' }))).toEqual([]);
	});

	it('fiche + corrections en ligne', () => {
		expect(frames(teacher({ answers_on_sheet: true }, { inlineCorrections: true }))).toEqual([]);
	});

	it('fiche + corrections à la fin : les cadres sur la fiche, aucun dans la partie de fin', () => {
		const typst = teacher({ answers_on_sheet: true }, { withCorrections: 'correction' });
		expect(frames(typst)).toHaveLength(2);
		expect(typst.lastIndexOf('rect(width: 100%')).toBeLessThan(typst.indexOf('Étape 1.'));
	});
});

// ----------------------------------------------------------------------------
// Élève
// ----------------------------------------------------------------------------

function studentView(
	options: Partial<StudentWorksheetView> = {},
	visible = false
): StudentWorksheetView {
	return {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Évaluation',
		description: null,
		type: 'assessment',
		instructions: null,
		show_corrections: visible,
		language: 'fr',
		sections: [],
		exercises: [
			{
				id: '1',
				exercise_id: 'ex-1',
				title: 'Fonction carré',
				position: 1,
				section_id: null,
				points: null,
				is_essential: false,
				custom_instructions: null,
				statement: STATEMENT,
				// Correction masquée : la taille arrive du serveur, pas le texte
				correction: visible ? SOLUTION : null,
				correction_visible: visible,
				answers: null,
				answer_frame_estimate: estimateAnswerFrames(STATEMENT, SOLUTION)
			}
		],
		...options
	} as unknown as StudentWorksheetView;
}

describe('élève : le même rendu que le prof', () => {
	it('mode question : mêmes cadres que le prof, correction masquée comprise', () => {
		const typst = generateStudentWorksheetTypst(studentView({ answers_on_sheet: true }), 'none');
		expect(frames(typst)).toEqual(frames(teacher({ answers_on_sheet: true })));
		expect(typst).not.toContain('Étape 1.');
	});

	it('mode exercice : un seul cadre, comme le prof', () => {
		const typst = generateStudentWorksheetTypst(
			studentView({ answers_on_sheet: true, answer_frames: 'exercise' }),
			'none'
		);
		expect(frames(typst)).toEqual(
			frames(teacher({ answers_on_sheet: true, answer_frames: 'exercise' }))
		);
	});

	it('sans « réponses sur le sujet » : aucun cadre', () => {
		expect(frames(generateStudentWorksheetTypst(studentView(), 'none'))).toEqual([]);
	});

	it('fiche + corrections : cadres sur la fiche, aucun dans la partie de fin', () => {
		const typst = generateStudentWorksheetTypst(
			studentView({ answers_on_sheet: true }, true),
			'correction'
		);
		expect(frames(typst)).toHaveLength(2);
		expect(typst.lastIndexOf('rect(width: 100%')).toBeLessThan(typst.indexOf('[CORRECTION]'));
	});
});
