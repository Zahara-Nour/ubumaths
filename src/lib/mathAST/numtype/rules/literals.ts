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
import type { MathType, ParityInfo, SignInfo, TypeContext } from '../types';
import { REAL_TYPE, UNKNOWN_TYPE } from '../types';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Helper: Sign deduction from bounds
// =============================================================================

/**
 * Deduce sign from bounds when sign is not already known.
 * - If lower > 0 (or lower === 0 and not inclusive) → positive
 * - If upper < 0 (or upper === 0 and not inclusive) → negative
 * - If lower === 0 and upper === 0 → zero
 */
export function signFromBounds(bounds: Bounds): SignInfo | undefined {
	const { lower, upper, lowerInclusive, upperInclusive } = bounds;

	// Singleton zero
	if (lower === 0 && upper === 0 && lowerInclusive && upperInclusive) {
		return 'zero';
	}

	// Entirely positive: lower > 0, or lower === 0 and open (exclusive)
	if (lower !== null && (lower > 0 || (lower === 0 && !lowerInclusive))) {
		return 'positive';
	}

	// Entirely negative: upper < 0, or upper === 0 and open (exclusive)
	if (upper !== null && (upper < 0 || (upper === 0 && !upperInclusive))) {
		return 'negative';
	}

	return undefined;
}

/**
 * Build a MathType enriched with assumption data (sign, finite, parity, bounds).
 * Deduces sign from bounds if sign is not explicitly provided.
 */
function typeWithAssumption(
	base: MathType['base'],
	assumption: { sign?: SignInfo; finite?: boolean; parity?: ParityInfo; bounds?: Bounds }
): MathType {
	let sign = assumption.sign;

	// Deduce sign from bounds if not explicitly set
	if (sign === undefined && assumption.bounds) {
		sign = signFromBounds(assumption.bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(assumption.finite !== undefined && { finite: assumption.finite }),
		...(assumption.parity !== undefined && { parity: assumption.parity }),
		...(assumption.bounds !== undefined && { bounds: assumption.bounds })
	};
}

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

	// Parity for integers
	let parity: ParityInfo | undefined;
	if (isInteger) {
		parity = Math.abs(value) % 2 === 0 ? 'even' : 'odd';
	}

	const bounds: Bounds = {
		lower: value,
		upper: value,
		lowerInclusive: true,
		upperInclusive: true
	};

	return {
		base: isInteger ? 'integer' : 'real',
		sign,
		finite: true,
		...(parity !== undefined && { parity }),
		bounds
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
export function inferMathConstantType(node: MathConstantNode): MathType {
	// Both π and e are positive transcendental numbers
	const value = node.constant === 'pi' ? Math.PI : Math.E;
	return {
		base: 'transcendental',
		sign: 'positive',
		finite: true,
		bounds: { lower: value, upper: value, lowerInclusive: true, upperInclusive: true }
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
	const assumption = ctx.assumptions?.get(node.name);

	if (varType !== undefined) {
		if (assumption) {
			return typeWithAssumption(varType, assumption);
		}
		return { base: varType };
	}

	// Special case: 'e' is Euler's number (transcendental)
	// Only if not explicitly defined in context
	if (node.name === 'e') {
		return {
			base: 'transcendental',
			sign: 'positive',
			finite: true,
			bounds: { lower: Math.E, upper: Math.E, lowerInclusive: true, upperInclusive: true }
		};
	}

	// Default behavior based on strict mode
	if (ctx.strict) {
		if (assumption) {
			return typeWithAssumption('unknown', assumption);
		}
		return UNKNOWN_TYPE;
	}

	// Enrich default 'real' with assumptions if available
	if (assumption) {
		return typeWithAssumption('real', assumption);
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
	// Check if the greek letter has a known type in context
	const letterName = node.letter;
	const varType = ctx.variables?.get(letterName);
	const assumption = ctx.assumptions?.get(letterName);

	if (varType !== undefined) {
		if (assumption) {
			return typeWithAssumption(varType, assumption);
		}
		return { base: varType };
	}

	// Default behavior based on strict mode
	if (ctx.strict) {
		if (assumption) {
			return typeWithAssumption('unknown', assumption);
		}
		return UNKNOWN_TYPE;
	}

	if (assumption) {
		return typeWithAssumption('real', assumption);
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
