/**
 * MathAST Differentiation Types
 *
 * Type definitions for the symbolic differentiation system.
 *
 * @module mathAST/differentiation/types
 */

import type { FunctionBindings } from '../eval/function-bindings';

// =============================================================================
// Differentiation Options
// =============================================================================

/**
 * Options controlling differentiation behavior.
 *
 * @example
 * // Differentiate with respect to 'x' (default)
 * const options: DifferentiationOptions = {};
 *
 * // Differentiate with respect to 'y'
 * const options: DifferentiationOptions = { variable: 'y' };
 *
 * // With function bindings for generic functions
 * const options: DifferentiationOptions = {
 *   functions: {
 *     f: { expression: parseLatex('x^2'), parameters: ['x'] }
 *   }
 * };
 *
 * // Disable automatic simplification
 * const options: DifferentiationOptions = { simplify: false };
 */
export interface DifferentiationOptions {
	/**
	 * Variable to differentiate with respect to.
	 * Default: 'x'
	 *
	 * @example
	 * // d/dx(x^2) = 2x
	 * differentiate(parseLatex('x^2')); // variable defaults to 'x'
	 *
	 * // d/dy(y^2) = 2y
	 * differentiate(parseLatex('y^2'), { variable: 'y' });
	 *
	 * // d/dx(y^2) = 0 (y is constant with respect to x)
	 * differentiate(parseLatex('y^2'), { variable: 'x' });
	 */
	readonly variable?: string;

	/**
	 * Function bindings for generic functions (f, g, h, etc.).
	 * When provided, function calls like f(x) will be substituted with
	 * their definitions before differentiation.
	 *
	 * If a function definition includes a `derivative` field, it will be
	 * used directly. Otherwise, the derivative is computed by differentiating
	 * the function's expression.
	 *
	 * @example
	 * const options: DifferentiationOptions = {
	 *   functions: {
	 *     f: {
	 *       expression: parseLatex('x^2'),
	 *       parameters: ['x'],
	 *       derivative: parseLatex('2x')  // Optional pre-computed derivative
	 *     }
	 *   }
	 * };
	 */
	readonly functions?: FunctionBindings;

	/**
	 * Whether to simplify the result after differentiation.
	 * Default: true
	 *
	 * When true, basic algebraic simplifications are applied:
	 * - 0 + x = x
	 * - 1 * x = x
	 * - 0 * x = 0
	 * - x^1 = x
	 * - x^0 = 1
	 *
	 * @example
	 * // With simplification (default)
	 * differentiate(parseLatex('x')); // returns 1, not 1*1 + 0
	 *
	 * // Without simplification (for debugging/educational purposes)
	 * differentiate(parseLatex('x'), { simplify: false });
	 */
	readonly simplify?: boolean;
}

/**
 * Default differentiation options.
 */
export const DEFAULT_DIFFERENTIATION_OPTIONS: Required<
	Omit<DifferentiationOptions, 'functions'>
> & {
	functions: undefined;
} = {
	variable: 'x',
	simplify: true,
	functions: undefined
} as const;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when differentiation fails.
 */
export class DifferentiationError extends Error {
	constructor(
		message: string,
		public readonly nodeType: string,
		public readonly details?: string
	) {
		super(message);
		this.name = 'DifferentiationError';
	}
}
