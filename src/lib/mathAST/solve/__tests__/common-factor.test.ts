/**
 * Mise en facteur commun avant le produit nul
 *
 * Une somme dont les termes partagent un facteur non constant se résout en
 * mettant ce facteur en évidence, puis par la propriété du produit nul.
 * Mesuré avant le correctif : `e^x + x e^x = 0` rendait « Type d'equation
 * transcendante non supporte », alors que `(x+1)e^x = 0` donnait x = −1. La
 * dérivée de `x eˣ` arrive DÉVELOPPÉE : c'est ce trou qui faisait dire à
 * `.variations` « aucun point critique ».
 *
 * Coefficients ≠ 1 exprès : un coefficient 1 cache les erreurs de facteur.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseCustom } from '../../parser/custom';
import { normalize, normalFormsEquivalent } from '../../normal';
import { toCustom } from '../../custom-generator';
import type { RelationNode } from '../../types';
import type { SolveResult } from '../types';

function parseEquation(custom: string): RelationNode {
	const node = parseCustom(custom);
	if (node.type !== 'relation') throw new Error(`Relation attendue, reçu ${node.type}`);
	return node;
}

/** Les solutions sont-elles EXACTEMENT celles attendues (formes normales), dans l'ordre ? */
function expectExactSolutions(result: SolveResult, expected: readonly string[]): void {
	expect(result.solutions.map((s) => toCustom(s.value))).toHaveLength(expected.length);
	expected.forEach((custom, index) => {
		const solution = result.solutions[index];
		expect(solution.exact).toBe(true);
		const same = normalFormsEquivalent(normalize(solution.value), normalize(parseCustom(custom)));
		expect(same, `${toCustom(solution.value)} ≠ ${custom}`).toBe(true);
	});
}

describe('Mise en facteur commun puis produit nul', () => {
	it('e^x + x e^x = 0 → x = −1', () => {
		const result = solve(parseEquation('e^x + x e^x = 0'));
		expect(result.error).toBeUndefined();
		expect(result.status).toBe('unique');
		expectExactSolutions(result, ['-1']);
	});

	it('2x e^x + x^2 e^x = 0 → x = −2 ou x = 0', () => {
		const result = solve(parseEquation('2x e^x + x^2 e^x = 0'));
		expect(result.status).toBe('multiple');
		expectExactSolutions(result, ['-2', '0']);
	});

	it('3e^(2x) − 6x e^(2x) = 0 → x = 1/2 (différence)', () => {
		const result = solve(parseEquation('3e^(2x) - 6x e^(2x) = 0'));
		expect(result.status).toBe('unique');
		expectExactSolutions(result, ['1/2']);
	});

	it('x e^x − e^x = 0 → x = 1 (terme nu soustrait)', () => {
		const result = solve(parseEquation('x e^x - e^x = 0'));
		expectExactSolutions(result, ['1']);
	});

	it('x^2 e^x + 2x e^x + e^x = 0 → x = −1 (trois termes)', () => {
		const result = solve(parseEquation('x^2 e^x + 2x e^x + e^x = 0'));
		expectExactSolutions(result, ['-1']);
	});

	it('x ln(x) + x = 0 → x = e^{-1} seulement : x = 0 sort du domaine x > 0', () => {
		const result = solve(parseEquation('x ln(x) + x = 0'));
		expect(result.status).toBe('unique');
		expectExactSolutions(result, ['exp(-1)']);
	});

	it('dit la mise en facteur dans les étapes', () => {
		const result = solve(parseEquation('e^x + x e^x = 0'), { verbosity: 'detailed' });
		const step = result.steps.find((s) => s.rule === 'common-factor');
		expect(step).toBeDefined();
		expect(step?.description).toContain('facteur');
		expect(toCustom(step!.after)).toContain('(x+1)');
		expect(result.steps.some((s) => s.rule === 'zero-product-property')).toBe(true);
	});
});

describe('Ce qui ne doit pas bouger', () => {
	it('x^3 − x = 0 → −1, 0, 1 (factorisation polynomiale)', () => {
		const result = solve(parseEquation('x^3 - x = 0'));
		const values = result.solutions.map((s) => s.approximate ?? NaN).sort((a, b) => a - b);
		expect(values).toEqual([-1, 0, 1]);
	});

	it('e^x + 1 = 0 → pas de solution réelle', () => {
		const result = solve(parseEquation('e^x + 1 = 0'));
		expect(result.solutions).toHaveLength(0);
		expect(result.status).toBe('no-real-solution');
	});

	it('1/x = 0 → pas de solution, SANS erreur (numérateur constant)', () => {
		// Mesuré avant : « Type d'equation non supporte: unknown » — un refus,
		// que `.variations ln(x)` aurait pris pour « je ne sais pas ».
		const result = solve(parseEquation('1/x = 0'));
		expect(result.solutions).toHaveLength(0);
		expect(result.status).toBe('no-solution');
		expect(result.error).toBeUndefined();
	});

	it('exp(x) = 0 → pas de solution réelle, comme e^x = 0', () => {
		// Mesuré avant : « Type d'equation transcendante non supporte ».
		const result = solve(parseEquation('exp(x) = 0'));
		expect(result.status).toBe('no-real-solution');
		expect(result.error).toBeUndefined();
	});

	it('exp(2x) = 3 → x = ln(3)/2', () => {
		const result = solve(parseEquation('exp(2x) = 3'));
		expect(result.solutions).toHaveLength(1);
		expect(result.solutions[0].approximate).toBeCloseTo(Math.log(3) / 2, 10);
	});

	it('e^x = x + 2 reste non résolue, et le dit (erreur, aucune solution inventée)', () => {
		const result = solve(parseEquation('e^x = x + 2'));
		expect(result.solutions).toHaveLength(0);
		expect(result.error).toBeDefined();
	});
});
