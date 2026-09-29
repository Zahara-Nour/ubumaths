/**
 * Combiner les exponentielles d'un monôme peut le rendre SEMBLABLE à un autre.
 *
 * `combineExpInPolynomial` réécrit `exp(x)^2` en `exp(2x)` monôme par monôme,
 * après que `mulPolynomials` a déjà regroupé les termes semblables. Deux
 * monômes différents AVANT la combinaison (`exp(x)^2` et `exp(2x)`) deviennent
 * identiques APRÈS, mais restaient deux termes distincts : la forme normale
 * n'était plus canonique.
 *
 * Mesuré sur `main` à `ae617c192` (faux négatifs : réponses justes refusées) :
 *
 * | paire                                             | verdict     |
 * | ------------------------------------------------- | ----------- |
 * | `e^x(e^x+1) ≡ e^{2x}+e^x`                         | **`false`** |
 * | `(e^x+1)^2 ≡ e^{2x}+2e^x+1`                       | **`false`** |
 * | `(e^x+e^{2x})^3 ≡ (e^x+e^{2x})(e^x+e^{2x})^2`     | **`false`** |
 * | `(e^x+e^y+e^z)^4 ≡ (e^x+e^y+e^z)^2(e^x+e^y+e^z)^2` | **`false`** |
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('les exponentielles combinées se regroupent en termes semblables', () => {
	it.each([
		['e^{x}(e^{x}+1)', 'e^{2x}+e^{x}'],
		['(e^{x}+1)^{2}', 'e^{2x}+2e^{x}+1'],
		['\\exp(x)(\\exp(x)+1)', '\\exp(2x)+\\exp(x)'],
		['(e^{x}+e^{2x})^{3}', '(e^{x}+e^{2x})(e^{x}+e^{2x})^{2}'],
		['(e^{x}+e^{y}+e^{z})^{4}', '(e^{x}+e^{y}+e^{z})^{2}(e^{x}+e^{y}+e^{z})^{2}'],
		['(e^{x}-1)(e^{x}+1)', 'e^{2x}-1'],
		['e^{x}(e^{x}-e^{-x})', 'e^{2x}-1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['(e^{x}+1)^{2}', 'e^{2x}+e^{x}+1'],
		['e^{x}(e^{x}+1)', 'e^{2x}+1'],
		['(e^{x}-1)(e^{x}+1)', 'e^{2x}+1']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});
