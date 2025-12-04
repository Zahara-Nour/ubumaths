/**
 * CSV Import/Export Utilities for Spreadsheet
 *
 * Provides comprehensive CSV parsing, generation, and file handling
 * for the spreadsheet calculator. Supports:
 * - Multiple delimiters (comma, semicolon, tab)
 * - Auto-detection of delimiter
 * - CSV escaping and quoted fields
 * - Header row handling
 * - Export formulas or computed values
 * - UTF-8 BOM for Excel compatibility
 *
 * @module spreadsheet/csv
 */

import type { SpreadsheetData, ComputedValue, CellData } from './types';
import { formatComputedValue } from './format';

// =============================================================================
// Types
// =============================================================================

/**
 * CSV delimiter types
 */
export type CsvDelimiter = ',' | ';' | '\t';

/**
 * CSV delimiter with auto-detection option
 */
export type CsvDelimiterOrAuto = CsvDelimiter | 'auto';

/**
 * Options for CSV export
 */
export interface CsvExportOptions {
	/** CSV delimiter (default: ',') */
	delimiter?: CsvDelimiter;
	/** Include column headers (A, B, C, ...) */
	includeHeaders?: boolean;
	/** Export raw formulas instead of computed values */
	exportFormulas?: boolean;
	/** Include UTF-8 BOM for Excel compatibility */
	encoding?: 'utf-8' | 'utf-8-bom';
}

/**
 * Options for CSV import
 */
export interface CsvImportOptions {
	/** CSV delimiter or 'auto' for detection (default: 'auto') */
	delimiter?: CsvDelimiterOrAuto;
	/** First row contains headers (to skip) */
	hasHeaders?: boolean;
	/** Skip empty rows during import */
	skipEmptyRows?: boolean;
}

/**
 * Result of CSV import operation
 */
export interface CsvImportResult {
	/** Whether import succeeded */
	success: boolean;
	/** Imported spreadsheet data (on success) */
	data?: SpreadsheetData;
	/** Error message (on failure) */
	error?: string;
	/** Number of data rows imported */
	rowCount?: number;
	/** Number of columns detected */
	colCount?: number;
}

// =============================================================================
// CSV Generation
// =============================================================================

/**
 * Generate CSV string from spreadsheet data
 *
 * Converts spreadsheet cells to CSV format, with support for:
 * - Formula export or computed values
 * - Column headers
 * - Proper CSV escaping
 * - UTF-8 BOM for Excel
 *
 * @param data - Spreadsheet data to export
 * @param computedValues - Map of computed cell values
 * @param options - Export options
 * @returns CSV string
 *
 * @example
 * const csv = generateCsv(data, computedMap, {
 *   delimiter: ';',
 *   includeHeaders: true,
 *   exportFormulas: false
 * });
 */
export function generateCsv(
	data: SpreadsheetData,
	computedValues: Map<string, ComputedValue>,
	options: CsvExportOptions = {}
): string {
	const {
		delimiter = ',',
		includeHeaders = true,
		exportFormulas = false,
		encoding = 'utf-8'
	} = options;

	const { rows, cols } = data.metadata;
	const lines: string[] = [];

	// Add BOM for Excel compatibility if requested
	const bom = encoding === 'utf-8-bom' ? '\ufeff' : '';

	// Column headers (A, B, C, ...)
	if (includeHeaders) {
		const headers = Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i));
		lines.push(headers.join(delimiter));
	}

	// Data rows
	for (let row = 0; row < rows; row++) {
		const rowData: string[] = [];

		for (let col = 0; col < cols; col++) {
			const ref = String.fromCharCode(65 + col) + (row + 1);
			const cell = data.cells[ref];

			let value = '';
			if (cell) {
				if (exportFormulas) {
					// Export raw formula/value
					value = cell.value;
				} else {
					// Export computed value
					const computed = computedValues.get(ref);
					value = computed ? formatComputedValue(computed, cell.format) : cell.value;
				}
			}

			// Escape value if it contains delimiter, quotes, or newlines
			if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
				value = '"' + value.replace(/"/g, '""') + '"';
			}

			rowData.push(value);
		}

		lines.push(rowData.join(delimiter));
	}

	return bom + lines.join('\n');
}

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse CSV string into spreadsheet data
 *
 * Supports:
 * - Auto-detection of delimiter
 * - Quoted fields with escaping
 * - Header row skipping
 * - Empty row filtering
 * - Automatic size limiting (20x20 max)
 *
 * @param csvContent - CSV string to parse
 * @param options - Import options
 * @returns Import result with success status and data
 *
 * @example
 * const result = parseCsv(csvString, {
 *   delimiter: 'auto',
 *   hasHeaders: true,
 *   skipEmptyRows: true
 * });
 *
 * if (result.success && result.data) {
 *   spreadsheetStore.importData(result.data);
 * }
 */
export function parseCsv(csvContent: string, options: CsvImportOptions = {}): CsvImportResult {
	const { delimiter = 'auto', hasHeaders = false, skipEmptyRows = true } = options;

	try {
		// Detect delimiter if auto
		const actualDelimiter = delimiter === 'auto' ? detectDelimiter(csvContent) : delimiter;

		// Remove BOM if present
		const content = csvContent.replace(/^\ufeff/, '');

		// Parse lines
		const lines = parseCSVLines(content, actualDelimiter);

		if (lines.length === 0) {
			return { success: false, error: 'Fichier CSV vide' };
		}

		// Skip header row if specified
		const dataLines = hasHeaders ? lines.slice(1) : lines;

		// Filter empty rows if specified
		const filteredLines = skipEmptyRows
			? dataLines.filter((line) => line.some((cell) => cell.trim() !== ''))
			: dataLines;

		// Determine dimensions (max 20x20)
		const rowCount = Math.min(filteredLines.length, 20);
		const colCount = Math.min(Math.max(...filteredLines.map((line) => line.length)), 20);

		// Build spreadsheet data
		const cells: Record<string, CellData> = {};

		for (let row = 0; row < rowCount; row++) {
			const line = filteredLines[row];
			for (let col = 0; col < Math.min(line.length, colCount); col++) {
				const value = line[col].trim();
				if (value !== '') {
					const ref = String.fromCharCode(65 + col) + (row + 1);
					cells[ref] = { value };
				}
			}
		}

		const data: SpreadsheetData = {
			version: 1,
			cells,
			metadata: {
				name: 'Import CSV',
				rows: 20,
				cols: 20
			}
		};

		return {
			success: true,
			data,
			rowCount,
			colCount
		};
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "Erreur lors de l'import"
		};
	}
}

/**
 * Detect CSV delimiter from content
 *
 * Analyzes the first line to count occurrences of common delimiters
 * and selects the most likely one.
 *
 * @param content - CSV content
 * @returns Most likely delimiter
 */
function detectDelimiter(content: string): CsvDelimiter {
	const firstLine = content.split('\n')[0] || '';

	const counts = {
		',': (firstLine.match(/,/g) || []).length,
		';': (firstLine.match(/;/g) || []).length,
		'\t': (firstLine.match(/\t/g) || []).length
	};

	if (counts[';'] > counts[','] && counts[';'] > counts['\t']) return ';';
	if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
	return ',';
}

/**
 * Parse CSV content respecting quoted fields
 *
 * Properly handles:
 * - Quoted fields with embedded delimiters
 * - Escaped quotes ("" -> ")
 * - Line breaks within quoted fields
 *
 * @param content - CSV content
 * @param delimiter - Delimiter to use
 * @returns Array of parsed rows (each row is array of cell values)
 */
function parseCSVLines(content: string, delimiter: string): string[][] {
	const lines: string[][] = [];
	let currentLine: string[] = [];
	let currentField = '';
	let inQuotes = false;

	for (let i = 0; i < content.length; i++) {
		const char = content[i];
		const nextChar = content[i + 1];

		if (inQuotes) {
			if (char === '"') {
				if (nextChar === '"') {
					// Escaped quote
					currentField += '"';
					i++;
				} else {
					// End of quoted field
					inQuotes = false;
				}
			} else {
				currentField += char;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
			} else if (char === delimiter) {
				currentLine.push(currentField);
				currentField = '';
			} else if (char === '\n') {
				currentLine.push(currentField);
				lines.push(currentLine);
				currentLine = [];
				currentField = '';
			} else if (char !== '\r') {
				currentField += char;
			}
		}
	}

	// Add last field and line
	if (currentField || currentLine.length > 0) {
		currentLine.push(currentField);
		lines.push(currentLine);
	}

	return lines;
}

// =============================================================================
// File Handling
// =============================================================================

/**
 * Download CSV file to user's computer
 *
 * Creates a blob from the CSV string and triggers a download.
 *
 * @param data - Spreadsheet data
 * @param computedValues - Computed values map
 * @param filename - Filename to save as (default: 'spreadsheet.csv')
 * @param options - Export options
 *
 * @example
 * downloadCsv(data, computedMap, 'budget-2024.csv', {
 *   delimiter: ',',
 *   exportFormulas: false,
 *   encoding: 'utf-8-bom'
 * });
 */
export function downloadCsv(
	data: SpreadsheetData,
	computedValues: Map<string, ComputedValue>,
	filename: string = 'spreadsheet.csv',
	options: CsvExportOptions = {}
): void {
	const csv = generateCsv(data, computedValues, options);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Read CSV file from File input
 *
 * Reads the file as text using FileReader API.
 *
 * @param file - File object from input element
 * @returns Promise resolving to file contents as string
 *
 * @example
 * const content = await readCsvFile(file);
 * const result = parseCsv(content);
 */
export async function readCsvFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
		reader.readAsText(file);
	});
}
