/**
 * Fréquences d'une variable qualitative (diagrammes en barres, circulaire).
 *
 * Chantier outils statistiques, lot 2 : les blocs ubumark ne recalculent pas
 * les fréquences, ils les demandent au module statistique.
 */

import { describe, it, expect } from 'vitest';
import { categoryFrequencies } from '../describe';

describe('fréquences de catégories', () => {
	it('effectif / effectif total, dans l’ordre donné', () => {
		const outcome = categoryFrequencies([14, 6, 10]);

		expect(outcome?.ok).toBe(true);
		const frequencies = outcome?.ok ? outcome.value : [];
		[14 / 30, 6 / 30, 10 / 30].forEach((f, i) => expect(frequencies[i]).toBeCloseTo(f, 12));
	});

	it('pourcentages : mêmes proportions', () => {
		const outcome = categoryFrequencies([35, 65]);

		expect(outcome?.ok && outcome.value).toEqual([0.35, 0.65]);
	});

	it('aucune catégorie : une absence', () => {
		expect(categoryFrequencies([])).toBeNull();
	});

	it('refuse un total nul ou un effectif invalide', () => {
		expect(categoryFrequencies([0, 0])?.ok).toBe(false);
		expect(categoryFrequencies([1, -2])?.ok).toBe(false);
		expect(categoryFrequencies([1, Number.NaN])?.ok).toBe(false);
	});
});
