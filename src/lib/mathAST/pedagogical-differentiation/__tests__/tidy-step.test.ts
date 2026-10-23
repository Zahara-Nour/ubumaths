/**
 * L'étape finale « On simplifie » d'une dérivation : la dernière ligne
 * affichée est la dérivée RANGÉE (`tidyTerms`), partout — atelier et
 * corrections de questions.
 *
 * Défaut mesuré (2026-10-06) : la correction d'une question finissait sur la
 * dérivée brute (`e^{3 x} 3`, `\cos(x) + \left( -\sin(x) \right)`,
 * `3 2 x - 1`) ; seul l'atelier ajoutait l'étape, dans son propre code.
 */

import { describe, it, expect } from 'vitest';
import {
	generatePedagogicalDifferentiationSteps,
	PedagogicalDifferentiationRenderer,
	withTidyStep
} from '../index';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { finalDerivative } from '../final-form';
import type { MathNode } from '../../types';

function derive(latex: string) {
	const f = parseLatex(latex) as MathNode;
	const result = generatePedagogicalDifferentiationSteps(f, {
		variable: 'x',
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	return withTidyStep(steps, result.derivative, f);
}

describe('withTidyStep : la dernière ligne est la dérivée rangée', () => {
	it.each([
		['e^{3x}', '\\exponentialE^{3 x} \\times 3 = 3 \\exponentialE^{3 x}', '3 \\exponentialE^{3 x}'],
		[
			'\\sin(x) + \\cos(x)',
			'\\cos\\left( x \\right) + \\left( -\\sin\\left( x \\right) \\right) = \\cos\\left( x \\right) - \\sin\\left( x \\right)',
			'\\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		['3x^2 - x + 1', '3 \\times 2 x - 1 = 6 x - 1', '6 x - 1']
	])('(%s)′ finit sur « On simplifie »', (input, expressionLatex, derivative) => {
		const { steps, derivativeLatex } = derive(input);
		const last = steps.at(-1);

		expect(last?.title).toBe('On simplifie');
		expect(last?.rule).toBe('simplify');
		expect(last?.id).toBe(steps.length);
		expect(last?.expressionLatex).toBe(expressionLatex);
		expect(derivativeLatex).toBe(derivative);
	});
});

describe('withTidyStep : une dérivée déjà propre n’a pas d’étape en plus', () => {
	// Un simple réordonnement ne fait pas d'étape : `sin x + x cos x` reste (u′v + uv′)
	it.each(['x^2', 'x\\sin(x)', '(x+1)^5', '\\ln(x)'])('(%s)′', (input) => {
		const result = generatePedagogicalDifferentiationSteps(parseLatex(input) as MathNode, {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(withTidyStep(steps, result.derivative, parseLatex(input)).steps).toEqual(steps);
	});
});

/**
 * La forme finale de f′ (D1 révisée et Q18, lot 5a de simplify-carte) :
 * quotient au numérateur réduit et simplifié par le facteur commun que le
 * domaine de f permet ; exponentielle commune seule mise en facteur ; sinon
 * `auto`, qui ne factorise jamais. Le RENDU est asserté.
 */
describe('withTidyStep : la forme finale de f′', () => {
	it.each([
		// Exponentielle commune, le reste développé réduit
		['x e^{x}', 'x', '\\left( x + 1 \\right) \\exponentialE^x'],
		['x^2 e^{x}', 'x', '\\left( x^2 + 2 x \\right) \\exponentialE^x'],
		['(x^2-3)e^{x}', 'x', '\\left( x^2 + 2 x - 3 \\right) \\exponentialE^x'],
		['x^2 e^{-x}', 'x', '\\left( 2 x - x^2 \\right) \\exponentialE^{-x}'],
		['3x e^{-2x}', 'x', '\\left( 3 - 6 x \\right) \\exponentialE^{-2 x}'],
		['t e^{-t}', 't', '\\left( 1 - t \\right) \\exponentialE^{-t}'],
		['(x^2+1)e^{2x}', 'x', '\\left( 2 x^2 + 2 x + 2 \\right) \\exponentialE^{2 x}'],
		// Quotient : numérateur réduit, puis facteur commun (Q18)
		['\\frac{2x+1}{x-3}', 'x', '\\dfrac{-7}{\\left( x - 3 \\right)^2}'],
		['\\frac{x^2}{x+1}', 'x', '\\dfrac{x^2 + 2 x}{\\left( x + 1 \\right)^2}'],
		['\\frac{x-1}{x^2}', 'x', '\\dfrac{2 - x}{x^3}'],
		['\\frac{\\ln(x)}{x^2}', 'x', '\\dfrac{1 - 2 \\ln\\left( x \\right)}{x^3}'],
		['\\frac{x}{e^{x}}', 'x', '\\dfrac{1 - x}{\\exponentialE^x}'],
		['\\frac{e^{x}}{x}', 'x', '\\dfrac{\\left( x - 1 \\right) \\exponentialE^x}{x^2}'],
		// quot-04 : (eˣ)² et e^{2x} se regroupent
		[
			'\\frac{e^{x}}{e^{x}+1}',
			'x',
			'\\dfrac{\\exponentialE^x}{\\left( \\exponentialE^x + 1 \\right)^2}'
		],
		// Sinon `auto`, qui ne factorise jamais
		['3(x+1)^5', 'x', '15 \\left( x + 1 \\right)^4'],
		['x^2(x+1)', 'x', '3 x^2 + 2 x'],
		['4x(x-3)', 'x', '8 x - 12']
	])('(%s)′ = %s', (input, variable, derivative) => {
		const f = parseLatex(input) as MathNode;
		const result = generatePedagogicalDifferentiationSteps(f, {
			variable,
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		const { derivative: final, derivativeLatex } = withTidyStep([], result.derivative, f);
		expect(derivativeLatex).toBe(derivative);
		// Appliquée deux fois, la forme finale ne change rien (carte f′ de l'Atelier)
		expect(toLatex(finalDerivative(final, f))).toBe(derivative);
	});

	it('la valeur ne change pas avec x < 0 : (x·∛x)′ n’a pas de valeur absolue', () => {
		const f = parseLatex('x\\sqrt[3]{x}') as MathNode;
		const result = generatePedagogicalDifferentiationSteps(f, {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(withTidyStep([], result.derivative, f).derivativeLatex).not.toContain('\\left|');
	});
});
