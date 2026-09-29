/**
 * `areEquivalent(latex, latex, { assumptions })` : l'entrée publique des
 * hypothèses de l'énoncé (ADR 0012), que le lot 2 (modèles de questions)
 * consommera.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '$lib/math';

describe('areEquivalent avec hypothèses de l’énoncé', () => {
	it('x > 0 : x^a·x^b ≡ x^{a+b}, seulement déclaré', () => {
		expect(areEquivalent('x^{a}x^{b}', 'x^{a+b}')).toBe(false);
		expect(areEquivalent('x^{a}x^{b}', 'x^{a+b}', { assumptions: { x: 'positive' } })).toBe(true);
	});

	it('n entier : (−2)^{2n} ≡ 4^n, seulement déclaré', () => {
		expect(areEquivalent('(-2)^{2n}', '4^n')).toBe(false);
		expect(areEquivalent('(-2)^{2n}', '4^n', { assumptions: { n: 'integer' } })).toBe(true);
	});

	it('cohabite avec le budget de temps', () => {
		expect(
			areEquivalent('\\left|x\\right|', 'x', { timeoutMs: 500, assumptions: { x: 'nonnegative' } })
		).toBe(true);
	});
});
