/**
 * Eval Parser - Parse expression evaluation tokens
 * =================================================
 *
 * Parses eval expressions from Markdown syntax: {{eval:a+b*2}}
 *
 * @module shared/parameterization/parser/eval-parser
 */

/**
 * Parse an eval expression token
 *
 * Extracts the mathematical expression from an eval token.
 * The expression can reference variables and use standard operators.
 *
 * @param token - Full token string including delimiters
 * @returns Expression string, or null if token is not a valid eval expression
 *
 * @example Markdown syntax
 * ```typescript
 * parseEvalExpression('{{eval:a+b}}')
 * // → 'a+b'
 * ```
 *
 * @example Complex expression
 * ```typescript
 * parseEvalExpression('{{eval:2*a + b^2 - c/3}}')
 * // → '2*a + b^2 - c/3'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseEvalExpression('{{var}}')  // → null (variable, not eval)
 * parseEvalExpression('{{random:1-10}}')  // → null (random, not eval)
 * ```
 */
export function parseEvalExpression(token: string): string | null {
	if (token.startsWith('{{eval:') && token.endsWith('}}')) {
		return token.slice(7, -2);
	}

	return null;
}
