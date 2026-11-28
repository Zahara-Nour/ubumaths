/**
 * Zéros finaux qui disent quelque chose : arrondi demandé, centimes.
 */

import { describe, it, expect } from 'vitest';
import {
	centsZerosMeaningful,
	missingRoundingZerosFeedback,
	roundingZerosVerdict,
	writtenRoundedValue
} from '../meaningful-zeros';
import { cosmeticViolations } from '#lib/mathAST/cosmetic-transforms.ts';

describe('roundingZerosVerdict', () => {
	const TENTH = { type: 'decimal', digits: 1 } as const;

	it('« 3{,}0 » au dixième : zéros finaux utiles, rien ne manque', () => {
		expect(roundingZerosVerdict('3{,}0', TENTH)).toEqual({ trailingZerosMeaningful: true });
	});

	it('« 3 » au dixième : il manque le chiffre des dixièmes', () => {
		expect(roundingZerosVerdict('3', TENTH)).toEqual({
			trailingZerosMeaningful: false,
			missingFeedback: "Arrondi au dixième : écris le chiffre des dixièmes, même si c'est 0."
		});
	});

	it('« -2{,}50 » au centième, négatif et groupé : utiles', () => {
		expect(roundingZerosVerdict('-2{,}50', { type: 'decimal', digits: 2 })).toEqual({
			trailingZerosMeaningful: true
		});
	});

	it('à l’unité : jamais d’exigence', () => {
		expect(roundingZerosVerdict('3', { type: 'decimal', digits: 0 })).toEqual({
			trailingZerosMeaningful: false
		});
	});

	it('significatifs : « 3{,}0 » à 2 chiffres utile, « 3 » manque, « 1\\,200 » sans exigence', () => {
		const TWO = { type: 'significant', digits: 2 } as const;
		expect(roundingZerosVerdict('3{,}0', TWO)).toEqual({ trailingZerosMeaningful: true });
		expect(roundingZerosVerdict('3', TWO).missingFeedback).toBe(
			'Arrondi à 2 chiffres significatifs : écris les 2 chiffres, même les zéros.'
		);
		expect(roundingZerosVerdict('1\\,200', TWO)).toEqual({ trailingZerosMeaningful: false });
		expect(roundingZerosVerdict('0{,}050', TWO)).toEqual({ trailingZerosMeaningful: true });
	});

	it('écriture qui n’est pas un nombre décimal simple : rien à dire', () => {
		expect(roundingZerosVerdict('\\frac{1}{2}', TENTH)).toEqual({
			trailingZerosMeaningful: false
		});
		expect(roundingZerosVerdict('3{,}0\\times10^{2}', TENTH)).toEqual({
			trailingZerosMeaningful: false
		});
	});
});

describe('missingRoundingZerosFeedback', () => {
	it.each<[number, string]>([
		[1, "Arrondi au dixième : écris le chiffre des dixièmes, même si c'est 0."],
		[2, "Arrondi au centième : écris le chiffre des centièmes, même si c'est 0."],
		[3, "Arrondi au millième : écris le chiffre des millièmes, même si c'est 0."],
		[5, 'Arrondi à 5 décimales : écris les 5 décimales, même les zéros.']
	])('%i décimale(s)', (digits, message) => {
		expect(missingRoundingZerosFeedback({ type: 'decimal', digits })).toBe(message);
	});
});

describe('centsZerosMeaningful', () => {
	it.each([
		['3{,}70', '€', true],
		['3,70', 'euros', true],
		['3.70', 'EUR', true],
		['3{,}7', '€', false],
		['3{,}700', '€', false],
		['3{,}70', 'm', false]
	])('« %s » en %s → %s', (latex, unit, expected) => {
		expect(centsZerosMeaningful(latex, unit)).toBe(expected);
	});
});

describe('cosmeticViolations : option meaningfulTrailingZeros', () => {
	it('zéros finaux gardés sans violation, zéros de tête toujours signalés', () => {
		expect(cosmeticViolations('3{,}0', {}, { meaningfulTrailingZeros: true })).toEqual([]);
		expect(cosmeticViolations('3{,}0', {}, {})).toEqual([{ id: 'zeros', severity: 'warn' }]);
		expect(cosmeticViolations('03{,}0', {}, { meaningfulTrailingZeros: true })).toEqual([
			{ id: 'zeros', severity: 'warn' }
		]);
	});
});

describe('writtenRoundedValue', () => {
	it.each<[number, { type: 'decimal' | 'significant'; digits: number }, string]>([
		[3, { type: 'decimal', digits: 1 }, '3,0'],
		[-2.35, { type: 'decimal', digits: 2 }, '-2,35'],
		[3, { type: 'decimal', digits: 0 }, '3'],
		[3, { type: 'significant', digits: 2 }, '3,0'],
		[0.1, { type: 'significant', digits: 2 }, '0,10'],
		[1200, { type: 'significant', digits: 2 }, '1200']
	])('%d → %s', (value, precision, written) => {
		expect(writtenRoundedValue(value, precision)).toBe(written);
	});
});
