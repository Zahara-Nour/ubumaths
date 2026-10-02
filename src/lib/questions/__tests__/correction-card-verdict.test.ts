/**
 * Carte de correction (lot 2) : réponse d'entraînement → réponse du validateur,
 * et statut global affiché.
 */
import { describe, it, expect } from 'vitest';
import {
	globalVerdictOf,
	instructionOf,
	studentAnswerFromAnswerData,
	trainingStatus
} from '../correction-card-verdict';
import type { QuestionInstance } from '../types';
import type { AnswerData } from '$lib/types/question-display';
import type { ResolvedMarkdown } from '$lib/ubumark';

const base = {
	templateId: 't',
	statement: 's' as ResolvedMarkdown,
	grades: ['6'],
	theme: 'T',
	domain: 'D',
	level: 1,
	generatedAt: ''
};
const blanks = {
	...base,
	blanks: [
		{ expectedAnswer: '8', type: 'math' },
		{ expectedAnswer: 'dix', type: 'text' }
	]
} as QuestionInstance;
const qcm = {
	...base,
	choices: [
		{ content: 'a' as ResolvedMarkdown, isCorrect: true },
		{ content: 'b' as ResolvedMarkdown, isCorrect: false }
	]
} as QuestionInstance;
const data = (value: AnswerData['value']): AnswerData => ({
	value,
	isCorrect: false,
	timeSpent: 1,
	attempts: 1,
	submittedAt: ''
});

describe('studentAnswerFromAnswerData', () => {
	it('cases : LaTeX pour une case math seulement (comme QuestionCard)', () => {
		expect(studentAnswerFromAnswerData(blanks, data(['8', 'dix']))).toEqual({
			values: ['8', 'dix'],
			latex: ['8', '']
		});
	});

	it('sans réponse, ou chrono écoulé (`value: ""`) : cases vides', () => {
		const empty = { values: ['', ''], latex: ['', ''] };
		expect(studentAnswerFromAnswerData(blanks, undefined)).toEqual(empty);
		expect(studentAnswerFromAnswerData(blanks, data(''))).toEqual(empty);
	});

	it('QCM : indice d’origine seul ou liste ; rien coché → []', () => {
		expect(studentAnswerFromAnswerData(qcm, data(1))).toEqual({ choiceIndexes: [1] });
		expect(studentAnswerFromAnswerData(qcm, data([0, 1]))).toEqual({ choiceIndexes: [0, 1] });
		expect(studentAnswerFromAnswerData(qcm, data(''))).toEqual({ choiceIndexes: [] });
	});
});

describe('globalVerdictOf', () => {
	it('juste / ½ point / faux', () => {
		expect(globalVerdictOf('correct').kind).toBe('correct');
		expect(globalVerdictOf('unoptimal_form')).toEqual({ kind: 'half', label: '½ point' });
		for (const s of ['incorrect', 'bad_form', 'empty'] as const) {
			expect(globalVerdictOf(s).kind).toBe('incorrect');
		}
	});
});

describe('Q105 — barème de l’évaluation en entraînement (gradeQuestion)', () => {
	const two = {
		...base,
		blanks: [
			{ expectedAnswer: '7', expectedAnswerLatex: '7', type: 'math' },
			{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }
		]
	} as QuestionInstance;
	const answer = (values: string[]) => ({ values, latex: values });

	it('cases : juste, ½ partiel (une vide), faux', () => {
		expect(trainingStatus(two, answer(['7', '8']))).toBe('correct');
		expect(trainingStatus(two, answer(['7', '']))).toBe('unoptimal_form');
		expect(trainingStatus(two, answer(['7', '9']))).toBe('incorrect');
	});

	it('QCM multiple (indices d’ORIGINE) : bons cochés mais incomplet → ½, même sans mélange', () => {
		const multi = {
			...base,
			choices: [
				{ content: 'a' as ResolvedMarkdown, isCorrect: true },
				{ content: 'b' as ResolvedMarkdown, isCorrect: false },
				{ content: 'c' as ResolvedMarkdown, isCorrect: true }
			],
			correctChoiceIndex: ['0', '2'],
			multipleAnswers: true
		} as QuestionInstance;
		expect(trainingStatus(multi, { choiceIndexes: [2] })).toBe('unoptimal_form');
		expect(trainingStatus(multi, { choiceIndexes: [0, 2] })).toBe('correct');
		const shuffled = {
			...multi,
			shuffledChoices: [2, 0, 1].map((originalIndex) => ({
				content: 'x' as ResolvedMarkdown,
				originalIndex
			}))
		} as QuestionInstance;
		expect(trainingStatus(shuffled, { choiceIndexes: [0, 1] })).toBe('incorrect');
		expect(trainingStatus(shuffled, { choiceIndexes: [0] })).toBe('unoptimal_form');
	});
});

describe('Q104 — consigne seule au-dessus d’une comparaison R1', () => {
	it('formule à case retirée, reste du texte gardé', () => {
		expect(instructionOf('Calcule : $3+5=\\placeholder[0]{}$')).toBe('Calcule :');
		expect(instructionOf('Avec $a=2$, calcule $$a+1=\\placeholder[0]{}$$')).toBe(
			'Avec $a=2$, calcule'
		);
		expect(instructionOf('Calcule.\n\n$$<<expr:expression>>3+5$$')).toBe('Calcule.');
	});

	it('aucun texte hors formule : rien', () => {
		expect(instructionOf('$3+5=\\placeholder[0]{}$')).toBe('');
		expect(instructionOf('$$<<expr:e>>3+5$$ .')).toBe('');
	});
});
