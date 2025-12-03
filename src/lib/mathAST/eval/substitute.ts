/**
 * MathAST Substitution
 *
 * Functions for substituting variable values into mathematical expressions.
 * Supports substitution of regular variables and Greek letters with
 * numeric, string (LaTeX), or direct MathNode values.
 */

import type { MathNode } from '../types';
import type { EvalBindings, BindingValue, SubstituteOptions } from './types';
import { DEFAULT_SUBSTITUTE_OPTIONS } from './types';
import { mapNode } from '../transforms';
import { isVariable, isGreek } from '../guards';
import { number } from '../factory';
import { parseLatex } from '../parser';

// =============================================================================
// Binding Value Conversion
// =============================================================================

/**
 * Convert a binding value to a MathNode.
 *
 * @param value - The binding value to convert
 * @returns A MathNode representing the value
 * @throws Error if string cannot be parsed as LaTeX
 *
 * @internal
 */
function bindingToNode(value: BindingValue): MathNode {
	// Direct MathNode - use as-is
	if (typeof value === 'object' && value !== null && 'type' in value) {
		return value;
	}

	// Number - convert to NumberNode
	if (typeof value === 'number') {
		// Handle special cases
		if (Number.isNaN(value)) {
			throw new Error('Cannot substitute NaN value');
		}
		if (!Number.isFinite(value)) {
			throw new Error('Cannot substitute infinite value');
		}
		// Use toString() to preserve the exact representation
		return number(value.toString());
	}

	// String - parse as LaTeX
	if (typeof value === 'string') {
		return parseLatex(value);
	}

	// This should never happen with proper TypeScript usage
	throw new Error(`Invalid binding value type: ${typeof value}`);
}

// =============================================================================
// Variable Detection
// =============================================================================

/**
 * Check if a MathNode contains any variables that would be substituted.
 *
 * @param node - The node to check
 * @param bindings - The bindings that would be applied
 * @returns True if any variable in node has a binding
 *
 * @internal
 */
function hasSubstitutableVariables(node: MathNode, bindings: EvalBindings): boolean {
	let hasVar = false;

	mapNode(node, (n) => {
		if (hasVar) return n; // Early exit optimization

		if (isVariable(n) && n.name in bindings) {
			hasVar = true;
		} else if (isGreek(n) && n.letter in bindings) {
			hasVar = true;
		}

		return n;
	});

	return hasVar;
}

// =============================================================================
// Single-Pass Substitution
// =============================================================================

/**
 * Perform a single pass of substitution through the AST.
 *
 * @param node - The node to transform
 * @param bindings - Variable bindings to apply
 * @returns New AST with substitutions applied
 *
 * @internal
 */
function substituteOnce(node: MathNode, bindings: EvalBindings): MathNode {
	return mapNode(node, (n) => {
		// Substitute regular variables
		if (isVariable(n)) {
			const value = bindings[n.name];
			if (value !== undefined) {
				return bindingToNode(value);
			}
		}

		// Substitute Greek letters
		if (isGreek(n)) {
			const value = bindings[n.letter];
			if (value !== undefined) {
				return bindingToNode(value);
			}
		}

		// No substitution for this node
		return n;
	});
}

// =============================================================================
// Main Substitution Function
// =============================================================================

/**
 * Substitute variable values into a mathematical expression.
 *
 * This function replaces VariableNode and GreekLetterNode instances with
 * their corresponding values from the bindings. Substitution is recursive,
 * meaning if a substituted value itself contains variables with bindings,
 * those will also be substituted (up to maxIterations).
 *
 * @param node - The MathAST node to substitute into
 * @param bindings - Map of variable names to their replacement values
 * @param options - Options controlling substitution behavior
 * @returns New AST with variables substituted
 *
 * @example
 * // Simple substitution: x + 1 with x = 5
 * const expr = parseLatex('x+1');
 * const result = substitute(expr, { x: 5 });
 * // result represents: 5 + 1
 *
 * @example
 * // Multiple substitutions: x * y with x = 2, y = 3
 * const expr = parseLatex('x \\cdot y');
 * const result = substitute(expr, { x: 2, y: 3 });
 * // result represents: 2 * 3
 *
 * @example
 * // Greek letter substitution: alpha^2 with alpha = 5
 * const expr = parseLatex('\\alpha^2');
 * const result = substitute(expr, { alpha: 5 });
 * // result represents: 5^2
 *
 * @example
 * // String value (parsed as LaTeX): x * 2 with x = '2+3'
 * const expr = parseLatex('x \\cdot 2');
 * const result = substitute(expr, { x: '2+3' });
 * // result represents: (2+3) * 2
 *
 * @example
 * // Recursive substitution: a + 1 with a = '2*b', b = 3
 * const expr = parseLatex('a+1');
 * const result = substitute(expr, { a: '2b', b: 3 });
 * // First pass: a -> 2*b, giving (2*b) + 1
 * // Second pass: b -> 3, giving (2*3) + 1
 */
export function substitute(
	node: MathNode,
	bindings: EvalBindings,
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
		// Check if there are any variables to substitute
		if (!hasSubstitutableVariables(current, bindings)) {
			break;
		}

		// Perform one pass of substitution
		const next = substituteOnce(current, bindings);

		// Move to next iteration
		current = next;
		iteration++;
	}

	return current;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all variable names present in an expression.
 *
 * Returns both regular variable names and Greek letter names that
 * appear in the expression.
 *
 * @param node - The MathAST node to analyze
 * @returns Set of variable names found in the expression
 *
 * @example
 * const expr = parseLatex('x + y + \\alpha');
 * const vars = getVariables(expr);
 * // vars = Set { 'x', 'y', 'alpha' }
 */
export function getVariables(node: MathNode): Set<string> {
	const variables = new Set<string>();

	mapNode(node, (n) => {
		if (isVariable(n)) {
			variables.add(n.name);
		} else if (isGreek(n)) {
			variables.add(n.letter);
		}
		return n;
	});

	return variables;
}

/**
 * Check if an expression contains a specific variable.
 *
 * @param node - The MathAST node to check
 * @param variableName - The variable name to look for
 * @returns True if the variable is present in the expression
 *
 * @example
 * const expr = parseLatex('x + y');
 * hasVariable(expr, 'x');  // true
 * hasVariable(expr, 'z');  // false
 */
export function hasVariable(node: MathNode, variableName: string): boolean {
	let found = false;

	mapNode(node, (n) => {
		if (found) return n; // Early exit

		if (isVariable(n) && n.name === variableName) {
			found = true;
		} else if (isGreek(n) && n.letter === variableName) {
			found = true;
		}

		return n;
	});

	return found;
}

/**
 * Check if all required variables have bindings.
 *
 * @param node - The MathAST node to check
 * @param bindings - The available bindings
 * @returns True if all variables in the expression have bindings
 *
 * @example
 * const expr = parseLatex('x + y');
 * hasAllBindings(expr, { x: 1, y: 2 });     // true
 * hasAllBindings(expr, { x: 1 });           // false (missing y)
 * hasAllBindings(expr, { x: 1, y: 2, z: 3 }); // true (extra bindings OK)
 */
export function hasAllBindings(node: MathNode, bindings: EvalBindings): boolean {
	const variables = getVariables(node);

	for (const variable of variables) {
		if (!(variable in bindings)) {
			return false;
		}
	}

	return true;
}

/**
 * Get the names of variables that are missing bindings.
 *
 * @param node - The MathAST node to check
 * @param bindings - The available bindings
 * @returns Array of variable names without bindings
 *
 * @example
 * const expr = parseLatex('x + y + z');
 * getMissingBindings(expr, { x: 1 });
 * // returns ['y', 'z']
 */
export function getMissingBindings(node: MathNode, bindings: EvalBindings): string[] {
	const variables = getVariables(node);
	const missing: string[] = [];

	for (const variable of variables) {
		if (!(variable in bindings)) {
			missing.push(variable);
		}
	}

	return missing;
}
