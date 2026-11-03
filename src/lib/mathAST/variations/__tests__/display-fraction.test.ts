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
import { requestedForm } from '../../requested-form';

const E = '\\exponentialE';

function factored(f: string): string {
	const node = parseLatex(f);
	return toLatex(displayedDerivatives(differentiate(node, { variable: 'x' }), node).factored);
}

describe('f′ factorisée du tableau : la barre d’un nombre ressort', () => {
	// Rien d'autre à factoriser que le nombre : la forme finale reste (David,
	// 2026-11-03). Avant : `(1 − x)e^{−x}/2`, mais `(x/2 − 1/4)e^{2x}` gardé.
	it.each([
		['\\frac{xe^{-x}}{2}', `\\left( \\dfrac{1}{2} - \\dfrac{x}{2} \\right) ${E}^{-x}`],
		['\\frac{x}{6}e^{3x}', `\\left( \\dfrac{x}{2} + \\dfrac{1}{6} \\right) ${E}^{3 x}`],
		[
			'\\left(\\frac{x}{4}-\\frac{1}{4}\\right)e^{2x}',
			`\\left( \\dfrac{x}{2} - \\dfrac{1}{4} \\right) ${E}^{2 x}`
		]
	])('rien qu’un nombre à sortir : %s → %s', (f, expected) => {
		expect(factored(f)).toBe(expected);
	});

	// Dénominateur commun au-delà de 100 : la barre ne ressort pas (David, 2026-11-03)
	it('plafond : (x⁴/7 + x³/11 + x/13)eˣ ne passe pas sur 1001', () => {
		const node = parseLatex('\\left(\\frac{x^4}{7}+\\frac{x^3}{11}+\\frac{x}{13}\\right)e^x');
		expect(toLatex(requestedForm(node, 'factorisee', { f: node, kind: 'derivative' }))).toBe(
			`x \\left( \\dfrac{x^3}{7} + \\dfrac{x^2}{11} + \\dfrac{1}{13} \\right) ${E}^x`
		);
	});

	it.each([
		['\\frac{x^2e^x}{3}', `\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{1}{3}x^2e^x', `\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{x^3e^x}{6}', `\\dfrac{x^2 \\left( x + 3 \\right) ${E}^x}{6}`],
		['-\\frac{x^2e^x}{3}', `-\\dfrac{x \\left( x + 2 \\right) ${E}^x}{3}`],
		['\\frac{x^2}{4}e^{2x}', `\\dfrac{x \\left( x + 1 \\right) ${E}^{2 x}}{2}`]
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
