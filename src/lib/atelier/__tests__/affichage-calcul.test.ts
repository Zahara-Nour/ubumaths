/**
 * L'écriture d'une réponse de Calcul (phase 0 `docs/wip/grandeurs-phase0.md`,
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

	it('une grandeur garde son unité, traduite pour l’écran', () => {
		expect(latexOf(runInput(session(), '5[km]'))).toBe('5~\\mathrm{km}');
		expect(latexOf(runInput(session(), '10[km]/3'))).toBe('\\dfrac{10}{3}~\\mathrm{km}');
	});
});

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
