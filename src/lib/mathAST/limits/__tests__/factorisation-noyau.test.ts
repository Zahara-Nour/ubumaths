/**
 * Limites `0/0` levées par factorisation exacte (ADR 0024, lot 3a).
 *
 * `tryAlgebraicSimplification` sort le facteur (x − a) de N et D par le noyau
 * `factor/` (division exacte par la racine connue a, avec sa multiplicité) :
 * tout polynôme qui a la racine, point d'approche négatif compris (L26 : un
 * négatif est un `opposite`, jamais un littéral).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { evaluateLimit } from '../evaluate';
import { tryAlgebraicSimplification } from '../algebraic';
import { createStepRecorder } from '../step-recorder';
import type { LimitNode } from '../../types';

interface Case {
	readonly latex: string;
	readonly value: string;
	/** La fraction simplifiée, en LaTeX */
	readonly simplified: string;
	/** Le facteur annoncé dans l'étape */
	readonly factor: string;
}

const CASES: readonly Case[] = [
	{
		latex: '\\lim_{x\\to -3} \\frac{x^2-9}{x+3}',
		value: '-6',
		simplified: 'x - 3',
		factor: '(x + 3)'
	},
	{
		latex: '\\lim_{x\\to 1}\\frac{x^3-1}{x^2-1}',
		value: '\\frac{3}{2}',
		simplified: '\\dfrac{x^2 + x + 1}{x + 1}',
		factor: '(x − 1)'
	},
	{
		latex: '\\lim_{x\\to 2}\\frac{x^2-5x+6}{x^2-4}',
		value: '-\\frac{1}{4}',
		simplified: '\\dfrac{x - 3}{x + 2}',
		factor: '(x − 2)'
	},
	{
		latex: '\\lim_{x\\to -1}\\frac{2x^2+x-1}{x+1}',
		value: '-3',
		simplified: '2 x - 1',
		factor: '(x + 1)'
	},
	{
		// Racine double en haut et en bas, coefficient dominant 2 : (x − 1)² sort d'un coup
		latex: '\\lim_{x\\to 1}\\frac{2x^3-6x+4}{x^2-2x+1}',
		value: '6',
		simplified: '2 x + 4',
		factor: '(x − 1)²'
	},
	{
		// Racine double au numérateur seulement : on n'en sort qu'une
		latex: '\\lim_{x\\to 1}\\frac{x^3-3x+2}{3x^2-3}',
		value: '0',
		simplified: '\\dfrac{x^2 + x - 2}{3 x + 3}',
		factor: '(x − 1)'
	},
	{
		// Point d'approche rationnel non entier
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{4x^2-1}{2x-1}',
		value: '2',
		simplified: '2 x + 1',
		factor: '(2x − 1)'
	},
	{
		// V23 : facteur entier (2x − 1), fraction restante réduite, texte sans LaTeX
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{2x^2+x-1}{2x-1}',
		value: '\\frac{3}{2}',
		simplified: 'x + 1',
		factor: '(2x − 1)'
	}
];

function limitOf(latex: string): LimitNode {
	const node = parseLatex(latex);
	if (node.type !== 'limit') throw new Error(`pas une limite : ${latex}`);
	return node;
}

describe('limites — factorisation par le noyau exact', () => {
	for (const c of CASES) {
		it(`${c.latex} → ${c.value} par factorisation`, () => {
			const limit = limitOf(c.latex);
			const recorder = createStepRecorder();
			const result = tryAlgebraicSimplification(
				limit.expression,
				limit.variable,
				limit.approach,
				'both',
				recorder
			);

			expect(result.success).toBe(true);
			expect(result.technique).toBe('factorization');
			const simplified = result.simplified;
			if (!simplified) throw new Error('pas de forme simplifiée');
			expect(toLatex(simplified)).toBe(c.simplified);
			expect(recorder.getSteps()[0]?.description).toBe(`Factorisation par ${c.factor}`);

			// La forme simplifiée a la même limite, et c'est la bonne
			const after = evaluateLimit(simplified, limit.variable, limit.approach);
			expect(after.value).not.toBeNull();
			if (after.value) expect(areEquivalent(after.value, parseLatex(c.value))).toBe(true);
		});

		it(`${c.latex} : la limite complète vaut toujours ${c.value}`, () => {
			const result = evaluateLimit(limitOf(c.latex));
			expect(result.value).not.toBeNull();
			if (result.value) expect(areEquivalent(result.value, parseLatex(c.value))).toBe(true);
		});
	}

	it('refuse sans lever quand a n’est pas racine des deux', () => {
		const limit = limitOf('\\lim_{x\\to 2}\\frac{x^2-4}{x+1}');
		const result = tryAlgebraicSimplification(
			limit.expression,
			limit.variable,
			limit.approach,
			'both',
			createStepRecorder()
		);
		expect(result.success).toBe(false);
	});
});
