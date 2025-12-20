/**
 * Code Block Parser - Parse Markdown Code Blocks
 * ===============================================
 *
 * This module parses markdown fenced code blocks with support for:
 * - Triple backtick fences (```)
 * - Triple tilde fences (~~~)
 * - Optional language identifiers
 * - Proper handling of math placeholders
 * - Preservation of all content formatting
 *
 * Supported formats:
 * - Basic: ```
 *         code here
 *         ```
 * - With language: ```typescript
 *                  const x = 1;
 *                  ```
 * - Alternative: ~~~python
 *                def hello():
 *                    print("world")
 *                ~~~
 *
 * @module ubumark/parser/code-block-parser
 */

import type { CodeBlockNode } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Code fence information
 */
interface CodeFence {
	type: 'backtick' | 'tilde'; // Fence type (``` or ~~~)
	length: number; // Number of characters (minimum 3)
	language?: string; // Optional language identifier
	lineIndex: number; // Line index in source
}

/**
 * Code block range information
 */
export interface CodeBlockRange {
	startIndex: number; // Index of opening fence
	endIndex: number; // Index of closing fence
	openFence: CodeFence; // Opening fence details
	closeFence?: CodeFence; // Closing fence details (undefined if unclosed)
}

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/**
 * Regex to match code fence opening line
 * Captures: fence characters (``` or ~~~) and optional language
 */
const CODE_FENCE_OPEN_REGEX = /^(`{3,}|~{3,})(\S*)(.*)$/;

/**
 * Regex to match closing fence
 * Must be same type and at least same length as opening
 */
const CODE_FENCE_CLOSE_REGEX = /^(`{3,}|~{3,})\s*$/;

/**
 * Regex to detect math placeholders (__MATH_N__)
 * These should be preserved in code blocks
 */
const MATH_PLACEHOLDER_REGEX = /__MATH_\d+__/;

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Check if a line is a code fence (opening or closing)
 *
 * @param line - Line to check
 * @returns true if line is a code fence, false otherwise
 *
 * @example
 * ```typescript
 * isCodeFence('```');           // true
 * isCodeFence('```typescript'); // true
 * isCodeFence('~~~');           // true
 * isCodeFence('~~');            // false (too short)
 * isCodeFence('Normal text');   // false
 * ```
 */
export function isCodeFence(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

/**
 * Parse a code fence line
 *
 * @param line - Line to parse
 * @param lineIndex - Line index in source
 * @returns CodeFence info or null if not a fence
 *
 * @example
 * ```typescript
 * parseCodeFence('```typescript', 0);
 * // { type: 'backtick', length: 3, language: 'typescript', lineIndex: 0 }
 *
 * parseCodeFence('~~~python', 5);
 * // { type: 'tilde', length: 3, language: 'python', lineIndex: 5 }
 *
 * parseCodeFence('```', 10);
 * // { type: 'backtick', length: 3, lineIndex: 10 }
 * ```
 */
function parseCodeFence(line: string, lineIndex: number): CodeFence | null {
	if (!line) return null; // Guard against undefined/null

	const match = line.match(CODE_FENCE_OPEN_REGEX);
	if (!match) return null;

	const [, fence, language, trailing] = match;

	// Determine fence type
	const type = fence.startsWith('`') ? 'backtick' : 'tilde';
	const length = fence.length;

	// Clean up language identifier - handle spaces in the full text after fence
	const fullLanguageText = (language + (trailing || '')).trim();
	const cleanLanguage = fullLanguageText || undefined;

	return {
		type,
		length,
		language: cleanLanguage,
		lineIndex
	};
}

/**
 * Check if a line is a valid closing fence for an opening fence
 *
 * @param line - Line to check
 * @param openFence - Opening fence to match against
 * @returns true if line closes the fence, false otherwise
 *
 * @example
 * ```typescript
 * const openFence = { type: 'backtick', length: 3 };
 * isClosingFence('```', openFence);    // true
 * isClosingFence('~~~', openFence);    // false (wrong type)
 * isClosingFence('``', openFence);     // false (too short)
 * isClosingFence('````', openFence);   // true (longer is ok)
 * ```
 */
function isClosingFence(line: string, openFence: CodeFence): boolean {
	const match = line.match(CODE_FENCE_CLOSE_REGEX);
	if (!match) return false;

	const [, fence] = match;
	const type = fence.startsWith('`') ? 'backtick' : 'tilde';

	// Must be same type and at least same length
	return type === openFence.type && fence.length >= openFence.length;
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Find all code blocks in an array of lines
 *
 * This function identifies fenced code blocks and returns their ranges.
 * Handles nested fences properly (inner fences are treated as content).
 *
 * @param lines - Array of all markdown lines
 * @returns Array of code block ranges
 *
 * @example
 * ```typescript
 * const lines = [
 *   'Some text',
 *   '```typescript',
 *   'const x = 1;',
 *   '```',
 *   'More text',
 *   '~~~python',
 *   'print("hello")',
 *   '~~~'
 * ];
 * const blocks = findCodeBlocks(lines);
 * // Returns: [{ startIndex: 1, endIndex: 3, ... }, { startIndex: 5, endIndex: 7, ... }]
 * ```
 */
export function findCodeBlocks(lines: string[]): CodeBlockRange[] {
	const blocks: CodeBlockRange[] = [];
	let currentBlock: CodeBlockRange | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (currentBlock === null) {
			// Looking for opening fence
			const fence = parseCodeFence(line, i);
			if (fence) {
				currentBlock = {
					startIndex: i,
					endIndex: i, // Will be updated when closed
					openFence: fence
				};
			}
		} else {
			// Looking for closing fence
			if (isClosingFence(line, currentBlock.openFence)) {
				currentBlock.endIndex = i;
				currentBlock.closeFence = parseCodeFence(line, i) || undefined;
				blocks.push(currentBlock);
				currentBlock = null;
			}
			// Note: Inner fences are ignored - they are treated as content
		}
	}

	// Handle unclosed block
	if (currentBlock !== null) {
		// Set end to last line of document
		currentBlock.endIndex = lines.length - 1;
		blocks.push(currentBlock);
	}

	return blocks;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse a code block from lines
 *
 * This function takes a range of lines containing a fenced code block
 * and returns a CodeBlockNode. The content between fences is preserved
 * exactly as-is, including whitespace and special characters.
 *
 * @param lines - Array of all markdown lines
 * @param startIndex - Index of opening fence
 * @param endIndex - Index of closing fence (or end of lines if unclosed)
 * @returns CodeBlockNode or null if invalid
 *
 * @example
 * ```typescript
 * const lines = [
 *   '```typescript',
 *   'const x = 1;',
 *   'const y = 2;',
 *   '```'
 * ];
 * const node = parseCodeBlock(lines, 0);
 * // Returns: {
 * //   type: 'code-block',
 * //   code: 'const x = 1;\nconst y = 2;',
 * //   language: 'typescript'
 * // }
 * ```
 */
export function parseCodeBlock(
	lines: string[],
	startIndex: number,
	endIndex?: number
): CodeBlockNode | null {
	// Validate indices
	if (startIndex < 0 || startIndex >= lines.length) {
		return null;
	}

	// Parse opening fence
	const openFence = parseCodeFence(lines[startIndex], startIndex);
	if (!openFence) {
		return null;
	}

	// Determine actual end index
	const actualEndIndex = endIndex ?? lines.length - 1;

	// Check if block is closed
	let isClosed = false;
	if (actualEndIndex > startIndex && actualEndIndex < lines.length) {
		isClosed = isClosingFence(lines[actualEndIndex], openFence);
	}

	// Extract code content (between fences)
	const contentStartIndex = startIndex + 1;
	const contentEndIndex = isClosed ? actualEndIndex - 1 : actualEndIndex;

	// Handle empty code blocks
	if (contentStartIndex > contentEndIndex) {
		return {
			type: 'code-block',
			code: '',
			language: openFence.language
		};
	}

	// Extract and join content lines
	const contentLines = lines.slice(contentStartIndex, contentEndIndex + 1);
	const code = contentLines.join('\n');

	return {
		type: 'code-block',
		code,
		language: openFence.language
	};
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Check if code contains math placeholders
 *
 * Math placeholders (__MATH_N__) should be preserved in code blocks
 * and not replaced with actual math expressions.
 *
 * @param code - Code content to check
 * @returns true if contains math placeholders
 *
 * @example
 * ```typescript
 * containsMathPlaceholders('const formula = __MATH_0__;');  // true
 * containsMathPlaceholders('console.log("hello");');         // false
 * ```
 */
export function containsMathPlaceholders(code: string): boolean {
	return MATH_PLACEHOLDER_REGEX.test(code);
}

/**
 * Extract language from a code fence line
 *
 * @param line - Code fence line
 * @returns Language identifier or undefined
 *
 * @example
 * ```typescript
 * extractLanguage('```typescript');  // 'typescript'
 * extractLanguage('~~~python');      // 'python'
 * extractLanguage('```');            // undefined
 * extractLanguage('``` js ');        // 'js'
 * ```
 */
export function extractLanguage(line: string): string | undefined {
	const fence = parseCodeFence(line, 0);
	return fence?.language;
}

/**
 * Check if a code block is properly closed
 *
 * @param lines - Array of lines
 * @param startIndex - Index of opening fence
 * @returns true if block is closed, false if unclosed
 *
 * @example
 * ```typescript
 * const lines1 = ['```', 'code', '```'];
 * isCodeBlockClosed(lines1, 0);  // true
 *
 * const lines2 = ['```', 'code'];
 * isCodeBlockClosed(lines2, 0);  // false
 * ```
 */
export function isCodeBlockClosed(lines: string[], startIndex: number): boolean {
	const openFence = parseCodeFence(lines[startIndex], startIndex);
	if (!openFence) return false;

	for (let i = startIndex + 1; i < lines.length; i++) {
		if (isClosingFence(lines[i], openFence)) {
			return true;
		}
	}

	return false;
}

/**
 * Count lines of code in a code block (excluding fences)
 *
 * @param node - CodeBlockNode to analyze
 * @returns Number of lines
 *
 * @example
 * ```typescript
 * const node = {
 *   type: 'code-block',
 *   code: 'line1\nline2\nline3'
 * };
 * countCodeLines(node);  // 3
 * ```
 */
export function countCodeLines(node: CodeBlockNode): number {
	if (!node.code) return 0;
	return node.code.split('\n').length;
}

/**
 * Get fence style for a code block
 *
 * Useful for consistent formatting when modifying code blocks.
 *
 * @param lines - Array of lines
 * @param startIndex - Index of opening fence
 * @returns 'backtick' | 'tilde' | null
 *
 * @example
 * ```typescript
 * const lines1 = ['```typescript', 'code', '```'];
 * getFenceStyle(lines1, 0);  // 'backtick'
 *
 * const lines2 = ['~~~python', 'code', '~~~'];
 * getFenceStyle(lines2, 0);  // 'tilde'
 * ```
 */
export function getFenceStyle(lines: string[], startIndex: number): 'backtick' | 'tilde' | null {
	if (startIndex < 0 || startIndex >= lines.length) {
		return null;
	}
	const fence = parseCodeFence(lines[startIndex], startIndex);
	return fence?.type || null;
}
