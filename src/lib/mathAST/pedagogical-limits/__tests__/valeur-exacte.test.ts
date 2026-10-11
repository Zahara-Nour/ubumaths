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
	{ latex: '\\lim_{x\\to 1}\\frac{x^3-1}{x^2-1}', value: '\\dfrac{3}{2}', text: '3/2', a: 1 },
	{ latex: '\\lim_{x\\to 2}\\frac{x^2-5x+6}{x^2-4}', value: '-\\dfrac{1}{4}', text: '−1/4', a: 2 },
	{ latex: '\\lim_{x\\to 1}\\frac{2x}{3x+3}', value: '\\dfrac{1}{3}', text: '1/3', a: 1 },
	{ latex: '\\lim_{x\\to 2}3\\sqrt{x}', value: '3 \\sqrt{2}', text: '3√2', a: 2 }
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
