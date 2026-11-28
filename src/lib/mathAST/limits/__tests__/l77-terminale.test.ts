/**
 * L77 (registre des écarts) : limites de Terminale refusées.
 *
 * - x^{−1} sin x en 0 : l'exposant −1 écrit sur x se lit 1/x (stratégie 7.6) ;
 * - x^{4/2} en −∞ : l'exposant 4/2 est l'entier 2 (stratégie 7.6) ;
 * - x³e^{−x²+x}, x²e^{−√x} en +∞ : croissance comparée, e^u avec u → −∞
 *   comme une puissance de x l'emporte sur toute puissance (stratégie 7.7).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { infinity, number } from '../../factory';
import { toLatex } from '../../latex-generator';

function limitOf(latex: string, at: string): { status: string; value: string | null } {
	const point =
		at === '+∞' ? infinity('positive') : at === '-∞' ? infinity('negative') : number(at);
	const result = evaluateLimit(parseLatex(latex), 'x', point, 'both');
	return { status: result.status, value: result.value === null ? null : toLatex(result.value) };
}

describe('L77 — exposants entiers écrits autrement (stratégie 7.6)', () => {
	it.each([
		['x^{-1}\\sin x', '0', '1'],
		['\\sin(2x)x^{-1}', '0', '2'],
		['x^{\\frac{4}{2}}', '-∞', '+\\infty'],
		['2x^{\\frac{6}{2}}', '-∞', '-\\infty']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(limitOf(latex, at).value).toBe(expected);
	});

	it('une autre base que x reste telle quelle : (sin x / x)^{−1} en +∞, aucune valeur', () => {
		expect(limitOf('(\\frac{\\sin x}{x})^{-1}', '+∞').value).toBeNull();
	});
});

describe('L77 — croissance comparée, e^u avec u → −∞ (stratégie 7.7)', () => {
	it.each([
		['x^3e^{-x^2+x}', '+∞'],
		['2x^3e^{-x^2+x}', '+∞'],
		['x^2e^{-\\sqrt{x}}', '+∞'],
		['5x^2e^{-3\\sqrt{x}}', '+∞']
	])('%s en %s → 0, exact', (latex, at) => {
		expect(limitOf(latex, at)).toEqual({ status: 'exact', value: '0' });
	});
});
