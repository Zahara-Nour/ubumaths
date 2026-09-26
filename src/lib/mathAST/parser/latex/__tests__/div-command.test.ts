/**
 * `\div` (touche ÷ du clavier virtuel MathLive) lu comme une division
 * ===================================================================
 *
 * Le générateur écrit `\div`, le clavier des réponses le produit, mais le parseur ne le
 * connaissait pas (« Unexpected token: div ») : un élève qui répondait `63 ÷ 9` était
 * jugé faux, même quand la réponse attendue était `63 : 9`.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../index';
import { evaluate } from '../../../eval';
import { toLatex } from '../../../latex-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance } from '$lib/questions/types';

describe('parseLatex — \\div', () => {
	it.each([
		['63\\div 9', 7],
		['63 \\div 9', 7],
		['(63+27)\\div 9-9', 1],
		['2+12\\div 3\\times 2', 10],
		['7-9\\div 8', 7 - 9 / 8]
	])('%s = %s', (latex, value) => {
		const result = evaluate(parseLatex(latex), { mode: 'decimal' });
		expect(result.status === 'value' && result.value).toBeCloseTo(value, 10);
	});

	it('même arbre que « : » (division en ligne)', () => {
		expect(toLatex(parseLatex('63\\div 9'))).toBe(toLatex(parseLatex('63:9')));
	});
});

describe('correcteur — réponse tapée avec ÷', () => {
	const instance = (expectedAnswer: string) =>
		({
			blanks: [{ expectedAnswer, type: 'math' }],
			statement: '$$?$$'
		}) as unknown as QuestionInstance;

	it('quotient attendu « 63 : 9 » : 63 ÷ 9 est juste', () => {
		expect(validateAnswer(['63\\div 9'], instance('63:9'), ['63\\div 9']).status).toBe('correct');
	});

	it('valeur attendue 7 : 63 ÷ 9 n’est plus « incorrect »', () => {
		expect(validateAnswer(['63\\div 9'], instance('7'), ['63\\div 9']).status).not.toBe(
			'incorrect'
		);
	});
});
