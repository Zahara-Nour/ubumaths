/**
 * Spreadsheet Parser AST - Abstract Syntax Tree definitions
 *
 * This module defines the AST node types for the spreadsheet formula parser.
 * The parser handles spreadsheet-specific syntax:
 * - Cell references (A1, B2, Z20)
 * - Range references (A1:B10)
 * - Binary operations (+, -, *, /, ^)
 * - Unary operations (-, +)
 * - Function calls (SOMME, MOYENNE, SUM, AVERAGE, etc.)
 * - Comparisons (=, <>, <, >, <=, >=)
 * - Literals (numbers, strings, booleans)
 *
 * The AST is designed to be simple and evaluable without dependencies
 * on the MathAST module (separate parser implementation).
 *
 * @module spreadsheet/parser/ast
 */

// =============================================================================
// AST Node Types
// =============================================================================

/**
 * Union type for all AST node types
 *
 * This is a discriminated union using the 'type' field for type narrowing.
 */
export type ASTNode =
	| NumberNode
	| StringNode
	| BooleanNode
	| CellRefNode
	| RangeRefNode
	| BinaryOpNode
	| UnaryOpNode
	| FunctionCallNode
	| ComparisonNode;

// =============================================================================
// Literal Nodes
// =============================================================================

/**
 * Number literal node
 *
 * Examples: 42, 3.14, -10, 1.5e10
 */
export interface NumberNode {
	readonly type: 'number';
	/** The numeric value */
	readonly value: number;
}

/**
 * String literal node
 *
 * Examples: "Hello", "World", "42" (as string)
 *
 * Strings in formulas are typically enclosed in double quotes.
 */
export interface StringNode {
	readonly type: 'string';
	/** The string value (without quotes) */
	readonly value: string;
}

/**
 * Boolean literal node
 *
 * Examples: TRUE, FALSE (case-insensitive in parser)
 */
export interface BooleanNode {
	readonly type: 'boolean';
	/** The boolean value */
	readonly value: boolean;
}

// =============================================================================
// Reference Nodes
// =============================================================================

/**
 * Cell reference node
 *
 * Represents a reference to a single cell (e.g., A1, B2, Z20)
 *
 * The ref string is the original reference as written in the formula.
 * The col and row are 0-indexed parsed values for evaluation.
 */
export interface CellRefNode {
	readonly type: 'cellRef';
	/** Original reference string (e.g., "A1", "B2") */
	readonly ref: string;
	/** Parsed column index (0-indexed, A=0, B=1, ..., Z=25) */
	readonly col: number;
	/** Parsed row index (0-indexed) */
	readonly row: number;
}

/**
 * Range reference node
 *
 * Represents a range of cells (e.g., A1:B10, C5:D20)
 *
 * The range is defined by two cell references: start and end.
 * These define opposite corners of a rectangular region.
 */
export interface RangeRefNode {
	readonly type: 'rangeRef';
	/** Start cell reference */
	readonly start: CellRefNode;
	/** End cell reference */
	readonly end: CellRefNode;
}

// =============================================================================
// Operator Nodes
// =============================================================================

/**
 * Binary arithmetic operators
 */
export const BINARY_OPERATORS = ['+', '-', '*', '/', '^'] as const;

/**
 * Type for binary operators
 */
export type BinaryOperator = (typeof BINARY_OPERATORS)[number];

/**
 * Binary operation node
 *
 * Represents binary arithmetic operations: +, -, *, /, ^
 *
 * Examples:
 * - A1 + B1
 * - 2 * 3
 * - A1 ^ 2 (exponentiation)
 */
export interface BinaryOpNode {
	readonly type: 'binaryOp';
	/** The operator */
	readonly operator: BinaryOperator;
	/** Left operand */
	readonly left: ASTNode;
	/** Right operand */
	readonly right: ASTNode;
}

/**
 * Unary arithmetic operators
 */
export const UNARY_OPERATORS = ['-', '+'] as const;

/**
 * Type for unary operators
 */
export type UnaryOperator = (typeof UNARY_OPERATORS)[number];

/**
 * Unary operation node
 *
 * Represents unary arithmetic operations: -, +
 *
 * Examples:
 * - -A1
 * - +5
 * - -(A1 + B1)
 */
export interface UnaryOpNode {
	readonly type: 'unaryOp';
	/** The operator */
	readonly operator: UnaryOperator;
	/** The operand */
	readonly operand: ASTNode;
}

// =============================================================================
// Comparison Nodes
// =============================================================================

/**
 * Comparison operators
 */
export const COMPARISON_OPERATORS = ['=', '<>', '<', '>', '<=', '>='] as const;

/**
 * Type for comparison operators
 */
export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];

/**
 * Comparison operation node
 *
 * Represents comparison operations that return boolean values.
 *
 * Operators:
 * - = : Equal
 * - <> : Not equal
 * - < : Less than
 * - > : Greater than
 * - <= : Less than or equal
 * - >= : Greater than or equal
 *
 * Examples:
 * - A1 = B1
 * - A1 > 10
 * - A1 <= B1
 */
export interface ComparisonNode {
	readonly type: 'comparison';
	/** The comparison operator */
	readonly operator: ComparisonOperator;
	/** Left operand */
	readonly left: ASTNode;
	/** Right operand */
	readonly right: ASTNode;
}

// =============================================================================
// Function Call Nodes
// =============================================================================

/**
 * Function call node
 *
 * Represents a function call with arguments.
 *
 * The name is stored in uppercase and normalized form:
 * - French names are converted to English (SOMME → SUM)
 * - Case is normalized to uppercase
 *
 * Examples:
 * - SOMME(A1:A10)
 * - MOYENNE(A1, A2, A3)
 * - SI(A1>10, "High", "Low")
 * - SUM(A1:B10)
 */
export interface FunctionCallNode {
	readonly type: 'functionCall';
	/**
	 * Function name (uppercase, normalized to English)
	 *
	 * Examples: "SUM", "AVERAGE", "IF", "MAX", "MIN"
	 */
	readonly name: string;
	/** Function arguments (can be any AST nodes) */
	readonly args: readonly ASTNode[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for NumberNode
 */
export function isNumberNode(node: ASTNode): node is NumberNode {
	return node.type === 'number';
}

/**
 * Type guard for StringNode
 */
export function isStringNode(node: ASTNode): node is StringNode {
	return node.type === 'string';
}

/**
 * Type guard for BooleanNode
 */
export function isBooleanNode(node: ASTNode): node is BooleanNode {
	return node.type === 'boolean';
}

/**
 * Type guard for CellRefNode
 */
export function isCellRefNode(node: ASTNode): node is CellRefNode {
	return node.type === 'cellRef';
}

/**
 * Type guard for RangeRefNode
 */
export function isRangeRefNode(node: ASTNode): node is RangeRefNode {
	return node.type === 'rangeRef';
}

/**
 * Type guard for BinaryOpNode
 */
export function isBinaryOpNode(node: ASTNode): node is BinaryOpNode {
	return node.type === 'binaryOp';
}

/**
 * Type guard for UnaryOpNode
 */
export function isUnaryOpNode(node: ASTNode): node is UnaryOpNode {
	return node.type === 'unaryOp';
}

/**
 * Type guard for FunctionCallNode
 */
export function isFunctionCallNode(node: ASTNode): node is FunctionCallNode {
	return node.type === 'functionCall';
}

/**
 * Type guard for ComparisonNode
 */
export function isComparisonNode(node: ASTNode): node is ComparisonNode {
	return node.type === 'comparison';
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Parse error result from the parser
 */
export interface ParseError {
	/** Error message describing what went wrong */
	readonly message: string;
	/** Position in the input string where the error occurred (0-indexed) */
	readonly position: number;
	/** The token that caused the error (if available) */
	readonly token?: string;
}

/**
 * Result of parsing a formula
 *
 * Either successful with an AST or failed with an error.
 */
export type ParseResult =
	| { readonly success: true; readonly ast: ASTNode }
	| { readonly success: false; readonly error: ParseError };
