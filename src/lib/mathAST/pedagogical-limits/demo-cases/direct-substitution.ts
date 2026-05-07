/**
 * Pedagogical Limits — Direct substitution demo cases.
 *
 * Limites où l'expression est continue au point étudié : on substitue
 * directement `x = a` et on conclut. Pas de forme indéterminée.
 */

import type { DemoCategory } from '../demo-helpers';

export const DIRECT_SUBSTITUTION: DemoCategory = {
	name: 'direct-substitution',
	cases: [
		{ label: 'polynôme x²+2x à x=3', expression: 'x^2+2*x', approach: '3' },
		{ label: 'fraction (x+1)/(x-2) à x=5', expression: '(x+1)/(x-2)', approach: '5' },
		{ label: 'expression mixte 3x²−x+1 à x=0', expression: '3*x^2-x+1', approach: '0' }
	]
};
