/**
 * Atelier — une fonction définie sur un intervalle, lot 3 (le tracé, I5).
 *
 * Phase 0 `docs/wip/atelier-intervalle-phase0.md`. L'atelier passe au grapheur
 * l'ensemble de la fonction sous forme numérique (`ExplicitFunction.restriction`) ;
 * sans ensemble, rien ne change.
 */

import { describe, it, expect } from 'vitest';
import { CalcDesk } from '../desk.svelte';
import { Atelier } from '../atelier.svelte';
import { plotRestrictionOf } from '../interval';
import { syncPlots } from '../plot-sync';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction, type ExplicitFunction } from '$lib/grapheur/types';

function desk(...definitions: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const definition of definitions) {
		d.submit(definition);
		if (d.entries.at(-1)?.failed) throw new Error(`définition refusée : ${definition}`);
	}
	return d;
}

/** La courbe posée pour `name`, après synchronisation. */
function plotted(d: CalcDesk, graph: GrapheurStore, name: string): ExplicitFunction {
	d.atelier.setPlotted(name, true);
	syncPlots(d.atelier, graph);
	const curves = graph.functions.filter(isExplicitFunction);
	const found = curves.at(-1);
	if (found === undefined) throw new Error(`${name} non tracée`);
	return found;
}

describe('l’ensemble, en morceaux numériques', () => {
	it('x² sur [0;+∞[', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([
			{ from: 0, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});

	it('x sur [−1;1] ∪ [2;3] : deux morceaux', () => {
		const d = desk('h(x) = x sur [-1;1] \\cup [2;3]');
		expect(plotRestrictionOf(d.atelier.get('h'))).toEqual([
			{ from: -1, to: 1, fromClosed: true, toClosed: true },
			{ from: 2, to: 3, fromClosed: true, toClosed: true }
		]);
	});

	it('une borne exacte (π) devient un nombre', () => {
		const d = desk('g(x) = \\sin(x) sur [0;\\pi]');
		expect(plotRestrictionOf(d.atelier.get('g'))?.[0]?.to).toBeCloseTo(Math.PI);
	});

	it('sans ensemble : rien', () => {
		const d = desk('f(x) = x^2');
		expect(plotRestrictionOf(d.atelier.get('f'))).toBeUndefined();
	});
});

describe('le grapheur reçoit l’ensemble', () => {
	it('k = 1/x sur ]0;5] : la courbe porte sa restriction', () => {
		const d = desk('k(x) = 1/x sur ]0;5]');
		const graph = new GrapheurStore();
		expect(plotted(d, graph, 'k').restriction).toEqual([
			{ from: 0, to: 5, fromClosed: false, toClosed: true }
		]);
	});

	it('sans ensemble : aucune restriction', () => {
		const d = desk('f(x) = x^2');
		const graph = new GrapheurStore();
		expect(plotted(d, graph, 'f').restriction).toBeUndefined();
	});

	it('suit l’ensemble quand il change, et le retire (I6)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		const graph = new GrapheurStore();
		plotted(d, graph, 'f');
		d.submit('f(x) = x^2 sur [1;2]');
		syncPlots(d.atelier, graph);
		expect(graph.functions.filter(isExplicitFunction)[0].restriction).toEqual([
			{ from: 1, to: 2, fromClosed: true, toClosed: true }
		]);
		d.submit('f(x) = x^2');
		syncPlots(d.atelier, graph);
		expect(graph.functions.filter(isExplicitFunction)[0].restriction).toBeUndefined();
	});

	it('une seconde synchronisation n’écrit rien (idempotence)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		const graph = new GrapheurStore();
		plotted(d, graph, 'f');
		const before = graph.functions;
		syncPlots(d.atelier, graph);
		expect(graph.functions).toBe(before);
	});

	it('f′, qui hérite de l’ensemble de f, se trace restreinte aussi', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.dériver f');
		const graph = new GrapheurStore();
		expect(plotted(d, graph, "f'").restriction).toEqual([
			{ from: 0, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});
});
