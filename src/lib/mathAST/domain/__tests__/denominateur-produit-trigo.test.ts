/**
 * V85 (registre des écarts) : l'ensemble de définition d'un quotient dont le
 * dénominateur est un produit de facteurs trigonométriques. Seul le premier
 * facteur comptait : `1/(sin x cos x)` rendait ℝ privé des kπ, alors que
 * cos(π/2) = 0.
 *
 * Phase 0 validée par David le 2026-11-24
 * (docs/wip/ecarts-valeurs-fausses-progress.md) : chaque facteur compte ; un
 * facteur dont on ne sait pas écrire les zéros fait refuser, jamais ignorer.
 *
 * Sonde : le chemin de l'Atelier (`runInput`), le rendu LaTeX affiché.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';
import { parseLatex } from '../../parser';
import { computeDomain } from '../compute';

const REFUSAL = 'Je ne sais pas encore déterminer ce domaine.';

/** Une saisie de l'Atelier, dans une session neuve. */
function run(input: string): CalcResult {
	return runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
}

/** Le LaTeX d'une réponse de l'Atelier (vide pour un refus). */
function latexOf(result: CalcResult): string {
	return 'latex' in result && result.latex ? result.latex : '';
}

/** Le message d'un refus (vide pour une réponse). */
function messageOf(result: CalcResult): string {
	return 'message' in result ? result.message : '';
}

describe('V85 — chaque facteur trigonométrique du dénominateur compte', () => {
	it('1/(sin x cos x) : ℝ privé des kπ/2', () => {
		expect(latexOf(run('.domaine \\frac{1}{\\sin x\\cos x}'))).toBe(
			'D = \\mathbb{R}\\setminus\\left\\{\\frac{k\\pi}{2},\\ k\\in\\mathbb{Z}\\right\\}'
		);
	});

	it('1/(cos x sin x), dans l’autre ordre : ℝ privé des kπ/2', () => {
		expect(latexOf(run('.domaine \\frac{1}{\\cos x\\sin x}'))).toBe(
			'D = \\mathbb{R}\\setminus\\left\\{\\frac{k\\pi}{2},\\ k\\in\\mathbb{Z}\\right\\}'
		);
	});

	it('comme 1/sin(2x), déjà juste', () => {
		expect(latexOf(run('.domaine \\frac{1}{\\sin(2x)}'))).toBe(
			'D = \\mathbb{R}\\setminus\\left\\{\\frac{k\\pi}{2},\\ k\\in\\mathbb{Z}\\right\\}'
		);
	});

	it('1/(sin x cos(2x)) : jamais ℝ privé des seuls kπ', () => {
		// Deux familles (kπ et π/4 + kπ/2) qui ne se rangent pas en une seule :
		// le moteur ne sait noter qu'une famille, donc refus honnête (décision du
		// 2026-11-24 : l'écriture de deux familles est un écart à part).
		const result = run('.domaine \\frac{1}{\\sin x\\cos(2x)}');

		expect(messageOf(result)).toBe(REFUSAL);
	});

	it('1/((x − 1) cos x) : le point 1 n’est pas oublié', () => {
		// Aujourd'hui ℝ privé des π/2 + kπ : 1 était gardé, alors que 1/0.
		expect(messageOf(run('.domaine \\frac{1}{(x-1)\\cos x}'))).toBe(REFUSAL);
	});

	it('le moteur ne rend pas un domaine incomplet sans le dire', () => {
		const { unresolved } = computeDomain(parseLatex('\\frac{1}{\\sin(x)\\cos(2x)}'), 'x');

		expect(unresolved?.length ?? 0).toBeGreaterThan(0);
	});
});

describe('V85 — inchangés', () => {
	it.each([
		['.domaine \\frac{1}{\\sin x}', 'k\\pi'],
		['.domaine \\frac{1}{\\cos x}', '\\frac{\\pi}{2}+k\\pi'],
		['.domaine \\tan x', '\\frac{\\pi}{2}+k\\pi'],
		// 0 est déjà un kπ : le facteur x n'ajoute rien
		['.domaine \\frac{1}{x\\sin x}', 'k\\pi'],
		// le même facteur deux fois
		['.domaine \\frac{1}{\\cos x\\cos x}', '\\frac{\\pi}{2}+k\\pi']
	])('%s : ℝ privé des %s', (input, family) => {
		expect(latexOf(run(input))).toBe(
			`D = \\mathbb{R}\\setminus\\left\\{${family},\\ k\\in\\mathbb{Z}\\right\\}`
		);
	});

	it('zéros d’un facteur introuvables : refus (1/(sin x ln x))', () => {
		expect(messageOf(run('.domaine \\frac{1}{\\sin x \\ln x}'))).toBe(REFUSAL);
	});
});
