/**
 * Tokenizer - Extract parameterization tokens from text
 * ======================================================
 *
 * Extracts all parameterization constructs from text using Markdown syntax:
 * - Variables: {{var}}
 * - Random: {{random:1..10}} or {{1..10}} or {{a|b|c}}
 * - Eval: {{eval:expr}}
 *
 * @module shared/parameterization/parser/tokenizer
 */

import type { Token } from '../types';

/**
 * Extract all parameterization tokens from text
 *
 * Supports Markdown syntax with auto-detection of token types based on content patterns.
 *
 * @param text - Text to tokenize
 * @returns Array of tokens in order of appearance
 *
 * @example Variables
 * ```typescript
 * tokenize('Value: {{a}}')
 * // Returns 1 token with type 'variable'
 * ```
 *
 * @example Random with explicit prefix
 * ```typescript
 * tokenize('Random: {{random:1..10}}')
 * // Returns 1 token with type 'random'
 * ```
 *
 * @example Random shorthand (integer range)
 * ```typescript
 * tokenize('Random: {{1..10}}')
 * // Auto-detects as random token
 * ```
 *
 * @example Random shorthand (discrete list)
 * ```typescript
 * tokenize('Color: {{rouge|vert|bleu}}')
 * // Auto-detects as random token
 * ```
 *
 * @example Eval expression
 * ```typescript
 * tokenize('Result: {{eval:a+5}}')
 * // Returns 1 token with type 'eval'
 * ```
 */
export function tokenize(text: string): Token[] {
	return extractMarkdownTokens(text);
}

/**
 * Extract Markdown syntax tokens: {{var}}, {{random:1..10}}, {{eval:expr}}
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
			// Even if no token returned (e.g., special marker like {{blank:N}}),
			// advance past the matched braces if successfully parsed
			if (result.endIndex > i + 2) {
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
 * {{random:{{min}}..{{max}}}}
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

	// Skip special markers that look like parameterization but aren't
	// {{blank:N}} is a fill-in-blank marker, not a parameterization token
	// {{digits:...}} is handled separately
	// {{color:...}} is a color reference marker, resolved by color-parser
	if (
		innerContent.startsWith('blank:') ||
		innerContent.startsWith('digits:') ||
		innerContent.startsWith('color:')
	) {
		return { token: null, endIndex: i };
	}

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
			end: i
		},
		endIndex: i
	};
}

/**
 * Check if content contains a pipe character at top level (brace depth 0)
 *
 * This detects discrete list patterns like "a|b|c" or "{{x}}|{{y}}"
 * while ignoring nested pipes inside braces.
 */
function hasTopLevelPipe(content: string): boolean {
	let braceDepth = 0;
	for (const char of content) {
		if (char === '{') braceDepth++;
		if (char === '}') braceDepth--;
		if (char === '|' && braceDepth === 0) return true;
	}
	return false;
}

/**
 * Check if content looks like a random shorthand
 *
 * Random patterns:
 * - Contains "|" at top level: "a|b|c", "rouge|vert|bleu", "{{x}}|{{y}}" (discrete list)
 * - Contains ".." (double dot) for ranges: "1..10", "{{min}}..{{max}}", "-5..10"
 * - Contains single "." with digits on both sides: "2.3" (decimal by digits)
 * - Contains ":" for step notation: "0.5..9.99:0.01"
 * - Contains "!" for exclusions: "1..10!5"
 * - Contains ";" for modifiers: "2..9;±" (relative integers)
 */
function isRandomShorthand(content: string): boolean {
	// Check for discrete list: contains | at top level
	if (hasTopLevelPipe(content)) {
		return true;
	}

	// Check for range: contains ".." (double dot) separator
	// Examples: "1..10", "-5..10", "{{min}}..{{max}}"
	if (content.includes('..')) {
		return true;
	}

	// Check for decimal by digits: "2.3" (digit.digit format - single dot only)
	if (/^\d+\.\d+$/.test(content)) {
		return true;
	}

	// Check for variable digits: "{{before}}.{{after}}"
	if (/^\{\{[\w]+\}\}\.\{\{[\w]+\}\}$/.test(content)) {
		return true;
	}

	// Check for step notation, exclusions, or modifiers
	if (content.includes(':') || content.includes('!') || content.includes(';')) {
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
