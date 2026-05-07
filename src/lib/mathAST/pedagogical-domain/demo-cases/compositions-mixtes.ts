/**
 * Pedagogical Domain — Compositions mixtes demo cases.
 *
 * Cas pédagogiques où plusieurs contraintes V1 MVP s'intersectent.
 */

import type { DemoCategory } from '../demo-helpers';

export const COMPOSITIONS_MIXTES: DemoCategory = {
	name: 'compositions-mixtes',
	cases: [
		{
			label: '√x / (x − 1)',
			expression: '\\dfrac{\\sqrt{x}}{x - 1}'
		},
		{
			label: 'ln(x) / x',
			expression: '\\dfrac{\\ln(x)}{x}'
		},
		{
			label: '1 / √(x + 1)',
			expression: '\\dfrac{1}{\\sqrt{x + 1}}'
		}
	]
};
