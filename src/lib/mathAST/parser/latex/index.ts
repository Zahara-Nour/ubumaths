/**
 * LaTeX Parser Infrastructure
 *
 * This module provides the LaTeX-specific parsing infrastructure
 * for converting LaTeX mathematical expressions into MathAST nodes.
 *
 * Components:
 * - Tokenizer: LaTeX lexer that converts strings to tokens
 * - ColorStack: Color context management for nested \textcolor
 * - Pratt Parser: Top-down operator precedence parser
 * - RD Parser: Recursive descent parser (alternative implementation)
 *
 * @module mathAST/parser/latex
 */

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

// =============================================================================
// Parser Exports
// =============================================================================

// Export Pratt parser
export { parsePratt, parsePrattSafe, ParseException as PrattParseException } from './parser-pratt';

// Export RD parser
export { parseRD, parseRDSafe, ParseException as RDParseException } from './parser-rd';
