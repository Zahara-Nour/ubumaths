/**
 * Table Parser Tests
 * ===================
 *
 * Unit tests for the GFM table parsing module.
 */

import { describe, it, expect } from 'vitest';
import {
	isTableRow,
	isAlignmentRow,
	isValidTable,
	parseTable,
	findTableBlocks,
	getColumnCount,
	getRowCount,
	getCellValue,
	tableToArray,
	isEmptyTable
} from './table-parser';

describe('isTableRow', () => {
	it('should identify table rows', () => {
		expect(isTableRow('| col1 | col2 |')).toBe(true);
		expect(isTableRow('| a | b | c |')).toBe(true);
		expect(isTableRow('  | col1 | col2 |  ')).toBe(true); // With whitespace
	});

	it('should reject non-table rows', () => {
		expect(isTableRow('Just text')).toBe(false);
		expect(isTableRow('| only one pipe')).toBe(false);
		expect(isTableRow('no pipes at all')).toBe(false);
	});
});

describe('isAlignmentRow', () => {
	it('should identify alignment rows', () => {
		expect(isAlignmentRow('|---|---|')).toBe(true);
		expect(isAlignmentRow('|:---|:---:|---:|')).toBe(true);
		expect(isAlignmentRow('| --- | --- |')).toBe(true); // With spaces
		expect(isAlignmentRow('|-----|-----|')).toBe(true); // Multiple dashes
	});

	it('should reject non-alignment rows', () => {
		expect(isAlignmentRow('| col1 | col2 |')).toBe(false);
		expect(isAlignmentRow('|abc|def|')).toBe(false);
	});
});

describe('isValidTable', () => {
	it('should validate complete table', () => {
		const lines = ['| h1 | h2 |', '|----|-----|', '| c1 | c2 |'];

		expect(isValidTable(lines)).toBe(true);
	});

	it('should validate table without data rows', () => {
		const lines = ['| h1 | h2 |', '|----|-----|'];

		expect(isValidTable(lines)).toBe(true);
	});

	it('should reject incomplete tables', () => {
		const lines = ['| h1 | h2 |']; // No alignment row

		expect(isValidTable(lines)).toBe(false);
	});

	it('should reject tables with non-table rows', () => {
		const lines = ['| h1 | h2 |', '|----|-----|', 'regular text'];

		expect(isValidTable(lines)).toBe(false);
	});

	it('should require at least 2 lines', () => {
		expect(isValidTable(['| h1 | h2 |'])).toBe(false);
		expect(isValidTable([])).toBe(false);
	});
});

describe('parseTable', () => {
	it('should parse simple table', () => {
		const lines = ['| x | f(x) |', '|---|------|', '| 0 | 0    |', '| 1 | 2    |'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.header).toHaveLength(2);
		expect(table?.rows).toHaveLength(2);
		expect(table?.header[0].content).toBe('x');
		expect(table?.header[1].content).toBe('f(x)');
	});

	it('should parse table with alignments', () => {
		const lines = ['| Left | Center | Right |', '|:-----|:------:|------:|', '| a | b | c |'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.alignments).toEqual(['left', 'center', 'right']);
	});

	it('should parse table with empty cells', () => {
		const lines = ['| A | B |', '|---|---|', '|   |   |', '| x | y |'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.rows).toHaveLength(2);
		expect(table?.rows[0][0].content).toBe('');
		expect(table?.rows[0][1].content).toBe('');
	});

	it('should handle mismatched column counts', () => {
		const lines = ['| A | B | C |', '|---|---|---|', '| 1 | 2 |']; // Missing column

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		// Should pad with empty cells
		expect(table?.rows[0]).toHaveLength(3);
	});

	it('should trim cell content', () => {
		const lines = ['|  A  |  B  |', '|---|---|', '|  x  |  y  |'];

		const table = parseTable(lines);

		expect(table?.header[0].content).toBe('A');
		expect(table?.header[1].content).toBe('B');
		expect(table?.rows[0][0].content).toBe('x');
	});

	it('should return null for invalid input', () => {
		const lines = ['Not a table'];

		const table = parseTable(lines);

		expect(table).toBeNull();
	});

	it('should parse table without data rows', () => {
		const lines = ['| Header 1 | Header 2 |', '|----------|----------|'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.header).toHaveLength(2);
		expect(table?.rows).toHaveLength(0);
	});
});

describe('findTableBlocks', () => {
	it('should find single table block', () => {
		const lines = ['Text', '| h1 | h2 |', '|----|-----|', '| c1 | c2 |', 'More text'];

		const blocks = findTableBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([1, 3]);
	});

	it('should find multiple table blocks', () => {
		const lines = [
			'Text',
			'| h1 | h2 |',
			'|----|-----|',
			'| c1 | c2 |',
			'',
			'More text',
			'| h3 | h4 |',
			'|----|-----|',
			'| c3 | c4 |'
		];

		const blocks = findTableBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual([1, 3]);
		expect(blocks[1]).toEqual([6, 8]);
	});

	it('should handle no tables', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findTableBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle table at start', () => {
		const lines = ['| h1 | h2 |', '|----|-----|', '| c1 | c2 |', 'Text'];

		const blocks = findTableBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][0]).toBe(0);
	});

	it('should handle table at end', () => {
		const lines = ['Text', '| h1 | h2 |', '|----|-----|', '| c1 | c2 |'];

		const blocks = findTableBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][1]).toBe(3);
	});
});

describe('getColumnCount', () => {
	it('should return correct column count', () => {
		const lines = ['| A | B | C |', '|---|---|---|', '| 1 | 2 | 3 |'];
		const table = parseTable(lines)!;

		expect(getColumnCount(table)).toBe(3);
	});
});

describe('getRowCount', () => {
	it('should return correct row count', () => {
		const lines = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |', '| 5 | 6 |'];
		const table = parseTable(lines)!;

		expect(getRowCount(table)).toBe(3);
	});

	it('should return 0 for table without data rows', () => {
		const lines = ['| A | B |', '|---|---|'];
		const table = parseTable(lines)!;

		expect(getRowCount(table)).toBe(0);
	});
});

describe('getCellValue', () => {
	it('should get header cell value', () => {
		const lines = ['| A | B | C |', '|---|---|---|', '| 1 | 2 | 3 |'];
		const table = parseTable(lines)!;

		expect(getCellValue(table, -1, 0)).toBe('A');
		expect(getCellValue(table, -1, 1)).toBe('B');
		expect(getCellValue(table, -1, 2)).toBe('C');
	});

	it('should get data cell value', () => {
		const lines = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'];
		const table = parseTable(lines)!;

		expect(getCellValue(table, 0, 0)).toBe('1');
		expect(getCellValue(table, 0, 1)).toBe('2');
		expect(getCellValue(table, 1, 0)).toBe('3');
		expect(getCellValue(table, 1, 1)).toBe('4');
	});

	it('should return null for out of bounds', () => {
		const lines = ['| A | B |', '|---|---|', '| 1 | 2 |'];
		const table = parseTable(lines)!;

		expect(getCellValue(table, 5, 0)).toBeNull(); // Row out of bounds
		expect(getCellValue(table, 0, 5)).toBeNull(); // Column out of bounds
		expect(getCellValue(table, -2, 0)).toBeNull(); // Invalid row
	});
});

describe('tableToArray', () => {
	it('should convert table to 2D array', () => {
		const lines = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'];
		const table = parseTable(lines)!;

		const array = tableToArray(table);

		expect(array).toHaveLength(3); // Header + 2 rows
		expect(array[0]).toEqual(['A', 'B']);
		expect(array[1]).toEqual(['1', '2']);
		expect(array[2]).toEqual(['3', '4']);
	});

	it('should include header row', () => {
		const lines = ['| X | Y |', '|---|---|', '| 0 | 0 |'];
		const table = parseTable(lines)!;

		const array = tableToArray(table);

		expect(array[0]).toEqual(['X', 'Y']);
	});
});

describe('isEmptyTable', () => {
	it('should identify empty table', () => {
		const lines = ['| A | B |', '|---|---|'];
		const table = parseTable(lines)!;

		expect(isEmptyTable(table)).toBe(true);
	});

	it('should identify non-empty table', () => {
		const lines = ['| A | B |', '|---|---|', '| 1 | 2 |'];
		const table = parseTable(lines)!;

		expect(isEmptyTable(table)).toBe(false);
	});
});

describe('Edge Cases', () => {
	it('should handle tables with many columns', () => {
		const lines = [
			'| A | B | C | D | E | F | G | H | I | J |',
			'|---|---|---|---|---|---|---|---|---|---|',
			'| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |'
		];

		const table = parseTable(lines);

		expect(table?.header).toHaveLength(10);
		expect(table?.rows[0]).toHaveLength(10);
	});

	it('should handle tables with long cell content', () => {
		const longText = 'a'.repeat(200);
		const lines = [`| ${longText} | B |`, '|---|---|', '| 1 | 2 |'];

		const table = parseTable(lines);

		expect(table?.header[0].content).toBe(longText);
	});

	it('should handle tables with special characters', () => {
		const lines = ['| $x^2$ | **bold** | _italic_ |', '|---|---|---|', '| 1 | 2 | 3 |'];

		const table = parseTable(lines);

		expect(table?.header[0].content).toContain('$');
		expect(table?.header[1].content).toContain('**');
	});

	it('should handle table with inconsistent spacing', () => {
		const lines = ['|A|B|C|', '|---|---|---|', '|   1  |2|    3    |'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.rows[0][0].content).toBe('1');
		expect(table?.rows[0][1].content).toBe('2');
		expect(table?.rows[0][2].content).toBe('3');
	});

	it('should handle alignment row with varying dash counts', () => {
		const lines = ['| A | B | C |', '|---|--------|------------|', '| 1 | 2 | 3 |'];

		const table = parseTable(lines);

		expect(table).not.toBeNull();
		expect(table?.alignments).toHaveLength(3);
	});
});
