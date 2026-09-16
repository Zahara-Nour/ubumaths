/**
 * Une dérivée se trace, se cite, et se calcule — partout.
 *
 * ⚠️ **La même cause, corrigée une quatrième fois.** À chaque lot, un endroit
 * recevait le NOM (`f'`) là où il attend l'EXPRESSION (`2x-3`) :
 *
 * | Où | Symptôme |
 * | --- | --- |
 * | les commandes tapées | `.dériver f` rendait 0 |
 * | le moteur (`syncEngine`) | `g(3)` : « Cannot evaluate derivative function » |
 * | **le grapheur** (`plot-sync`) | `g` marqué tracé, **aucune courbe** |
 * | **les bindings** (`bindingsOf`) | une fonction citant `g` reçoit `f'` |
 *
 * Ce fichier garde les deux derniers.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { expressionOf } from '../engine';
import { runInput } from '../calcul';

function atelierWithDerivative() {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');
	atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');
	return atelier;
}

/** Les expressions réellement confiées au grapheur. */
const drawn = (graph: GrapheurStore) => graph.functions.map((f) => ('latex' in f ? f.latex : ''));

describe('une dérivée se trace', () => {
	it('le grapheur reçoit l’expression, pas la référence', () => {
		const atelier = atelierWithDerivative();
		const graph = new GrapheurStore(null);
		atelier.setPlotted('g', true);

		syncPlots(atelier, graph);

		expect(drawn(graph).join('').replace(/\s/g, '')).toContain('2x-3');
	});

	it('et jamais « f’ » tel quel', () => {
		const atelier = atelierWithDerivative();
		const graph = new GrapheurStore(null);
		atelier.setPlotted('g', true);

		syncPlots(atelier, graph);

		expect(drawn(graph).join('')).not.toMatch(/f['’]/);
	});

	it('la courbe suit quand f change', () => {
		const atelier = atelierWithDerivative();
		const graph = new GrapheurStore(null);
		atelier.setPlotted('g', true);
		syncPlots(atelier, graph);

		atelier.update('f', 'x^3', 'text');
		syncPlots(atelier, graph);

		expect(drawn(graph).join('').replace(/\s/g, '')).toContain('3x^2');
	});

	it('la courbe disparaît si f disparaît', () => {
		const atelier = atelierWithDerivative();
		const graph = new GrapheurStore(null);
		atelier.setPlotted('g', true);
		syncPlots(atelier, graph);

		atelier.remove('f');
		syncPlots(atelier, graph);

		// `g` est en attente : sa courbe est masquée, pas détruite (règle du lot 2)
		expect(graph.functions.every((c) => !c.visible)).toBe(true);
	});

	/**
	 * ⚠️ **Le grapheur garde ses paramètres.** Ma première correction envoyait
	 * l'expression ENTIÈREMENT substituée : `a*x` devenait `1*x`, et le curseur
	 * `a` du grapheur ne faisait plus rien bouger. Un test du lot 2 l'a attrapé.
	 *
	 * Le grapheur sait résoudre ses paramètres — il ne sait pas ce qu'est `f'`.
	 * On ne développe donc que les dérivées.
	 */
	it('ne fige pas les paramètres pilotés par un curseur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const graph = new GrapheurStore(null);
		atelier.setPlotted('f', true);

		syncPlots(atelier, graph);

		expect(drawn(graph).join('')).toContain('a');
	});

	it('une fonction ordinaire se trace toujours', () => {
		const atelier = atelierWithDerivative();
		const graph = new GrapheurStore(null);
		atelier.setPlotted('f', true);

		syncPlots(atelier, graph);

		expect(drawn(graph).join('')).toContain('x^2-3x+1');
	});
});

describe('une dérivée se cite', () => {
	it('une fonction qui cite g reçoit l’expression développée', () => {
		const atelier = atelierWithDerivative();
		atelier.create({ kind: 'function', name: 'h', definition: 'g(x) + 1' }, 'text');

		const expression = expressionOf(atelier, 'h');

		expect(expression.ok).toBe(true);
		expect(expression.ok && expression.expression).not.toMatch(/f['’]/);
		expect(expression.ok && expression.expression.replace(/\s/g, '')).toContain('2x-3');
	});

	it('et s’évalue', () => {
		const session = { atelier: atelierWithDerivative(), engine: new WebReplEngine() };
		session.atelier.create({ kind: 'function', name: 'h', definition: 'g(x) + 1' }, 'text');

		const result = runInput(session, 'h(4)');

		// g(4) = 5, donc h(4) = 6
		expect(result.kind === 'calcul' && result.output).toBe('6');
	});

	it('même à deux niveaux', () => {
		const atelier = atelierWithDerivative();
		atelier.create({ kind: 'function', name: 'h', definition: 'g(x)' }, 'text');
		atelier.create({ kind: 'function', name: 'k', definition: 'h(x) * 2' }, 'text');

		const expression = expressionOf(atelier, 'k');

		expect(expression.ok && expression.expression).not.toMatch(/f['’]/);
	});
});
