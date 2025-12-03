/**
 * MathAST Evaluation Module
 *
 * Provides functions for substituting variable values into mathematical
 * expressions and evaluating them to numeric values.
 *
 * @module mathAST/eval
 *
 * @example
 * ```typescript
 * import { substitute, evaluate, getVariables, hasAllBindings } from '$lib/mathAST/eval';
 * import { parseLatex } from '$lib/mathAST/parser';
 *
 * // Parse and substitute
 * const expr = parseLatex('x + y');
 * const substituted = substitute(expr, { x: 2, y: 3 });
 * // substituted represents: 2 + 3
 *
 * // Evaluate to numeric value
 * const result = evaluate(substituted);
 * // result.value = { n: 5n, d: 1n } (Rational)
 * // result.exact = true
 *
 * // Exact fraction arithmetic
 * const frac = parseLatex('\\frac{1}{3}+\\frac{1}{3}+\\frac{1}{3}');
 * const fracResult = evaluate(frac);
 * // fracResult.value = { n: 1n, d: 1n } (equals 1 exactly!)
 *
 * // Decimal mode for transcendental values
 * const sqrt2 = parseLatex('\\sqrt{2}');
 * const decResult = evaluate(sqrt2, { mode: 'decimal' });
 * // decResult.value = 1.4142135623730951
 *
 * // Check variable requirements
 * const vars = getVariables(expr);  // Set { 'x', 'y' }
 * const ready = hasAllBindings(expr, { x: 1 });  // false (missing y)
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
	BindingValue,
	EvalBindings,
	EvalMode,
	EvalOptions,
	EvalResult,
	SubstituteOptions
} from './types';

export { DEFAULT_EVAL_OPTIONS, DEFAULT_SUBSTITUTE_OPTIONS } from './types';

// =============================================================================
// Function Exports
// =============================================================================

export {
	substitute,
	getVariables,
	hasVariable,
	hasAllBindings,
	getMissingBindings
} from './substitute';

export { evaluate } from './evaluate';
