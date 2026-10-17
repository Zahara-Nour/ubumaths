/**
 * Calcul : une fonction de l'élève se calcule quel que soit son nom
 *
 * 2026-10-13 : `k(x) = x+1` puis `k(0)` répondait `k(0)` (le moteur ne
 * connaissait comme fonctions que f, g, h, u, v, w).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function answer(lines: readonly string[], call: string): string {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of lines) runInput(s, line);
	const result = runInput(s, call);
	if (result.kind !== 'calcul') throw new Error(`${call} → ${JSON.stringify(result)}`);
	return result.output;
}

describe('une fonction nommée autrement que f, g, h', () => {
	it.each([
		[['k(x) = x+1'], 'k(0)', '1'],
		[['q(x) = 2x'], 'q(1)', '2'],
		[['r(t) = t^2'], 'r(3)', '9'],
		[['p = 3', 'k(x) = max(p;2)+x'], 'k(1)', '4'],
		[['k(x) = x^2'], "k'(3)", '6']
	])('%j puis %s répond %s', (lines, call, expected) => {
		expect(answer(lines, call)).toBe(expected);
	});
});
