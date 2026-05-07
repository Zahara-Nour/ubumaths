/**
 * Pedagogical Domain — Trigonometriques (V1.1).
 *
 * tan, cot, sec, csc constraints.
 */

import type { DemoCategory } from '../demo-helpers';

export const TRIGONOMETRIQUES: DemoCategory = {
	name: 'trigonometriques',
	cases: [
		{
			label: 'tan(x)',
			expression: '\\tan(x)'
		},
		{
			label: 'cot(x)',
			expression: '\\cot(x)'
		},
		{
			label: 'tan(2x)',
			expression: '\\tan(2x)'
		}
	]
};
