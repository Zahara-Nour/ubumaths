/**
 * `.résoudre` dans Calcul : la réponse en écriture mathématique (LaTeX),
 * MÊME quand `solveSteps` ne sait pas faire (degré ≥ 3, transcendantes,
 * trigonométriques). Avant (2026-10-08), la ligne montrait le texte du
 * terminal : « x = 0 ou x = {1/2}sqrt(2) ou x = -{1/2}sqrt(2) ».
 *
 * Forme : celle de `solveSteps` — une solution `x = …`, plusieurs
 * `S = \left\{ … \,;\, … \right\}` rangées dans l'ordre croissant.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runAction, runInput, type CalcSession, type CalcResult } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string): CalcResult {
	return runInput(session(), input);
}

function latexOf(input: string): string | undefined {
	const outcome = run(input);
	expect(outcome).toMatchObject({ kind: 'commande' });
	return outcome.kind === 'commande' ? outcome.latex : undefined;
}

/** Aucune trace de l'écriture maison du terminal. */
function expectNoCustomNotation(latex: string | undefined): void {
	expect(latex).toBeDefined();
	expect(latex).not.toMatch(/\{\d+\/\d+\}|sqrt\(|root\(|cbrt\(|:\/|\bln\(/);
}

describe('.résoudre sans étapes : les solutions en LaTeX', () => {
	it.each([
		[
			'.résoudre 2x^3=x',
			'S = \\left\\{ -\\dfrac{\\sqrt{2}}{2} \\,;\\, 0 \\,;\\, \\dfrac{\\sqrt{2}}{2} \\right\\}'
		],
		['.résoudre x^3=8', 'x = 2'],
		['.résoudre x^4=2', 'S = \\left\\{ -\\sqrt[4]{2} \\,;\\, \\sqrt[4]{2} \\right\\}'],
		['.résoudre e^x=2', 'x = \\ln\\left( 2 \\right)'],
		['.résoudre sqrt(x)=1/2', 'x = \\dfrac{1}{4}']
	])('%s → %s', (input, latex) => {
		const shown = latexOf(input);
		expect(shown).toBe(latex);
		expectNoCustomNotation(shown);
	});
});

describe('.résoudre : ensembles particuliers', () => {
	it.each([
		['.résoudre x=x', 'S = \\mathbb{R}'],
		['.résoudre 0x=5', 'S = \\emptyset'],
		['.résoudre 1/x=0', 'S = \\emptyset']
	])('%s → %s', (input, latex) => {
		expect(latexOf(input)).toBe(latex);
	});
});

describe('.résoudre trigonométrique : la famille périodique entière', () => {
	it.each([
		[
			'.résoudre sin(x)=1/2',
			'x = \\dfrac{\\pi}{6} + 2k\\pi \\text{ ou } x = \\dfrac{5 \\pi}{6} + 2k\\pi, \\; k \\in \\mathbb{Z}'
		],
		['.résoudre tan(x)=1', 'x = \\dfrac{\\pi}{4} + k\\pi, \\; k \\in \\mathbb{Z}'],
		['.résoudre sin(x)cos(x)=0', 'x = \\dfrac{k\\pi}{2}, \\; k \\in \\mathbb{Z}'],
		['.résoudre sin(3x)=1', 'x = \\dfrac{\\pi}{6} + \\dfrac{2k\\pi}{3}, \\; k \\in \\mathbb{Z}']
	])('%s → %s', (input, latex) => {
		expect(latexOf(input)).toBe(latex);
	});
});

describe('.résoudre : ce qui n’est pas sûr reste du texte', () => {
	it('échec du solveur : le message, sans LaTeX', () => {
		const outcome = run('.résoudre x^5+x+1=0');
		expect(outcome).not.toHaveProperty('latex');
		expect(outcome).toMatchObject({ output: expect.stringContaining('non supporte') });
	});

	it('période en dérive flottante (sin(x/3) = 0) : pas de famille écrite de travers', () => {
		const outcome = run('.résoudre sin(x/3)=0');
		expect(outcome).not.toHaveProperty('latex');
	});
});

describe('.résoudre : non-régressions (étapes pédagogiques)', () => {
	it.each([
		['.résoudre 2x=3', 'x = \\dfrac{3}{2}'],
		['.résoudre x^2=4', 'S = \\left\\{ -2 \\,;\\, 2 \\right\\}'],
		['.résoudre x^2=-1', 'S = \\emptyset'],
		['.résoudre 2x+1<7', 'x < 3']
	])('%s → %s', (input, latex) => {
		expect(latexOf(input)).toBe(latex);
	});
});

describe('Bouton « Résoudre » : même réponse que la commande', () => {
	it('f(x) = 2x^3 - x', () => {
		const s = session();
		runInput(s, 'f(x) = 2x^3-x');
		const outcome = runAction(s, 'solve', 'f');
		expect(outcome).toMatchObject({
			ok: true,
			latex:
				'S = \\left\\{ -\\dfrac{\\sqrt{2}}{2} \\,;\\, 0 \\,;\\, \\dfrac{\\sqrt{2}}{2} \\right\\}'
		});
	});
});

describe('Le reste des commandes : jamais l’écriture maison quand un LaTeX est rendu', () => {
	it.each([
		'.simplifier sqrt(8)+x/2',
		'.factoriser x^3-x',
		'.dériver sqrt(x)/3',
		'.dériver sec(3x)',
		'.intégrer x^2/3',
		'.taylor sin(x) 5'
	])('%s', (input) => {
		expectNoCustomNotation(latexOf(input));
	});
});
