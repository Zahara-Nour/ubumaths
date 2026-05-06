/**
 * Pedagogical Integration — Polynomial demo cases.
 *
 * Polynomial integrands : sums of x-power monomials. Exercises the
 * `apply-linearity-sum` dispatcher recursing into `apply-power-rule` (or
 * `extract-constant` + power-rule when a coefficient is present).
 */

import type { DemoCategory } from '../demo-helpers';

export const POLYNOMIAL: DemoCategory = {
	name: 'polynomial',
	cases: [
		{ label: '(3x^2 + 2x + 1)', latex: '3x^2 + 2x + 1' },
		{ label: '(x^3 - 4x)', latex: 'x^3 - 4x' },
		{ label: '(2x^4 + 5x^2 + 7)', latex: '2x^4 + 5x^2 + 7' }
	]
};
