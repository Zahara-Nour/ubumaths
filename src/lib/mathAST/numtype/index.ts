/**
 * Numeric Type System for MathAST
 *
 * Provides type inference and analysis for mathematical expressions,
 * classifying them in a hierarchy of numeric types:
 *
 *     complex
 *        |
 *      real
 *        ├── transcendental (π, e, sin(1))
 *        └── algebraic
 *              ├── rational
 *              │     └── integer
 *              └── irrational_algebraic (√2, ∛5)
 *
 * @example
 * ```typescript
 * import { inferType, isIntegerType, isSubtype, P } from '$lib/mathAST';
 *
 * // Simple inference
 * inferType(parseLatex('5'));           // { base: 'integer', sign: 'positive' }
 * inferType(parseLatex('1/2'));         // { base: 'rational' }
 * inferType(parseLatex('\\sqrt{2}'));   // { base: 'irrational_algebraic' }
 * inferType(parseLatex('\\pi'));        // { base: 'transcendental' }
 *
 * // With variable context
 * const ctx = { variables: new Map([['n', 'integer']]) };
 * inferType(parseLatex('2n + 1'), ctx); // { base: 'integer' }
 *
 * // Type predicates
 * isIntegerType(parseLatex('5'));       // true
 * isRationalType(parseLatex('5'));      // true (integer < rational)
 *
 * // Type algebra
 * isSubtype('integer', 'rational');     // true
 * join('integer', 'rational');          // 'rational'
 *
 * // Pattern matching with type constraints
 * const pattern = P._('n', P.isIntegerType());
 * match(pattern, parseLatex('5'));      // success
 * match(pattern, parseLatex('5.5'));    // fail
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type { NumericType, SignInfo, MathType, TypeContext, TypeDescription } from './types';

export {
	EMPTY_CONTEXT,
	UNKNOWN_TYPE,
	INTEGER_TYPE,
	RATIONAL_TYPE,
	REAL_TYPE,
	COMPLEX_TYPE,
	TRANSCENDENTAL_TYPE,
	IRRATIONAL_ALGEBRAIC_TYPE,
	ALGEBRAIC_TYPE
} from './types';

// =============================================================================
// Type Algebra
// =============================================================================

export {
	// Core operations
	isSubtype,
	areCompatible,
	join,
	joinAll,
	meet,
	meetAll,
	// Utility functions
	getParents,
	getAncestors,
	getLevel,
	isLeafType,
	isAlgebraicBranch,
	isTranscendentalBranch
} from './algebra';

// =============================================================================
// Type Inference
// =============================================================================

export { inferType, clearTypeCache, clearAllTypeCache } from './infer';

// =============================================================================
// Type Predicates
// =============================================================================

export {
	// Base type predicates
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isTranscendentalType,
	isRealType,
	isComplexType,
	isIrrationalAlgebraicType,
	// Generic type checking
	hasType,
	isSubtypeOf,
	// Sign predicates
	isPositiveType,
	isNegativeType,
	isZeroType,
	isNonzeroType,
	isNonNegativeType,
	isNonPositiveType,
	// Finiteness predicates
	isFiniteType,
	isInfiniteType,
	// Accessors
	getType,
	getBaseType
} from './predicates';

// =============================================================================
// Inference Rules (for extension)
// =============================================================================

export {
	// Literal rules
	inferNumberType,
	inferMathConstantType,
	inferVariableType,
	inferGreekLetterType,
	inferLiteralType,
	// Arithmetic rules
	inferAdditionType,
	inferSubtractionType,
	inferMultiplicationType,
	inferDivisionType,
	inferOppositeType,
	inferPositiveType,
	// Power rules
	inferPowerType,
	inferSqrtType,
	// Function rules
	inferFunctionType
} from './rules';
