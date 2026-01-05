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
 * @module ubumark/parser/math-extractor
 */

import type { MathPlaceholder } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Placeholder prefix/suffix (must not conflict with normal markdown)
 *
 * IMPORTANT: These must NOT contain * or _ characters, as they would
 * interfere with bold/italic parsing regex which uses [^*_]+ patterns.
 * Using § (section sign) which is unlikely to appear in normal text.
 */
const PLACEHOLDER_PREFIX = '§M:';
const PLACEHOLDER_SUFFIX = '§';

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
 * // result.text = "Calculate §M:0§ and §M:1§"
 * // result.placeholders = [
 * //   { placeholder: '§M:0§', expression: 'x^2', syntax: 'latex', isBlock: false, ... },
 * //   { placeholder: '§M:1§', expression: '\\int x dx', syntax: 'latex', isBlock: true, ... }
 * // ]
 * ```
 *
 * @example Custom syntax (expressions stored as-is)
 * ```typescript
 * const result = extractMath("Calculate ~2x^2+3~ and ~~f(x)=x^2~~");
 * // result.text = "Calculate §M:0§ and §M:1§"
 * // result.placeholders = [
 * //   { placeholder: '§M:0§', expression: '2x^2+3', syntax: 'custom', isBlock: false, ... },
 * //   { placeholder: '§M:1§', expression: 'f(x)=x^2', syntax: 'custom', isBlock: true, ... }
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
 * isMathPlaceholder('§M:0§') // true
 * isMathPlaceholder('regular text') // false
 */
export function isMathPlaceholder(text: string): boolean {
	return text.startsWith(PLACEHOLDER_PREFIX) && text.endsWith(PLACEHOLDER_SUFFIX);
}

/**
 * Extract placeholder index from a placeholder string
 *
 * @param placeholder - Placeholder string (e.g., '§M:5§')
 * @returns Placeholder index (e.g., 5), or null if invalid
 *
 * @example
 * getPlaceholderIndex('§M:5§') // 5
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
 * const text = "Calculate §M:0§ and §M:1§ please";
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

/**
 * Restore math placeholders to their original expressions with delimiters
 *
 * This is useful when content with placeholders needs to be passed to a parser
 * that expects the original math expressions (e.g., probtree parser).
 *
 * @param text - Text containing placeholders (e.g., "§M:0§")
 * @param placeholders - Array of math placeholders from extraction
 * @returns Text with placeholders replaced by original math expressions
 *
 * @example
 * // If placeholder was extracted from "$R_1$"
 * restoreMathPlaceholders("Event §M:0§:0.85", placeholders)
 * // Returns: "Event $R_1$:0.85"
 */
export function restoreMathPlaceholders(text: string, placeholders: MathPlaceholder[]): string {
	let result = text;

	for (const p of placeholders) {
		if (result.includes(p.placeholder)) {
			// Reconstruct the original delimited expression
			let original: string;
			if (p.syntax === 'latex') {
				original = p.isBlock ? `$$${p.expression}$$` : `$${p.expression}$`;
			} else {
				// Custom syntax
				original = p.isBlock ? `~~${p.expression}~~` : `~${p.expression}~`;
			}
			// Use function replacer to avoid special $ interpretation in replace()
			// (e.g., $$ becomes $ if used directly in replacement string)
			result = result.replace(p.placeholder, () => original);
		}
	}

	return result;
}
