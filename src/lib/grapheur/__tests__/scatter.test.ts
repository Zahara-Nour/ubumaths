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
import { isScatter, isExplicitFunction, isSequence, plottableStateSchema } from '../types';
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

describe('le nuage se range et se relit', () => {
	it('passe le schéma de persistance', () => {
		const parsed = plottableStateSchema.safeParse({
			id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
			type: 'scatter',
			label: 'L / M',
			xs: [1, 2, 3],
			ys: [2, 4, 6],
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(true);
	});

	it('refuse une valeur non finie plutôt que de la ranger', () => {
		const parsed = plottableStateSchema.safeParse({
			id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
			type: 'scatter',
			label: 'L / M',
			xs: [1, Infinity],
			ys: [2, 4],
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(false);
	});

	it('accepte un nuage vide — une liste pas encore remplie n’est pas une faute', () => {
		const parsed = plottableStateSchema.safeParse({
			id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
			type: 'scatter',
			label: 'L / M',
			xs: [],
			ys: [],
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(true);
	});

	// D8 : le plafond d'une liste vaut aussi pour ce qui est tracé
	it('refuse un nuage au-delà du plafond', () => {
		const many = Array.from({ length: 201 }, (_, i) => i);
		const parsed = plottableStateSchema.safeParse({
			id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
			type: 'scatter',
			label: 'L / M',
			xs: many,
			ys: many,
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(false);
	});

	it('refuse un identifiant qui n’est pas un UUID, comme les autres traçables', () => {
		const parsed = plottableStateSchema.safeParse({
			id: 'nuage-1',
			type: 'scatter',
			label: 'L / M',
			xs: [1],
			ys: [2],
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(false);
	});

	it('n’a pas cassé la relecture d’une fonction', () => {
		const parsed = plottableStateSchema.safeParse({
			id: '9f8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
			type: 'explicit',
			latex: 'x^2',
			variable: 'x',
			showDerivative: false,
			tangentAt: null,
			integral: null,
			showOsculating: false,
			showArcLength: false,
			color: '#3b82f6',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid'
		});

		expect(parsed.success).toBe(true);
	});
});
