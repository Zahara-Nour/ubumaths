/**
 * Limite pédagogique `0/0` en un point fractionnaire (V23, chantier K21)
 *
 * Mesuré avant, `(2x² + x − 1)/(2x − 1)` en 1/2 : le dénominateur s'écrivait
 * `\left(x-\dfrac{1}{2}\right)2` (nombre après la parenthèse), la fraction
 * simplifiée restait `\dfrac{2x+2}{2}`, et le titre factorisait par
 * `(x − 1/2)` là où un élève écrit `(2x − 1)`.
 *
 * Attendu : le facteur entier primitif du noyau (`primitivePart`), le nombre
 * devant la parenthèse, la fraction réduite. Chaque limite est vérifiée
 * numériquement près du point.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import type { PedagogicalLimitStep } from '../types';

interface Case {
	readonly latex: string;
	readonly a: number;
	readonly value: string;
	readonly numerator: string;
	/** `null` : le dénominateur est déjà le facteur, rien à factoriser */
	readonly denominator: string | null;
	readonly simplified: string;
	readonly factorText: string;
}

const CASES: readonly Case[] = [
	{
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{2x^2+x-1}{2x-1}',
		a: 0.5,
		value: '\\dfrac{3}{2}',
		numerator: '\\left( 2 x - 1 \\right) \\left( x + 1 \\right)',
		// Le dénominateur EST le facteur : pas de sous-étape « 2 x - 1 = 2 x - 1 »
		denominator: null,
		simplified: 'x + 1',
		factorText: '$2 x - 1$'
	},
	{
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{4x^2-1}{6x-3}',
		a: 0.5,
		value: '\\dfrac{2}{3}',
		numerator: '\\left( 2 x - 1 \\right) \\left( 2 x + 1 \\right)',
		denominator: '3 \\left( 2 x - 1 \\right)',
		simplified: '\\dfrac{2 x + 1}{3}',
		factorText: '$2 x - 1$'
	},
	{
		latex: '\\lim_{x\\to -\\frac{2}{3}}\\frac{3x^2-x-2}{3x+2}',
		a: -2 / 3,
		value: '-\\dfrac{5}{3}',
		numerator: '\\left( 3 x + 2 \\right) \\left( x - 1 \\right)',
		// Le dénominateur EST le facteur : pas de sous-étape « 3 x + 2 = 3 x + 2 »
		denominator: null,
		simplified: 'x - 1',
		factorText: '$3 x + 2$'
	},
	{
		// Point entier : la fraction restante est réduite aussi (`(2x + 2)/2` → `x + 1`)
		latex: '\\lim_{x\\to 1}\\frac{2x^2-2}{2x-2}',
		a: 1,
		value: '2',
		numerator: '\\left( x - 1 \\right) \\left( 2 x + 2 \\right)',
		denominator: '2 \\left( x - 1 \\right)',
		simplified: 'x + 1',
		factorText: '$x - 1$'
	},
	{
		// Coefficients rationnels : la constante DEVANT, sans « (1) »
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{x^2-\\frac{1}{4}}{x-\\frac{1}{2}}',
		a: 0.5,
		value: '1',
		numerator: '\\dfrac{1}{4} \\left( 2 x - 1 \\right) \\left( 2 x + 1 \\right)',
		denominator: '\\dfrac{1}{2} \\left( 2 x - 1 \\right)',
		simplified: '\\dfrac{2 x + 1}{2}',
		factorText: '$2 x - 1$'
	},
	{
		// Quotient −1 : `-(2x − 1)`, jamais `-1(2x − 1)`
		latex: '\\lim_{x\\to \\frac{1}{2}}\\frac{1-4x^2}{1-2x}',
		a: 0.5,
		value: '2',
		numerator: '\\left( 2 x - 1 \\right) \\left( -2 x - 1 \\right)',
		denominator: '-\\left( 2 x - 1 \\right)',
		simplified: '2 x + 1',
		factorText: '$2 x - 1$'
	}
];

function flatten(steps: readonly PedagogicalLimitStep[]): PedagogicalLimitStep[] {
	return steps.flatMap((s) => [s, ...flatten(s.subSteps ?? [])]);
}

function run(latex: string) {
	const limit = parseLatex(latex);
	if (limit.type !== 'limit') throw new Error(`pas une limite : ${latex}`);
	const result = generatePedagogicalLimitSteps(limit.expression, {
		variable: limit.variable,
		approach: limit.approach,
		schoolLevel: 'lycee'
	});
	return { limit, result };
}

describe('limite pédagogique — factorisation par le facteur entier', () => {
	for (const c of CASES) {
		it(`${c.latex} : facteur ${c.factorText}, fraction réduite ${c.simplified}`, () => {
			const { limit, result } = run(c.latex);
			const steps = flatten(result.steps);
			const byRule = (rule: string) => steps.filter((s) => s.rule === rule);
			expect(toLatex(byRule('factor-numerator')[0].after)).toBe(c.numerator);
			if (c.denominator === null) expect(byRule('factor-denominator')).toHaveLength(0);
			else expect(toLatex(byRule('factor-denominator')[0].after)).toBe(c.denominator);
			const simplify = byRule('simplify-common-factor');
			expect(toLatex(simplify[0].after)).toBe(c.simplified);
			expect(simplify[0].description).toBe(
				`Simplification : on divise numérateur et dénominateur par ${c.factorText}`
			);

			expect(result.value && toLatex(result.value)).toBe(c.value);
			if (!result.value) return;
			const f = compile(limit.expression);
			const near = (f({ x: c.a + 1e-7 }) + f({ x: c.a - 1e-7 })) / 2;
			expect(compile(result.value)({})).toBeCloseTo(near, 6);
		});

		it(`${c.latex} : aucun nombre écrit après une parenthèse`, () => {
			const renderer = new PedagogicalLimitRenderer();
			const rendered = renderer
				.renderAll(run(c.latex).result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
				.flatMap((s) => [s, ...(s.subSteps ?? [])]);
			for (const step of rendered) {
				expect(step.expressionLatex ?? '').not.toMatch(/\\right\) \d/);
			}
		});
	}
});
