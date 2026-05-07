/**
 * Pedagogical Domain — Puissances (V1.1).
 *
 * power_constraint (negative exponent), even_root_constraint (fractional
 * exponent with even denominator).
 */

import type { DemoCategory } from '../demo-helpers';

export const PUISSANCES: DemoCategory = {
	name: 'puissances',
	cases: [
		{
			label: 'x⁻¹ (puissance négative entière)',
			expression: 'x^{-1}'
		},
		{
			label: 'x^(1/2) (racine paire fractionnaire)',
			expression: 'x^{1/2}'
		},
		{
			label: '(x-1)^(-2)',
			expression: '(x - 1)^{-2}'
		}
	]
};
