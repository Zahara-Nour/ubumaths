/**
 * Pedagogical Limits — Known-limits demo cases.
 *
 * Limites de référence qui se résolvent par pattern-matching contre
 * `KNOWN_LIMITS` du module `limits/known-limits.ts`. Le renderer affiche
 * directement la `descriptionFr` de l'entrée matchée.
 */

import type { DemoCategory } from '../demo-helpers';

export const KNOWN_LIMITS_CASES: DemoCategory = {
	name: 'known-limits',
	cases: [
		{ label: 'sin(x)/x à x=0 (limite usuelle)', expression: 'sin(x)/x', approach: '0' },
		{ label: '(1-cos(x))/x^2 à x=0', expression: '(1-cos(x))/x^2', approach: '0' },
		{ label: 'ln(1+x)/x à x=0', expression: 'ln(1+x)/x', approach: '0' }
	]
};
