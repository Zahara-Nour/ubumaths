/**
 * Pedagogical Domain — Fractions demo cases.
 *
 * Cas pédagogiques pour `division_constraint`.
 */

import type { DemoCategory } from '../demo-helpers';

export const FRACTIONS: DemoCategory = {
	name: 'fractions',
	cases: [
		{
			label: '1/x',
			expression: '\\dfrac{1}{x}'
		},
		{
			label: '1/(x + 2)',
			expression: '\\dfrac{1}{x + 2}'
		},
		{
			label: '(2x)/(x² + 1) (universel)',
			expression: '\\dfrac{2x}{x^2 + 1}'
		}
	]
};
