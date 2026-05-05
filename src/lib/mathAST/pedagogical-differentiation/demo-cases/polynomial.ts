/**
 * Pedagogical Differentiation — Polynomial demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const POLYNOMIAL: DemoCategory = {
	name: 'polynomial',
	cases: [
		{ label: '(x^2)', latex: 'x^2' },
		{ label: '(x^3)', latex: 'x^3' },
		{ label: '(x^3 + 2x^2)', latex: 'x^3 + 2x^2' },
		{ label: '(2x^4 - 3x + 5)', latex: '2x^4 - 3x + 5' },
		{ label: '((x+1)^3)', latex: '(x+1)^3' },
		{ label: '((2x+1)^2)', latex: '(2x+1)^2' }
	]
};
