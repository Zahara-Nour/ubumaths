/**
 * L'écriture d'une réponse de Calcul (phase 0 `docs/archive/wip/grandeurs-phase0.md`,
 * lot B, validée par David le 2026-10-11).
 *
 * Mesuré avant : `π/3` s'affichait « 1/3π » en ligne — le texte du moteur
 * (`{1/3}\pi`) était pris pour du LaTeX parce qu'il contenait un antislash —
 * et `\sqrt{2}/2` « ½ √2 » : la forme de calcul d'`evaluate`, jamais mise au
 * propre par `tidy`.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, promote, type CalcResult } from '../calcul';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const latexOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.latex : undefined;

describe('une réponse s’écrit depuis l’arbre, mise au propre par tidy', () => {
	it.each([
		['π/3', '\\dfrac{\\pi}{3}'],
		['\\pi/3', '\\dfrac{\\pi}{3}'],
		['2π/3', '\\dfrac{2 \\pi}{3}'],
		['arcsin(1)', '\\dfrac{\\pi}{2}'],
		['\\sqrt{2}/2', '\\dfrac{\\sqrt{2}}{2}'],
		['π^2/6', '\\dfrac{\\pi^2}{6}'],
		['1/3 + 1/6', '\\dfrac{1}{2}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	// Revue du lot B : en mode décimal, le bouton « Valeur exacte » réaffichait ⅓ π
	it('en mode décimal, le bouton « Valeur exacte » écrit aussi π/3', () => {
		const s = session();
		runInput(s, '.mode décimal');
		const result = runInput(s, 'π/3');

		expect(result.kind === 'calcul' && result.alternative?.latex).toBe('\\dfrac{\\pi}{3}');
	});

	// Non-régression (déjà juste avant ce lot : l'unité passe par l'arbre depuis le lot A)
	it('une grandeur garde son unité, traduite pour l’écran', () => {
		expect(latexOf(runInput(session(), '5[km]'))).toBe('5~\\mathrm{km}');
		expect(latexOf(runInput(session(), '10[km]/3'))).toBe('\\dfrac{10}{3}~\\mathrm{km}');
	});
});

/**
 * Lot 5d (D3, § 19 et § 61 du journal `simplify-carte`) : une expression
 * littérale est mise au propre, dans l'ordre de l'élève (`tidy`, ordre gardé).
 * Avant : tout ressortait tel que tapé (`2x+3x`, `x * 2`).
 */
describe('une expression littérale est mise au propre, ordre de l’élève gardé', () => {
	it.each([
		['3+2*x', '3 + 2 x'],
		['2x+3x', '5 x'],
		['x*2', '2 x'],
		['x+0', 'x'],
		['1*x', 'x'],
		['x^1', 'x'],
		['-(-x)', 'x'],
		['1+2x+3x', '1 + 5 x'],
		['2(1+x)+3(x+1)', '5 \\left( 1 + x \\right)'],
		['3x^2+2x^2-x', '5 x^2 - x'],
		['a+b+a', '2 a + b'],
		['2*3x', '6 x'],
		['x*x', 'x^2'],
		['x^2*x^3', 'x^5'],
		['sin(x)+sin(x)', '2 \\sin\\left( x \\right)'],
		['x-(-3)', 'x + 3'],
		['x/2+x/3', '\\dfrac{5 x}{6}'],
		['(2x)/2', 'x'],
		['x+1/3+1/6', 'x + \\dfrac{1}{2}'],
		['0,5x+1,5x', '2 x'],
		// Q30 : une racine d'un nombre se range comme un coefficient
		['\\sqrt{8}x', '2 \\sqrt{2} x'],
		// Q29 : des exponentielles identiques regroupées
		['e^x*e^x', '\\exponentialE^{2 x}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	// Les limites de `tidy` : rien d'autre que ce qu'elle fait ailleurs
	it.each([
		// S3 : `x/x` n'est pas 1 en 0
		['x/x', '\\dfrac{x}{x}'],
		// S1 : le registre décimal de l'élève
		['0,5x+1', '0{,}5 x + 1'],
		// l'ordre tapé est gardé
		['3-2x+x^2', '3 - 2 x + x^2'],
		// on ne développe pas
		['2x-(x+1)', '2 x - \\left( x + 1 \\right)'],
		['2(x+1)', '2 \\left( x + 1 \\right)'],
		['x-1-(x+1)', 'x - 1 - \\left( x + 1 \\right)'],
		// S4 : une identité est le rôle de `réduire`
		['ln(e^x)', '\\ln\\left( \\exponentialE^x \\right)'],
		// simplifier une fraction est le rôle de `.simplifier`
		['(x^2-1)/(x+1)', '\\dfrac{x^2 - 1}{x + 1}']
	])('%s reste %s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	// Q27 : « Garder » range ce qui est affiché, pas l'arbre tapé
	it('« Garder » range l’écriture affichée', () => {
		const s = session();
		const kept = promote(s, runInput(s, '2x+3x'));

		expect(kept.ok && kept.object.definition).toBe('5x');
	});

	// Revue de 5d (#1682, S3) : des termes qui s'annulent ne font pas perdre le domaine
	it.each([
		['ln(x)-ln(x)', 'ln(x)-ln(x)'],
		['1/x-1/x', '1/x-1/x']
	])('« Garder » %s range une fonction, écrite %s', (input, definition) => {
		const s = session();
		const result = runInput(s, input);
		const kept = promote(s, result);

		expect(latexOf(result)).not.toBe('0');
		expect(kept.ok && kept.object.kind).toBe('function');
		expect(kept.ok && kept.object.definition).toBe(definition);
	});

	// Défini partout : la valeur affichée est gardée (Q27)
	it('« Garder » x − x range la valeur 0', () => {
		const s = session();
		const kept = promote(s, runInput(s, 'x-x'));

		expect(kept.ok && kept.object.kind).toBe('value');
		expect(kept.ok && kept.object.definition).toBe('0');
	});

	it('« Garder » une fraction non simplifiable garde son domaine', () => {
		const s = session();
		const kept = promote(s, runInput(s, 'x/x'));

		expect(kept.ok && kept.object.definition).toBe('x/x');
	});
});

// Non-régression : déjà juste depuis le lot A (#1099)
describe('« Garder… » une grandeur', () => {
	it('crée une valeur qui garde son unité', () => {
		const s = session();
		const result = runInput(s, '12[km]+300[m]');

		const kept = promote(s, result);

		expect(kept.ok).toBe(true);
		const object = kept.ok ? kept.object : null;
		expect(object?.kind).toBe('value');
		expect(object !== null && 'unit' in object && object.unit).toBe('km');
	});
});

/** Le mode décimal (décision Q3 de David : la règle du bouton ≈). */
describe('le mode décimal à l’écran', () => {
	function decimal(input: string) {
		const s = session();
		runInput(s, '.mode décimal');
		return runInput(s, input);
	}

	it('une valeur arrondie : ≈ et 4 décimales', () => {
		expect(latexOf(decimal('\\sqrt{2}/2'))).toBe('\\approx 0{,}7071');
	});

	// Revue du lot 4b (simplify-carte) : `tidy` garde le décimal mais retirait le zéro final
	it('une valeur arrondie garde ses 4 décimales, zéro final compris', () => {
		expect(latexOf(decimal('\\sqrt{26}'))).toBe('\\approx 5{,}0990');
	});

	// Revue : `\\approx \\dfrac{1}{10000000}`, `\\approx 1099511627776`
	it('hors de l’échelle : jamais ≈ devant une écriture exacte', () => {
		expect(latexOf(decimal('2^{40}'))).toBe('1099511627776');
		expect(latexOf(decimal('1/10^7'))).not.toContain('dfrac');
	});

	it('une valeur exacte : ni ≈ ni zéros inutiles', () => {
		expect(latexOf(decimal('1/4'))).toBe('0{,}25');
	});

	it('« Garder » range la valeur pleine, pas l’arrondi affiché', () => {
		const s = session();
		runInput(s, '.mode décimal');
		const kept = promote(s, runInput(s, '\\sqrt{2}/2'));

		expect(kept.ok && kept.object.definition).toMatch(/^0\.70710678/);
	});
});
