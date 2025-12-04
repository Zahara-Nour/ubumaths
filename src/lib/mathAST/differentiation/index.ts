/**
 * MathAST Differentiation Module
 *
 * Provides symbolic differentiation for mathematical expressions.
 * Supports standard calculus rules including chain rule, product rule,
 * quotient rule, and derivatives of transcendental functions.
 *
 * @module mathAST/differentiation
 *
 * @example
 * ```typescript
 * import { differentiate, differentiateN } from '$lib/mathAST/differentiation';
 * import { parseLatex, toLatex } from '$lib/mathAST';
 *
 * // d/dx(x^2) = 2x
 * const expr = parseLatex('x^2');
 * const derivative = differentiate(expr);
 * console.log(toLatex(derivative)); // "2x"
 *
 * // d^2/dx^2(x^3) = 6x
 * const secondDerivative = differentiateN(parseLatex('x^3'), 2);
 * console.log(toLatex(secondDerivative)); // "6x"
 *
 * // d/dx(sin(x^2)) = 2x*cos(x^2) (chain rule)
 * const chainRule = differentiate(parseLatex('\\sin(x^2)'));
 *
 * // With generic function
 * const funcBindings = {
 *   f: { expression: parseLatex('x^2'), parameters: ['x'] }
 * };
 * const df = differentiate(parseLatex('f(x)'), { functions: funcBindings });
 * // df represents 2x (the derivative of f)
 *
 * // Differentiate with respect to different variable
 * const ddy = differentiate(parseLatex('x*y'), { variable: 'y' });
 * // ddy represents x
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type { DifferentiationOptions } from './types';
export { DEFAULT_DIFFERENTIATION_OPTIONS, DifferentiationError } from './types';

// =============================================================================
// Main Functions
// =============================================================================

export { differentiate, differentiateN } from './differentiate';

// =============================================================================
// Utilities (exported for advanced use cases)
// =============================================================================

export {
	// Constants
	zero,
	one,

	// Predicates
	isZero,
	isOne,
	containsVariable,

	// Simplified constructors
	simplifiedAdd,
	simplifiedSubtract,
	simplifiedMultiply,
	simplifiedDivide,
	simplifiedPower,
	simplifiedOpposite
} from './rules';
