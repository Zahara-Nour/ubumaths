/**
 * Limite d'une racine n-ième : l'INDICE compte (2026-10-06)
 *
 * La composition traitait `\sqrt[3]{g}` comme `\sqrt{g}` : lim ∛(x+8) en 0
 * valait « 2√2 » (= √8), lim 1/∛x en 0⁻ valait +∞. La racine d'indice impair
 * est définie sur ℝ et garde le signe ; d'indice pair, elle se comporte comme √.
 *
 * Chaque cas asserte la VALEUR rendue.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { LimitDirection } from '../types';

function limit(input: string, at: string, dir: LimitDirection = 'both'): string {
	const result = evaluateLimit(parseLatex(input), 'x', parseLatex(at), dir);
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return result.value.sign === 'positive' ? '+inf' : '-inf';
	}
	return toLatex(result.value);
}

describe('limite d’une racine n-ième', () => {
	it.each([
		['\\sqrt[3]{x+8}', '0', 'both', '2'],
		['\\sqrt[4]{x+16}', '0', 'both', '2'],
		['\\sqrt[3]{x}', '-\\infty', 'both', '-inf'],
		['\\sqrt[3]{x}', '+\\infty', 'both', '+inf'],
		['\\frac{1}{\\sqrt[3]{x}}', '0', 'right', '+inf'],
		['\\frac{1}{\\sqrt[3]{x}}', '0', 'left', '-inf'],
		['\\sqrt{x+8}', '1', 'both', '3']
	] as const)('lim %s en %s (%s) = %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir)).toBe(expected);
	});

	it('lim ∛x en −8 vaut −2 (la normalisation laisse ∛(−8) non réduit : forme, pas valeur)', () => {
		expect(limit('\\sqrt[3]{x}', '-8')).toMatch(/^(-2|\\sqrt\[3\]\{-8\})$/);
	});

	it('lim ∛(x+9) en 0 vaut ∛9 (et non √9 = 3)', () => {
		const value = limit('\\sqrt[3]{x+9}', '0');
		expect(value).not.toBe('3');
		expect(value).toMatch(/\\sqrt\[3\]\{9\}/);
	});
});
