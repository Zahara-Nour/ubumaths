/**
 * Pedagogical Simplify — Identités trigonométriques demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const IDENTITES_TRIG: DemoCategory = {
	name: 'identites-trig',
	cases: [
		{ label: 'sin²(x) + cos²(x)', latex: '\\sin^2(x) + \\cos^2(x)', intent: 'reduire' },
		{ label: 'sin(-x)', latex: '\\sin(-x)', intent: 'reduire' },
		{ label: 'sin(x + 2π)', latex: '\\sin(x + 2\\pi)', intent: 'reduire' }
	]
};
