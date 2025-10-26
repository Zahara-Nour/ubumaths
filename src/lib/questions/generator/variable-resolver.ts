/**
 * Variable Resolver
 * =================
 *
 * Wrapper around shared library's variable resolution.
 * Maintains Questions-specific API for backward compatibility.
 *
 * Resolves template variables in declaration order with support for:
 * - Variable references: {@:otherVar}
 * - Random generation: {#:...}
 * - Mathematical evaluation: {eval:...}
 *
 * Resolution order within an expression:
 * 1. Replace {@:otherVar} with already resolved values
 * 2. Generate {#:random} expressions
 * 3. Evaluate {eval:expression}
 *
 * @module questions/generator/variable-resolver
 */

import type { QuestionVariable, ResolvedVariable } from '../types';
import {
	resolveVariables as sharedResolveVariables,
	resolveExpression as sharedResolveExpression
} from '$lib/shared/parameterization';

/**
 * Resolve a single variable expression
 *
 * Uses shared library for resolution but maintains Questions API.
 *
 * @param expression - Variable expression string
 * @param alreadyResolved - Variables already resolved
 * @param seed - Optional seed for random generation
 * @returns Resolved value as string (LaTeX format)
 *
 * @example
 * ```typescript
 * // Simple random
 * resolveVariableExpression('{#:1-10}', [], 42)  // → "7"
 *
 * // Reference to other variable
 * const resolved = [{ name: 'a', value: '5' }];
 * resolveVariableExpression('{@:a}^2', resolved)  // → "5^2"
 *
 * // With evaluation
 * resolveVariableExpression('{eval:{@:a}+3}', resolved)  // → "8"
 * ```
 */
export function resolveVariableExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed?: number
): string {
	// Use shared library's resolveExpression for full 3-stage pipeline
	return sharedResolveExpression(expression, alreadyResolved, seed, 'questions');
}

/**
 * Resolve all variables in a template
 *
 * Uses shared library for resolution. Variables are resolved in declaration order,
 * allowing later variables to reference earlier ones.
 *
 * @param variables - Variable definitions
 * @param seed - Optional seed for random generation
 * @returns Array of resolved variables
 *
 * @example
 * ```typescript
 * const variables = [
 *   { name: 'a', expression: '{#:1-10}' },
 *   { name: 'b', expression: '{@:a} + 5' },
 *   { name: 'sum', expression: '{eval:{@:a} + {@:b}}' }
 * ];
 *
 * const resolved = resolveVariables(variables, 42);
 * // → [
 * //   { name: 'a', value: '7' },
 * //   { name: 'b', value: '7 + 5' },
 * //   { name: 'sum', value: '17' }
 * // ]
 * ```
 */
export function resolveVariables(
	variables: QuestionVariable[] | undefined,
	seed?: number
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	// Use shared library resolver with Questions syntax
	const result = sharedResolveVariables(variables, seed, 'questions');

	if (result === null) {
		throw new Error('Failed to resolve variables');
	}

	return result;
}
