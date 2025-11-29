/**
 * Text Resolver - Resolve parameter tokens in arbitrary text
 * ===========================================================
 *
 * Replaces all parameter tokens in text with their resolved values.
 * Works with any text content: statements, corrections, descriptions, etc.
 *
 * @module shared/parameterization/resolver/text-resolver
 */

import type { ResolvedVariable } from '../types';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';

/**
 * Options for text resolution
 */
export interface ResolveTextOptions {
	/**
	 * Use displayValue when available instead of raw value
	 *
	 * When true, if a resolved variable has a displayValue (transformed
	 * by displayOptions like shuffleTerms), that value will be used.
	 * When false or undefined, always use the raw value.
	 *
	 * @default false
	 */
	useDisplayValue?: boolean;
}

/**
 * Resolve all parameter tokens in arbitrary text
 *
 * Replaces variable references with their resolved values while
 * preserving all other text content and formatting.
 *
 * @param text - Text containing parameter tokens
 * @param resolvedVariables - Previously resolved variables
 * @param options - Resolution options (optional)
 * @returns Text with all tokens replaced by resolved values
 *
 * @example Basic usage
 * ```typescript
 * resolveText(
 *   'The value is {{a}} and the sum is {{b}}',
 *   [{ name: 'a', value: '5' }, { name: 'b', value: '15' }]
 * )
 * // → 'The value is 5 and the sum is 15'
 * ```
 *
 * @example Using displayValue
 * ```typescript
 * resolveText(
 *   'Calculate: $${{expr}}$$',
 *   [{ name: 'expr', value: 'a+b+c', displayValue: 'c+a+b' }],
 *   { useDisplayValue: true }
 * )
 * // → 'Calculate: $$c+a+b$$' (uses shuffled displayValue)
 * ```
 *
 * @example LaTeX content
 * ```typescript
 * resolveText(
 *   'Calculate $$\\frac{{a}}{{b}}$$',
 *   [{ name: 'a', value: '10' }, { name: 'b', value: '5' }]
 * )
 * // → 'Calculate $$\\frac{10}{5}$$'
 * ```
 *
 * @example Undefined variable
 * ```typescript
 * resolveText(
 *   'Value: {{undefined}}',
 *   [{ name: 'a', value: '5' }]
 * )
 * // → Throws Error: 'Variable "undefined" not found in resolved variables'
 * ```
 *
 * @example No tokens
 * ```typescript
 * resolveText('This is plain text', [])
 * // → 'This is plain text' (unchanged)
 * ```
 */
export function resolveText(
	text: string,
	resolvedVariables: ResolvedVariable[],
	options?: ResolveTextOptions
): string {
	const useDisplayValue = options?.useDisplayValue ?? false;

	// 1. Tokenize to find all variable references
	const tokens = tokenize(text);

	// 2. Filter for variable tokens only
	const variableTokens = tokens.filter((t) => t.type === 'variable');

	// 3. Replace from end to start (preserve positions)
	let result = text;
	for (let i = variableTokens.length - 1; i >= 0; i--) {
		const token = variableTokens[i];
		const varName = parseVariableReference(token.content);
		if (!varName) continue;

		// Find resolved value
		const resolved = resolvedVariables.find((v) => v.name === varName);
		if (!resolved) {
			throw new Error(`Variable "${varName}" not found in resolved variables`);
		}

		// Use displayValue if available and requested, otherwise use raw value
		const valueToUse =
			useDisplayValue && resolved.displayValue !== undefined
				? resolved.displayValue
				: resolved.value;

		// Replace
		result = result.slice(0, token.start) + valueToUse + result.slice(token.end);
	}

	return result;
}
