/**
 * Pedagogical Integration — Linéarité demo cases.
 *
 * Pure-linearity integrands where the dispatcher emits an
 * `apply-linearity-sum` and/or `extract-constant` step before recursing.
 */

import type { DemoCategory } from '../demo-helpers';

export const LINEARITE: DemoCategory = {
	name: 'linearite',
	cases: [
		{ label: '(5 e^x)', latex: '5 e^x' },
		{ label: '(3 sin(x) + 2 cos(x))', latex: '3 \\sin(x) + 2 \\cos(x)' },
		{ label: '(x/4)', latex: '\\dfrac{x}{4}' }
	]
};
