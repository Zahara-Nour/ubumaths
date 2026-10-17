/**
 * Limite pédagogique : la valeur rendue est EXACTE (V21, chantier K21)
 *
 * La substitution directe calculait en flottants : « La limite vaut 1.5 »,
 * `-0.25`, et une limite 1/3 s'écrivait `0.3333333333333333`. La valeur est
 * désormais celle de l'évaluation exacte de `limits/` (`\dfrac{3}{2}`, `\sqrt{2}`).
 *
 * Chaque limite est vérifiée numériquement, en évaluant l'expression près du
 * point (le point lui-même peut être une forme 0/0).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import type { RenderedStep } from '../../common/step-renderer-base';
import { evaluateLimitNode } from '../../limits/evaluate';
import { dispatchPedagogicalLimit } from '../dispatch';

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

function rendered(latex: string): RenderedStep[] {
	const renderer = new PedagogicalLimitRenderer();
	return [
		...renderer.renderAll(run(latex).result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
	];
}

const CASES = [
	{
		latex: '\\lim_{x\\to 1}\\frac{x^3-1}{x^2-1}',
		value: '\\dfrac{3}{2}',
		text: '$\\dfrac{3}{2}$',
		a: 1
	},
	{
		latex: '\\lim_{x\\to 2}\\frac{x^2-5x+6}{x^2-4}',
		value: '-\\dfrac{1}{4}',
		text: '$-\\dfrac{1}{4}$',
		a: 2
	},
	{
		latex: '\\lim_{x\\to 1}\\frac{2x}{3x+3}',
		value: '\\dfrac{1}{3}',
		text: '$\\dfrac{1}{3}$',
		a: 1
	},
	{ latex: '\\lim_{x\\to 2}3\\sqrt{x}', value: '3 \\sqrt{2}', text: '$3 \\sqrt{2}$', a: 2 }
] as const;

describe('limite pédagogique — valeur exacte, jamais un décimal approché', () => {
	for (const c of CASES) {
		it(`${c.latex} → ${c.value}, vérifiée numériquement`, () => {
			const { limit, result } = run(c.latex);
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			if (!result.value) return;
			expect(toLatex(result.value)).toBe(c.value);

			const f = compile(limit.expression);
			const near = (f({ x: c.a + 1e-7 }) + f({ x: c.a - 1e-7 })) / 2;
			expect(compile(result.value)({})).toBeCloseTo(near, 6);
		});

		it(`${c.latex} : la conclusion affiche ${c.text}, sans décimale`, () => {
			const steps = rendered(c.latex);
			const conclusion = steps[steps.length - 1];
			expect(conclusion.title).toBe(`La limite vaut ${c.text}`);
			expect(conclusion.expressionLatex).toContain(`= ${c.value}`);
			for (const step of steps) {
				expect(`${step.title} ${step.expressionLatex ?? ''}`).not.toMatch(/\d\.\d/);
			}
		});
	}
});

/**
 * Limite en ±∞ (V26, chantier K21) : le quotient des coefficients dominants
 * se calculait en flottants (`1.5`, `0.6666666666666666`), les polynômes et
 * les coefficients irrationnels (π, √2) étaient refusés, et une borne écrite
 * `+\infty` (nœud du parseur) n'était reconnue par aucune stratégie.
 *
 * Oracle : le moteur `limits/` rend la même valeur exacte.
 */
const INFINITY_CASES = [
	// [expression, valeur en +∞, valeur en −∞]
	['\\frac{3x+1}{2x-5}', '\\dfrac{3}{2}', '\\dfrac{3}{2}'],
	['\\pi x', '+\\infty', '-\\infty'],
	['-2x^3+x', '-\\infty', '+\\infty'],
	['\\frac{x^2+1}{3x}', '+\\infty', '-\\infty'],
	['\\frac{2x}{x^2+1}', '0', '0'],
	['\\frac{-4x^2+x}{2x^2-1}', '-2', '-2'],
	['\\frac{\\frac{1}{3}x+1}{\\frac{1}{2}x-1}', '\\dfrac{2}{3}', '\\dfrac{2}{3}'],
	['\\frac{x^3-x}{2x^3+1}', '\\dfrac{1}{2}', '\\dfrac{1}{2}'],
	['\\frac{1}{2}x^2-x', '+\\infty', '+\\infty'],
	['-x^4+x', '-\\infty', '-\\infty'],
	['\\frac{\\pi x+1}{2x}', '\\dfrac{\\pi}{2}', '\\dfrac{\\pi}{2}'],
	['\\frac{x+1}{\\pi x}', '\\dfrac{1}{\\pi}', '\\dfrac{1}{\\pi}'],
	['\\sqrt{2}x^3', '+\\infty', '-\\infty'],
	// Quotient irrationnel réduit comme le moteur, signe devant la fraction :
	// ni `\\dfrac{1}{-\\sqrt{2}}`, ni `\\dfrac{-\\sqrt{2}}{2}`
	['\\frac{x}{-\\sqrt{2}x}', '-\\dfrac{\\sqrt{2}}{2}', '-\\dfrac{\\sqrt{2}}{2}'],
	['\\frac{-3x}{2x}', '-\\dfrac{3}{2}', '-\\dfrac{3}{2}'],
	['\\frac{2x}{\\frac{x}{\\sqrt{2}}}', '2 \\sqrt{2}', '2 \\sqrt{2}'],
	// Signe illisible (π − 4) : il ne décide pas du résultat, la limite reste calculée
	['\\frac{(\\pi-4)x+1}{x}', '\\pi - 4', '\\pi - 4']
] as const;

function oracle(latex: string): string | null {
	const limit = parseLatex(latex);
	if (limit.type !== 'limit') throw new Error(`pas une limite : ${latex}`);
	const value = evaluateLimitNode(limit).value;
	return value === null ? null : toLatex(value);
}

describe('limite pédagogique en ±∞ — valeur exacte, égale à celle du moteur', () => {
	for (const [expression, plus, minus] of INFINITY_CASES) {
		for (const [approach, expected] of [
			['+\\infty', plus],
			['-\\infty', minus]
		] as const) {
			const latex = `\\lim_{x\\to ${approach}}${expression}`;

			it(`${latex} → ${expected}, comme le moteur`, () => {
				const { result } = run(latex);
				expect(result.value).not.toBeNull();
				if (!result.value) return;
				expect(toLatex(result.value)).toBe(expected);
				expect(oracle(latex)).toBe(expected);
			});

			it(`${latex} : terme prépondérant (sauf monôme seul) puis conclusion ${expected}, sans décimale`, () => {
				const steps = rendered(latex);
				const rules = steps.map((s) => s.rule);
				// Une somme se factorise, deux monômes se simplifient, un monôme seul
				// conclut directement (annonce + conclusion) ; sans forme
				// indéterminée, on conclut par somme des limites.
				const preponderant = (
					['factor-dominant-term', 'simplify-common-factor', 'apply-sum'] as const
				).some((r) => rules.includes(r));
				expect(preponderant || rules.length === 2).toBe(true);
				const conclusion = steps[steps.length - 1];
				expect(conclusion.expressionLatex).toContain(`= ${expected}`);
				for (const step of steps) {
					expect(`${step.title} ${step.expressionLatex ?? ''}`).not.toMatch(/\d\.\d/);
				}
			});
		}
	}

	// Le moteur ne conclut qu'en +∞ sur ces deux quotients : en −∞, la valeur
	// pédagogique est celle qu'il rend en +∞ (même degré, même quotient).
	for (const [expression, expected] of [
		['\\frac{\\sqrt{2}x^2+1}{x^2}', '\\sqrt{2}'],
		// Ordre des facteurs de `tidy` : π avant le radical
		['\\frac{\\pi x^2}{\\sqrt{2}x^2}', '\\dfrac{\\pi \\sqrt{2}}{2}'],
		// Signe illisible (π − 4) qui ne décide pas du résultat
		['\\frac{x}{(\\pi-4)x^2}', '0'],
		['\\frac{x+1}{(\\pi-4)x^2}', '0'],
		// Signe de √2 − 1 lu numériquement
		['\\frac{(\\sqrt{2}-1)x^3}{x}', '+\\infty']
	] as const) {
		it(`${expression} → ${expected} en +∞ comme en −∞ (le moteur ne conclut qu’en +∞)`, () => {
			for (const approach of ['+\\infty', '-\\infty']) {
				const { result } = run(`\\lim_{x\\to ${approach}}${expression}`);
				expect(result.value && toLatex(result.value)).toBe(expected);
			}
			expect(oracle(`\\lim_{x\\to +\\infty}${expression}`)).toBe(expected);
		});
	}

	it('la conclusion de \\frac{3x+1}{2x-5} en +∞ affiche 3/2', () => {
		const steps = rendered('\\lim_{x\\to +\\infty}\\frac{3x+1}{2x-5}');
		expect(steps[steps.length - 1].title).toBe('La limite vaut $\\dfrac{3}{2}$');
	});

	it('par le dispatch (chemin des corrections), (3x+1)/(2x-5) en +∞ → 3/2 exact', () => {
		const result = dispatchPedagogicalLimit({
			expression: '(3x+1)/(2x-5)',
			approach: '+\\infty',
			schoolLevel: 'lycee'
		});
		expect(result.value && toLatex(result.value)).toBe('\\dfrac{3}{2}');
	});

	it('signe du coefficient dominant à plusieurs termes ((π − 4)x) : lu numériquement, −∞', () => {
		const { result } = run('\\lim_{x\\to +\\infty}\\frac{x^2}{(\\pi-4)x}');
		expect(result.value && toLatex(result.value)).toBe('-\\infty');
	});
});

describe('limite pédagogique en ±∞ — titres en prose', () => {
	it('\\frac{\\pi x+1}{2x} en +∞ : « La limite vaut $\\dfrac{\\pi}{2}$ », la formule entre $…$', () => {
		const steps = rendered('\\lim_{x\\to +\\infty}\\frac{\\pi x+1}{2x}');
		expect(steps[steps.length - 1].title).toBe('La limite vaut $\\dfrac{\\pi}{2}$');
	});
});

describe('limite pédagogique en ±∞ — fonction constante', () => {
	for (const [constant, expected, text] of [
		['5', '5', '$5$'],
		['\\pi', '\\pi', '$\\pi$']
	] as const) {
		const latex = `\\lim_{x\\to +\\infty}${constant}`;

		it(`${latex} : une seule étape, « la fonction est constante », pas de coefficients dominants`, () => {
			const { result } = run(latex);
			expect(result.value && toLatex(result.value)).toBe(expected);
			const descriptions = result.steps.map((s) => s.description);
			expect(descriptions).toContain(`La fonction est constante : sa limite vaut ${text}.`);
			expect(descriptions.join(' ')).not.toMatch(/coefficients dominants|degrés/);
			expect(result.steps.map((s) => s.rule)).toEqual(['identify-limit', 'conclude']);
		});

		it(`${latex} : la conclusion rendue vaut ${expected}`, () => {
			const steps = rendered(latex);
			const conclusion = steps[steps.length - 1];
			expect(conclusion.title).toBe(`La limite vaut ${text}`);
			expect(conclusion.expressionLatex).toContain(`= ${expected}`);
		});
	}
});
