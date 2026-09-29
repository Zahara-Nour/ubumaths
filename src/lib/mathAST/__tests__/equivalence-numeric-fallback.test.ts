/**
 * Repli numérique d'`areEquivalent` (quand la normalisation échoue) : la
 * tolérance était ABSOLUE (1e-10), si bien que 1e-12 et 0 étaient jugés
 * égaux. Tolérance désormais relative, avec un plancher absolu minuscule pour
 * le bruit des flottants autour de 0.
 *
 * La normalisation réussit sur presque tout : on la fait échouer exprès pour
 * atteindre le repli.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseLatex } from '../index';
import { areEquivalent } from '../equivalence';
import { numbersAreClose } from '../common';

vi.mock('../normal/normalize', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../normal/normalize')>();
	return {
		...actual,
		equivalenceForms: () => {
			throw new Error('normalisation indisponible (test du repli numérique)');
		}
	};
});

function equivalent(a: string, b: string): boolean {
	return areEquivalent(parseLatex(a), parseLatex(b));
}

describe('areEquivalent : repli numérique', () => {
	it('10^{-12} n’est pas 0', () => {
		expect(equivalent('10^{-12}', '0')).toBe(false);
	});

	it('10^{-12} n’est pas 2·10^{-12}', () => {
		expect(equivalent('10^{-12}', '2\\times10^{-12}')).toBe(false);
	});

	it('bruit des flottants : 0,1 + 0,2 ≡ 0,3', () => {
		expect(equivalent('0.1+0.2', '0.3')).toBe(true);
	});

	it('bruit autour de 0 : 0,1 + 0,2 − 0,3 ≡ 0', () => {
		expect(equivalent('0.1+0.2-0.3', '0')).toBe(true);
	});

	it('grandeur ordinaire : 1/3 ≡ 0,333333333333333 (15 décimales)', () => {
		expect(equivalent('\\frac{1}{3}', '0.333333333333333')).toBe(true);
	});

	it('grandeur ordinaire : 2 ≢ 2,001', () => {
		expect(equivalent('2', '2.001')).toBe(false);
	});
});

describe('numbersAreClose', () => {
	it.each<[number, number, boolean]>([
		[1e-12, 0, false],
		[0, 0, true],
		[5.551115123125783e-17, 0, true],
		[1, 1 + 1e-13, true],
		[1, 1 + 1e-11, false],
		[1, 1 + 1e-9, false],
		[123456789012, 123456789012.001, true],
		// Deux entiers voisins restent distincts jusqu’à 10¹² (un nombre de CM2 en a 12 chiffres)
		[123456789012, 123456789013, false],
		[123456789012, 123456789020, false],
		[1e-12, 1.0000000000001e-12, true],
		[1e-12, 1.1e-12, false]
	])('%d ≈ %d : %s', (a, b, expected) => {
		expect(numbersAreClose(a, b)).toBe(expected);
		expect(numbersAreClose(b, a)).toBe(expected);
	});
});
