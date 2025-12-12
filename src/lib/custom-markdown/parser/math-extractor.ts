/**
 * Math Extractor - Extract and Replace Math Expressions
 * ======================================================
 *
 * This module extracts math expressions (both LaTeX and custom syntax) from
 * markdown text and replaces them with unique placeholders. This allows the
 * main parser to process the markdown without worrying about math syntax
 * interfering with markdown syntax.
 *
 * Supported patterns:
 * - Inline LaTeX: $...$
 * - Block LaTeX: $$...$$
 * - Inline custom: ~...~
 * - Block custom: ~~...~~
 * - Escaped delimiters: \$ and \~ (literal characters)
 *
 * Process:
 * 1. Extract: Find all math expressions and replace with placeholders
 *    - Expressions are stored as-is (no conversion at this stage)
 *    - Syntax type is recorded ('latex' or 'custom')
 * 2. Parse: Parse the remaining markdown normally
 * 3. Restore: Replace placeholders back with math nodes in the AST
 *
 * Note: Conversion from custom syntax to LaTeX happens during rendering,
 * not during extraction.
 *
 * @module custom-markdown/parser/math-extractor
 */

import type { MathPlaceholder } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Placeholder prefix (must not conflict with normal markdown) */
const PLACEHOLDER_PREFIX = '__MATH_';
const PLACEHOLDER_SUFFIX = '__';

/**
 * Regex for matching inline math $...$
 *
 * Pattern breakdown:
 * - (?<!\\) - Negative lookbehind: not preceded by backslash (handles \$)
 * - \$ - Literal dollar sign
 * - ([^$\n]+) - Capture group: one or more characters that are not $ or newline
 * - \$ - Closing dollar sign
 *
 * Note: Inline math cannot span multiple lines
 */
const INLINE_MATH_REGEX = /(?<!\\)\$([^$\n]+)\$/g;

/**
 * Regex for matching block math $$...$$
 *
 * Pattern breakdown:
 * - (?<!\\) - Negative lookbehind: not preceded by backslash
 * - \$\$ - Two literal dollar signs
 * - ([\s\S]+?) - Capture group: one or more any characters (including newlines), non-greedy
 * - \$\$ - Closing double dollar signs
 *
 * Note: Block math CAN span multiple lines ([\s\S] matches everything)
 * Non-greedy (+?) ensures we match the shortest possible expression
 */
const BLOCK_MATH_REGEX = /(?<!\\)\$\$([\s\S]+?)\$\$/g;

/**
 * Regex for matching escaped dollar signs \$
 */
const ESCAPED_DOLLAR_REGEX = /\\\$/g;

/**
 * Temporary placeholder for escaped dollars (will be replaced back to $ after extraction)
 */
const ESCAPED_DOLLAR_PLACEHOLDER = '___ESCAPED_DOLLAR___';

/**
 * Regex for inline custom math ~...~
 * - (?<!\\) - Not escaped
 * - ~ - Opening tilde
 * - ([^~\n]+) - Content (no tildes or newlines)
 * - ~ - Closing tilde
 * - (?!~) - Not followed by another tilde (avoid matching ~~)
 */
const INLINE_CUSTOM_REGEX = /(?<!\\)~([^~\n]+)~(?!~)/g;

/**
 * Regex for block custom math ~~...~~
 * Uses negative lookbehind/lookahead to NOT match ~~~ code fences:
 * - (?<!~)~~ ensures opening ~~ is not preceded by another ~
 * - ~~(?!~) ensures opening ~~ is not followed by another ~
 * - (?<!~)~~ ensures closing ~~ is not preceded by another ~
 * - ~~(?!~) ensures closing ~~ is not followed by another ~
 */
const BLOCK_CUSTOM_REGEX = /(?<!\\)(?<!~)~~(?!~)([\s\S]+?)(?<!~)~~(?!~)/g;

/**
 * Regex for matching escaped tildes \~
 */
const ESCAPED_TILDE_REGEX = /\\~/g;

/**
 * Temporary placeholder for escaped tildes (will be replaced back to ~ after extraction)
 */
const ESCAPED_TILDE_PLACEHOLDER = '___ESCAPED_TILDE___';

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract math expressions from markdown and replace with placeholders
 *
 * This is step 1 of the parse process. It extracts all math expressions
 * (both LaTeX and custom syntax) and returns the cleaned text along with
 * a map of placeholders.
 *
 * Supported formats:
 * - LaTeX inline: $...$
 * - LaTeX block: $$...$$
 * - Custom inline: ~...~
 * - Custom block: ~~...~~
 *
 * @param markdown - Original markdown text with math expressions
 * @returns Object with cleaned text and array of math placeholders
 *
 * @example LaTeX syntax
 * ```typescript
 * const result = extractMath("Calculate $x^2$ and $$\\int x dx$$");
 * // result.text = "Calculate __MATH_0__ and __MATH_1__"
 * // result.placeholders = [
 * //   { placeholder: '__MATH_0__', expression: 'x^2', syntax: 'latex', isBlock: false, ... },
 * //   { placeholder: '__MATH_1__', expression: '\\int x dx', syntax: 'latex', isBlock: true, ... }
 * // ]
 * ```
 *
 * @example Custom syntax (expressions stored as-is)
 * ```typescript
 * const result = extractMath("Calculate ~2x^2+3~ and ~~f(x)=x^2~~");
 * // result.text = "Calculate __MATH_0__ and __MATH_1__"
 * // result.placeholders = [
 * //   { placeholder: '__MATH_0__', expression: '2x^2+3', syntax: 'custom', isBlock: false, ... },
 * //   { placeholder: '__MATH_1__', expression: 'f(x)=x^2', syntax: 'custom', isBlock: true, ... }
 * // ]
 * ```
 */
export function extractMath(markdown: string): {
	text: string;
	placeholders: MathPlaceholder[];
} {
	const placeholders: MathPlaceholder[] = [];
	let text = markdown;
	let placeholderIndex = 0;

	// Step 1: Temporarily replace escaped characters with placeholders
	// This prevents them from being matched as math delimiters
	text = text.replace(ESCAPED_DOLLAR_REGEX, ESCAPED_DOLLAR_PLACEHOLDER);
	text = text.replace(ESCAPED_TILDE_REGEX, ESCAPED_TILDE_PLACEHOLDER);

	// Step 2: Extract block math $$...$$ first (before inline)
	// This is important because $$ could be misinterpreted as two inline $ delimiters
	text = text.replace(BLOCK_MATH_REGEX, (match, expression, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;

		placeholders.push({
			placeholder,
			expression: expression.trim(),
			syntax: 'latex',
			isBlock: true,
			startIndex: offset,
			endIndex: offset + match.length
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 3: Extract block custom math ~~...~~
	text = text.replace(BLOCK_CUSTOM_REGEX, (match, expression, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;

		placeholders.push({
			placeholder,
			expression: expression.trim(),
			syntax: 'custom',
			isBlock: true,
			startIndex: offset,
			endIndex: offset + match.length
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 4: Extract inline math $...$
	text = text.replace(INLINE_MATH_REGEX, (match, expression, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;

		placeholders.push({
			placeholder,
			expression: expression.trim(),
			syntax: 'latex',
			isBlock: false,
			startIndex: offset,
			endIndex: offset + match.length
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 5: Extract inline custom math ~...~
	text = text.replace(INLINE_CUSTOM_REGEX, (match, expression, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;

		placeholders.push({
			placeholder,
			expression: expression.trim(),
			syntax: 'custom',
			isBlock: false,
			startIndex: offset,
			endIndex: offset + match.length
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 6: Restore escaped characters back to literals
	text = text.replace(new RegExp(ESCAPED_DOLLAR_PLACEHOLDER, 'g'), '$');
	text = text.replace(new RegExp(ESCAPED_TILDE_PLACEHOLDER, 'g'), '~');

	return {
		text,
		placeholders
	};
}

// ============================================================================
// PLACEHOLDER DETECTION
// ============================================================================

/**
 * Check if a string is a math placeholder
 *
 * Used during AST reconstruction to identify placeholders in text nodes.
 *
 * @param text - Text to check
 * @returns true if text is a placeholder, false otherwise
 *
 * @example
 * isMathPlaceholder('__MATH_0__') // true
 * isMathPlaceholder('regular text') // false
 */
export function isMathPlaceholder(text: string): boolean {
	return text.startsWith(PLACEHOLDER_PREFIX) && text.endsWith(PLACEHOLDER_SUFFIX);
}

/**
 * Extract placeholder index from a placeholder string
 *
 * @param placeholder - Placeholder string (e.g., '__MATH_5__')
 * @returns Placeholder index (e.g., 5), or null if invalid
 *
 * @example
 * getPlaceholderIndex('__MATH_5__') // 5
 * getPlaceholderIndex('not a placeholder') // null
 */
export function getPlaceholderIndex(placeholder: string): number | null {
	if (!isMathPlaceholder(placeholder)) {
		return null;
	}

	const match = placeholder.match(/\d+/);
	return match ? Number.parseInt(match[0], 10) : null;
}

// ============================================================================
// RESTORATION
// ============================================================================

/**
 * Find a math placeholder by its placeholder string
 *
 * @param placeholders - Array of math placeholders
 * @param placeholderStr - Placeholder string to find
 * @returns MathPlaceholder if found, undefined otherwise
 */
export function findPlaceholder(
	placeholders: MathPlaceholder[],
	placeholderStr: string
): MathPlaceholder | undefined {
	return placeholders.find((p) => p.placeholder === placeholderStr);
}

/**
 * Split text containing placeholders into segments
 *
 * This is useful for processing text that may contain multiple placeholders
 * mixed with regular text.
 *
 * @param text - Text possibly containing placeholders
 * @param placeholders - Array of all placeholders
 * @returns Array of segments (strings or MathPlaceholder objects)
 *
 * @example
 * const text = "Calculate __MATH_0__ and __MATH_1__ please";
 * const segments = splitTextWithPlaceholders(text, placeholders);
 * // ['Calculate ', MathPlaceholder{...}, ' and ', MathPlaceholder{...}, ' please']
 */
export function splitTextWithPlaceholders(
	text: string,
	placeholders: MathPlaceholder[]
): (string | MathPlaceholder)[] {
	// If no placeholders in text, return as-is
	if (!placeholders.some((p) => text.includes(p.placeholder))) {
		return [text];
	}

	const segments: (string | MathPlaceholder)[] = [];
	const remainingText = text;

	// Build a regex that matches any of the placeholders
	const placeholderPattern = placeholders.map((p) => escapeRegex(p.placeholder)).join('|');
	const regex = new RegExp(`(${placeholderPattern})`, 'g');

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(remainingText)) !== null) {
		// Add text before the placeholder
		if (match.index > lastIndex) {
			segments.push(remainingText.slice(lastIndex, match.index));
		}

		// Add the placeholder object
		const placeholder = findPlaceholder(placeholders, match[0]);
		if (placeholder) {
			segments.push(placeholder);
		}

		lastIndex = regex.lastIndex;
	}

	// Add remaining text after last placeholder
	if (lastIndex < remainingText.length) {
		segments.push(remainingText.slice(lastIndex));
	}

	// Filter out empty strings
	return segments.filter((seg) => (typeof seg === 'string' ? seg.length > 0 : true));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get statistics about math expressions in markdown
 *
 * Useful for debugging and validation.
 *
 * @param markdown - Markdown text
 * @returns Object with counts of inline and block math expressions
 */
export function getMathStats(markdown: string): {
	inlineCount: number;
	blockCount: number;
	totalCount: number;
} {
	const { placeholders } = extractMath(markdown);

	const inlineCount = placeholders.filter((p) => !p.isBlock).length;
	const blockCount = placeholders.filter((p) => p.isBlock).length;

	return {
		inlineCount,
		blockCount,
		totalCount: placeholders.length
	};
}
