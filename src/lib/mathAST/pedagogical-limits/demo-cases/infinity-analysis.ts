/**
 * Pedagogical Limits — Infinity-analysis demo cases.
 *
 * Limites à l'infini sur des fractions de polynômes, par la factorisation du
 * terme prépondérant (BO Tle spé) : on factorise chaque somme par xⁿ, on
 * simplifie, puis limites des termes et limite d'un quotient ou d'un produit.
 */

import type { DemoCategory } from '../demo-helpers';

export const INFINITY_ANALYSIS: DemoCategory = {
	name: 'infinity-analysis',
	cases: [
		{
			label: '(3x²−x)/(x²+1) à +∞ (mêmes degrés : limite d’un quotient)',
			expression: '(3*x^2-x)/(x^2+1)',
			approach: '\\infty'
		},
		{
			label: 'x²/(x+1) à +∞ (numérateur prépondérant : limite d’un produit)',
			expression: '(x^2)/(x+1)',
			approach: '\\infty'
		},
		{
			label: 'x/(x²+1) à +∞ (dénominateur prépondérant : 0)',
			expression: 'x/(x^2+1)',
			approach: '\\infty'
		},
		{
			label: 'x³/(x+1) à −∞ (après simplification, x² → +∞)',
			expression: '(x^3)/(x+1)',
			approach: '-\\infty'
		}
	]
};
