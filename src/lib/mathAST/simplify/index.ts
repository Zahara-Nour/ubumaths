/**
 * Simplify Module
 *
 * Provides a unified simplify() function that orchestrates pattern rules,
 * normalization, and identity transforms to produce the simplest form
 * of a mathematical expression.
 *
 * @module mathAST/simplify
 */

export { simplify } from './simplify';
export { computeCost, cheapest } from './cost';
export type { SimplifyOptions, SimplifyResult, SimplifyStep, SimplifyPhase } from './types';
export { infinityTransforms } from './infinity-transforms';
