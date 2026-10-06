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
		['.taylor e^x 4', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor exp(x) 4', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor 3e^x 3', '3 + 3 x + \\dfrac{3}{2} x^2'],
		['.taylor e^{2x} 3', '1 + 2 x + 2 x^2'],
		['.taylor e^(-x) 3', '1 - x + \\dfrac{1}{2} x^2'],
		['.taylor e^t 3 ; t', '1 + t + \\dfrac{1}{2} t^2'],
		['.taylor e^x 4 0', '1 + x + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} x^3'],
		['.taylor a*x^2 3', 'a x^2'],
		['.taylor 3a x^2 3', '3 a x^2'],
		['.taylor sin(a x) 3', 'a x']
	])('%s → %s', (input, latex) => {
		expect(taylor(input)).toBe(latex);
	});
});
