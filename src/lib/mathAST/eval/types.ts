/**
 * MathAST Evaluation Types
 *
 * Type definitions for the evaluation and substitution system.
 * These types provide the foundation for variable substitution
 * and expression evaluation.
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { FunctionBindings } from './function-bindings';

// =============================================================================
// Binding Types
// =============================================================================

/**
 * A single binding value that can be substituted for a variable.
 *
 * Supports three forms:
 * - MathNode: Directly use this AST node
 * - number: Convert to NumberNode (e.g., 5 becomes number('5'))
 * - string: Parse as LaTeX expression
 *
 * @example
 * // Direct MathNode
 * const binding: BindingValue = add(number('2'), number('3'));
 *
 * // Number (converted to NumberNode)
 * const binding: BindingValue = 5;
 *
 * // String (parsed as LaTeX)
 * const binding: BindingValue = '2+3';
 */
export type BindingValue = MathNode | number | string;

/**
 * Variable bindings for substitution.
 *
 * Maps variable names (including Greek letter names) to their replacement values.
 * Keys can be:
 * - Regular variable names (e.g., 'x', 'y', 'abc')
 * - Greek letter names (e.g., 'alpha', 'beta', 'pi')
 *
 * @example
 * // Simple numeric substitution
 * const bindings: EvalBindings = { x: 5, y: 3 };
 *
 * // Mixed substitution types
 * const bindings: EvalBindings = {
 *   x: 5,              // number -> NumberNode
 *   y: '2+3',          // string -> parse as LaTeX
 *   z: number('7')     // direct MathNode
 * };
 *
 * // Greek letter substitution
 * const bindings: EvalBindings = { alpha: 5, theta: 'pi/4' };
 */
export interface EvalBindings {
	readonly [variable: string]: BindingValue;
}

// =============================================================================
// Evaluation Options
// =============================================================================

/**
 * Evaluation mode determines how results are computed.
 *
 * - 'exact': Use exact arithmetic (BigInt rationals) where possible
 * - 'decimal': Use floating-point arithmetic with specified precision
 */
export type EvalMode = 'exact' | 'decimal';

/**
 * Options controlling evaluation behavior.
 *
 * @example
 * // Exact mode (default)
 * const options: EvalOptions = { mode: 'exact' };
 *
 * // Decimal mode with custom precision
 * const options: EvalOptions = { mode: 'decimal', precision: 10 };
 *
 * // With function bindings
 * const options: EvalOptions = {
 *   mode: 'exact',
 *   functions: {
 *     f: { expression: parseLatex('x^2'), parameters: ['x'] }
 *   }
 * };
 */
export interface EvalOptions {
	/** Evaluation mode: 'exact' for rational arithmetic, 'decimal' for floating-point */
	readonly mode?: EvalMode;

	/** Decimal precision (significant digits). Only used when mode is 'decimal'. Default: 15 */
	readonly precision?: number;

	/**
	 * Function bindings for generic functions (f, g, h, etc.).
	 * When provided, function calls like f(3) will be substituted with their
	 * definitions before evaluation.
	 */
	readonly functions?: FunctionBindings;
}

/**
 * Default evaluation options.
 */
export const DEFAULT_EVAL_OPTIONS: Required<EvalOptions> = {
	mode: 'exact',
	precision: 15,
	functions: {}
} as const;

// =============================================================================
// Evaluation Results
// =============================================================================

/**
 * Result of evaluating a mathematical expression.
 *
 * Contains both the computed value (as Rational or number) and the
 * simplified AST representation of the result.
 *
 * @example
 * // Exact evaluation result
 * const result: EvalResult = {
 *   value: { n: 3n, d: 4n },  // 3/4
 *   node: divide(number('3'), number('4'), 'fraction'),
 *   exact: true
 * };
 *
 * // Decimal evaluation result
 * const result: EvalResult = {
 *   value: 0.75,
 *   node: number('0.75'),
 *   exact: false
 * };
 */
export interface EvalResult {
	/** The computed value as a Rational (exact mode) or number (decimal mode) */
	readonly value: Rational | number;

	/** The simplified AST node representing the result */
	readonly node: MathNode;

	/** True if the result is exact (no approximation or rounding) */
	readonly exact: boolean;
}

// =============================================================================
// Substitution Options
// =============================================================================

/**
 * Options controlling substitution behavior.
 */
export interface SubstituteOptions {
	/**
	 * Maximum recursion depth for resolving chained substitutions.
	 * Prevents infinite loops when bindings reference each other.
	 * Default: 10
	 *
	 * @example
	 * // With {a: 'b', b: 'c', c: 5}, substituting 'a' requires 2 iterations
	 * // to fully resolve: a -> b -> c -> 5
	 */
	readonly maxIterations?: number;
}

/**
 * Default substitution options.
 */
export const DEFAULT_SUBSTITUTE_OPTIONS: Required<SubstituteOptions> = {
	maxIterations: 10
} as const;
