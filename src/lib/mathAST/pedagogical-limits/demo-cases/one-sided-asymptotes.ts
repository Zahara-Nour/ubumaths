/**
 * Pedagogical Limits — One-sided / vertical asymptotes demo cases.
 *
 * Singularités finies où l'expression diverge vers ±∞ d'un côté ou des deux.
 * Émet `analyze-left-limit` + `analyze-right-limit` + `compare-one-sided`
 * + `conclude-infinite` ou `conclude-does-not-exist`.
 *
 * Limitation V1.1.b : heuristique numérique sur f(a±ε), threshold 1e5.
 * Couvre les pôles polynomiaux 1/p(x) ; n'attrape pas les divergences lentes
 * (e.g. ln(x) à 0+).
 */

import type { DemoCategory } from '../demo-helpers';

export const ONE_SIDED_ASYMPTOTES: DemoCategory = {
	name: 'one-sided-asymptotes',
	cases: [
		{
			label: '1/x à x=0 (both — signes opposés → n’existe pas)',
			expression: '1/x',
			approach: '0'
		},
		{
			label: '1/x² à x=0 (both — mêmes signes → +∞)',
			expression: '1/(x^2)',
			approach: '0'
		},
		{
			label: '1/(x−1)² à x=1 (both)',
			expression: '1/((x-1)^2)',
			approach: '1'
		}
	]
};
