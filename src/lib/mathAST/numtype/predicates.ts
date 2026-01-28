/**
 * Type Predicates for MathAST
 *
 * Provides convenient predicate functions for checking
 * if expressions have specific numeric types.
 */

import type { MathNode } from '../types';
import type { TypeContext, NumericType, MathType } from './types';
import { EMPTY_CONTEXT } from './types';
import { isSubtype } from './algebra';
import { inferType } from './infer';

// =============================================================================
// Base Type Predicates
// =============================================================================

/**
 * Checks if an expression has integer type.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression type is 'integer'
 *
 * @example
 * isIntegerType(parseLatex('5'))       // true
 * isIntegerType(parseLatex('5.0'))     // true (5.0 is mathematically an integer)
 * isIntegerType(parseLatex('5.5'))     // false
 * isIntegerType(parseLatex('1/2'))     // false
 */
export function isIntegerType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.base === 'integer';
}

/**
 * Checks if an expression has rational type (or more specific).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression type is 'integer' or 'rational'
 *
 * @example
 * isRationalType(parseLatex('5'))      // true (integer is subtype of rational)
 * isRationalType(parseLatex('1/2'))    // true
 * isRationalType(parseLatex('\\sqrt{2}'))  // false
 */
export function isRationalType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return isSubtype(type.base, 'rational');
}

/**
 * Checks if an expression has algebraic type (or more specific).
 *
 * Algebraic numbers include integers, rationals, and irrational algebraics (like √2).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is algebraic
 *
 * @example
 * isAlgebraicType(parseLatex('5'))        // true
 * isAlgebraicType(parseLatex('1/2'))      // true
 * isAlgebraicType(parseLatex('\\sqrt{2}')) // true
 * isAlgebraicType(parseLatex('\\pi'))     // false (transcendental)
 */
export function isAlgebraicType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return isSubtype(type.base, 'algebraic');
}

/**
 * Checks if an expression has transcendental type.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression type is 'transcendental'
 *
 * @example
 * isTranscendentalType(parseLatex('\\pi'))     // true
 * isTranscendentalType(parseLatex('e'))        // true
 * isTranscendentalType(parseLatex('\\sin(1)')) // true
 * isTranscendentalType(parseLatex('\\sqrt{2}')) // false
 */
export function isTranscendentalType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.base === 'transcendental';
}

/**
 * Checks if an expression has real type (or more specific).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is real (not complex)
 *
 * @example
 * isRealType(parseLatex('5'))         // true
 * isRealType(parseLatex('\\pi'))      // true
 * isRealType(parseLatex('\\sqrt{-1}')) // false (complex)
 */
export function isRealType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return isSubtype(type.base, 'real');
}

/**
 * Checks if an expression has complex type.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression type is 'complex'
 *
 * @example
 * isComplexType(parseLatex('\\sqrt{-1}'))  // true
 * isComplexType(parseLatex('1 + i'))       // true
 * isComplexType(parseLatex('5'))           // false
 */
export function isComplexType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.base === 'complex';
}

/**
 * Checks if an expression has irrational algebraic type.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression type is 'irrational_algebraic'
 *
 * @example
 * isIrrationalAlgebraicType(parseLatex('\\sqrt{2}'))  // true
 * isIrrationalAlgebraicType(parseLatex('\\sqrt{4}'))  // false (= 2, integer)
 * isIrrationalAlgebraicType(parseLatex('\\pi'))       // false (transcendental)
 */
export function isIrrationalAlgebraicType(
	node: MathNode,
	ctx: TypeContext = EMPTY_CONTEXT
): boolean {
	const type = inferType(node, ctx);
	return type.base === 'irrational_algebraic';
}

// =============================================================================
// Generic Type Checking
// =============================================================================

/**
 * Checks if an expression has a specific numeric type.
 *
 * @param node - The MathNode to check
 * @param expectedType - The expected numeric type
 * @param ctx - Optional type context
 * @returns true if the expression type matches exactly
 *
 * @example
 * hasType(parseLatex('5'), 'integer')     // true
 * hasType(parseLatex('5'), 'rational')    // false (exact match, not subtype)
 */
export function hasType(
	node: MathNode,
	expectedType: NumericType,
	ctx: TypeContext = EMPTY_CONTEXT
): boolean {
	const type = inferType(node, ctx);
	return type.base === expectedType;
}

/**
 * Checks if an expression is a subtype of a given type.
 *
 * @param node - The MathNode to check
 * @param supertype - The type to check against
 * @param ctx - Optional type context
 * @returns true if the expression type is a subtype of (or equal to) supertype
 *
 * @example
 * isSubtypeOf(parseLatex('5'), 'rational')     // true (integer < rational)
 * isSubtypeOf(parseLatex('5'), 'integer')      // true (equal)
 * isSubtypeOf(parseLatex('\\pi'), 'rational')  // false
 */
export function isSubtypeOf(
	node: MathNode,
	supertype: NumericType,
	ctx: TypeContext = EMPTY_CONTEXT
): boolean {
	const type = inferType(node, ctx);
	return isSubtype(type.base, supertype);
}

// =============================================================================
// Sign Predicates
// =============================================================================

/**
 * Checks if an expression is known to be positive.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely positive
 */
export function isPositiveType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'positive';
}

/**
 * Checks if an expression is known to be negative.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely negative
 */
export function isNegativeType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'negative';
}

/**
 * Checks if an expression is known to be zero.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely zero
 */
export function isZeroType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'zero';
}

/**
 * Checks if an expression is known to be non-zero.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely not zero
 */
export function isNonzeroType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'positive' || type.sign === 'negative' || type.sign === 'nonzero';
}

/**
 * Checks if an expression is known to be non-negative (>= 0).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely non-negative
 */
export function isNonNegativeType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'positive' || type.sign === 'zero';
}

/**
 * Checks if an expression is known to be non-positive (<= 0).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely non-positive
 */
export function isNonPositiveType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.sign === 'negative' || type.sign === 'zero';
}

// =============================================================================
// Finiteness Predicates
// =============================================================================

/**
 * Checks if an expression is known to be finite.
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely finite
 */
export function isFiniteType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.finite === true;
}

/**
 * Checks if an expression is known to be infinite (±∞).
 *
 * @param node - The MathNode to check
 * @param ctx - Optional type context
 * @returns true if the expression is definitely infinite
 */
export function isInfiniteType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): boolean {
	const type = inferType(node, ctx);
	return type.finite === false;
}

// =============================================================================
// Type Information Accessors
// =============================================================================

/**
 * Gets the full type information for an expression.
 *
 * @param node - The MathNode to analyze
 * @param ctx - Optional type context
 * @returns The complete MathType including base, sign, and finiteness
 */
export function getType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): MathType {
	return inferType(node, ctx);
}

/**
 * Gets just the base numeric type for an expression.
 *
 * @param node - The MathNode to analyze
 * @param ctx - Optional type context
 * @returns The base NumericType
 */
export function getBaseType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): NumericType {
	return inferType(node, ctx).base;
}
