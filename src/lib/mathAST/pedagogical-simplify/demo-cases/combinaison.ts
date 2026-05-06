/**
 * Pedagogical Simplify — Combinaison de termes semblables demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const COMBINAISON: DemoCategory = {
	name: 'combinaison',
	cases: [
		{ label: '2x + 3x', latex: '2x + 3x', intent: 'reduire' },
		{ label: '5x² - 2x²', latex: '5x^2 - 2x^2', intent: 'reduire' },
		{ label: '3x + 2y + x - y', latex: '3x + 2y + x - y', intent: 'reduire' }
	]
};
