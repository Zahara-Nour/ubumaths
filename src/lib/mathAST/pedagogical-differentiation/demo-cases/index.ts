/**
 * Pedagogical Differentiation — Demo cases index.
 *
 * Each category groups related `DemoCase[]`. The exported `ALL_CATEGORIES`
 * is consumed by:
 *   - `__tests__/pedagogical-differentiation-demo.test.ts` (snapshot tests)
 *   - `scripts/pedagogical-differentiation-demo.ts` (CLI)
 *
 * @module mathAST/pedagogical-differentiation/demo-cases
 */

import type { DemoCategory } from '../demo-helpers';
import { COMPOSITION } from './composition';
import { EXPONENTIAL } from './exponential';
import { LOGARITHM } from './logarithm';
import { POLYNOMIAL } from './polynomial';
import { PRODUCT_QUOTIENT } from './product-quotient';
import { TRIGONOMETRIC } from './trigonometric';

export const ALL_CATEGORIES: readonly DemoCategory[] = [
	POLYNOMIAL,
	TRIGONOMETRIC,
	EXPONENTIAL,
	LOGARITHM,
	PRODUCT_QUOTIENT,
	COMPOSITION
];

export { COMPOSITION, EXPONENTIAL, LOGARITHM, POLYNOMIAL, PRODUCT_QUOTIENT, TRIGONOMETRIC };
