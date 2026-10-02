/**
 * Une exponentielle dans un dénominateur à PLUSIEURS termes :
 * `\frac{1}{(x+1)e^{x}} ≡ \frac{e^{-x}}{x+1}`.
 *
 * La #618 a traité le numérateur somme (`\frac{x+1}{e^{x}}`). Au dénominateur,
 * le produit `(x+1)e^{x}` est développé en `x·exp(x)+exp(x)` : deux termes,
 * que `combineExpAcrossFraction` (dénominateur monôme seulement) ne touchait
 * pas. Mesuré sur `main` à `112827ef4` : les quatre premières paires ci-dessous
 * rendaient faux.
 *
 * Multiplier haut et bas par une exponentielle ne change ni la valeur ni le
 * domaine (une exponentielle ne s'annule jamais) : sur le chemin de la
 * comparaison seul, le dénominateur est ramené à un représentant canonique.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('exponentielle dans un dénominateur somme', () => {
	it.each([
		['\\frac{1}{(x+1)e^{x}}', '\\frac{e^{-x}}{x+1}'],
		['\\frac{x}{(x+1)e^{x}}', '\\frac{xe^{-x}}{x+1}'],
		['\\frac{2}{(x-3)e^{2x}}', '\\frac{2e^{-2x}}{x-3}'],
		['\\frac{1}{e^{x}+1}', '\\frac{e^{-x}}{1+e^{-x}}'],
		['\\frac{e^{x}+2}{e^{x}+1}', '\\frac{1+2e^{-x}}{1+e^{-x}}'],
		['\\frac{1}{e^{2x}+e^{x}}', '\\frac{e^{-x}}{e^{x}+1}'],
		['\\frac{1}{(x+1)\\exp(x)}', '\\frac{\\exp(-x)}{x+1}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});

	it.each([
		['\\frac{1}{(x+1)e^{x}}', '\\frac{e^{x}}{x+1}'],
		['\\frac{1}{e^{x}+1}', '\\frac{e^{x}}{1+e^{x}}'],
		['\\frac{1}{e^{x}+1}', '\\frac{1}{e^{-x}+1}'],
		['\\frac{1}{(x+1)e^{x}}', '\\frac{e^{-x}}{x+2}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});

	it('réduire pour comparer, pas pour écrire (ADR 0006)', () => {
		expect(toLatex(simplify(parseLatex('\\frac{1}{e^{x}+1}')).result)).not.toContain('-x');
	});
});
