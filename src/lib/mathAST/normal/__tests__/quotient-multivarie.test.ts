/**
 * Réduire un quotient par un facteur commun **polynomial**, à plusieurs
 * variables.
 *
 * ## Le symptôme : le moteur se contredit lui-même
 *
 * `simplify` rend la bonne réponse, et `areEquivalent` déclare l'entrée non
 * équivalente à cette réponse. Mesuré sur `main` avant ce correctif, 4 cas
 * sur 6 :
 *
 * | entrée                | `simplify` rend | `areEquivalent(entrée, ça)` |
 * | --------------------- | --------------- | --------------------------- |
 * | `(x²−y²)/(x−y)`       | `x + y`         | **`false`**                 |
 * | `(x+y)²/(x+y)`        | `x + y`         | **`false`**                 |
 * | `(x+y)(x−y)/(x+y)`    | `x − y`         | **`false`**                 |
 * | `(a+b+c)²/(a+b+c)`    | `a + b + c`     | **`false`**                 |
 * | `(x²−1)/(x+1)`        | `x − 1`         | `true`                      |
 * | `2ab/a`               | `2b`            | `true`                      |
 *
 * ## La cause
 *
 * `tryUnivariateGcd` ne traite qu'**une seule** variable. Son repli,
 * `gcdPolynomials`, n'extrait qu'un facteur **monôme** commun. Un facteur
 * commun qui est un polynôme à plusieurs variables, comme `x+y`, n'est donc vu
 * par personne, et le quotient reste tel quel.
 *
 * ## La décision de produit (David, 2026-09-20)
 *
 * Un élève qui simplifie `(x²−y²)/(x−y)` en `x+y` est **compté juste**. Les
 * deux écritures ne coïncident pourtant pas en `x = y`, où la première n'est
 * pas définie. C'est le choix déjà fait à une variable — `(x²−1)/(x+1) ≡ x−1`
 * rend `true` depuis toujours — et il s'applique maintenant pareil au-delà.
 *
 * ## L'invariant visé
 *
 * `areEquivalent(e, simplify(e).result)` doit **toujours** valoir `true`. Un
 * moteur qui refuse sa propre sortie n'a pas de sens, et c'est ce que le
 * dernier bloc de ce fichier vérifie.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

// =============================================================================
// Cas nominal : le facteur commun est un polynôme à plusieurs variables
// =============================================================================

describe('un facteur commun polynomial se simplifie, à plusieurs variables', () => {
	it.each([
		['\\frac{(x+y)^2}{x+y}', 'x+y'],
		['\\frac{x^2-y^2}{x-y}', 'x+y'],
		['\\frac{x^2-y^2}{x+y}', 'x-y'],
		['\\frac{(x+y)(x-y)}{x+y}', 'x-y'],
		['\\frac{(a+b+c)^2}{a+b+c}', 'a+b+c'],
		['\\frac{2x+2y}{x+y}', '2'],
		['\\frac{x^3-y^3}{x-y}', 'x^2+xy+y^2'],
		['\\frac{(x+y)^3}{(x+y)^2}', 'x+y'],
		['\\frac{x+y}{(x+y)^2}', '\\frac{1}{x+y}'],
		['\\frac{a^2-b^2}{(a-b)(a+b)}', '1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('trois variables aussi : (a+b+c)³/(a+b+c)² ≡ a+b+c', () => {
		expect(eq('\\frac{(a+b+c)^3}{(a+b+c)^2}', 'a+b+c')).toBe(true);
	});
});

// =============================================================================
// Le risque majeur : aucun faux positif
// =============================================================================

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['\\frac{(x+y)^2}{x+y}', 'x-y'],
		['\\frac{x^2-y^2}{x-y}', 'x-y'],
		['\\frac{x^2+y^2}{x+y}', 'x-y'],
		['\\frac{x^2+y^2}{x+y}', 'x+y'],
		['\\frac{(x+y)(x-y)}{x+z}', 'x-y'],
		['\\frac{x^3+y^3}{x-y}', 'x^2+xy+y^2'],
		['\\frac{2x+2y}{x+y}', '3'],
		['\\frac{(x+y)^2}{(x+y)^3}', 'x+y']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('un dénominateur qui ne divise pas laisse le quotient intact', () => {
		// x+2y ne divise pas (x+y)², et (x+y)² ne divise pas x+2y.
		expect(eq('\\frac{(x+y)^2}{x+2y}', 'x+y')).toBe(false);
		expect(eq('\\frac{(x+y)^2}{x+2y}', '\\frac{(x+y)^2}{x+2y}')).toBe(true);
	});
});

// =============================================================================
// Non-régression : ce qui marchait doit continuer
// =============================================================================

describe('non-régression', () => {
	it.each([
		['\\frac{x^2-1}{x+1}', 'x-1'],
		['\\frac{x^2-1}{x-1}', 'x+1'],
		['\\frac{2ab}{a}', '2b'],
		['\\frac{x^2y}{xy}', 'x'],
		['\\frac{2x+2}{2}', 'x+1'],
		['\\frac{(x+1)(x+2)}{x+1}', 'x+2'],
		['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'],
		['\\frac{x^2-1}{x+1}', 'x-1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['\\frac{x^2-1}{x+1}', 'x+1'],
		['\\frac{2ab}{a}', '2a'],
		['\\frac{x}{y}', '\\frac{y}{x}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

// =============================================================================
// L'invariant : le moteur ne refuse plus sa propre sortie
// =============================================================================

describe('areEquivalent(e, simplify(e)) vaut toujours true', () => {
	it.each([
		'\\frac{(x+y)^2}{x+y}',
		'\\frac{x^2-y^2}{x-y}',
		'\\frac{(x+y)(x-y)}{x+y}',
		'\\frac{(a+b+c)^2}{a+b+c}',
		'\\frac{x^2-1}{x-1}',
		'\\frac{2ab}{a}',
		'\\frac{(x+y)^2}{x+2y}',
		'\\frac{x^2+y^2}{x+y}',
		'(x+y)^3',
		'\\frac{1}{\\sqrt{2}}'
	])('%s', (entree) => {
		const node = parseLatex(entree);
		const resultat = simplify(node).result;
		expect(areEquivalent(node, resultat)).toBe(true);
	});
});
