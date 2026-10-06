/**
 * Forme ∞ − ∞ entre logarithmes : ln(x²+1) − 2 ln x rendait +∞ (vrai : 0).
 *
 * Cause : L'Hôpital concluait ln x / ln(x²+1) → 0 (vrai : 1/2). Sa dérivée
 * (1/x)/(2x/(x²+1)) a un dénominateur que l'évaluation exacte déclare
 * « indéterminé » (∞/∞) ; ce résultat était lu comme un fini non nul
 * (0/fini = 0). Le terme dominant croyait alors 2 ln x négligeable devant
 * ln(x²+1) et concluait +∞ sur une forme ∞ − ∞.
 *
 * Attendus vérifiés numériquement (x = 10⁶, 10⁹) en commentaire.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

function limitAtPlusInfinity(latex: string): string {
	const result = evaluateLimit(parseLatex(latex), 'x', positiveInfinity());
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

describe('a·ln u − b·ln v en +∞ : la forme ∞ − ∞ est levée, jamais conclue à tort', () => {
	it.each([
		// ln(1+1/x²) : 1e-12 en 10⁶
		['\\ln(x^2+1)-2\\ln x', 'exact 0'],
		['2\\ln x-\\ln(x^2+1)', 'exact 0'],
		// ln(1+1/x³) : 1e-18 en 10⁶
		['\\ln(x^3+1)-3\\ln x', 'exact 0'],
		// ln(2+1/x) : 0.693147… en 10⁶
		['\\ln(2x+1)-\\ln x', 'exact \\ln\\left( 2 \\right)'],
		// ln((x²+1)/x) ≈ ln x : 13.8 en 10⁶, 20.7 en 10⁹
		['\\ln(x^2+1)-\\ln x', 'infinite +inf'],
		// 3 ln x − 2 ln x = ln x
		['3\\ln x-\\ln(x^2)', 'infinite +inf'],
		// ln(x/(x+1)) : −1e-6 en 10⁶
		['\\ln x - \\ln(x+1)', 'exact 0'],
		// ½ ln(1+1/x²) : 5e-13 en 10⁶
		['\\frac{1}{2}\\ln(x^2+1)-\\ln x', 'exact 0']
	])('lim (%s) = %s', (latex, expected) => {
		expect(limitAtPlusInfinity(latex)).toBe(expected);
	});
});

// L'Hôpital mène à (1/x)/(2x/(x²+1)), encore 0/0 : sa forme réduite
// (x²+1)/(2x²) se lève à l'itération suivante.
describe('quotients de logarithmes de même ordre (cause du faux +∞)', () => {
	it.each([
		// ln x / (2 ln x + ln(1+1/x²)) : 0.5 en 10⁶
		['\\frac{\\ln x}{\\ln(x^2+1)}', 'exact \\dfrac{1}{2}'],
		['\\frac{2\\ln x}{\\ln(x^2+1)}', 'exact 1'],
		['\\frac{\\ln(x^2+1)}{\\ln x}', 'exact 2']
	])('lim (%s) = %s', (latex, expected) => {
		expect(limitAtPlusInfinity(latex)).toBe(expected);
	});
});

describe('autres formes ∞ − ∞', () => {
	it.each([
		// x²(1 − √(1+1/x³)) ≈ −1/(2x) : −5e-7 en 10⁶
		['x^2-\\sqrt{x^4+x}', 'exact 0'],
		['\\sqrt{x^2+x}-x', 'exact \\dfrac{1}{2}'],
		['x-\\sqrt{x^2+1}', 'exact 0']
	])('lim (%s) = %s', (latex, expected) => {
		expect(limitAtPlusInfinity(latex)).toBe(expected);
	});
});

describe('non-régression : croissances comparées', () => {
	it.each([
		['\\ln x - x', 'infinite -inf'],
		['x-\\ln x', 'infinite +inf'],
		['e^x - x', 'infinite +inf']
	])('lim (%s) = %s', (latex, expected) => {
		expect(limitAtPlusInfinity(latex)).toBe(expected);
	});
});
