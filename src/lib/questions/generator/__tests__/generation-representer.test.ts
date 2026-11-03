/**
 * Question à droite graduée à représenter (` ```line ` + `representer:`, phase 0 :
 * `docs/archive/wip/demi-droite-progress.md` § « Geste de l'élève »)
 *
 * Même patron que la droite à placer : le bloc compte pour une case ; sa réponse
 * attendue (`[2 ; +∞[`) n'est jamais écrite dans le modèle ; un seul juge.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-representer',
		title: 'Représenter',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['3'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const line = (...body: string[]) => ['```line', ...body, '```'].join('\n');
const LINE = ['start: -5', 'end: 5', 'step: 1'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — droite à représenter', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(line(...LINE, 'representer: [2, +inf['));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(line('case: 0', ...LINE, 'representer: [2, +inf['));
	});
});

describe('droite à représenter : la case et sa réponse', () => {
	it('réponse = l’intervalle, juge de la droite', () => {
		const instance = generate(
			template({
				statement: `Représente $x \\geqslant 2$.\n\n${line(...LINE, 'representer: [2, +inf[')}`
			})
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '[2 ; +∞[',
			construire: 'line'
		});
		expect(validateAnswer('[2 ; +∞[', instance, '[2 ; +∞[').status).toBe('correct');
		expect(validateAnswer(']2 ; +∞[', instance, ']2 ; +∞[').isCorrect).toBe(false);
		expect(validateAnswer('2 comprise, côté ?', instance, '').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').isCorrect).toBe(false);
		expect(isBlankValueCorrect('[2 ; +∞[', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect(']-∞ ; 2]', instance.blanks![0], instance)).toBe(false);
	});

	it('fraction : même écriture que l’élève, juge sur les nombres', () => {
		const instance = generate(
			template({ statement: line('start: -1', 'end: 2', 'step: 1/3', 'representer: ]-inf, 2/3]') })
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe(']-∞ ; 2/3]');
		expect(validateAnswer(']-∞ ; 2/3]', instance, '').status).toBe('correct');
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: line(...LINE, 'representer: [{{a}}, +inf['),
				variables: [{ name: 'a', expression: '-3' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('[-3 ; +∞[');
	});

	it('borne hors graduation : refusée au générateur', () => {
		const result = generateInstance(
			template({ statement: line(...LINE, 'representer: [2.5, +inf[') }),
			42
		);
		expect(result.success).toBe(false);
	});
});

describe('énoncé envoyé : la réponse masquée', () => {
	it('demi-droite → `representer: ?` ; borné → `representer: ? ; ?`', () => {
		const half = line('case: 0', ...LINE, 'representer: [2, +inf[');
		const bounded = line('case: 0', ...LINE, 'representer: [-1, 3[');
		expect(maskGestureAnswers(half)).toBe(line('case: 0', ...LINE, 'representer: ?'));
		expect(maskGestureAnswers(bounded)).toBe(line('case: 0', ...LINE, 'representer: ? ; ?'));
	});

	it('la garde voit une réponse non masquée', () => {
		expect(findUnmaskedAnswers(line(...LINE, 'representer: [2, +inf['))).toEqual(['line']);
		expect(findUnmaskedAnswers(line(...LINE, 'representer: ?'))).toEqual([]);
		expect(findUnmaskedAnswers(line(...LINE, 'representer: ? ; ?'))).toEqual([]);
	});
});
