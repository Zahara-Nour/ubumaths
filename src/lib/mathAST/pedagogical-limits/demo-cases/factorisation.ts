/**
 * Pedagogical Limits — Factorisation demo cases.
 *
 * Forme indéterminée 0/0 levée par factorisation polynomiale via division
 * synthétique (Horner) par `(x − a)`. Émet le cluster
 * `detect-indeterminate-form` + `simplify-common-factor` (parent) +
 * `factor-numerator` / `factor-denominator` (sub-steps) + recurse vers la
 * conclusion.
 */

import type { DemoCategory } from '../demo-helpers';

export const FACTORISATION: DemoCategory = {
	name: 'factorisation',
	cases: [
		{
			label: '(x²−4)/(x−2) à x=2 (différence de carrés)',
			expression: '(x^2-4)/(x-2)',
			approach: '2'
		},
		{
			label: '(x³−1)/(x−1) à x=1',
			expression: '(x^3-1)/(x-1)',
			approach: '1'
		},
		{
			label: '(x³−8)/(x−2) à x=2',
			expression: '(x^3-8)/(x-2)',
			approach: '2'
		},
		{
			label: '(x²−x−6)/(x−3) à x=3',
			expression: '(x^2-x-6)/(x-3)',
			approach: '3'
		}
	]
};
