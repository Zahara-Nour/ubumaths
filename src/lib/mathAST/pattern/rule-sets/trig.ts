/**
 * Trigonometric Known Value Rules
 *
 * - sin(0) = 0
 * - cos(0) = 1
 * - tan(0) = 0
 * - sin(pi) = 0
 * - cos(pi) = -1
 *
 * @module mathAST/pattern/rule-sets/trig
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';
import { piConstant } from '../../factory';

// =============================================================================
// Known Values at 0
// =============================================================================

/** sin(0) = 0 */
const sinZero = createRule(P.func('sin', [P.num(0)]), P.num(0), {
	name: 'sin-zero'
});

/** cos(0) = 1 */
const cosZero = createRule(P.func('cos', [P.num(0)]), P.num(1), {
	name: 'cos-zero'
});

/** tan(0) = 0 */
const tanZero = createRule(P.func('tan', [P.num(0)]), P.num(0), {
	name: 'tan-zero'
});

// =============================================================================
// Known Values at pi
// =============================================================================

/** sin(pi) = 0 */
const sinPi = createRule(P.func('sin', [P.lit(piConstant())]), P.num(0), {
	name: 'sin-pi'
});

/** cos(pi) = -1 */
const cosPi = createRule(P.func('cos', [P.lit(piConstant())]), P.neg(P.num(1)), {
	name: 'cos-pi'
});

// =============================================================================
// Exports
// =============================================================================

export const trigRules: readonly Rule[] = [sinZero, cosZero, tanZero, sinPi, cosPi] as const;
