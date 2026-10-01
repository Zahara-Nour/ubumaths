/**
 * Tableau croisé d'effectifs : totaux, fréquences (sur le total, par ligne,
 * par colonne). Programme de 2de, `2-170` à `2-173`.
 *
 * Spécification validée par David le 2026-10-01 (lot 4).
 */

import { describe, it, expect } from 'vitest';
import { crossTable, type CrossTableMode } from '../cross-table';

// =============================================================================
// Helpers
// =============================================================================

/** Fille / Garçon × Externe / Demi-pensionnaire */
const COUNTS = [
	[45, 120],
	[50, 110]
];

function tableOf(counts: number[][], mode: CrossTableMode = 'effectifs') {
	const outcome = crossTable(counts, mode);
	if (outcome === null || !outcome.ok)
		throw new Error(`échec inattendu : ${JSON.stringify(outcome)}`);
	return outcome.value;
}

function percent(values: readonly number[]) {
	return values.map((v) => Math.round(v * 1000) / 10);
}

// =============================================================================
// Tests
// =============================================================================

describe('tableau croisé : totaux', () => {
	it('totaux de lignes, de colonnes et général', () => {
		const t = tableOf(COUNTS);

		expect(t.rowTotals).toEqual([165, 160]);
		expect(t.columnTotals).toEqual([95, 230]);
		expect(t.total).toBe(325);
		expect(t.cells).toEqual(COUNTS);
	});
});

describe('tableau croisé : fréquences', () => {
	it('sur le total', () => {
		const t = tableOf(COUNTS, 'fréquences');

		expect(percent(t.cells[0])).toEqual([13.8, 36.9]);
		expect(percent(t.cells[1])).toEqual([15.4, 33.8]);
		expect(percent(t.rowTotals)).toEqual([50.8, 49.2]);
		expect(percent(t.columnTotals)).toEqual([29.2, 70.8]);
		expect(t.total).toBe(1);
	});

	it('par ligne (fréquences conditionnelles) : chaque ligne fait 1', () => {
		const t = tableOf(COUNTS, 'fréquences par ligne');

		expect(percent(t.cells[0])).toEqual([27.3, 72.7]);
		expect(percent(t.cells[1])).toEqual([31.3, 68.8]);
		expect(t.rowTotals).toEqual([1, 1]);
		expect(percent(t.columnTotals)).toEqual([29.2, 70.8]);
		expect(t.total).toBe(1);
	});

	it('par colonne : chaque colonne fait 1', () => {
		const t = tableOf(COUNTS, 'fréquences par colonne');

		expect(percent([t.cells[0][0], t.cells[1][0]])).toEqual([47.4, 52.6]);
		expect(percent([t.cells[0][1], t.cells[1][1]])).toEqual([52.2, 47.8]);
		expect(t.columnTotals).toEqual([1, 1]);
		expect(percent(t.rowTotals)).toEqual([50.8, 49.2]);
		expect(t.total).toBe(1);
	});

	it('une ligne toute nulle : ses fréquences par ligne ne sont pas définies', () => {
		const t = tableOf(
			[
				[0, 0],
				[1, 3]
			],
			'fréquences par ligne'
		);

		expect(t.cells[0]).toEqual([null, null]);
		expect(t.rowTotals[0]).toBeNull();
		expect(t.cells[1]).toEqual([0.25, 0.75]);
	});
});

describe('tableau croisé : entrées invalides', () => {
	it('aucune case : une absence', () => {
		expect(crossTable([], 'effectifs')).toBeNull();
	});

	it('lignes de longueurs différentes', () => {
		expect(crossTable([[1, 2], [3]], 'effectifs')?.ok).toBe(false);
	});

	it('effectif négatif ou non fini', () => {
		expect(crossTable([[1, -2]], 'effectifs')?.ok).toBe(false);
		expect(crossTable([[1, Number.NaN]], 'effectifs')?.ok).toBe(false);
	});

	it('fréquences d’un tableau tout nul', () => {
		expect(crossTable([[0, 0]], 'fréquences')?.ok).toBe(false);
	});
});
