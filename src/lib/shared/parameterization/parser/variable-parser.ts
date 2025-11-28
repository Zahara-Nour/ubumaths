/**
 * Variable Parser - Parse variable reference tokens
 * ==================================================
 *
 * Parses variable references from Markdown syntax: {{varName}}
 *
 * @module shared/parameterization/parser/variable-parser
 */

/**
 * Parse a variable reference token
 *
 * Extracts the variable name from a Markdown reference token.
 * Validates token structure and returns the variable name.
 *
 * @param token - Full token string including delimiters
 * @returns Variable name, or null if token is not a valid variable reference
 *
 * @example Markdown syntax
 * ```typescript
 * parseVariableReference('{{myVar}}')
 * // → 'myVar'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseVariableReference('{{random:5..10}}')  // → null (random, not variable)
 * parseVariableReference('{{eval:a+b}}')      // → null (eval, not variable)
 * ```
 */
export function parseVariableReference(token: string): string | null {
	const markdownMatch = token.match(/^\{\{(\w+)\}\}$/);
	if (markdownMatch) {
		const inner = markdownMatch[1];
		// Valid variable: alphanumeric + underscore only, not containing special patterns
		if (/^\w+$/.test(inner) && !inner.includes(':') && !inner.includes('-')) {
			return inner;
		}
	}

	return null;
}
