/**
 * Éléments simples à facteurs ENTIERS dans la version pédagogique (ADR 0024,
 * décision de David du 2026-10-12) : 1/(4x² − 1) se décompose sur
 * (2x − 1)(2x + 1), la primitive s'écrit `\dfrac{1}{4}\ln|2x - 1| - …`,
 * coefficient devant comme le moteur, jamais `\ln\left|x - \dfrac{1}{2}\right|`
 * ni `\dfrac{\ln|2x - 1|}{4}`. Une somme de ln (linéarité) garde ses ln
 * semblables regroupés et son terme positif en tête. Chaque étape part de la
 * précédente, chaque égalité affichée est vraie (vérifiée en nombres).
 * Coefficient dominant 1 : rendu inchangé.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { differentiate } from '../../differentiation';
import { compile } from '../../eval/compile';
import { number } from '../../factory';
import type { MathNode } from '../../types';
import { generatePedagogicalIntegrationSteps } from '../pipeline';
import { PedagogicalIntegrationRenderer } from '../renderer';
import type { PedagogicalIntegrationStep } from '../types';
import type { RenderedStep } from '../../common/step-renderer-base';

const LN = (inner: string): string => `\\ln\\left( \\left| ${inner} \\right| \\right)`;
const SAMPLES = [-2.37, -0.81, 0.13, 0.94, 1.71, 3.29];

function flatten(steps: readonly PedagogicalIntegrationStep[]): PedagogicalIntegrationStep[] {
	return steps.flatMap((s) => [s, ...flatten(s.subSteps ?? [])]);
}

/** a et b prennent les mêmes valeurs aux points d'échantillonnage */
function expectSameValues(a: MathNode, b: MathNode): void {
	const fa = compile(a);
	const fb = compile(b);
	for (const x of SAMPLES) expect(fa({ x })).toBeCloseTo(fb({ x }), 10);
}

/** F′ = f, et les étapes s'enchaînent : chaque `before` est l'`after` précédent */
function run(latex: string) {
	const f = parseLatex(latex);
	const result = generatePedagogicalIntegrationSteps(f, { level: 'lycee' });
	const derivative = differentiate(result.antiderivative, { variable: 'x' });
	expect(areEquivalent(derivative, f)).toBe(true);
	const steps = flatten(result.steps);
	const top = result.steps;
	for (let i = 1; i < top.length; i++) {
		expect(toLatex(top[i].before)).toBe(toLatex(top[i - 1].after));
	}
	for (const step of steps) {
		for (const node of [step.before, step.after]) {
			expect(toLatex(node)).not.toMatch(/\d\.\d/);
		}
	}
	const rendered = new PedagogicalIntegrationRenderer()
		.renderAll(result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
		.flatMap(function flat(s: RenderedStep): RenderedStep[] {
			return [s, ...(s.subSteps ?? []).flatMap(flat)];
		});
	return { f, result, steps, rendered };
}

const INTEGER_CASES: ReadonlyArray<{
	readonly latex: string;
	readonly decomposition: string;
	readonly antiderivative: string;
}> = [
	{
		latex: '\\frac{1}{4x^2-1}',
		decomposition:
			'\\dfrac{1}{2 \\left( 2 x - 1 \\right)} - \\dfrac{1}{2 \\left( 2 x + 1 \\right)}',
		antiderivative: `\\dfrac{1}{4} ${LN('2 x - 1')} - \\dfrac{1}{4} ${LN('2 x + 1')}`
	},
	{
		latex: '\\frac{1}{2x^2+x-1}',
		decomposition: '\\dfrac{2}{3 \\left( 2 x - 1 \\right)} - \\dfrac{1}{3 \\left( x + 1 \\right)}',
		antiderivative: `\\dfrac{1}{3} ${LN('2 x - 1')} - \\dfrac{1}{3} ${LN('x + 1')}`
	},
	{
		latex: '\\frac{1}{9x^2-4}',
		decomposition:
			'\\dfrac{1}{4 \\left( 3 x - 2 \\right)} - \\dfrac{1}{4 \\left( 3 x + 2 \\right)}',
		antiderivative: `\\dfrac{1}{12} ${LN('3 x - 2')} - \\dfrac{1}{12} ${LN('3 x + 2')}`
	},
	{
		latex: '\\frac{1}{-2x^2+x+1}',
		decomposition: '\\dfrac{2}{3 \\left( 2 x + 1 \\right)} - \\dfrac{1}{3 \\left( x - 1 \\right)}',
		antiderivative: `\\dfrac{1}{3} ${LN('2 x + 1')} - \\dfrac{1}{3} ${LN('x - 1')}`
	}
];

describe('intégration pédagogique — éléments simples à facteurs entiers', () => {
	for (const c of INTEGER_CASES) {
		describe(c.latex, () => {
			it('décomposition sur les facteurs entiers, égalité vraie', () => {
				const { f, steps } = run(c.latex);
				const decompose = steps.find((s) => s.rule === 'decompose-rational');
				if (!decompose) throw new Error('pas de décomposition');
				expect(toLatex(decompose.after)).toBe(c.decomposition);
				expectSameValues(decompose.after, f);
			});

			it('primitive en ln|px + q|, l’étape d’intégration part de la décomposition', () => {
				const { result, steps } = run(c.latex);
				expect(toLatex(result.antiderivative)).toBe(c.antiderivative);
				const decompose = steps.find((s) => s.rule === 'decompose-rational');
				const apply = steps.find((s) => s.rule === 'apply-partial-fractions');
				if (!decompose || !apply) throw new Error('étapes manquantes');
				expect(toLatex(apply.before)).toBe(toLatex(decompose.after));
				expectSameValues(apply.after, result.antiderivative);
			});

			it('explications : factorisation vraie, facteurs annoncés = facteurs écrits', () => {
				const { steps, rendered } = run(c.latex);
				const decompose = steps.find((s) => s.rule === 'decompose-rational');
				const bindings = decompose?.bindings;
				if (!bindings) throw new Error('pas de liaisons');
				const { denominator, factoredDenominator, factor1, factor2 } = bindings;
				if (!denominator || !factoredDenominator || !factor1 || !factor2) {
					throw new Error('liaison manquante');
				}
				expectSameValues(denominator, factoredDenominator);
				const factored = toLatex(factoredDenominator);
				expect(factored).toContain(toLatex(factor1));
				expect(factored).toContain(toLatex(factor2));

				const explanation = rendered.find((s) => s.rule === 'apply-partial-fractions')?.explanation;
				expect(explanation).toContain('$\\dfrac{A}{p}\\ln|px+q|$');
				expect(explanation).not.toContain('$A\\ln|x-r|$');
			});
		});
	}

	it('\\frac{3x+1}{6x^2-x-1} = 1/(2x − 1) : primitive en ln|2x − 1|', () => {
		const { result } = run('\\frac{3x+1}{6x^2-x-1}');
		expect(toLatex(result.antiderivative)).not.toMatch(/\\left\| [^|]*\\dfrac/);
		const primitive = result.antiderivative;
		if (!primitive) throw new Error('pas de primitive');
		expect(toLatex(primitive)).toContain(LN('2 x - 1'));
	});

	it('\\frac{x}{4x^2-1} reste juste, sans fraction dans la valeur absolue', () => {
		const { result } = run('\\frac{x}{4x^2-1}');
		expect(toLatex(result.antiderivative)).not.toMatch(/\\left\| [^|]*\\dfrac/);
	});

	describe('primitive en ln : le coefficient devant, comme le moteur', () => {
		const CASES: ReadonlyArray<readonly [string, string]> = [
			['\\frac{3}{x^2-1}', `\\dfrac{3}{2} ${LN('x - 1')} - \\dfrac{3}{2} ${LN('x + 1')}`],
			['\\frac{3x+1}{6x^2-x-1}', `\\dfrac{1}{2} ${LN('2 x - 1')}`],
			['\\frac{1}{2x+1}', `\\dfrac{1}{2} ${LN('2 x + 1')}`],
			[
				'\\frac{1}{2x}+\\frac{1}{3x+1}',
				`\\dfrac{1}{2} ${LN('2 x')} + \\dfrac{1}{3} ${LN('3 x + 1')}`
			],
			['\\frac{3}{x}+\\frac{2}{x+1}', `3 ${LN('x')} + 2 ${LN('x + 1')}`],
			// ln semblables regroupés (revue du 2026-10-12 : la mise en forme les laissait côte à côte)
			['\\frac{1}{x}-\\frac{1}{x}', '0'],
			['\\frac{1}{x}+\\frac{1}{x}', `2 ${LN('x')}`],
			['\\frac{2}{x}+\\frac{3}{x}', `5 ${LN('x')}`],
			['\\frac{3}{x}-\\frac{1}{x}', `2 ${LN('x')}`],
			['\\frac{1}{2x}+\\frac{1}{2x}', LN('2 x')],
			// regroupé à la place du premier terme, l'ordre de l'énoncé gardé (lot 4c, S2)
			['\\frac{1}{x}+\\frac{1}{x+1}+\\frac{1}{x}', `2 ${LN('x')} + ${LN('x + 1')}`],
			// pas de moins en tête : le terme positif d'abord, comme le moteur
			['\\frac{-2}{x}+\\frac{1}{3x+1}', `\\dfrac{1}{3} ${LN('3 x + 1')} - 2 ${LN('x')}`],
			['\\frac{x-2}{x^2-1}', `\\dfrac{3}{2} ${LN('x + 1')} - \\dfrac{1}{2} ${LN('x - 1')}`]
		];
		for (const [latex, expected] of CASES) {
			it(latex, () => {
				expect(toLatex(run(latex).result.antiderivative)).toBe(expected);
			});
		}
	});

	describe('décomposition, coefficient dominant 1 : inchangée', () => {
		const PINNED: ReadonlyArray<readonly [string, string, string]> = [
			[
				'\\frac{1}{x^2-1}',
				'\\dfrac{1}{2 \\left( x - 1 \\right)} - \\dfrac{1}{2 \\left( x + 1 \\right)}',
				`\\dfrac{1}{2} ${LN('x - 1')} - \\dfrac{1}{2} ${LN('x + 1')}`
			],
			[
				'\\frac{1}{x^2-5x+6}',
				'\\dfrac{1}{x - 3} - \\dfrac{1}{x - 2}',
				`${LN('x - 3')} - ${LN('x - 2')}`
			],
			[
				'\\frac{2x+1}{x^2-1}',
				'\\dfrac{3}{2 \\left( x - 1 \\right)} + \\dfrac{1}{2 \\left( x + 1 \\right)}',
				`\\dfrac{3}{2} ${LN('x - 1')} + \\dfrac{1}{2} ${LN('x + 1')}`
			]
		];
		for (const [latex, decomposition, antiderivative] of PINNED) {
			it(latex, () => {
				const { steps, result, rendered } = run(latex);
				const decompose = steps.find((s) => s.rule === 'decompose-rational');
				if (!decompose) throw new Error('pas de décomposition');
				expect(toLatex(decompose.after)).toBe(decomposition);
				expect(toLatex(result.antiderivative)).toBe(antiderivative);
				const explanation = rendered.find((s) => s.rule === 'apply-partial-fractions')?.explanation;
				expect(explanation).toContain('$A\\ln|x-r|$');
			});
		}
	});

	it('\\int_1^2 \\frac{1}{4x^2-1}dx : valeur exacte = ln(9/5)/4', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('\\frac{1}{4x^2-1}'), {
			level: 'lycee',
			definite: { lower: number('1'), upper: number('2') }
		});
		const value = result.value;
		if (!value) throw new Error('pas de valeur');
		expect(toLatex(value)).not.toMatch(/\d\.\d/);
		expect(compile(value)({})).toBeCloseTo(Math.log(9 / 5) / 4, 12);
		const primitive = result.antiderivative;
		if (!primitive) throw new Error('pas de primitive');
		expect(toLatex(primitive)).toContain(LN('2 x - 1'));
	});
});
