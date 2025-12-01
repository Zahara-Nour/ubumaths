/**
 * LaTeX Parser Infrastructure
 *
 * This module provides the shared infrastructure for parsing LaTeX
 * mathematical expressions into MathAST nodes.
 *
 * Components:
 * - Types: Token, ParseResult, ParseError, ParserOptions
 * - Tokenizer: LaTeX lexer that converts strings to tokens
 * - ColorStack: Color context management for nested \textcolor
 *
 * @module mathAST/parser
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
	Token,
	TokenType,
	ParserOptions,
	ParseResult,
	ParseError,
	ParseErrorCode,
	KnownCommand
} from './types';

export {
	DEFAULT_PARSER_OPTIONS,
	KNOWN_COMMANDS,
	FUNCTION_COMMANDS,
	GREEK_COMMANDS,
	OPERATOR_COMMANDS,
	RELATION_COMMANDS,
	isKnownCommand
} from './types';

// =============================================================================
// Tokenizer Exports
// =============================================================================

export {
	Tokenizer,
	tokenize,
	filterWhitespace,
	isBinaryOperator,
	isRelationToken,
	isLeftDelimiter,
	isRightDelimiter,
	tokenTypeToString,
	tokenToString
} from './tokenizer';

// =============================================================================
// Color Stack Exports
// =============================================================================

export { ColorStack, STANDARD_COLORS, isValidColor, normalizeColor } from './color-stack';
