/**
 * `ⁿ√(u^k)` vaut `u^{k/n}` : une racine d'indice supérieur ne reste plus opaque
 * dès que son radicande n'est pas une variable seule.
 *
 * ## Le trou, mesuré sur `main` à `7a5174b68`
 *
 * La normalisation d'un radical d'indice `n ≠ 2` ne sait lire qu'un entier, une
 * variable ou un symbole : tout autre radicande rend le nœud opaque. Or la
 * règle `rules/fractional-power.ts` (#638) écrit `x^{\frac23}` en `(∛x)²`, qui
 * devient le facteur `x^{2/3}`, pendant que `∛(x²)` restait un bloc. Les deux
 * écritures ne se rencontraient jamais :
 *
 * | paire | verdict avant |
 * | --- | --- |
 * | `∛(x²) ≡ x^{2/3}` | faux |
 * | `⁴√(x³) ≡ x^{3/4}` | faux |
 * | `∛(8x³) ≡ 2x` | faux |
 * | `∛((x+1)²) ≡ (x+1)^{2/3}` | faux |
 * | `1/∛(x²) ≡ x^{-2/3}` | faux |
 *
 * ## La convention des racines paires est conservée
 *
 * `√(x²) = |x|` : de même `⁴√(x⁴) = |x|`, pas `x`. Un exposant pair sous une
 * racine paire rend sa base positive, et la valeur absolue reste tant que
 * l'exposant réduit est impair.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('une racine n-ième d’une puissance vaut une puissance fractionnaire', () => {
	it.each([
		['\\sqrt[3]{x^2}', 'x^{\\frac23}'],
		['\\sqrt[3]{x}^2', 'x^{\\frac23}'],
		['\\sqrt[4]{x^3}', 'x^{\\frac34}'],
		['\\sqrt[3]{8x^3}', '2x'],
		['\\sqrt[3]{(x+1)^2}', '(x+1)^{\\frac23}'],
		['\\frac{1}{\\sqrt[3]{x^2}}', 'x^{-\\frac23}'],
		['\\sqrt[3]{x^3}', 'x'],
		['\\sqrt[3]{x^6}', 'x^2'],
		['\\sqrt[3]{x^2}', '\\sqrt[3]{x}\\sqrt[3]{x}'],
		['\\sqrt[3]{x^2y^3}', 'y\\sqrt[3]{x^2}'],
		['\\sqrt[4]{x^4}', '|x|'],
		['\\sqrt[4]{x^8}', 'x^2'],
		['\\sqrt[4]{x^2}', '\\sqrt{|x|}'],
		['\\sqrt[6]{x^4}', 'x^{\\frac23}'],
		['\\sqrt[3]{16x^4}', '2x\\sqrt[3]{2x}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('aucun faux positif', () => {
	it.each([
		['\\sqrt[3]{x^2}', 'x^{\\frac32}'],
		['\\sqrt[4]{x^4}', 'x'],
		['\\sqrt[4]{x^2}', '\\sqrt{x}'],
		['\\sqrt[6]{x^2}', 'x^{\\frac13}'],
		['\\sqrt[3]{x^2}', 'x'],
		['\\sqrt[3]{8x^3}', '8x'],
		['\\sqrt[3]{(x+1)^2}', 'x+1'],
		['\\sqrt[3]{-8x^3}', '2x'],
		['\\sqrt[4]{x^2y^2}', '\\sqrt{xy}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});
