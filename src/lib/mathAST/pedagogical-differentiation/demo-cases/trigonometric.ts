/**
 * Pedagogical Differentiation — Trigonometric demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const TRIGONOMETRIC: DemoCategory = {
	name: 'trigonometric',
	cases: [
		{ label: '(sin(x))', latex: '\\sin(x)' },
		{ label: '(cos(x))', latex: '\\cos(x)' },
		{ label: '(tan(x))', latex: '\\tan(x)' },
		{ label: '(sin(2x))', latex: '\\sin(2x)' },
		{ label: '(cos(x^2))', latex: '\\cos(x^2)' },
		{ label: '(sin(x) + cos(x))', latex: '\\sin(x) + \\cos(x)' },
		{ label: '(arctan(x))', latex: '\\arctan(x)' }
	]
};
