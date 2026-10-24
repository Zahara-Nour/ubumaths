/**
 * La valeur exacte à afficher (lot 5c du chantier simplify-carte, § 13 A,
 * § 57-58 du journal) : une seule écriture pour l'Atelier, `{{eval}}`, le
 * tableau de variations, le grapheur, les limites et les solutions.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { evaluate } from '../evaluate';
import { exactValueToShow } from '../exact-value';

/** L'écriture affichée d'une valeur tapée : calculée par `evaluate`, la saisie en source. */
function shown(latex: string, keepScientific = false): string {
	const source = parseLatex(latex);
	const result = evaluate(source, { mode: 'exact' });
	if (result.status !== 'value') throw new Error(`non calculable : ${latex}`);
	return toLatex(exactValueToShow(result.node, { source, keepScientific }));
}

/** L'écriture affichée d'une valeur déjà calculée, sans source (limite, solution). */
function shownAlone(latex: string, options?: { decimal?: boolean }): string {
	return toLatex(exactValueToShow(parseLatex(latex), options));
}

describe('le registre décimal de la saisie est gardé (S1)', () => {
	it('écrit 0,1 + 0,2 en décimal', () => {
		expect(shown('0.1+0.2')).toBe('0.3');
	});

	it('retire le zéro final', () => {
		expect(shown('2.50')).toBe('2.5');
	});

	it('écrit une fraction quand le résultat n’a pas d’écriture décimale finie', () => {
		expect(shown('\\frac{1}{3}+0.5')).toBe('\\dfrac{5}{6}');
	});

	// Q22 : un irrationnel n'a pas d'écriture décimale finie
	it('écrit 0,5√2 comme √2/2', () => {
		expect(shown('0.5\\sqrt{2}')).toBe('\\dfrac{\\sqrt{2}}{2}');
	});

	it('garde le registre déclaré sans source (équation à décimaux)', () => {
		expect(shownAlone('\\frac{3}{10}', { decimal: true })).toBe('0.3');
		expect(shownAlone('-\\frac{8}{5}', { decimal: true })).toBe('-1.6');
	});

	it('ne passe pas en décimal sans saisie décimale', () => {
		expect(shown('\\frac{1}{4}+\\frac{1}{2}')).toBe('\\dfrac{3}{4}');
	});
});

describe('les valeurs remarquables sont calculées partout', () => {
	it('calcule cos(π/6) dans une somme', () => {
		expect(shown('\\frac{\\pi}{12}+\\cos(\\frac{\\pi}{6})')).toBe(
			'\\dfrac{\\pi}{12} + \\dfrac{\\sqrt{3}}{2}'
		);
	});

	it('garde un angle quelconque, écrit comme au tableau', () => {
		expect(shown('\\sin(\\frac{\\pi}{5})')).toBe('\\sin\\left( \\dfrac{\\pi}{5} \\right)');
	});

	it('laisse ln 2 + ln 3 (une identité, S4)', () => {
		expect(shown('\\ln2+\\ln3')).toBe('\\ln\\left( 2 \\right) + \\ln\\left( 3 \\right)');
	});
});

describe('écrit comme au tableau', () => {
	it.each([
		['\\frac{1}{3}+\\frac{1}{6}', '\\dfrac{1}{2}'],
		['\\sqrt{8}', '2 \\sqrt{2}'],
		['\\sqrt{\\frac{21}{25}}', '\\dfrac{\\sqrt{21}}{5}'],
		['\\frac{5\\pi}{6}', '\\dfrac{5 \\pi}{6}'],
		['e^{\\ln 2}', '2'],
		['\\frac{\\ln8}{\\ln2}', '3'],
		['2^{10}', '1024']
	])('%s → %s', (input, expected) => {
		expect(shown(input)).toBe(expected);
	});

	// Q11 : pas de − en tête d'une somme
	it('écrit √2 − 1, pas −1 + √2', () => {
		expect(shownAlone('-1+\\sqrt{2}')).toBe('\\sqrt{2} - 1');
	});

	it('place le signe devant la fraction', () => {
		expect(shownAlone('\\frac{-1}{2e}')).toBe('-\\dfrac{1}{2 \\exponentialE}');
	});

	it('écrit un multiple de √2 sur son dénominateur', () => {
		expect(shownAlone('-\\frac{1}{2}\\sqrt{2}')).toBe('-\\dfrac{\\sqrt{2}}{2}');
	});
});

// Q23 : une seule fraction quand les termes ont le même dénominateur
describe('une seule fraction sur un dénominateur commun', () => {
	it('écrit (1 + √5)/2', () => {
		expect(shown('\\frac{1+\\sqrt{5}}{2}')).toBe('\\dfrac{1 + \\sqrt{5}}{2}');
		expect(shownAlone('\\frac{1}{2}+\\frac{1}{2}\\sqrt{5}')).toBe('\\dfrac{1 + \\sqrt{5}}{2}');
	});

	it('écrit (1 − √5)/2', () => {
		expect(shownAlone('\\frac{1}{2}-\\frac{1}{2}\\sqrt{5}')).toBe('\\dfrac{1 - \\sqrt{5}}{2}');
	});

	it('garde des dénominateurs différents', () => {
		expect(shownAlone('\\frac{\\pi}{12}+\\frac{\\sqrt{3}}{2}')).toBe(
			'\\dfrac{\\pi}{12} + \\dfrac{\\sqrt{3}}{2}'
		);
	});

	it('garde une somme dont un terme n’est pas une fraction', () => {
		expect(shownAlone('1+\\frac{\\sqrt{5}}{2}')).toBe('1 + \\dfrac{\\sqrt{5}}{2}');
	});
});

// Q24 : la notation scientifique tapée est un registre
describe('notation scientifique', () => {
	it('garde 3 × 10²⁰ tapé', () => {
		expect(shown('3\\times10^{20}', true)).toBe('3 \\times 10^{20}');
	});

	it('garde 2,5 × 10⁻³ tapé', () => {
		expect(shown('2.5\\times10^{-3}', true)).toBe('2.5 \\times 10^{-3}');
	});

	it('calcule un produit qui n’est pas une notation scientifique', () => {
		expect(shown('12\\times10^{2}', true)).toBe('1200');
	});
});

describe('valeurs déjà écrites', () => {
	it('garde un nombre seul tel quel (valeur approchée du mode décimal)', () => {
		expect(shownAlone('5.0990')).toBe('5.0990');
	});
});

describe('le registre décimal suit la règle S1 de tidy', () => {
	it('écrit une fraction quand un opérande est une fraction', () => {
		expect(shown('\\frac{1}{4}+0.5')).toBe('\\dfrac{3}{4}');
	});

	it('lit une division comme une fraction', () => {
		expect(shown('\\frac{1.5}{3}')).toBe('\\dfrac{1}{2}');
	});

	it('écrit en décimal ce que tidy ne calcule pas', () => {
		expect(shown('\\max(2.5,1)')).toBe('2.5');
	});
});

// Revue de la PR #1663
describe('ce que la revue a relevé', () => {
	it('calcule sans garder la notation scientifique hors de l’Atelier ({{eval}})', () => {
		expect(shown('7\\times10^{-3}')).toBe('\\dfrac{7}{1000}');
	});

	it('ne garde pas 3 × 10⁰', () => {
		expect(shown('3\\times10^{0}', true)).toBe('3');
	});

	it('rend le dénominateur rationnel : 1/(√3 − 1) → (1 + √3)/2', () => {
		expect(shown('\\frac{1}{\\sqrt{3}-1}')).toBe('\\dfrac{1 + \\sqrt{3}}{2}');
		expect(shown('\\frac{1}{1+\\sqrt{2}}')).toBe('\\sqrt{2} - 1');
	});
});

// Décision de David (2026-10-24, « B ») : le logarithme d'une puissance d'un seul
// entier s'écrit n ln p ; sinon il reste tel quel (aucune décomposition en
// facteurs premiers)
describe('logarithme d’un nombre', () => {
	it.each([
		['\\ln 8', '3 \\ln\\left( 2 \\right)'],
		['\\ln 1000', '3 \\ln\\left( 10 \\right)'],
		['\\ln\\left(\\frac{1}{2}\\right)', '-\\ln\\left( 2 \\right)'],
		['\\ln\\left(\\frac{1}{8}\\right)', '-3 \\ln\\left( 2 \\right)'],
		['\\ln 4+\\ln 2', '3 \\ln\\left( 2 \\right)'],
		['\\ln 6', '\\ln\\left( 6 \\right)'],
		['\\ln 12', '\\ln\\left( 12 \\right)'],
		['\\ln2+\\ln3', '\\ln\\left( 2 \\right) + \\ln\\left( 3 \\right)']
	])('%s → %s', (input, expected) => {
		expect(shown(input)).toBe(expected);
	});

	// « b » (David, 2026-10-24) : un quotient de deux logarithmes — la borne d'un
	// seuil — garde l'écriture de l'énoncé
	it('garde un quotient de deux logarithmes tel qu’écrit', () => {
		expect(shown('\\frac{\\ln 1000}{\\ln 2}')).toBe(
			'\\dfrac{\\ln\\left( 1000 \\right)}{\\ln\\left( 2 \\right)}'
		);
		expect(shown('\\frac{\\ln\\left(\\frac{1}{10}\\right)}{\\ln\\left(\\frac{1}{2}\\right)}')).toBe(
			'\\dfrac{\\ln\\left( \\dfrac{1}{10} \\right)}{\\ln\\left( \\dfrac{1}{2} \\right)}'
		);
	});
});

it('laisse le logarithme d’un très grand entier tel quel, sans lever', () => {
	expect(shown('\\ln\\left(2^{80}\\right)')).toContain('\\ln');
});
