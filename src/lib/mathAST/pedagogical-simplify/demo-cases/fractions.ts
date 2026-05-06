/**
 * Pedagogical Simplify — Fractions demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const FRACTIONS: DemoCategory = {
	name: 'fractions',
	cases: [
		{ label: '6/8', latex: '\\frac{6}{8}', intent: 'reduire' },
		{ label: '1/2 + 1/3', latex: '\\frac{1}{2} + \\frac{1}{3}', intent: 'reduire' },
		{ label: '(2x+4)/2', latex: '\\frac{2x+4}{2}', intent: 'reduire' }
	]
};
