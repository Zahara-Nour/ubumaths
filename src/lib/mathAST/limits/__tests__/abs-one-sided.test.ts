/**
 * Valeur absolue levée côté par côté : |f| est remplacé par ±f selon le signe
 * à gauche ou à droite, puis la limite de l'expression SANS valeur absolue est
 * calculée par le moteur. Avant : l'expression était évaluée en a ± 10⁻⁸ et le
 * nombre obtenu, s'il était entier, rendu « exact » — |x|/x² en 0 valait
 * « exact 100000000 » au lieu de +∞.
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
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

describe('valeur absolue : limite de l’expression simplifiée, pas une évaluation en a ± 10⁻⁸', () => {
	it.each([
		['\\frac{|x|}{x^2}', '0', 'left', 'infinite +inf'],
		['\\frac{|x|}{x^2}', '0', 'right', 'infinite +inf'],
		['\\frac{|x|}{x^2}', '0', 'both', 'infinite +inf'],
		['\\frac{|x-1|}{(x-1)^2}', '1', 'both', 'infinite +inf'],
		['\\frac{-|x|}{x^2}', '0', 'both', 'infinite -inf'],
		['\\frac{|x|}{x^3}', '0', 'both', 'does-not-exist null'],
		['\\frac{|x|}{x}', '0', 'left', 'exact -1'],
		['\\frac{|x|}{x}', '0', 'right', 'exact 1'],
		['\\frac{|x|}{x}', '0', 'both', 'does-not-exist null'],
		['\\frac{x^2}{|x|}', '0', 'both', 'exact 0']
	])('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir as LimitDirection)).toBe(expected);
	});
});
