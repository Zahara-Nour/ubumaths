/**
 * Derniers refus de l'oracle des primitives (2026-10-08) :
 *
 * u′·f(u) avec u′ à exposant FRACTIONNAIRE — x^{1/3}(x^{4/3} + 1)² était refusé :
 * `differentiate` rend u′ = (4/3)·x^{4/3 − 1}, exposant non réduit, et le facteur
 * x^{1/3} de l'intégrande n'était pas reconnu proportionnel à x^{4/3 − 1}.
 * Convention (#928) : x^{p/q} défini pour x > 0 — F′ = f contrôlé sur x > 0.
 *
 * (`x2^x` : refus du parseur, message clair — voir parser/__tests__/nombre-apres-facteur.)
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { compile } from '../../eval/compile';

// =============================================================================
// Constantes
// =============================================================================

const POSITIVE_POINTS: readonly number[] = [0.35, 0.85, 1.65, 2.45, 3.3];

// =============================================================================
// Outils
// =============================================================================

/** Premier écart F′ ≠ f sur x > 0, ou null */
function derivativeMismatch(latex: string): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) return `statut ${result.status}`;
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	for (const x of POSITIVE_POINTS) {
		const fx = f({ x });
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
		if (!(Math.abs(slope - fx) <= 1e-5 * Math.max(1, Math.abs(fx)))) {
			return `F′(${x}) = ${slope} ≠ f(${x}) = ${fx}`;
		}
	}
	return null;
}

/** F − G constant sur x > 0 (même primitive à une constante près) */
function differsByConstant(latex: string, expected: string): boolean {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.antiderivative === null) return false;
	const F = compile(result.antiderivative);
	const G = compile(parseLatex(expected));
	const gaps = POSITIVE_POINTS.map((x) => F({ x }) - G({ x }));
	return gaps.every((g) => Math.abs(g - gaps[0]) < 1e-9);
}

// =============================================================================
// Tests
// =============================================================================

describe('u′·f(u) avec u′ à exposant fractionnaire', () => {
	it('x^{1/3}(x^{4/3} + 1)² : primitive ¼(x^{4/3} + 1)³', () => {
		const latex = 'x^{\\frac{1}{3}}(x^{\\frac{4}{3}}+1)^2';
		expect(derivativeMismatch(latex)).toBeNull();
		expect(differsByConstant(latex, '\\frac{1}{4}(x^{\\frac{4}{3}}+1)^3')).toBe(true);
	});

	it.each([
		// coefficient ≠ 1 : u = x^{3/2} + 2, u′ = (3/2)·x^{1/2}
		'5x^{\\frac{1}{2}}(x^{\\frac{3}{2}}+2)^3',
		// u′ au numérateur, u² au dénominateur : u = x^{5/3} + 1
		'\\frac{x^{\\frac{2}{3}}}{(x^{\\frac{5}{3}}+1)^2}',
		// racine écrite \sqrt : u = x^{3/2} + 1
		'\\sqrt{x}(x^{\\frac{3}{2}}+1)^2'
	])('%s : F′ = f sur x > 0', (latex) => {
		expect(derivativeMismatch(latex)).toBeNull();
	});
});
