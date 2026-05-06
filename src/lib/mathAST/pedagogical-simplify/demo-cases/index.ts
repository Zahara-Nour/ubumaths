/**
 * Pedagogical Simplify — Demo cases barrel.
 *
 * Each category groups 2-4 representative inputs ; the snapshot test in
 * `__tests__/pedagogical-simplify-demo.test.ts` and the CLI in
 * `scripts/pedagogical-simplify-demo.ts` consume `ALL_DEMO_CATEGORIES`.
 */

import type { DemoCategory } from '../demo-helpers';

import { COMBINAISON } from './combinaison';
import { DISTRIBUTION } from './distribution';
import { FACTORISATION } from './factorisation';
import { FRACTIONS } from './fractions';
import { IDENTITES_LOG_EXP } from './identites-log-exp';
import { IDENTITES_TRIG } from './identites-trig';
import { PUISSANCES } from './puissances';
import { RADICAUX } from './radicaux';
import { VALEUR_ABSOLUE } from './valeur-absolue';

export const ALL_DEMO_CATEGORIES: readonly DemoCategory[] = [
	DISTRIBUTION,
	FACTORISATION,
	COMBINAISON,
	FRACTIONS,
	PUISSANCES,
	RADICAUX,
	IDENTITES_TRIG,
	IDENTITES_LOG_EXP,
	VALEUR_ABSOLUE
];

export {
	COMBINAISON,
	DISTRIBUTION,
	FACTORISATION,
	FRACTIONS,
	IDENTITES_LOG_EXP,
	IDENTITES_TRIG,
	PUISSANCES,
	RADICAUX,
	VALEUR_ABSOLUE
};
