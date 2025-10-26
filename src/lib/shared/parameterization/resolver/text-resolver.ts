/**
 * Text Resolver - Resolve parameter tokens in arbitrary text
 * ===========================================================
 *
 * Replaces all parameter tokens in text with their resolved values.
 * Works with any text content: statements, corrections, descriptions, etc.
 *
 * @module shared/parameterization/resolver/text-resolver
 */

import type { ResolvedVariable, Syntax } from '../types';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';

/**
 * Resolve all parameter tokens in arbitrary text
 *
 * Replaces variable references with their resolved values while
 * preserving all other text content and formatting.
 *
 * Supports both Questions and Markdown syntax.
 *
 * @param text - Text containing parameter tokens
 * @param resolvedVariables - Previously resolved variables
 * @param syntax - Syntax to use for parsing (default: 'both')
 * @returns Text with all tokens replaced by resolved values
 *
 * @example Questions syntax
 * ```typescript
 * resolveText(
 *   'The value is {@:a} and the sum is {@:b}',
 *   [{ name: 'a', value: '5' }, { name: 'b', value: '15' }],
 *   'questions'
 * )
 * // → 'The value is 5 and the sum is 15'
 * ```
 *
 * @example Markdown syntax
 * ```typescript
 * resolveText(
 *   'The value is {{a}} and the sum is {{b}}',
 *   [{ name: 'a', value: '5' }, { name: 'b', value: '15' }],
 *   'markdown'
 * )
 * // → 'The value is 5 and the sum is 15'
 * ```
 *
 * @example Both syntaxes
 * ```typescript
 * resolveText(
 *   'Questions: {@:a}, Markdown: {{b}}',
 *   [{ name: 'a', value: '5' }, { name: 'b', value: '10' }],
 *   'both'
 * )
 * // → 'Questions: 5, Markdown: 10'
 * ```
 *
 * @example LaTeX content
 * ```typescript
 * resolveText(
 *   'Calculate $$\\frac{{@:a}}{{@:b}}$$',
 *   [{ name: 'a', value: '10' }, { name: 'b', value: '5' }],
 *   'questions'
 * )
 * // → 'Calculate $$\\frac{10}{5}$$'
 * ```
 *
 * @example Undefined variable
 * ```typescript
 * resolveText(
 *   'Value: {@:undefined}',
 *   [{ name: 'a', value: '5' }],
 *   'questions'
 * )
 * // → Throws Error: 'Variable "undefined" not found in resolved variables'
 * ```
 *
 * @example No tokens
 * ```typescript
 * resolveText(
 *   'This is plain text',
 *   [],
 *   'both'
 * )
 * // → 'This is plain text' (unchanged)
 * ```
 */
export function resolveText(
	text: string,
	resolvedVariables: ResolvedVariable[],
	syntax: Syntax = 'both'
): string {
	// 1. Tokenize to find all variable references
	const tokens = tokenize(text, syntax);

	// 2. Filter for variable tokens only
	const variableTokens = tokens.filter((t) => t.type === 'variable');

	// 3. Replace from end to start (preserve positions)
	let result = text;
	for (let i = variableTokens.length - 1; i >= 0; i--) {
		const token = variableTokens[i];
		const varName = parseVariableReference(token.content, token.syntax);
		if (!varName) continue;

		// Find resolved value
		const resolved = resolvedVariables.find((v) => v.name === varName);
		if (!resolved) {
			throw new Error(`Variable "${varName}" not found in resolved variables`);
		}

		// Replace
		result = result.slice(0, token.start) + resolved.value + result.slice(token.end);
	}

	return result;
}
