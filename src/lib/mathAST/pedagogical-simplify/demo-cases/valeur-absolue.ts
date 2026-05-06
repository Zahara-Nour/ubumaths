/**
 * Pedagogical Simplify — Valeur absolue demo cases.
 */

import type { DemoCategory } from '../demo-helpers';

export const VALEUR_ABSOLUE: DemoCategory = {
	name: 'valeur-absolue',
	cases: [
		{ label: '|-x|', latex: '|-x|', intent: 'reduire' },
		{ label: '||x||', latex: '||x||', intent: 'reduire' }
	]
};
