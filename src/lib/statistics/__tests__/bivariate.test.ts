/**
 * Statistique à deux variables (manche 15, Q172) : point moyen, droite des
 * moindres carrés et prévisions EXACTES (fractions), arrondies une seule fois ;
 * r en décimal.
 *
 * Valeurs de référence calculées en Python (fractions), consignées dans
 * `docs/wip/bloc-nuage-progress.md`.
 */

import { describe, it, expect } from 'vitest';
import {
	bivariateFit,
	invalidValueReason,
	predictX,
	predictY,
	readExactValue,
	roundFraction,
	isInterpolation,
	toSafeNumber
} from '../bivariate';
import { fitAffine } from '../fit';
import { Fraction } from '../fraction';

// =============================================================================
// Helpers
// =============================================================================

const fractions = (values: number[]) => values.map((v) => new Fraction(BigInt(v)));
const XS = fractions([1, 2, 3, 4, 5, 6]);
const YS = fractions([12, 15, 19, 22, 27, 30]);

// =============================================================================
// Tests
// =============================================================================

describe('bivariateFit — exemple de référence', () => {
	const fit = bivariateFit(XS, YS)!;

	it('point moyen G(7/2 ; 125/6)', () => {
		expect(fit.meanX.toString()).toBe('7/2');
		expect(fit.meanY.toString()).toBe('125/6');
	});

	it('a = 129/35, b = 119/15 (exacts)', () => {
		expect(fit.slope!.toString()).toBe('129/35');
		expect(fit.intercept!.toString()).toBe('119/15');
	});

	it('r ≈ 0,998, en décimal', () => {
		expect(fit.correlation).not.toBeNull();
		expect(fit.correlation!.value).toBeCloseTo(0.998, 3);
		expect(fit.correlation!.exact).toBeNull();
	});

	it('la droite passe par G', () => {
		expect(predictY(fit, fit.meanX).equals(fit.meanY)).toBe(true);
	});

	it('cohérente avec fitAffine (la source de l’atelier)', () => {
		const numeric = fitAffine([1, 2, 3, 4, 5, 6], [12, 15, 19, 22, 27, 30]);
		if (!numeric.ok) throw new Error(numeric.message);
		expect(fit.slope!.toNumber()).toBeCloseTo(numeric.slope, 12);
		expect(fit.intercept!.toNumber()).toBeCloseTo(numeric.intercept, 12);
		expect(fit.correlation!.value ** 2).toBeCloseTo(numeric.r2, 12);
	});
});

describe('prévisions', () => {
	const fit = bivariateFit(XS, YS)!;

	it('x = 4,5 → y ≈ 24,519, interpolation', () => {
		const y = predictY(fit, Fraction.parse('4,5')!);
		expect(roundFraction(y, 3)).toEqual({ digits: '24.519', exact: false });
		expect(isInterpolation(fit, Fraction.parse('4,5')!)).toBe(true);
	});

	it('x = 8 → y ≈ 37,419, extrapolation', () => {
		const y = predictY(fit, new Fraction(8n));
		expect(roundFraction(y, 3).digits).toBe('37.419');
		expect(isInterpolation(fit, new Fraction(8n))).toBe(false);
	});

	it('y = 25 → x ≈ 4,630 (zéro final gardé), interpolation', () => {
		const x = predictX(fit, new Fraction(25n))!;
		expect(roundFraction(x, 3)).toEqual({ digits: '4.630', exact: false });
		expect(isInterpolation(fit, x)).toBe(true);
	});

	it('bornes de l’étendue comprises : interpolation', () => {
		expect(isInterpolation(fit, new Fraction(1n))).toBe(true);
		expect(isInterpolation(fit, new Fraction(6n))).toBe(true);
		expect(isInterpolation(fit, Fraction.parse('0,99')!)).toBe(false);
	});

	it('pente nulle : pas de x pour un y donné', () => {
		const flat = bivariateFit(fractions([1, 2, 3]), fractions([5, 5, 5]))!;
		expect(flat.slope!.toString()).toBe('0');
		expect(predictX(flat, new Fraction(7n))).toBeNull();
	});
});

describe('cas limites', () => {
	it('abscisses toutes égales : null', () => {
		expect(bivariateFit(fractions([2, 2, 2]), fractions([1, 2, 3]))).toBeNull();
	});

	it('ordonnées toutes égales : r non défini', () => {
		expect(bivariateFit(fractions([1, 2, 3]), fractions([5, 5, 5]))!.correlation).toBeNull();
	});

	it('points alignés : r = 1 ou −1, exact', () => {
		const up = bivariateFit(fractions([1, 2, 3]), fractions([2, 4, 6]))!;
		const down = bivariateFit(fractions([1, 2, 3]), fractions([6, 4, 2]))!;
		expect(up.correlation).toEqual({ value: 1, exact: new Fraction(1n) });
		expect(down.correlation!.value).toBe(-1);
		expect(down.correlation!.exact!.toString()).toBe('-1');
	});

	it('décimaux et fractions : exacts', () => {
		const fit = bivariateFit(
			[Fraction.parse('0,1')!, Fraction.parse('0,2')!, Fraction.parse('1/3')!],
			fractions([1, 2, 3])
		)!;
		expect(fit.meanX.toString()).toBe('19/90');
	});
});

describe('readExactValue — nombres écrits (revue)', () => {
	it('virgule, point, signe, fraction', () => {
		expect(readExactValue('0,5')!.toString()).toBe('1/2');
		expect(readExactValue('+3')!.toString()).toBe('3');
		expect(readExactValue('−1/3')!.toString()).toBe('-1/3');
	});

	it('refuse ce que Number lirait en silence : hexadécimal, notation e', () => {
		expect(readExactValue('0x1A')).toBeNull();
		expect(readExactValue('1e3')).toBeNull();
		expect(invalidValueReason('0x1A')).toBe('« 0x1A » n’est pas un nombre');
	});

	it('au plus 15 chiffres, dénominateur au plus 1000', () => {
		expect(readExactValue('1234567890123456')).toBeNull();
		expect(invalidValueReason('1234567890123456')).toBe(
			'« 1234567890123456 » : au plus 15 chiffres'
		);
		expect(readExactValue('1/1000')).not.toBeNull();
		expect(readExactValue('1/1001')).toBeNull();
		expect(invalidValueReason('1/1001')).toBe('« 1/1001 » : dénominateur au plus 1000');
		expect(invalidValueReason('25 %')).toBe('« 25 % » n’est pas un nombre');
	});
});

describe('grandes fractions (revue)', () => {
	const xs = Array.from({ length: 100 }, (_, i) => readExactValue(`${i + 1}/${1000 - 2 * i}`)!);
	const ys = Array.from({ length: 100 }, (_, i) => readExactValue(`${7 * i + 3}/${999 - 2 * i}`)!);

	it('100 points aux dénominateurs les plus grands permis : vite, et des décimaux finis', () => {
		const start = performance.now();
		const fit = bivariateFit(xs, ys)!;
		expect(performance.now() - start).toBeLessThan(200);
		for (const value of [fit.slope, fit.intercept, fit.meanX, fit.meanY]) {
			expect(Number.isFinite(toSafeNumber(value))).toBe(true);
		}
		expect(Number.isFinite(fit.correlation!.value)).toBe(true);
	});

	it('toSafeNumber : sans débordement, signe compris', () => {
		const huge = 10n ** 400n;
		expect(toSafeNumber(new Fraction(3n * huge + 1n, 2n * huge))).toBeCloseTo(1.5, 12);
		expect(toSafeNumber(new Fraction(-(3n * huge), 2n * huge + 7n))).toBeCloseTo(-1.5, 12);
		expect(toSafeNumber(new Fraction(7n, 2n))).toBe(3.5);
	});
});

describe('roundFraction — arrondi unique, demi vers le haut', () => {
	it('valeur exacte à cette précision : exact', () => {
		expect(roundFraction(new Fraction(7n, 2n), 3)).toEqual({ digits: '3.500', exact: true });
	});

	it('négatif : arrondi de la valeur absolue', () => {
		expect(roundFraction(new Fraction(-2n, 3n), 2)).toEqual({ digits: '-0.67', exact: false });
		expect(roundFraction(new Fraction(-1n, 8n), 2).digits).toBe('-0.13');
	});

	it('pas de « −0 »', () => {
		expect(roundFraction(new Fraction(-1n, 1000n), 2).digits).toBe('0.00');
	});

	it('zéro décimale', () => {
		expect(roundFraction(new Fraction(5n, 2n), 0)).toEqual({ digits: '3', exact: false });
	});
});
