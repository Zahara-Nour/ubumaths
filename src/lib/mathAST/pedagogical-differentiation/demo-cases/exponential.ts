/**
 * Pedagogical Differentiation — Exponential demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const EXPONENTIAL: DemoCategory = {
	name: 'exponential',
	cases: [
		{ label: '(exp(x))', latex: '\\exp(x)' },
		{ label: '(exp(2x))', latex: '\\exp(2x)' },
		{ label: '(exp(x^2))', latex: '\\exp(x^2)' },
		{ label: '(2^x)', latex: '2^x' },
		{ label: '(exp(sin(x)))', latex: '\\exp(\\sin(x))' }
	]
};
