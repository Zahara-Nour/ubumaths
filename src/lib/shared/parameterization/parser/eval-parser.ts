/**
 * Eval Parser - Parse expression evaluation tokens
 * =================================================
 *
 * Parses eval expressions from both syntax flavors:
 * - Questions: {eval:a+b*2}
 * - Markdown: {{eval:a+b*2}}
 *
 * @module shared/parameterization/parser/eval-parser
 */

import type { Syntax } from '../types';

/**
 * Parse an eval expression token
 *
 * Extracts the mathematical expression from an eval token.
 * The expression can reference variables and use standard operators.
 *
 * @param token - Full token string including delimiters
 * @param syntax - Expected syntax (optional, auto-detects if not provided)
 * @returns Expression string, or null if token is not a valid eval expression
 *
 * @example Questions syntax
 * ```typescript
 * parseEvalExpression('{eval:a+b}', 'questions')
 * // → 'a+b'
 * ```
 *
 * @example Markdown syntax
 * ```typescript
 * parseEvalExpression('{{eval:a+b}}', 'markdown')
 * // → 'a+b'
 * ```
 *
 * @example Complex expression
 * ```typescript
 * parseEvalExpression('{eval:2*a + b^2 - c/3}')
 * // → '2*a + b^2 - c/3'
 * ```
 *
 * @example Auto-detect
 * ```typescript
 * parseEvalExpression('{eval:x*y}')  // Questions syntax → 'x*y'
 * parseEvalExpression('{{eval:x*y}}')  // Markdown syntax → 'x*y'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseEvalExpression('{@:var}')  // → null (variable, not eval)
 * parseEvalExpression('{{random:1-10}}')  // → null (random, not eval)
 * ```
 */
export function parseEvalExpression(token: string, syntax?: Syntax): string | null {
	// Try Questions syntax first
	if (!syntax || syntax === 'questions' || syntax === 'both') {
		if (token.startsWith('{eval:') && token.endsWith('}')) {
			return token.slice(6, -1);
		}
	}

	// Try Markdown syntax
	if (!syntax || syntax === 'markdown' || syntax === 'both') {
		if (token.startsWith('{{eval:') && token.endsWith('}}')) {
			return token.slice(7, -2);
		}
	}

	return null;
}
