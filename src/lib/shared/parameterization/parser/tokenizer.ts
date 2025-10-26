/**
 * Tokenizer - Extract parameterization tokens from text
 * ======================================================
 *
 * Extracts all parameterization constructs from text:
 * - Questions syntax: {@:var}, {#:1-10}, {eval:expr}
 * - Markdown syntax: {{var}}, {{random:1-10}}, {{eval:expr}}
 *
 * @module shared/parameterization/parser/tokenizer
 */

import type { Token, Syntax } from '../types';

/**
 * Extract all parameterization tokens from text
 *
 * Supports both Questions and Markdown syntax, with auto-detection
 * of token types based on content patterns.
 *
 * @param text - Text to tokenize
 * @param syntax - Syntax to parse ('questions', 'markdown', or 'both')
 * @returns Array of tokens in order of appearance
 *
 * @example Questions syntax
 * ```typescript
 * tokenize('Value: {@:a}, Random: {#:1-10}, Result: {eval:a+5}', 'questions')
 * // Returns 3 tokens with type 'variable', 'random', 'eval'
 * ```
 *
 * @example Markdown syntax
 * ```typescript
 * tokenize('Value: {{a}}, Random: {{random:1-10}}, Result: {{eval:a+5}}', 'markdown')
 * // Returns 3 tokens with type 'variable', 'random', 'eval'
 * ```
 *
 * @example Markdown shorthand
 * ```typescript
 * tokenize('Random: {{1-10}}', 'markdown')
 * // Auto-detects as random token
 * ```
 *
 * @example Both syntaxes
 * ```typescript
 * tokenize('Questions: {@:a}, Markdown: {{b}}', 'both')
 * // Returns 2 tokens, one for each syntax
 * ```
 */
export function tokenize(text: string, syntax: Syntax = 'both'): Token[] {
	const tokens: Token[] = [];

	// Parse Questions syntax if enabled
	if (syntax === 'questions' || syntax === 'both') {
		tokens.push(...extractQuestionsTokens(text));
	}

	// Parse Markdown syntax if enabled
	if (syntax === 'markdown' || syntax === 'both') {
		tokens.push(...extractMarkdownTokens(text));
	}

	// Sort by position to maintain order
	return tokens.sort((a, b) => a.start - b.start);
}

/**
 * Extract Questions syntax tokens: {@:var}, {#:1-10}, {eval:expr}
 */
function extractQuestionsTokens(text: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < text.length) {
		if (text[i] === '{') {
			const result = extractQuestionsBracedToken(text, i);
			if (result.token) {
				tokens.push(result.token);
				i = result.endIndex;
				continue;
			}
		}
		i++;
	}

	return tokens;
}

/**
 * Extract a Questions syntax braced token starting at position
 *
 * Handles nested braces correctly for complex expressions like:
 * {#:{@:min}-{@:max}}
 */
function extractQuestionsBracedToken(
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

	const content = text.substring(start, i);
	const innerContent = text.substring(start + 1, i - 1);

	// Determine token type
	let type: 'variable' | 'random' | 'eval' | null = null;
	let inner = innerContent;

	if (innerContent.startsWith('@:')) {
		type = 'variable';
		inner = innerContent.substring(2);
	} else if (innerContent.startsWith('#:')) {
		type = 'random';
		inner = innerContent.substring(2);
	} else if (innerContent.startsWith('eval:')) {
		type = 'eval';
		inner = innerContent.substring(5);
	}

	if (!type) {
		// Not a parameterization token
		return { token: null, endIndex: start + 1 };
	}

	return {
		token: {
			type,
			content,
			inner,
			start,
			end: i,
			syntax: 'questions'
		},
		endIndex: i
	};
}

/**
 * Extract Markdown syntax tokens: {{var}}, {{random:1-10}}, {{eval:expr}}
 */
function extractMarkdownTokens(text: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < text.length) {
		// Check for {{ (double brace)
		if (text.substring(i, i + 2) === '{{') {
			const result = extractMarkdownBracedToken(text, i);
			if (result.token) {
				tokens.push(result.token);
				i = result.endIndex;
				continue;
			}
		}
		i++;
	}

	return tokens;
}

/**
 * Extract a Markdown syntax braced token starting at position
 *
 * Handles nested braces correctly for complex expressions like:
 * {{random:{{min}}-{{max}}}}
 */
function extractMarkdownBracedToken(
	text: string,
	start: number
): { token: Token | null; endIndex: number } {
	let braceCount = 2; // Start with {{ (2 braces)
	let i = start + 2;

	// Find matching closing braces }}
	while (i < text.length && braceCount > 0) {
		if (text[i] === '{') {
			braceCount++;
		} else if (text[i] === '}') {
			braceCount--;
		}
		i++;
	}

	if (braceCount !== 0) {
		// Unmatched braces
		return { token: null, endIndex: start + 2 };
	}

	const content = text.substring(start, i);
	const innerContent = text.substring(start + 2, i - 2);

	// Determine token type
	let type: 'variable' | 'random' | 'eval' | null = null;
	let inner = innerContent;

	if (innerContent.startsWith('random:')) {
		type = 'random';
		inner = innerContent.substring(7);
	} else if (innerContent.startsWith('eval:')) {
		type = 'eval';
		inner = innerContent.substring(5);
	} else {
		// Auto-detect: check if it looks like a random spec or variable
		// Random patterns: contains "-" (range), "." followed by digit (decimal by digits)
		// But NOT if it's just a variable name
		if (isRandomShorthand(innerContent)) {
			type = 'random';
			inner = innerContent;
		} else if (isValidVariableName(innerContent)) {
			type = 'variable';
			inner = innerContent;
		}
	}

	if (!type) {
		// Not a parameterization token
		return { token: null, endIndex: start + 2 };
	}

	return {
		token: {
			type,
			content,
			inner,
			start,
			end: i,
			syntax: 'markdown'
		},
		endIndex: i
	};
}

/**
 * Check if content looks like a random shorthand
 *
 * Random patterns:
 * - Contains "-" with numbers: "1-10", "{{min}}-{{max}}"
 * - Contains "." with digits on both sides: "2.3"
 * - Contains ":" for step notation: "0.5-9.99:0.01"
 * - Contains "!" for exclusions: "1-10!5"
 */
function isRandomShorthand(content: string): boolean {
	// Check for range: contains "-" with context suggesting numbers
	// Examples: "1-10", "-5-10", "{{min}}-{{max}}"
	if (content.includes('-')) {
		// Simple heuristic: if contains digits or nested braces, likely a range
		if (/\d/.test(content) || content.includes('{{')) {
			return true;
		}
	}

	// Check for decimal by digits: "2.3" (digit.digit format)
	if (/^\d+\.\d+$/.test(content)) {
		return true;
	}

	// Check for variable digits: "{{before}}.{{after}}"
	if (/^\{\{[\w]+\}\}\.\{\{[\w]+\}\}$/.test(content)) {
		return true;
	}

	// Check for step notation or exclusions
	if (content.includes(':') || content.includes('!')) {
		return true;
	}

	return false;
}

/**
 * Check if content is a valid variable name
 *
 * Variable names: alphanumeric + underscore only
 */
function isValidVariableName(content: string): boolean {
	return /^\w+$/.test(content);
}
