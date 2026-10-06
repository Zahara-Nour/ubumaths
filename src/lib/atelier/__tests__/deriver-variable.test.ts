/**
 * `.dériver` dans l'atelier : la variable ne se devine plus d'après le dernier
 * mot (revue de #876, 2026-10-06).
 *
 * Deux chemins disaient deux choses : la sortie du moteur dérivait
 * `x^2 y` « en y » (`d/dy(x^2) = 0`) pendant que les étapes répondaient
 * `2 x y` ; `\sin x + \cos x` rendait une sortie VIDE ; et une variable
 * explicite était refusée (« Je n’ai pas su lire »).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function derive(input: string): { output: string; latex: string | undefined } {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const outcome = runInput(s, input);
	expect(outcome.kind).toBe('commande');
	if (outcome.kind !== 'commande') return { output: '', latex: undefined };
	return { output: outcome.output, latex: outcome.latex };
}

describe('.dériver : sortie et étapes disent la même dérivée', () => {
	it.each([
		[
			'.dériver \\sin x + \\cos x',
			'd/dx(sin(x)+cos(x)) = cos(x)-sin(x)',
			'\\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		['.deriver x^2 y', 'd/dx(x^2y) = 2xy', '2 x y'],
		['.dériver t^2 + t ; t', 'd/dt(t^2+t) = 2t+1', '2 t + 1'],
		['.dériver a x^2 + b x ; x', 'd/dx(ax^2+bx) = 2ax+b', '2 a x + b'],
		['.dériver t^3', 'd/dt(t^3) = 3t^2', '3 t^2']
	])('%s', (input, output, latex) => {
		expect(derive(input)).toEqual({ output, latex });
	});
});

describe('une fonction de l’atelier se dérive toujours en x', () => {
	// ⚠️ `f(x) = k` ne contient pas x : la règle « la seule variable libre »
	// dériverait en k et répondrait 1. Une fonction de l'atelier est en x.
	// (Le bouton ne peut pas le montrer : sur un objet en attente, il refuse.)
	it('la commande `.dériver f`', () => {
		const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'f(x) = k');

		const outcome = runInput(s, '.dériver f');

		expect(outcome).toMatchObject({ kind: 'commande', latex: '0' });
		if (outcome.kind !== 'commande') return;
		expect(outcome.output).toBe("d/dx(f) = 0 — En attente de « k », qui n'est pas encore défini.");
	});
});

describe('revue #880', () => {
	it('le refus du moteur (plusieurs variables) est montré tel quel', () => {
		const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };

		expect(runInput(s, '.dériver a t^2 + b t')).toEqual({
			kind: 'refus',
			message:
				'Plusieurs variables possibles (a, b, t) : précise laquelle après un point-virgule, par exemple « a t^2 + b t ; t ».'
		});
	});

	it.each([
		['.dériver x_1^2 ; x_1', 'd/dx_1(x_1^2) = 2x_1', '2 x_1'],
		['.dériver x_{12}^2 ; x_{12}', 'd/dx_12(x_12^2) = 2x_12', '2 x_{12}'],
		['.dériver x_1^2', 'd/dx_1(x_1^2) = 2x_1', '2 x_1']
	])('variable indicée : %s', (input, output, latex) => {
		expect(derive(input)).toEqual({ output, latex });
	});
});

it('les étapes d’une variable indicée l’écrivent comme elle a été tapée', () => {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const outcome = runInput(s, '.dériver x_{12}^2 ; x_{12}');

	expect(outcome.kind).toBe('commande');
	if (outcome.kind !== 'commande') return;
	expect(outcome.steps?.length).toBeGreaterThan(0);
	expect(JSON.stringify(outcome.steps)).not.toContain('mathit');
});

it('le refus d’une fonction sans parenthèses est montré tel quel', () => {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };

	expect(runInput(s, '.dériver sin x + cos x')).toEqual({
		kind: 'refus',
		message: 'Écris sin(x) avec des parenthèses.'
	});
});
