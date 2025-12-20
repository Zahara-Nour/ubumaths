/**
 * Blockquote Parser - Parse Markdown Blockquotes
 * ===============================================
 *
 * This module parses markdown blockquotes with support for:
 * - Single and multi-line blockquotes
 * - Nested blockquotes (>, >>, >>>, etc.)
 * - Blank lines within blockquotes (>)
 * - Mixed content (paragraphs, lists, etc. within blockquotes)
 *
 * Supported formats:
 * - Basic: > This is a blockquote
 * - Multi-line: > First line
 *               > Second line
 * - Nested: >> This is nested
 * - With blank: > First paragraph
 *               >
 *               > Second paragraph
 *
 * @module custom-markdown/parser/blockquote-parser
 */

import type { BlockquoteNode } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw blockquote line before processing
 */
interface RawBlockquoteLine {
	content: string; // Text content (without > markers)
	level: number; // Nesting level (1 for >, 2 for >>, etc.)
	originalLine: string; // Original line with markers
}

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/**
 * Regex to detect blockquote lines
 * Matches lines starting with one or more > characters
 */
const BLOCKQUOTE_REGEX = /^(\s*)(>+)(.*)$/;

/**
 * Simple regex to check if line starts with >
 * Used for quick detection
 */
const BLOCKQUOTE_START = /^\s*>/;

// ============================================================================
// BLOCKQUOTE DETECTION
// ============================================================================

/**
 * Check if a line is a blockquote line
 *
 * @param line - Line to check
 * @returns true if line starts with >, false otherwise
 *
 * @example
 * ```typescript
 * isBlockquoteLine('> Hello');        // true
 * isBlockquoteLine('>> Nested');      // true
 * isBlockquoteLine('Normal text');    // false
 * isBlockquoteLine('  > Indented');   // true
 * ```
 */
export function isBlockquoteLine(line: string): boolean {
	return BLOCKQUOTE_START.test(line);
}

/**
 * Parse a single blockquote line
 *
 * @param line - Line to parse
 * @returns Parsed line info or null if not a blockquote
 *
 * @example
 * ```typescript
 * parseBlockquoteLine('> Hello world');
 * // { content: ' Hello world', level: 1, originalLine: '> Hello world' }
 *
 * parseBlockquoteLine('>> Nested quote');
 * // { content: ' Nested quote', level: 2, originalLine: '>> Nested quote' }
 *
 * parseBlockquoteLine('>>>   Deep nesting');
 * // { content: '   Deep nesting', level: 3, originalLine: '>>>   Deep nesting' }
 * ```
 */
function parseBlockquoteLine(line: string): RawBlockquoteLine | null {
	const match = line.match(BLOCKQUOTE_REGEX);
	if (!match) return null;

	const [, , markers, content] = match;
	const level = markers.length;

	return {
		content, // Keep content as-is (including leading/trailing spaces)
		level,
		originalLine: line
	};
}

// ============================================================================
// BLOCKQUOTE EXTRACTION
// ============================================================================

/**
 * Find all blockquote blocks in an array of lines
 *
 * This function identifies consecutive blockquote lines and groups them
 * into separate blocks. A blockquote block ends when a non-blockquote
 * line is encountered.
 *
 * @param lines - Array of all markdown lines
 * @returns Array of line index ranges [start, end] for each blockquote block
 *
 * @example
 * ```typescript
 * const lines = [
 *   'Some text',
 *   '> Quote line 1',
 *   '> Quote line 2',
 *   '',
 *   'Normal text',
 *   '> Another quote',
 *   '>> Nested'
 * ];
 * const blocks = findBlockquoteBlocks(lines);
 * // Returns: [[1, 2], [5, 6]]
 * ```
 */
export function findBlockquoteBlocks(lines: string[]): [number, number][] {
	const blocks: [number, number][] = [];
	let blockStart: number | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (isBlockquoteLine(line)) {
			// Start new block if not in one
			if (blockStart === null) {
				blockStart = i;
			}
		} else if (blockStart !== null) {
			// End current block
			blocks.push([blockStart, i - 1]);
			blockStart = null;
		}
	}

	// Handle case where blockquote goes to end of document
	if (blockStart !== null) {
		blocks.push([blockStart, lines.length - 1]);
	}

	return blocks;
}

// ============================================================================
// BLOCKQUOTE PARSING
// ============================================================================

/**
 * Parse consecutive blockquote lines into a BlockquoteNode
 *
 * This function takes an array of blockquote lines and returns a
 * BlockquoteNode. The content within the blockquote is extracted
 * and returned as raw lines for further parsing by the main parser.
 *
 * Important: This parser only handles the blockquote structure itself.
 * The actual parsing of content (paragraphs, lists, etc.) within the
 * blockquote is delegated to the main parser through recursion.
 *
 * @param lines - Array of blockquote lines (must all start with >)
 * @returns BlockquoteNode with extracted content lines
 *
 * @example
 * ```typescript
 * const lines = [
 *   '> First paragraph',
 *   '>',
 *   '> Second paragraph',
 *   '>> Nested quote'
 * ];
 * const blockquote = parseBlockquote(lines);
 * // Returns BlockquoteNode with children to be parsed
 * ```
 */
export function parseBlockquote(lines: string[]): BlockquoteNode {
	if (lines.length === 0) {
		return {
			type: 'blockquote',
			children: []
		};
	}

	// Parse all lines to extract content
	const parsedLines = lines
		.map(parseBlockquoteLine)
		.filter((line): line is RawBlockquoteLine => line !== null);

	if (parsedLines.length === 0) {
		return {
			type: 'blockquote',
			children: []
		};
	}

	// Find the minimum level (base level of this blockquote)
	const minLevel = Math.min(...parsedLines.map((l) => l.level));

	// Extract content lines, removing the base level markers
	const contentLines: string[] = parsedLines.map((parsedLine) => {
		const extraMarkers = parsedLine.level - minLevel;
		if (extraMarkers > 0) {
			// Preserve nested markers
			return '>'.repeat(extraMarkers) + parsedLine.content;
		} else {
			// Remove the marker and preserve content
			// Trim only the leading space after > if present
			const content = parsedLine.content;
			if (content.startsWith(' ')) {
				return content.substring(1);
			}
			return content;
		}
	});

	// Return the blockquote node
	// The children will be populated by the main parser
	// by recursively parsing the contentLines
	return {
		type: 'blockquote',
		children: [],
		// Store content lines for main parser to process
		_contentLines: contentLines
	} as BlockquoteNode & { _contentLines: string[] };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract content lines from a blockquote block
 *
 * This utility function is used by the main parser to get the raw content
 * lines from a blockquote block that need to be recursively parsed.
 *
 * @param lines - Array of blockquote lines
 * @returns Array of content lines with blockquote markers removed
 *
 * @example
 * ```typescript
 * const lines = [
 *   '> # Heading',
 *   '> Some text',
 *   '>> Nested quote'
 * ];
 * const content = extractBlockquoteContent(lines);
 * // Returns: ['# Heading', 'Some text', '> Nested quote']
 * ```
 */
export function extractBlockquoteContent(lines: string[]): string[] {
	const parsed = parseBlockquote(lines);
	// Extract the temporary _contentLines property
	const node = parsed as BlockquoteNode & { _contentLines?: string[] };
	return node._contentLines || [];
}

/**
 * Get the nesting level of a blockquote line
 *
 * @param line - Line to check
 * @returns Nesting level (0 if not a blockquote, 1 for >, 2 for >>, etc.)
 *
 * @example
 * ```typescript
 * getBlockquoteLevel('> Text');     // 1
 * getBlockquoteLevel('>> Text');    // 2
 * getBlockquoteLevel('>>> Text');   // 3
 * getBlockquoteLevel('Normal');     // 0
 * ```
 */
export function getBlockquoteLevel(line: string): number {
	const parsed = parseBlockquoteLine(line);
	return parsed ? parsed.level : 0;
}

/**
 * Check if a blockquote block contains nested blockquotes
 *
 * @param lines - Array of blockquote lines
 * @returns true if there are nested blockquotes (>>, >>>, etc.)
 *
 * @example
 * ```typescript
 * hasNestedBlockquotes(['> Text', '> More']);      // false
 * hasNestedBlockquotes(['> Text', '>> Nested']);   // true
 * ```
 */
export function hasNestedBlockquotes(lines: string[]): boolean {
	const levels = lines.map(getBlockquoteLevel).filter((level) => level > 0);

	if (levels.length === 0) return false;

	const minLevel = Math.min(...levels);
	const maxLevel = Math.max(...levels);

	return maxLevel > minLevel;
}

/**
 * Normalize blockquote lines by removing unnecessary blank lines
 *
 * This function removes trailing blank blockquote lines (>) that don't
 * contribute to the structure, while preserving those that separate
 * content blocks within the blockquote.
 *
 * @param lines - Array of blockquote lines
 * @returns Normalized array of lines
 *
 * @example
 * ```typescript
 * const lines = [
 *   '> Text',
 *   '>',        // Preserved (separates content)
 *   '> More',
 *   '>',        // Removed (trailing blank)
 *   '>'         // Removed (trailing blank)
 * ];
 * const normalized = normalizeBlockquoteLines(lines);
 * // Returns: ['> Text', '>', '> More']
 * ```
 */
export function normalizeBlockquoteLines(lines: string[]): string[] {
	if (lines.length === 0) return [];

	// Remove trailing blank blockquote lines
	let endIndex = lines.length - 1;
	while (endIndex >= 0) {
		const parsed = parseBlockquoteLine(lines[endIndex]);
		if (parsed && parsed.content.trim() === '') {
			endIndex--;
		} else {
			break;
		}
	}

	return lines.slice(0, endIndex + 1);
}
