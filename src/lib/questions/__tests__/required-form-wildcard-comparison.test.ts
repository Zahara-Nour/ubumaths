/**
 * #349–#351 : « décompose en entier + fraction décimale inférieure à 1 »
 * ======================================================================
 *
 * Motif en base `n:integer + p:integer / q:integer` : `2 + \frac{145}{100}` passait pour 3,45.
 * La contrainte `lt(q)` (comparaison entre deux jokers, moteur de motifs) exige p < q ;
 * `q:eq(10) | eq(100) | eq(1000)` exige une fraction DÉCIMALE.
 */

import { describe, it, expect } from 'vitest';
import { requiredFormVerdict } from '../required-form-validator';

const LESS_THAN_ONE = { pattern: 'n:integer + p:inN & lt(q) / q:integer' };
const DECIMAL_LESS_THAN_ONE = {
	pattern: 'n:integer + p:inN & lt(q) / q:eq(10) | eq(100) | eq(1000)'
};

describe('entier + fraction décimale inférieure à 1', () => {
	it.each([
		['3+\\frac{45}{100}', 'ok'],
		['\\frac{45}{100}+3', 'ok'],
		['3+\\frac{4}{10}', 'ok'],
		['2+\\frac{145}{100}', 'violated'],
		['3+\\frac{100}{100}', 'violated'],
		['3+\\frac{9}{20}', 'violated'],
		['\\frac{345}{100}', 'violated'],
		['3{,}45', 'violated']
	])('motif décimal — %s → %s', (answer, verdict) => {
		expect(requiredFormVerdict(answer, DECIMAL_LESS_THAN_ONE)).toBe(verdict);
	});

	it.each([
		['3+\\frac{45}{100}', 'ok'],
		['3+\\frac{9}{20}', 'ok'],
		['2+\\frac{145}{100}', 'violated'],
		['\\frac{345}{100}', 'violated']
	])('motif « p < q » seul — %s → %s', (answer, verdict) => {
		expect(requiredFormVerdict(answer, LESS_THAN_ONE)).toBe(verdict);
	});

	it('le motif actuel en base garde son comportement (2 + 145/100 passe encore)', () => {
		const current = { pattern: 'n:integer + p:integer / q:integer' };
		expect(requiredFormVerdict('2+\\frac{145}{100}', current)).toBe('ok');
		expect(requiredFormVerdict('3+\\frac{45}{100}', current)).toBe('ok');
		expect(requiredFormVerdict('\\frac{345}{100}', current)).toBe('violated');
	});
});
