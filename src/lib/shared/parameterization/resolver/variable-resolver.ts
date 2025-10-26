/**
 * Variable Resolver - Resolve variable definitions
 * =================================================
 *
 * Resolves variables using a 3-stage pipeline:
 * 1. Replace variable references {@:var} → resolved value
 * 2. Generate random numbers {#:1-10} → actual number
 * 3. Evaluate expressions {eval:a+b} → calculated result
 *
 * Variables are resolved in declaration order, allowing later
 * variables to reference earlier ones.
 *
 * @module shared/parameterization/resolver/variable-resolver
 */

import type { Variable, ResolvedVariable, Syntax } from '../types';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';
import { parseRandomSpec } from '../parser/random-parser';
import { parseEvalExpression } from '../parser/eval-parser';
import { generateRandomNumber } from './random-generator';
import { evaluateExpression } from '$lib/questions/compute-engine/wrapper';

/**
 * Resolve all variables using 3-stage pipeline
 *
 * Process:
 * 1. For each variable in order:
 *    a. Replace variable references with resolved values
 *    b. Generate random numbers with optional seed
 *    c. Evaluate mathematical expressions
 * 2. Build array of resolved variables
 * 3. Return resolved variables for use in text resolution
 *
 * @param variables - Variable definitions to resolve
 * @param seed - Optional seed for reproducible random generation
 * @param syntax - Syntax to use for parsing (default: 'both')
 * @returns Array of resolved variables in declaration order
 * @throws Error if circular dependency or undefined reference detected
 *
 * @example Simple variables
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' }
 * ])
 * // → [{ name: 'a', value: '5' }, { name: 'b', value: '10' }]
 * ```
 *
 * @example Variable references (Questions syntax)
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{@:a}' }
 * ])
 * // → [{ name: 'a', value: '5' }, { name: 'b', value: '5' }]
 * ```
 *
 * @example Variable references (Markdown syntax)
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{{a}}' }
 * ], undefined, 'markdown')
 * // → [{ name: 'a', value: '5' }, { name: 'b', value: '5' }]
 * ```
 *
 * @example Random numbers
 * ```typescript
 * resolveVariables([
 *   { name: 'rand', expression: '{#:1-10}' }
 * ], 12345)
 * // → [{ name: 'rand', value: '7' }] (deterministic with seed)
 * ```
 *
 * @example Eval expressions
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' },
 *   { name: 'sum', expression: '{eval:a+b}' }
 * ])
 * // → [{ name: 'a', value: '5' }, { name: 'b', value: '10' }, { name: 'sum', value: '15' }]
 * ```
 *
 * @example Complex pipeline
 * ```typescript
 * resolveVariables([
 *   { name: 'min', expression: '1' },
 *   { name: 'max', expression: '10' },
 *   { name: 'a', expression: '{#:{@:min}-{@:max}}' },
 *   { name: 'b', expression: '{#:{@:min}-{@:max}!{@:a}}' },
 *   { name: 'sum', expression: '{eval:a+b}' }
 * ], 12345)
 * // → All variables resolved with random values and calculated sum
 * ```
 */
export function resolveVariables(
	variables: Variable[],
	seed?: number,
	syntax: Syntax = 'both'
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	const resolvedVariables: ResolvedVariable[] = [];

	for (const variable of variables) {
		try {
			const resolvedValue = resolveExpression(variable.expression, resolvedVariables, seed, syntax);

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
 * Resolve a single variable expression using 3-stage pipeline
 *
 * This function is exported for use by Questions feature for ContentField resolution.
 * It resolves a single expression (not a variable definition) through the full pipeline.
 *
 * @param expression - Variable expression string
 * @param alreadyResolved - Variables already resolved
 * @param seed - Optional seed for random generation
 * @param syntax - Syntax to use for parsing
 * @returns Resolved value as string
 */
export function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed: number | undefined,
	syntax: Syntax
): string {
	let result = expression;

	// STAGE 1: Replace variable references {@:name} or {{name}}
	const variableTokens = tokenize(result, syntax).filter((t) => t.type === 'variable');

	// Replace from end to start to preserve positions
	for (let i = variableTokens.length - 1; i >= 0; i--) {
		const token = variableTokens[i];
		const varName = parseVariableReference(token.content, token.syntax);
		if (!varName) continue;

		const resolvedVar = alreadyResolved.find((v) => v.name === varName);
		if (!resolvedVar) {
			throw new Error(`Variable "${varName}" not found or not yet resolved`);
		}

		result = result.slice(0, token.start) + resolvedVar.value + result.slice(token.end);
	}

	// STAGE 2: Generate random numbers {#:...} or {{random:...}}
	const randomTokens = tokenize(result, syntax).filter((t) => t.type === 'random');

	// Replace from end to start to preserve positions
	for (let i = randomTokens.length - 1; i >= 0; i--) {
		const token = randomTokens[i];
		try {
			const spec = parseRandomSpec(token.content, token.syntax);
			if (!spec) {
				throw new Error(`Failed to parse random spec: ${token.content}`);
			}
			const generatedValue = generateRandomNumber(spec, alreadyResolved, seed);
			result = result.slice(0, token.start) + String(generatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to generate random number in expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// STAGE 3: Evaluate {eval:...} or {{eval:...}} expressions
	const evalTokens = tokenize(result, syntax).filter((t) => t.type === 'eval');

	// Replace from end to start to preserve positions
	for (let i = evalTokens.length - 1; i >= 0; i--) {
		const token = evalTokens[i];
		try {
			const evalExpr = parseEvalExpression(token.content, token.syntax);
			if (!evalExpr) {
				throw new Error(`Failed to parse eval expression: ${token.content}`);
			}

			// IMPORTANT: Resolve variable references inside eval expression first
			// Example: {eval:{@:a}+{@:b}} → extract "{@:a}+{@:b}" → resolve to "7+10" → evaluate to 17
			let resolvedEvalExpr = evalExpr;
			const varTokensInEval = tokenize(evalExpr, syntax).filter((t) => t.type === 'variable');
			for (let j = varTokensInEval.length - 1; j >= 0; j--) {
				const varToken = varTokensInEval[j];
				const varName = parseVariableReference(varToken.content, varToken.syntax);
				if (!varName) continue;

				const resolvedVar = alreadyResolved.find((v) => v.name === varName);
				if (!resolvedVar) {
					throw new Error(`Variable "${varName}" not found in eval expression`);
				}

				resolvedEvalExpr =
					resolvedEvalExpr.slice(0, varToken.start) +
					resolvedVar.value +
					resolvedEvalExpr.slice(varToken.end);
			}

			const evaluatedValue = evaluateExpression(resolvedEvalExpr);
			result = result.slice(0, token.start) + String(evaluatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to evaluate expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return result;
}
