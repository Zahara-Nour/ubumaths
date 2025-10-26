/**
 * Variable Parser - Parse variable reference tokens
 * ==================================================
 *
 * Parses variable references from both syntax flavors:
 * - Questions: {@:varName}
 * - Markdown: {{varName}}
 *
 * @module shared/parameterization/parser/variable-parser
 */

import type { Syntax } from '../types';

/**
 * Parse a variable reference token
 *
 * Extracts the variable name from a reference token in either syntax.
 * Validates token structure and returns the variable name.
 *
 * @param token - Full token string including delimiters
 * @param syntax - Expected syntax (optional, auto-detects if not provided)
 * @returns Variable name, or null if token is not a valid variable reference
 *
 * @example Questions syntax
 * ```typescript
 * parseVariableReference('{@:myVar}', 'questions')
 * // → 'myVar'
 * ```
 *
 * @example Markdown syntax
 * ```typescript
 * parseVariableReference('{{myVar}}', 'markdown')
 * // → 'myVar'
 * ```
 *
 * @example Auto-detect
 * ```typescript
 * parseVariableReference('{@:a}')  // → 'a'
 * parseVariableReference('{{b}}')  // → 'b'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseVariableReference('{#:1-10}')  // → null (random, not variable)
 * parseVariableReference('{{random:5-10}}')  // → null (random, not variable)
 * ```
 */
export function parseVariableReference(token: string, syntax?: Syntax): string | null {
	// Try Questions syntax first
	if (!syntax || syntax === 'questions' || syntax === 'both') {
		const questionsMatch = token.match(/^\{@:(\w+)\}$/);
		if (questionsMatch) {
			return questionsMatch[1];
		}
	}

	// Try Markdown syntax
	if (!syntax || syntax === 'markdown' || syntax === 'both') {
		const markdownMatch = token.match(/^\{\{(\w+)\}\}$/);
		if (markdownMatch) {
			// Ensure it's not a random or eval token
			const inner = markdownMatch[1];
			// Valid variable: alphanumeric + underscore only, not containing special patterns
			if (/^\w+$/.test(inner) && !inner.includes(':') && !inner.includes('-')) {
				return inner;
			}
		}
	}

	return null;
}
