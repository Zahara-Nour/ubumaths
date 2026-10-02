/**
 * Suffixe « ° » recopié dans une case (correctif du 2026-10-02)
 *
 * L'énoncé « $\frac{5\pi}{6}\text{ rad}=?\,^\circ$ » affiche ° APRÈS la case ;
 * l'élève le retape. Quand l'attendu est une valeur SANS unité, la réponse est
 * jugée sans ce suffixe. Les écritures sont celles que MathLive renvoie telles
 * quelles (getPromptValue → validateAnswer, aucune normalisation en route) :
 * le banc de specs suit le même chemin (même LaTeX en valeur et en LaTeX).
 */
import { describe, it, expect } from 'vitest';
import { specVerdicts } from './spec-verdicts.helper';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import { validateBlanksDetailed } from '$lib/utils/answer-validator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

const STATEMENT = '$\\frac{5\\pi}{6}\\text{ rad}=?\\,^\\circ$';

function statuses(statement: string, expected: string, answers: string[]) {
	return Object.fromEntries(
		Object.entries(specVerdicts(statement, expected, answers)).map(([a, v]) => [a, v.status])
	);
}

describe('suffixe degré derrière une valeur sans unité', () => {
	it('150^\\circ, 150°, 150\\degree, 150^{\\circ} justes quand on attend 150', () => {
		expect(
			statuses(STATEMENT, '150', [
				'150^\\circ',
				'150°',
				'150\\degree',
				'150^{\\circ}',
				'150{}^{\\circ}'
			])
		).toEqual({
			'150^\\circ': 'correct',
			'150°': 'correct',
			'150\\degree': 'correct',
			'150^{\\circ}': 'correct',
			'150{}^{\\circ}': 'correct'
		});
	});

	it('150 seul : inchangé', () => {
		expect(statuses(STATEMENT, '150', ['150'])).toEqual({ '150': 'correct' });
	});

	it('une valeur fausse reste fausse : 151^\\circ', () => {
		expect(statuses(STATEMENT, '150', ['151^\\circ'])).toEqual({ '151^\\circ': 'incorrect' });
	});

	it('valeur négative : -30^\\circ juste pour -30', () => {
		expect(statuses('$?\\,^\\circ$', '-30', ['-30^\\circ', '-30°'])).toEqual({
			'-30^\\circ': 'correct',
			'-30°': 'correct'
		});
	});

	it('un degré seul ne devient pas une réponse vide juste', () => {
		expect(statuses(STATEMENT, '150', ['^\\circ'])).toEqual({ '^\\circ': 'incorrect' });
	});
});

describe('case à unité : traitement des unités inchangé', () => {
	function unitTemplate(answers: string[]): QuestionTemplate {
		return {
			id: 'suffixe-degre-unite',
			type: 'fill_in_blanks',
			title: 't',
			grades: ['6'],
			theme: 'T',
			domain: 'D',
			level: 1,
			delay: 20,
			status: 'draft',
			variations: [
				{
					statement: '$?$',
					blanks: [{ expectedAnswer: '5\\unit{km}', unit: { expected: true } }]
				}
			],
			testSpecs: answers.map((answer) => ({
				answers: [answer],
				expected: { status: 'correct' },
				description: answer,
				variationIndex: 0
			}))
		} as unknown as QuestionTemplate;
	}

	it('5 km juste, 5° faux, 5 faux (unité exigée)', () => {
		const verdicts = Object.fromEntries(
			runAllTestSpecs(unitTemplate(['5\\,km', '5^\\circ', '5'])).map((r) => [
				r.spec.description,
				r.error ?? r.actual?.status ?? 'erreur'
			])
		);
		expect(verdicts).toEqual({ '5\\,km': 'correct', '5^\\circ': 'incorrect', '5': 'incorrect' });
	});
});

describe('barème serveur (validateBlanksDetailed, chemin de grading.ts)', () => {
	it('150^\\circ juste, 151^\\circ faux, attendu 150', () => {
		const instance: QuestionInstance = {
			templateId: 'suffixe-degre',
			statement: STATEMENT as ResolvedMarkdown,
			blanks: [{ expectedAnswer: '150', type: 'math' }],
			grades: ['1_SPE'],
			theme: 'T',
			domain: 'D',
			level: 1,
			generatedAt: new Date().toISOString()
		};
		const statusOf = (answer: string) =>
			validateBlanksDetailed([answer], instance, [answer]).statuses[0];
		expect(statusOf('150^\\circ')).toBe('correct');
		expect(statusOf('150\\degree')).toBe('correct');
		expect(statusOf('151^\\circ')).toBe('incorrect');
	});
});
