/**
 * Demo equations (quadratic) — Index
 *
 * Each category is a thematic group of `DemoCase[]`. The exported
 * `ALL_CATEGORIES_QUADRATIC` is consumed by :
 * - `__tests__/quadratic-demo.test.ts` (one `describe()` per category)
 * - `scripts/pedagogical-quadratic-demo.ts` (CLI runs all by default)
 *
 * @module mathAST/pedagogical-solve/demo-equations-quadratic
 */

import type { DemoCategory } from '../demo-helpers';
import { STANDARD_POSITIF } from './standard-positif';
import { STANDARD_DOUBLE } from './standard-double';
import { STANDARD_NEGATIF } from './standard-negatif';
import { B_ZERO } from './b-zero';
import { C_ZERO } from './c-zero';
import { FACTORISE } from './factorise';
import { NON_STANDARD_FORM } from './non-standard-form';

export const ALL_CATEGORIES_QUADRATIC: readonly DemoCategory[] = [
	{ name: 'standard-positif', cases: STANDARD_POSITIF },
	{ name: 'standard-double', cases: STANDARD_DOUBLE },
	{ name: 'standard-negatif', cases: STANDARD_NEGATIF },
	{ name: 'b-zero', cases: B_ZERO },
	{ name: 'c-zero', cases: C_ZERO },
	{ name: 'factorise', cases: FACTORISE },
	{ name: 'non-standard-form', cases: NON_STANDARD_FORM }
];

export {
	STANDARD_POSITIF,
	STANDARD_DOUBLE,
	STANDARD_NEGATIF,
	B_ZERO,
	C_ZERO,
	FACTORISE,
	NON_STANDARD_FORM
};
