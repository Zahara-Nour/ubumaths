#!/usr/bin/env tsx
/**
 * Standalone CLI demo for the pedagogical-solve pipeline.
 *
 * Faster than running the vitest snapshot test (no test framework setup).
 * Output is identical to the snapshot — if this script's output ever changes,
 * the corresponding snapshot test (`pedagogical-solve/__tests__/linear-demo.test.ts`)
 * will fail and remind you to review/update.
 *
 * Run :
 *   pnpm tsx scripts/pedagogical-solve-demo.ts
 */

import {
	presentEquation,
	EQ_2X_PLUS_3_EQ_7,
	EQ_3X_MINUS_2_EQ_MINUS_5X_PLUS_7,
	EQ_X_OVER_2_PLUS_1_OVER_3_EQ_1
} from '../src/lib/mathAST/pedagogical-solve/demo-helpers';

console.log(presentEquation('2x + 3 = 7', EQ_2X_PLUS_3_EQ_7));
console.log(presentEquation('3x − 2 = −5x + 7', EQ_3X_MINUS_2_EQ_MINUS_5X_PLUS_7));
console.log(presentEquation('x/2 + 1/3 = 1', EQ_X_OVER_2_PLUS_1_OVER_3_EQ_1));
