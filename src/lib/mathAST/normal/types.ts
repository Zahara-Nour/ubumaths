/**
 * MathAST Normal Form - Type Definitions
 *
 * Types for representing mathematical expressions in canonical normal form.
 * Used for exact algebraic computation and expression equivalence testing.
 *
 * Architecture:
 * - Rational: exact BigInt fractions for precise arithmetic
 * - SimplifiedRadical: radicals with no perfect factors extractable
 * - AlgebraicTerm: rational coefficient times product of radicals
 * - AlgebraicCoefficient: sum of algebraic terms (e.g., sqrt(2) + sqrt(3))
 * - SymbolicFactor: symbolic base raised to rational exponent
 * - NormalTerm: algebraic coefficient times monomial
 * - NormalForm: fraction of polynomial numerator/denominator with hash
 */

import type { MathNode } from '../types';

// =============================================================================
// Rational Numbers (Exact BigInt Fractions)
// =============================================================================

/**
 * Exact rational number as BigInt fraction.
 *
 * Invariants:
 * - Always reduced (gcd(|n|, d) = 1)
 * - Denominator always positive (d > 0)
 * - Sign stored in numerator only
 * - Zero is represented as { n: 0n, d: 1n }
 *
 * @example
 * // 3/4
 * { n: 3n, d: 4n }
 *
 * // -1/2
 * { n: -1n, d: 2n }
 *
 * // 5 (integer)
 * { n: 5n, d: 1n }
 */
export interface Rational {
	readonly n: bigint;
	readonly d: bigint;
}

// =============================================================================
// Simplified Radicals
// =============================================================================

/**
 * A simplified radical: radicand^(1/index)
 *
 * Invariants:
 * - radicand > 1 (radicand = 1 means the radical equals 1, should be removed)
 * - index >= 2
 * - radicand has no perfect index-th power factors extractable
 *   (e.g., sqrt(18) is invalid since sqrt(18) = 3*sqrt(2))
 *
 * @example
 * // sqrt(2) - square root of 2
 * { radicand: 2n, index: 2n }
 *
 * // cbrt(5) - cube root of 5
 * { radicand: 5n, index: 3n }
 */
export interface SimplifiedRadical {
	readonly radicand: bigint;
	readonly index: bigint;
}

// =============================================================================
// Algebraic Terms and Coefficients
// =============================================================================

/**
 * An algebraic term: rational coefficient times product of radicals.
 *
 * Represents expressions like 3*sqrt(2) or sqrt(2)*sqrt(3) = sqrt(6)
 *
 * Invariants:
 * - radicals array is sorted by (index, radicand) for canonical form
 * - rational is never zero (zero terms are eliminated)
 * - empty radicals array means purely rational term
 *
 * @example
 * // 3*sqrt(2)
 * { rational: { n: 3n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }] }
 *
 * // sqrt(6) = sqrt(2)*sqrt(3)
 * { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 6n, index: 2n }] }
 *
 * // 5 (pure rational)
 * { rational: { n: 5n, d: 1n }, radicals: [] }
 */
export interface AlgebraicTerm {
	readonly rational: Rational;
	readonly radicals: readonly SimplifiedRadical[];
}

/**
 * An algebraic coefficient: sum of algebraic terms.
 *
 * Used to represent irrational coefficients like sqrt(2) + sqrt(3)
 * that cannot be simplified further but can still be factored out.
 *
 * Invariants:
 * - terms array is sorted canonically for unique representation
 * - terms with same radical signature are combined (e.g., 3*sqrt(2) + 2*sqrt(2) = 5*sqrt(2))
 * - zero terms are eliminated
 * - empty terms array represents zero
 *
 * @example
 * // sqrt(2) + sqrt(3)
 * { terms: [
 *     { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }] },
 *     { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 2n }] }
 * ]}
 *
 * // 5*sqrt(2) (single term)
 * { terms: [{ rational: { n: 5n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }] }] }
 *
 * // 3 (pure rational)
 * { terms: [{ rational: { n: 3n, d: 1n }, radicals: [] }] }
 */
export interface AlgebraicCoefficient {
	readonly terms: readonly AlgebraicTerm[];
}

// =============================================================================
// Symbolic Factors and Monomials
// =============================================================================

/**
 * A symbolic factor: base^exponent where base is a MathNode.
 *
 * Used for variables, functions, and constants that cannot be
 * evaluated to algebraic numbers.
 *
 * Invariants:
 * - exponent is never zero (x^0 = 1, eliminated)
 * - base is a canonical MathNode (variable, function, greek letter, etc.)
 *
 * @example
 * // x^2
 * { base: VariableNode('x'), exponent: { n: 2n, d: 1n } }
 *
 * // sin(theta)^1
 * { base: FunctionNode('sin', theta), exponent: { n: 1n, d: 1n } }
 *
 * // y^(1/2) = sqrt(y)
 * { base: VariableNode('y'), exponent: { n: 1n, d: 2n } }
 */
export interface SymbolicFactor {
	readonly base: MathNode;
	readonly exponent: Rational;
}

// =============================================================================
// Normal Terms and Form
// =============================================================================

/**
 * A normal term: algebraic coefficient times monomial.
 *
 * Represents a single summand in normalized polynomial form.
 * The coefficient handles all numeric/algebraic values, while
 * the monomial handles all symbolic factors.
 *
 * Invariants:
 * - monomial array is sorted canonically
 * - coefficient is never zero (zero terms are eliminated)
 * - factors with same base have combined exponents
 *
 * @example
 * // 3*sqrt(2)*x^2
 * {
 *   coefficient: { terms: [{ rational: { n: 3n, d: 1n }, radicals: [sqrt(2)] }] },
 *   monomial: [{ base: x, exponent: 2 }]
 * }
 *
 * // (sqrt(2) + sqrt(3))*x*y
 * {
 *   coefficient: { terms: [sqrt(2), sqrt(3)] },
 *   monomial: [{ base: x, exponent: 1 }, { base: y, exponent: 1 }]
 * }
 */
export interface NormalTerm {
	readonly coefficient: AlgebraicCoefficient;
	readonly monomial: readonly SymbolicFactor[];
}

/**
 * Complete normal form: numerator / denominator with structural hash.
 *
 * This is the canonical representation of any algebraic expression.
 * Two expressions are mathematically equivalent if and only if
 * their normal forms have the same hash.
 *
 * Invariants:
 * - numerator and denominator are lists of NormalTerm
 * - terms are sorted in graded lexicographic order
 * - denominator is never empty (use [1] for polynomial)
 * - common factors are canceled between numerator and denominator
 * - hash is computed deterministically from the structure
 *
 * @example
 * // x^2 + 2x + 1
 * {
 *   numerator: [term(1, x^2), term(2, x), term(1, [])],
 *   denominator: [term(1, [])],
 *   hash: "x^2+2x+1"
 * }
 *
 * // (x + 1) / (x - 1)
 * {
 *   numerator: [term(1, x), term(1, [])],
 *   denominator: [term(1, x), term(-1, [])],
 *   hash: "(x+1)/(x-1)"
 * }
 */
export interface NormalForm {
	readonly numerator: readonly NormalTerm[];
	readonly denominator: readonly NormalTerm[];
	readonly hash: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Result of simplifying a radical.
 * The original radical n^(1/index) = coefficient * radicand^(1/index)
 *
 * @example
 * // sqrt(18) = 3 * sqrt(2)
 * { coefficient: 3n, radicand: 2n }
 *
 * // sqrt(4) = 2 * sqrt(1) = 2
 * { coefficient: 2n, radicand: 1n }
 */
export interface SimplifiedRadicalResult {
	readonly coefficient: bigint;
	readonly radicand: bigint;
}

/**
 * Comparison result type for ordering functions.
 * -1: a < b, 0: a = b, 1: a > b
 */
export type ComparisonResult = -1 | 0 | 1;
