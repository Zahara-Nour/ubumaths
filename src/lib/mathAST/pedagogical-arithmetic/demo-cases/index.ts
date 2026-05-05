/**
 * Demo cases — Index.
 *
 * Each category groups related `DemoCase[]`. The exported `ALL_CATEGORIES`
 * is consumed by :
 *   - `__tests__/pedagogical-arithmetic-demo.test.ts` (snapshot tests, one
 *     `describe()` per category)
 *   - `scripts/pedagogical-arithmetic-demo.ts` (CLI : runs all by default,
 *     or filters by category names from argv)
 *
 * To add a new case : append to the relevant category file. To add a new
 * category : create a new file and import + register it here.
 *
 * @module mathAST/pedagogical-arithmetic/demo-cases
 */

import type { DemoCategory } from '../demo-helpers';
import { ANSWER_FORMAT_SCENARIOS } from './answer-format-scenarios';
import { BASIC } from './basic';
import { FRACTIONS } from './fractions';
import { RADICALS } from './radicals';
import { SCIENTIFIC } from './scientific';
import { TARGET_FORM_SCENARIOS } from './target-form-scenarios';

export const ALL_CATEGORIES: readonly DemoCategory[] = [
	{ name: 'basic', cases: BASIC },
	{ name: 'fractions', cases: FRACTIONS },
	{ name: 'radicals', cases: RADICALS },
	{ name: 'scientific', cases: SCIENTIFIC },
	{ name: 'target-form-scenarios', cases: TARGET_FORM_SCENARIOS },
	{ name: 'answer-format-scenarios', cases: ANSWER_FORMAT_SCENARIOS }
];

export { ANSWER_FORMAT_SCENARIOS, BASIC, FRACTIONS, RADICALS, SCIENTIFIC, TARGET_FORM_SCENARIOS };
