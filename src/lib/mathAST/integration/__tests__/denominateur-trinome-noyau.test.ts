/**
 * Dénominateur trinôme factorisé par le noyau exact (ADR 0024, lot 3a) :
 * `factorQuadratic` lit le dénominateur comme un polynôme exact (produits et
 * parenthèses compris) et en tire les racines par Δ. Le rendu des primitives
 * ne change pas ; deux écritures auparavant refusées passent.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { differentiate } from '../../differentiation';
import { integrate } from '../integrate';

/** Primitive rendue, F′ = f vérifié par `areEquivalent` */
function primitive(latex: string): string {
	const f = parseLatex(latex);
	const result = integrate(f, { variable: 'x' });
	expect(result.status).toBe('exact');
	if (result.antiderivative === null) throw new Error(`pas de primitive : ${latex}`);
	const derivative = differentiate(result.antiderivative, { variable: 'x' });
	expect(areEquivalent(derivative, f)).toBe(true);
	return toLatex(result.antiderivative);
}

describe('intégration — dénominateur trinôme par le noyau', () => {
	describe('rendu inchangé', () => {
		const PINNED: ReadonlyArray<readonly [string, string]> = [
			[
				'\\frac{1}{x^2-5x+6}',
				'\\ln\\left( \\left| x - 3 \\right| \\right) - \\ln\\left( \\left| x - 2 \\right| \\right)'
			],
			[
				'\\frac{2x+1}{x^2-1}',
				'\\dfrac{1}{2} \\ln\\left( \\left| x + 1 \\right| \\right) + \\dfrac{3}{2} \\ln\\left( \\left| x - 1 \\right| \\right)'
			],
			[
				'\\frac{1}{4x^2-1}',
				'\\dfrac{1}{4} \\ln\\left( \\left| x - \\dfrac{1}{2} \\right| \\right) - \\dfrac{1}{4} \\ln\\left( \\left| x + \\dfrac{1}{2} \\right| \\right)'
			],
			[
				'\\frac{3}{2x^2+x-3}',
				'\\dfrac{3}{5} \\ln\\left( \\left| x - 1 \\right| \\right) - \\dfrac{3}{5} \\ln\\left( \\left| x + \\dfrac{3}{2} \\right| \\right)'
			],
			[
				'\\frac{1}{-x^2+5x-6}',
				'\\ln\\left( \\left| x - 2 \\right| \\right) - \\ln\\left( \\left| x - 3 \\right| \\right)'
			],
			[
				'\\frac{1}{(x-1)^2-4}',
				'\\dfrac{1}{4} \\ln\\left( \\left| x - 3 \\right| \\right) - \\dfrac{1}{4} \\ln\\left( \\left| x + 1 \\right| \\right)'
			],
			[
				'\\frac{1}{6x^2-5x+1}',
				'\\ln\\left( \\left| x - \\dfrac{1}{2} \\right| \\right) - \\ln\\left( \\left| x - \\dfrac{1}{3} \\right| \\right)'
			]
		];
		for (const [integrand, expected] of PINNED) {
			it(integrand, () => {
				expect(primitive(integrand)).toBe(expected);
			});
		}
	});

	describe('écritures lues par le noyau (refusées avant)', () => {
		it('\\frac{1}{x(x-5)+6} : même primitive que x² − 5x + 6', () => {
			expect(primitive('\\frac{1}{x(x-5)+6}')).toBe(primitive('\\frac{1}{x^2-5x+6}'));
		});

		it('\\frac{1}{(2x-1)(2x+1)} : même primitive que 4x² − 1', () => {
			expect(primitive('\\frac{1}{(2x-1)(2x+1)}')).toBe(primitive('\\frac{1}{4x^2-1}'));
		});
	});
});
