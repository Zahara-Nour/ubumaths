/**
 * Les messages des règles de validation arrivent à l'élève (feedback d'une
 * case) : ils sont en français, et ne révèlent pas la réponse attendue.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, type EvaluationContext } from '../validation-rule-evaluator';
import type { ValidationRule } from '../types';

function reasonOf(
	rule: ValidationRule,
	answer: string,
	numericAnswer?: number
): string | undefined {
	const ctx: EvaluationContext = { variables: { n: 12 }, answer, numericAnswer };
	return evaluateRule(rule, ctx).reason;
}

describe('Messages des règles : en français', () => {
	it.each<[string, ValidationRule, string, string]>([
		[
			'divisor : ne divise pas',
			{ type: 'divisor', dividend: '{{n}}' },
			'5',
			"5 n'est pas un diviseur de 12."
		],
		['divisor : zéro', { type: 'divisor', dividend: '12' }, '0', "0 n'est pas un diviseur."],
		[
			'divisor : non entier',
			{ type: 'divisor', dividend: '12' },
			'2.5',
			"2,5 n'est pas un nombre entier : un diviseur est un entier."
		],
		[
			'divisor : pas un nombre',
			{ type: 'divisor', dividend: '12' },
			'abc',
			'Ta réponse doit être un nombre.'
		],
		['multiple', { type: 'multiple', base: '3' }, '7', "7 n'est pas un multiple de 3."],
		[
			'multiple : base nulle',
			{ type: 'multiple', base: '0' },
			'7',
			'Erreur de configuration de la question : la base d’un multiple ne peut pas être 0.'
		],
		[
			'range inclusif',
			{ type: 'range', min: '1', max: '10' },
			'12',
			"12 n'est pas compris entre 1 et 10."
		],
		[
			'range strict',
			{ type: 'range', min: '1', max: '10', inclusive: false },
			'10',
			"10 n'est pas strictement compris entre 1 et 10."
		],
		[
			'equation_root',
			{ type: 'equation_root', equation: 'x^2 - 4 = 0' },
			'3',
			"3 n'est pas solution de l'équation."
		],
		[
			'equivalent',
			{ type: 'equivalent', expression: '{{n}}/2' },
			'5',
			"Ta réponse n'est pas égale à la valeur attendue."
		],
		['isPrime', { type: 'predicate', predicate: 'isPrime' }, '9', "9 n'est pas un nombre premier."],
		[
			'isComposite',
			{ type: 'predicate', predicate: 'isComposite' },
			'7',
			"7 n'est pas un nombre composé."
		],
		['isEven', { type: 'predicate', predicate: 'isEven' }, '7', "7 n'est pas un nombre pair."],
		['isOdd', { type: 'predicate', predicate: 'isOdd' }, '8', "8 n'est pas un nombre impair."],
		[
			'isPositive',
			{ type: 'predicate', predicate: 'isPositive' },
			'-3',
			"-3 n'est pas strictement positif."
		],
		[
			'isNegative',
			{ type: 'predicate', predicate: 'isNegative' },
			'3',
			"3 n'est pas strictement négatif."
		],
		[
			'isInteger',
			{ type: 'predicate', predicate: 'isInteger' },
			'2.5',
			"2,5 n'est pas un nombre entier."
		],
		[
			'custom sans description',
			{ type: 'custom', expression: 'answer > 100' },
			'3',
			'Ta réponse ne satisfait pas les critères demandés.'
		]
	])('%s', (_label, rule, answer, expected) => {
		expect(reasonOf(rule, answer)).toBe(expected);
	});

	it("equation_root : échec d'évaluation → message français, sans détail technique", () => {
		const reason = reasonOf({ type: 'equation_root', equation: '\\foo{x} = 0' }, '3');
		expect(reason).toBe("Impossible de vérifier ta réponse dans l'équation.");
	});
});
