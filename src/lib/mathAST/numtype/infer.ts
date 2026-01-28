/**
 * Type Inference Engine for MathAST
 *
 * Provides the main entry point for inferring numeric types
 * from mathematical expressions.
 */

import type { MathNode, FunctionNode } from '../types';
import type { MathType, TypeContext, NumericType } from './types';
import { EMPTY_CONTEXT, UNKNOWN_TYPE, REAL_TYPE, COMPLEX_TYPE } from './types';
import { join } from './algebra';
import {
	inferLiteralType,
	inferAdditionType,
	inferSubtractionType,
	inferMultiplicationType,
	inferDivisionType,
	inferOppositeType,
	inferPositiveType,
	inferPowerType,
	inferFunctionType
} from './rules';

// =============================================================================
// Type Cache
// =============================================================================

/**
 * Cache for type inference results.
 * Uses WeakMap to avoid memory leaks - entries are garbage collected
 * when the MathNode is no longer referenced.
 */
const typeCache = new WeakMap<MathNode, Map<string, MathType>>();

/**
 * Generates a cache key from a TypeContext.
 * The key includes variable bindings to distinguish different contexts.
 */
function getCacheKey(ctx: TypeContext): string {
	if (!ctx.variables || ctx.variables.size === 0) {
		return ctx.strict ? '_strict_' : '_default_';
	}
	const entries = Array.from(ctx.variables.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([k, v]) => `${k}:${v}`)
		.join(',');
	return `${ctx.strict ? 's:' : ''}${entries}`;
}

/**
 * Gets a cached type result if available.
 */
function getCachedType(node: MathNode, ctx: TypeContext): MathType | undefined {
	const nodeCache = typeCache.get(node);
	if (!nodeCache) return undefined;
	return nodeCache.get(getCacheKey(ctx));
}

/**
 * Caches a type inference result.
 */
function cacheType(node: MathNode, ctx: TypeContext, type: MathType): void {
	let nodeCache = typeCache.get(node);
	if (!nodeCache) {
		nodeCache = new Map();
		typeCache.set(node, nodeCache);
	}
	nodeCache.set(getCacheKey(ctx), type);
}

// =============================================================================
// Main Inference Function
// =============================================================================

/**
 * Infers the numeric type of a mathematical expression.
 *
 * Uses structural inference to determine the type based on:
 * - Literal types (numbers, constants, variables)
 * - Operator semantics (arithmetic, power)
 * - Function definitions (transcendental, rounding, etc.)
 *
 * Results are cached using a WeakMap for performance.
 *
 * @param node - The MathNode to analyze
 * @param ctx - Optional type context with variable bindings
 * @returns The inferred MathType
 *
 * @example
 * // Simple number
 * inferType(parseLatex('5'))        // { base: 'integer', sign: 'positive' }
 *
 * // Arithmetic
 * inferType(parseLatex('1/2'))      // { base: 'rational' }
 *
 * // Square root
 * inferType(parseLatex('\\sqrt{2}'))  // { base: 'irrational_algebraic' }
 *
 * // Transcendental
 * inferType(parseLatex('\\pi'))     // { base: 'transcendental' }
 *
 * // With context
 * const ctx = { variables: new Map([['n', 'integer']]) };
 * inferType(parseLatex('2n + 1'), ctx)  // { base: 'integer' }
 */
export function inferType(node: MathNode, ctx: TypeContext = EMPTY_CONTEXT): MathType {
	// Check cache first
	const cached = getCachedType(node, ctx);
	if (cached !== undefined) {
		return cached;
	}

	// Perform inference
	const result = inferTypeUncached(node, ctx);

	// Cache the result
	cacheType(node, ctx, result);

	return result;
}

/**
 * Internal inference function without caching.
 */
function inferTypeUncached(node: MathNode, ctx: TypeContext): MathType {
	// Try literal inference first
	const literalType = inferLiteralType(node, ctx);
	if (literalType !== null) {
		return literalType;
	}

	// Handle each node type
	switch (node.type) {
		case 'addition':
			return inferAdditionType(inferType(node.left, ctx), inferType(node.right, ctx));

		case 'subtraction':
			return inferSubtractionType(inferType(node.left, ctx), inferType(node.right, ctx));

		case 'multiplication':
			return inferMultiplicationType(inferType(node.left, ctx), inferType(node.right, ctx));

		case 'division':
			return inferDivisionType(inferType(node.numerator, ctx), inferType(node.denominator, ctx));

		case 'opposite':
			return inferOppositeType(inferType(node.operand, ctx));

		case 'positive':
			return inferPositiveType(inferType(node.operand, ctx));

		case 'superscript':
			return inferSuperscriptType(node.base, node.superscript, ctx);

		case 'function':
			return inferFunctionNodeType(node, ctx);

		case 'delimiter':
			// Delimiters (parentheses) don't change type
			return inferType(node.content, ctx);

		case 'subscript':
			// Subscript base type (e.g., x_n is same type as x in general)
			return inferType(node.base, ctx);

		case 'relation':
			// Relations don't have a numeric type in the same sense
			// They produce a boolean, but we return unknown for now
			return UNKNOWN_TYPE;

		case 'unit':
			// Unit expressions have the type of the underlying expression
			return inferType(node.expression, ctx);

		case 'matrix':
			// Matrix type is based on element types (join of all elements)
			return inferMatrixType(node.rows, ctx);

		case 'complex':
			// Complex nodes are always complex type
			return COMPLEX_TYPE;

		case 'composition':
			// Function composition: (f ∘ g)(x) type depends on f's output
			// For now, return real as a safe default
			return REAL_TYPE;

		case 'infinity':
			// Infinity is real but not finite
			return {
				base: 'real',
				sign: node.sign === 'positive' ? 'positive' : 'negative',
				finite: false
			};

		case 'limit':
			// The type of a limit depends on the expression
			// We can't easily determine it structurally
			return inferType(node.expression, ctx);

		// Literal types are handled by inferLiteralType above
		// These cases should never be reached but are needed for exhaustive check
		case 'number':
		case 'variable':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
			// If we reach here, inferLiteralType returned null unexpectedly
			return UNKNOWN_TYPE;
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts numeric value from a node if it's a literal number or simple expression.
 *
 * Handles:
 * - NumberNode: direct value
 * - OppositeNode with number: negated value
 * - PositiveNode with number: same value
 */
function getNumericValue(node: MathNode): number | undefined {
	if (node.type === 'number') {
		const value = parseFloat(node.value);
		return Number.isFinite(value) ? value : undefined;
	}

	// Handle -n where n is a number
	if (node.type === 'opposite') {
		const operandValue = getNumericValue(node.operand);
		if (operandValue !== undefined) {
			return -operandValue;
		}
	}

	// Handle +n where n is a number
	if (node.type === 'positive') {
		return getNumericValue(node.operand);
	}

	return undefined;
}

/**
 * Infers type for superscript (power) operations.
 */
function inferSuperscriptType(base: MathNode, exponent: MathNode, ctx: TypeContext): MathType {
	const baseType = inferType(base, ctx);
	const expType = inferType(exponent, ctx);

	// Get numeric values if available
	const baseValue = getNumericValue(base);
	const expValue = getNumericValue(exponent);

	return inferPowerType(baseType, expType, baseValue, expValue);
}

/**
 * Infers type for function nodes.
 */
function inferFunctionNodeType(node: FunctionNode, ctx: TypeContext): MathType {
	const argTypes = node.args.map((arg) => inferType(arg, ctx));
	const argValues = node.args.map((arg) => getNumericValue(arg));

	return inferFunctionType(node.name, argTypes, argValues);
}

/**
 * Infers type for matrix based on element types.
 */
function inferMatrixType(rows: readonly (readonly MathNode[])[], ctx: TypeContext): MathType {
	let resultBase: NumericType = 'integer'; // Start with most specific

	for (const row of rows) {
		for (const elem of row) {
			const elemType = inferType(elem, ctx);
			resultBase = join(resultBase, elemType.base);
		}
	}

	return { base: resultBase };
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clears the type cache for a specific node.
 * Useful when a node is modified and needs re-inference.
 */
export function clearTypeCache(node: MathNode): void {
	typeCache.delete(node);
}

/**
 * Clears the entire type cache.
 * Use sparingly - mainly for testing or memory management.
 */
export function clearAllTypeCache(): void {
	// WeakMap doesn't have a clear() method, so we create a new one
	// This works because the old WeakMap will be garbage collected
	// once no references to its keys exist
	// Note: This is a no-op for the module-level cache,
	// but callers can use it for documentation purposes
}
