/**
 * MathAST Function Bindings
 *
 * Types and functions for substituting generic function definitions
 * (like f(x), g(x)) in mathematical expressions.
 *
 * @module mathAST/eval/function-bindings
 */

import type { MathNode, FunctionNode, CompositionNode } from '../types';
import type { SubstituteOptions } from './types';
import type { Domain } from '../domain/types';
import { DEFAULT_SUBSTITUTE_OPTIONS } from './types';
import { mapNode } from '../transforms';
import {
	isFunction,
	isComposition,
	isVariable,
	isDerivativeFunction,
	isInverseFunction
} from '../guards';
import { func } from '../factory';
import { substitute } from './substitute';

// =============================================================================
// Types
// =============================================================================

/**
 * Definition of a generic function for substitution and evaluation.
 *
 * A function definition consists of an expression (the function body)
 * and a list of parameter names that will be substituted with arguments.
 * Optionally includes pre-computed derivative and inverse expressions.
 *
 * @example
 * // f(x) = x^2 + 1
 * const fDef: FunctionDefinition = {
 *   expression: parseLatex('x^2 + 1'),
 *   parameters: ['x']
 * };
 *
 * // g(x, y) = x + y
 * const gDef: FunctionDefinition = {
 *   expression: parseLatex('x + y'),
 *   parameters: ['x', 'y']
 * };
 *
 * // f(x) = x^2 with pre-computed derivative
 * const fWithDeriv: FunctionDefinition = {
 *   expression: parseLatex('x^2'),
 *   parameters: ['x'],
 *   derivative: parseLatex('2x')  // f'(x) = 2x
 * };
 *
 * // f(x) = x^2 (for x >= 0) with pre-computed inverse
 * const fWithInverse: FunctionDefinition = {
 *   expression: parseLatex('x^2'),
 *   parameters: ['x'],
 *   inverse: parseLatex('\\sqrt{x}')  // f^{-1}(x) = sqrt(x)
 * };
 */
export interface FunctionDefinition {
	/** The expression defining the function body */
	readonly expression: MathNode;
	/** Parameter names in order (e.g., ['x'] or ['x', 'y']) */
	readonly parameters: readonly string[];
	/**
	 * Optional pre-computed derivative expression.
	 * Used when evaluating f'(x) calls.
	 * Should use the same parameter names as the function.
	 */
	readonly derivative?: MathNode;
	/**
	 * Optional pre-computed inverse expression.
	 * Used when evaluating f^{-1}(x) calls.
	 * Should use the same parameter names as the function.
	 */
	readonly inverse?: MathNode;
	/**
	 * Optional domain of definition.
	 * Auto-computed when the function is defined.
	 */
	readonly domain?: Domain;
}

/**
 * Map of function names to their definitions.
 *
 * @example
 * const bindings: FunctionBindings = {
 *   f: { expression: parseLatex('x^2'), parameters: ['x'] },
 *   g: { expression: parseLatex('x + 1'), parameters: ['x'] }
 * };
 */
export type FunctionBindings = Record<string, FunctionDefinition>;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when function application fails.
 */
export class FunctionBindingError extends Error {
	constructor(
		message: string,
		public readonly functionName: string,
		public readonly details?: string
	) {
		super(message);
		this.name = 'FunctionBindingError';
	}
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Checks if a FunctionNode should be substituted.
 *
 * Returns true if:
 * - Regular function call with a binding (f(x))
 * - Derivative function with a pre-computed derivative (f'(x) with derivative defined)
 * - Inverse function with a pre-computed inverse (f^{-1}(x) with inverse defined)
 *
 * Returns false for:
 * - Built-in functions (sin, cos, sqrt, etc.)
 * - Derivative functions without pre-computed derivative
 * - Inverse functions without pre-computed inverse
 * - Functions without a matching binding
 *
 * @param funcNode - The FunctionNode to check
 * @param bindings - Available function definitions
 * @returns True if the function should be substituted
 */
function shouldSubstitute(funcNode: FunctionNode, bindings: FunctionBindings): boolean {
	// Store name to avoid TypeScript narrowing issues with type guards
	const funcName = funcNode.name;
	const definition = bindings[funcName];

	// Handle derivative functions
	if (isDerivativeFunction(funcNode)) {
		// Only substitute if we have a derivative defined for first-order derivatives
		// Higher-order derivatives require differentiation (not yet supported)
		if (definition?.derivative && funcNode.derivativeOrder === 1) {
			return true;
		}
		return false;
	}

	// Handle inverse functions
	if (isInverseFunction(funcNode)) {
		// Only substitute if we have an inverse defined
		if (definition?.inverse) {
			return true;
		}
		return false;
	}

	// Regular function call - substitute if we have a binding
	return funcName in bindings;
}

/**
 * Apply a function definition to a FunctionNode.
 * Substitutes the function's parameters with the provided arguments.
 *
 * For derivative functions (f'(x)), uses the pre-computed derivative if available.
 * For inverse functions (f^{-1}(x)), uses the pre-computed inverse if available.
 *
 * @param funcNode - The FunctionNode to apply (e.g., f(x+1), f'(3), f^{-1}(4))
 * @param bindings - Available function definitions
 * @returns The substituted expression, or null if no binding exists or should not substitute
 * @throws FunctionBindingError if argument count doesn't match parameter count
 *
 * @example
 * // With f(x) = x^2 defined, f(3) becomes 3^2
 * const fDef = { expression: parseLatex('x^2'), parameters: ['x'] };
 * const result = applyFunction(parseLatex('f(3)'), { f: fDef });
 * // result is equivalent to parseLatex('3^2')
 *
 * @example
 * // With f(x) = x^2 and derivative = 2x, f'(3) becomes 2*3 = 6
 * const fDef = {
 *   expression: parseLatex('x^2'),
 *   parameters: ['x'],
 *   derivative: parseLatex('2x')
 * };
 * const result = applyFunction(derivativeFunc('f', [number('3')], 1), { f: fDef });
 * // result is equivalent to parseLatex('2*3')
 */
export function applyFunction(funcNode: FunctionNode, bindings: FunctionBindings): MathNode | null {
	// Store name to avoid TypeScript narrowing issues with type guards
	const funcName = funcNode.name;

	// Check if this function should be substituted
	if (!shouldSubstitute(funcNode, bindings)) {
		return null;
	}

	const definition = bindings[funcName];
	if (!definition) {
		return null;
	}

	// Determine which expression to use based on function type
	let expressionToUse: MathNode;

	if (isDerivativeFunction(funcNode) && funcNode.derivativeOrder === 1 && definition.derivative) {
		// Use the pre-computed derivative expression
		expressionToUse = definition.derivative;
	} else if (isInverseFunction(funcNode) && definition.inverse) {
		// Use the pre-computed inverse expression
		expressionToUse = definition.inverse;
	} else {
		// Use the regular function expression
		expressionToUse = definition.expression;
	}

	// Validate argument count
	if (funcNode.args.length !== definition.parameters.length) {
		const funcDesc = isDerivativeFunction(funcNode)
			? `${funcName}'`
			: isInverseFunction(funcNode)
				? `${funcName}^{-1}`
				: funcName;
		throw new FunctionBindingError(
			`Function '${funcDesc}' expects ${definition.parameters.length} argument(s) but got ${funcNode.args.length}`,
			funcName,
			`Parameters: [${definition.parameters.join(', ')}], Arguments provided: ${funcNode.args.length}`
		);
	}

	// Build variable bindings from parameters and arguments
	const varBindings: Record<string, MathNode> = {};
	for (let i = 0; i < definition.parameters.length; i++) {
		varBindings[definition.parameters[i]] = funcNode.args[i];
	}

	// Substitute parameters in the expression
	return substitute(expressionToUse, varBindings);
}

/**
 * Expand a CompositionNode to a function application.
 *
 * (f o g) when applied to arguments becomes f(g(...args))
 *
 * This function handles CompositionNode by creating a nested function call
 * structure that can then be substituted with function bindings.
 *
 * @param composition - The CompositionNode (f o g)
 * @param args - Arguments to apply to the composition
 * @returns A FunctionNode representing f(g(args))
 */
function expandComposition(composition: CompositionNode, args: readonly MathNode[]): MathNode {
	// Get the outer and inner functions
	const { outer, inner } = composition;

	// First apply inner function to args
	let innerResult: MathNode;

	if (isFunction(inner)) {
		// Inner is already a function, apply args to it
		innerResult = func(inner.name, args, {
			derivativeOrder: inner.derivativeOrder,
			isInverse: inner.isInverse
		});
	} else if (isVariable(inner)) {
		// Inner is a variable representing a function name
		innerResult = func(inner.name, args);
	} else if (isComposition(inner)) {
		// Nested composition: (f o (g o h))(x) = f(g(h(x)))
		innerResult = expandComposition(inner, args);
	} else {
		// Inner is some other expression - treat as the result directly
		// This handles cases like (f o 2)(x) which doesn't make mathematical sense
		// but we can still return the inner as-is
		innerResult = inner;
	}

	// Then apply outer function to the inner result
	if (isFunction(outer)) {
		return func(outer.name, [innerResult], {
			derivativeOrder: outer.derivativeOrder,
			isInverse: outer.isInverse
		});
	} else if (isVariable(outer)) {
		// Outer is a variable representing a function name
		return func(outer.name, [innerResult]);
	} else if (isComposition(outer)) {
		// Nested composition: ((f o g) o h)(x) = f(g(h(x)))
		return expandComposition(outer, [innerResult]);
	}

	// Outer is some other expression - this is an edge case
	// Return the outer applied to inner as best we can
	return func('apply', [outer, innerResult]);
}

/**
 * Check if a node contains any substitutable functions.
 *
 * @param node - The node to check
 * @param bindings - Available function definitions
 * @returns True if any function in the tree can be substituted
 */
function hasSubstitutableFunctions(node: MathNode, bindings: FunctionBindings): boolean {
	let found = false;

	mapNode(node, (n) => {
		if (found) return n; // Early exit optimization

		if (isFunction(n) && shouldSubstitute(n, bindings)) {
			found = true;
		}

		return n;
	});

	return found;
}

/**
 * Perform a single pass of function substitution through the AST.
 *
 * @param node - The node to transform
 * @param bindings - Function bindings to apply
 * @returns New AST with function calls substituted
 */
function substituteFunctionOnce(node: MathNode, bindings: FunctionBindings): MathNode {
	return mapNode(node, (n) => {
		// Handle FunctionNode
		if (isFunction(n)) {
			const result = applyFunction(n, bindings);
			if (result !== null) {
				return result;
			}
		}

		// No substitution for this node
		return n;
	});
}

/**
 * Substitute all generic function calls in an expression.
 * Recursively applies function definitions until no more can be applied.
 *
 * This function:
 * 1. Substitutes function calls with their definitions
 * 2. Handles nested function calls (f(g(x)) with both defined)
 * 3. Preserves derivative functions (f'(x) stays as f'(x))
 * 4. Preserves inverse functions (f^{-1}(x) stays as f^{-1}(x))
 *
 * @param node - The expression to transform
 * @param bindings - Available function definitions
 * @param options - Substitution options (maxIterations)
 * @returns New AST with function calls substituted
 *
 * @example
 * // With f(x) = x^2 and g(x) = x + 1 defined
 * const bindings = {
 *   f: { expression: parseLatex('x^2'), parameters: ['x'] },
 *   g: { expression: parseLatex('x + 1'), parameters: ['x'] }
 * };
 *
 * // f(3) becomes 3^2
 * substituteFunction(parseLatex('f(3)'), bindings);
 *
 * // f(g(2)) becomes f(3) becomes 3^2
 * substituteFunction(parseLatex('f(g(2))'), bindings);
 *
 * // f'(x) stays as f'(x) (symbolic)
 * substituteFunction(parseLatex("f'(x)"), bindings);
 */
export function substituteFunction(
	node: MathNode,
	bindings: FunctionBindings,
	options?: SubstituteOptions
): MathNode {
	// Handle empty bindings - return node unchanged
	if (Object.keys(bindings).length === 0) {
		return node;
	}

	const maxIterations = options?.maxIterations ?? DEFAULT_SUBSTITUTE_OPTIONS.maxIterations;

	let current = node;
	let iteration = 0;

	// Iterate until no more substitutions are possible or max iterations reached
	while (iteration < maxIterations) {
		// Check if there are any functions to substitute
		if (!hasSubstitutableFunctions(current, bindings)) {
			break;
		}

		// Perform one pass of function substitution
		const next = substituteFunctionOnce(current, bindings);

		// Move to next iteration
		current = next;
		iteration++;
	}

	return current;
}

/**
 * Apply composition with function bindings.
 *
 * Given a CompositionNode (f o g) and arguments, expands it to f(g(args))
 * and then substitutes any function definitions.
 *
 * @param composition - The CompositionNode to apply
 * @param args - Arguments to apply to the composition
 * @param bindings - Available function definitions
 * @param options - Substitution options
 * @returns The expanded and substituted expression
 */
export function applyComposition(
	composition: CompositionNode,
	args: readonly MathNode[],
	bindings: FunctionBindings,
	options?: SubstituteOptions
): MathNode {
	// Expand composition to nested function calls
	const expanded = expandComposition(composition, args);

	// Substitute function definitions
	return substituteFunction(expanded, bindings, options);
}

/**
 * Get names of functions that are used but not defined in bindings.
 *
 * Useful for error reporting and validation.
 *
 * @param node - The expression to check
 * @param bindings - Available function definitions
 * @returns Array of function names that are used but not defined
 */
export function getUndefinedFunctions(node: MathNode, bindings: FunctionBindings): string[] {
	const undefinedFuncs = new Set<string>();
	const builtInFunctions = new Set([
		'sin',
		'cos',
		'tan',
		'cot',
		'sec',
		'csc',
		'arcsin',
		'arccos',
		'arctan',
		'sinh',
		'cosh',
		'tanh',
		'ln',
		'log',
		'exp',
		'sqrt',
		'abs',
		'floor',
		'ceil',
		'round',
		'min',
		'max'
	]);

	mapNode(node, (n) => {
		if (isFunction(n)) {
			const funcName = n.name; // Capture to avoid TypeScript narrowing issues
			const name = funcName.toLowerCase();
			// Skip built-in functions, derivatives, and inverses
			if (
				!builtInFunctions.has(name) &&
				!isDerivativeFunction(n) &&
				!isInverseFunction(n) &&
				!(funcName in bindings)
			) {
				undefinedFuncs.add(funcName);
			}
		}
		return n;
	});

	return [...undefinedFuncs];
}
