/**
 * Un exposant rationnel non entier est une racine : `u^{p/q} = (ⁿ√u)^p`.
 *
 * ## Le trou, mesuré
 *
 * Mesuré sur `main` à `6b773b4c3`, le moteur de questions comptait FAUSSE la
 * réponse `\frac{1}{2}x^{-\frac12}` pour l'attendu `\frac{1}{2\sqrt{x}}`
 * (dérivée de `√x`). Deux causes :
 *
 * - l'exposant n'était lu que sous trois formes (entier, `-entier`,
 *   `\frac{p}{q}`) : `-\frac12`, `0.5` et `-0.5` laissaient la puissance
 *   opaque ;
 * - une base composée (`(4x+1)^{\frac12}`) devenait un nœud opaque, alors que
 *   `\sqrt{4x+1}` devient le facteur `(4x+1)^{1/2}` : les deux ne se
 *   rencontraient jamais.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * La réécriture vit sur le chemin de `equivalenceForm` seul
 * (`rules/fractional-power.ts`) : la puissance passe par le radical, dont la
 * normalisation sait déjà tout, y compris la convention `√(x²) = |x|`.
 * L'affichage de `simplify` ne bouge pas (dernier bloc).
 */
import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('un exposant fractionnaire est une racine', () => {
	it.each([
		['\\sqrt{x}', 'x^{\\frac12}'],
		['\\sqrt{x}', 'x^{0.5}'],
		['x^{\\frac12}', 'x^{0.5}'],
		['\\frac{1}{\\sqrt x}', 'x^{-\\frac12}'],
		['\\frac{1}{\\sqrt x}', 'x^{-0.5}'],
		['\\frac{1}{2\\sqrt x}', '\\frac12 x^{-\\frac12}'],
		['\\frac{1}{2\\sqrt{x}}', '\\frac{1}{2}x^{-\\frac12}'],
		['\\frac{1}{2\\sqrt{x}}', '0.5x^{-0.5}'],
		['x\\sqrt{x}', 'x^{\\frac32}'],
		['\\sqrt[3]{x}', 'x^{\\frac13}'],
		['\\frac{1}{\\sqrt[3]{x}^2}', 'x^{-\\frac23}'],
		['\\frac{3}{2}\\sqrt{x}', '\\frac32 x^{\\frac12}'],
		['\\sqrt{4x+1}', '(4x+1)^{\\frac12}'],
		['\\frac{2}{\\sqrt{4x+1}}', '2(4x+1)^{-\\frac12}'],
		['x^{0.5}x^{0.5}', 'x'],
		['2^{\\frac12}', '\\sqrt{2}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});

	it.each([
		['\\sqrt{x}', 'x^{\\frac13}'],
		['\\frac{1}{\\sqrt x}', 'x^{\\frac12}'],
		['\\frac{1}{2\\sqrt x}', 'x^{-\\frac12}'],
		['\\sqrt{4x+1}', '(4x-1)^{\\frac12}'],
		['x^{0.5}', 'x^{0.25}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});
});

describe('le domaine : une racine de carré reste une valeur absolue', () => {
	it('√(x²) et (x²)^{1/2} valent |x|, jamais x', () => {
		expect(eq('\\sqrt{x^2}', 'x')).toBe(false);
		expect(eq('(x^2)^{\\frac12}', 'x')).toBe(false);
		expect(eq('\\sqrt{x^2}', '|x|')).toBe(true);
		expect(eq('(x^2)^{\\frac12}', '|x|')).toBe(true);
	});

	it('les conventions déjà en place ne bougent pas', () => {
		expect(eq('\\sqrt{x}^2', 'x')).toBe(true);
		expect(eq('\\sqrt{x^4}', 'x^2')).toBe(true);
		expect(eq('\\sqrt{x^6}', 'x^3')).toBe(false);
		expect(eq('(x^6)^{\\frac12}', 'x^3')).toBe(false);
	});

	it('base négative, dénominateur impair : racine impaire (décision du 2026-10-08)', () => {
		expect(eq('(-8)^{\\frac13}', '-2')).toBe(true);
	});

	it('base négative, dénominateur pair : pas réécrite', () => {
		expect(eq('(-8)^{\\frac12}', '2')).toBe(false);
	});
});

describe('l’affichage de simplify ne bouge pas', () => {
	it.each([
		['x^{\\frac12}', '\\sqrt{x}'],
		['x^{-\\frac12}', 'x^{-\\dfrac{1}{2}}'],
		['x^{\\frac32}', 'x \\sqrt{x}']
	])('simplify(%s) rend %s', (input, expected) => {
		expect(toLatex(simplify(parseLatex(input)).result)).toBe(expected);
	});
});
