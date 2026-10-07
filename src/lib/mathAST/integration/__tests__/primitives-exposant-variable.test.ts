/**
 * Revue du 2026-10-07 : ∫ xˣ dx rendait x^{x+1}/(x+1) — la règle de la
 * puissance (∫ xⁿ dx = xⁿ⁺¹/(n+1)) appliquée à un exposant qui DÉPEND de x.
 *
 * Une puissance dont la base ET l'exposant dépendent de x (xˣ, x^{x²},
 * x^{sin x}, x^{1/x}, (x+1)ˣ, (ln x)ˣ…) n'a pas de primitive élémentaire :
 * refus attendu. La dérivée, elle, reste juste : (xˣ)′ = xˣ(ln x + 1).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { differentiate } from '../../differentiation';
import { compile } from '../../eval/compile';

// =============================================================================
// Constantes
// =============================================================================

const POSITIVE_POINTS: readonly number[] = [0.3, 0.7, 1.3, 2.1, 3.4];

// =============================================================================
// Tests
// =============================================================================

describe('puissance à base ET exposant variables : pas de primitive élémentaire', () => {
	it.each([
		'x^x',
		'x^{x}',
		'3x^x',
		'x^{2x}',
		'x^{x^2}',
		'(x+1)^x',
		'x^{\\sin x}',
		'2^{x}x^{x}',
		'x^{\\frac{1}{x}}',
		'x^{1/x}',
		'(\\ln x)^x',
		'\\sqrt{x}^x'
	])('%s : refus', (latex) => {
		expect(integrate(parseLatex(latex), { variable: 'x' }).status).not.toBe('exact');
	});

	it.each(['x^3', 'x^{\\frac{1}{2}}', 'x^{-2}', 'x^{a}'])(
		'%s : exposant constant, primitive toujours rendue',
		(latex) => {
			expect(integrate(parseLatex(latex), { variable: 'x' }).status).toBe('exact');
		}
	);
});

describe('dérivée : exposant variable sur base variable (non-régression)', () => {
	it.each([
		['x^x', (x: number) => x ** x * (Math.log(x) + 1)],
		[
			'x^{\\sin x}',
			(x: number) => x ** Math.sin(x) * (Math.cos(x) * Math.log(x) + Math.sin(x) / x)
		],
		['x^{x^2}', (x: number) => x ** (x * x) * (2 * x * Math.log(x) + x)]
	] as const)('%s : valeur juste', (latex, reference) => {
		const derivative = compile(differentiate(parseLatex(latex), 'x'));
		for (const x of POSITIVE_POINTS) {
			expect(derivative({ x })).toBeCloseTo(reference(x), 6);
		}
	});
});
