/**
 * Variation Table Parser - Parse Variation/Sign Tables
 * =====================================================
 *
 * This module parses markdown variation table blocks with support for:
 * - Sign rows with +/- and special markers (zero, asymptote, forbidden, discontinuity)
 * - Variation rows with position indicators
 * - Open/closed bounds for domain intervals
 * - Complex math expressions
 *
 * Syntax:
 * ```variation
 * variable: x
 * domain: -inf, -1, 0, 1, +inf
 *
 * sign: f'(x)
 *   -inf,-1: +
 *   -1: z
 *   -1,0: -
 *
 * variation: f(x)
 *   -inf: -inf, bottom
 *   -1: 3, top
 * ```
 *
 * @module custom-markdown/parser/variation-table-parser
 */

import type {
	VariationTableNode,
	DomainPoint,
	SignRow,
	VariationRow,
	SignValue,
	VariationValue,
	VariationPosition,
	VariationMarker,
	VariationTableParseError,
	VariationTableParseResult,
	TableRow
} from '../types/variation-table';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regex to identify variation block start: ```variation
 */
const VARIATION_BLOCK_START_REGEX = /^```variation\s*$/;

/**
 * Regex to identify block end: ```
 */
const BLOCK_END_REGEX = /^```\s*$/;

/**
 * Regex to parse variable line: variable: x
 */
const VARIABLE_REGEX = /^\s*variable\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse domain line with potential bounds
 * Supports: domain: -inf, 0, +inf OR domain: ]-inf, 0[, ]0, +inf[
 */
const DOMAIN_REGEX = /^\s*domain\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse sign row header: sign: f'(x)
 */
const SIGN_HEADER_REGEX = /^\s*sign\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse variation row header: variation: f(x)
 */
const VARIATION_HEADER_REGEX = /^\s*variation\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse row entry: key: value
 * The key can contain commas for intervals, value can have multiple parts
 */
const ROW_ENTRY_REGEX = /^\s{2,}(.+?)\s*:\s*(.+?)\s*$/;

/**
 * Symbol mappings for sign markers
 */
const SIGN_SYMBOL_MAP: Record<string, SignValue> = {
	'+': { type: 'sign', value: '+' },
	'-': { type: 'sign', value: '-' },
	z: { type: 'marker', marker: 'zero' },
	'0': { type: 'marker', marker: 'zero' },
	'||': { type: 'marker', marker: 'asymptote' },
	'|h|': { type: 'marker', marker: 'forbidden' },
	d: { type: 'marker', marker: 'discontinuity' }
};

/**
 * Valid positions for variation values
 */
const VALID_POSITIONS: VariationPosition[] = [
	'top',
	'bottom',
	'center',
	'limit-top',
	'limit-bottom'
];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a line starts a variation block
 *
 * @param line - Line to check
 * @returns true if line is ```variation
 *
 * @example
 * ```typescript
 * isVariationBlockStart('```variation');  // true
 * isVariationBlockStart('```typescript'); // false
 * isVariationBlockStart('```');           // false
 * ```
 */
export function isVariationBlockStart(line: string): boolean {
	return VARIATION_BLOCK_START_REGEX.test(line);
}

/**
 * Check if a line ends a code/variation block
 *
 * @param line - Line to check
 * @returns true if line is closing ```
 */
export function isBlockEnd(line: string): boolean {
	return BLOCK_END_REGEX.test(line);
}

// ============================================================================
// DOMAIN PARSING
// ============================================================================

/**
 * Parse a single domain point expression
 *
 * Handles open/closed bounds notation:
 * - ]-inf means open at -inf
 * - 0[ means open at 0
 * - [0 or 0] means closed (default)
 *
 * @param expr - Expression to parse (may include [ ] bounds)
 * @returns DomainPoint with expression and open status
 */
function parseDomainPoint(expr: string): DomainPoint {
	let expression = expr.trim();
	let open = false;

	// Check for opening bracket/parenthesis at start
	if (expression.startsWith(']') || expression.startsWith('(')) {
		open = true;
		expression = expression.slice(1).trim();
	} else if (expression.startsWith('[')) {
		expression = expression.slice(1).trim();
	}

	// Check for closing bracket/parenthesis at end
	if (expression.endsWith('[') || expression.endsWith(')')) {
		open = true;
		expression = expression.slice(0, -1).trim();
	} else if (expression.endsWith(']')) {
		expression = expression.slice(0, -1).trim();
	}

	return { expression, open: open || undefined };
}

/**
 * Parse the domain line content
 *
 * Supports two formats:
 * 1. Simple: -inf, -1, 0, 1, +inf
 * 2. With bounds: ]-inf, 0[, ]0, +inf[
 *
 * @param content - Domain content after "domain:"
 * @returns Array of DomainPoint
 */
function parseDomainContent(content: string): DomainPoint[] {
	const points: DomainPoint[] = [];

	// Try to detect bound-style notation (contains [ or ])
	if (content.includes('[') || content.includes(']')) {
		// Split by comma but be careful with bounds notation
		// The pattern ], [ indicates a boundary between intervals
		const segments = content.split(/,\s*(?=[[\]])/);

		for (const segment of segments) {
			const trimmed = segment.trim();
			if (!trimmed) continue;

			// Each segment may contain bounds at start/end
			// e.g., ]-inf or 0[ or ]0
			const point = parseDomainPoint(trimmed);
			if (point.expression) {
				points.push(point);
			}
		}
	} else {
		// Simple comma-separated format
		const parts = content.split(',');
		for (const part of parts) {
			const trimmed = part.trim();
			if (trimmed) {
				points.push({ expression: trimmed });
			}
		}
	}

	return points;
}

// ============================================================================
// SIGN VALUE PARSING
// ============================================================================

/**
 * Parse a sign value from string
 *
 * @param value - Value string ("+", "-", "z", "||", "|h|", "d")
 * @returns SignValue or null if not recognized
 */
function parseSignValue(value: string): SignValue | null {
	const trimmed = value.trim();
	return SIGN_SYMBOL_MAP[trimmed] || null;
}

/**
 * Parse a sign row entry (key: value)
 *
 * @param key - The key (point or interval like "-inf,-1")
 * @param value - The value ("+", "-", "z", etc.)
 * @returns Tuple [normalizedKey, SignValue] or null if invalid
 */
function parseSignEntry(key: string, value: string): [string, SignValue] | null {
	const signValue = parseSignValue(value);
	if (!signValue) return null;

	// Normalize the key (remove extra spaces)
	const normalizedKey = key
		.split(',')
		.map((p) => p.trim())
		.join(',');

	return [normalizedKey, signValue];
}

// ============================================================================
// VARIATION VALUE PARSING
// ============================================================================

/**
 * Parse position string to VariationPosition
 *
 * @param pos - Position string
 * @returns VariationPosition or null if invalid
 */
function parsePosition(pos: string): VariationPosition | null {
	const trimmed = pos.trim().toLowerCase();
	if (VALID_POSITIONS.includes(trimmed as VariationPosition)) {
		return trimmed as VariationPosition;
	}
	return null;
}

/**
 * Parse a variation value from parts
 *
 * Formats:
 * - "3, top" -> expression=3, position=top
 * - "||, -inf, +inf" -> expression=||, marker=asymptote, limits=[-inf, +inf]
 * - "-inf, bottom" -> expression=-inf, position=bottom
 *
 * @param parts - Array of value parts split by comma
 * @returns VariationValue or null if invalid
 */
function parseVariationValue(parts: string[]): VariationValue | null {
	if (parts.length < 2) return null;

	const expression = parts[0].trim();
	const secondPart = parts[1].trim();

	// Check if it's an asymptote with limits: ||, -inf, +inf
	if ((expression === '||' || expression === '|h|' || expression === 'd') && parts.length >= 3) {
		const leftLimit = secondPart;
		const rightLimit = parts[2].trim();
		const marker: VariationMarker =
			expression === '||' ? 'asymptote' : expression === '|h|' ? 'forbidden' : 'discontinuity';

		return {
			expression: '',
			position: 'center',
			marker,
			limits: [leftLimit, rightLimit]
		};
	}

	// Regular value: expression, position
	const position = parsePosition(secondPart);
	if (!position) return null;

	// Check for marker in expression
	let marker: VariationMarker | undefined;
	let actualExpression = expression;

	if (expression === '||') {
		marker = 'asymptote';
		actualExpression = '';
	} else if (expression === '|h|') {
		marker = 'forbidden';
		actualExpression = '';
	} else if (expression === 'd') {
		marker = 'discontinuity';
		actualExpression = '';
	}

	return {
		expression: actualExpression,
		position,
		marker
	};
}

/**
 * Parse a variation row entry (key: value1, value2, ...)
 *
 * @param key - The key (domain point expression)
 * @param value - The comma-separated values
 * @returns Tuple [normalizedKey, VariationValue] or null if invalid
 */
function parseVariationEntry(key: string, value: string): [string, VariationValue] | null {
	// Split value by comma, but be careful with math expressions
	// Simple split for now - math expressions shouldn't have commas at top level
	const parts = value.split(',').map((p) => p.trim());

	const variationValue = parseVariationValue(parts);
	if (!variationValue) return null;

	// Normalize the key
	const normalizedKey = key.trim();

	return [normalizedKey, variationValue];
}

// ============================================================================
// ROW PARSING
// ============================================================================

/**
 * Parse entries for a sign row
 *
 * @param lines - Lines of entries (indented with 2+ spaces)
 * @param startLine - Line number for error reporting
 * @param errors - Error array to append to
 * @returns Map of key -> SignValue
 */
function parseSignRowEntries(
	lines: string[],
	startLine: number,
	errors: VariationTableParseError[]
): Map<string, SignValue> {
	const values = new Map<string, SignValue>();

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(ROW_ENTRY_REGEX);
		if (!match) {
			errors.push({
				message: `Invalid sign entry format`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		const [, key, value] = match;
		const parsed = parseSignEntry(key, value);

		if (!parsed) {
			errors.push({
				message: `Unknown sign value: "${value}". Expected +, -, z, ||, |h|, or d`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		values.set(parsed[0], parsed[1]);
	}

	return values;
}

/**
 * Parse entries for a variation row
 *
 * @param lines - Lines of entries (indented with 2+ spaces)
 * @param startLine - Line number for error reporting
 * @param errors - Error array to append to
 * @returns Map of key -> VariationValue
 */
function parseVariationRowEntries(
	lines: string[],
	startLine: number,
	errors: VariationTableParseError[]
): Map<string, VariationValue> {
	const values = new Map<string, VariationValue>();

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(ROW_ENTRY_REGEX);
		if (!match) {
			errors.push({
				message: `Invalid variation entry format`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		const [, key, value] = match;
		const parsed = parseVariationEntry(key, value);

		if (!parsed) {
			errors.push({
				message: `Invalid variation value format: "${value}". Expected format: "expression, position"`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		values.set(parsed[0], parsed[1]);
	}

	return values;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a variation table block content
 *
 * @param lines - Lines between ```variation and ``` (exclusive)
 * @returns VariationTableParseResult with node and errors
 *
 * @example
 * ```typescript
 * const content = [
 *   'variable: x',
 *   'domain: -inf, 0, +inf',
 *   '',
 *   'sign: f(x)',
 *   '  -inf,0: +',
 *   '  0: z',
 *   '  0,+inf: -'
 * ];
 * const result = parseVariationTableContent(content);
 * ```
 */
export function parseVariationTableContent(lines: string[]): VariationTableParseResult {
	const errors: VariationTableParseError[] = [];
	let variable: string | null = null;
	let domain: DomainPoint[] = [];
	const rows: TableRow[] = [];

	let i = 0;

	// Helper to collect entry lines for a row
	function collectEntryLines(): string[] {
		const entryLines: string[] = [];
		while (i < lines.length) {
			const line = lines[i];
			// Entry lines start with 2+ spaces
			if (/^\s{2,}/.test(line)) {
				entryLines.push(line);
				i++;
			} else if (line.trim() === '') {
				// Empty line ends the row
				i++;
				break;
			} else {
				// New section/row header
				break;
			}
		}
		return entryLines;
	}

	while (i < lines.length) {
		const line = lines[i];
		const lineNum = i + 1; // 1-based for error reporting

		// Skip empty lines at top level
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Try to match variable
		const varMatch = line.match(VARIABLE_REGEX);
		if (varMatch) {
			if (variable !== null) {
				errors.push({
					message: 'Duplicate variable declaration',
					line: lineNum,
					content: line
				});
			}
			variable = varMatch[1];
			i++;
			continue;
		}

		// Try to match domain
		const domainMatch = line.match(DOMAIN_REGEX);
		if (domainMatch) {
			if (domain.length > 0) {
				errors.push({
					message: 'Duplicate domain declaration',
					line: lineNum,
					content: line
				});
			}
			domain = parseDomainContent(domainMatch[1]);
			i++;
			continue;
		}

		// Try to match sign row header
		const signMatch = line.match(SIGN_HEADER_REGEX);
		if (signMatch) {
			const label = signMatch[1];
			i++;
			const entryStartLine = i + 1;
			const entryLines = collectEntryLines();
			const values = parseSignRowEntries(entryLines, entryStartLine, errors);

			const signRow: SignRow = {
				type: 'sign',
				label,
				values
			};
			rows.push(signRow);
			continue;
		}

		// Try to match variation row header
		const variationMatch = line.match(VARIATION_HEADER_REGEX);
		if (variationMatch) {
			const label = variationMatch[1];
			i++;
			const entryStartLine = i + 1;
			const entryLines = collectEntryLines();
			const values = parseVariationRowEntries(entryLines, entryStartLine, errors);

			const variationRow: VariationRow = {
				type: 'variation',
				label,
				values
			};
			rows.push(variationRow);
			continue;
		}

		// Unrecognized line
		errors.push({
			message: `Unrecognized line format`,
			line: lineNum,
			content: line
		});
		i++;
	}

	// Validate required fields
	if (!variable) {
		errors.push({ message: 'Missing required "variable:" declaration' });
	}

	if (domain.length === 0) {
		errors.push({ message: 'Missing required "domain:" declaration' });
	}

	if (rows.length === 0) {
		errors.push({ message: 'No sign or variation rows defined' });
	}

	// If we have critical errors, return null node
	if (!variable || domain.length === 0) {
		return { node: null, errors };
	}

	const node: VariationTableNode = {
		type: 'variation-table',
		variable,
		domain,
		rows
	};

	return { node, errors };
}

/**
 * Parse a complete variation table block from markdown lines
 *
 * Expects lines including the ```variation and ``` delimiters.
 *
 * @param lines - All lines including delimiters
 * @param startIndex - Index of the ```variation line
 * @param endIndex - Index of the closing ``` line
 * @returns VariationTableParseResult
 */
export function parseVariationTable(
	lines: string[],
	startIndex: number,
	endIndex: number
): VariationTableParseResult {
	// Extract content lines (between delimiters, exclusive)
	const contentLines = lines.slice(startIndex + 1, endIndex);
	return parseVariationTableContent(contentLines);
}

// ============================================================================
// BLOCK FINDING
// ============================================================================

/**
 * Range information for a variation table block
 */
export interface VariationBlockRange {
	startIndex: number;
	endIndex: number;
}

/**
 * Find all variation table blocks in markdown lines
 *
 * @param lines - Array of markdown lines
 * @returns Array of block ranges
 *
 * @example
 * ```typescript
 * const lines = [
 *   'Some text',
 *   '```variation',
 *   'variable: x',
 *   '...',
 *   '```',
 *   'More text'
 * ];
 * const blocks = findVariationBlocks(lines);
 * // Returns: [{ startIndex: 1, endIndex: 4 }]
 * ```
 */
export function findVariationBlocks(lines: string[]): VariationBlockRange[] {
	const blocks: VariationBlockRange[] = [];
	let i = 0;

	while (i < lines.length) {
		if (isVariationBlockStart(lines[i])) {
			const startIndex = i;
			// Find closing ```
			let endIndex = i + 1;
			while (endIndex < lines.length && !isBlockEnd(lines[endIndex])) {
				endIndex++;
			}

			// If we found a closing delimiter
			if (endIndex < lines.length) {
				blocks.push({ startIndex, endIndex });
				i = endIndex + 1;
			} else {
				// Unclosed block - treat rest as content
				blocks.push({ startIndex, endIndex: lines.length - 1 });
				break;
			}
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
 * Check if a variation table node has sign rows
 *
 * @param node - VariationTableNode to check
 * @returns true if table contains at least one sign row
 */
export function hasSignRows(node: VariationTableNode): boolean {
	return node.rows.some((row) => row.type === 'sign');
}

/**
 * Check if a variation table node has variation rows
 *
 * @param node - VariationTableNode to check
 * @returns true if table contains at least one variation row
 */
export function hasVariationRows(node: VariationTableNode): boolean {
	return node.rows.some((row) => row.type === 'variation');
}

/**
 * Get all sign rows from a variation table
 *
 * @param node - VariationTableNode to query
 * @returns Array of SignRow
 */
export function getSignRows(node: VariationTableNode): SignRow[] {
	return node.rows.filter((row): row is SignRow => row.type === 'sign');
}

/**
 * Get all variation rows from a variation table
 *
 * @param node - VariationTableNode to query
 * @returns Array of VariationRow
 */
export function getVariationRows(node: VariationTableNode): VariationRow[] {
	return node.rows.filter((row): row is VariationRow => row.type === 'variation');
}

/**
 * Get domain point count
 *
 * @param node - VariationTableNode to query
 * @returns Number of domain points
 */
export function getDomainPointCount(node: VariationTableNode): number {
	return node.domain.length;
}
