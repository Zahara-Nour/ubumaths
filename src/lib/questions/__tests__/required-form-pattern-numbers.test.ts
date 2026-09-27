/**
 * Forme exigée par motif : nombres tirés et parenthèses de regroupement
 * =====================================================================
 *
 * « Le quotient de 9 par 3 » (#226, #227) : `9 : 3`, `9 ÷ 3` et `\frac{9}{3}` sont la même
 * expression ; `3` (le résultat) ou `\frac{3}{1}` (autres nombres) ne le sont pas.
 * - le motif peut contenir les variables tirées (`{{a}} / {{b}}` → `9 / 3`) ;
 * - les parenthèses ne font que grouper : `(9 + 2) / 4` reconnaît `\frac{9+2}{4}`.
 */

import { describe, it, expect } from 'vitest';
import { checkRequiredForm } from '../required-form-validator';
import { validateAnswer } from '$lib/utils/answer-validator';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';

const formOk = (answer: string, pattern: string) =>
	checkRequiredForm([answer], { pattern }).length === 0;

describe('motif : parenthèses de regroupement ignorées', () => {
	it.each([
		['(9+2):4', true],
		['(9+2)\\div 4', true],
		['\\frac{9+2}{4}', true],
		['9+2:4', false],
		['\\frac{11}{4}', false]
	])('(9 + 2) / 4 — %s', (answer, ok) => {
		expect(formOk(answer, '(9 + 2) / 4')).toBe(ok);
	});

	it('un produit factorisé reste exigé : (a + b) * c', () => {
		expect(formOk('(2+3)\\times 4', '(a + b) * c')).toBe(true);
		expect(formOk('2\\times 4+3\\times 4', '(a + b) * c')).toBe(false);
	});
});

describe('correcteur : quotient écrit avec « : », « ÷ » ou en fraction', () => {
	const instance = {
		blanks: [
			{
				expectedAnswer: '9:3',
				type: 'math',
				requiredForm: { pattern: '9 / 3' }
			}
		],
		statement: '$$?$$',
		options: { constraints: { reducedFractions: 'off' } }
	} as unknown as QuestionInstance;
	const status = (answer: string) => validateAnswer([answer], instance, [answer]).status;

	it.each(['9:3', '9\\div 3', '\\frac{9}{3}'])('%s : juste', (answer) => {
		expect(status(answer)).toBe('correct');
	});

	it.each(['3', '\\frac{3}{1}', '\\frac{6}{2}'])('%s : pas l’expression demandée', (answer) => {
		expect(status(answer)).not.toBe('correct');
	});
});

describe('générateur : variables tirées dans le motif', () => {
	it('{{a}} / {{b}} devient 9 / 3', () => {
		const template = {
			id: 't',
			title: 'Quotient',
			status: 'draft',
			variations: [
				{
					statement: 'Le quotient de ${{a}}$ par ${{b}}$ : $?$',
					variables: [
						{ name: 'a', expression: '9' },
						{ name: 'b', expression: '3' }
					],
					blanks: [{ expectedAnswer: '{{a}}:{{b}}', requiredForm: { pattern: '{{a}} / {{b}}' } }]
				}
			],
			grades: ['6'],
			theme: 'Entiers',
			domain: 'Vocabulaire',
			level: 1
		} as unknown as QuestionTemplate;
		const generated = generateInstance(template, 1);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		expect(generated.instance.blanks?.[0].requiredForm).toEqual({ pattern: '9 / 3' });
	});
});

describe('relecture de code : cas limites', () => {
	it('un motif reconnu avant le reste : (a)^2, k*(__reste)', () => {
		expect(formOk('(x+1)^2', '(a)^2')).toBe(true);
		expect(formOk('3(x+1)', 'k*(__rest)')).toBe(true);
	});

	it('nombre tiré négatif : 9 / (-3) reconnaît 9:(-3)', () => {
		expect(formOk('9:(-3)', '9 / (-3)')).toBe(true);
		expect(formOk('9\\div(-3)', '9 / (-3)')).toBe(true);
	});
});
