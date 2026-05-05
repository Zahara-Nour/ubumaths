/**
 * Pedagogical Differentiation — Logarithm demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const LOGARITHM: DemoCategory = {
	name: 'logarithm',
	cases: [
		{ label: '(ln(x))', latex: '\\ln(x)' },
		{ label: '(ln(x^2))', latex: '\\ln(x^2)' },
		{ label: '(ln(x^2 + 1))', latex: '\\ln(x^2 + 1)' },
		{ label: '(log(x))', latex: '\\log(x)' },
		{ label: '(ln(x) \\cdot x)', latex: '\\ln(x) \\cdot x' }
	]
};
