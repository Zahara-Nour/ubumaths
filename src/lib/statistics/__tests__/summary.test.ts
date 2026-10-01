/**
 * Indicateurs d'une série statistique : brute (A) ou à effectifs (B).
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/wip/outils-statistiques-progress.md`, lot 1).
 *
 * ⚠️ **Quartiles du programme de 2de** : Q1 est la plus petite valeur telle
 * qu'au moins 25 % des données lui soient inférieures ou égales. Ce n'est PAS
 * la méthode des calculatrices TI / Casio (médiane de chaque moitié).
 */

import { describe, it, expect } from 'vitest';
import { summarizeList, summarizeTable } from '../describe';
import { STATISTICS_LIMITS } from '../limits';

// =============================================================================
// Helpers
// =============================================================================

function listSummary(values: readonly number[]) {
	const outcome = summarizeList(values);
	if (outcome === null || !outcome.ok)
		throw new Error(`échec inattendu : ${JSON.stringify(outcome)}`);
	return outcome.value;
}

function tableOf(values: readonly number[], counts: readonly number[]) {
	const outcome = summarizeTable(values, counts);
	if (outcome === null || !outcome.ok)
		throw new Error(`échec inattendu : ${JSON.stringify(outcome)}`);
	return outcome.value;
}

function failureOf(outcome: ReturnType<typeof summarizeList> | ReturnType<typeof summarizeTable>) {
	if (outcome === null || outcome.ok) throw new Error('un échec était attendu');
	return outcome.message;
}

// =============================================================================
// A. Série brute
// =============================================================================

describe('A. série brute — quartiles du programme', () => {
	it('effectif impair : Q1 et Q3 sont des valeurs de la série', () => {
		const s = listSummary([3, 7, 8, 5, 12, 14, 21, 13, 18]);

		expect(s.median).toBe(12);
		expect(s.q1).toBe(7);
		expect(s.q3).toBe(14);
		expect(s.iqr).toBe(7);
	});

	// Témoin : si l'implémentation suivait la calculatrice, ces valeurs sortiraient
	it('ne suit pas la méthode des calculatrices (6 et 16)', () => {
		const s = listSummary([3, 7, 8, 5, 12, 14, 21, 13, 18]);

		expect(s.q1).not.toBe(6);
		expect(s.q3).not.toBe(16);
	});

	it('effectif pair : médiane entre deux valeurs, quartiles sur une valeur', () => {
		const s = listSummary([1, 2, 3, 4, 5, 6, 7, 8]);

		expect(s.median).toBe(4.5);
		expect(s.q1).toBe(2);
		expect(s.q3).toBe(6);
	});

	it('déciles : D1 et D9', () => {
		const s = listSummary(Array.from({ length: 30 }, (_, i) => i + 1));

		expect(s.d1).toBe(3);
		expect(s.d9).toBe(27);
	});

	it('ne dépend pas de l’ordre de saisie', () => {
		const sorted = listSummary([3, 5, 7, 8, 12, 13, 14, 18, 21]);
		const shuffled = listSummary([21, 3, 13, 7, 18, 5, 14, 12, 8]);

		// Positions : exactes. Moyenne et variance : sommées dans l'ordre de
		// saisie (pour retrouver au bit près l'ancien `.stats`), donc à un
		// arrondi flottant près.
		for (const key of [
			'count',
			'median',
			'q1',
			'q3',
			'd1',
			'd9',
			'iqr',
			'min',
			'max',
			'range'
		] as const) {
			expect(shuffled[key], key).toBe(sorted[key]);
		}
		expect(shuffled.mean).toBeCloseTo(sorted.mean, 10);
		expect(shuffled.variance).toBeCloseTo(sorted.variance, 10);
	});

	it('une seule valeur : tout vaut cette valeur, la dispersion est nulle', () => {
		const s = listSummary([5]);

		expect([s.q1, s.median, s.q3, s.d1, s.d9]).toEqual([5, 5, 5, 5, 5]);
		expect(s.iqr).toBe(0);
		expect(s.variance).toBe(0);
		expect(s.range).toBe(0);
	});

	it('valeurs toutes égales : écart interquartile nul', () => {
		const s = listSummary([4, 4, 4]);

		expect([s.q1, s.median, s.q3]).toEqual([4, 4, 4]);
		expect(s.iqr).toBe(0);
	});

	it('série vide : une absence, pas une erreur', () => {
		expect(summarizeList([])).toBeNull();
	});

	it('refuse une valeur non finie, et la nomme', () => {
		expect(failureOf(summarizeList([1, Number.NaN, 3]))).toMatch(/valeur n° 2/);
		expect(failureOf(summarizeList([1, 2, Number.POSITIVE_INFINITY]))).toMatch(/valeur n° 3/);
	});

	it(`refuse plus de ${STATISTICS_LIMITS.maxValues} valeurs`, () => {
		const tooMany = Array.from({ length: STATISTICS_LIMITS.maxValues + 1 }, () => 1);

		expect(failureOf(summarizeList(tooMany))).toMatch(/trop de valeurs/i);
	});
});

// =============================================================================
// B. Série à effectifs
// =============================================================================

describe('B. série à effectifs', () => {
	const values = [0, 1, 2, 3, 4];
	const counts = [5, 8, 4, 2, 1];

	it('indicateurs', () => {
		const { summary } = tableOf(values, counts);

		expect(summary.count).toBe(20);
		expect(summary.mean).toBeCloseTo(1.3, 10);
		expect(summary.variance).toBeCloseTo(1.21, 10);
		expect(summary.deviation).toBeCloseTo(1.1, 10);
		expect(summary.median).toBe(1);
		expect(summary.q1).toBe(0);
		expect(summary.q3).toBe(2);
		expect(summary.min).toBe(0);
		expect(summary.max).toBe(4);
	});

	it('fréquences', () => {
		const { rows } = tableOf(values, counts);

		expect(rows.map((r) => r.frequency)).toEqual([0.25, 0.4, 0.2, 0.1, 0.05]);
	});

	it('effectifs et fréquences cumulés croissants', () => {
		const { rows } = tableOf(values, counts);

		expect(rows.map((r) => r.cumulativeCount)).toEqual([5, 13, 17, 19, 20]);
		const cumulative = rows.map((r) => r.cumulativeFrequency);
		[0.25, 0.65, 0.85, 0.95, 1].forEach((expected, i) =>
			expect(cumulative[i]).toBeCloseTo(expected, 10)
		);
	});

	it('fréquences cumulées décroissantes', () => {
		const { rows } = tableOf(values, counts);

		const decreasing = rows.map((r) => r.decreasingCumulativeFrequency);
		[1, 0.75, 0.35, 0.15, 0.05].forEach((expected, i) =>
			expect(decreasing[i]).toBeCloseTo(expected, 10)
		);
	});

	it('donne les mêmes indicateurs que la série dépliée', () => {
		const unfolded = values.flatMap((value, i) => Array.from({ length: counts[i] }, () => value));
		const fromList = listSummary(unfolded);
		const { summary } = tableOf(values, counts);

		for (const key of [
			'count',
			'median',
			'q1',
			'q3',
			'd1',
			'd9',
			'iqr',
			'min',
			'max',
			'range'
		] as const) {
			expect(summary[key], key).toBe(fromList[key]);
		}
		expect(summary.mean).toBeCloseTo(fromList.mean, 10);
		expect(summary.variance).toBeCloseTo(fromList.variance, 10);
	});

	it('médiane d’un effectif pair tombant entre deux valeurs distinctes', () => {
		// 1 ; 2 | 3 ; 4 : 50 % atteint pile sur 2
		expect(tableOf([1, 2, 3, 4], [1, 1, 1, 1]).summary.median).toBe(2.5);
	});

	it('trie les lignes par valeur', () => {
		const { rows } = tableOf([3, 1, 2], [1, 2, 3]);

		expect(rows.map((r) => r.value)).toEqual([1, 2, 3]);
		expect(rows.map((r) => r.count)).toEqual([2, 3, 1]);
	});

	it('garde une valeur d’effectif nul dans le tableau, sans effet sur les indicateurs', () => {
		const { rows, summary } = tableOf([0, 1, 2, 10], [5, 8, 4, 0]);

		expect(rows).toHaveLength(4);
		expect(rows[3].frequency).toBe(0);
		expect(summary.max).toBe(2);
		expect(summary.range).toBe(2);
	});

	it('accepte des pourcentages comme des effectifs proportionnels', () => {
		const percentages = tableOf([1, 2, 3], [35, 25, 40]).summary;
		const proportional = tableOf([1, 2, 3], [7, 5, 8]).summary;

		expect(percentages.mean).toBeCloseTo(proportional.mean, 10);
		expect(percentages.median).toBe(proportional.median);
		expect(percentages.q1).toBe(proportional.q1);
		expect(percentages.q3).toBe(proportional.q3);
	});

	it('table vide : une absence', () => {
		expect(summarizeTable([], [])).toBeNull();
	});

	it('refuse un effectif négatif, et le situe', () => {
		expect(failureOf(summarizeTable([1, 2, 3], [4, 5, -1]))).toMatch(/effectif n° 3/);
	});

	it('refuse un effectif non fini', () => {
		expect(failureOf(summarizeTable([1, 2], [Number.NaN, 2]))).toMatch(/effectif n° 1/);
	});

	it('refuse une valeur non finie', () => {
		expect(failureOf(summarizeTable([1, Number.NaN], [1, 2]))).toMatch(/valeur n° 2/);
	});

	it('refuse un effectif total nul', () => {
		expect(failureOf(summarizeTable([1, 2], [0, 0]))).toMatch(/effectif total nul/i);
	});

	it('refuse autant de valeurs que d’effectifs différents, en donnant les deux nombres', () => {
		const message = failureOf(summarizeTable([1, 2, 3], [4, 5]));

		expect(message).toMatch(/3/);
		expect(message).toMatch(/2/);
	});
});
