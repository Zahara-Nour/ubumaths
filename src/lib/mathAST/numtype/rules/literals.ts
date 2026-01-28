/**
 * Type Inference Rules for Literals
 *
 * Handles type inference for:
 * - NumberNode: integer or real based on value
 * - MathConstantNode: π and e are transcendental
 * - VariableNode: from context or default
 * - GreekLetterNode: from context or default
 * - HoleNode, SymbolNode: unknown
 */

import type {
	MathNode,
	NumberNode,
	MathConstantNode,
	VariableNode,
	GreekLetterNode
} from '../../types';
import type { MathType, TypeContext } from '../types';
import { REAL_TYPE, TRANSCENDENTAL_TYPE, UNKNOWN_TYPE } from '../types';

// =============================================================================
// Number Node Inference
// =============================================================================

/**
 * Infers the type of a NumberNode.
 *
 * A number is an integer if:
 * - It has no decimal point, OR
 * - Its numeric value is a mathematical integer (e.g., 5.0)
 *
 * @param node - The number node
 * @returns MathType with base 'integer' or 'real' and sign information
 */
export function inferNumberType(node: NumberNode): MathType {
	const value = parseFloat(node.value);

	// Check if finite
	if (!Number.isFinite(value)) {
		return { base: 'real', finite: false };
	}

	// Determine sign
	let sign: MathType['sign'];
	if (value > 0) {
		sign = 'positive';
	} else if (value < 0) {
		sign = 'negative';
	} else {
		sign = 'zero';
	}

	// Check if integer (mathematical value, not string representation)
	const isInteger = Number.isInteger(value);

	return {
		base: isInteger ? 'integer' : 'real',
		sign,
		finite: true
	};
}

// =============================================================================
// Math Constant Node Inference
// =============================================================================

/**
 * Infers the type of a MathConstantNode.
 *
 * Both π and e are transcendental numbers.
 *
 * @param node - The math constant node
 * @returns MathType with base 'transcendental' and sign 'positive'
 */
export function inferMathConstantType(_node: MathConstantNode): MathType {
	// Both π and e are positive transcendental numbers
	return {
		base: 'transcendental',
		sign: 'positive',
		finite: true
	};
}

// =============================================================================
// Variable Node Inference
// =============================================================================

/**
 * Infers the type of a VariableNode.
 *
 * Special case: 'e' (Euler's number) is treated as transcendental
 * unless overridden in context.
 *
 * If the variable is in the context, uses that type.
 * Otherwise:
 * - In strict mode: returns 'unknown'
 * - In normal mode: returns 'real' (default assumption)
 *
 * @param node - The variable node
 * @param ctx - Type context with variable bindings
 * @returns MathType based on context or default
 */
export function inferVariableType(node: VariableNode, ctx: TypeContext): MathType {
	const varType = ctx.variables?.get(node.name);

	if (varType !== undefined) {
		return { base: varType };
	}

	// Special case: 'e' is Euler's number (transcendental)
	// Only if not explicitly defined in context
	if (node.name === 'e') {
		return {
			base: 'transcendental',
			sign: 'positive',
			finite: true
		};
	}

	// Default behavior based on strict mode
	if (ctx.strict) {
		return UNKNOWN_TYPE;
	}

	return REAL_TYPE;
}

// =============================================================================
// Greek Letter Node Inference
// =============================================================================

/**
 * Infers the type of a GreekLetterNode.
 *
 * Greek letters are generally treated as variables, except for π (pi)
 * which is a mathematical constant and is transcendental.
 *
 * @param node - The greek letter node
 * @param ctx - Type context with variable bindings
 * @returns MathType based on context or default
 */
export function inferGreekLetterType(node: GreekLetterNode, ctx: TypeContext): MathType {
	// Special case: pi is a transcendental constant
	if (node.letter === 'pi') {
		return TRANSCENDENTAL_TYPE;
	}

	// Check if the greek letter has a known type in context
	const letterName = node.letter;
	const varType = ctx.variables?.get(letterName);

	if (varType !== undefined) {
		return { base: varType };
	}

	// Default behavior based on strict mode
	if (ctx.strict) {
		return UNKNOWN_TYPE;
	}

	return REAL_TYPE;
}

// =============================================================================
// Inference Table for Literal Nodes
// =============================================================================

/**
 * Maps literal node types to their inference functions.
 */
export function inferLiteralType(node: MathNode, ctx: TypeContext): MathType | null {
	switch (node.type) {
		case 'number':
			return inferNumberType(node);

		case 'constant':
			return inferMathConstantType(node);

		case 'variable':
			return inferVariableType(node, ctx);

		case 'greek':
			return inferGreekLetterType(node, ctx);

		case 'hole':
		case 'symbol':
			return UNKNOWN_TYPE;

		default:
			// Not a literal node
			return null;
	}
}
