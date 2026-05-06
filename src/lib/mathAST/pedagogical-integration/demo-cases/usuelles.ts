/**
 * Pedagogical Integration — Primitives usuelles demo cases.
 *
 * Direct table-of-primitives integrations : ∫c, ∫x, ∫x^n, ∫1/x, ∫e^x,
 * ∫sin(x), ∫cos(x). No linearity, no composite forms — the « one-line »
 * cases a student should be able to integrate without thinking.
 */

import type { DemoCategory } from '../demo-helpers';

export const USUELLES: DemoCategory = {
	name: 'usuelles',
	cases: [
		{ label: '(constante 5)', latex: '5' },
		{ label: '(x)', latex: 'x' },
		{ label: '(x^3)', latex: 'x^3' },
		{ label: '(1/x)', latex: '\\dfrac{1}{x}' },
		{ label: '(e^x)', latex: 'e^x' },
		{ label: '(sin(x))', latex: '\\sin(x)' },
		{ label: '(cos(x))', latex: '\\cos(x)' }
	]
};
