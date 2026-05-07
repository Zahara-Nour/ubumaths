/**
 * Pedagogical Domain — Demo categories aggregator.
 *
 * Single source of truth for the snapshot test and the CLI. New categories
 * (V1.1 : `trigonometriques` (tan/cot), `inverses-hyperboliques`, etc.)
 * should be registered here.
 *
 * @module mathAST/pedagogical-domain/demo-cases
 */

import type { DemoCategory } from '../demo-helpers';
import { ARCS_TRIGO } from './arcs-trigo';
import { COMPOSITIONS_MIXTES } from './compositions-mixtes';
import { FRACTIONS } from './fractions';
import { LOGARITHMES } from './logarithmes';
import { RACINES } from './racines';

export const ALL_CATEGORIES: readonly DemoCategory[] = [
	RACINES,
	LOGARITHMES,
	FRACTIONS,
	ARCS_TRIGO,
	COMPOSITIONS_MIXTES
];

export { ARCS_TRIGO, COMPOSITIONS_MIXTES, FRACTIONS, LOGARITHMES, RACINES };
