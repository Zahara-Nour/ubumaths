/**
 * Cadres de réponse en nombre de lignes (ADR 0030, lot 4)
 * =======================================================
 *
 * Le prof règle chaque cadre en lignes (colonne `worksheet_exercises.answer_frame_lines`) ;
 * `null` = estimation automatique, 0 = pas de cadre. Les valeurs par question
 * repassent en auto quand le nombre de questions de l'énoncé a changé.
 */
import { describe, expect, it } from 'vitest';
import {
	ANSWER_FRAME_LINE_CM,
	answerFrameLinesToCm,
	answerFrameRows,
	autoAnswerFrameLines,
	resolveAnswerFrames,
	setExerciseLines,
	setQuestionLines,
	toAnswerFrameLines
} from '../answer-frame-lines';
import type { AnswerFrameEstimate } from '$lib/types/worksheets';

/** Trois questions : petite, moyenne, grande ; cadre unique de 7 cm */
const ESTIMATE: AnswerFrameEstimate = {
	questions: ['small', 'medium', 'large'],
	exercise_cm: 7
};

describe('unité : la ligne', () => {
	it('une ligne vaut 0,8 cm ; 12 lignes, 9,6 cm (sans bruit flottant)', () => {
		expect(ANSWER_FRAME_LINE_CM).toBe(0.8);
		expect(answerFrameLinesToCm(1)).toBe(0.8);
		expect(answerFrameLinesToCm(3)).toBe(2.4);
		expect(answerFrameLinesToCm(12)).toBe(9.6);
	});

	it('estimation : petit 3 lignes, moyen 5, grand 8 ; cadre unique converti (arrondi)', () => {
		expect(autoAnswerFrameLines(ESTIMATE)).toEqual({ questions: [3, 5, 8], exercise: 9 });
		const heights = [2.5, 4.5, 7, 10, 14] as const;
		expect(heights.map((cm) => autoAnswerFrameLines({ exercise_cm: cm }).exercise)).toEqual([
			3, 6, 9, 13, 18
		]);
	});
});

describe('résolution : valeur du prof, sinon l’estimation', () => {
	it('rien de réglé : l’estimation', () => {
		expect(resolveAnswerFrames(ESTIMATE, null, 'question')).toEqual({ questions: [3, 5, 8] });
	});

	it('valeur du prof par question ; null = auto ; 0 = pas de cadre', () => {
		expect(resolveAnswerFrames(ESTIMATE, { questions: [0, null, 12] }, 'question')).toEqual({
			questions: [0, 5, 12]
		});
	});

	it('nombre de questions changé : toutes les questions repassent en auto', () => {
		expect(resolveAnswerFrames(ESTIMATE, { questions: [1, 2] }, 'question')).toEqual({
			questions: [3, 5, 8]
		});
	});

	it('mode exercice : le cadre unique, réglé ou estimé, jamais les questions', () => {
		expect(resolveAnswerFrames(ESTIMATE, { questions: [1, 1, 1] }, 'exercise')).toEqual({
			exercise: 9
		});
		expect(resolveAnswerFrames(ESTIMATE, { exercise: 0 }, 'exercise')).toEqual({ exercise: 0 });
		expect(resolveAnswerFrames(ESTIMATE, { exercise: 14 }, 'exercise')).toEqual({ exercise: 14 });
	});

	it('énoncé sans question : le cadre unique, même en mode question', () => {
		expect(
			resolveAnswerFrames({ questions: [], exercise_cm: 2.5 }, { exercise: 4 }, 'question')
		).toEqual({ exercise: 4 });
	});

	it('plus de 200 questions : tronqué (le schéma de réponse en accepte 200)', () => {
		const many: AnswerFrameEstimate = { questions: Array(250).fill('small'), exercise_cm: 7 };
		expect(resolveAnswerFrames(many, null, 'question').questions).toHaveLength(200);
	});
});

describe('lecture de la colonne (jsonb)', () => {
	it('forme valide : gardée', () => {
		expect(toAnswerFrameLines({ questions: [null, 0, 25], exercise: 3 })).toEqual({
			questions: [null, 0, 25],
			exercise: 3
		});
	});

	it('absente ou abîmée : tout automatique, jamais d’erreur', () => {
		expect(toAnswerFrameLines(null)).toBeNull();
		expect(toAnswerFrameLines('3')).toBeNull();
		expect(toAnswerFrameLines([1, 2])).toBeNull();
		// Valeur hors bornes ou non entière : remise en auto, une par une
		expect(toAnswerFrameLines({ questions: [26, -1, 2.5, '3', 4], exercise: 99 })).toEqual({
			questions: [null, null, null, null, 4],
			exercise: null
		});
	});
});

describe('écran : lignes et modifications', () => {
	it('mode question : une ligne par question, auto ou modifiée', () => {
		const rows = answerFrameRows(ESTIMATE, { questions: [null, 0, null] }, 'question');
		expect(rows.kind).toBe('questions');
		expect(rows.outdated).toBe(false);
		expect(rows.rows).toEqual([
			{ lines: 3, auto: true },
			{ lines: 0, auto: false },
			{ lines: 8, auto: true }
		]);
	});

	it('questions changées : tout en auto, avec l’avertissement', () => {
		const rows = answerFrameRows(ESTIMATE, { questions: [4, 4] }, 'question');
		expect(rows.outdated).toBe(true);
		expect(rows.rows.every((row) => row.auto)).toBe(true);
	});

	it('mode exercice : une seule ligne « Cadre »', () => {
		const rows = answerFrameRows(ESTIMATE, { exercise: 2 }, 'exercise');
		expect(rows).toEqual({ kind: 'exercise', outdated: false, rows: [{ lines: 2, auto: false }] });
	});

	it('régler une question : tableau à la longueur de l’énoncé, le reste en auto', () => {
		expect(setQuestionLines(null, 3, 1, 7)).toEqual({ questions: [null, 7, null] });
		// Valeurs périmées (2 questions enregistrées pour 3) : repartent de zéro
		expect(setQuestionLines({ questions: [4, 4], exercise: 2 }, 3, 0, 1)).toEqual({
			questions: [1, null, null],
			exercise: 2
		});
	});

	it('plus de 200 questions : le réglage reste dans la borne de la colonne', () => {
		const set = setQuestionLines(null, 250, 3, 7);
		expect(set?.questions).toHaveLength(200);
		expect(set?.questions?.[3]).toBe(7);
	});

	it('remettre en auto : la dernière valeur réglée retirée rend `null`', () => {
		expect(setQuestionLines({ questions: [null, 7, null] }, 3, 1, null)).toBeNull();
		expect(setExerciseLines({ exercise: 5 }, null)).toBeNull();
		expect(setExerciseLines({ questions: [1] }, 0)).toEqual({ questions: [1], exercise: 0 });
	});
});

describe('copie du prof : la colonne suit l’exercice jusqu’au PDF', () => {
	it('buildWorksheetCopy garde `answer_frame_lines` de chaque exercice de la fiche', async () => {
		const { buildWorksheetCopy } = await import('$lib/worksheets/worksheet-copy');
		const copy = buildWorksheetCopy(
			{
				id: 'w',
				config: {},
				exercises: [
					{
						id: 'we-1',
						exercise_id: 'ex-1',
						position: 1,
						points: null,
						section_id: null,
						variation_index: null,
						custom_instructions: null,
						answer_frame_lines: { questions: [0, 12] },
						exercise: {
							id: 'ex-1',
							title: 'Deux questions',
							variations: [{ label: 'guided', statement_md: '1. A\n2. B', solution_md: '' }]
						}
					}
				]
			} as never,
			{ assignmentId: null, worksheetId: 'w', level: 'guided', individualized: false }
		);
		expect(copy.exercises[0].answer_frame_lines).toEqual({ questions: [0, 12] });
	});
});
