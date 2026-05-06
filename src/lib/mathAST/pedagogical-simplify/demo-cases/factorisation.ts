/**
 * Pedagogical Simplify — Factorisation demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const FACTORISATION: DemoCategory = {
	name: 'factorisation',
	cases: [
		{ label: 'x² - 4', latex: 'x^2 - 4', intent: 'factoriser' },
		{ label: 'x² + 6x + 9', latex: 'x^2 + 6x + 9', intent: 'factoriser' },
		{ label: 'x² + 2x + 1', latex: 'x^2 + 2x + 1', intent: 'factoriser' },
		{ label: 'x³ - 8', latex: 'x^3 - 8', intent: 'factoriser' }
	]
};
