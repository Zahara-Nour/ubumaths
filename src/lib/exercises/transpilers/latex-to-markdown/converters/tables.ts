/**
 * Table converter for LaTeX to Markdown transpiler
 * Converts LaTeX table environments (tabular, table, etc.) to Markdown tables
 */

import type { EnvironmentToken, ConversionContext, TableAlignment } from '../types';

/**
 * Parse column specification string
 * @param spec - e.g., "|l|c|r|" or "lcr" or "|p{5cm}|l|"
 * @returns Array of alignments and border info
 */
export function parseColumnSpec(spec: string): {
	alignments: TableAlignment[];
	hasLeftBorder: boolean;
	hasRightBorder: boolean;
	columnBorders: boolean[];
} {
	const alignments: TableAlignment[] = [];
	const columnBorders: boolean[] = [];
	let hasLeftBorder = false;
	let hasRightBorder = false;
	let currentPos = 0;
	const cleanSpec = spec.trim();

	// Check for left border
	if (cleanSpec.startsWith('|')) {
		hasLeftBorder = true;
		currentPos = 1;
	}

	while (currentPos < cleanSpec.length) {
		const char = cleanSpec[currentPos];

		// Handle column alignment specifiers
		if (char === 'l') {
			alignments.push('left');
			columnBorders.push(false);
			currentPos++;
		} else if (char === 'c') {
			alignments.push('center');
			columnBorders.push(false);
			currentPos++;
		} else if (char === 'r') {
			alignments.push('right');
			columnBorders.push(false);
			currentPos++;
		} else if (char === 'p') {
			// Paragraph column - skip the width specification
			alignments.push('left'); // Treat as left-aligned
			columnBorders.push(false);
			currentPos++;
			// Skip {width} part
			if (cleanSpec[currentPos] === '{') {
				let braceCount = 1;
				currentPos++;
				while (currentPos < cleanSpec.length && braceCount > 0) {
					if (cleanSpec[currentPos] === '{') braceCount++;
					if (cleanSpec[currentPos] === '}') braceCount--;
					currentPos++;
				}
			}
		} else if (char === '*') {
			// Handle repeat specification *{n}{spec}
			currentPos++; // Skip *
			if (cleanSpec[currentPos] === '{') {
				currentPos++; // Skip {
				let numStr = '';
				while (currentPos < cleanSpec.length && cleanSpec[currentPos] !== '}') {
					numStr += cleanSpec[currentPos];
					currentPos++;
				}
				currentPos++; // Skip }
				const repeatCount = parseInt(numStr, 10) || 1;

				// Get the spec to repeat
				if (cleanSpec[currentPos] === '{') {
					currentPos++; // Skip {
					let repeatSpec = '';
					let braceCount = 1;
					while (currentPos < cleanSpec.length && braceCount > 0) {
						if (cleanSpec[currentPos] === '{') braceCount++;
						else if (cleanSpec[currentPos] === '}') {
							braceCount--;
							if (braceCount === 0) break;
						}
						repeatSpec += cleanSpec[currentPos];
						currentPos++;
					}
					currentPos++; // Skip closing }

					// Parse and repeat the spec
					for (let i = 0; i < repeatCount; i++) {
						const parsed = parseColumnSpec(repeatSpec);
						alignments.push(...parsed.alignments);
						columnBorders.push(...parsed.columnBorders);
					}
				}
			}
		} else if (char === '|') {
			// Column border - mark the NEXT column as having a left border
			currentPos++;
			// We don't track individual column borders in markdown, skip
		} else if (char === '@') {
			// Column separator specification - skip it
			currentPos++;
			if (cleanSpec[currentPos] === '{') {
				let braceCount = 1;
				currentPos++;
				while (currentPos < cleanSpec.length && braceCount > 0) {
					if (cleanSpec[currentPos] === '{') braceCount++;
					if (cleanSpec[currentPos] === '}') braceCount--;
					currentPos++;
				}
			}
		} else {
			// Skip unknown characters
			currentPos++;
		}
	}

	// Check for right border
	if (cleanSpec.endsWith('|')) {
		hasRightBorder = true;
	}

	return {
		alignments,
		hasLeftBorder,
		hasRightBorder,
		columnBorders
	};
}

/**
 * Parse tabular content into rows and cells
 * @param content - Content between \begin{tabular} and \end{tabular}
 * @returns Parsed table structure
 */
export function parseTableContent(content: string): {
	rows: string[][];
	hasHeader: boolean;
	headerRowIndex: number;
} {
	const rows: string[][] = [];
	let hasHeader = false;
	let headerRowIndex = -1;
	let currentRow: string[] = [];
	let currentCell = '';
	let inCommand = false;
	let braceDepth = 0;
	let backslashEscape = false;
	let seenFirstHline = false;

	// Remove leading/trailing whitespace and normalize line endings
	const normalizedContent = content.trim().replace(/\r\n/g, '\n');

	for (let i = 0; i < normalizedContent.length; i++) {
		const char = normalizedContent[i];
		const nextChar = normalizedContent[i + 1];

		// Handle escape sequences
		if (backslashEscape) {
			backslashEscape = false;

			// Check for \hline, \cline, or \\
			if (char === 'h' && normalizedContent.substring(i, i + 5) === 'hline') {
				// Process current row if it has content
				if (currentCell.trim() || currentRow.length > 0) {
					if (currentCell.trim()) {
						currentRow.push(currentCell.trim());
					}
					if (currentRow.length > 0) {
						rows.push(currentRow);

					}
					currentRow = [];
					currentCell = '';
				}

				// First \hline after first row indicates header
				if (rows.length === 1 && !seenFirstHline) {
					hasHeader = true;
					headerRowIndex = 0;
					seenFirstHline = true;
				}

				i += 4; // Skip 'hline' (-1 because of loop increment)
				continue;
			} else if (char === 'c' && normalizedContent.substring(i, i + 5) === 'cline') {
				// Skip \cline{...}
				i += 5; // Skip 'cline'
				if (normalizedContent[i] === '{') {
					let braceCount = 1;
					i++;
					while (i < normalizedContent.length && braceCount > 0) {
						if (normalizedContent[i] === '{') braceCount++;
						if (normalizedContent[i] === '}') braceCount--;
						i++;
					}
					i--; // Adjust for loop increment
				}
				continue;
			} else if (
				char === '\\' &&
				(nextChar === '\\' || nextChar === undefined || /[\s\n]/.test(nextChar || ''))
			) {
				// End of row - double backslash
				if (currentCell.trim() || currentRow.length > 0) {
					currentRow.push(currentCell.trim());
				}
				if (currentRow.length > 0) {
					rows.push(currentRow);
				}
				currentRow = [];
				currentCell = '';

				// Skip optional spacing after \\
				while (i + 1 < normalizedContent.length && /[\s\n]/.test(normalizedContent[i + 1])) {
					i++;
				}
				continue;
			} else if (char === 't' && normalizedContent.substring(i, i + 7) === 'toprule') {
				// booktabs \toprule
				i += 6;
				if (rows.length === 0) {
					// Next row will be header
					seenFirstHline = true;
				}
				continue;
			} else if (char === 'm' && normalizedContent.substring(i, i + 7) === 'midrule') {
				// booktabs \midrule
				i += 6;
				if (rows.length === 1 && !hasHeader) {
					hasHeader = true;
					headerRowIndex = 0;
				}
				continue;
			} else if (char === 'b' && normalizedContent.substring(i, i + 10) === 'bottomrule') {
				// booktabs \bottomrule
				i += 9;
				// Process current row if it has content
				if (currentCell.trim() || currentRow.length > 0) {
					if (currentCell.trim()) {
						currentRow.push(currentCell.trim());
					}
					if (currentRow.length > 0) {
						rows.push(currentRow);
					}
					currentRow = [];
					currentCell = '';
				}
				continue;
			} else if (char === 'm' && normalizedContent.substring(i, i + 11) === 'multicolumn') {
				// Handle \multicolumn - add it to current cell
				currentCell += '\\multicolumn';
				i += 10;
				inCommand = true;
				continue;
			} else if (
				char === '$' ||
				char === '&' ||
				char === '#' ||
				char === '%' ||
				char === '_' ||
				char === '{' ||
				char === '}'
			) {
				// Escaped special character
				currentCell += '\\' + char;
				continue;
			} else {
				// Other command - include the backslash
				currentCell += '\\' + char;
				inCommand = true;
				continue;
			}
		}

		// Check for backslash (start of command)
		if (char === '\\' && !inCommand && braceDepth === 0) {
			backslashEscape = true;
			continue;
		}

		// Track brace depth
		if (char === '{') {
			braceDepth++;
			currentCell += char;
		} else if (char === '}') {
			braceDepth--;
			currentCell += char;
			if (braceDepth === 0) {
				inCommand = false;
			}
		} else if (char === '&' && braceDepth === 0 && !inCommand) {
			// Column separator
			currentRow.push(currentCell.trim());
			currentCell = '';
		} else if (char === '\n' && braceDepth === 0 && !inCommand) {
			// Skip standalone newlines
			if (currentCell.trim()) {
				currentCell += ' ';
			}
		} else {
			// Add character to current cell
			currentCell += char;
		}
	}

	// Process any remaining content
	if (currentCell.trim() || currentRow.length > 0) {
		if (currentCell.trim()) {
			currentRow.push(currentCell.trim());
		}
		if (currentRow.length > 0) {
			rows.push(currentRow);
		}
	}

	return {
		rows,
		hasHeader,
		headerRowIndex
	};
}

/**
 * Convert a single cell content (handle multicolumn, formatting)
 */
export function convertCellContent(cell: string, _context?: ConversionContext): string {
	// Handle empty cells
	if (!cell || !cell.trim()) {
		return '';
	}

	let content = cell.trim();

	// Check for multicolumn
	const multicolumnData = parseMulticolumn(content);
	if (multicolumnData) {
		content = multicolumnData.content;
	}

	// Convert basic LaTeX commands to markdown
	// Bold
	content = content.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
	content = content.replace(/\{\\bf\s+([^}]+)\}/g, '**$1**');
	content = content.replace(/\\bf\s+([^\\{}&]+)/g, '**$1**');

	// Italic
	content = content.replace(/\\textit\{([^}]*)\}/g, '*$1*');
	content = content.replace(/\\emph\{([^}]*)\}/g, '*$1*');
	content = content.replace(/\{\\it\s+([^}]+)\}/g, '*$1*');
	content = content.replace(/\\it\s+([^\\{}&]+)/g, '*$1*');

	// Code
	content = content.replace(/\\texttt\{([^}]*)\}/g, '`$1`');
	content = content.replace(/\\verb\|([^|]*)\|/g, '`$1`');

	// Math mode (preserve as-is)
	// Already in dollar signs, keep them

	// Handle escaped characters
	content = content.replace(/\\&/g, '&');
	content = content.replace(/\\%/g, '%');
	content = content.replace(/\\#/g, '#');
	content = content.replace(/\\\$/g, '$');
	content = content.replace(/\\_/g, '_');
	content = content.replace(/\\{/g, '{');
	content = content.replace(/\\}/g, '}');

	// Handle LaTeX commands in math mode - don't remove backslashes
	// Check if content is likely math (contains $ or common math commands)
	const isMath =
		content.includes('$') || /\\(sqrt|frac|sum|int|alpha|beta|gamma|theta)/.test(content);

	if (!isMath) {
		// Remove any remaining backslashes from simple commands
		content = content.replace(/\\([a-zA-Z]+)\s*/g, '');
	}

	return content;
}

/**
 * Handle \multicolumn{n}{spec}{content}
 */
export function parseMulticolumn(cell: string): {
	colspan: number;
	alignment: TableAlignment;
	content: string;
} | null {
	const multicolumnRegex = /^\\multicolumn\{(\d+)\}\{([^}]*)\}\{(.*)\}$/s;
	const match = cell.match(multicolumnRegex);

	if (!match) {
		return null;
	}

	const colspan = parseInt(match[1], 10);
	const spec = match[2];
	const content = match[3];

	// Parse alignment from spec
	let alignment: TableAlignment = 'left';
	if (spec.includes('c')) {
		alignment = 'center';
	} else if (spec.includes('r')) {
		alignment = 'right';
	}

	return {
		colspan,
		alignment,
		content
	};
}

/**
 * Generate markdown alignment row
 * @param alignments - Array of column alignments
 * @returns String like "|:---|:---:|---:|"
 */
export function generateAlignmentRow(alignments: TableAlignment[]): string {
	const alignmentMarkers = alignments.map((alignment) => {
		switch (alignment) {
			case 'left':
				return ':---';
			case 'center':
				return ':---:';
			case 'right':
				return '---:';
			default:
				return '---';
		}
	});

	return '|' + alignmentMarkers.join('|') + '|';
}

/**
 * Convert tabular environment to markdown table
 */
export function convertTabular(token: EnvironmentToken, context: ConversionContext): string {
	// Extract column specification - handle nested braces properly
	let columnSpec = '';
	let contentAfterSpec = '';
	const trimmed = token.content.trimStart();

	if (trimmed.startsWith('{')) {
		let braceCount = 0;
		let endIndex = -1;

		for (let i = 0; i < trimmed.length; i++) {
			if (trimmed[i] === '{') {
				braceCount++;
			} else if (trimmed[i] === '}') {
				braceCount--;
				if (braceCount === 0) {
					endIndex = i;
					break;
				}
			}
		}

		if (endIndex > 0) {
			columnSpec = trimmed.substring(1, endIndex);
			contentAfterSpec = trimmed.substring(endIndex + 1);
		} else {
			context.addWarning({
				type: 'malformed-table',
				message: 'Unclosed column specification in tabular environment',
				severity: 'warning'
			});
			return '';
		}
	} else {
		context.addWarning({
			type: 'malformed-table',
			message: 'Missing column specification in tabular environment',
			severity: 'warning'
		});
		return '';
	}

	// Parse column specification
	const parsedSpec = parseColumnSpec(columnSpec);
	const alignments = parsedSpec.alignments;

	if (alignments.length === 0) {
		context.addWarning({
			type: 'malformed-table',
			message: 'No valid columns found in tabular specification',
			severity: 'warning'
		});
		return '';
	}

	// Parse table content
	const { rows, hasHeader, headerRowIndex } = parseTableContent(contentAfterSpec);

	if (rows.length === 0) {
		return '';
	}

	// Normalize column count (fill with empty cells if needed)
	const columnCount = alignments.length;
	const normalizedRows = rows.map((row) => {
		const normalizedRow = [...row];
		while (normalizedRow.length < columnCount) {
			normalizedRow.push('');
		}
		// Trim extra columns
		return normalizedRow.slice(0, columnCount);
	});

	// Build markdown table
	const lines: string[] = [];

	// Process header row if exists
	let dataStartIndex = 0;
	if (hasHeader && headerRowIndex >= 0 && headerRowIndex < normalizedRows.length) {
		const headerRow = normalizedRows[headerRowIndex];
		const headerCells = headerRow.map((cell) => convertCellContent(cell, context));
		lines.push('| ' + headerCells.join(' | ') + ' |');
		lines.push(generateAlignmentRow(alignments));
		dataStartIndex = headerRowIndex + 1;
	} else {
		// No header, create empty header with alignment row
		const emptyHeader = new Array(columnCount).fill('');
		lines.push('| ' + emptyHeader.join(' | ') + ' |');
		lines.push(generateAlignmentRow(alignments));
	}

	// Add data rows
	for (let i = dataStartIndex; i < normalizedRows.length; i++) {
		const row = normalizedRows[i];
		const cells = row.map((cell) => convertCellContent(cell, context));
		lines.push('| ' + cells.join(' | ') + ' |');
	}

	return lines.join('\n');
}

/**
 * Convert array environment to markdown table
 */
export function convertArray(token: EnvironmentToken, context: ConversionContext): string {
	// Array is similar to tabular but typically used in math mode
	// For now, treat it the same as tabular
	return convertTabular(token, context);
}

/**
 * Convert table environment (wrapper around tabular)
 */
export function convertTable(token: EnvironmentToken, context: ConversionContext): string {
	// Table environment typically wraps a tabular
	// Extract caption if present
	const captionMatch = token.content.match(/\\caption\{([^}]*)\}/);
	const caption = captionMatch ? captionMatch[1] : null;

	// Look for tabular environment inside
	const tabularMatch = token.content.match(/\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}/);

	if (!tabularMatch) {
		// No tabular inside, just return the content as-is
		if (context.processChildren && token.children) {
			return context.processChildren(token.children);
		}
		return '';
	}

	// Create a fake tabular token to process
	const tabularToken: EnvironmentToken = {
		type: 'environment',
		name: 'tabular',
		content: tabularMatch[1],
		raw: tabularMatch[0],
		start: token.start,
		end: token.end,
		line: token.line,
		column: token.column
	};

	const tableMarkdown = convertTabular(tabularToken, context);

	// Add caption if present
	if (caption && tableMarkdown) {
		return tableMarkdown + '\n\n*' + caption + '*';
	}

	return tableMarkdown;
}

/**
 * Convert longtable environment to markdown table
 */
export function convertLongtable(token: EnvironmentToken, context: ConversionContext): string {
	// Longtable is similar to tabular but can span multiple pages
	// For markdown, treat it the same as tabular
	return convertTabular(token, context);
}

/**
 * Check if environment is a table environment
 */
export function isTableEnvironment(name: string): boolean {
	return ['tabular', 'table', 'array', 'longtable', 'tabularx', 'tabulary'].includes(name);
}

/**
 * Registry of table environment converters
 */
export const tableEnvironmentConverters: Record<
	string,
	(token: EnvironmentToken, ctx: ConversionContext) => string
> = {
	tabular: convertTabular,
	table: convertTable,
	array: convertArray,
	longtable: convertLongtable,
	tabularx: convertTabular, // Treat as regular tabular
	tabulary: convertTabular // Treat as regular tabular
};
