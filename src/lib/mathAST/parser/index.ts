/**
 * Parser Infrastructure
 *
 * This module provides the shared infrastructure for parsing
 * mathematical expressions into MathAST nodes.
 *
 * Components:
 * - Types: Token, ParseResult, ParseError, ParserOptions
 * - LaTeX Parser: Tokenizer, Pratt parser, RD parser
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
// LaTeX Parser Exports (re-exported from latex/)
// =============================================================================

export {
	// Tokenizer
	Tokenizer,
	tokenize,
	filterWhitespace,
	isBinaryOperator,
	isRelationToken,
	isLeftDelimiter,
	isRightDelimiter,
	tokenTypeToString,
	tokenToString,
	// Color Stack
	ColorStack,
	STANDARD_COLORS,
	isValidColor,
	normalizeColor,
	// Pratt parser
	parsePratt,
	parsePrattSafe,
	PrattParseException,
	// RD parser
	parseRD,
	parseRDSafe,
	RDParseException
} from './latex';

// =============================================================================
// Unified API
// =============================================================================

import type { MathNode } from '../types';
import type { ParseResult, ParseError } from './types';
import { parsePratt, parsePrattSafe } from './latex';
import { parseRD, parseRDSafe } from './latex';

/**
 * Options for the unified LaTeX parser API
 */
export interface LatexParserOptions {
	/** Parser mode: 'strict' throws on error, 'tolerant' collects errors */
	mode?: 'strict' | 'tolerant';
	/** Parser implementation: 'pratt' or 'rd' */
	parser?: 'pratt' | 'rd';
}

/**
 * Parse a LaTeX string into a MathAST node.
 *
 * This is the main entry point for parsing LaTeX expressions.
 * By default, uses the Pratt parser in strict mode.
 *
 * @param input - The LaTeX string to parse
 * @param options - Parser options
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 *
 * @example
 * ```typescript
 * // Basic usage (Pratt parser, strict mode)
 * const ast = parseLatex('x^2 + 3x - 5');
 *
 * // Use RD parser
 * const ast = parseLatex('x^2 + 3x - 5', { parser: 'rd' });
 *
 * // Tolerant mode (throws, but collects errors)
 * try {
 *   const ast = parseLatex('x^2 +', { mode: 'tolerant' });
 * } catch (e) {
 *   // Handle error
 * }
 * ```
 */
export function parseLatex(input: string, options?: LatexParserOptions): MathNode {
	const mode = options?.mode ?? 'strict';
	const parser = options?.parser ?? 'pratt';

	if (parser === 'rd') {
		return parseRD(input, { mode });
	}

	return parsePratt(input, { mode });
}

/**
 * Parse a LaTeX string into a MathAST node with error collection.
 *
 * This function never throws - it returns a ParseResult with the AST
 * and any errors that occurred. Use this when you want to handle errors
 * programmatically.
 *
 * @param input - The LaTeX string to parse
 * @param options - Parser options
 * @returns ParseResult containing the AST and errors
 *
 * @example
 * ```typescript
 * // Basic usage (Pratt parser, tolerant mode)
 * const result = parseLatexSafe('x^2 + 3x - 5');
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 *
 * // Use RD parser
 * const result = parseLatexSafe('x^2 + 3x - 5', { parser: 'rd' });
 * ```
 */
export function parseLatexSafe(input: string, options?: LatexParserOptions): ParseResult {
	const mode = options?.mode ?? 'tolerant';
	const parser = options?.parser ?? 'pratt';

	if (parser === 'rd') {
		return parseRDSafe(input, { mode });
	}

	return parsePrattSafe(input, { mode });
}

/**
 * Validate a LaTeX string and return any parsing errors.
 *
 * This function parses in tolerant mode and returns only the errors,
 * discarding the AST. Use this when you only need to check if LaTeX
 * is valid without actually using the parsed result.
 *
 * @param input - The LaTeX string to validate
 * @returns Array of parse errors (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateLatex('x^2 + 3x - 5');
 * if (errors.length === 0) {
 *   console.log('Valid LaTeX');
 * } else {
 *   console.error('Invalid LaTeX:', errors);
 * }
 * ```
 */
export function validateLatex(input: string): ParseError[] {
	const result = parseLatexSafe(input, { mode: 'tolerant' });
	return [...result.errors];
}
