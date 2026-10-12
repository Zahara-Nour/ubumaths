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
import { estimatedExactDigits, exactCharacters, isTooLongToCompute } from '../exact-size';

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

// Depuis le lot « défauts des grandes fractions » (2026-10-12), la prévision ne sert plus qu'à
// ne pas figer la page : au-delà de 20 000 caractères prévus, rien n'est calculé. En deçà, le
// résultat est calculé (107 ms au pire mesuré) et la règle des 1 000 caractères se lit sur sa
// longueur réelle : la prévision additionnait avant de simplifier (`10^{600}×10^{-598}`).
describe('le plafond du calcul : 20 000 caractères prévus', () => {
	// 2^66435 a 19 999 chiffres, 2^66445 en a 20 002
	it('aux bornes', () => {
		expect(isTooLongToCompute(parseLatex('2^{66435}'))).toBe(false);
		expect(isTooLongToCompute(parseLatex('2^{66445}'))).toBe(true);
	});

	it('les cas d’élèves', () => {
		for (const latex of [
			'\\left(1+\\frac{1}{1000}\\right)^{1000}',
			'1.01^{365}',
			'1000!',
			'10^{600}\\times10^{-598}'
		]) {
			expect(isTooLongToCompute(parseLatex(latex))).toBe(false);
		}
		for (const latex of ['\\left(1+\\frac{1}{10000}\\right)^{10000}', '2^{100000}', '10000!']) {
			expect(isTooLongToCompute(parseLatex(latex))).toBe(true);
		}
	});

	it('une comparaison n’est jamais « trop longue » (elle rend vrai ou faux)', () => {
		expect(isTooLongToCompute(parseLatex('2^{50000} > 3^{30000}'))).toBe(false);
	});
});

describe('la longueur réelle d’un résultat calculé', () => {
	it('celle de l’écriture du résultat', () => {
		expect(exactCharacters(parseLatex('10^{600}\\times10^{-598}'), '100')).toBe(3);
		expect(exactCharacters(parseLatex('\\sqrt{2}^{2000}'), '1'.repeat(302))).toBe(302);
	});

	// Le moteur garde `1000!` tel quel : sa valeur a pourtant 2 568 chiffres
	it('celle de la valeur, quand le moteur garde une factorielle', () => {
		expect(exactCharacters(parseLatex('1000!'), 'factorial(1000)')).toBe(2568);
		expect(
			exactCharacters(parseLatex('\\frac{1000!}{999!}'), 'factorial(1000)/factorial(999)')
		).toBe(30);
	});
});

// Un produit, un quotient de puissances : les exposants d'un même facteur premier se compensent
// avant de compter (`10^{6000}×10^{-5998}` = 100 était prévu à 12 000 caractères et gardé tel
// quel, sans calcul — le dernier faux positif de #1182)
describe('un produit se prévoit après simplification', () => {
	it.each([
		['10^{6000}\\times10^{-5998}', 3],
		['\\frac{10^{6000}}{10^{5998}}', 3],
		['2^{100000}\\times2^{-99990}', 4],
		['\\frac{6^{30000}}{2^{30000}}', 14314],
		['\\frac{2^{40000}\\times3^{20000}}{6^{20000}}', 6022]
	])('%s : environ %i caractères', (latex, expected) => {
		expect(Math.abs(digits(latex) - expected)).toBeLessThan(5);
	});

	it.each(['10^{6000}\\times10^{-5998}', '\\frac{10^{60000}}{10^{59990}}'])(
		'%s n’atteint pas le plafond de calcul',
		(latex) => {
			expect(isTooLongToCompute(parseLatex(latex))).toBe(false);
		}
	);

	it('ce qui ne se simplifie pas reste long', () => {
		expect(isTooLongToCompute(parseLatex('\\frac{10^{30000}}{3}'))).toBe(true);
		expect(isTooLongToCompute(parseLatex('2^{40000}\\times3^{40000}'))).toBe(true);
	});
});
