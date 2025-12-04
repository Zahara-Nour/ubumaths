/**
 * Type import validation test
 *
 * This test verifies that all types and utilities can be imported correctly.
 */

import { describe, it, expect } from 'vitest';

// Test imports from types.ts
import {
	MAX_ROWS,
	MAX_COLS,
	MAX_CELL_VALUE_LENGTH,
	TEXT_ALIGNMENTS,
	NUMBER_FORMATS,
	ERROR_CODES,
	SPREADSHEET_VERSION,
	cellFormatSchema,
	cellDataSchema,
	cellRefStringSchema,
	rangeRefStringSchema,
	spreadsheetMetadataSchema,
	spreadsheetDataSchema,
	type TextAlignment as _TextAlignment,
	type NumberFormat as _NumberFormat,
	type ErrorCode as _ErrorCode,
	type CellFormat,
	type CellData,
	type ComputedValue as _ComputedValue,
	type CellRef as _CellRef,
	type CellRange as _CellRange,
	type SpreadsheetMetadata as _SpreadsheetMetadata,
	type SpreadsheetData as _SpreadsheetData
} from '../types';

// Test imports from parser/ast.ts
import {
	BINARY_OPERATORS,
	UNARY_OPERATORS,
	COMPARISON_OPERATORS,
	isNumberNode,
	isStringNode,
	isBooleanNode,
	isCellRefNode,
	isRangeRefNode,
	isBinaryOpNode,
	isUnaryOpNode,
	isFunctionCallNode,
	isComparisonNode,
	type ASTNode as _ASTNode,
	type NumberNode,
	type StringNode,
	type BooleanNode as _BooleanNode,
	type CellRefNode as _CellRefNode,
	type RangeRefNode as _RangeRefNode,
	type BinaryOpNode as _BinaryOpNode,
	type UnaryOpNode as _UnaryOpNode,
	type FunctionCallNode as _FunctionCallNode,
	type ComparisonNode as _ComparisonNode,
	type BinaryOperator as _BinaryOperator,
	type UnaryOperator as _UnaryOperator,
	type ComparisonOperator as _ComparisonOperator,
	type ParseError as _ParseError,
	type ParseResult as _ParseResult
} from '../parser/ast';

// Test imports from cell-reference.ts
import {
	CELL_REF_PATTERN,
	RANGE_PATTERN,
	colToLetter,
	letterToCol,
	parseCellRef,
	parseRange,
	formatCellRef,
	formatRange,
	isValidCellRef,
	isValidRange,
	expandRange,
	getRangeSize,
	isCellInRange,
	isCellRefString,
	isRangeString
} from '../cell-reference';

describe('Spreadsheet Types Module', () => {
	it('should export constants correctly', () => {
		expect(MAX_ROWS).toBe(20);
		expect(MAX_COLS).toBe(20);
		expect(MAX_CELL_VALUE_LENGTH).toBe(5000);
		expect(SPREADSHEET_VERSION).toBe(1);
		expect(TEXT_ALIGNMENTS).toHaveLength(3);
		expect(NUMBER_FORMATS).toHaveLength(3);
		expect(ERROR_CODES).toHaveLength(6);
	});

	it('should export Zod schemas correctly', () => {
		expect(cellFormatSchema).toBeDefined();
		expect(cellDataSchema).toBeDefined();
		expect(cellRefStringSchema).toBeDefined();
		expect(rangeRefStringSchema).toBeDefined();
		expect(spreadsheetMetadataSchema).toBeDefined();
		expect(spreadsheetDataSchema).toBeDefined();
	});

	it('should validate cell format with schema', () => {
		const validFormat: CellFormat = {
			bold: true,
			textColor: '#ff0000'
		};
		const result = cellFormatSchema.safeParse(validFormat);
		expect(result.success).toBe(true);
	});

	it('should validate cell data with schema', () => {
		const validCellData: CellData = {
			value: '=A1+B1',
			format: { bold: true }
		};
		const result = cellDataSchema.safeParse(validCellData);
		expect(result.success).toBe(true);
	});
});

describe('Spreadsheet Parser AST Module', () => {
	it('should export operator constants correctly', () => {
		expect(BINARY_OPERATORS).toHaveLength(5);
		expect(UNARY_OPERATORS).toHaveLength(2);
		expect(COMPARISON_OPERATORS).toHaveLength(6);
	});

	it('should export type guards correctly', () => {
		expect(typeof isNumberNode).toBe('function');
		expect(typeof isStringNode).toBe('function');
		expect(typeof isBooleanNode).toBe('function');
		expect(typeof isCellRefNode).toBe('function');
		expect(typeof isRangeRefNode).toBe('function');
		expect(typeof isBinaryOpNode).toBe('function');
		expect(typeof isUnaryOpNode).toBe('function');
		expect(typeof isFunctionCallNode).toBe('function');
		expect(typeof isComparisonNode).toBe('function');
	});

	it('should use type guards correctly', () => {
		const numberNode: NumberNode = { type: 'number', value: 42 };
		const stringNode: StringNode = { type: 'string', value: 'hello' };

		expect(isNumberNode(numberNode)).toBe(true);
		expect(isStringNode(numberNode)).toBe(false);
		expect(isStringNode(stringNode)).toBe(true);
		expect(isNumberNode(stringNode)).toBe(false);
	});
});

describe('Cell Reference Utilities Module', () => {
	it('should export regex patterns correctly', () => {
		expect(CELL_REF_PATTERN).toBeInstanceOf(RegExp);
		expect(RANGE_PATTERN).toBeInstanceOf(RegExp);
	});

	it('should export utility functions correctly', () => {
		expect(typeof colToLetter).toBe('function');
		expect(typeof letterToCol).toBe('function');
		expect(typeof parseCellRef).toBe('function');
		expect(typeof parseRange).toBe('function');
		expect(typeof formatCellRef).toBe('function');
		expect(typeof formatRange).toBe('function');
		expect(typeof isValidCellRef).toBe('function');
		expect(typeof isValidRange).toBe('function');
		expect(typeof expandRange).toBe('function');
		expect(typeof getRangeSize).toBe('function');
		expect(typeof isCellInRange).toBe('function');
		expect(typeof isCellRefString).toBe('function');
		expect(typeof isRangeString).toBe('function');
	});

	it('should convert column letters correctly', () => {
		expect(colToLetter(0)).toBe('A');
		expect(colToLetter(19)).toBe('T'); // MAX_COLS = 20, so last column is T (index 19)
		expect(letterToCol('A')).toBe(0);
		expect(letterToCol('T')).toBe(19);
		expect(letterToCol('Z')).toBe(25); // Z exists as a letter, but is out of bounds for our 20-column grid
	});

	it('should parse cell references correctly', () => {
		const ref = parseCellRef('A1');
		expect(ref).toEqual({ col: 0, row: 0 });

		const ref2 = parseCellRef('B2');
		expect(ref2).toEqual({ col: 1, row: 1 });
	});

	it('should format cell references correctly', () => {
		expect(formatCellRef({ col: 0, row: 0 })).toBe('A1');
		expect(formatCellRef({ col: 1, row: 1 })).toBe('B2');
	});

	it('should validate cell references correctly', () => {
		expect(isValidCellRef({ col: 0, row: 0 })).toBe(true);
		expect(isValidCellRef({ col: 19, row: 19 })).toBe(true);
		expect(isValidCellRef({ col: 20, row: 0 })).toBe(false);
		expect(isValidCellRef({ col: 0, row: 20 })).toBe(false);
		expect(isValidCellRef({ col: -1, row: 0 })).toBe(false);
	});

	it('should parse and expand ranges correctly', () => {
		const range = parseRange('A1:B2');
		expect(range).toEqual({
			start: { col: 0, row: 0 },
			end: { col: 1, row: 1 }
		});

		if (range) {
			const cells = expandRange(range);
			expect(cells).toHaveLength(4);
			expect(cells[0]).toEqual({ col: 0, row: 0 }); // A1
			expect(cells[1]).toEqual({ col: 1, row: 0 }); // B1
			expect(cells[2]).toEqual({ col: 0, row: 1 }); // A2
			expect(cells[3]).toEqual({ col: 1, row: 1 }); // B2
		}
	});
});
