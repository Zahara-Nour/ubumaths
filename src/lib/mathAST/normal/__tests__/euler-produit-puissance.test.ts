/**
 * La lettre `e` facteur d'un produit, et `(e^{a})^{n}` à exposant symbolique.
 *
 * Mesuré avant correctif (faux négatifs) : `e\times e ≢ e^{2}` alors que
 * `e^{2}\times e^{3} ≡ e^{5}` ; `(e^{2})^{n} ≢ e^{2n}` alors que
 * `(e^{x})^{2} ≡ e^{2x}`.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('produits et puissances du nombre e', () => {
	it.each([
		['e^{2}\\times e^{3}', 'e^{5}'],
		['(e^{x})^{2}', 'e^{2x}'],
		['e\\times e', 'e^{2}'],
		['(e^{2})^{n}', 'e^{2n}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});

	it.each([
		['e\\times e', 'e^{3}'],
		['(e^{2})^{n}', 'e^{n+2}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});
});
