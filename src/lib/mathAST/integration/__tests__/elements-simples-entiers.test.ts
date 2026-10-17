/**
 * Éléments simples à facteurs ENTIERS (ADR 0024, décision de David du
 * 2026-10-12) : la primitive de 1/(4x² − 1) s'écrit
 * `\dfrac{1}{4}\ln|2x - 1| - \dfrac{1}{4}\ln|2x + 1|`, plus
 * `\ln\left|x - \dfrac{1}{2}\right|`. ∫A/(px + q) = (A/p) ln|px + q|.
 * Coefficient dominant 1 : rendu inchangé.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { differentiate } from '../../differentiation';
import { compile } from '../../eval/compile';
import { number } from '../../factory';
import { integrate, integrateDefinite } from '../integrate';

const LN = (inner: string): string => `\\ln\\left( \\left| ${inner} \\right| \\right)`;

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

describe('intégration — éléments simples à facteurs entiers', () => {
	describe('coefficient dominant ≠ 1 : ln|px + q|, p, q entiers', () => {
		const CASES: ReadonlyArray<readonly [string, string]> = [
			['\\frac{1}{4x^2-1}', `\\dfrac{1}{4} ${LN('2 x - 1')} - \\dfrac{1}{4} ${LN('2 x + 1')}`],
			['\\frac{1}{2x^2+x-1}', `\\dfrac{1}{3} ${LN('2 x - 1')} - \\dfrac{1}{3} ${LN('x + 1')}`],
			['\\frac{3x+1}{6x^2-x-1}', `\\dfrac{1}{2} ${LN('2 x - 1')}`],
			['\\frac{1}{9x^2-4}', `\\dfrac{1}{12} ${LN('3 x - 2')} - \\dfrac{1}{12} ${LN('3 x + 2')}`],
			['\\frac{1}{-2x^2+x+1}', `\\dfrac{1}{3} ${LN('2 x + 1')} - \\dfrac{1}{3} ${LN('x - 1')}`]
		];
		for (const [integrand, expected] of CASES) {
			it(integrand, () => {
				expect(primitive(integrand)).toBe(expected);
			});
		}

		it('\\frac{(2x-1)(2x+1)} écrit factorisé : même primitive que 4x² − 1', () => {
			expect(primitive('\\frac{1}{(2x-1)(2x+1)}')).toBe(primitive('\\frac{1}{4x^2-1}'));
		});

		it('\\frac{x}{4x^2-1} reste juste, sans fraction dans la valeur absolue', () => {
			expect(primitive('\\frac{x}{4x^2-1}')).not.toMatch(/\\left\| [^|]*\\dfrac/);
		});
	});

	describe('coefficient dominant 1 : rendu inchangé', () => {
		const PINNED: ReadonlyArray<readonly [string, string]> = [
			['\\frac{1}{x^2-1}', `\\dfrac{1}{2} ${LN('x - 1')} - \\dfrac{1}{2} ${LN('x + 1')}`],
			['\\frac{1}{x^2-5x+6}', `${LN('x - 3')} - ${LN('x - 2')}`],
			['\\frac{2x+1}{x^2-1}', `\\dfrac{1}{2} ${LN('x + 1')} + \\dfrac{3}{2} ${LN('x - 1')}`]
		];
		for (const [integrand, expected] of PINNED) {
			it(integrand, () => {
				expect(primitive(integrand)).toBe(expected);
			});
		}
	});

	it('\\int_1^2 \\frac{1}{4x^2-1}dx : valeur exacte = valeur numérique = ln(9/5)/4', () => {
		const result = integrateDefinite(parseLatex('\\frac{1}{4x^2-1}'), number('1'), number('2'), {
			variable: 'x'
		});
		expect(result.status).toBe('exact');
		if (result.value === null) throw new Error('pas de valeur');
		expect(toLatex(result.value)).not.toMatch(/\d\.\d/);
		const exact = compile(result.value)({});
		expect(exact).toBeCloseTo(Math.log(9 / 5) / 4, 12);
		if (result.approximate !== undefined) expect(result.approximate).toBeCloseTo(exact, 12);
	});
});
