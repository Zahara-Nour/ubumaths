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
/** Case choix : bonne(s) réponse(s) en indices d'origine (« 0;2 ») */
const choiceCase = (expectedAnswer: string, count: number) =>
	({
		...base,
		blanks: [
			{
				expectedAnswer,
				type: 'choice',
				choice: {
					choices: Array.from({ length: count }, (_, i) => `c${i}`),
					order: Array.from({ length: count }, (_, i) => i),
					multiple: expectedAnswer.includes(';')
				}
			}
		]
	}) as QuestionInstance;
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

	it('case choix : sa valeur (indices « 0;1 ») sans LaTeX ; rien coché → case vide', () => {
		const qcm = choiceCase('0', 2);
		expect(studentAnswerFromAnswerData(qcm, data(['0;1']))).toEqual({
			values: ['0;1'],
			latex: ['']
		});
		expect(studentAnswerFromAnswerData(qcm, data(''))).toEqual({ values: [''], latex: [''] });
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

	it('case choix multiple (indices d’ORIGINE) : bons cochés mais incomplet → ½', () => {
		const multi = choiceCase('0;2', 3);
		expect(trainingStatus(multi, { values: ['2'] })).toBe('unoptimal_form');
		expect(trainingStatus(multi, { values: ['0;2'] })).toBe('correct');
		expect(trainingStatus(multi, { values: ['0;1'] })).toBe('incorrect');
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
