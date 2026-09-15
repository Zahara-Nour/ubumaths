/**
 * Quotient de la division euclidienne d'une fraction rationnelle.
 *
 * C'est l'asymptote polynomiale d'une fraction rationnelle, calculée
 * exactement : P/Q = quotient + reste/Q, et reste/Q tend vers 0.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { rationalQuotient } from '../rational-quotient';

/** Quotient d'une expression LaTeX, rendu en LaTeX. */
function quotientOf(latex: string): string | null {
	const found = rationalQuotient(parseLatex(latex), 'x');
	// Les espaces du générateur LaTeX ne nous intéressent pas ici.
	return found === null ? null : toLatex(found.quotient).replaceAll(' ', '');
}

describe('rationalQuotient', () => {
	it("rend le quotient exact d'une fraction rationnelle", () => {
		expect(quotientOf('\\frac{x^2+3x}{x-2}')).toBe('x+5');
		expect(quotientOf('\\frac{2x^2-x+1}{x+1}')).toBe('2x-3');
	});

	it('va au-delà du degré que le numérique atteint', () => {
		// (x⁴+1)/(x-1) = x³ + x² + x + 1 + 2/(x-1)
		expect(quotientOf('\\frac{x^4+1}{x-1}')).toBe('x^3+x^2+x+1');
	});

	it('rend une constante quand les degrés sont égaux', () => {
		// (2x+1)/(x-1) = 2 + 3/(x-1)
		expect(quotientOf('\\frac{2x+1}{x-1}')).toBe('2');
	});

	it('rend zéro quand le numérateur est de degré inférieur', () => {
		// 1/x tend vers 0 : le quotient est nul, ce qui EST l'asymptote y = 0.
		expect(quotientOf('\\frac{1}{x}')).toBe('0');
	});

	it('garde les coefficients fractionnaires exacts', () => {
		// (2x^2+x)/(4x-2) = x/2 + 1/2 + 1/(4x-2)
		const quotient = quotientOf('\\frac{2x^2+x}{4x-2}');
		expect(quotient).not.toBeNull();
		expect(quotient).toContain('frac');
	});

	it('rend les coefficients numériques, par degré croissant', () => {
		// Le tracé a besoin de nombres ; l'étiquette, elle, garde la forme.
		const found = rationalQuotient(parseLatex('\\frac{x^2+3x}{x-2}'), 'x');
		expect([...(found?.coefficients ?? [])]).toEqual([5, 1]);

		const fractional = rationalQuotient(parseLatex('\\frac{2x^2+x}{4x-2}'), 'x');
		expect([...(fractional?.coefficients ?? [])]).toEqual([0.5, 0.5]);
	});

	it("refuse une fraction dont la variable n'est pas celle demandée", () => {
		// Une fraction en t n'a pas d'asymptote « en x » : le grapheur trace x.
		expect(rationalQuotient(parseLatex('\\frac{t^2+1}{t-1}'), 'x')).toBeNull();
	});

	it("refuse ce qui n'est pas une fraction rationnelle", () => {
		expect(quotientOf('\\sqrt{x^2+1}')).toBeNull();
		expect(quotientOf('\\arctan(x)')).toBeNull();
		expect(quotientOf('e^x')).toBeNull();
	});

	it('refuse un polynôme : il est sa propre valeur, sans asymptote', () => {
		expect(quotientOf('x^2+1')).toBeNull();
	});
});
