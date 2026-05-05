/**
 * Pedagogical Differentiation — Composition (chain rule) demo cases.
 *
 * The chain rule is integrated into every transcendental rule (sin, cos, exp,
 * ln, sqrt, …) — derivative arguments are recursively differentiated. These
 * cases stress that integration.
 */

import type { DemoCategory } from '../demo-helpers';

export const COMPOSITION: DemoCategory = {
	name: 'composition',
	cases: [
		{ label: '(sin(x^2))', latex: '\\sin(x^2)' },
		{ label: '(cos(2x+1))', latex: '\\cos(2x+1)' },
		{ label: '(exp(\\sin(x)))', latex: '\\exp(\\sin(x))' },
		{ label: '(\\ln(\\cos(x)))', latex: '\\ln(\\cos(x))' },
		{ label: '(\\sqrt{x^2 + 1})', latex: '\\sqrt{x^2 + 1}' },
		{ label: '((\\sin(x))^2)', latex: '(\\sin(x))^2' }
	]
};
