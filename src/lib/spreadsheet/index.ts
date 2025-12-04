/**
 * Spreadsheet Module - Main entry point
 *
 * This module re-exports all public APIs from the spreadsheet package
 * for convenient importing.
 *
 * @module spreadsheet
 */

// Export all types and schemas
export type {
	TextAlignment,
	NumberFormat,
	ErrorCode,
	CellFormat,
	CellData,
	ComputedValue,
	CellRef,
	CellRange,
	SpreadsheetMetadata,
	SpreadsheetData,
	CellFormatInput,
	CellDataInput,
	SpreadsheetMetadataInput,
	SpreadsheetDataInput
} from './types';

export {
	MAX_ROWS,
	MAX_COLS,
	MAX_CELL_VALUE_LENGTH,
	SPREADSHEET_VERSION,
	TEXT_ALIGNMENTS,
	NUMBER_FORMATS,
	ERROR_CODES,
	cellFormatSchema,
	cellDataSchema,
	cellRefStringSchema,
	rangeRefStringSchema,
	spreadsheetMetadataSchema,
	spreadsheetDataSchema,
	createEmptySpreadsheet
} from './types';

// Export AST types and utilities
export type {
	ASTNode,
	NumberNode,
	StringNode,
	BooleanNode,
	CellRefNode,
	RangeRefNode,
	BinaryOpNode,
	UnaryOpNode,
	FunctionCallNode,
	ComparisonNode,
	BinaryOperator,
	UnaryOperator,
	ComparisonOperator,
	ParseError,
	ParseResult
} from './parser/ast';

export {
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
	isComparisonNode
} from './parser/ast';

// Export cell reference utilities
export {
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
} from './cell-reference';

// Export lexer types and functions
export type { Token, TokenType, LexerResult } from './parser/lexer';
export { tokenize, describeToken } from './parser/lexer';

// Export parser
export { parse, parseTokens } from './parser/parser';

// Export function aliases and registry
export {
	FUNCTION_ALIASES,
	CANONICAL_FUNCTIONS,
	normalizeFunction,
	isFunctionName,
	getSupportedFunctions,
	getFrenchAliases,
	getFrenchAlias,
	executeFunction,
	hasFunction,
	getAvailableFunctions,
	getFunctionCount,
	mathFunctions,
	logicFunctions,
	textFunctions
} from './functions';

export type { SpreadsheetFunction, FunctionArgs } from './functions';

// Export evaluator
export type { CellValueGetter } from './parser/evaluator';
export {
	evaluate,
	evaluateFormula,
	extractCellRefs,
	extractRangeRefs,
	isValidFormula,
	getFormulaDependencies
} from './parser/evaluator';

// Export dependency graph
export { DependencyGraph, dependencyGraph } from './dependency-graph';
export type { GraphStats } from './dependency-graph';

// Export store
export { spreadsheetStore, SpreadsheetStore } from './store.svelte';
