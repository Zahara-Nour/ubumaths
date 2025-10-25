/**
 * Variable Resolver
 * =================
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
import { extractVariableReferences } from '../parser/variable-parser';
import { extractEvalExpressions } from '../parser/eval-parser';
import { parseRandomExpression } from '../parser/random-parser';
import { generateRandomNumber } from './random-generator';
import { evaluateExpression } from '../compute-engine/wrapper';

/**
 * Resolve a single variable expression
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
	let result = expression;

	// Step 1: Replace variable references {@:name}
	const variableRefs = extractVariableReferences(result);
	for (const ref of variableRefs) {
		const resolvedVar = alreadyResolved.find((v) => v.name === ref.name);
		if (!resolvedVar) {
			throw new Error(`Variable "${ref.name}" not found or not yet resolved`);
		}
		result = result.replace(ref.fullMatch, resolvedVar.value);
	}

	// Step 2: Generate random numbers {#:...}
	const randomExpressions = findRandomExpressions(result);
	for (const randomExpr of randomExpressions) {
		try {
			const spec = parseRandomExpression(randomExpr);
			const generatedValue = generateRandomNumber(spec, alreadyResolved, seed);
			result = result.replace(randomExpr, String(generatedValue));
		} catch (error) {
			throw new Error(
				`Failed to generate random number in expression "${randomExpr}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// Step 3: Evaluate {eval:...} expressions
	const evalExpressions = extractEvalExpressions(result);
	for (const evalExpr of evalExpressions) {
		try {
			const evaluatedValue = evaluateExpression(evalExpr.expression);
			result = result.replace(evalExpr.fullMatch, String(evaluatedValue));
		} catch (error) {
			throw new Error(
				`Failed to evaluate expression "${evalExpr.expression}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return result;
}

/**
 * Resolve all variables in a template
 *
 * Variables are resolved in declaration order, allowing later variables
 * to reference earlier ones.
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

	const resolvedVariables: ResolvedVariable[] = [];

	for (const variable of variables) {
		try {
			const resolvedValue = resolveVariableExpression(variable.expression, resolvedVariables, seed);

			resolvedVariables.push({
				name: variable.name,
				value: resolvedValue
			});
		} catch (error) {
			throw new Error(
				`Failed to resolve variable "${variable.name}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return resolvedVariables;
}

/**
 * Find all {#:...} expressions in a string
 *
 * This handles nested braces correctly.
 */
function findRandomExpressions(text: string): string[] {
	const expressions: string[] = [];
	let i = 0;

	while (i < text.length) {
		if (text.substring(i, i + 3) === '{#:') {
			// Find matching closing brace
			let braceCount = 1;
			let j = i + 3;

			while (j < text.length && braceCount > 0) {
				if (text[j] === '{') braceCount++;
				if (text[j] === '}') braceCount--;
				j++;
			}

			if (braceCount === 0) {
				expressions.push(text.substring(i, j));
				i = j;
				continue;
			}
		}
		i++;
	}

	return expressions;
}
