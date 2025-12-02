/**
 * Custom Syntax Parser for MathAST
 *
 * Provides parsing infrastructure for a custom math syntax (ASCII Math style).
 * Two parser implementations available: Pratt and Recursive Descent.
 *
 * @example
 * ```typescript
 * import { parseCustom, parseCustomSafe } from '$lib/mathAST/parser/custom';
 *
 * // Simple parsing (throws on error)
 * const ast = parseCustom('2x^2+3x+1');
 *
 * // Safe parsing (returns errors)
 * const result = parseCustomSafe('2x^2+3x+1');
 * if (result.ast) {
 *   // Use AST
 * } else {
 *   // Handle errors
 *   console.error(result.errors);
 * }
 * ```
 *
 * @module mathAST/parser/custom
 */

// =============================================================================
// Tokenizer exports
// =============================================================================

export {
	CustomTokenizer,
	tokenize,
	type CustomToken,
	type CustomTokenType,
	isBinaryOperator,
	isRelationToken,
	isLeftDelimiter,
	isRightDelimiter,
	tokenTypeToString,
	tokenToString
} from './tokenizer';

// =============================================================================
// Pratt parser exports
// =============================================================================

export {
	parseCustomPratt,
	parseCustomPrattSafe,
	ParseException as PrattParseException
} from './parser-pratt';

// =============================================================================
// RD parser exports
// =============================================================================

export { parseCustomRD, parseCustomRDSafe, ParseException as RDParseException } from './parser-rd';

// =============================================================================
// Re-export shared types from parser/types
// =============================================================================

export type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';

// =============================================================================
// Convenience aliases (default to Pratt parser)
// =============================================================================

/**
 * Parse a custom syntax string into a MathAST node.
 * Defaults to the Pratt parser implementation.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 *
 * @example
 * ```typescript
 * const ast = parseCustom('2+3/4+5');
 * // Produces: Add(Add(2, Div(3,4)), 5)
 * ```
 */
export { parseCustomPratt as parseCustom } from './parser-pratt';

/**
 * Parse a custom syntax string into a MathAST node with error collection.
 * Defaults to the Pratt parser implementation.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode)
 * @returns ParseResult containing the AST and errors
 *
 * @example
 * ```typescript
 * const result = parseCustomSafe('2+3/4+5');
 * if (result.ast) {
 *   console.log('Parsed successfully');
 * } else {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export { parseCustomPrattSafe as parseCustomSafe } from './parser-pratt';
