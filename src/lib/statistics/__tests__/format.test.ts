/**
 * Une seule mise en forme française des indicateurs : l'action « Statistiques »
 * de l'atelier et la commande `.stats` du moteur écrivent les mêmes lignes.
 *
 * Spécification validée par David le 2026-10-01 (lot 5, Q38).
 */

import { describe, it, expect } from 'vitest';
import { formatApproxValue, formatSummary } from '../format';
import { summarizeList } from '../describe';

// =============================================================================
// Helpers
// =============================================================================

function summaryOf(values: readonly number[]) {
	const outcome = summarizeList(values);
	if (outcome === null || !outcome.ok) throw new Error('échec inattendu');
	return outcome.value;
}

const L = [3, 7, 8, 5, 12, 14, 21, 13, 18];

// =============================================================================
// Tests
// =============================================================================

describe('= si exact à 2 décimales, ≈ sinon (Q13)', () => {
	it('entier, décimal court, décimal arrondi', () => {
		expect(formatApproxValue(12, 'fr')).toBe('= 12');
		expect(formatApproxValue(15.75, 'fr')).toBe('= 15,75');
		expect(formatApproxValue(101 / 9, 'fr')).toBe('≈ 11,22');
	});

	it('point décimal en anglais', () => {
		expect(formatApproxValue(15.75, 'en')).toBe('= 15.75');
	});

	it('bruit flottant : 1.1000000000000003 est « = 1,1 »', () => {
		expect(formatApproxValue(1.1000000000000003, 'fr')).toBe('= 1,1');
	});
});

describe('lignes d’une série', () => {
	it('toutes les lignes, dans l’ordre', () => {
		expect(formatSummary(summaryOf(L), 'fr')).toEqual([
			'Effectif : 9',
			'Moyenne ≈ 11,22',
			'Médiane = 12',
			'Q1 = 7',
			'Q3 = 14',
			'Écart interquartile = 7',
			'D1 = 3',
			'D9 = 21',
			'Minimum = 3',
			'Maximum = 21',
			'Étendue = 18',
			'Variance ≈ 31,95',
			'Écart type ≈ 5,65'
		]);
	});

	it('aucun libellé anglais ni sans accent', () => {
		const text = formatSummary(summaryOf(L), 'fr').join('\n');

		expect(text).not.toMatch(/mean|stdev|Mediane\b|Ecart/);
	});

	it('effectif non entier (pourcentages) écrit à la française', () => {
		const lines = formatSummary({ ...summaryOf([1, 2]), count: 12.5 }, 'fr');

		expect(lines[0]).toBe('Effectif : 12,5');
	});
});
