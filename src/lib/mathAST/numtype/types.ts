/**
 * Numeric Type System for MathAST
 *
 * Defines a hierarchy of numeric types for mathematical expressions:
 *
 *     complex
 *        |
 *      real
 *        ├── transcendental (π, e, sin(1), ln(2))
 *        └── algebraic
 *              ├── rational
 *              │     └── integer
 *              └── irrational_algebraic (√2, ∛5)
 */

// =============================================================================
// Numeric Type Enum
// =============================================================================

/**
 * Numeric type classification in the mathematical type hierarchy.
 *
 * The hierarchy is (most specific to most general):
 * - integer < rational < algebraic < real < complex
 * - integer < rational < algebraic < real < complex
 * - irrational_algebraic < algebraic < real < complex
 * - transcendental < real < complex
 *
 * 'unknown' is used when the type cannot be determined.
 */
export type NumericType =
	| 'integer'
	| 'rational'
	| 'irrational_algebraic' // √2, ∛5
	| 'transcendental' // π, e, sin(1)
	| 'algebraic' // rational ∪ irrational_algebraic
	| 'real' // algebraic ∪ transcendental
	| 'complex'
	| 'unknown';

// =============================================================================
// Sign Information
// =============================================================================

/**
 * Sign information for a numeric value.
 */
export type SignInfo = 'positive' | 'negative' | 'zero' | 'nonzero' | 'unknown';

// =============================================================================
// Math Type (Full Type Information)
// =============================================================================

/**
 * Complete type information for a mathematical expression.
 *
 * Combines the base numeric type with additional properties like sign and finiteness.
 */
export interface MathType {
	/** The base numeric type classification */
	readonly base: NumericType;

	/** Sign information if known */
	readonly sign?: SignInfo;

	/** Whether the value is finite (false for ±∞) */
	readonly finite?: boolean;
}

// =============================================================================
// Type Context
// =============================================================================

/**
 * Context for type inference, providing variable type information.
 */
export interface TypeContext {
	/**
	 * Known types for variables.
	 * Variables not in this map default to 'real' (or 'unknown' if strict mode).
	 */
	readonly variables?: ReadonlyMap<string, NumericType>;

	/**
	 * If true, unknown variables are typed as 'unknown' instead of 'real'.
	 * Useful for stricter analysis where variable types must be explicitly declared.
	 */
	readonly strict?: boolean;
}

// =============================================================================
// Type Description (for feedback)
// =============================================================================

/**
 * Rich type description for pedagogical feedback.
 */
export interface TypeDescription {
	/** Short identifier (e.g., "integer", "rational") */
	readonly id: NumericType;

	/** Human-readable name in French */
	readonly nameFr: string;

	/** Short description in French */
	readonly descriptionFr: string;

	/** Example values */
	readonly examples: readonly string[];

	/** Parent types in the hierarchy */
	readonly parents: readonly NumericType[];

	/** Child types in the hierarchy */
	readonly children: readonly NumericType[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Empty type context (all variables default to 'real').
 */
export const EMPTY_CONTEXT: TypeContext = {};

/**
 * Default MathType for unknown expressions.
 */
export const UNKNOWN_TYPE: MathType = { base: 'unknown' };

/**
 * Default MathType for integer expressions.
 */
export const INTEGER_TYPE: MathType = { base: 'integer' };

/**
 * Default MathType for rational expressions.
 */
export const RATIONAL_TYPE: MathType = { base: 'rational' };

/**
 * Default MathType for real expressions.
 */
export const REAL_TYPE: MathType = { base: 'real' };

/**
 * Default MathType for complex expressions.
 */
export const COMPLEX_TYPE: MathType = { base: 'complex' };

/**
 * Default MathType for transcendental expressions.
 * Most common transcendental constants (π, e) are positive and finite.
 */
export const TRANSCENDENTAL_TYPE: MathType = {
	base: 'transcendental',
	sign: 'positive',
	finite: true
};

/**
 * Default MathType for irrational algebraic expressions.
 */
export const IRRATIONAL_ALGEBRAIC_TYPE: MathType = { base: 'irrational_algebraic' };

/**
 * Default MathType for algebraic expressions.
 */
export const ALGEBRAIC_TYPE: MathType = { base: 'algebraic' };
