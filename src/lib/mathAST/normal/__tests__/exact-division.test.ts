/**
 * Division exacte multivariée : `exactDividePolynomials`.
 *
 * Ces tests visent la fonction elle-même, pas le décideur d'équivalence — le
 * contrat de bout en bout vit dans `quotient-multivarie.test.ts`. Ici on
 * vérifie les deux choses qui font sa valeur :
 *
 * 1. elle rend le quotient quand la division tombe juste ;
 * 2. elle rend `null` dès qu'elle ne tombe PAS juste, y compris hors du domaine
 *    où elle sait raisonner (exposants fractionnaires).
 *
 * Le point 2 est le seul qui compte vraiment : un faux positif ici compte juste
 * une réponse fausse d'élève.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { normalize } from '../normalize';
import { exactDividePolynomials, polynomialsEqual, polynomialToString } from '../polynomial';
import type { NormalTerm } from '../types';

/** Polynôme normalisé (donc développé) à partir d'une écriture LaTeX. */
const poly = (latex: string): readonly NormalTerm[] => normalize(parseLatex(latex)).numerator;

/** Quotient exact de deux écritures LaTeX, ou `null`. */
const divide = (a: string, b: string): NormalTerm[] | null =>
	exactDividePolynomials(poly(a), poly(b));

describe('exactDividePolynomials rend le quotient quand la division tombe juste', () => {
	it.each([
		['(x+y)^2', 'x+y', 'x+y'],
		['x^2-y^2', 'x-y', 'x+y'],
		['x^2-y^2', 'x+y', 'x-y'],
		['x^3-y^3', 'x-y', 'x^2+xy+y^2'],
		['(a+b+c)^2', 'a+b+c', 'a+b+c'],
		['2x+2y', 'x+y', '2'],
		['(x+y)^3', '(x+y)^2', 'x+y'],
		['a^2-b^2', '(a-b)(a+b)', '1'],
		['x^2y+xy^2', 'xy', 'x+y'],
		['(x+y)^2', '2x+2y', '\\frac{x+y}{2}']
	])('(%s) / (%s) = %s', (a, b, expected) => {
		const quotient = divide(a, b);
		// Message lisible si ça casse : le quotient obtenu, pas juste « false »
		expect(quotient === null ? 'null' : polynomialToString(quotient)).toBe(
			polynomialToString(poly(expected))
		);
		// Le rendu textuel ne suffit pas : on compare aussi les structures
		if (quotient === null) throw new Error('quotient null');
		expect(polynomialsEqual(quotient, poly(expected))).toBe(true);
	});

	it('0 divisé par n’importe quoi vaut 0', () => {
		expect(divide('0', 'x+y')).toEqual([]);
	});
});

describe('exactDividePolynomials rend null quand elle ne tombe pas juste', () => {
	it.each([
		// Le reste ne s'annule pas
		['(x+y)^2', 'x+2y'],
		['x^2+y^2', 'x+y'],
		['x^3+y^3', 'x-y'],
		// Le diviseur est de degré trop grand
		['x+y', '(x+y)^2'],
		// Variables étrangères l'une à l'autre
		['x', 'y'],
		['(x+y)(x-y)', 'x+z'],
		// Division par zéro : pas de quotient, et surtout pas d'exception
		['x+y', '0']
	])('(%s) / (%s) = null', (a, b) => {
		expect(divide(a, b)).toBeNull();
	});

	it('un exposant fractionnaire sort du domaine : null, pas un quotient inventé', () => {
		// L'ordre monomial n'est bien fondé que sur des exposants entiers
		// positifs ; hors de là on renonce plutôt que de risquer une boucle.
		expect(divide('x', '\\sqrt{x}')).toBeNull();
		expect(divide('x\\sqrt{x}', '\\sqrt{x}')).toBeNull();
	});
});
