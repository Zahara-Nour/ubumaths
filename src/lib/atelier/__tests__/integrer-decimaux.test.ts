/**
 * L'atelier : `.intégrer` d'une fonction à coefficients décimaux (R5, Q42 b —
 * David, 2026-10-24) et ménage de la valeur à paramètre (R1).
 *
 * R5 : la primitive s'écrit dans UN registre, comme dans les corrections :
 * tous ses coefficients en décimal si chacun tombe juste, sinon tous en
 * fraction. `.intégrer 0,6x+1,2` donnait `3x²/10 + 6x/5`.
 *
 * R1 : la valeur d'une intégrale à bornes avec paramètre est réduite par
 * `tidy` (et non plus `simplify`) — écriture inchangée, mesurée sur 14 cas.
 */
import { describe, expect, it } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

/** Le LaTeX rendu, sans espaces : ce que voit l'élève. */
function latex(input: string, setup: readonly string[] = []): string {
	const result = runInput(session(setup), input);
	if (result.kind !== 'commande') throw new Error(JSON.stringify(result));
	return (result.latex ?? '').replace(/\s/g, '');
}

describe('R5 : .intégrer, coefficients décimaux', () => {
	it.each([
		['.intégrer 0,6x+1,2', '0{,}3x^2+1{,}2x+C'],
		['.intégrer 0,3x^2', '0{,}1x^3+C'],
		['.intégrer 0,2x^3-0,6x', '0{,}05x^4-0{,}3x^2+C'],
		// Premier coefficient négatif : `opposite(3/10)·x²` (revue de 5f-2)
		['.intégrer -0,6x+1,2', '-0{,}3x^2+1{,}2x+C'],
		['.intégrer 0,5x^2-1,5x', '\\dfrac{1}{6}x^3-\\dfrac{3}{4}x^2+C'],
		['.intégrer x^2+0,5', '\\dfrac{1}{3}x^3+\\dfrac{1}{2}x+C']
	])('%s → %s', (input, expected) => {
		expect(latex(input)).toBe(expected);
	});

	it('sans décimal tapé : inchangé (.intégrer x + 1/2)', () => {
		expect(latex('.intégrer x+1/2')).not.toContain('{,}');
	});
});

describe('R1 : intégrale à bornes avec paramètre, valeur réduite', () => {
	it.each([
		['.intégrer f de 0 à 1', ['f(x) = a x'], '\\dfrac{a}{2}'],
		['.intégrer g de 0 à 1', ['g(x) = x^2 + k'], 'k+\\dfrac{1}{3}'],
		['.intégrer h de 0 à 1', ['h(x) = e^{a x}'], '\\dfrac{\\exponentialE^a-1}{a}\\quad(a\\neq0)'],
		['.intégrer a x^2 + b de 0 à 2', [], '\\dfrac{8a}{3}+2b'],
		['.intégrer \\cos(a x) de 0 à 1', [], '\\dfrac{\\sin\\left(a\\right)}{a}\\quad(a\\neq0)'],
		['.intégrer (a x + 1)^2 de 0 à 1', [], '\\dfrac{a^2}{3}+a+1'],
		['.intégrer a e^{x} de 0 à 1', [], '\\exponentialEa-a'],
		['.intégrer a/x de 1 à 2', [], '\\ln\\left(2\\right)a'],
		['.intégrer f de a à 2a', ['f(x) = a x'], '\\dfrac{3a^3}{2}']
	])('%s → %s', (input, setup, expected) => {
		expect(latex(input, setup)).toBe(expected);
	});
});

describe('Q49 : intégrale à bornes, intégrande à décimaux, valeur dans le registre', () => {
	it.each([
		['.intégrer 0,5x de 0 à 1', '0{,}25'],
		['.intégrer 0,2x+1 de 0 à 2', '2{,}4'],
		['.intégrer 0,5x de 0 à 2', '1'],
		['.intégrer 0,5x^2 de 0 à 1', '\\dfrac{1}{6}'],
		// Irrationnelle : fraction (Q22, point 2 de la revue de Q49)
		['.intégrer 0,5x de 0 à π', '\\dfrac{\\pi^2}{4}'],
		['.intégrer 0,5e^x de 0 à 1', '\\dfrac{\\exponentialE-1}{2}'],
		// À paramètre : comme une primitive (R5)
		['.intégrer 0,5a x de 0 à 1', '0{,}25a'],
		['.intégrer x de 0 à 1', '\\dfrac{1}{2}']
	])('%s → %s', (input, expected) => {
		expect(latex(input)).toBe(expected);
	});

	it('les étapes finissent sur la même valeur (.intégrer 0,5x de 0 à 1)', () => {
		const result = runInput(session(), '.intégrer 0,5x de 0 à 1');
		if (result.kind !== 'commande') throw new Error(JSON.stringify(result));
		const last = result.steps?.at(-1);
		expect(last?.rule).toBe('simplify-bounds-result');
		expect(last?.expressionLatex?.replace(/\s/g, '')).toMatch(/&=0\{,\}25\\end\{aligned\}$/);
	});
});
