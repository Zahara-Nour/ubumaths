/**
 * Nombre collé derrière un facteur (`(n+2)4^n`, `x2`) — écart E76, décision de David du 2026-11-24
 * ================================================================================================
 *
 * La règle du 2026-10-08 (`mathAST/parser/number-after-factor.ts`) refuse cette écriture : elle
 * reste comptée fausse, mais la carte dit quoi écrire au lieu d'un « Faux » nu.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer, validateAnswerDetailed } from '../answer-validator';
import { numberAfterFactorFeedback } from '#lib/questions/feedback.ts';
import type { InstanceBlank, QuestionInstance } from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

function createInstance(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-nombre-apres-facteur',
		statement: 'Calcule' as ResolvedMarkdown,
		blanks,
		options,
		grades: ['1_SPE'],
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function check(answer: string, blank: InstanceBlank) {
	return validateAnswer([answer], createInstance([blank]), [answer]);
}

const QUOTIENT: InstanceBlank = {
	expectedAnswer: '\\frac{n+2}{4(n+1)}',
	type: 'math',
	requiredForm: { pattern: 'u/v' }
};

describe('nombre écrit après un facteur : faux, avec le message du refus', () => {
	it('`(n+2)4^n` au numérateur d’un quotient de valeur juste (modèle cdb5a1cf)', () => {
		const result = check('\\frac{(n+2)4^n}{4^{n+1}(n+1)}', QUOTIENT);
		expect(result.isCorrect).toBe(false);
		expect(result.status).not.toBe('bad_form');
		expect(result.feedback).toBe(numberAfterFactorFeedback('4'));
		expect(result.feedback).toContain('Nombre « 4 » écrit après un facteur');
	});

	it.each([
		['(x+1)2', '2(x+1)', '2'],
		['x3', '3x', '3'],
		['\\sqrt{2}3', '3\\sqrt{2}', '3']
	])('`%s` pour `%s`', (answer, expected, num) => {
		const result = check(answer, { expectedAnswer: expected, type: 'math' });
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(numberAfterFactorFeedback(num));
	});

	it('le nombre écrit devant : lu, jugé comme avant', () => {
		expect(check('\\frac{n+2}{4(n+1)}', QUOTIENT)).toMatchObject({ isCorrect: true });
		expect(check('4^n(n+2)', { expectedAnswer: '(n+2)\\times4^n', type: 'math' }).isCorrect).toBe(
			true
		);
	});

	it('réponse lisible mais fausse : aucun message', () => {
		const result = check('\\frac{n+2}{n+1}', QUOTIENT);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback ?? '').not.toContain('écrit après un facteur');
	});

	it('case de texte : rien n’est lu comme une formule, aucun message', () => {
		const result = check('x2', { expectedAnswer: 'oui', type: 'text' });
		expect(result.isCorrect).toBe(false);
		expect(result.feedback ?? '').not.toContain('écrit après un facteur');
	});

	it.each([
		['12 500', '12400'],
		['1 2', '13'],
		['12\\ 500', '12400']
	])('`%s` (espace entre deux nombres, valeur fausse) : aucun message', (answer, expected) => {
		const result = check(answer, { expectedAnswer: expected, type: 'math' });
		expect(result.isCorrect).toBe(false);
		expect(result.feedback ?? '').not.toContain('écrit après un facteur');
	});

	it('`(x+1) 2` (espace devant le nombre collé) : le message reste', () => {
		const result = check('(x+1) 2', { expectedAnswer: '2(x+1)', type: 'math' });
		expect(result.feedback).toBe(numberAfterFactorFeedback('2'));
	});

	it.each(['x0,5', 'x0{,}5'])('`%s` : le nombre est cité en entier, avec sa virgule', (answer) => {
		const result = check(answer, { expectedAnswer: '0{,}5x', type: 'math' });
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(numberAfterFactorFeedback('0,5'));
	});

	it('cases à unité en ordre libre : aucun message, comme en ordre fixé', () => {
		const blanks: InstanceBlank[] = [
			{ expectedAnswer: '3\\text{ cm}^2', type: 'math', unit: { expected: true } },
			{ expectedAnswer: '5\\text{ cm}^2', type: 'math', unit: { expected: true } }
		];
		const answers = ['3\\text{ cm}^2', '5cm2'];
		const free = validateAnswer(
			answers,
			createInstance(blanks, { orderIndependent: true }),
			answers
		);
		expect(free.isCorrect).toBe(false);
		expect(free.feedback ?? '').not.toContain('écrit après un facteur');
	});

	it('cases à ordre libre : la réponse non appariée garde le message', () => {
		const instance = createInstance(
			[
				{ expectedAnswer: '2(x+1)', type: 'math' },
				{ expectedAnswer: '3x', type: 'math' }
			],
			{ orderIndependent: true }
		);
		const result = validateAnswer(['3x', '(x+1)2'], instance, ['3x', '(x+1)2']);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(numberAfterFactorFeedback('2'));
	});

	it('détail par case : la remarque est sur la case mal écrite seulement', () => {
		const instance = createInstance([
			{ expectedAnswer: '3x', type: 'math' },
			{ expectedAnswer: '2(x+1)', type: 'math' }
		]);
		const detailed = validateAnswerDetailed(instance, {
			values: ['3x', '(x+1)2'],
			latex: ['3x', '(x+1)2']
		});
		expect(detailed.blanks.map((blank) => blank.status)).toEqual(['correct', 'incorrect']);
		expect(detailed.blanks[0].remarks).toEqual([]);
		expect(detailed.blanks[1].remarks).toEqual([numberAfterFactorFeedback('2')]);
	});
});
