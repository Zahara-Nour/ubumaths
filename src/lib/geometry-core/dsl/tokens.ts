/**
 * Token types for the geometry DSL.
 */

export type TokenType =
	// Literals
	| 'NUMBER'
	| 'STRING'
	| 'IDENTIFIER'
	| 'KEYWORD'
	// Operators
	| 'PLUS'
	| 'MINUS'
	| 'STAR'
	| 'SLASH'
	| 'PERCENT'
	| 'CARET'
	| 'EQUALS'
	// Comparators
	| 'DOUBLE_EQUALS'
	| 'NOT_EQUALS'
	| 'LESS'
	| 'GREATER'
	| 'LESS_EQUALS'
	| 'GREATER_EQUALS'
	// Punctuation
	| 'LPAREN'
	| 'RPAREN'
	| 'LBRACKET'
	| 'RBRACKET'
	| 'COLON'
	| 'COMMA'
	| 'DOT'
	// Structure
	| 'NEWLINE'
	| 'INDENT'
	| 'DEDENT'
	| 'EOF';

export interface Token {
	readonly type: TokenType;
	readonly value: string;
	readonly line: number;
	readonly col: number;
}
