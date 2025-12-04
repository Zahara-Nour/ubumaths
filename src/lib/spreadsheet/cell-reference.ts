/**
 * Cell Reference Utilities - Functions for parsing and manipulating cell references
 *
 * This module provides utilities for working with spreadsheet cell references:
 * - Parsing cell references (A1, B2, Z20) to/from coordinates
 * - Parsing range references (A1:B10)
 * - Converting between column letters and indices
 * - Validating cell references
 * - Expanding ranges to cell lists
 *
 * @module spreadsheet/cell-reference
 */

import type { CellRef, CellRange } from './types';
import { MAX_ROWS, MAX_COLS } from './types';

// =============================================================================
// Regular Expression Patterns
// =============================================================================

/**
 * Regular expression for matching cell references
 *
 * Matches: A1, B2, Z20, AA1, AB10 (up to ZZ20)
 * Format: [A-Z]{1,2}[1-9][0-9]?
 */
export const CELL_REF_PATTERN = /^([A-Z]{1,2})([1-9][0-9]?)$/;

/**
 * Regular expression for matching range references
 *
 * Matches: A1:B10, C5:D20, A1:A10, etc.
 * Format: [A-Z]{1,2}[1-9][0-9]?:[A-Z]{1,2}[1-9][0-9]?
 */
export const RANGE_PATTERN = /^([A-Z]{1,2})([1-9][0-9]?):([A-Z]{1,2})([1-9][0-9]?)$/;

// =============================================================================
// Column Letter Conversion
// =============================================================================

/**
 * Convert column index to letter(s)
 *
 * Examples:
 * - 0 → "A"
 * - 25 → "Z"
 * - 26 → "AA"
 * - 27 → "AB"
 *
 * @param col - Column index (0-indexed)
 * @returns Column letter(s) (uppercase)
 */
export function colToLetter(col: number): string {
	// Validate input
	if (col < 0 || col >= MAX_COLS) {
		throw new Error(`Column index out of bounds: ${col} (max ${MAX_COLS - 1})`);
	}

	// For 0-25 (A-Z), simple conversion
	if (col < 26) {
		return String.fromCharCode(65 + col);
	}

	// For 26+ (AA-ZZ), two-letter system
	const firstLetter = Math.floor(col / 26) - 1;
	const secondLetter = col % 26;
	return String.fromCharCode(65 + firstLetter) + String.fromCharCode(65 + secondLetter);
}

/**
 * Convert column letter(s) to index
 *
 * Examples:
 * - "A" → 0
 * - "Z" → 25
 * - "AA" → 26
 * - "AB" → 27
 *
 * @param letter - Column letter(s) (case-insensitive)
 * @returns Column index (0-indexed), or -1 if invalid
 */
export function letterToCol(letter: string): number {
	// Normalize to uppercase
	const upper = letter.toUpperCase();

	// Validate input
	if (!/^[A-Z]{1,2}$/.test(upper)) {
		return -1;
	}

	// Single letter (A-Z)
	if (upper.length === 1) {
		return upper.charCodeAt(0) - 65;
	}

	// Two letters (AA-ZZ)
	const firstChar = upper.charCodeAt(0) - 65;
	const secondChar = upper.charCodeAt(1) - 65;
	return (firstChar + 1) * 26 + secondChar;
}

// =============================================================================
// Cell Reference Parsing
// =============================================================================

/**
 * Parse a cell reference string to coordinates
 *
 * Examples:
 * - "A1" → { col: 0, row: 0 }
 * - "B2" → { col: 1, row: 1 }
 * - "Z20" → { col: 25, row: 19 }
 * - "AA1" → { col: 26, row: 0 }
 *
 * @param ref - Cell reference string (e.g., "A1", "B2")
 * @returns Parsed cell reference, or null if invalid
 */
export function parseCellRef(ref: string): CellRef | null {
	// Normalize to uppercase
	const upper = ref.toUpperCase();

	// Match against pattern
	const match = upper.match(CELL_REF_PATTERN);
	if (!match) {
		return null;
	}

	// Extract column letter(s) and row number
	const colLetter = match[1];
	const rowStr = match[2];

	// Convert column letter to index
	const col = letterToCol(colLetter);
	if (col < 0 || col >= MAX_COLS) {
		return null;
	}

	// Convert row string to index (1-indexed to 0-indexed)
	const row = parseInt(rowStr, 10) - 1;
	if (row < 0 || row >= MAX_ROWS) {
		return null;
	}

	return { col, row };
}

/**
 * Parse a range reference string to coordinates
 *
 * Examples:
 * - "A1:B10" → { start: { col: 0, row: 0 }, end: { col: 1, row: 9 } }
 * - "C5:D20" → { start: { col: 2, row: 4 }, end: { col: 3, row: 19 } }
 *
 * @param range - Range reference string (e.g., "A1:B10")
 * @returns Parsed range reference, or null if invalid
 */
export function parseRange(range: string): CellRange | null {
	// Normalize to uppercase
	const upper = range.toUpperCase();

	// Match against pattern
	const match = upper.match(RANGE_PATTERN);
	if (!match) {
		return null;
	}

	// Extract start and end references
	const startColLetter = match[1];
	const startRowStr = match[2];
	const endColLetter = match[3];
	const endRowStr = match[4];

	// Parse start cell
	const startCol = letterToCol(startColLetter);
	const startRow = parseInt(startRowStr, 10) - 1;
	if (startCol < 0 || startCol >= MAX_COLS || startRow < 0 || startRow >= MAX_ROWS) {
		return null;
	}

	// Parse end cell
	const endCol = letterToCol(endColLetter);
	const endRow = parseInt(endRowStr, 10) - 1;
	if (endCol < 0 || endCol >= MAX_COLS || endRow < 0 || endRow >= MAX_ROWS) {
		return null;
	}

	return {
		start: { col: startCol, row: startRow },
		end: { col: endCol, row: endRow }
	};
}

// =============================================================================
// Cell Reference Formatting
// =============================================================================

/**
 * Format a cell reference to string
 *
 * Examples:
 * - { col: 0, row: 0 } → "A1"
 * - { col: 1, row: 1 } → "B2"
 * - { col: 25, row: 19 } → "Z20"
 * - { col: 26, row: 0 } → "AA1"
 *
 * @param ref - Cell reference coordinates
 * @returns Formatted cell reference string
 */
export function formatCellRef(ref: CellRef): string {
	const colLetter = colToLetter(ref.col);
	const rowNumber = ref.row + 1; // Convert to 1-indexed
	return `${colLetter}${rowNumber}`;
}

/**
 * Format a range reference to string
 *
 * Examples:
 * - { start: { col: 0, row: 0 }, end: { col: 1, row: 9 } } → "A1:B10"
 *
 * @param range - Range reference coordinates
 * @returns Formatted range reference string
 */
export function formatRange(range: CellRange): string {
	const startRef = formatCellRef(range.start);
	const endRef = formatCellRef(range.end);
	return `${startRef}:${endRef}`;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a cell reference is within bounds
 *
 * @param ref - Cell reference to validate
 * @param maxRows - Maximum number of rows (default: MAX_ROWS)
 * @param maxCols - Maximum number of columns (default: MAX_COLS)
 * @returns true if valid, false otherwise
 */
export function isValidCellRef(
	ref: CellRef,
	maxRows: number = MAX_ROWS,
	maxCols: number = MAX_COLS
): boolean {
	return ref.col >= 0 && ref.col < maxCols && ref.row >= 0 && ref.row < maxRows;
}

/**
 * Validate that a range reference is within bounds
 *
 * @param range - Range reference to validate
 * @param maxRows - Maximum number of rows (default: MAX_ROWS)
 * @param maxCols - Maximum number of columns (default: MAX_COLS)
 * @returns true if valid, false otherwise
 */
export function isValidRange(
	range: CellRange,
	maxRows: number = MAX_ROWS,
	maxCols: number = MAX_COLS
): boolean {
	return (
		isValidCellRef(range.start, maxRows, maxCols) && isValidCellRef(range.end, maxRows, maxCols)
	);
}

// =============================================================================
// Range Expansion
// =============================================================================

/**
 * Expand a range to a list of cell references
 *
 * Returns all cells in the rectangular region defined by the range,
 * ordered row by row, left to right.
 *
 * Example:
 * - Range A1:B2 expands to [A1, B1, A2, B2]
 *
 * Note: The range is normalized so that start is top-left and end is bottom-right.
 *
 * @param range - Range to expand
 * @returns Array of cell references in the range
 */
export function expandRange(range: CellRange): CellRef[] {
	// Normalize range (ensure start is top-left, end is bottom-right)
	const startCol = Math.min(range.start.col, range.end.col);
	const endCol = Math.max(range.start.col, range.end.col);
	const startRow = Math.min(range.start.row, range.end.row);
	const endRow = Math.max(range.start.row, range.end.row);

	// Expand to list of cells
	const cells: CellRef[] = [];
	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			cells.push({ col, row });
		}
	}

	return cells;
}

/**
 * Get the number of cells in a range
 *
 * @param range - Range to count
 * @returns Number of cells in the range
 */
export function getRangeSize(range: CellRange): number {
	const width = Math.abs(range.end.col - range.start.col) + 1;
	const height = Math.abs(range.end.row - range.start.row) + 1;
	return width * height;
}

/**
 * Check if a cell is within a range
 *
 * @param cell - Cell to check
 * @param range - Range to check against
 * @returns true if cell is in range, false otherwise
 */
export function isCellInRange(cell: CellRef, range: CellRange): boolean {
	const startCol = Math.min(range.start.col, range.end.col);
	const endCol = Math.max(range.start.col, range.end.col);
	const startRow = Math.min(range.start.row, range.end.row);
	const endRow = Math.max(range.start.row, range.end.row);

	return cell.col >= startCol && cell.col <= endCol && cell.row >= startRow && cell.row <= endRow;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string looks like a cell reference (basic validation)
 *
 * @param str - String to test
 * @returns true if it matches the cell reference pattern
 */
export function isCellRefString(str: string): boolean {
	return CELL_REF_PATTERN.test(str.toUpperCase());
}

/**
 * Check if a string looks like a range reference (basic validation)
 *
 * @param str - String to test
 * @returns true if it matches the range reference pattern
 */
export function isRangeString(str: string): boolean {
	return RANGE_PATTERN.test(str.toUpperCase());
}
