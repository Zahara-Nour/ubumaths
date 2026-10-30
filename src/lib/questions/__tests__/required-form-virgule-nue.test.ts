/**
 * Forme exigée : virgule décimale nue
 * ===================================
 *
 * Une virgule tapée au clavier physique ou collée (`0,5n`) est décimale, comme
 * la virgule de MathLive (`0{,}5n`) : le juge de valeur la relit déjà
 * (`mathAST/decimal-comma`, #520), le contrôle de forme doit la relire aussi.
 * Une virgule séparatrice (couple, liste, intervalle) n'est pas touchée.
 */

import { describe, it, expect } from 'vitest';
import { checkRequiredForm } from '../required-form-validator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance } from '../types';

const formOk = (answer: string, pattern: string) =>
	checkRequiredForm([answer], { pattern }).length === 0;

describe('motif : virgule nue lue comme la virgule de MathLive', () => {
	it.each([
		['0{,}5n', true],
		['0,5n', true],
		['0,5\\times n', true],
		['n', false]
	])('a * n — %s', (answer, ok) => {
		expect(formOk(answer, 'a * n')).toBe(ok);
	});

	it('somme à coefficients décimaux : 2,5x + 1,2', () => {
		expect(formOk('2,5x+1,2', 'a * x + b')).toBe(true);
	});

	it('virgule séparatrice : le couple (3,14) reste un couple', () => {
		// Relu `(3.14)`, il passerait le motif `a` (un nombre)
		expect(formOk('(3,14)', 'a')).toBe(false);
		expect(formOk('3,14', 'a')).toBe(true);
	});
});

describe('correcteur : formule à coefficient décimal, forme exigée', () => {
	const instance = {
		blanks: [
			{
				expectedAnswer: '0{,}5n',
				type: 'math',
				requiredForm: { pattern: 'u' }
			}
		],
		statement: '$$?$$',
		options: { constraints: {} }
	} as unknown as QuestionInstance;
	const status = (answer: string) => validateAnswer([answer], instance, [answer]).status;

	it.each(['0{,}5n', '0,5n'])('%s : juste', (answer) => {
		expect(status(answer)).toBe('correct');
	});

	it('0,5 × n : même verdict qu’avec la virgule de MathLive (× en trop)', () => {
		expect(status('0,5\\times n')).toBe(status('0{,}5\\times n'));
		expect(status('0,5\\times n')).not.toBe('bad_form');
	});
});
