/**
 * La taille d'un résultat exact, PRÉVUE avant de le calculer (phase 0 du lot « lenteur des
 * grandes fractions », option A validée par David le 2026-10-12, seuil 1 000 caractères).
 *
 * Mesuré avant : `(1+1/10000)^10000` prenait 13 s et affichait 80 003 caractères ;
 * `(1+1/100000)^100000` bloquait le navigateur plus de 200 s. Le garde-fou doit donc décider
 * AVANT le calcul : une puissance de base a/b et d'exposant k fait environ k × (chiffres de a +
 * chiffres de b).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { estimatedExactDigits, isTooLongExact } from '../exact-size';

const digits = (latex: string) => estimatedExactDigits(parseLatex(latex));

describe('la taille prévue d’un résultat exact', () => {
	it('une puissance : k × (chiffres de a + chiffres de b), à quelques chiffres près', () => {
		expect(digits('\\left(1+\\frac{1}{1000}\\right)^{1000}')).toBeGreaterThan(5900);
		expect(digits('\\left(1+\\frac{1}{1000}\\right)^{1000}')).toBeLessThan(6100);
		expect(digits('2^{100000}')).toBeGreaterThan(30000);
		expect(digits('2^{100000}')).toBeLessThan(30200);
	});

	it('une factorielle, un coefficient binomial', () => {
		expect(digits('1000!')).toBeGreaterThan(2500);
		expect(digits('1000!')).toBeLessThan(2600);
		expect(digits('100!')).toBeLessThan(200);
		expect(digits('\\binom{1000}{500}')).toBeGreaterThan(290);
		expect(digits('\\binom{1000}{500}')).toBeLessThan(320);
	});

	it('un produit, une somme : les tailles s’ajoutent', () => {
		expect(digits('1000\\left(1+\\frac{0.03}{12}\\right)^{360}')).toBeGreaterThan(1800);
	});

	it('un calcul ordinaire reste petit', () => {
		expect(digits('3+4')).toBeLessThan(10);
		expect(digits('\\frac{\\pi}{3}')).toBeLessThan(10);
	});
});

describe('le seuil : 1 000 caractères', () => {
	// 2^3318 a 999 chiffres, 2^3325 en a 1 001
	it('aux bornes', () => {
		expect(isTooLongExact(parseLatex('2^{3318}'))).toBe(false);
		expect(isTooLongExact(parseLatex('2^{3325}'))).toBe(true);
	});

	it('les cas d’élèves', () => {
		for (const latex of ['2^{1000}', '200!', '\\left(1+\\frac{1}{100}\\right)^{100}', '100!']) {
			expect(isTooLongExact(parseLatex(latex))).toBe(false);
		}
		for (const latex of [
			'1.01^{365}',
			'1.5^{2000}',
			'\\left(1+\\frac{1}{1000}\\right)^{1000}',
			'1000!'
		]) {
			expect(isTooLongExact(parseLatex(latex))).toBe(true);
		}
	});

	it('une comparaison n’est jamais « trop longue » (elle rend vrai ou faux)', () => {
		expect(isTooLongExact(parseLatex('2^{5000} > 3^{3000}'))).toBe(false);
	});
});
