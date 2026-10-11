/**
 * Racine nulle sans doublon (V19, chantier K21)
 *
 * Une cubique sans terme constant, `ax³ + bx² + cx = 0`, se résout en mettant
 * `x` en facteur. Quand `c = 0` aussi, le second facteur `ax² + bx` s'annule
 * ENCORE en 0. Mesuré avant le correctif : `4x³ − 2x² = 0` rendait
 * `{0 ; 1/2 ; 0}`, et l'élève lisait « Solution 3 : x = 0 ».
 *
 * Coefficients ≠ 1 exprès ; chaque solution est vérifiée numériquement.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { isRelation } from '../../guards';
import { subtract } from '../../factory';
import { compile } from '../../eval/compile';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`Relation attendue, reçu ${node.type}`);
	return node;
}

/** Les solutions, en LaTeX, et leurs valeurs, vérifiées dans l'équation. */
function solveAndCheck(latex: string): { latex: string[]; values: number[] } {
	const equation = parseEquation(latex);
	const result = solve(equation);
	expect(result.error).toBeUndefined();
	const residual = compile(subtract(equation.left, equation.right));
	const values = result.solutions.map((s) => compile(s.value)({}));
	for (const value of values) {
		expect(Math.abs(residual({ x: value })), `${latex} en x = ${value}`).toBeLessThan(1e-9);
	}
	return { latex: result.solutions.map((s) => toLatex(s.value)), values };
}

describe('Cubique et quartique à racine nulle : aucun doublon', () => {
	it.each([
		['4x^3-2x^2=0', [0, 0.5]],
		['2x^3+6x^2=0', [-3, 0]],
		['x^3-x^2=0', [0, 1]],
		['3x^4-12x^3=0', [0, 4]],
		['x^4-x^2=0', [-1, 0, 1]],
		['2x^3-8x=0', [-2, 0, 2]]
	] as const)('%s → %j', (latex, expected) => {
		const { values } = solveAndCheck(latex);
		const sorted = [...values].sort((a, b) => a - b);
		expect(sorted).toHaveLength(expected.length);
		sorted.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
	});

	it('4x³ − 2x² = 0 : rendu {0 ; 1/2}, et les étapes ne citent 0 qu’une fois', () => {
		const result = solve(parseEquation('4x^3-2x^2=0'));
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual(['0', '\\dfrac{1}{2}']);
		const announced = result.steps
			.map((s) => s.description)
			.filter((d) => d.startsWith('Solution'));
		expect(announced).toEqual(['Solution 1: x = 0', 'Solution 2: x = 1/2']);
	});

	it('4x³ − 2x² = 0 : on factorise par x², pas par x', () => {
		const result = solve(parseEquation('4x^3-2x^2=0'), { verbosity: 'detailed' });
		const factorStep = result.steps.find((s) => s.rule === 'factor-common-root');
		expect(factorStep?.description).toBe('On factorise par x^2 (racine evidente: x = 0)');
	});

	it('2x³ − 8x = 0 garde la factorisation par x', () => {
		const result = solve(parseEquation('2x^3-8x=0'), { verbosity: 'detailed' });
		const factorStep = result.steps.find((s) => s.rule === 'factor-common-root');
		expect(factorStep?.description).toBe('On factorise par x (racine evidente: x = 0)');
	});
});
