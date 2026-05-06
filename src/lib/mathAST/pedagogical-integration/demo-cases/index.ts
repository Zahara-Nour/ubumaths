/**
 * Pedagogical Integration — Demo cases index.
 *
 * Each category groups related `DemoCase[]`. The exported
 * `ALL_CATEGORIES_INTEGRATION` is consumed by:
 *   - `__tests__/pedagogical-integration-demo.test.ts` (snapshot tests)
 *   - `scripts/pedagogical-integration-demo.ts` (CLI)
 *
 * @module mathAST/pedagogical-integration/demo-cases
 */

import type { DemoCategory } from '../demo-helpers';
import { DEFINIE } from './definie';
import { FORME_COMPOSEE_EXP } from './forme-composee-exp';
import { FORME_COMPOSEE_LN } from './forme-composee-ln';
import { LINEARITE } from './linearite';
import { PARTS_SIMPLE } from './parts-simple';
import { POLYNOMIAL } from './polynomial';
import { USUELLES } from './usuelles';

export const ALL_CATEGORIES_INTEGRATION: readonly DemoCategory[] = [
	USUELLES,
	POLYNOMIAL,
	LINEARITE,
	FORME_COMPOSEE_LN,
	FORME_COMPOSEE_EXP,
	DEFINIE,
	PARTS_SIMPLE
];

export {
	DEFINIE,
	FORME_COMPOSEE_EXP,
	FORME_COMPOSEE_LN,
	LINEARITE,
	PARTS_SIMPLE,
	POLYNOMIAL,
	USUELLES
};
