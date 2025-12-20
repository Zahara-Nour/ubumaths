/**
 * Table Parser - Parse GitHub Flavored Markdown Tables
 * =====================================================
 *
 * This module parses GFM-style markdown tables with support for:
 * - Header row
 * - Alignment specification (:---, :---:, ---:)
 * - Multiple data rows
 * - Cells containing inline markdown (text, math placeholders, etc.)
 *
 * Standard GFM table format:
 * ```
 * | Header 1 | Header 2 | Header 3 |
 * |----------|:--------:|---------:|
 * | Cell 1   | Cell 2   | Cell 3   |
 * | Cell 4   | Cell 5   | Cell 6   |
 * ```
 *
 * @module custom-markdown/parser/table-parser
 */

import type { TableNode, TableCellNode } from '../types';

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/**
 * Regex to detect table rows
 * Matches lines starting with | and containing at least one more |
 */
const TABLE_ROW_REGEX = /^\s*\|(.+)\|\s*$/;

/**
 * Regex to detect alignment row
 * Matches lines like |---|:---:|---:|
 */
const ALIGNMENT_ROW_REGEX = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;

// ============================================================================
// TABLE DETECTION
// ============================================================================

/**
 * Check if a line is a table row
 *
 * @param line - Line to check
 * @returns true if line looks like a table row
 */
export function isTableRow(line: string): boolean {
	return TABLE_ROW_REGEX.test(line);
}

/**
 * Check if a line is an alignment row (separator row)
 *
 * @param line - Line to check
 * @returns true if line is an alignment row
 */
export function isAlignmentRow(line: string): boolean {
	return ALIGNMENT_ROW_REGEX.test(line);
}

/**
 * Check if a sequence of lines forms a valid table
 *
 * A valid table must have:
 * 1. Header row
 * 2. Alignment row
 * 3. At least one data row (optional in some cases)
 *
 * @param lines - Lines to check (must be consecutive)
 * @returns true if lines form a valid table
 */
export function isValidTable(lines: string[]): boolean {
	if (lines.length < 2) return false;

	// First line must be a table row (header)
	if (!isTableRow(lines[0])) return false;

	// Second line must be alignment row
	if (!isAlignmentRow(lines[1])) return false;

	// All subsequent lines must be table rows
	for (let i = 2; i < lines.length; i++) {
		if (!isTableRow(lines[i])) return false;
	}

	return true;
}

// ============================================================================
// ALIGNMENT PARSING
// ============================================================================

/**
 * Parse alignment from a cell in the alignment row
 *
 * Alignment rules:
 * - `:---` or `:--` → left
 * - `:---:` or `:--:` → center
 * - `---:` or `--:` → right
 * - `---` or `--` → left (default)
 *
 * @param alignCell - Alignment cell content (e.g., ':---:', '---:', etc.)
 * @returns Alignment value
 */
function parseAlignment(alignCell: string): 'left' | 'center' | 'right' {
	const trimmed = alignCell.trim();

	const hasLeft = trimmed.startsWith(':');
	const hasRight = trimmed.endsWith(':');

	if (hasLeft && hasRight) return 'center';
	if (hasRight) return 'right';
	return 'left'; // Default or explicit left
}

/**
 * Parse alignment row to extract alignments for all columns
 *
 * @param line - Alignment row line
 * @returns Array of alignments for each column
 */
function parseAlignmentRow(line: string): ('left' | 'center' | 'right')[] {
	// Extract content between outer pipes
	const match = line.match(TABLE_ROW_REGEX);
	if (!match) return [];

	// Split by | and parse each cell
	const cells = match[1].split('|').map((cell) => cell.trim());

	return cells.map(parseAlignment);
}

// ============================================================================
// CELL PARSING
// ============================================================================

/**
 * Parse a table row into cells
 *
 * @param line - Table row line
 * @returns Array of cell content strings
 */
function parseTableRow(line: string): string[] {
	const match = line.match(TABLE_ROW_REGEX);
	if (!match) return [];

	// Split by | and trim whitespace
	return match[1].split('|').map((cell) => cell.trim());
}

/**
 * Create table cell nodes from content strings and alignments
 *
 * @param contents - Array of cell content strings
 * @param alignments - Array of alignments (must match length of contents)
 * @returns Array of TableCellNode objects
 */
function createCellNodes(
	contents: string[],
	alignments: ('left' | 'center' | 'right')[]
): TableCellNode[] {
	return contents.map((content, index) => ({
		content,
		align: alignments[index] || 'left'
	}));
}

// ============================================================================
// TABLE PARSING
// ============================================================================

/**
 * Parse a table from consecutive lines
 *
 * Expected format:
 * ```
 * Line 0: | Header 1 | Header 2 | ... |
 * Line 1: |----------|:--------:| ... |
 * Line 2+: | Cell 1   | Cell 2   | ... |
 * ```
 *
 * @param lines - Array of table lines (must be a valid table)
 * @returns TableNode AST node or null if invalid
 *
 * @example
 * const lines = [
 *   '| x | f(x) |',
 *   '|---|------|',
 *   '| 0 | 0    |',
 *   '| 1 | 2    |'
 * ];
 * const table = parseTable(lines);
 */
export function parseTable(lines: string[]): TableNode | null {
	if (!isValidTable(lines)) {
		return null;
	}

	// Parse alignment row (line 1)
	const alignments = parseAlignmentRow(lines[1]);

	if (alignments.length === 0) {
		return null; // Invalid alignment row
	}

	// Parse header row (line 0)
	const headerContents = parseTableRow(lines[0]);
	if (headerContents.length !== alignments.length) {
		// Column count mismatch, try to fix by padding
		while (headerContents.length < alignments.length) {
			headerContents.push('');
		}
		headerContents.length = alignments.length; // Truncate if too many
	}

	const header = createCellNodes(headerContents, alignments);

	// Parse data rows (lines 2+)
	const rows: TableCellNode[][] = [];
	for (let i = 2; i < lines.length; i++) {
		const rowContents = parseTableRow(lines[i]);

		// Fix column count mismatches
		while (rowContents.length < alignments.length) {
			rowContents.push('');
		}
		rowContents.length = alignments.length;

		rows.push(createCellNodes(rowContents, alignments));
	}

	return {
		type: 'table',
		header,
		rows,
		alignments
	};
}

// ============================================================================
// TABLE EXTRACTION
// ============================================================================

/**
 * Find all table blocks in an array of lines
 *
 * Returns the line index ranges of each table.
 *
 * @param lines - Array of markdown lines
 * @returns Array of [startIndex, endIndex] pairs for each table
 *
 * @example
 * const lines = [
 *   'Some text',
 *   '| h1 | h2 |',
 *   '|----|-----|',
 *   '| c1 | c2 |',
 *   '',
 *   'More text',
 *   '| h3 | h4 |',
 *   '|----|-----|',
 *   '| c3 | c4 |'
 * ];
 * const blocks = findTableBlocks(lines);
 * // Returns: [[1, 3], [6, 8]]
 */
export function findTableBlocks(lines: string[]): [number, number][] {
	const blocks: [number, number][] = [];

	let i = 0;
	while (i < lines.length) {
		// Look for potential table start (header + alignment row)
		if (i + 1 < lines.length && isTableRow(lines[i]) && isAlignmentRow(lines[i + 1])) {
			const start = i;

			// Find end of table
			let end = i + 1; // At least include alignment row
			for (let j = i + 2; j < lines.length; j++) {
				if (isTableRow(lines[j])) {
					end = j;
				} else {
					break; // Stop at first non-table line
				}
			}

			blocks.push([start, end]);
			i = end + 1;
		} else {
			i++;
		}
	}

	return blocks;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the number of columns in a table
 *
 * @param table - TableNode to check
 * @returns Number of columns
 */
export function getColumnCount(table: TableNode): number {
	return table.header.length;
}

/**
 * Get the number of rows in a table (excluding header)
 *
 * @param table - TableNode to check
 * @returns Number of data rows
 */
export function getRowCount(table: TableNode): number {
	return table.rows.length;
}

/**
 * Get a specific cell value from a table
 *
 * @param table - TableNode to query
 * @param row - Row index (0 = first data row, -1 = header)
 * @param col - Column index
 * @returns Cell content or null if out of bounds
 */
export function getCellValue(table: TableNode, row: number, col: number): string | null {
	if (col < 0 || col >= table.header.length) {
		return null;
	}

	if (row === -1) {
		// Header row
		return table.header[col].content;
	}

	if (row < 0 || row >= table.rows.length) {
		return null;
	}

	return table.rows[row][col].content;
}

/**
 * Convert table to a 2D array of strings (for easy manipulation)
 *
 * Includes header row as first row.
 *
 * @param table - TableNode to convert
 * @returns 2D array where array[row][col] is the cell content
 */
export function tableToArray(table: TableNode): string[][] {
	const result: string[][] = [];

	// Add header
	result.push(table.header.map((cell) => cell.content));

	// Add data rows
	for (const row of table.rows) {
		result.push(row.map((cell) => cell.content));
	}

	return result;
}

/**
 * Check if a table is empty (no data rows)
 *
 * @param table - TableNode to check
 * @returns true if table has no data rows
 */
export function isEmptyTable(table: TableNode): boolean {
	return table.rows.length === 0;
}
