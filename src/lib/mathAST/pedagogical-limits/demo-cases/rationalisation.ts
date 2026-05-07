/**
 * Pedagogical Limits — Rationalisation demo cases.
 *
 * Forme indéterminée 0/0 levée par multiplication numérateur/dénominateur
 * par le conjugué de l'expression contenant une racine carrée. Émet le
 * cluster `detect-indeterminate-form` + `multiply-by-conjugate` (parent)
 * + `simplify-after-rationalization` (sub-step) puis recurse vers la
 * substitution directe.
 */

import type { DemoCategory } from '../demo-helpers';

export const RATIONALISATION: DemoCategory = {
	name: 'rationalisation',
	cases: [
		{
			label: '(√(x+1)−1)/x à x=0 (forme √a − b)',
			expression: '(sqrt(x+1)-1)/x',
			approach: '0'
		},
		{
			label: '(√x−2)/(x−4) à x=4',
			expression: '(sqrt(x)-2)/(x-4)',
			approach: '4'
		},
		{
			label: '(2−√x)/(4−x) à x=4 (forme b − √a)',
			expression: '(2-sqrt(x))/(4-x)',
			approach: '4'
		}
	]
};
