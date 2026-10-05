/**
 * `.diff` écrit sa dérivée au propre.
 *
 * Défaut mesuré (2026-10-06) : la dérivée BRUTE du moteur s'affichait telle
 * quelle — `e^{3 x} 3`, `2 \left( -e^{-x} \right)`, `3 2 x - 1`,
 * `\cos(x) + \left( -\sin(x) \right)`. La mise au propre est celle de
 * l'atelier (`tidyTerms`) : `tidy` terme à terme, l'ordre de la règle gardé.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';

function diff(input: string): string {
	const result = new WebReplEngine().execute(`.diff ${input}`);
	expect(result.success).toBe(true);
	return result.output;
}

describe('.diff : la dérivée est rangée', () => {
	it.each([
		['x e^{-2x}', 'd/dx(xe^{-2x}) = e^{-2x}-2xe^{-2x}\nLaTeX: e^{-2 x} - 2 x e^{-2 x}'],
		['2e^{-x}', 'd/dx(2e^{-x}) = -2e^{-x}\nLaTeX: -2 e^{-x}'],
		['e^{3x}', 'd/dx(e^{3x}) = 3e^{3x}\nLaTeX: 3 e^{3 x}'],
		[
			'sin(x)+cos(x)',
			'd/dx(sin(x)+cos(x)) = cos(x)-sin(x)\nLaTeX: \\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		['3x^2-x+1', 'd/dx(3x^2-x+1) = 6x-1\nLaTeX: 6 x - 1'],
		['\\cos(2x)', 'd/dx(cos(2x)) = -2sin(2x)\nLaTeX: -2 \\sin\\left( 2 x \\right)']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});

describe('.diff : témoins déjà propres, inchangés', () => {
	it.each([
		['x^2', 'd/dx(x^2) = 2x\nLaTeX: 2 x'],
		[
			'x\\sin(x)',
			'd/dx(xsin(x)) = sin(x)+xcos(x)\nLaTeX: \\sin\\left( x \\right) + x \\cos\\left( x \\right)'
		],
		['x^2 e^x', 'd/dx(x^2e^x) = 2xe^x+x^2e^x\nLaTeX: 2 x e^x + x^2 e^x'],
		['\\ln(x)', 'd/dx(ln(x)) = 1/x\nLaTeX: \\dfrac{1}{x}']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});
