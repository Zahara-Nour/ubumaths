/**
 * Spreadsheet Types - Type definitions for the spreadsheet calculator
 *
 * This module defines the core types for representing spreadsheet data,
 * cell formatting, computed values, and error handling. The spreadsheet
 * supports a 20x20 grid with formulas, formatting, and persistence.
 *
 * @module spreadsheet/types
 */

import { z } from 'zod';

// =============================================================================
// Current Version
// =============================================================================

/**
 * Current version of the spreadsheet data schema
 * Increment when making breaking changes to the data structure
 */
export const SPREADSHEET_VERSION = 1;

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of rows in a spreadsheet
 */
export const MAX_ROWS = 20;

/**
 * Maximum number of columns in a spreadsheet
 */
export const MAX_COLS = 20;

/**
 * Maximum cell value length (characters)
 */
export const MAX_CELL_VALUE_LENGTH = 5000;

// =============================================================================
// Cell Format Types
// =============================================================================

/**
 * Text alignment options for cells
 */
export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;

/**
 * Type for text alignment
 */
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

/**
 * Number format options for cells
 */
export const NUMBER_FORMATS = ['number', 'percent', 'currency'] as const;

/**
 * Type for number formats
 */
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

/**
 * Visual formatting options for a cell
 *
 * All formatting is optional and additive. Missing properties
 * use default rendering.
 */
export interface CellFormat {
	/** Bold text */
	readonly bold?: boolean;
	/** Italic text */
	readonly italic?: boolean;
	/** Text color (hex format: #rrggbb) */
	readonly textColor?: string;
	/** Background color (hex format: #rrggbb) */
	readonly bgColor?: string;
	/** Text alignment */
	readonly align?: TextAlignment;
	/** Number display format */
	readonly numberFormat?: NumberFormat;
}

// =============================================================================
// Cell Data Types
// =============================================================================

/**
 * Complete data for a single cell
 *
 * Contains the raw value (string or formula) and optional formatting.
 * The value is either:
 * - A plain value: "42", "Hello", "true"
 * - A formula starting with "=": "=A1+B1", "=SOMME(A1:A10)"
 */
export interface CellData {
	/** Raw value or formula (with leading "=" for formulas) */
	readonly value: string;
	/** Optional visual formatting */
	readonly format?: CellFormat;
}

// =============================================================================
// Computed Value Types
// =============================================================================

/**
 * Standard spreadsheet error codes
 *
 * - #REF!   : Invalid cell reference (out of bounds, circular)
 * - #DIV/0! : Division by zero
 * - #VALUE! : Wrong value type (e.g., string in numeric operation)
 * - #NAME?  : Unknown function name
 * - #CIRC!  : Circular reference detected
 * - #NUM!   : Invalid numeric result (overflow, domain error)
 */
export const ERROR_CODES = ['#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#CIRC!', '#NUM!'] as const;

/**
 * Type for error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Result of evaluating a cell's value or formula
 *
 * This is a discriminated union representing all possible cell states:
 * - number: Successfully evaluated to a number
 * - string: Plain text or string result
 * - boolean: Boolean result (from comparisons)
 * - error: Evaluation failed with an error code
 * - empty: No value in cell
 */
export type ComputedValue =
	| { readonly type: 'number'; readonly value: number }
	| { readonly type: 'string'; readonly value: string }
	| { readonly type: 'boolean'; readonly value: boolean }
	| { readonly type: 'error'; readonly code: ErrorCode; readonly message: string }
	| { readonly type: 'empty' };

// =============================================================================
// Cell Reference Types
// =============================================================================

/**
 * A parsed cell reference (e.g., "A1", "Z20")
 *
 * Uses 0-indexed coordinates:
 * - A1 → { col: 0, row: 0 }
 * - B2 → { col: 1, row: 1 }
 * - Z20 → { col: 25, row: 19 }
 */
export interface CellRef {
	/** Column index (0-indexed, A=0, B=1, ..., Z=25) */
	readonly col: number;
	/** Row index (0-indexed) */
	readonly row: number;
}

/**
 * A parsed range reference (e.g., "A1:B10")
 *
 * Represents a rectangular range of cells. The start and end
 * references define opposite corners of the rectangle.
 */
export interface CellRange {
	/** Top-left cell (or any corner) */
	readonly start: CellRef;
	/** Bottom-right cell (or opposite corner) */
	readonly end: CellRef;
}

// =============================================================================
// Spreadsheet Data Types
// =============================================================================

/**
 * Metadata about the spreadsheet
 */
export interface SpreadsheetMetadata {
	/** User-visible name of the spreadsheet */
	readonly name: string;
	/** Number of rows (max 20) */
	readonly rows: number;
	/** Number of columns (max 20) */
	readonly cols: number;
	/** Optional description */
	readonly description?: string;
}

/**
 * Complete spreadsheet data structure for persistence
 *
 * This structure is designed to be:
 * - Versionable for migration support
 * - JSON-serializable for database storage
 * - Sparse: only stores non-empty cells
 *
 * The cells map uses cell references as keys (e.g., "A1", "B2")
 * and only includes cells with data. Empty cells are not stored.
 */
export interface SpreadsheetData {
	/** Schema version for migration support */
	readonly version: number;
	/** Sparse map of cell data (only non-empty cells) */
	readonly cells: Record<string, CellData>;
	/** Spreadsheet metadata */
	readonly metadata: SpreadsheetMetadata;
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Hex color regex pattern (#rrggbb or #rgb)
 */
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Zod schema for text alignment validation
 */
const textAlignmentSchema = z.enum(TEXT_ALIGNMENTS);

/**
 * Zod schema for number format validation
 */
const numberFormatSchema = z.enum(NUMBER_FORMATS);

/**
 * Zod schema for cell format validation
 */
export const cellFormatSchema = z
	.object({
		bold: z.boolean().optional(),
		italic: z.boolean().optional(),
		textColor: z
			.string()
			.regex(HEX_COLOR_PATTERN, 'Text color must be a valid hex color')
			.optional(),
		bgColor: z
			.string()
			.regex(HEX_COLOR_PATTERN, 'Background color must be a valid hex color')
			.optional(),
		align: textAlignmentSchema.optional(),
		numberFormat: numberFormatSchema.optional()
	})
	.strict();

/**
 * Zod schema for cell data validation
 */
export const cellDataSchema = z
	.object({
		value: z
			.string()
			.max(MAX_CELL_VALUE_LENGTH, `Cell value too long (max ${MAX_CELL_VALUE_LENGTH} chars)`),
		format: cellFormatSchema.optional()
	})
	.strict();

/**
 * Zod schema for cell reference validation
 *
 * Cell references use standard spreadsheet notation:
 * - Column: A-Z (uppercase)
 * - Row: 1-20
 * - Examples: A1, B2, Z20
 */
const CELL_REF_REGEX = /^[A-Z]{1,2}(?:[1-9]|1[0-9]|20)$/;

/**
 * Zod schema for validating a cell reference string
 */
export const cellRefStringSchema = z
	.string()
	.regex(CELL_REF_REGEX, 'Invalid cell reference (expected format: A1-Z20)');

/**
 * Zod schema for validating a range reference string
 *
 * Range references have the format: start:end
 * - Examples: A1:B10, C5:D20, A1:A10
 */
const RANGE_REF_REGEX = /^[A-Z]{1,2}(?:[1-9]|1[0-9]|20):[A-Z]{1,2}(?:[1-9]|1[0-9]|20)$/;

/**
 * Zod schema for validating a range reference string
 */
export const rangeRefStringSchema = z
	.string()
	.regex(RANGE_REF_REGEX, 'Invalid range reference (expected format: A1:B10)');

/**
 * Zod schema for spreadsheet metadata validation
 */
export const spreadsheetMetadataSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Spreadsheet name is required')
			.max(100, 'Name too long (max 100 chars)'),
		rows: z
			.number()
			.int('Rows must be an integer')
			.min(1, 'Minimum 1 row')
			.max(MAX_ROWS, `Maximum ${MAX_ROWS} rows`),
		cols: z
			.number()
			.int('Columns must be an integer')
			.min(1, 'Minimum 1 column')
			.max(MAX_COLS, `Maximum ${MAX_COLS} columns`),
		description: z.string().max(500, 'Description too long (max 500 chars)').optional()
	})
	.strict();

/**
 * Zod schema for complete spreadsheet data validation
 *
 * Validates:
 * - Version matches current version
 * - Cells map contains valid cell data
 * - Metadata is valid
 * - Cell references in cells map are valid
 */
export const spreadsheetDataSchema = z
	.object({
		version: z
			.number()
			.int('Version must be an integer')
			.min(1, 'Version must be at least 1')
			.max(SPREADSHEET_VERSION, `Unsupported version (max ${SPREADSHEET_VERSION})`),
		cells: z.record(cellRefStringSchema, cellDataSchema),
		metadata: spreadsheetMetadataSchema
	})
	.strict();

// =============================================================================
// Type Inference from Schemas
// =============================================================================

/** Inferred type from cellFormatSchema */
export type CellFormatInput = z.infer<typeof cellFormatSchema>;

/** Inferred type from cellDataSchema */
export type CellDataInput = z.infer<typeof cellDataSchema>;

/** Inferred type from spreadsheetMetadataSchema */
export type SpreadsheetMetadataInput = z.infer<typeof spreadsheetMetadataSchema>;

/** Inferred type from spreadsheetDataSchema */
export type SpreadsheetDataInput = z.infer<typeof spreadsheetDataSchema>;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty spreadsheet with default settings
 *
 * @param name - Optional name for the spreadsheet (defaults to 'Sans titre')
 * @returns A new SpreadsheetData object with no cells
 *
 * @example
 * const sheet = createEmptySpreadsheet();
 * const namedSheet = createEmptySpreadsheet('Budget 2024');
 */
export function createEmptySpreadsheet(name = 'Sans titre'): SpreadsheetData {
	return {
		version: SPREADSHEET_VERSION,
		cells: {},
		metadata: {
			name,
			rows: MAX_ROWS,
			cols: MAX_COLS
		}
	};
}
