/**
 * « Développer » ne fait que développer — chantier normalize-usages, phase 0
 * validée par David le 2026-10-25 (Q1-Q3). La réponse vient de `expand`, plus
 * de `normalize` : ni dénominateur commun, ni fraction simplifiée, ni identité
 * qui perd le domaine. Entrées PARSÉES, ce que voit l'élève (`explainExpansion`).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { explainExpansion, type ExplainedExpansion } from '../expand-explained';

function explain(latex: string): ExplainedExpansion {
	return explainExpansion(parseLatex(latex), { schoolLevel: 'lycee' });
}

function answerOf(explained: ExplainedExpansion): string {
	return explained.kind === 'expanded' ? toLatex(explained.answer) : explained.kind;
}

describe('Q1 — un dénominateur avec x : seuls les produits et les numérateurs se développent', () => {
	it.each([
		['\\frac{1}{x+1}+1', 'unchanged'],
		['\\frac{x^2-1}{x+1}', 'unchanged'],
		['(x+1)(x-2)+\\frac{1}{x+1}', 'x^2 - x - 2 + \\dfrac{1}{x + 1}'],
		['\\frac{(x+1)^2}{x}', '\\dfrac{x^2 + 2 x + 1}{x}'],
		['\\frac{(x+1)(x-1)}{x+2}', '\\dfrac{x^2 - 1}{x + 2}']
	])('%s → %s', (input, expected) => {
		expect(answerOf(explain(input))).toBe(expected);
	});
});

describe('Q2 — diviser par un nombre se distribue', () => {
	it.each([
		['\\frac{x+1}{2}', '\\dfrac{1}{2} x + \\dfrac{1}{2}'],
		['\\frac{x+1}{2}(x-1)', '\\dfrac{1}{2} x^2 - \\dfrac{1}{2}'],
		['\\frac{2}{3}x(x+\\frac{3}{4})', '\\dfrac{2}{3} x^2 + \\dfrac{1}{2} x']
	])('%s → %s', (input, expected) => {
		expect(answerOf(explain(input))).toBe(expected);
	});
});

describe('Q3 — aucune identité qui perd le domaine', () => {
	it('e^{ln x} reste', () => {
		expect(answerOf(explain('e^{\\ln x}(x+1)'))).toBe(
			'x \\exponentialE^{\\ln\\left( x \\right)} + \\exponentialE^{\\ln\\left( x \\right)}'
		);
	});

	it('(√x)² reste quand plus rien ne dit x ≥ 0', () => {
		expect(answerOf(explain('(\\sqrt{x})^2(x+1)'))).toBe('x \\sqrt{x}^2 + \\sqrt{x}^2');
	});

	it('(√x)² = x quand un √x reste écrit dans le résultat', () => {
		expect(answerOf(explain('\\sqrt{x}(\\sqrt{x}+1)'))).toBe('x + \\sqrt{x}');
		expect(answerOf(explain('(2\\sqrt{x}+1)^2'))).toBe('4 x + 4 \\sqrt{x} + 1');
	});
});

describe('ce qui ne change pas', () => {
	it.each([
		['(2x-1)(x+3)', '2 x^2 + 5 x - 3'],
		['3x-(2-x)', '4 x - 2'],
		['(x+1)^3', 'x^3 + 3 x^2 + 3 x + 1'],
		['0.5x(x+0.2)', '0.5 x^2 + 0.1 x'],
		['\\sqrt{2}(x+\\sqrt{8})', '\\sqrt{2} x + 4'],
		['(e^x+1)^2', '\\exponentialE^{2 x} + 2 \\exponentialE^x + 1'],
		['2e^{x}(e^{-x}+1)', '2 \\exponentialE^x + 2']
	])('%s → %s', (input, expected) => {
		expect(answerOf(explain(input))).toBe(expected);
	});
});

describe('Q2 — l’étape de la division par un nombre', () => {
	it('(x+1)/2 : « On distribue ½ »', () => {
		const explained = explain('\\frac{x+1}{2}');
		const steps = explained.kind === 'expanded' ? explained.steps : null;

		expect(steps?.detailed.map((step) => step.title)).toEqual(['On distribue $\\dfrac{1}{2}$']);
		expect(steps?.detailed[0].expressionLatex).toContain('= \\dfrac{1}{2} x + \\dfrac{1}{2}');
	});
});
