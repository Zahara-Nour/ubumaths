/**
 * MathAST Taylor Series Module
 *
 * Provides Taylor (and Maclaurin) series expansion for mathematical expressions.
 * Computes polynomial approximations by repeated differentiation and evaluation.
 *
 * @module mathAST/taylor
 *
 * @example
 * ```typescript
 * import { taylorExpand, maclaurin } from '$lib/mathAST/taylor';
 * import { func, variable } from '$lib/mathAST/factory';
 * import { toCustom } from '$lib/mathAST';
 *
 * // Maclaurin series of sin(x), 5 terms
 * const sinExpr = func('sin', [variable('x')]);
 * const taylor = taylorExpand(sinExpr, { terms: 5 });
 * console.log(toCustom(taylor)); // "x - x^3/6 + x^5/120"
 *
 * // Taylor series of exp(x) at x=0, 4 terms
 * const expExpr = func('exp', [variable('x')]);
 * const taylor = maclaurin(expExpr, 4);
 * // Result: 1 + x + x^2/2 + x^3/6
 *
 * // Taylor series of ln(x) centered at x=1
 * const lnExpr = func('ln', [variable('x')]);
 * const taylor = taylorExpand(lnExpr, { center: 1, terms: 4 });
 * // Result: (x-1) - (x-1)^2/2 + (x-1)^3/3 - ...
 *
 * // With user-defined function
 * const functions = {
 *   f: { expression: parseLatex('x^2'), parameters: ['x'] }
 * };
 * const result = taylorExpand(func('f', [variable('x')]), { terms: 3 }, functions);
 * // Result: x^2 (polynomial stays as polynomial)
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type { TaylorOptions } from './types';
export { DEFAULT_TAYLOR_OPTIONS, MAX_TAYLOR_TERMS, TaylorError } from './types';

// =============================================================================
// Main Functions
// =============================================================================

export { taylorExpand, maclaurin } from './expand';
