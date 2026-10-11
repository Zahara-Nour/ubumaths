/**
 * `tidyTerms()` — une dérivée mise au propre terme à terme, l'ordre gardé.
 *
 * Défaut mesuré (2026-10-06) : chaque terme était mis au propre ISOLÉMENT ; un
 * terme négatif restait donc un opposé sous une addition :
 * `cos x + (−sin x)`, `e^{−2x} + (−2x e^{−2x})`. La règle est celle de
 * `buildSum` dans `tidy` : un terme négatif s'écrit en soustrayant sa valeur
 * absolue.
 */

import { describe, it, expect } from 'vitest';
import { tidyTerms } from '../terms';
import { differentiate } from '../../differentiation';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { MathNode } from '../../types';

function derivativeLatex(latex: string): string {
	const node = parseLatex(latex) as MathNode;
	return toLatex(tidyTerms(differentiate(node, { variable: 'x', simplify: true })));
}

describe('tidyTerms : un terme négatif devient une soustraction', () => {
	it.each([
		['\\sin(x) + \\cos(x)', '\\cos\\left( x \\right) - \\sin\\left( x \\right)'],
		['x e^{-2x}', '\\exponentialE^{-2 x} - 2 x \\exponentialE^{-2 x}'],
		// a − (−b) : la soustraction d'un négatif devient une addition
		['x - \\cos(x)', '1 + \\sin\\left( x \\right)']
	])('(%s)′ = %s', (input, expected) => {
		expect(derivativeLatex(input)).toBe(expected);
	});
});

describe('tidyTerms : témoins inchangés', () => {
	it.each([
		// L'ordre de la règle du produit (u′v + uv′) est gardé
		['x\\sin(x)', '\\sin\\left( x \\right) + x \\cos\\left( x \\right)'],
		['x^2 e^x', '2 x \\exponentialE^x + x^2 \\exponentialE^x'],
		['x^2', '2 x'],
		['3x^2 - x + 1', '6 x - 1'],
		// Degré 1 : le négatif passe derrière (décision du 2026-10-06)
		['-3x^2 + 2x', '2 - 6 x'],
		['2e^{-x}', '-2 \\exponentialE^{-x}'],
		['e^{3x}', '3 \\exponentialE^{3 x}'],
		['\\frac{x}{x+1}', '\\dfrac{1}{\\left( x + 1 \\right)^2}']
	])('(%s)′ = %s', (input, expected) => {
		expect(derivativeLatex(input)).toBe(expected);
	});
});
