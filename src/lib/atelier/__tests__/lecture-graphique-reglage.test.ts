/**
 * La lecture graphique est un réglage d'affichage de la courbe : rangé avec
 * l'objet, relu d'un ancien atelier, reporté vers le grapheur avec les
 * abscisses lues dans la console (lot 3 bis de la refonte de l'Atelier).
 */
import { describe, expect, it } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { isExplicitFunction, type ExplicitFunction } from '$lib/grapheur/types';
import { ATELIER_STORAGE_KEY, loadAtelier, saveAtelier } from '../persistence';
import { isFunction } from '../types';

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, v)
	};
}

function withPlotted(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
	atelier.setPlotted('f', true);
	return atelier;
}

function displayOf(atelier: Atelier, name: string) {
	const object = atelier.get(name);
	if (!object || !isFunction(object)) throw new Error(`${name} n'est pas une fonction`);
	return object.display;
}

function onlyCurve(graph: GrapheurStore): ExplicitFunction {
	const curves = graph.functions.filter(isExplicitFunction);
	expect(curves).toHaveLength(1);
	return curves[0];
}

describe('le réglage « Lecture graphique »', () => {
	it('éteint par défaut', () => {
		expect(displayOf(withPlotted(), 'f')?.showReading).toBe(false);
	});

	it('rangé et relu à l’identique', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const storage = memoryStorage();
		saveAtelier(storage, atelier.serialize());
		const loaded = loadAtelier(storage);
		expect(loaded.kind).toBe('loaded');
		const fresh = new Atelier();
		if (loaded.kind === 'loaded') fresh.restore(loaded.state);
		expect(displayOf(fresh, 'f')?.showReading).toBe(true);
	});

	it('ne coûte rien éteint : le rangement compact l’omet', () => {
		const stored = withPlotted().serialize().objects[0] as { display?: object };
		expect(stored.display).not.toHaveProperty('showReading');
	});

	it('un atelier rangé avant ce réglage se relit, lecture éteinte', () => {
		const storage = memoryStorage();
		storage.setItem(
			ATELIER_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				objects: [
					{
						name: 'f',
						kind: 'function',
						definition: 'x^2',
						plotted: true,
						display: { color: 'curve-3', lineStyle: 'solid', tangentAt: 1 }
					}
				]
			})
		);
		const loaded = loadAtelier(storage);
		expect(loaded.kind).toBe('loaded');
		const fresh = new Atelier();
		if (loaded.kind === 'loaded') fresh.restore(loaded.state);
		expect(displayOf(fresh, 'f')).toMatchObject({ tangentAt: 1, showReading: false });
	});
});

describe('la lecture reportée vers le grapheur', () => {
	it('allumée : la courbe porte son nom et les abscisses lues dans la console', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map([['f', [1, 2]]]));
		expect(onlyCurve(graph).reading).toEqual({ name: 'f', at: [1, 2] });
	});

	it('éteinte : rien, même avec des lectures dans la console', () => {
		const atelier = withPlotted();
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map([['f', [1]]]));
		expect(onlyCurve(graph).reading).toBeUndefined();
	});

	it('allumée sans calcul : le point glissant seul (aucune abscisse de console)', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map());
		expect(onlyCurve(graph).reading).toEqual({ name: 'f', at: [] });
	});

	it('une synchronisation sans lectures garde celles déjà posées', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map([['f', [3]]]));
		syncPlots(atelier, graph);
		expect(onlyCurve(graph).reading).toEqual({ name: 'f', at: [3] });
	});

	it('éteindre l’option efface les lectures', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map([['f', [3]]]));
		atelier.setDisplay('f', { showReading: false });
		syncPlots(atelier, graph, new Map([['f', [3]]]));
		expect(onlyCurve(graph).reading).toBeUndefined();
	});

	it('idempotente : rien n’est réécrit quand rien n’a changé', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { showReading: true });
		const graph = new GrapheurStore();
		syncPlots(atelier, graph, new Map([['f', [1]]]));
		const before = graph.functions;
		syncPlots(atelier, graph, new Map([['f', [1]]]));
		expect(graph.functions).toBe(before);
	});
});
