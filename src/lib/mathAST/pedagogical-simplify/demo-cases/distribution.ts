/**
 * Pedagogical Simplify — Distribution demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const DISTRIBUTION: DemoCategory = {
	name: 'distribution',
	cases: [
		{ label: '(x+1)²', latex: '(x+1)^2', intent: 'developper' },
		{ label: '(x-1)²', latex: '(x-1)^2', intent: 'developper' },
		{ label: '(x+1)(x-1)', latex: '(x+1)(x-1)', intent: 'developper' },
		{ label: '(2x+3)(x-1)', latex: '(2x+3)(x-1)', intent: 'developper' }
	]
};
