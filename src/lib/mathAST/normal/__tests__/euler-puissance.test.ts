/**
 * La lettre `e` élevée à une puissance est l'exponentielle.
 *
 * ## L'incohérence, mesurée
 *
 * Le système a **déjà tranché** que `e` désigne le nombre d'Euler :
 * `evaluate(parseLatex('e'))` rend `2.718281828459045`. Seul le chemin
 * symbolique l'ignore. `e^{x}` est parsé en `superscript(variable e, x)`, alors
 * que la machinerie qui combine les exponentielles (`combineExpInMonomial`,
 * `combineExpInPolynomial`, `combineExpAcrossFraction`) ne reconnaît que les
 * nœuds **fonction** `exp`. Elle ne voit donc jamais passer `e^{x}`.
 *
 * Conséquence, mesurée sur `main` à `59c62b499` :
 *
 * | paire                          | verdict   |
 * | ------------------------------ | --------- |
 * | `exp(x)·exp(2x) ≡ exp(3x)`     | `true`    |
 * | `e^x·e^{2x} ≡ e^{3x}`          | **`false`** |
 * | `e^{2x}/e^{x} ≡ e^{x}`         | **`false`** |
 * | `e^{2} ≡ exp(2)`               | **`false`** |
 *
 * Les deux écritures du même objet ne se parlent pas. Ce n'est pas une
 * question de produit : l'évaluateur a déjà décidé.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * L'identification vit sur le chemin du décideur, jamais dans la forme
 * affichée : `simplify(e^{x})` doit continuer à rendre `e^{x}`, et surtout pas
 * `\exp(x)`. C'est la décision d'architecture de la PR #382, et le dernier bloc
 * de ce fichier la vérifie.
 *
 * ## Hors périmètre, et pourquoi
 *
 * Un exposant **symbolique** sur une base quelconque reste opaque :
 * `x^a·x^b ≢ x^{a+b}`, `2^{2x}/2^{x} ≢ 2^{x}`. Ce n'est pas le même trou : un
 * `SymbolicFactor` porte un exposant **rationnel**, si bien qu'une puissance à
 * exposant symbolique ne peut pas être représentée comme un facteur et reste
 * une base opaque. Le réparer demanderait de changer la forme normale, pas d'y
 * ajouter une règle. Deux tests le pinnent tel quel.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('les deux écritures de l’exponentielle se parlent', () => {
	it.each([
		['e^{2}', '\\exp(2)'],
		['e^{x}', '\\exp(x)'],
		['e^{x}e^{2x}', 'e^{3x}'],
		['\\frac{e^{2x}}{e^{x}}', 'e^{x}'],
		['\\frac{e^{3x}}{e^{x}}', 'e^{2x}'],
		['\\frac{e^{x+1}}{e}', 'e^{x}'],
		['e^{x}\\exp(2x)', 'e^{3x}'],
		['(e^{x})^{2}', 'e^{2x}'],
		['\\frac{e^{x}}{e^{x}}', '1'],
		['e^{0}', '1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

/**
 * Un troisième bug, **préexistant** et trouvé en chemin : `exp(1)` normalise
 * vers la constante d'Euler tandis que `exp(2)` reste un nœud fonction, si bien
 * que la machinerie de combinaison ne voit plus qu'un seul des deux côtés.
 *
 * Mesuré sur `main` à `59c62b499`, sans aucune lettre `e` en jeu :
 *
 * | paire                            | verdict   |
 * | -------------------------------- | --------- |
 * | `exp(x+2)/exp(2) ≡ exp(x)`       | `true`    |
 * | `exp(x+1)/exp(1) ≡ exp(x)`       | **`false`** |
 * | `exp(x+1) ≡ exp(x)·exp(1)`       | **`false`** |
 * | `exp(x+1)/exp(x) ≡ exp(1)`       | **`false`** |
 *
 * Seul l'exposant `1` fait la différence. Il bloquait aussi `e^{x+1}/e`, ce qui
 * l'a mis sur le chemin de ce correctif.
 */
describe('l’exposant 1 ne doit pas sortir l’exponentielle de la machinerie', () => {
	it.each([
		['\\frac{\\exp(x+1)}{\\exp(1)}', '\\exp(x)'],
		['\\exp(x+1)', '\\exp(x)\\exp(1)'],
		['\\frac{\\exp(x+1)}{\\exp(x)}', '\\exp(1)'],
		['\\frac{\\exp(x+2)}{\\exp(2)}', '\\exp(x)']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['e^{x}', 'e^{2x}'],
		['e^{x}e^{2x}', 'e^{2x}'],
		['\\frac{e^{2x}}{e^{x}}', 'e^{2x}'],
		['e^{x}', 'x'],
		['e^{x+y}', 'e^{x}+e^{y}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('hors périmètre : un exposant symbolique sur une base quelconque', () => {
	it('reste opaque, et c’est assumé', () => {
		expect(eq('x^{a}x^{b}', 'x^{a+b}')).toBe(false);
		expect(eq('\\frac{2^{2x}}{2^{x}}', '2^{x}')).toBe(false);
	});

	it('mais reste réflexif', () => {
		for (const s of ['x^{a}x^{b}', '\\frac{2^{2x}}{2^{x}}']) {
			expect(eq(s, s)).toBe(true);
		}
	});
});

describe('réduire pour comparer, pas pour écrire', () => {
	it('l’affichage garde la notation de l’élève', () => {
		expect(toLatex(simplify(parseLatex('e^{x}')).result)).toBe('e^x');
		expect(toLatex(simplify(parseLatex('\\exp(x)')).result)).toContain('exp');
	});
});
