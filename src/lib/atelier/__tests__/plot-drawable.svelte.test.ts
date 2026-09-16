/**
 * Une courbe qui se dit tracée doit être DESSINABLE.
 *
 * ⚠️ **Le test qui a laissé passer le défaut.** Celui du lot 2 vérifiait la
 * chaîne transmise au grapheur (`'a*x'`), pas que la courbe apparaisse. J'ai
 * suivi cette preuve pour « corriger » une régression qui n'en était pas une :
 * le grapheur reçoit `a*x`, le parse sans erreur, et ne dessine RIEN — ses
 * `parameters` sont vides, donc `a` est une variable libre.
 *
 * Vu à l'écran : `h(x) = ax` avec `a = 1`, marqué « Retirer du graphe », et un
 * graphe vide.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { isExplicitFunction } from '$lib/grapheur/types';
import { getVariables } from '$lib/mathAST/eval/substitute';

/**
 * Ce qu'il faut vraiment vérifier : la courbe n'a **aucune variable libre** en
 * dehors de `x`. Sans ça, le grapheur ne peut rien calculer, et il le fait en
 * silence.
 */
function drawable(graph: GrapheurStore): boolean {
	return graph.functions.every((curve) => {
		if (!isExplicitFunction(curve) || curve.ast === undefined) return false;
		const free = [...getVariables(curve.ast)].filter((name) => name !== 'x');
		return free.length === 0;
	});
}

function atelierOf(objects: Array<[string, string, 'function' | 'value']>) {
	const atelier = new Atelier();
	for (const [name, definition, kind] of objects) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

describe('ce qui est tracé est dessinable', () => {
	it('une fonction qui cite une valeur', () => {
		const atelier = atelierOf([
			['h', 'a*x', 'function'],
			['a', '1', 'value']
		]);
		const graph = new GrapheurStore(null);
		atelier.setPlotted('h', true);

		syncPlots(atelier, graph);

		expect(drawable(graph)).toBe(true);
	});

	it('et la courbe suit la valeur quand elle change', () => {
		const atelier = atelierOf([
			['h', 'a*x', 'function'],
			['a', '1', 'value']
		]);
		const graph = new GrapheurStore(null);
		atelier.setPlotted('h', true);
		syncPlots(atelier, graph);

		atelier.update('a', '5', 'text');
		syncPlots(atelier, graph);

		const curve = graph.functions[0];
		expect(isExplicitFunction(curve) && curve.latex).toContain('5');
	});

	it('une fonction ordinaire reste dessinable', () => {
		const atelier = atelierOf([['f', 'x^2-3x+1', 'function']]);
		const graph = new GrapheurStore(null);
		atelier.setPlotted('f', true);

		syncPlots(atelier, graph);

		expect(drawable(graph)).toBe(true);
	});

	it('une dérivée aussi', () => {
		const atelier = atelierOf([
			['f', 'x^2-3x+1', 'function'],
			['g', "f'", 'function']
		]);
		const graph = new GrapheurStore(null);
		atelier.setPlotted('g', true);

		syncPlots(atelier, graph);

		expect(drawable(graph)).toBe(true);
	});

	it('une fonction qui en cite une autre aussi', () => {
		const atelier = atelierOf([
			['f', 'x^2', 'function'],
			['k', 'f(x) + 1', 'function']
		]);
		const graph = new GrapheurStore(null);
		atelier.setPlotted('k', true);

		syncPlots(atelier, graph);

		expect(drawable(graph)).toBe(true);
	});
});

describe('une dérivée illisible le dit en français', () => {
	/**
	 * ⛔ **Ces tests disaient l'inverse hier, et ils avaient tort.**
	 *
	 * Ils vérifiaient que `k'` est REFUSÉ quand `k(x) = bx` attend `b`. David
	 * l'a relevé : `k'` vaut `b`, et se calcule sans qu'on sache ce que `b`
	 * vaut. Mon garde confondait « ne peut pas être évalué » et « ne peut pas
	 * être dérivé ».
	 *
	 * Ce qui reste vrai : une définition **illisible** n'a pas de dérivée.
	 */
	it('refuse la dérivée d’un objet en erreur', async () => {
		const { runInput } = await import('../calcul');
		const { WebReplEngine } = await import('$lib/mathAST/cli/web/web-repl-engine');
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		session.atelier.create({ kind: 'function', name: 'k', definition: 'x^^2' }, 'text');

		const result = runInput(session, "k'");

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).not.toMatch(/Unexpected token/);
	});

	it('mais calcule celle d’un objet en attente d’un paramètre', async () => {
		const { runInput } = await import('../calcul');
		const { WebReplEngine } = await import('$lib/mathAST/cli/web/web-repl-engine');
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		session.atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');

		const result = runInput(session, "k'");

		expect(result.kind).not.toBe('refus');
		expect(result.kind === 'calcul' && result.output.replace(/\s/g, '')).toBe('b');
	});

	it('mais laisse passer la dérivée d’un objet sain', async () => {
		const { runInput } = await import('../calcul');
		const { WebReplEngine } = await import('$lib/mathAST/cli/web/web-repl-engine');
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		session.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');

		expect(runInput(session, "f'(2)").kind).toBe('calcul');
	});
});
