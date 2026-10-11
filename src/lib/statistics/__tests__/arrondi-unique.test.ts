/**
 * Une seule règle d'arrondi d'affichage (écart V6, 2026-10-11)
 *
 * La règle écrite : demi vers le haut sur la VALEUR ABSOLUE (−0,125 → −0,13),
 * celle de `roundFraction` / `roundExact`. `formatApproxValue` arrondissait en
 * flottant (`Math.round(v × 100)`) : demi vers +∞ sur un négatif (−0,125 →
 * −0,12), et 1,005 × 100 = 100,4999… → 1 au lieu de 1,01.
 */
import { describe, it, expect } from 'vitest';
import { formatApproxValue, formatLawApproxValue } from '../format';
import { roundFraction, roundNumber } from '../rounding';
import { Fraction } from '../fraction';

describe('formatApproxValue : demi vers le haut sur la valeur absolue', () => {
	it.each([
		[-0.125, '≈ −0,13'],
		[-2.675, '≈ −2,68'],
		[1.005, '≈ 1,01'],
		[2001 / 200, '≈ 10,01'],
		[14.125, '≈ 14,13'],
		[0.125, '≈ 0,13'],
		[-0.004, '≈ 0']
	])('%s → %s', (value, expected) => {
		expect(formatApproxValue(value, 'fr')).toBe(expected);
	});

	it('valeur exacte à deux décimales : « = »', () => {
		expect(formatApproxValue(15.75, 'fr')).toBe('= 15,75');
		expect(formatApproxValue(-3.5, 'fr')).toBe('= −3,5');
	});

	it('même chiffres que l’arrondi exact `roundFraction` sur les demis', () => {
		for (const [num, den] of [
			[-1n, 8n],
			[201n, 200n],
			[-107n, 40n],
			[2001n, 200n]
		] as const) {
			const exact = roundFraction(new Fraction(num, den), 2).digits;
			const shown = formatApproxValue(Number(num) / Number(den), 'en').replace(/^[=≈] /, '');
			expect(Number(shown.replace('−', '-'))).toBe(Number(exact));
		}
	});
});

// Les autres affichages de valeurs (moyennes simulées au millième, E et V d'une
// loi, petites valeurs d'une loi) passent par `roundNumber`
describe('roundNumber : la même règle pour tout affichage de valeur', () => {
	it.each([
		[-3.5875, 3, -3.588],
		[3.5875, 3, 3.588],
		[1.0005, 3, 1.001],
		[-1.0005, 3, -1.001],
		[-0.0004, 3, 0],
		[1e-7, 2, 0],
		[-1e-7, 2, 0],
		[12345.675, 2, 12345.68]
	])('roundNumber(%s, %s) = %s', (value, places, expected) => {
		expect(roundNumber(value, places)).toBe(expected);
		expect(Object.is(roundNumber(value, places), -0)).toBe(false);
	});

	it('petite valeur d’une loi : deux chiffres significatifs, demi sur la valeur absolue', () => {
		expect(formatLawApproxValue(-0.00125, 'fr')).toBe('≈ −0,0013');
		expect(formatLawApproxValue(0.00125, 'fr')).toBe('≈ 0,0013');
	});
});
