/**
 * Pedagogical Domain — Logarithmes demo cases.
 *
 * Cas pédagogiques pour `ln_constraint` et `log_constraint`.
 */

import type { DemoCategory } from '../demo-helpers';

export const LOGARITHMES: DemoCategory = {
	name: 'logarithmes',
	cases: [
		{
			label: 'ln(x − 1)',
			expression: '\\ln(x - 1)'
		},
		{
			label: 'log(2x + 1)',
			expression: '\\log(2x + 1)'
		},
		{
			label: 'ln(5) (constante, universel)',
			expression: '\\ln(5)'
		}
	]
};
