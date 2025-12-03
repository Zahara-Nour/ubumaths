/**
 * Grapheur Evaluator - Wrapper around MathAST for function evaluation
 *
 * This module provides a simplified interface for parsing and evaluating
 * mathematical functions in the context of the graphing calculator.
 * It handles variable substitution and graceful error handling for
 * domain errors.
 *
 * @module grapheur/evaluator
 */

import type { MathNode } from '$lib/mathAST/types';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { substitute, getVariables } from '$lib/mathAST/eval/substitute';
import { evaluate } from '$lib/mathAST/eval/evaluate';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of parsing a function expression
 */
export interface ParseResult {
	/** Whether parsing succeeded */
	readonly success: boolean;
	/** The parsed AST (null if parsing failed) */
	readonly ast: MathNode | null;
	/** Error message (null if parsing succeeded) */
	readonly error: string | null;
}

/**
 * Variable bindings for evaluation
 * Maps variable names to numeric values
 */
export type VariableBindings = Record<string, number>;

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a LaTeX expression into an AST.
 *
 * Uses parseLatexSafe from MathAST to handle errors gracefully.
 * Returns a ParseResult with either the AST or an error message.
 *
 * @param latex - LaTeX string to parse (e.g., "x^2", "\\sin(x)")
 * @returns ParseResult with success status, AST, and any error message
 *
 * @example
 * ```typescript
 * const result = parseFunction('x^2 + 1');
 * if (result.success) {
 *   // result.ast is the parsed AST
 * } else {
 *   // result.error contains the error message
 * }
 * ```
 */
export function parseFunction(latex: string): ParseResult {
	// Handle empty input
	if (!latex || latex.trim() === '') {
		return {
			success: false,
			ast: null,
			error: 'Expression is empty'
		};
	}

	try {
		const result = parseLatexSafe(latex);

		if (result.errors.length > 0) {
			// Collect all error messages
			const errorMessages = result.errors.map((e) => e.message).join('; ');
			return {
				success: false,
				ast: null,
				error: errorMessages
			};
		}

		return {
			success: true,
			ast: result.ast,
			error: null
		};
	} catch (err) {
		// Catch any unexpected errors
		const message = err instanceof Error ? err.message : 'Unknown parsing error';
		return {
			success: false,
			ast: null,
			error: message
		};
	}
}

// =============================================================================
// Evaluation
// =============================================================================

/**
 * Evaluate a parsed function at a given x value.
 *
 * Returns null for undefined values (domain errors, infinities, NaN).
 * This allows the caller to handle discontinuities gracefully.
 *
 * @param ast - Parsed AST from parseFunction
 * @param x - Value to evaluate at
 * @param variables - Optional additional variable bindings (for sliders)
 * @returns The computed y value, or null if undefined
 *
 * @example
 * ```typescript
 * const result = parseFunction('x^2');
 * if (result.success && result.ast) {
 *   const y = evaluateAt(result.ast, 3); // y = 9
 *   const y2 = evaluateAt(result.ast, -2); // y2 = 4
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With additional variables (for sliders)
 * const result = parseFunction('a * x + b');
 * if (result.success && result.ast) {
 *   const y = evaluateAt(result.ast, 2, { a: 3, b: 1 }); // y = 7
 * }
 * ```
 */
export function evaluateAt(ast: MathNode, x: number, variables?: VariableBindings): number | null {
	// Handle special x values
	if (!Number.isFinite(x)) {
		return null;
	}

	try {
		// Build bindings with x and any additional variables
		const bindings: Record<string, number> = { x, ...variables };

		// Substitute variables into the AST
		const substituted = substitute(ast, bindings);

		// Evaluate the expression in decimal mode (for performance)
		const result = evaluate(substituted, { mode: 'decimal' });

		// Get the numeric value
		const value = typeof result.value === 'number' ? result.value : Number(result.value);

		// Return null for non-finite results (NaN, Infinity, -Infinity)
		if (!Number.isFinite(value)) {
			return null;
		}

		return value;
	} catch {
		// Domain errors (sqrt of negative, log of non-positive, etc.)
		// Return null instead of throwing
		return null;
	}
}

/**
 * Create a reusable evaluator function for a given AST.
 *
 * More efficient for repeated evaluations (curve sampling) because
 * it captures the AST and variables in a closure.
 *
 * @param ast - Parsed AST from parseFunction
 * @param variables - Optional variable bindings (for sliders)
 * @returns A function that takes x and returns y (or null)
 *
 * @example
 * ```typescript
 * const result = parseFunction('\\sin(x)');
 * if (result.success && result.ast) {
 *   const f = createEvaluator(result.ast);
 *   const points = [0, 1, 2, 3].map(x => ({ x, y: f(x) }));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With slider variables
 * const result = parseFunction('a * \\sin(b * x)');
 * if (result.success && result.ast) {
 *   const f = createEvaluator(result.ast, { a: 2, b: 3 });
 *   // f(x) evaluates 2 * sin(3x)
 * }
 * ```
 */
export function createEvaluator(
	ast: MathNode,
	variables?: VariableBindings
): (x: number) => number | null {
	return (x: number) => evaluateAt(ast, x, variables);
}

// =============================================================================
// Variable Analysis
// =============================================================================

/**
 * Get list of free variables in an expression (excluding 'x' and known constants).
 *
 * Useful for detecting which sliders are needed for an expression.
 * Excludes:
 * - 'x' (the primary variable)
 * - 'pi' (mathematical constant)
 * - 'e' (Euler's number - though typically written as \exp in LaTeX)
 *
 * @param ast - Parsed AST from parseFunction
 * @returns Array of free variable names
 *
 * @example
 * ```typescript
 * const result = parseFunction('a * x^2 + b * x + c');
 * if (result.success && result.ast) {
 *   const vars = getFreeVariables(result.ast);
 *   // vars = ['a', 'b', 'c']
 * }
 * ```
 *
 * @example
 * ```typescript
 * const result = parseFunction('\\sin(x) + \\pi');
 * if (result.success && result.ast) {
 *   const vars = getFreeVariables(result.ast);
 *   // vars = [] (x is the main variable, pi is a constant)
 * }
 * ```
 */
export function getFreeVariables(ast: MathNode): string[] {
	const allVariables = getVariables(ast);

	// Exclude 'x' (main variable) and known constants
	const excludedNames = new Set(['x', 'pi', 'e']);

	return [...allVariables].filter((name) => !excludedNames.has(name));
}

/**
 * Check if an expression has any unbound variables (excluding x).
 *
 * @param ast - Parsed AST from parseFunction
 * @param boundVariables - Variables that are considered bound (have values)
 * @returns true if there are unbound variables
 *
 * @example
 * ```typescript
 * const result = parseFunction('a * x + b');
 * if (result.success && result.ast) {
 *   hasUnboundVariables(result.ast, {}); // true (a and b unbound)
 *   hasUnboundVariables(result.ast, { a: 1 }); // true (b unbound)
 *   hasUnboundVariables(result.ast, { a: 1, b: 2 }); // false
 * }
 * ```
 */
export function hasUnboundVariables(ast: MathNode, boundVariables: VariableBindings): boolean {
	const freeVars = getFreeVariables(ast);
	return freeVars.some((name) => !(name in boundVariables));
}

/**
 * Get the list of unbound variables (excluding x).
 *
 * @param ast - Parsed AST from parseFunction
 * @param boundVariables - Variables that are considered bound (have values)
 * @returns Array of unbound variable names
 *
 * @example
 * ```typescript
 * const result = parseFunction('a * x + b');
 * if (result.success && result.ast) {
 *   getUnboundVariables(result.ast, { a: 1 });
 *   // returns ['b']
 * }
 * ```
 */
export function getUnboundVariables(ast: MathNode, boundVariables: VariableBindings): string[] {
	const freeVars = getFreeVariables(ast);
	return freeVars.filter((name) => !(name in boundVariables));
}
