/**
 * Le mode décimal d'`evaluate` quand la fraction calculée a des termes géants.
 *
 * `evaluateToRational` calcule en fractions exactes (BigInt) ; π et e y entrent
 * par leur flottant (π = 3141592653589793 / 10¹⁵). π²⁰ porte alors 310 chiffres
 * en haut et 301 en bas, (1001/1000)¹⁰⁰⁰ en porte 3001 : la conversion finale
 * `Number(n) / Number(d)` rendait Infinity ou NaN (mesuré le 2026-10-11).
 */

import { describe, it, expect } from 'vitest';
import { evaluate, evaluateNodeToApproximatedNumber, evaluateNodeToRational } from '../evaluate';
import { parseLatex } from '../../parser';

function relativeGap(actual: number, expected: number): number {
	return Math.abs(actual / expected - 1);
}

describe('le mode décimal sur des fractions aux termes géants', () => {
	it.each([
		['\\pi^{20}', 8769956796.082693],
		['e^{30}', 10686474581524.445],
		['\\left(1+\\frac{1}{1000}\\right)^{1000}', 2.7169239322358925],
		['1.01^{365}', 37.78343433288716],
		['\\sqrt{2}^{40}', 1048576]
	])('%s → %d', (latex, expected) => {
		const value = evaluateNodeToApproximatedNumber(parseLatex(latex));

		expect(relativeGap(value, expected)).toBeLessThan(1e-12);
	});

	it('evaluate rend une valeur, pas Infinity', () => {
		const result = evaluate(parseLatex('\\pi^{20}'), { mode: 'decimal' });

		expect(result.status).toBe('value');
		expect(result.status === 'value' && Number.isFinite(result.value)).toBe(true);
	});
});

// Décision d de David (2026-10-12) : plafond des puissances entières exactes 1000 → 10 000 ;
// au-delà, par le flottant — mais jamais « 0 » ni « Cannot convert Infinity » pour une valeur
// qui sort du flottant
describe('les puissances entières au-delà de 1000', () => {
	it('1,5^2000 se calcule exactement (était : par le flottant, Infinity)', () => {
		const value = evaluateNodeToRational(parseLatex('1.5^{2000}'));

		expect(value.n).toBe(3n ** 2000n);
		expect(value.d).toBe(2n ** 2000n);
	});

	it('au-delà du plafond, une valeur hors du flottant est refusée en français', () => {
		for (const latex of ['0.5^{20000}', '1.5^{20000}']) {
			const result = evaluate(parseLatex(latex), { mode: 'decimal' });

			expect(result.status).toBe('unevaluable');
			expect(result.status === 'unevaluable' && result.reason).toMatch(/hors d’échelle/);
		}
	});

	it('au-delà du plafond, une valeur dans le flottant reste calculée', () => {
		const value = evaluateNodeToApproximatedNumber(parseLatex('1.00001^{20000}'));

		expect(relativeGap(value, 1.2214015367677653)).toBeLessThan(1e-9);
	});
});
