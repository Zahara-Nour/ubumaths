/**
 * Le nuage de points — décision Q3, tranchée le 2026-09-16.
 *
 * Un troisième traçable, à côté de la fonction et de la suite. Il vit dans le
 * grapheur et non dans un repère à part, parce que **superposer le nuage et sa
 * droite d'ajustement est tout l'intérêt** : deux repères séparés rendraient le
 * geste impossible.
 *
 * ⚠️ Le grapheur savait déjà dessiner un nuage — mais `(n, uₙ)`, abscisse = le
 * rang, ordonnée = une formule. Aucun traçable ne prenait deux séries de
 * nombres arbitraires.
 */

import { describe, it, expect } from 'vitest';
import { isScatter, isExplicitFunction, isSequence } from '../types';
import type { ScatterPlottable } from '../types';

function scatter(overrides: Partial<ScatterPlottable> = {}): ScatterPlottable {
	return {
		id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
		type: 'scatter',
		color: '#d946ef',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid',
		label: 'L / M',
		xs: [1, 2, 3],
		ys: [2, 4, 6],
		...overrides
	};
}

describe('le nuage comme troisième traçable', () => {
	it('se reconnaît', () => {
		expect(isScatter(scatter())).toBe(true);
	});

	// ⚠️ La boucle de rendu fait `{#if explicit} … {:else} SequencePlot` : un
	// troisième type tomberait dans le `else` et serait dessiné comme une suite.
	it('n’est ni une fonction ni une suite', () => {
		const nuage = scatter();

		expect(isExplicitFunction(nuage)).toBe(false);
		expect(isSequence(nuage)).toBe(false);
	});

	it('porte ses deux séries', () => {
		const nuage = scatter();

		expect(nuage.xs).toEqual([1, 2, 3]);
		expect(nuage.ys).toEqual([2, 4, 6]);
	});
});
