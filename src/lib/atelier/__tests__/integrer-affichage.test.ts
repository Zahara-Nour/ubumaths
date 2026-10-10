/**
 * `.intégrer` dans Calcul : le résultat rendu en écriture mathématique
 * (LaTeX), plus le texte maison du terminal `{1/3}x^3` (2026-10-08).
 * Même cause que `.taylor` (#898) : `fromCommand` ne rend pas de LaTeX.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession, type CalcResult } from '../calcul';

function run(input: string): CalcResult {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	return runInput(s, input);
}

function latexOf(input: string): string | undefined {
	const outcome = run(input);
	expect(outcome).toMatchObject({ kind: 'commande' });
	return outcome.kind === 'commande' ? outcome.latex : undefined;
}

describe('.intégrer : primitive en LaTeX', () => {
	it.each([
		['.intégrer x^2', '\\dfrac{1}{3} x^3 + C'],
		['.intégrer 3x^2', 'x^3 + C'],
		['.intégrer x^2 y ; y', '\\dfrac{1}{2} x^2 y^2 + C']
	])('%s → %s', (input, latex) => {
		expect(latexOf(input)).toBe(latex);
	});

	it('jamais l’écriture maison à accolades', () => {
		expect(latexOf('.intégrer x^2')).not.toContain('{1/3}');
	});
});

describe('.intégrer : intégrale définie, la VALEUR en LaTeX', () => {
	it.each([
		['.intégrer x^2 0 1', '\\dfrac{1}{3}'],
		['.intégrer x^2 de 0 à a', '\\dfrac{1}{3} a^3'],
		['.intégrer 2x 0 3', '9']
	])('%s → %s', (input, latex) => {
		expect(latexOf(input)).toBe(latex);
	});
});

describe('.intégrer : les refus restent du texte', () => {
	it('divergence', () => {
		expect(run('.intégrer 1/x -1 1')).toMatchObject({ kind: 'refus' });
	});

	it('non résolu : texte du moteur, sans LaTeX', () => {
		const outcome = run('.intégrer e^(x^2)');
		expect(outcome).not.toHaveProperty('latex');
		expect(outcome).toMatchObject({ output: expect.stringContaining('Non résolu') });
	});
});
