/**
 * `.resoudre f(x)=0` : l'atelier remplace `f(x)` par `(expression)` avant
 * d'appeler le moteur. Avant le correctif, `f(x) = 2x - 3` donnait
 * « On divise les deux membres par 0 » et x = 0.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function solveOutput(definition: string): string {
	const s = session();
	runInput(s, definition);
	const result = runInput(s, '.resoudre f(x)=0');
	expect(result.kind).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

describe('.resoudre f(x)=0 — f substituée entre parenthèses', () => {
	it('f(x) = 2x - 3 : x = 3/2, jamais de division par 0', () => {
		const output = solveOutput('f(x) = 2x - 3');
		expect(output).toContain('x = 3/2');
		expect(output).not.toContain('par 0');
	});

	it('f(x) = x^2 - 3x : x = 3 ou x = 0, coefficients justes', () => {
		const output = solveOutput('f(x) = x^2 - 3x');
		expect(output).toContain('x = 3 ou x = 0');
		expect(output).not.toContain('c = (x^2-3x)');
	});
});
