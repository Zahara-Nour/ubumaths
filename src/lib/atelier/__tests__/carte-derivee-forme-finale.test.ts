/**
 * La carte f′, le bouton « Dériver » et `.dériver` rendent la MÊME forme
 * finale de f′ (D1, lot 5a de simplify-carte), une seule fois appliquée.
 *
 * Revue de la branche : la carte appliquait `finalDerivative` deux fois (dans
 * `expandDerivatives`, puis après la substitution) et divergeait du bouton :
 * f = (x−1)/(x²−2x+1) donnait `−1/(x²−2x+1)` sur la carte, l'écriture non
 * simplifiée au bouton ; f = g(2x) avec g = 1/x, `−1/(2x²)` contre `−2/(4x²)`.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';
import { derivativeAstOf } from '../engine';
import { toLatex } from '$lib/mathAST/latex-generator';

function session(lines: readonly string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of lines) expect(runInput(s, line).kind).toBe('definition');
	return s;
}

/** Le rendu du bouton « Dériver » sur f, sans `f'(x) =`. */
function button(lines: readonly string[]): string | undefined {
	const outcome = runAction(session(lines), 'derive', 'f');
	return outcome.ok ? outcome.latex?.replace(/^f'\(x\)\s*=\s*/, '') : undefined;
}

/** Exactement le rendu d'`ObjectCard` : l'arbre de `derivativeAstOf`, par `toLatex`. */
function card(lines: readonly string[]): string | undefined {
	const s = session(lines);
	if (!s.atelier.createDerivative('f').ok) return undefined;
	const derived = derivativeAstOf(s.atelier, "f'");
	return derived.ok ? toLatex(derived.ast) : undefined;
}

describe('carte f′ = bouton « Dériver », au rendu', () => {
	it.each([
		[['f(x) = (x-1)/(x^2-2x+1)'], '-\\dfrac{1}{x^2 - 2 x + 1}'],
		[['g(x) = 1/x', 'f(x) = g(2x)'], '-\\dfrac{1}{2 x^2}'],
		[['f(x) = x^2/(x-1)^2'], '-\\dfrac{2 x}{\\left( x - 1 \\right)^3}'],
		[['f(x) = (x^2-1)/(x+1)'], '1'],
		// `2x/(x^2-9)` se lit 2·(x/(x²−9)) : le coefficient entre au numérateur (rat-18)
		[['f(x) = 2x/(x^2-9)'], '-\\dfrac{2 x^2 + 18}{\\left( x^2 - 9 \\right)^2}'],
		[['f(x) = 3x/(x+1)'], '\\dfrac{3}{\\left( x + 1 \\right)^2}'],
		[['f(x) = x*e^x'], '\\left( x + 1 \\right) \\exponentialE^x'],
		[['f(x) = x*exp(x)'], '\\left( x + 1 \\right) \\exp\\left( x \\right)']
	])('%j', (lines, expected) => {
		expect(button(lines)).toBe(expected);
		expect(card(lines)).toBe(expected);
	});
});
