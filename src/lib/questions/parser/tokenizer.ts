/**
 * Tokenizer for Question Template Expressions
 * ============================================
 *
 * Extracts special tokens from template strings:
 * - {@:varName} - Variable references
 * - {#:...} - Random number expressions
 * - {eval:...} - Mathematical evaluations
 * - $$...$$ - LaTeX expressions
 *
 * @module questions/parser/tokenizer
 */

/**
 * Token types
 */
export type TokenType = 'variable' | 'random' | 'eval' | 'latex' | 'text';

/**
 * Token interface
 */
export interface Token {
	type: TokenType;
	value: string; // Full token including delimiters
	content: string; // Content without delimiters
	start: number; // Start index in original string
	end: number; // End index in original string
}

/**
 * Extract all tokens from a template expression
 *
 * @param text - Template string with special syntax
 * @returns Array of tokens in order of appearance
 *
 * @example
 * ```typescript
 * const tokens = tokenize('Calculate $${@:a} + {#:1-10}$$');
 * // Returns:
 * // [
 * //   { type: 'latex', value: '$${@:a} + {#:1-10}$$', content: '{@:a} + {#:1-10}', ... },
 * //   { type: 'variable', value: '{@:a}', content: 'a', ... },
 * //   { type: 'random', value: '{#:1-10}', content: '1-10', ... }
 * // ]
 * ```
 */
export function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < text.length) {
		// Check for display LaTeX: $$...$$
		if (text.substring(i, i + 2) === '$$') {
			const end = text.indexOf('$$', i + 2);
			if (end !== -1) {
				const fullValue = text.substring(i, end + 2);
				const content = text.substring(i + 2, end);
				tokens.push({
					type: 'latex',
					value: fullValue,
					content,
					start: i,
					end: end + 2
				});
				i = end + 2;
				continue;
			}
		}

		// Check for inline LaTeX: $...$
		if (text[i] === '$' && text[i + 1] !== '$') {
			const end = text.indexOf('$', i + 1);
			if (end !== -1) {
				const fullValue = text.substring(i, end + 1);
				const content = text.substring(i + 1, end);
				tokens.push({
					type: 'latex',
					value: fullValue,
					content,
					start: i,
					end: end + 1
				});
				i = end + 1;
				continue;
			}
		}

		// Check for special expressions: {@:...}, {#:...}, {eval:...}
		if (text[i] === '{') {
			const { token, endIndex } = extractBracedToken(text, i);
			if (token) {
				tokens.push(token);
				i = endIndex;
				continue;
			}
		}

		// Regular text - skip
		i++;
	}

	return tokens;
}

/**
 * Extract a braced token starting at position
 *
 * Handles nested braces correctly for complex expressions like:
 * {#:{@:min}-{@:max}}
 */
function extractBracedToken(
	text: string,
	start: number
): { token: Token | null; endIndex: number } {
	let braceCount = 1;
	let i = start + 1;

	// Find matching closing brace
	while (i < text.length && braceCount > 0) {
		if (text[i] === '{') braceCount++;
		if (text[i] === '}') braceCount--;
		i++;
	}

	if (braceCount !== 0) {
		// Unmatched braces
		return { token: null, endIndex: start + 1 };
	}

	const fullValue = text.substring(start, i);
	const innerContent = text.substring(start + 1, i - 1);

	// Determine token type
	let type: TokenType = 'text';
	let content = innerContent;

	if (innerContent.startsWith('@:')) {
		type = 'variable';
		content = innerContent.substring(2);
	} else if (innerContent.startsWith('#:')) {
		type = 'random';
		content = innerContent.substring(2);
	} else if (innerContent.startsWith('eval:')) {
		type = 'eval';
		content = innerContent.substring(5);
	} else {
		// Not a special token
		return { token: null, endIndex: start + 1 };
	}

	return {
		token: {
			type,
			value: fullValue,
			content,
			start,
			end: i
		},
		endIndex: i
	};
}

/**
 * Find all tokens of a specific type
 *
 * @param text - Template string
 * @param type - Token type to find
 * @returns Array of matching tokens
 *
 * @example
 * ```typescript
 * const vars = findTokensByType('{@:a} + {@:b}', 'variable');
 * // Returns tokens for 'a' and 'b'
 * ```
 */
export function findTokensByType(text: string, type: TokenType): Token[] {
	const allTokens = tokenize(text);
	return allTokens.filter((token) => token.type === type);
}

/**
 * Helper type for variable reference
 */
export interface VariableReference {
	name: string;
	fullMatch: string;
}

/**
 * Find all variable references in text (including inside LaTeX)
 *
 * @param text - Template string
 * @returns Array of variable references with name and full match
 */
export function findVariableReferences(text: string): VariableReference[] {
	const allTokens = tokenize(text);
	const results: VariableReference[] = [];

	for (const token of allTokens) {
		if (token.type === 'variable') {
			results.push({
				name: token.content,
				fullMatch: token.value
			});
		} else if (token.type === 'latex') {
			// Recursively find variables inside LaTeX
			const innerVars = findVariableReferences(token.content);
			results.push(...innerVars);
		} else if (token.type === 'random' || token.type === 'eval') {
			// Recursively find variables inside random/eval expressions
			const innerVars = findVariableReferences(token.content);
			results.push(...innerVars);
		}
	}

	return results;
}

/**
 * Find all random expressions in text
 *
 * @param text - Template string
 * @returns Array of random expression strings (full match including {#:...})
 */
export function findRandomExpressions(text: string): string[] {
	const tokens = findTokensByType(text, 'random');
	return tokens.map((token) => token.value);
}

/**
 * Helper type for eval expression
 */
export interface EvalExpression {
	expression: string;
	raw: string;
}

/**
 * Find all eval expressions in text
 *
 * @param text - Template string
 * @returns Array of eval expressions with expression and raw
 */
export function findEvalExpressions(text: string): EvalExpression[] {
	const tokens = findTokensByType(text, 'eval');
	return tokens.map((token) => ({
		expression: token.content,
		raw: token.value
	}));
}

/**
 * Helper type for LaTeX expression
 */
export interface LatexExpression {
	latex: string;
	raw: string;
	isDisplay: boolean;
}

/**
 * Find all LaTeX expressions in text
 *
 * @param text - Template string
 * @returns Array of LaTeX expressions with latex content, raw, and display type
 */
export function findLatexExpressions(text: string): LatexExpression[] {
	const tokens = findTokensByType(text, 'latex');
	return tokens.map((token) => ({
		latex: token.content,
		raw: token.value,
		// Display LaTeX uses $$, inline uses $
		isDisplay: token.value.startsWith('$$')
	}));
}
