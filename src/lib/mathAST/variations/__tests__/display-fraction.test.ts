/**
 * Le tableau de variations lit le signe de f′ quand la forme finale distribue
 * une fraction (`(x²/3 + 2x/3)eˣ`, chantier registre-reference, 2026-11-03) :
 * la barre commune ressort avant la factorisation, le numérateur se factorise
 * comme celui de tout quotient (D2). Revue de #2329 : sans cela, le tableau
 * affichait `x(x/3 + 2/3)eˣ`.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { differentiate } from '../../differentiation';
import { toLatex } from '../../latex-generator';
import { displayedDerivatives } from '../display';

const E = '\\exponentialE';

function factored(f: string): string {
	const node = parseLatex(f);
	return toLatex(displayedDerivatives(differentiate(node, { variable: 'x' }), node).factored);
}

describe('f′ factorisée du tableau : la barre d’un nombre ressort', () => {
	it.each([
		['\\frac{x^2e^x}{3}', `\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{1}{3}x^2e^x', `\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{x^3e^x}{6}', `\\dfrac{x^2 \\left( x + 3 \\right) ${E}^x}{6}`],
		['-\\frac{x^2e^x}{3}', `-\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{xe^{-x}}{2}', `\\dfrac{\\left( 1 - x \\right) ${E}^{-x}}{2}`]
	])('%s → %s', (f, expected) => {
		expect(factored(f)).toBe(expected);
	});

	it.each([
		['0.5x^2e^x', `0.5 x \\left( x + 2 \\right) ${E}^x`],
		['x^2e^x', `x \\left( x + 2 \\right) ${E}^x`]
	])('témoin inchangé : %s → %s', (f, expected) => {
		expect(factored(f)).toBe(expected);
	});
});
