/**
 * Un nombre JS réinjecté dans une expression relue par le parseur LaTeX ne doit jamais
 * s'écrire en notation JS : `String(3e-7)` = '3e-7' se relit 3e − 7 (e = constante
 * d'Euler) depuis que le parseur LaTeX ne lit plus la notation scientifique.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, createEvaluationContext } from '../validation-rule-evaluator';
import type { ValidationRule } from '../types';

const custom = (expression: string): ValidationRule =>
	({ type: 'custom', expression }) as ValidationRule;

describe('règle custom : réponse numérique minuscule', () => {
	it('answer < 0.000001 avec la réponse 3·10⁻⁷ : vraie', () => {
		const result = evaluateRule(custom('answer < 0.000001'), {
			variables: {},
			answer: '3\\times10^{-7}',
			numericAnswer: 3e-7
		});
		expect(result.valid).toBe(true);
	});

	it('answer*10^7 == 3 avec la réponse 3·10⁻⁷ : vraie', () => {
		const result = evaluateRule(custom('answer*10^7 == 3'), {
			variables: {},
			answer: '3\\times10^{-7}',
			numericAnswer: 3e-7
		});
		expect(result.valid).toBe(true);
	});

	it('variable numérique minuscule : answer < {{m}} avec m = 10⁻⁶ et la réponse 5·10⁻⁷', () => {
		const result = evaluateRule(custom('answer < {{m}}'), {
			variables: { m: 1e-6 },
			answer: '5\\times10^{-7}',
			numericAnswer: 5e-7
		});
		expect(result.valid).toBe(true);
	});

	it('variable numérique minuscule : answer > {{m}} avec m = 10⁻⁷ et la réponse 0,5', () => {
		const result = evaluateRule(custom('answer > {{m}}'), {
			variables: { m: 1e-7 },
			answer: '0.5',
			numericAnswer: 0.5
		});
		expect(result.valid).toBe(true);
	});
});

describe('createEvaluationContext : une valeur écrite en puissance de 10 est un nombre', () => {
	it.each([
		['10^{-7}', 1e-7],
		['3.2 \\times 10^{5}', 320000],
		['2.5', 2.5]
	])('%s → %s', (value, expected) => {
		const context = createEvaluationContext([{ name: 'm', value }], '1');
		expect(context.variables.m).toBeCloseTo(expected, 20);
	});
});
