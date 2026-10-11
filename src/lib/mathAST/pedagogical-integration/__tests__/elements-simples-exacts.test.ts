/**
 * Éléments simples de la version pédagogique : racines et coefficients
 * EXACTS (noyau `factor/`, ADR 0024 lot 3a), plus de décimaux approchés ni
 * de `x - (-1)` dans les étapes. La primitive finale ne change pas.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { differentiate } from '../../differentiation';
import { generatePedagogicalIntegrationSteps } from '../pipeline';
import type { PedagogicalIntegrationStep } from '../types';

const CASES: ReadonlyArray<{
	readonly latex: string;
	readonly decomposition: string;
	readonly antiderivative: string;
}> = [
	{
		latex: '\\frac{1}{x^2-5x+6}',
		decomposition: '\\dfrac{1}{x - 3} - \\dfrac{1}{x - 2}',
		antiderivative:
			'\\ln\\left( \\left| x - 3 \\right| \\right) - \\ln\\left( \\left| x - 2 \\right| \\right)'
	},
	{
		latex: '\\frac{2x+1}{x^2-1}',
		decomposition: '\\dfrac{3}{2 \\left( x - 1 \\right)} + \\dfrac{1}{2 \\left( x + 1 \\right)}',
		antiderivative:
			'\\dfrac{3 \\ln\\left( \\left| x - 1 \\right| \\right)}{2} + \\dfrac{\\ln\\left( \\left| x + 1 \\right| \\right)}{2}'
	},
	{
		latex: '\\frac{1}{4x^2-1}',
		decomposition:
			'\\dfrac{1}{4 \\left( x - \\dfrac{1}{2} \\right)} - \\dfrac{1}{4 \\left( x + \\dfrac{1}{2} \\right)}',
		antiderivative:
			'\\dfrac{\\ln\\left( \\left| x - \\dfrac{1}{2} \\right| \\right)}{4} - \\dfrac{\\ln\\left( \\left| x + \\dfrac{1}{2} \\right| \\right)}{4}'
	},
	{
		// A = 5/3 : la primitive s'écrivait 16666666666666667/10¹⁶ (flottant)
		latex: '\\frac{2x+3}{x^2+x-2}',
		decomposition: '\\dfrac{5}{3 \\left( x - 1 \\right)} + \\dfrac{1}{3 \\left( x + 2 \\right)}',
		antiderivative:
			'\\dfrac{5 \\ln\\left( \\left| x - 1 \\right| \\right)}{3} + \\dfrac{\\ln\\left( \\left| x + 2 \\right| \\right)}{3}'
	},
	{
		latex: '\\frac{3}{2x^2+x-3}',
		decomposition:
			'\\dfrac{3}{5 \\left( x - 1 \\right)} - \\dfrac{3}{5 \\left( x + \\dfrac{3}{2} \\right)}',
		antiderivative:
			'\\dfrac{3 \\ln\\left( \\left| x - 1 \\right| \\right)}{5} - \\dfrac{3 \\ln\\left( \\left| x + \\dfrac{3}{2} \\right| \\right)}{5}'
	}
];

function flatten(steps: readonly PedagogicalIntegrationStep[]): PedagogicalIntegrationStep[] {
	return steps.flatMap((s) => [s, ...flatten(s.subSteps ?? [])]);
}

describe('intégration pédagogique — éléments simples exacts', () => {
	for (const c of CASES) {
		it(c.latex, () => {
			const f = parseLatex(c.latex);
			const result = generatePedagogicalIntegrationSteps(f, { level: 'lycee' });
			const steps = flatten(result.steps);
			const decompose = steps.find((s) => s.rule === 'decompose-rational');
			if (!decompose) throw new Error('pas de décomposition');

			expect(toLatex(decompose.after)).toBe(c.decomposition);
			expect(areEquivalent(decompose.after, f)).toBe(true);
			for (const step of steps) {
				for (const node of [step.before, step.after]) {
					const latex = toLatex(node);
					expect(latex).not.toMatch(/\d\.\d/);
					expect(latex).not.toMatch(/- \\left\( -/);
				}
			}

			expect(toLatex(result.antiderivative)).toBe(c.antiderivative);
			const derivative = differentiate(result.antiderivative, { variable: 'x' });
			expect(areEquivalent(derivative, f)).toBe(true);
		});
	}
});
