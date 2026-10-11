/**
 * La conversion d'un rationnel en flottant quand ses termes dépassent 10³⁰⁸.
 *
 * Mesuré avant (2026-10-11) : `Number(n) / Number(d)` rendait NaN pour
 * (1001/1000)¹⁰⁰⁰ (3001 chiffres en haut et en bas : Infinity / Infinity),
 * alors que la valeur vaut 2,7169 — la suite qui tend vers e, les intérêts
 * composés, 1,01³⁶⁵. Et 0 pour 10³⁰⁰ / 10⁴⁰⁰, qui vaut 10⁻¹⁰⁰.
 */

import { describe, it, expect } from 'vitest';
import { rationalToNumber, rational } from '../rational';
import { algebraicToNumber, algebraicCoefficient, algebraicTerm } from '../algebraic';
import type { Rational, SimplifiedRadical } from '../types';

const power = (base: bigint, exponent: bigint): bigint => base ** exponent;

// Les valeurs attendues viennent des fractions exactes, pas de `Math.pow` : 1,001 n'est pas
// exact en flottant, et Math.pow(1.001, 1000) s'écarte de 10⁻¹³ de (1001/1000)¹⁰⁰⁰

/** Écart relatif, pour comparer à la valeur flottante attendue. */
function relativeGap(actual: number, expected: number): number {
	return Math.abs(actual / expected - 1);
}

describe('rationalToNumber : des termes géants, une valeur ordinaire', () => {
	it.each([
		['(1001/1000)^1000', power(1001n, 1000n), power(1000n, 1000n), 2.7169239322358925],
		['(101/100)^365', power(101n, 365n), power(100n, 365n), 37.78343433288716],
		['(99/100)^365', power(99n, 365n), power(100n, 365n), 0.02551796445229121],
		['10^500 / 10^400', power(10n, 500n), power(10n, 400n), 1e100],
		['10^700 / 10^400', power(10n, 700n), power(10n, 400n), 1e300]
	])('%s', (_, n, d, expected) => {
		expect(relativeGap(rationalToNumber({ n, d }), expected)).toBeLessThan(1e-14);
	});

	it('le signe est gardé', () => {
		const value = rationalToNumber({ n: -power(1001n, 1000n), d: power(1000n, 1000n) });

		expect(relativeGap(value, -2.7169239322358925)).toBeLessThan(1e-14);
	});

	// `Number(10³⁰⁰) / Number(10⁴⁰⁰)` = 1e300 / Infinity = 0
	it('une petite valeur portée par de grands termes n’est pas 0', () => {
		const value = rationalToNumber({ n: power(10n, 300n), d: power(10n, 400n) });

		expect(relativeGap(value, 1e-100)).toBeLessThan(1e-14);
	});
});

describe('rationalToNumber : un vrai débordement reste un débordement', () => {
	it('au-delà du plus grand flottant : ±Infinity', () => {
		expect(rationalToNumber({ n: power(10n, 400n), d: 3n })).toBe(Infinity);
		expect(rationalToNumber({ n: -power(10n, 400n), d: 1n })).toBe(-Infinity);
		expect(rationalToNumber({ n: power(10n, 900n), d: power(10n, 400n) })).toBe(Infinity);
	});

	it('en deçà du plus petit flottant : 0', () => {
		expect(rationalToNumber({ n: 1n, d: power(10n, 400n) })).toBe(0);
		expect(rationalToNumber({ n: power(10n, 400n), d: power(10n, 900n) })).toBe(0);
	});

	it('les cas ordinaires ne changent pas', () => {
		expect(rationalToNumber(rational(1n, 2n))).toBe(0.5);
		expect(rationalToNumber(rational(0n, 1n))).toBe(0);
		expect(rationalToNumber(rational(-7n, 4n))).toBe(-1.75);
		expect(rationalToNumber(rational(1n, 3n))).toBe(1 / 3);
	});
});

describe('algebraicToNumber : un coefficient rationnel géant', () => {
	const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
	const huge: Rational = { n: power(1001n, 1000n), d: power(1000n, 1000n) };

	it('(1001/1000)^1000 · √2 → 3,8423', () => {
		const value = algebraicToNumber(algebraicCoefficient([algebraicTerm(huge, [sqrt2])]));

		expect(relativeGap(value, 2.7169239322358925 * Math.SQRT2)).toBeLessThan(1e-14);
	});
});
