/**
 * Tests for table converter
 */

import { describe, it, expect } from 'vitest';
import {
	parseColumnSpec,
	parseTableContent,
	convertCellContent,
	parseMulticolumn,
	generateAlignmentRow,
	convertTabular,
	convertTable,
	isTableEnvironment,
	tableEnvironmentConverters
} from '../tables';
import type { EnvironmentToken, ConversionContext } from '../../types';

// Mock context for testing
function createMockContext(): ConversionContext {
	const warnings: any[] = [];
	return {
		indentLevel: 0,
		listStack: [],
		inListItem: false,
		inTable: false,
		inMath: false,
		inVerbatim: false,
		environmentStack: [],
		options: {
			preserveComments: false,
			mathDelimiters: 'dollar',
			maxNestingDepth: 10,
			fallbackToText: false,
			preserveWhitespace: false
		},
		warnings,
		addWarning: (warning: any) => warnings.push(warning)
	};
}

describe('parseColumnSpec', () => {
	it('should parse simple column specifications', () => {
		const result = parseColumnSpec('lcr');
		expect(result.alignments).toEqual(['left', 'center', 'right']);
		expect(result.hasLeftBorder).toBe(false);
		expect(result.hasRightBorder).toBe(false);
	});

	it('should parse column specs with borders', () => {
		const result = parseColumnSpec('|l|c|r|');
		expect(result.alignments).toEqual(['left', 'center', 'right']);
		expect(result.hasLeftBorder).toBe(true);
		expect(result.hasRightBorder).toBe(true);
		expect(result.columnBorders).toEqual([false, false, false]);
	});

	it('should parse paragraph columns', () => {
		const result = parseColumnSpec('p{5cm}lp{3cm}');
		expect(result.alignments).toEqual(['left', 'left', 'left']);
	});

	it('should parse repeated columns', () => {
		const result = parseColumnSpec('*{3}{c}');
		expect(result.alignments).toEqual(['center', 'center', 'center']);
	});

	it('should parse complex specification', () => {
		const result = parseColumnSpec('|l|*{2}{c|}r|');
		expect(result.alignments).toEqual(['left', 'center', 'center', 'right']);
		expect(result.hasLeftBorder).toBe(true);
		expect(result.hasRightBorder).toBe(true);
	});

	it('should handle @ column separator specifications', () => {
		const result = parseColumnSpec('l@{}c@{\\hspace{1cm}}r');
		expect(result.alignments).toEqual(['left', 'center', 'right']);
	});
});

describe('parseTableContent', () => {
	it('should parse simple table content', () => {
		const content = 'A & B & C \\\\\nD & E & F \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['A', 'B', 'C'],
			['D', 'E', 'F']
		]);
		expect(result.hasHeader).toBe(false);
	});

	it('should detect header with \\hline', () => {
		const content = 'Name & Age & City \\\\\n\\hline\nAlice & 25 & Paris \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['Name', 'Age', 'City'],
			['Alice', '25', 'Paris']
		]);
		expect(result.hasHeader).toBe(true);
		expect(result.headerRowIndex).toBe(0);
	});

	it('should handle multiple \\hline commands', () => {
		const content = '\\hline\nA & B \\\\\n\\hline\nC & D \\\\\n\\hline';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['A', 'B'],
			['C', 'D']
		]);
	});

	it('should handle empty cells', () => {
		const content = 'A & & C \\\\\n & B & \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['A', '', 'C'],
			['', 'B', '']
		]);
	});

	it('should handle cells with math', () => {
		const content = '$x^2$ & $\\sqrt{2}$ & $\\frac{1}{2}$ \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([['$x^2$', '$\\sqrt{2}$', '$\\frac{1}{2}$']]);
	});

	it('should handle cells with commands', () => {
		const content = '\\textbf{Bold} & \\textit{Italic} & \\texttt{Code} \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([['\\textbf{Bold}', '\\textit{Italic}', '\\texttt{Code}']]);
	});

	it('should handle multicolumn cells', () => {
		const content = '\\multicolumn{2}{c}{Merged} & C \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([['\\multicolumn{2}{c}{Merged}', 'C']]);
	});

	it('should handle booktabs commands', () => {
		const content = '\\toprule\nA & B \\\\\n\\midrule\nC & D \\\\\n\\bottomrule';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['A', 'B'],
			['C', 'D']
		]);
		expect(result.hasHeader).toBe(true);
	});

	it('should handle \\cline commands', () => {
		const content = 'A & B \\\\\n\\cline{1-2}\nC & D \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['A', 'B'],
			['C', 'D']
		]);
	});

	it('should handle newlines within cells', () => {
		const content = 'Line 1\nLine 2 & B \\\\\nC & D \\\\';
		const result = parseTableContent(content);
		expect(result.rows).toEqual([
			['Line 1 Line 2', 'B'],
			['C', 'D']
		]);
	});
});

describe('convertCellContent', () => {
	it('should handle empty cells', () => {
		expect(convertCellContent('')).toBe('');
		expect(convertCellContent('  ')).toBe('');
	});

	it('should convert bold text', () => {
		expect(convertCellContent('\\textbf{bold}')).toBe('**bold**');
		expect(convertCellContent('{\\bf bold text}')).toBe('**bold text**');
	});

	it('should convert italic text', () => {
		expect(convertCellContent('\\textit{italic}')).toBe('*italic*');
		expect(convertCellContent('\\emph{emphasis}')).toBe('*emphasis*');
		expect(convertCellContent('{\\it italic text}')).toBe('*italic text*');
	});

	it('should convert code text', () => {
		expect(convertCellContent('\\texttt{code}')).toBe('`code`');
		expect(convertCellContent('\\verb|verbatim|')).toBe('`verbatim`');
	});

	it('should handle escaped characters', () => {
		expect(convertCellContent('\\& \\% \\# \\$')).toBe('& % # $');
		expect(convertCellContent('\\_ \\{ \\}')).toBe('_ { }');
	});

	it('should preserve math mode', () => {
		expect(convertCellContent('$x^2 + y^2$')).toBe('$x^2 + y^2$');
	});

	it('should handle nested formatting', () => {
		expect(convertCellContent('\\textbf{\\textit{bold italic}}')).toBe('***bold italic***');
	});

	it('should handle multicolumn content', () => {
		const cell = '\\multicolumn{2}{c}{Centered text}';
		const result = convertCellContent(cell);
		expect(result).toBe('Centered text');
	});
});

describe('parseMulticolumn', () => {
	it('should parse basic multicolumn', () => {
		const result = parseMulticolumn('\\multicolumn{2}{c}{Content}');
		expect(result).toEqual({
			colspan: 2,
			alignment: 'center',
			content: 'Content'
		});
	});

	it('should handle different alignments', () => {
		expect(parseMulticolumn('\\multicolumn{3}{l}{Left}')?.alignment).toBe('left');
		expect(parseMulticolumn('\\multicolumn{2}{r}{Right}')?.alignment).toBe('right');
		expect(parseMulticolumn('\\multicolumn{1}{c}{Center}')?.alignment).toBe('center');
	});

	it('should handle borders in spec', () => {
		const result = parseMulticolumn('\\multicolumn{2}{|c|}{Bordered}');
		expect(result?.alignment).toBe('center');
		expect(result?.content).toBe('Bordered');
	});

	it('should return null for non-multicolumn', () => {
		expect(parseMulticolumn('Regular cell')).toBeNull();
		expect(parseMulticolumn('\\textbf{Bold}')).toBeNull();
	});

	it('should handle complex content', () => {
		const result = parseMulticolumn('\\multicolumn{2}{c}{\\textbf{Bold} text}');
		expect(result?.content).toBe('\\textbf{Bold} text');
	});
});

describe('generateAlignmentRow', () => {
	it('should generate left alignment', () => {
		expect(generateAlignmentRow(['left'])).toBe('|:---|');
	});

	it('should generate center alignment', () => {
		expect(generateAlignmentRow(['center'])).toBe('|:---:|');
	});

	it('should generate right alignment', () => {
		expect(generateAlignmentRow(['right'])).toBe('|---:|');
	});

	it('should handle multiple alignments', () => {
		expect(generateAlignmentRow(['left', 'center', 'right'])).toBe('|:---|:---:|---:|');
	});

	it('should handle all same alignment', () => {
		expect(generateAlignmentRow(['center', 'center', 'center'])).toBe('|:---:|:---:|:---:|');
	});
});

describe('convertTabular', () => {
	it('should convert simple table', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: '{lc}\nA & B \\\\\nC & D \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		expect(result).toBe('|  |  |\n|:---|:---:|\n| A | B |\n| C | D |');
	});

	it('should convert table with header', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content:
				'{|l|c|r|}\n\\hline\nName & Age & City \\\\\n\\hline\nAlice & 25 & Paris \\\\\nBob & 30 & London \\\\\n\\hline',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[0]).toBe('| Name | Age | City |');
		expect(lines[1]).toBe('|:---|:---:|---:|');
		expect(lines[2]).toBe('| Alice | 25 | Paris |');
		expect(lines[3]).toBe('| Bob | 30 | London |');
	});

	it('should handle empty cells', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: '{lll}\nA & & C \\\\\n & B & \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[2]).toBe('| A |  | C |');
		expect(lines[3]).toBe('|  | B |  |');
	});

	it('should convert cells with formatting', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: '{ll}\n\\textbf{Bold} & \\textit{Italic} \\\\\n\\texttt{Code} & Normal \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[2]).toBe('| **Bold** | *Italic* |');
		expect(lines[3]).toBe('| `Code` | Normal |');
	});

	it('should handle math in cells', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: '{cc}\n$x^2$ & $\\sqrt{2}$ \\\\\n$a + b$ & $\\frac{1}{2}$ \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[2]).toBe('| $x^2$ | $\\sqrt{2}$ |');
		expect(lines[3]).toBe('| $a + b$ | $\\frac{1}{2}$ |');
	});

	it('should handle missing column spec', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: 'A & B \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		expect(result).toBe('');
		expect(context.warnings.length).toBeGreaterThan(0);
	});

	it('should normalize column count', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: '{lll}\nA & B \\\\\nC & D & E & F \\\\',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[2]).toBe('| A | B |  |'); // Third column filled with empty
		expect(lines[3]).toBe('| C | D | E |'); // Extra column F is trimmed
	});
});

describe('convertTable', () => {
	it('should extract and convert nested tabular', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'table',
			content:
				'\\centering\n\\begin{tabular}{ll}\nA & B \\\\\nC & D \\\\\n\\end{tabular}\n\\caption{Test table}',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTable(token, context);
		expect(result).toContain('| A | B |');
		expect(result).toContain('| C | D |');
		expect(result).toContain('*Test table*');
	});

	it('should handle table without tabular', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'table',
			content: '\\centering\nSome content\n\\caption{Test}',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTable(token, context);
		expect(result).toBe('');
	});

	it('should handle table without caption', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'table',
			content: '\\begin{tabular}{l}\nA \\\\\n\\end{tabular}',
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTable(token, context);
		expect(result).not.toContain('*');
		expect(result).toContain('| A |');
	});
});

describe('isTableEnvironment', () => {
	it('should identify table environments', () => {
		expect(isTableEnvironment('tabular')).toBe(true);
		expect(isTableEnvironment('table')).toBe(true);
		expect(isTableEnvironment('array')).toBe(true);
		expect(isTableEnvironment('longtable')).toBe(true);
		expect(isTableEnvironment('tabularx')).toBe(true);
		expect(isTableEnvironment('tabulary')).toBe(true);
	});

	it('should reject non-table environments', () => {
		expect(isTableEnvironment('itemize')).toBe(false);
		expect(isTableEnvironment('equation')).toBe(false);
		expect(isTableEnvironment('document')).toBe(false);
	});
});

describe('tableEnvironmentConverters', () => {
	it('should have converters for all table environments', () => {
		expect(tableEnvironmentConverters.tabular).toBeDefined();
		expect(tableEnvironmentConverters.table).toBeDefined();
		expect(tableEnvironmentConverters.array).toBeDefined();
		expect(tableEnvironmentConverters.longtable).toBeDefined();
		expect(tableEnvironmentConverters.tabularx).toBeDefined();
		expect(tableEnvironmentConverters.tabulary).toBeDefined();
	});

	it('should convert complex real-world table', () => {
		const token: EnvironmentToken = {
			type: 'environment',
			name: 'tabular',
			content: `{|l|c|r|}
\\hline
\\textbf{Product} & \\textbf{Quantity} & \\textbf{Price} \\\\
\\hline
Apple & 10 & \\$1.50 \\\\
Banana & 5 & \\$0.75 \\\\
Orange & 8 & \\$2.00 \\\\
\\hline
\\multicolumn{2}{|r|}{\\textbf{Total:}} & \\textbf{\\$4.25} \\\\
\\hline`,
			raw: '',
			start: 0,
			end: 0,
			line: 1,
			column: 1
		};
		const context = createMockContext();
		const result = convertTabular(token, context);
		const lines = result.split('\n');
		expect(lines[0]).toContain('**Product**');
		expect(lines[0]).toContain('**Quantity**');
		expect(lines[0]).toContain('**Price**');
		expect(lines[1]).toBe('|:---|:---:|---:|');
		expect(lines[2]).toContain('Apple');
		expect(lines[2]).toContain('10');
		expect(lines[2]).toContain('$1.50');
	});
});
