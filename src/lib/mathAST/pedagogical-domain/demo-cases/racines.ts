/**
 * Pedagogical Domain — Racines (sqrt) demo cases.
 *
 * Cas pédagogiques pour la contrainte `sqrt_constraint`.
 */

import type { DemoCategory } from '../demo-helpers';

export const RACINES: DemoCategory = {
	name: 'racines',
	cases: [
		{
			label: '√(x − 2)',
			expression: '\\sqrt{x - 2}'
		},
		{
			label: '√(2x + 3)',
			expression: '\\sqrt{2x + 3}'
		},
		{
			label: '√(x² + 1) (universel)',
			expression: '\\sqrt{x^2 + 1}'
		}
	]
};
