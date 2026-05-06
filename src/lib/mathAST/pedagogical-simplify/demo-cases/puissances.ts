/**
 * Pedagogical Simplify — Puissances demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const PUISSANCES: DemoCategory = {
	name: 'puissances',
	cases: [
		{ label: 'x² · x³', latex: 'x^2 \\cdot x^3', intent: 'reduire' },
		{ label: '(x²)³', latex: '(x^2)^3', intent: 'reduire' },
		{ label: '2³ · 2⁵', latex: '2^3 \\cdot 2^5', intent: 'reduire' }
	]
};
