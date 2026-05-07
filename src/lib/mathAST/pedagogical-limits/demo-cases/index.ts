/**
 * Pedagogical Limits — Demo categories aggregator.
 *
 * Single source of truth for the snapshot test and the CLI. New categories
 * (V1.1 : `rationalisation`, `one-sided`, `squeeze`, `lhopital`) should be
 * registered here.
 *
 * @module mathAST/pedagogical-limits/demo-cases
 */

import type { DemoCategory } from '../demo-helpers';
import { DIRECT_SUBSTITUTION } from './direct-substitution';
import { FACTORISATION } from './factorisation';
import { INFINITY_ANALYSIS } from './infinity-analysis';
import { KNOWN_LIMITS_CASES } from './known-limits';
import { RATIONALISATION } from './rationalisation';

export const ALL_CATEGORIES: readonly DemoCategory[] = [
	DIRECT_SUBSTITUTION,
	KNOWN_LIMITS_CASES,
	FACTORISATION,
	RATIONALISATION,
	INFINITY_ANALYSIS
];

export {
	DIRECT_SUBSTITUTION,
	FACTORISATION,
	INFINITY_ANALYSIS,
	KNOWN_LIMITS_CASES,
	RATIONALISATION
};
