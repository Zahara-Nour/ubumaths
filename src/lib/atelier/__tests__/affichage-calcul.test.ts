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

	// Revue du lot B : `tidy` simplifiait `x/x` en 1 (faux en 0) et réordonnait
	// `3-2x+x^2` — une expression à variables reste écrite comme le moteur la rend
	it('une expression à variables n’est ni simplifiée ni réordonnée', () => {
		expect(latexOf(runInput(session(), 'x/x'))).not.toBe('1');
		expect(latexOf(runInput(session(), '3-2x+x^2'))).toMatch(/^3/);
	});

	// Non-régression (déjà juste avant ce lot : l'unité passe par l'arbre depuis le lot A)
	it('une grandeur garde son unité, traduite pour l’écran', () => {
		expect(latexOf(runInput(session(), '5[km]'))).toBe('5~\\mathrm{km}');
		expect(latexOf(runInput(session(), '10[km]/3'))).toBe('\\dfrac{10}{3}~\\mathrm{km}');
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
