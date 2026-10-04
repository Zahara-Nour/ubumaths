/**
 * Retours de David après essai de l'atelier (2026-10-04).
 *
 * 1. La dérivée n'était pas simplifiée : `3x^3 - x^2 + 1` donnait
 *    `3*3x^2 - 2x`. Les tests existants n'avaient que des coefficients 1
 *    (`x^2`, `x^3`…), où `differentiate` PARAÎT simplifier — d'où des
 *    coefficients ≠ 1, négatifs et fractionnaires ici.
 * 2. Une fonction créée dans Calcul n'était pas tracée.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { expressionOf } from '../engine';
import { deriveSteps } from '../derive-steps';
import { CalcDesk } from '../desk.svelte';
import { runInput } from '../calcul';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

function derivativeOf(definition: string, order = 1): string | undefined {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	let name = 'f';
	for (let i = 0; i < order; i++) {
		atelier.createDerivative(name);
		name = `${name}'`;
	}
	const result = expressionOf(atelier, name);
	return result.ok ? result.expression : undefined;
}

describe('la dérivée est simplifiée', () => {
	it.each([
		['3x^3-x^2+1', '9x^2-2x'],
		['2x^2+5x', '4x+5'],
		['-4x^3', '-12x^2'],
		['x^4/2', '2x^3']
	])('la carte f′ de %s vaut %s', (definition, expected) => {
		expect(derivativeOf(definition)).toBe(expected);
	});

	it('f″ aussi', () => {
		expect(derivativeOf('3x^3-x^2+1', 2)).toBe('18x-2');
	});

	it('la ligne « Dériver » donne la forme simplifiée', () => {
		const answer = deriveSteps('3x^3-x^2+1', 'f')?.answer ?? '';

		expect(answer.replace(/\s/g, '')).toBe("f'(x)=9x^2-2x");
	});

	it('et le dit dans ses étapes, quand il a fallu simplifier', () => {
		const steps = deriveSteps('3x^3-x^2+1', 'f')?.steps ?? [];

		expect(steps.at(-1)?.title).toContain('simplifie');
	});

	it('`.dériver f` aussi', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '3x^3-x^2+1' }, 'text');

		const result = runInput({ atelier, engine: new WebReplEngine() }, '.dériver f');

		const latex = result.kind === 'commande' ? (result.latex ?? '') : '';
		expect(latex.replace(/\s/g, '')).not.toContain('33');
		expect(latex.replace(/\s/g, '')).toContain('9x^2');
	});

	it('le bouton « Dériver » aussi', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '3x^3-x^2+1' }, 'text');
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('derive', 'f');

		expect((desk.entries[0]?.latex ?? '').replace(/\s/g, '')).toContain('9x^2');
	});
});

describe('une fonction créée dans Calcul est tracée', () => {
	it('`f(x) = x^2` crée une fonction TRACÉE', () => {
		const atelier = new Atelier();

		runInput({ atelier, engine: new WebReplEngine() }, 'f(x) = x^2');

		expect(atelier.get('f')?.plotted).toBe(true);
	});

	it('redéfinir une fonction retirée du graphique ne la retrace pas', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		runInput({ atelier, engine }, 'f(x) = x^2');
		atelier.setPlotted('f', false);

		runInput({ atelier, engine }, 'f(x) = x^3');

		expect(atelier.get('f')?.plotted).toBeFalsy();
	});

	it('une valeur n’est pas « tracée »', () => {
		const atelier = new Atelier();

		runInput({ atelier, engine: new WebReplEngine() }, 'a = 3');

		expect(atelier.get('a')?.plotted).toBeFalsy();
	});
});
