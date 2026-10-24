/**
 * La ligne `S = …` de `.résoudre` passe par la valeur exacte à afficher commune
 * (lot 5c, Q26 ; `eval/exact-value.ts`). Mesuré sur main : `x² = 0,5` donnait
 * `S = {−½√2 ; ½√2}`, `x² − x − 1 = 0` `S = {½ − ½√5 ; ½ + ½√5}`, `2x = 0,6`
 * `x = 3/10`. Les étapes du solveur restent au lot 5f.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function answerLatex(input: string): string | undefined {
	const session: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const result = runInput(session, input);
	if (result.kind !== 'commande') throw new Error(`pas une commande : ${JSON.stringify(result)}`);
	return result.latex;
}

describe('la ligne des solutions de .résoudre', () => {
	it.each([
		[
			'.résoudre x^2 = 0,5',
			'S = \\left\\{ -\\dfrac{\\sqrt{2}}{2} \\,;\\, \\dfrac{\\sqrt{2}}{2} \\right\\}'
		],
		[
			'.résoudre x^2 = 3/4',
			'S = \\left\\{ -\\dfrac{\\sqrt{3}}{2} \\,;\\, \\dfrac{\\sqrt{3}}{2} \\right\\}'
		],
		[
			'.résoudre x^2 - x - 1 = 0',
			'S = \\left\\{ \\dfrac{1 - \\sqrt{5}}{2} \\,;\\, \\dfrac{1 + \\sqrt{5}}{2} \\right\\}'
		],
		// S1 : le registre décimal de l'équation
		['.résoudre 2x = 0,6', 'x = 0{,}3'],
		['.résoudre 0,5x + 1 = 0,2', 'x = -1{,}6'],
		// Inchangé
		['.résoudre 3x = 1', 'x = \\dfrac{1}{3}']
	])('%s', (input, expected) => {
		expect(answerLatex(input)).toBe(expected);
	});
});
