/**
 * Pedagogical Limits — Infinity-analysis demo cases.
 *
 * Limites à l'infini sur des fractions de polynômes. La stratégie compare
 * les degrés du numérateur et du dénominateur (`numDeg = denDeg` → ratio
 * des coefficients dominants ; `numDeg < denDeg` → 0 ; `numDeg > denDeg`
 * → ±∞ selon parité de `degDelta` et signe de `approach`).
 */

import type { DemoCategory } from '../demo-helpers';

export const INFINITY_ANALYSIS: DemoCategory = {
	name: 'infinity-analysis',
	cases: [
		{
			label: '(3x²−x)/(x²+1) à +∞ (ratio des coeffs dominants)',
			expression: '(3*x^2-x)/(x^2+1)',
			approach: '\\infty'
		},
		{
			label: 'x²/(x+1) à +∞ (numDeg > denDeg → +∞)',
			expression: '(x^2)/(x+1)',
			approach: '\\infty'
		},
		{
			label: 'x/(x²+1) à +∞ (numDeg < denDeg → 0)',
			expression: 'x/(x^2+1)',
			approach: '\\infty'
		},
		{
			label: 'x³/(x+1) à −∞ (signe à −∞ : x³≈−∞ et x+1≈−∞ → +∞)',
			expression: '(x^3)/(x+1)',
			approach: '-\\infty'
		}
	]
};
