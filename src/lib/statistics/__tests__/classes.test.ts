/**
 * Série regroupée en classes (programme de 2de, `2-160` et `2-161`).
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/wip/outils-statistiques-progress.md`, lot 1, partie C).
 *
 * Répartition supposée uniforme dans chaque classe : la moyenne se calcule
 * avec les centres, la médiane s'estime par interpolation linéaire dans la
 * classe médiane.
 */

import { describe, it, expect } from 'vitest';
import { estimateClassQuantile, summarizeClasses, type StatClass } from '../classes';

// =============================================================================
// Helpers
// =============================================================================

const TRAJETS: readonly StatClass[] = [
	{ lower: 0, upper: 10, count: 12 },
	{ lower: 10, upper: 20, count: 18 },
	{ lower: 20, upper: 40, count: 10 }
];

function summaryOf(classes: readonly StatClass[]) {
	const outcome = summarizeClasses(classes);
	if (outcome === null || !outcome.ok)
		throw new Error(`échec inattendu : ${JSON.stringify(outcome)}`);
	return outcome.value;
}

function failureOf(classes: readonly StatClass[]) {
	const outcome = summarizeClasses(classes);
	if (outcome === null || outcome.ok) throw new Error('un échec était attendu');
	return outcome.message;
}

// =============================================================================
// Tests
// =============================================================================

describe('C. série en classes', () => {
	it('moyenne calculée avec les centres des classes', () => {
		// (5 × 12 + 15 × 18 + 30 × 10) / 40
		expect(summaryOf(TRAJETS).mean).toBeCloseTo(15.75, 10);
	});

	it('effectif total', () => {
		expect(summaryOf(TRAJETS).total).toBe(40);
	});

	it('classe médiane : la première qui atteint 50 % des effectifs cumulés', () => {
		expect(summaryOf(TRAJETS).medianClassIndex).toBe(1);
	});

	it('médiane estimée par interpolation dans la classe médiane', () => {
		// 10 + (20 − 12) / 18 × 10 = 130/9
		expect(summaryOf(TRAJETS).estimatedMedian).toBeCloseTo(130 / 9, 10);
	});

	it('50 % atteint pile en fin de classe : cette classe, et sa borne droite', () => {
		const s = summaryOf([
			{ lower: 0, upper: 10, count: 20 },
			{ lower: 10, upper: 20, count: 20 }
		]);

		expect(s.medianClassIndex).toBe(0);
		expect(s.estimatedMedian).toBe(10);
	});

	// Revue du lot 1 : même piège flottant que pour les séries à effectifs
	it('pourcentages décimaux : 50 % atteint pile en fin de classe malgré l’arrondi', () => {
		const counts = [33.8, 15.8, 0.4, 39.5, 10.5];
		const s = summaryOf(counts.map((count, i) => ({ lower: i, upper: i + 1, count })));

		expect(s.medianClassIndex).toBe(2);
		expect(s.estimatedMedian).toBeCloseTo(3, 10);
	});

	it('amplitudes inégales : la densité vaut effectif / amplitude', () => {
		const rows = summaryOf(TRAJETS).classes;

		expect(rows.map((r) => r.width)).toEqual([10, 10, 20]);
		expect(rows.map((r) => r.density)).toEqual([1.2, 1.8, 0.5]);
	});

	it('fréquences et fréquences cumulées croissantes', () => {
		const rows = summaryOf(TRAJETS).classes;

		expect(rows.map((r) => r.frequency)).toEqual([0.3, 0.45, 0.25]);
		const cumulative = rows.map((r) => r.cumulativeFrequency);
		[0.3, 0.75, 1].forEach((expected, i) => expect(cumulative[i]).toBeCloseTo(expected, 10));
	});

	it('aucune classe : une absence', () => {
		expect(summarizeClasses([])).toBeNull();
	});

	it('refuse une classe dont la borne gauche n’est pas inférieure à la droite, et la situe', () => {
		const message = failureOf([
			{ lower: 0, upper: 10, count: 3 },
			{ lower: 10, upper: 10, count: 2 }
		]);

		expect(message).toMatch(/classe n° 2/);
	});

	it('refuse deux classes qui ne se suivent pas, et les nomme', () => {
		const message = failureOf([
			{ lower: 0, upper: 10, count: 3 },
			{ lower: 12, upper: 20, count: 2 }
		]);

		expect(message).toContain('[0 ; 10[');
		expect(message).toContain('[12 ; 20[');
	});

	it('refuse deux classes qui se chevauchent', () => {
		const message = failureOf([
			{ lower: 0, upper: 10, count: 3 },
			{ lower: 5, upper: 20, count: 2 }
		]);

		expect(message).toContain('[5 ; 20[');
	});

	it('écrit les bornes décimales avec une virgule dans les messages', () => {
		const message = failureOf([
			{ lower: 0, upper: 2.5, count: 3 },
			{ lower: 3.5, upper: 5, count: 2 }
		]);

		expect(message).toContain('[0 ; 2,5[');
	});

	it('refuse un effectif négatif ou un effectif total nul', () => {
		expect(failureOf([{ lower: 0, upper: 10, count: -1 }])).toMatch(/effectif/i);
		expect(failureOf([{ lower: 0, upper: 10, count: 0 }])).toMatch(/effectif total nul/i);
	});
});

// Lot 3 : polygone des fréquences cumulées
describe('fréquences cumulées décroissantes et quantiles estimés', () => {
	it('fréquences cumulées décroissantes : part des données ≥ borne gauche', () => {
		const rows = summaryOf(TRAJETS).classes;
		const decreasing = rows.map((r) => r.decreasingCumulativeFrequency);

		[1, 0.7, 0.25].forEach((expected, i) => expect(decreasing[i]).toBeCloseTo(expected, 10));
	});

	function quantile(percent: number) {
		const outcome = estimateClassQuantile(TRAJETS, percent);
		if (outcome === null || !outcome.ok) throw new Error(JSON.stringify(outcome));
		return outcome.value;
	}

	it('Q1 estimé par interpolation linéaire dans sa classe', () => {
		// 25 % de 40 = 10, dans [0 ; 10[ (12) : 0 + 10/12 × 10
		expect(quantile(25)).toBeCloseTo(100 / 12, 10);
	});

	it('médiane estimée : la même que summarizeClasses', () => {
		expect(quantile(50)).toBeCloseTo(summaryOf(TRAJETS).estimatedMedian, 10);
	});

	it('Q3 atteint pile en fin de classe : la borne droite', () => {
		// 75 % de 40 = 30 = 12 + 18
		expect(quantile(75)).toBe(20);
	});

	it('refuse un pourcentage hors de ]0 ; 100[', () => {
		expect(estimateClassQuantile(TRAJETS, 0)?.ok).toBe(false);
		expect(estimateClassQuantile(TRAJETS, 100)?.ok).toBe(false);
	});

	it('aucune classe : une absence', () => {
		expect(estimateClassQuantile([], 50)).toBeNull();
	});
});
