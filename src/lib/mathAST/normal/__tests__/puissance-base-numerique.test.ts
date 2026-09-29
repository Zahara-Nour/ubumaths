/**
 * Exposant symbolique sur une base numérique strictement positive.
 *
 * Mesuré sur `main` à `ae617c192` : toutes les paires du premier bloc rendaient
 * `false` (réponses justes refusées), faute de pouvoir représenter `2^{x}` comme
 * un facteur de la forme normale. `equivalenceForm` réécrit désormais `a^u` en
 * `exp(u·ln a)` quand `a` est un rationnel strictement positif et `u` n'est pas
 * rationnel (`rules/general-power.ts`).
 *
 * Un faux positif compte juste une réponse fausse : le deuxième bloc est la
 * moitié importante de ce fichier.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('une base numérique positive suit les lois des exposants', () => {
	it.each([
		['\\frac{2^{2x}}{2^{x}}', '2^{x}'],
		['4^{x}', '2^{2x}'],
		['8^{x}', '2^{3x}'],
		['4^{x}', '2^{x}\\cdot 2^{x}'],
		['2^{x}\\cdot 3^{x}', '6^{x}'],
		['10^{x}', '2^{x}\\cdot 5^{x}'],
		['2^{x+1}', '2\\cdot 2^{x}'],
		['2^{x}+2^{x}', '2^{x+1}'],
		['\\frac{1}{2^{x}}', '2^{-x}'],
		['2^{-x}', '\\left(\\frac{1}{2}\\right)^{x}'],
		['\\left(\\frac{1}{2}\\right)^{x}', '0.5^{x}'],
		['(2^{x}+3)^{2}', '4^{x}+6\\cdot 2^{x}+9'],
		['1^{x}', '1'],
		['2^{n+1}', '2\\cdot 2^{n}'],
		['3\\cdot 2^{n}', '6\\cdot 2^{n-1}'],
		['5\\times 3^{n-1}', '\\frac{5}{3}\\times 3^{n}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['2^{x}', '3^{x}'],
		['2^{x}', '2^{x+1}'],
		['2^{x}+3^{x}', '5^{x}'],
		['2^{x}\\cdot 3^{y}', '6^{x}'],
		['2^{x}\\cdot 2^{y}', '2^{xy}'],
		['\\left(\\frac{1}{2}\\right)^{x}', '2^{x}'],
		['2^{x^{2}}', '4^{x}'],
		['2^{x}', 'x^{2}'],
		['3\\cdot 2^{n}', '6\\cdot 2^{n+1}'],
		// Base négative : pas d'écriture exponentielle réelle, rien ne bouge.
		['(-2)^{n}', '2^{n}'],
		['(-2)^{2n}', '4^{n}'],
		// Base variable : réécrire supposerait x > 0, décidé NON.
		['x^{a}x^{b}', 'x^{a+b}'],
		['|x|^{n}', 'x^{n}'],
		['(x^{2})^{n}', 'x^{2n}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('ce qui marchait continue de marcher', () => {
	it.each([
		['(2^{x}+1)^{3}', '(2^{x}+1)(2^{x}+1)^{2}'],
		['e^{x}', '\\exp(x)'],
		['e^{x}e^{2x}', 'e^{3x}'],
		['2^{3}', '8'],
		['4^{\\frac{1}{2}}', '2'],
		['\\sqrt{2}^{2}', '2'],
		['2^{-1}', '\\frac{1}{2}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('réduire pour comparer, pas pour écrire (ADR 0006)', () => {
	it('l’affichage garde la puissance de l’élève', () => {
		expect(toLatex(simplify(parseLatex('2^{x}')).result)).toBe('2^x');
		expect(toLatex(simplify(parseLatex('2^{x+1}')).result)).not.toContain('exp');
		expect(toLatex(simplify(parseLatex('3\\cdot 2^{n}')).result)).not.toContain('ln');
	});
});
