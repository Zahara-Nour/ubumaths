/**
 * Un polynôme divisé par une exponentielle : `\frac{P}{e^{u}} ≡ P·e^{-u}`.
 *
 * `combineExpAcrossFraction` ne déplaçait les exponentielles du dénominateur
 * vers le numérateur que si le numérateur était un seul terme. Dès que le
 * facteur devant l'exponentielle est une somme, la forme normale gardait la
 * fraction `(x+1)/exp(x)` d'un côté et le polynôme `x·exp(-x)+exp(-x)` de
 * l'autre : une réponse juste était comptée fausse.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('polynôme × exponentielle ≡ polynôme / exponentielle', () => {
	it.each([
		['e^{-x}', '\\frac{1}{e^{x}}'],
		['2e^{-x}', '\\frac{2}{e^{x}}'],
		['xe^{-x}', '\\frac{x}{e^{x}}'],
		['(x+1)e^{-x}', '\\frac{x+1}{e^{x}}'],
		['(-2x-1)e^{-x}', '\\frac{-2x-1}{e^{x}}'],
		['(x+1)e^{-2x}', '\\frac{x+1}{e^{2x}}'],
		['(x+1)\\exp(-x)', '\\frac{x+1}{\\exp(x)}'],
		['(x+1)e^{x}', '\\frac{x+1}{e^{-x}}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});

	it.each([
		['(x+1)e^{-x}', '\\frac{x+1}{e^{-x}}'],
		['(x+1)e^{-x}', '\\frac{x+2}{e^{x}}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});
});
