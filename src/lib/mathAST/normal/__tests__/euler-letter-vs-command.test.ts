/**
 * La lettre `e` tapée par l'élève et la commande `\exponentialE` (écriture
 * MathLive du nombre d'Euler) désignent le même nombre : l'équivalence doit
 * le dire, en puissance comme seules.
 */

import { describe, test, expect } from 'vitest';
import { areEquivalent } from '$lib/math';

describe('`e` (lettre) ≡ `\\exponentialE` (commande)', () => {
	test.each([
		['e', '\\exponentialE'],
		['2e', '2\\exponentialE'],
		['e^2', '\\exponentialE^2'],
		['e^{2}', '\\exponentialE^{2}'],
		['e^x', '\\exponentialE^x'],
		['2e^{3x}', '2\\exponentialE^{3x}'],
		['e^{x}\\cdot e^{2x}', '\\exponentialE^{3x}'],
		['\\frac{e^{x+1}}{e}', '\\exponentialE^{x}']
	])('%s ≡ %s', (student, expected) => {
		expect(areEquivalent(student, expected)).toBe(true);
		expect(areEquivalent(expected, student)).toBe(true);
	});

	test.each([
		['e^2', '\\exponentialE^3'],
		['e^x', '\\exponentialE^{2x}'],
		['e', '\\exponentialE^2']
	])('%s ≢ %s', (student, expected) => {
		expect(areEquivalent(student, expected)).toBe(false);
	});
});
