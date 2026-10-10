/**
 * `isPrime(…)` dans une règle `custom` : 1 si l'argument est un entier premier,
 * 0 sinon ; borne de sécurité 10^12. Comportements :
 * docs/archive/wip/reponse-vecteur-premier-progress.md (P1 à P3).
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, type EvaluationContext } from '../validation-rule-evaluator';
import type { CustomExpressionRule, InstanceBlank, QuestionInstance } from '../types';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { ResolvedMarkdown } from '$lib/ubumark';

function custom(expression: string): CustomExpressionRule {
	return { type: 'custom', expression };
}

function ctx(answer: number, variables: Record<string, number | string> = {}): EvaluationContext {
	return { variables, answer: String(answer), numericAnswer: answer };
}

describe('P1 — isPrime(answer) seule (non nul = vrai)', () => {
	it.each([2, 3, 41, 97, 7919])('%d est premier', (n) => {
		expect(evaluateRule(custom('isPrime(answer)'), ctx(n)).valid).toBe(true);
	});

	it.each([1, 0, -7, -2, 4, 9, 2.5, 91])('%d n’est pas premier', (n) => {
		expect(evaluateRule(custom('isPrime(answer)'), ctx(n)).valid).toBe(false);
	});

	it('comparée à 1', () => {
		expect(evaluateRule(custom('isPrime(answer) == 1'), ctx(13)).valid).toBe(true);
		expect(evaluateRule(custom('isPrime(answer) == 1'), ctx(15)).valid).toBe(false);
	});
});

describe('P2 — argument calculé, négation par == 0', () => {
	const rule = custom('isPrime(answer^2+answer+41) == 0');

	it('40 : 40² + 40 + 41 = 41², composé → juste', () => {
		expect(evaluateRule(rule, ctx(40)).valid).toBe(true);
	});

	it.each([0, 1, 10, 39])('%d : n² + n + 41 premier → faux', (n) => {
		expect(evaluateRule(rule, ctx(n)).valid).toBe(false);
	});

	it('variable du modèle dans l’argument, et somme de deux appels', () => {
		expect(evaluateRule(custom('isPrime(answer+{{k}})'), ctx(4, { k: 3 })).valid).toBe(true);
		expect(evaluateRule(custom('isPrime(answer) + isPrime(answer+2) == 2'), ctx(11)).valid).toBe(
			true
		);
		expect(evaluateRule(custom('isPrime(answer) + isPrime(answer+2) == 2'), ctx(7)).valid).toBe(
			false
		);
	});
});

describe('P3 — grands nombres et borne', () => {
	it('999 999 999 989 (plus grand premier à 12 chiffres) est premier', () => {
		expect(evaluateRule(custom('isPrime(answer)'), ctx(999999999989)).valid).toBe(true);
	});

	it('10^12 n’est pas premier', () => {
		expect(evaluateRule(custom('isPrime(answer)'), ctx(1e12)).valid).toBe(false);
	});

	it('au-delà de 10^12 : non évaluable, réponse fausse avec le message dédié', () => {
		for (const expression of ['isPrime(answer)', 'isPrime(answer) == 0']) {
			const result = evaluateRule(custom(expression), ctx(1e13 + 37));
			expect(result.valid).toBe(false);
			expect(result.reason).toBe('Impossible de vérifier ta réponse.');
		}
	});
});

describe('règle custom isPrime dans une case rulesSuffice', () => {
	const blank: InstanceBlank = {
		expectedAnswer: '40',
		type: 'math',
		rulesSuffice: true,
		validationRules: [custom('isPrime(answer^2+answer+41) == 0')]
	};
	const instance: QuestionInstance = {
		templateId: 'euler',
		statement: 'Trouve n tel que n²+n+41 ne soit pas premier : $?$' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['2'],
		theme: 'Arithmétique',
		domain: 'Arithmétique',
		level: 2,
		generatedAt: new Date().toISOString()
	};

	it.each([
		['40', true],
		['41', true],
		['1', false]
	])('%s → %s', (answer, isCorrect) => {
		expect(validateAnswer([answer], instance, [answer]).isCorrect).toBe(isCorrect);
	});
});
