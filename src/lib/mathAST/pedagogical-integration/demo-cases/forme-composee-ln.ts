/**
 * Pedagogical Integration — Forme u'/u demo cases.
 *
 * Composite-ln integrands : `u'/u → ln|u|`. Includes one « bare » 1/u case
 * where u' is a numeric constant and the rebalancing factor is implicit.
 */

import type { DemoCategory } from '../demo-helpers';

export const FORME_COMPOSEE_LN: DemoCategory = {
	name: 'forme-composee-ln',
	cases: [
		{ label: '(2x / (x^2 + 1))', latex: '\\dfrac{2x}{x^2 + 1}' },
		{ label: '(1 / (2x + 1))', latex: '\\dfrac{1}{2x + 1}' },
		{ label: '(3x^2 / (x^3 - 7))', latex: '\\dfrac{3x^2}{x^3 - 7}' }
	]
};
