/**
 * Math Extractor - Extract and Replace Math Expressions
 * ======================================================
 *
 * This module extracts LaTeX math expressions from markdown text and replaces
 * them with unique placeholders. This allows the main parser to process the
 * markdown without worrying about math syntax interfering with markdown syntax.
 *
 * Supported patterns:
 * - Inline math: $...$
 * - Block math: $$...$$
 * - Escaped delimiters: \$ (literal dollar sign)
 *
 * Process:
 * 1. Extract: Find all math expressions and replace with placeholders
 * 2. Parse: Parse the remaining markdown normally
 * 3. Restore: Replace placeholders back with math nodes in the AST
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
 * Regex for detecting \placeholder[N]{...} commands in LaTeX
 *
 * Pattern breakdown:
 * - \\placeholder - Literal \placeholder command
 * - \[(\d+)\] - Capture group: numeric index in brackets
 * - \{[^}]*\} - Content in braces (can be empty)
 */
const PLACEHOLDER_COMMAND_REGEX = /\\placeholder\[(\d+)\]\{[^}]*\}/g;

/**
 * Extract prompt indices from LaTeX containing \placeholder[N]{} commands
 *
 * @param latex - LaTeX string to analyze
 * @returns Object with hasPrompts flag and array of indices
 *
 * @example
 * extractPromptInfo('\\frac{\\placeholder[1]{}}{\\placeholder[2]{}}')
 * // { hasPrompts: true, promptIndices: [1, 2] }
 *
 * @example
 * extractPromptInfo('x^2 + 1')
 * // { hasPrompts: false, promptIndices: [] }
 */
export function extractPromptInfo(latex: string): {
	hasPrompts: boolean;
	promptIndices: number[];
} {
	const indices: number[] = [];
	let match: RegExpExecArray | null;

	// Reset regex state
	PLACEHOLDER_COMMAND_REGEX.lastIndex = 0;

	while ((match = PLACEHOLDER_COMMAND_REGEX.exec(latex)) !== null) {
		const index = parseInt(match[1], 10);
		if (!indices.includes(index)) {
			indices.push(index);
		}
	}

	return {
		hasPrompts: indices.length > 0,
		promptIndices: indices.sort((a, b) => a - b)
	};
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract math expressions from markdown and replace with placeholders
 *
 * This is step 1 of the parse process. It extracts all math expressions
 * and returns the cleaned text along with a map of placeholders.
 *
 * @param markdown - Original markdown text with $...$ and $$...$$ math
 * @returns Object with cleaned text and array of math placeholders
 *
 * @example
 * const result = extractMath("Calculate $x^2$ and $$\\int x dx$$");
 * // result.text = "Calculate __MATH_0__ and __MATH_1__"
 * // result.placeholders = [
 * //   { placeholder: '__MATH_0__', latex: 'x^2', isBlock: false, ... },
 * //   { placeholder: '__MATH_1__', latex: '\\int x dx', isBlock: true, ... }
 * // ]
 */
export function extractMath(markdown: string): {
	text: string;
	placeholders: MathPlaceholder[];
} {
	const placeholders: MathPlaceholder[] = [];
	let text = markdown;
	let placeholderIndex = 0;

	// Step 1: Temporarily replace escaped dollars \$ with a placeholder
	// This prevents them from being matched as math delimiters
	text = text.replace(ESCAPED_DOLLAR_REGEX, ESCAPED_DOLLAR_PLACEHOLDER);

	// Step 2: Extract block math $$...$$ first (before inline)
	// This is important because $$ could be misinterpreted as two inline $ delimiters
	text = text.replace(BLOCK_MATH_REGEX, (match, latex, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;
		const trimmedLatex = latex.trim();
		const promptInfo = extractPromptInfo(trimmedLatex);

		placeholders.push({
			placeholder,
			latex: trimmedLatex, // Remove leading/trailing whitespace from LaTeX
			isBlock: true,
			startIndex: offset,
			endIndex: offset + match.length,
			hasPrompts: promptInfo.hasPrompts,
			promptIndices: promptInfo.promptIndices
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 3: Extract inline math $...$
	text = text.replace(INLINE_MATH_REGEX, (match, latex, offset) => {
		const placeholder = `${PLACEHOLDER_PREFIX}${placeholderIndex}${PLACEHOLDER_SUFFIX}`;
		const trimmedLatex = latex.trim();
		const promptInfo = extractPromptInfo(trimmedLatex);

		placeholders.push({
			placeholder,
			latex: trimmedLatex,
			isBlock: false,
			startIndex: offset,
			endIndex: offset + match.length,
			hasPrompts: promptInfo.hasPrompts,
			promptIndices: promptInfo.promptIndices
		});

		placeholderIndex++;
		return placeholder;
	});

	// Step 4: Restore escaped dollars back to literal $
	text = text.replace(new RegExp(ESCAPED_DOLLAR_PLACEHOLDER, 'g'), '$');

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
