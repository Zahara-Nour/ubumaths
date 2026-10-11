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
import type { MathNode } from '../../types';

function derive(latex: string) {
	const result = generatePedagogicalDifferentiationSteps(parseLatex(latex) as MathNode, {
		variable: 'x',
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	return withTidyStep(steps, result.derivative);
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
	it.each(['x^2', 'x\\sin(x)', 'x^2 e^x', '\\ln(x)'])('(%s)′', (input) => {
		const result = generatePedagogicalDifferentiationSteps(parseLatex(input) as MathNode, {
			variable: 'x',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(withTidyStep(steps, result.derivative).steps).toEqual(steps);
	});
});
