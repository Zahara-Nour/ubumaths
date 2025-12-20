/**
 * Variable Resolver - Resolve variable definitions
 * =================================================
 *
 * Resolves variables using a 3-stage pipeline:
 * 1. Replace variable references {{var}} -> resolved value
 * 2. Generate random numbers {{random:1..10}} -> actual number
 * 3. Evaluate expressions {{eval:a+b}} -> calculated result
 *
 * Variables are resolved in declaration order, allowing later
 * variables to reference earlier ones.
 *
 * @module ubumark/parameterization/resolver/variable-resolver
 */

import type { Variable, ResolvedVariable } from '../../types';
import type { DisplayOptions } from '../display-options';
import { resolveDisplayOptions } from '../display-options';
import { applyDisplayTransforms, canTransform } from '../expression-transforms';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';
import { parseRandomSpec } from '../parser/random-parser';
import { parseEvalExpressionWithModifiers } from '../parser/eval-parser';
import { generateRandomNumber } from './random-generator';
import { evaluateWithModifiers } from '$lib/mathAST/eval';

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
 * @returns Array of resolved variables in declaration order
 * @throws Error if circular dependency or undefined reference detected
 *
 * @example Simple variables
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '10' }]
 * ```
 *
 * @example Variable references
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{{a}}' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '5' }]
 * ```
 *
 * @example Random numbers
 * ```typescript
 * resolveVariables([
 *   { name: 'rand', expression: '{{random:1..10}}' }
 * ], 12345)
 * // -> [{ name: 'rand', value: '7' }] (deterministic with seed)
 * ```
 *
 * @example Eval expressions
 * ```typescript
 * resolveVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '10' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ])
 * // -> [{ name: 'a', value: '5' }, { name: 'b', value: '10' }, { name: 'sum', value: '15' }]
 * ```
 *
 * @example Complex pipeline
 * ```typescript
 * resolveVariables([
 *   { name: 'min', expression: '1' },
 *   { name: 'max', expression: '10' },
 *   { name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
 *   { name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' },
 *   { name: 'sum', expression: '{{eval:a+b}}' }
 * ], 12345)
 * // -> All variables resolved with random values and calculated sum
 * ```
 */
export function resolveVariables(
	variables: Variable[],
	seed?: number,
	templateDisplayDefaults?: DisplayOptions
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	const resolvedVariables: ResolvedVariable[] = [];

	for (let i = 0; i < variables.length; i++) {
		const variable = variables[i];
		try {
			// Use a unique seed for each variable to ensure different random values
			// Multiply by a large prime to spread seeds apart and avoid collisions
			const variableSeed = seed !== undefined ? seed + i * 7919 : undefined;
			const resolvedValue = resolveExpression(variable.expression, resolvedVariables, variableSeed);

			// Build the resolved variable
			const resolved: ResolvedVariable = {
				name: variable.name,
				value: resolvedValue
			};

			// Apply display transforms if variable or template has displayOptions
			if (variable.displayOptions || templateDisplayDefaults) {
				const displayOptions = resolveDisplayOptions(
					templateDisplayDefaults,
					variable.displayOptions
				);

				// Only apply transforms if the value is transformable (valid LaTeX)
				// and at least one transform option is enabled
				const hasActiveTransforms =
					displayOptions.shuffleTerms ||
					displayOptions.shuffleFactors ||
					displayOptions.shuffleTermsAndFactors ||
					displayOptions.shallowShuffleTerms ||
					displayOptions.shallowShuffleFactors ||
					displayOptions.removeNullTerms ||
					displayOptions.removeUnnecessaryBrackets;

				if (hasActiveTransforms && canTransform(resolvedValue)) {
					const displayValue = applyDisplayTransforms(resolvedValue, displayOptions);
					// Only set displayValue if it's different from the raw value
					if (displayValue !== resolvedValue) {
						resolved.displayValue = displayValue;
					}
				}
			}

			resolvedVariables.push(resolved);
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
 * @returns Resolved value as string
 */
export function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed: number | undefined
): string {
	let result = expression;

	// STAGE 1: Replace variable references {{name}}
	const variableTokens = tokenize(result).filter((t) => t.type === 'variable');

	// Replace from end to start to preserve positions
	for (let i = variableTokens.length - 1; i >= 0; i--) {
		const token = variableTokens[i];
		const varName = parseVariableReference(token.content);
		if (!varName) continue;

		const resolvedVar = alreadyResolved.find((v) => v.name === varName);
		if (!resolvedVar) {
			throw new Error(`Variable "${varName}" not found or not yet resolved`);
		}

		result = result.slice(0, token.start) + resolvedVar.value + result.slice(token.end);
	}

	// STAGE 2: Generate random numbers {{random:...}} or {{...}}
	const randomTokens = tokenize(result).filter((t) => t.type === 'random');

	// Replace from end to start to preserve positions
	for (let i = randomTokens.length - 1; i >= 0; i--) {
		const token = randomTokens[i];
		try {
			const spec = parseRandomSpec(token.content);
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

	// STAGE 3: Evaluate {{eval:...}} expressions (with optional modifiers)
	const evalTokens = tokenize(result).filter((t) => t.type === 'eval');

	// Replace from end to start to preserve positions
	for (let i = evalTokens.length - 1; i >= 0; i--) {
		const token = evalTokens[i];
		try {
			const parsed = parseEvalExpressionWithModifiers(token.content);
			if (!parsed) {
				throw new Error(`Failed to parse eval expression: ${token.content}`);
			}

			// IMPORTANT: Resolve variable references inside eval expression first
			// Two cases:
			// 1. {{eval:{{a}}+{{b}}}} -> extract "{{a}}+{{b}}" -> resolve to "7+10" -> evaluate to 17
			// 2. {{eval:a+b}} -> substitute bare variable names -> "7+10" -> evaluate to 17
			let resolvedEvalExpr = parsed.expression;

			// First try to find {{var}} style tokens
			const varTokensInEval = tokenize(parsed.expression).filter((t) => t.type === 'variable');

			if (varTokensInEval.length > 0) {
				// Case 1: Variables with brackets {{var}}
				for (let j = varTokensInEval.length - 1; j >= 0; j--) {
					const varToken = varTokensInEval[j];
					const varName = parseVariableReference(varToken.content);
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
			} else {
				// Case 2: Bare variable names (common in eval expressions)
				// Replace each resolved variable name with its value
				for (const resolvedVar of alreadyResolved) {
					// Use word boundary to avoid partial replacements
					// e.g., don't replace 'a' in 'tan' or 'max'
					const regex = new RegExp(`\\b${resolvedVar.name}\\b`, 'g');
					resolvedEvalExpr = resolvedEvalExpr.replace(regex, resolvedVar.value);
				}
			}

			// Evaluate with modifiers (decimal, positive sign, bracket negative, etc.)
			const evaluatedValue = evaluateWithModifiers(resolvedEvalExpr, parsed.modifiers);
			result = result.slice(0, token.start) + String(evaluatedValue) + result.slice(token.end);
		} catch (error) {
			throw new Error(
				`Failed to evaluate expression "${token.content}": ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return result;
}
