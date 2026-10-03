/**
 * Un graphique sauvegardé avant la nouvelle palette est traduit au chargement.
 *
 * Spécification : docs/wip/grapheur-couleurs-theme-progress.md (7, 12).
 */

import { afterEach, describe, it, expect } from 'vitest';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';

const KEY = 'test-grapheur-migration';

/** Un état tel que l'écrivait l'ancien grapheur */
function legacyState(colors: string[], lineStyle = 'solid') {
	return {
		version: 2,
		viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
		showGrid: true,
		parameters: [],
		functions: colors.map((color, i) => ({
			id: `0000000${i}-0000-4000-8000-00000000000${i}`,
			type: 'explicit',
			latex: `x+${i}`,
			color,
			visible: true,
			lineWidth: 2,
			lineStyle,
			variable: 'x'
		}))
	};
}

describe('chargement d’une ancienne sauvegarde', () => {
	afterEach(() => localStorage.removeItem(KEY));

	it('traduit bleu, rouge, vert, violet, orange vers 5 places distinctes', () => {
		localStorage.setItem(
			KEY,
			JSON.stringify(legacyState(['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c']))
		);

		const g = new GrapheurStore(KEY);

		expect(g.functions.map((f) => [f.color, f.lineStyle])).toEqual([
			['curve-1', 'solid'],
			['curve-2', 'solid'],
			['curve-3', 'solid'],
			['curve-4', 'solid'],
			['curve-1', 'dashed']
		]);
	});

	it('donne à la courbe suivante une place encore libre', () => {
		localStorage.setItem(KEY, JSON.stringify(legacyState(['#2563eb', '#dc2626'])));

		const g = new GrapheurStore(KEY);
		g.addFunction('x^2');

		expect([g.functions[2].color, g.functions[2].lineStyle]).toEqual(['curve-3', 'solid']);
	});

	it('ouvre quand même le grapheur si la sauvegarde est illisible', () => {
		localStorage.setItem(KEY, '{ pas du json');

		const g = new GrapheurStore(KEY);

		expect(g.functions).toEqual([]);
	});
});
