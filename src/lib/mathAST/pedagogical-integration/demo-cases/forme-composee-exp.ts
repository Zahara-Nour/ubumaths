/**
 * Pedagogical Integration — Forme u'·e^u demo cases.
 *
 * Composite-exp integrands : `u'·e^u → e^u`. Includes one « bare » e^(ax+b)
 * case where u' is a numeric constant and the rebalancing factor is
 * implicit.
 */

import type { DemoCategory } from '../demo-helpers';

export const FORME_COMPOSEE_EXP: DemoCategory = {
	name: 'forme-composee-exp',
	cases: [
		{ label: '(2x e^{x^2})', latex: '2x e^{x^2}' },
		{ label: '(e^{2x})', latex: 'e^{2x}' },
		{ label: '(e^{3x + 1})', latex: 'e^{3x + 1}' }
	]
};
