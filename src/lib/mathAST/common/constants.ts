/**
 * Shared Constants
 *
 * Centralized tolerance values and thresholds used across mathAST modules.
 *
 * @module mathAST/common/constants
 */

/**
 * Tolerance for considering a floating-point value as zero.
 * Used in comparisons like `Math.abs(x) < ZERO_TOLERANCE`.
 */
export const ZERO_TOLERANCE = 1e-10;

/**
 * Tolerance for considering two floating-point values as equal.
 * Used in comparisons like `Math.abs(a - b) < EQUALITY_TOLERANCE`.
 */
export const EQUALITY_TOLERANCE = 1e-10;

/**
 * Threshold above which a finite value is treated as "approaching infinity".
 * Used in numeric heuristics for limit evaluation.
 */
export const INFINITY_THRESHOLD = 1e8;

/**
 * Small delta for numeric differentiation and one-sided approach.
 */
export const NUMERIC_DELTA = 1e-8;
