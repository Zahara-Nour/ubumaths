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

// Trouvé en vérifiant les autres sorties qui affichent une dérivée
describe('la ligne « Variations »', () => {
	it('affiche la dérivée simplifiée', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '3x^3-x^2+1' }, 'text');
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('variations', 'f');

		expect((desk.entries[0]?.latex ?? '').replace(/\s/g, '')).toBe("f'(x)=9x^2-2x");
	});
});

// =============================================================================
// Revue des retours
// =============================================================================

describe('revue : simplifier sans perdre l’ordre ni les regroupements', () => {
	// 3 : les termes semblables se regroupent — le regroupement l'emporte sur l'ordre
	it.each([
		['x^2+3x+2x', '2x+5'],
		['3x^3+2x^3', '15x^2'],
		['x^3-x^3+x', '1'],
		['(x+1)(x-2)', '2x-1']
	])('la carte f′ de %s vaut %s', (definition, expected) => {
		expect(derivativeOf(definition)).toBe(expected);
	});

	// 2 : l'ordre u′v − uv′ de la règle du quotient reste
	it('la dérivée d’un quotient garde u′v − uv′', () => {
		const answer = deriveSteps('(2x+1)/(x-1)', 'f')?.answer ?? '';

		expect(answer.replace(/\s/g, '')).not.toMatch(/-\\left\(2x\+1\\right\)\+2/);
		expect(deriveSteps('(2x+1)/(x-1)', 'f')?.steps.at(-1)?.title).not.toBe('On simplifie');
	});

	// 1 : l'étape « On simplifie » montrait « 3 3 x^2 », lu 33x²
	it('l’étape « On simplifie » ne colle jamais deux nombres', () => {
		const last = deriveSteps('3x^3-x^2+1', 'f')?.steps.at(-1);

		expect(last?.title).toBe('On simplifie');
		expect(last?.expressionLatex ?? '').not.toMatch(/\d\s+\d/);
	});

	// 4 : pas d'étape quand rien ne se simplifie (un simple déplacement de facteurs)
	it('pas d’étape « On simplifie » quand rien ne se simplifie', () => {
		expect(deriveSteps('x^2*sin(x)', 'f')?.steps.at(-1)?.title).not.toBe('On simplifie');
	});
});

describe('revue : la fonction créée renvoyée par Calcul', () => {
	it('le résultat de `f(x) = …` porte l’état tracé', () => {
		const atelier = new Atelier();

		const result = runInput({ atelier, engine: new WebReplEngine() }, 'f(x) = x^2');

		expect(result.kind === 'definition' && result.object.plotted).toBe(true);
	});
});
