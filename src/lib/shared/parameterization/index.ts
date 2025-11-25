/**
 * Shared Parameterization Library
 * ================================
 *
 * Content-agnostic parameterization system for Questions and Exercises.
 *
 * Uses Markdown syntax:
 * - Variables: {{var}}
 * - Random: {{random:1-10}} or {{1-10}}
 * - Eval: {{eval:expr}}
 *
 * Features:
 * - Variable system with reference chaining
 * - Random number generation (integer, decimal, exclusions)
 * - Expression evaluation
 * - Circular dependency detection
 *
 * @module shared/parameterization
 *
 * @example Basic usage
 * ```typescript
 * import { resolveVariables, resolveText } from '$lib/shared/parameterization';
 *
 * // Define variables
 * const variables = [
 *   { name: 'a', expression: '{{random:1-10}}' },
 *   { name: 'b', expression: '{{random:1-10}}' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ];
 *
 * // Resolve variables
 * const resolved = resolveVariables(variables, 12345); // with seed
 *
 * // Resolve text
 * const text = 'The sum of {{a}} and {{b}} is {{sum}}';
 * const result = resolveText(text, resolved);
 * // → 'The sum of 7 and 3 is 10'
 * ```
 *
 * @example Validation
 * ```typescript
 * import { validateVariables, detectCircularDependencies } from '$lib/shared/parameterization';
 *
 * const variables = [
 *   { name: 'a', expression: '{{b}}' },
 *   { name: 'b', expression: '{{a}}' }
 * ];
 *
 * // Check for circular dependencies
 * const circularResult = detectCircularDependencies(variables);
 * if (!circularResult.valid) {
 *   console.error('Circular dependency:', circularResult.errors[0].path);
 * }
 *
 * // Validate syntax and references
 * const validationResult = validateVariables(variables);
 * if (!validationResult.valid) {
 *   console.error('Validation errors:', validationResult.errors);
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types';

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Extract all parameterization tokens from text
 *
 * Supports Markdown syntax.
 * See: {@link module:shared/parameterization/parser/tokenizer}
 */
export { tokenize } from './parser/tokenizer';

/**
 * Parse a variable reference token
 *
 * Extracts variable name from {{var}}.
 * See: {@link module:shared/parameterization/parser/variable-parser}
 */
export { parseVariableReference } from './parser/variable-parser';

/**
 * Parse a random specification token
 *
 * Handles all formats: integer range, decimal by digits, decimal range with step.
 * See: {@link module:shared/parameterization/parser/random-parser}
 */
export { parseRandomSpec } from './parser/random-parser';

/**
 * Parse an eval expression token
 *
 * Extracts expression from {{eval:expr}}.
 * See: {@link module:shared/parameterization/parser/eval-parser}
 */
export { parseEvalExpression, parseEvalExpressionWithModifiers } from './parser/eval-parser';

// ============================================================================
// RESOLVERS
// ============================================================================

/**
 * Resolve all variables using 3-stage pipeline
 *
 * 1. Replace variable references
 * 2. Generate random numbers
 * 3. Evaluate expressions
 *
 * See: {@link module:shared/parameterization/resolver/variable-resolver}
 */
export { resolveVariables } from './resolver/variable-resolver';

/**
 * Resolve a single expression using 3-stage pipeline
 *
 * Resolves an arbitrary expression (not a variable definition) through
 * variable references, random generation, and evaluation.
 *
 * See: {@link module:shared/parameterization/resolver/variable-resolver}
 */
export { resolveExpression } from './resolver/variable-resolver';

/**
 * Generate a random number from specification
 *
 * Supports integer/decimal ranges, variable bounds, exclusions, and seeding.
 * See: {@link module:shared/parameterization/resolver/random-generator}
 */
export { generateRandomNumber } from './resolver/random-generator';

/**
 * Resolve all parameter tokens in arbitrary text
 *
 * Replaces variables with their resolved values.
 * See: {@link module:shared/parameterization/resolver/text-resolver}
 */
export { resolveText } from './resolver/text-resolver';

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Detect circular dependencies in variable definitions
 *
 * Uses DFS to find cycles in the dependency graph.
 * See: {@link module:shared/parameterization/validator/circular-dependency}
 */
export { detectCircularDependencies } from './validator/circular-dependency';

/**
 * Validate variable definitions
 *
 * Checks names, syntax, references, ranges, and expressions.
 * See: {@link module:shared/parameterization/validator/variable-validator}
 */
export { validateVariables } from './validator/variable-validator';
