/**
 * Pedagogical Simplify — Radicaux demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const RADICAUX: DemoCategory = {
	name: 'radicaux',
	cases: [
		{ label: '√8', latex: '\\sqrt{8}', intent: 'reduire' },
		{ label: '√50', latex: '\\sqrt{50}', intent: 'reduire' },
		{ label: '√2 · √3', latex: '\\sqrt{2} \\cdot \\sqrt{3}', intent: 'reduire' }
	]
};
