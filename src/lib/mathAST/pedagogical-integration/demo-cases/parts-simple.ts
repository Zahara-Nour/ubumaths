/**
 * Pedagogical Integration — IPP simple demo cases.
 *
 * Integration by parts (lycée Tle spé + supérieur) on the LIATE-style
 * templates : polynomial × {exp|sin|cos}, polynomial × ln, bare ln.
 */

import type { DemoCategory } from '../demo-helpers';

export const PARTS_SIMPLE: DemoCategory = {
	name: 'parts-simple',
	cases: [
		{ label: '(x e^x)', latex: 'x e^x' },
		{ label: '(x sin(x))', latex: 'x \\sin(x)' },
		{ label: '(ln(x))', latex: '\\ln(x)' }
	]
};
