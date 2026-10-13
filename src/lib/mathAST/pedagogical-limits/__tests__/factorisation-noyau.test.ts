/**
 * Limite pédagogique `0/0` levée par factorisation exacte (ADR 0024, lot 3a).
 *
 * La division par (x − a) passe par le noyau `factor/` : coefficients exacts,
 * négatifs écrits en soustractions (`x - 3`, jamais `x + (-3)`), point
 * d'approche négatif accepté (L26). Les étapes et leurs titres ne changent pas.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import type { PedagogicalLimitStep } from '../types';

interface Case {
	readonly latex: string;
	readonly value: string;
	/** Factorisations du numérateur et du dénominateur, première passe */
	readonly numerator: string;
	/** `null` : le dénominateur est déjà le facteur, rien à factoriser */
	readonly denominator: string | null;
	/** Forme simplifiée de la dernière passe */
	readonly simplified: string;
	readonly factorText: string;
}

const CASES: readonly Case[] = [
	{
		latex: '\\lim_{x\\to -3} \\frac{x^2-9}{x+3}',
		value: '-6',
		numerator: '\\left( x + 3 \\right) \\left( x - 3 \\right)',
		// Le dénominateur EST le facteur : pas de sous-étape « x + 3 = x + 3 »
		denominator: null,
		simplified: 'x - 3',
		factorText: '$x + 3$'
	},
	{
		latex: '\\lim_{x\\to 1}\\frac{x^3-1}{x^2-1}',
		value: '\\frac{3}{2}',
		numerator: '\\left( x - 1 \\right) \\left( x^2 + x + 1 \\right)',
		denominator: '\\left( x - 1 \\right) \\left( x + 1 \\right)',
		simplified: '\\dfrac{x^2 + x + 1}{x + 1}',
		factorText: '$x - 1$'
	},
	{
		latex: '\\lim_{x\\to 2}\\frac{x^2-5x+6}{x^2-4}',
		value: '-\\frac{1}{4}',
		numerator: '\\left( x - 2 \\right) \\left( x - 3 \\right)',
		denominator: '\\left( x - 2 \\right) \\left( x + 2 \\right)',
		simplified: '\\dfrac{x - 3}{x + 2}',
		factorText: '$x - 2$'
	},
	{
		latex: '\\lim_{x\\to -1}\\frac{2x^2+x-1}{x+1}',
		value: '-3',
		numerator: '\\left( x + 1 \\right) \\left( 2 x - 1 \\right)',
		// Le dénominateur EST le facteur : pas de sous-étape « x + 1 = x + 1 »
		denominator: null,
		simplified: '2 x - 1',
		factorText: '$x + 1$'
	},
	{
		// Racine double en haut et en bas, coefficient dominant 2 : deux passes
		latex: '\\lim_{x\\to 1}\\frac{2x^3-6x+4}{x^2-2x+1}',
		value: '6',
		numerator: '\\left( x - 1 \\right) \\left( 2 x^2 + 2 x - 4 \\right)',
		denominator: '\\left( x - 1 \\right) \\left( x - 1 \\right)',
		simplified: '2 x + 4',
		factorText: '$x - 1$'
	}
];

function flatten(steps: readonly PedagogicalLimitStep[]): PedagogicalLimitStep[] {
	return steps.flatMap((s) => [s, ...flatten(s.subSteps ?? [])]);
}

function run(latex: string) {
	const limit = parseLatex(latex);
	if (limit.type !== 'limit') throw new Error(`pas une limite : ${latex}`);
	return generatePedagogicalLimitSteps(limit.expression, {
		variable: limit.variable,
		approach: limit.approach,
		schoolLevel: 'lycee'
	});
}

describe('limite pédagogique — factorisation par le noyau exact', () => {
	for (const c of CASES) {
		it(`${c.latex} → ${c.value}`, () => {
			const result = run(c.latex);
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			if (result.value) expect(areEquivalent(result.value, parseLatex(c.value))).toBe(true);

			const steps = flatten(result.steps);
			const byRule = (rule: string) => steps.filter((s) => s.rule === rule);
			expect(toLatex(byRule('factor-numerator')[0].after)).toBe(c.numerator);
			if (c.denominator === null) expect(byRule('factor-denominator')).toHaveLength(0);
			else expect(toLatex(byRule('factor-denominator')[0].after)).toBe(c.denominator);
			const simplify = byRule('simplify-common-factor');
			expect(toLatex(simplify[simplify.length - 1].after)).toBe(c.simplified);
			expect(simplify[0].description).toBe(
				`Simplification : on divise numérateur et dénominateur par ${c.factorText}`
			);
		});

		it(`${c.latex} : aucune étape n'écrit « + (−…) » ni « /1 »`, () => {
			for (const step of flatten(run(c.latex).steps)) {
				for (const node of [step.before, step.after]) {
					const latex = toLatex(node);
					expect(latex).not.toMatch(/\+ \\left\( -/);
					expect(latex).not.toMatch(/\{1\}$/);
				}
			}
		});
	}

	it('chaque factorisation conserve la valeur (numérateur et dénominateur)', () => {
		for (const c of CASES) {
			for (const step of flatten(run(c.latex).steps)) {
				if (step.rule === 'factor-numerator' || step.rule === 'factor-denominator') {
					expect(areEquivalent(step.before, step.after)).toBe(true);
				}
			}
		}
	});
});

describe('rendu — une somme sous \\lim est parenthésée', () => {
	const renderer = new PedagogicalLimitRenderer();
	const rendered = (latex: string) =>
		renderer
			.renderAll(run(latex).steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
			.flatMap((s) => [s, ...(s.subSteps ?? [])])
			.map((s) => s.expressionLatex ?? '');

	it('(x² − 4)/(x − 2) en 2 : \\lim (x + 2), jamais (\\lim x) + 2', () => {
		const all = rendered('\\lim_{x\\to 2}\\frac{x^2-4}{x-2}');
		expect(all.some((l) => l.includes('\\lim_{x \\to 2} \\left( x + 2 \\right)}'))).toBe(true);
		expect(all.some((l) => /\\lim_\{x \\to 2\} x \+ 2/.test(l))).toBe(false);
	});

	it('somme directe x² + 2x en 3 : parenthésée', () => {
		const all = rendered('\\lim_{x\\to 3}x^2+2x');
		expect(all.some((l) => l.includes('\\lim_{x \\to 3} \\left( x^2 + 2 x \\right)}'))).toBe(true);
	});

	it('une fraction ou un produit ne sont pas parenthésés', () => {
		const all = rendered('\\lim_{x\\to 1}\\frac{x^3-1}{x^2-1}');
		expect(all.some((l) => l.includes('\\lim_{x \\to 1} \\dfrac{x^3 - 1}{x^2 - 1}}'))).toBe(true);
		const product = rendered('\\lim_{x\\to 3}2x^2');
		expect(product.some((l) => l.includes('\\lim_{x \\to 3} 2 x^2}'))).toBe(true);
	});
});
