/**
 * `.taylor` dans Calcul : le polynôme rendu en écriture mathématique, et une
 * expression à paramètre (`a*x^2`) développée en x (2026-10-06).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function taylor(input: string): string | undefined {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const outcome = runInput(s, input);
	expect(outcome).toMatchObject({ kind: 'commande' });
	return outcome.kind === 'commande' ? outcome.latex : undefined;
}

describe('.taylor : polynôme rendu en LaTeX', () => {
	it.each([
		['.taylor e^x 3', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor exp(x) 3', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor 3e^x 2', '3 + 3 x + \\dfrac{3}{2} x^2'],
		['.taylor e^{2x} 2', '1 + 2 x + 2 x^2'],
		['.taylor e^(-x) 2', '1 - x + \\dfrac{1}{2} x^2'],
		['.taylor e^t 2 ; t', '1 + t + \\dfrac{1}{2} t^2'],
		['.taylor e^x 3 0', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor a*x^2 2', 'a x^2'],
		['.taylor 3a x^2 2', '3 a x^2'],
		['.taylor sin(a x) 2', 'a x']
	])('%s → %s', (input, latex) => {
		expect(taylor(input)).toBe(latex);
	});
});

/**
 * Décision de David (2026-10-06) : `n` est l'ORDRE du développement (degré
 * maximal), convention des développements limités — plus un nombre de termes.
 */
describe('.taylor <expr> <n> : n est l’ordre du développement', () => {
	it.each([
		['.taylor e^x 4', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3 + \\dfrac{1}{24} x^4'],
		['.taylor sin(x) 5', 'x - \\dfrac{1}{6} x^3 + \\dfrac{1}{120} x^5'],
		['.taylor cos(x) 4', '1 - \\dfrac{1}{2} x^2 + \\dfrac{1}{24} x^4'],
		['.taylor e^x 0', '1'],
		['.taylor cos(x) 1', '1'],
		['.taylor ln(x) 2 1', '\\left( x - 1 \\right) - \\dfrac{1}{2} \\left( x - 1 \\right)^2'],
		['.taylor a x^2 2', 'a x^2'],
		['.taylor a x^2 1', '0'],
		['.taylor e^t 2 ; t', '1 + t + \\dfrac{1}{2} t^2'],
		['.taylor e^t ; t 2', '1 + t + \\dfrac{1}{2} t^2']
	])('%s → %s', (input, latex) => {
		expect(taylor(input)).toBe(latex);
	});

	it('ordre 19 : accepté (même limite qu’avant, 20 termes)', () => {
		const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
		expect(runInput(s, '.taylor e^x 19')).toMatchObject({ kind: 'commande' });
	});

	it('ordre 20 : refusé, en français', () => {
		const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
		expect(runInput(s, '.taylor e^x 20')).toMatchObject({
			kind: 'refus',
			message: 'L’ordre du développement ne peut pas dépasser 19.'
		});
	});
});
