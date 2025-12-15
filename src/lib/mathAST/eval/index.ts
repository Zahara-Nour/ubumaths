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
 *
 * // Function bindings for generic functions (f, g, h)
 * const fExpr = parseLatex('f(3)', { genericFunctions: { names: ['f'] } });
 * const fResult = evaluate(fExpr, {
 *   functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } }
 * });
 * // fResult.value = { n: 9n, d: 1n } (equals 9 = 3^2)
 *
 * // Function with pre-computed derivative and inverse
 * import { derivativeFunc, inverseFunc } from '$lib/mathAST/factory';
 * const fWithDerivative = {
 *   expression: parseLatex('x^2'),
 *   parameters: ['x'],
 *   derivative: parseLatex('2x'),        // f'(x) = 2x
 *   inverse: parseLatex('\\sqrt{x}')     // f^{-1}(x) = sqrt(x)
 * };
 *
 * // Evaluate f'(3) = 6
 * const derivResult = evaluate(derivativeFunc('f', [number('3')], 1), {
 *   functions: { f: fWithDerivative }
 * });
 * // derivResult.value = { n: 6n, d: 1n } (equals 6 = 2*3)
 *
 * // Evaluate f^{-1}(9) = 3
 * const invResult = evaluate(inverseFunc('f', [number('9')]), {
 *   functions: { f: fWithDerivative }
 * });
 * // invResult.value = { n: 3n, d: 1n } (equals 3 = sqrt(9))
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
// Function Binding Types and Functions
// =============================================================================

export type { FunctionDefinition, FunctionBindings } from './function-bindings';

export {
	applyFunction,
	substituteFunction,
	applyComposition,
	getUndefinedFunctions,
	FunctionBindingError
} from './function-bindings';

// =============================================================================
// Variable Substitution
// =============================================================================

export {
	substitute,
	getVariables,
	hasVariable,
	hasAllBindings,
	getMissingBindings,
	substituteAll
} from './substitute';

export type { SubstituteAllOptions } from './substitute';

// =============================================================================
// Evaluation
// =============================================================================

export { evaluate } from './evaluate';

export { evaluateWithModifiers } from './evaluate-with-modifiers';
