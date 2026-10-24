/**
 * La ligne d'un calcul de l'Atelier passe par la valeur exacte à afficher
 * commune (lot 5c du chantier simplify-carte, `eval/exact-value.ts`, § 57-58).
 * Mesuré sur main : `0,1+0,2 → 3/10`, `2,50 → 5/2`, `(1+√5)/2 → 1/2 + √5/2`,
 * `3×10²⁰` écrit en entier.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function latexOf(input: string): string | undefined {
	const session: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const result = runInput(session, input);
	if (result.kind !== 'calcul') throw new Error(`pas un calcul : ${JSON.stringify(result)}`);
	return result.latex;
}

describe('la ligne d’un calcul exact', () => {
	it.each([
		// S1 : le registre décimal de la saisie
		['0,1+0,2', '0{,}3'],
		['2,50', '2{,}5'],
		['1/3+0,5', '\\dfrac{5}{6}'],
		// Q22 : un irrationnel n'a pas d'écriture décimale finie
		['0,5*sqrt(2)', '\\dfrac{\\sqrt{2}}{2}'],
		// Q23 : une seule fraction sur un dénominateur commun
		['(1+sqrt(5))/2', '\\dfrac{1 + \\sqrt{5}}{2}'],
		// Q24 : la notation scientifique tapée
		['3*10^20', '3 \\times 10^{20}'],
		// Inchangés
		['1/3+1/6', '\\dfrac{1}{2}'],
		['cos(π/6)', '\\dfrac{\\sqrt{3}}{2}'],
		['2^10', '1024']
	])('%s → %s', (input, expected) => {
		expect(latexOf(input)).toBe(expected);
	});
});
