/**
 * Règle `equivalent`, comparaison numérique : la tolérance absolue 1e-10
 * jugeait 1e-12 égal à 0. Tolérance relative (cf. `numbersAreClose`).
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../validation-rule-evaluator';

describe('Règle equivalent : tolérance numérique relative', () => {
	it('10^{-12} n’est pas équivalent à 0', () => {
		const result = evaluateRule(
			{ type: 'equivalent', expression: '0' },
			{ variables: {}, answer: '10^{-12}', numericAnswer: 1e-12 }
		);
		expect(result.valid).toBe(false);
	});

	it('grandeur ordinaire : 4 ≡ {{n}}/3 avec n = 12', () => {
		const result = evaluateRule(
			{ type: 'equivalent', expression: '{{n}}/3' },
			{ variables: { n: 12 }, answer: '4', numericAnswer: 4 }
		);
		expect(result.valid).toBe(true);
	});

	it('bruit des flottants : 0,333333333333333 ≡ 1/3', () => {
		const result = evaluateRule(
			{ type: 'equivalent', expression: '1/3' },
			{ variables: {}, answer: '0.333333333333333', numericAnswer: 0.333333333333333 }
		);
		expect(result.valid).toBe(true);
	});
});
