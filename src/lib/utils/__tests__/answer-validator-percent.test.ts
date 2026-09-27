/**
 * Réponses en pourcentage (lot Proportionnalité, décisions de David du 2026-09-27)
 * ================================================================================
 *
 * Attendu `20 %` : `20 %` juste ; `0,2` ou `1/5` perfectible (« Écris le résultat en
 * pourcentage. ») ; `20` faux avec « N'oublie pas le symbole %. » ; `2 %` faux.
 * Attendu `7,1` : `710 %` faux, mauvaise forme.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-percent',
		statement: 'Calcule' as ResolvedMarkdown,
		blanks,
		grades: ['5e'],
		theme: 'Nombres et calculs',
		domain: 'Proportionnalité',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function check(answer: string, expected: string) {
	return validateAnswer([answer], createInstance([{ expectedAnswer: expected, type: 'math' }]), [
		answer
	]);
}

const PERCENT_FEEDBACK = 'Écris le résultat en pourcentage.';
const FORGOTTEN_SIGN = "N'oublie pas le symbole %.";

describe('attendu en pourcentage', () => {
	it.each(['20\\%', '20\\,\\%', '20 \\%'])('%s : juste', (answer) => {
		const result = check(answer, '20\\%');
		expect(result.isCorrect).toBe(true);
		expect(result.status ?? 'correct').toBe('correct');
	});

	it('attendu écrit `20%` (sans barre oblique) : `20\\%` juste', () => {
		expect(check('20\\%', '20%')).toMatchObject({ isCorrect: true });
	});

	it.each(['0{,}2', '0.2', '\\frac{1}{5}'])('%s : perfectible, message dédié', (answer) => {
		const result = check(answer, '20\\%');
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.feedback).toBe(PERCENT_FEEDBACK);
		expect(result.constraintViolations?.map((v) => v.constraint)).toContain('percent');
	});

	it('`20` sans le symbole : faux, avec le rappel du symbole', () => {
		const result = check('20', '20\\%');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(FORGOTTEN_SIGN);
	});

	it('`12{,}5` pour 12,5 % : même rappel', () => {
		expect(check('12{,}5', '12{,}5\\%').feedback).toBe(FORGOTTEN_SIGN);
	});

	it('`2 %` : faux, sans rappel du symbole', () => {
		const result = check('2\\%', '20\\%');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).not.toBe(FORGOTTEN_SIGN);
	});
});

describe('attendu en pourcentage — calcul non effectué de même valeur', () => {
	it.each([
		'0{,}1+0{,}1',
		'1-0{,}8',
		'100\\%-80\\%',
		'40\\%\\div 2',
		'2\\times 10\\%',
		'0{,}2\\times 100\\%'
	])('%s : mauvaise forme, pas perfectible', (answer) => {
		const result = check(answer, '20\\%');
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
	});

	it('`-0{,}2` pour `-20 %` : perfectible (écriture finale signée)', () => {
		expect(check('-0{,}2', '-20\\%').status).toBe('unoptimal_form');
	});
});

describe('attendu écrit avec \\text', () => {
	it.each(['20\\text{ \\%}', '20\\text{\\%}'])('attendu %s : `20\\%` juste', (expected) => {
		const result = check('20\\%', expected);
		expect(result.isCorrect).toBe(true);
		expect(result.status ?? 'correct').toBe('correct');
	});
});

describe('plusieurs cases, ordre indifférent', () => {
	it('`20` et `30` pour `20 %` et `30 %` : rappel du symbole', () => {
		const instance: QuestionInstance = {
			...createInstance([
				{ expectedAnswer: '20\\%', type: 'math' },
				{ expectedAnswer: '30\\%', type: 'math' }
			]),
			options: { orderIndependent: true }
		};
		const result = validateAnswer(['20', '30'], instance, ['20', '30']);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(FORGOTTEN_SIGN);
	});
});

describe('attendu en nombre', () => {
	it('`7{,}1` : juste', () => {
		expect(check('7{,}1', '7{,}1')).toMatchObject({ isCorrect: true });
	});

	it('`710 %` pour 7,1 : faux, mauvaise forme', () => {
		const result = check('710\\%', '7{,}1');
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
	});
});
