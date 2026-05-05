/**
 * Pedagogical Differentiation — Product / Quotient demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const PRODUCT_QUOTIENT: DemoCategory = {
	name: 'product-quotient',
	cases: [
		{ label: '(2x)', latex: '2x' },
		{ label: '(x \\cdot \\sin(x))', latex: 'x \\cdot \\sin(x)' },
		{ label: '(x^2 \\cdot \\cos(x))', latex: 'x^2 \\cdot \\cos(x)' },
		{ label: '(1/x)', latex: '\\frac{1}{x}' },
		{ label: '(1/(x+1))', latex: '\\frac{1}{x+1}' },
		{ label: '(x/(x+1))', latex: '\\frac{x}{x+1}' },
		{ label: '((x^2+1)/(x-1))', latex: '\\frac{x^2+1}{x-1}' }
	]
};
