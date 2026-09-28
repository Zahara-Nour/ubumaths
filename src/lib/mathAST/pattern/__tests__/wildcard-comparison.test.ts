/**
 * Contrainte qui compare deux jokers : `p:integer & lt(q)`
 * ========================================================
 *
 * #349–#351 (décision de David) : « entier + fraction décimale inférieure à 1 » demande p < q.
 * La comparaison porte sur la VALEUR liée à l'autre joker, quel que soit l'ordre dans
 * lequel les deux sont liés : le motif pose la contrainte miroir (`gt(p)`) sur q.
 */

import { describe, it, expect } from 'vitest';
import { P } from '../builder';
import { matches } from '../match';
import { parseLatex } from '../../parser';

const ok = (pattern: string, latex: string) => matches(P.parse(pattern), parseLatex(latex));

describe('comparaison entre deux jokers', () => {
	it.each([
		['\\frac{45}{100}', true],
		['\\frac{145}{100}', false],
		['\\frac{100}{100}', false]
	])('p:integer & lt(q) / q:integer — %s', (latex, expected) => {
		expect(ok('p:integer & lt(q) / q:integer', latex)).toBe(expected);
	});

	it('le joker comparé peut être lié AVANT (dénominateur contraint par le numérateur)', () => {
		expect(ok('p:integer / q:integer & gt(p)', '\\frac{45}{100}')).toBe(true);
		expect(ok('p:integer / q:integer & gt(p)', '\\frac{145}{100}')).toBe(false);
	});

	it.each([
		['lte', '\\frac{100}{100}', true],
		['gte', '\\frac{100}{100}', true],
		['gt', '\\frac{100}{100}', false],
		['eq', '\\frac{7}{7}', true],
		['ne', '\\frac{7}{7}', false]
	])('%s(q) — %s', (op, latex, expected) => {
		expect(ok(`p:integer & ${op}(q) / q:integer`, latex)).toBe(expected);
	});

	it("dans une somme commutative : l'ordre des termes ne compte pas", () => {
		const pattern = 'n:integer + p:integer & lt(q) / q:integer';
		expect(ok(pattern, '3+\\frac{45}{100}')).toBe(true);
		expect(ok(pattern, '\\frac{45}{100}+3')).toBe(true);
		expect(ok(pattern, '2+\\frac{145}{100}')).toBe(false);
	});

	it('valeur non numérique : la comparaison échoue', () => {
		expect(ok('p:lt(q) / q', '\\frac{x}{100}')).toBe(false);
	});

	it('joker inconnu : motif invalide', () => {
		expect(() => P.parse('p:integer & lt(r) / q:integer')).toThrow();
	});
});
