/**
 * Le bouton ≈ de Calcul, vu depuis le résultat d'une saisie (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 2 ; décisions de David du 2026-10-11 :
 * 4 décimales, « = » quand l'écriture décimale est exacte, rien sur un
 * résultat déjà entier ou décimal).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, runAction, type CalcResult } from '../calcul';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function alternativeOf(result: CalcResult) {
	return result.kind === 'calcul' || result.kind === 'commande' ? result.alternative : undefined;
}

describe('la valeur approchée d’un calcul', () => {
	it('un nombre exact irrationnel : la valeur approchée, virgule à la française', () => {
		const alternative = alternativeOf(runInput(session(), '\\sqrt{2}/2'));

		expect(alternative).toEqual({ label: 'Valeur approchée', latex: '\\approx 0{,}7071' });
	});

	it('une fraction dont l’écriture décimale est courte : « = »', () => {
		expect(alternativeOf(runInput(session(), '1/4'))?.latex).toBe('= 0{,}25');
	});

	it('rien sur un entier, une expression littérale, un refus', () => {
		expect(alternativeOf(runInput(session(), '3'))).toBeUndefined();
		expect(alternativeOf(runInput(session(), '2x+1'))).toBeUndefined();
		expect(alternativeOf(runInput(session(), 'x = 3'))).toBeUndefined();
	});

	// L'arbre d'une grandeur a perdu son unité : sa valeur approchée serait fausse
	it('rien sur une grandeur avec unité', () => {
		const result = runInput(session(), '12 km + 300 m');
		expect(result.kind).toBe('calcul');

		expect(alternativeOf(result)).toBeUndefined();
	});

	it('en mode décimal, le bouton rend la valeur exacte', () => {
		const s = session();
		runInput(s, '.mode décimal');

		const alternative = alternativeOf(runInput(s, '\\sqrt{2}/2'));

		expect(alternative?.label).toBe('Valeur exacte');
		expect(alternative?.latex).toContain('\\sqrt{2}');
	});

	it('une fonction du panneau évaluée : comme un calcul', () => {
		const s = session();
		runInput(s, 'f(x) = \\sqrt{x}');

		expect(alternativeOf(runInput(s, 'f(2)'))?.latex).toBe('\\approx 1{,}4142');
	});
});

describe('l’image d’un nombre calculée depuis la carte', () => {
	it('a son bouton ≈, comme `f(2)` tapé', () => {
		const s = session();
		runInput(s, 'f(x) = \\sqrt{x}');

		const outcome = runAction(s, 'image', 'f', '2');

		expect(outcome.ok && outcome.alternative?.latex).toBe('\\approx 1{,}4142');
	});
});

describe('les valeurs approchées des solutions', () => {
	it('`.résoudre x^2=2` : l’ensemble en valeurs approchées', () => {
		const alternative = alternativeOf(runInput(session(), '.résoudre x^2=2'));

		expect(alternative).toEqual({
			label: 'Valeur approchée',
			latex: 'S \\approx \\left\\{ -1{,}4142 \\,;\\, 1{,}4142 \\right\\}'
		});
	});

	// Revue : les étapes écrivaient les solutions dans leur ordre, le bouton les
	// triait — la ligne et le bouton ne se correspondaient plus
	it('les valeurs approchées suivent l’ordre et la forme de la ligne', () => {
		const result = runInput(session(), '.résoudre -x^2+x+1=0');
		expect(result.kind === 'commande' && result.latex).toMatch(/^S = /);

		expect(alternativeOf(result)?.latex).toBe(
			'S \\approx \\left\\{ 1{,}6180 \\,;\\, -0{,}6180 \\right\\}'
		);
	});

	it('une solution double écrite en ensemble reste un ensemble', () => {
		const result = runInput(session(), '.résoudre (x-\\sqrt{2})^2=0');
		expect(result.kind === 'commande' && result.latex).toMatch(/^S = /);

		expect(alternativeOf(result)?.latex).toBe('S \\approx \\left\\{ 1{,}4142 \\right\\}');
	});

	it('`.résoudre … dans [0 ; 2π]` a son bouton', () => {
		const alternative = alternativeOf(
			runInput(session(), '.résoudre \\cos(x)=0,3 dans [0 ; 2\\pi]')
		);

		expect(alternative?.latex).toMatch(
			/^S \\approx \\left\\{ 1{,}2661 \\,;\\, 5{,}0171 \\right\\}$/
		);
	});

	it('rien quand les solutions sont entières', () => {
		const result = runInput(session(), '.résoudre x^2=4');
		expect(result.kind).toBe('commande');

		expect(alternativeOf(result)).toBeUndefined();
	});

	// « Le bouton et la commande doivent dire la MÊME chose »
	it('« Résoudre f(x) = 0 » du panneau donne la même valeur approchée', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 2');

		const outcome = runAction(s, 'solve', 'f');

		expect(outcome.ok && outcome.alternative?.latex).toBe(
			'S \\approx \\left\\{ -1{,}4142 \\,;\\, 1{,}4142 \\right\\}'
		);
	});
});
