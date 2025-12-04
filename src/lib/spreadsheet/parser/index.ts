/**
 * Spreadsheet Parser Module - Index file
 *
 * Exports the parser and lexer for spreadsheet formulas.
 *
 * @module spreadsheet/parser
 */

// AST types and type guards
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
	ParseResult,
	ParseError
} from './ast';

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
} from './ast';

// Lexer
export type { Token, TokenType, LexerResult } from './lexer';
export { tokenize, describeToken } from './lexer';

// Parser
export { parse, parseTokens } from './parser';

// Evaluator
export type { CellValueGetter } from './evaluator';
export {
	evaluate,
	evaluateFormula,
	extractCellRefs,
	extractRangeRefs,
	isValidFormula,
	getFormulaDependencies
} from './evaluator';
