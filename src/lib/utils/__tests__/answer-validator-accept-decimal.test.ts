/**
 * Option de case « accepter le décimal exact » (`acceptDecimal`)
 * ===============================================================
 *
 * Quand l'attendu est une fraction (#583 : `\frac{1}{2}`, coefficient directeur
 * lu sur un graphique ; #589 : `-\dfrac{9}{5}`, racine de 5x+9), un décimal
 * EXACT de même valeur (`0{,}5`, `-1{,}8`) doit être juste. Sans l'option, le
 * contrôle de forme compare les écritures et le refuse (`bad_form`).
 * Un décimal arrondi (0,33 pour 1/3) reste faux : la valeur diffère.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

function createInstance(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-accept-decimal',
		statement: 'Donne la valeur' as ResolvedMarkdown,
		blanks,
		grades: ['2'],
		theme: 'Fonctions',
		domain: 'Affines',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function blank(expectedAnswer: string, acceptDecimal?: boolean): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		...(acceptDecimal !== undefined && { acceptDecimal })
	};
}

function check(answer: string, expected: string, acceptDecimal?: boolean) {
	return validateAnswer([answer], createInstance([blank(expected, acceptDecimal)]), [answer]);
}

// ============================================================================
// NOMINAL — #583 (attendu 1/2) et #589 (attendu -9/5)
// ============================================================================

describe('acceptDecimal — cas nominal', () => {
	it.each(['0.5', '0{,}5'])('#583 : %s juste pour \\frac{1}{2}', (answer) => {
		expect(check(answer, '\\frac{1}{2}', true)).toMatchObject({ isCorrect: true });
		expect(check(answer, '\\frac{1}{2}', true).status ?? 'correct').toBe('correct');
	});

	it('#583 : la fraction attendue reste juste', () => {
		const verdict = check('\\frac{1}{2}', '\\frac{1}{2}', true);
		expect(verdict.isCorrect).toBe(true);
		expect(verdict.status ?? 'correct').toBe('correct');
	});

	it('#589 : -1{,}8 juste pour -\\dfrac{9}{5}', () => {
		const verdict = check('-1{,}8', '-\\dfrac{9}{5}', true);
		expect(verdict.isCorrect).toBe(true);
		expect(verdict.status ?? 'correct').toBe('correct');
	});
});

// ============================================================================
// LIMITES — rien d'autre ne change
// ============================================================================

describe('acceptDecimal — cas limites', () => {
	it('fraction non simplifiée : même verdict qu’avant (pas juste sans réserve)', () => {
		const withOption = check('\\frac{2}{4}', '\\frac{1}{2}', true);
		const without = check('\\frac{2}{4}', '\\frac{1}{2}');
		expect(withOption).toEqual(without);
		expect(withOption.status).not.toBe('correct');
	});

	it('calcul non effectué : 1-\\frac12 reste refusé', () => {
		const verdict = check('1-\\frac{1}{2}', '\\frac{1}{2}', true);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict).toEqual(check('1-\\frac{1}{2}', '\\frac{1}{2}'));
	});

	it.each([
		['0{,}6', '\\frac{1}{2}'],
		['-1{,}9', '-\\dfrac{9}{5}'],
		['1{,}8', '-\\dfrac{9}{5}'],
		['0{,}33', '\\dfrac{1}{3}'],
		['0{,}333', '\\dfrac{1}{3}']
	])('valeur différente : %s faux pour %s', (answer, expected) => {
		expect(check(answer, expected, true).isCorrect).toBe(false);
	});
});

// ============================================================================
// SANS L'OPTION — comportement actuel
// ============================================================================

describe('acceptDecimal absent ou faux — rien ne change', () => {
	it.each([
		['0{,}5', '\\frac{1}{2}', undefined],
		['0.5', '\\frac{1}{2}', false],
		['-1{,}8', '-\\dfrac{9}{5}', undefined]
	] as const)('%s pour %s → bad_form', (answer, expected, flag) => {
		expect(check(answer, expected, flag)).toMatchObject({ isCorrect: false, status: 'bad_form' });
	});
});

// ============================================================================
// PLUSIEURS CASES — ordre imposé et ordre libre
// ============================================================================

describe('acceptDecimal — plusieurs cases', () => {
	const blanks = [blank('\\frac{1}{2}', true), blank('-\\dfrac{9}{5}', true)];

	it('ordre imposé : les deux décimaux exacts sont justes', () => {
		const answers = ['0{,}5', '-1{,}8'];
		const verdict = validateAnswer(answers, createInstance(blanks), answers);
		expect(verdict.isCorrect).toBe(true);
		expect(verdict.status ?? 'correct').toBe('correct');
	});

	it('ordre imposé : un décimal faux rend le tout faux', () => {
		const answers = ['0{,}5', '-1{,}9'];
		expect(validateAnswer(answers, createInstance(blanks), answers).isCorrect).toBe(false);
	});

	it('ordre imposé : seule la case avec l’option accepte le décimal', () => {
		const mixed = [blank('\\frac{1}{2}', true), blank('-\\dfrac{9}{5}')];
		const answers = ['0{,}5', '-1{,}8'];
		expect(validateAnswer(answers, createInstance(mixed), answers)).toMatchObject({
			isCorrect: false,
			status: 'bad_form'
		});
	});

	it('ordre libre : décimaux dans l’autre ordre, justes', () => {
		const answers = ['-1{,}8', '0.5'];
		const verdict = validateAnswer(
			answers,
			createInstance(blanks, { orderIndependent: true }),
			answers
		);
		expect(verdict.isCorrect).toBe(true);
		expect(verdict.status ?? 'correct').toBe('correct');
	});

	it('ordre libre : sans l’option, bad_form comme avant', () => {
		const plain = [blank('\\frac{1}{2}'), blank('-\\dfrac{9}{5}')];
		const answers = ['-1{,}8', '0.5'];
		expect(
			validateAnswer(answers, createInstance(plain, { orderIndependent: true }), answers)
		).toMatchObject({ isCorrect: false, status: 'bad_form' });
	});
});
