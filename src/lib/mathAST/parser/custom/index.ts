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

import type { MathNode } from '../../types';
import type { ParserOptions, ParseResult, GenericFunctionConfig } from '../types';
import { DEFAULT_GENERIC_FUNCTIONS } from '../types';
import {
	parseCustomPratt as parseCustomPrattRaw,
	parseCustomPrattSafe as parseCustomPrattSafeRaw
} from './parser-pratt';
import {
	parseCustomRD as parseCustomRDRaw,
	parseCustomRDSafe as parseCustomRDSafeRaw
} from './parser-rd';

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
// Raw Pratt parser exports (without default generic functions)
// =============================================================================

export {
	parseCustomPratt as parseCustomPrattRaw,
	parseCustomPrattSafe as parseCustomPrattSafeRaw,
	ParseException as PrattParseException
} from './parser-pratt';

// =============================================================================
// Raw RD parser exports (without default generic functions)
// =============================================================================

export {
	parseCustomRD as parseCustomRDRaw,
	parseCustomRDSafe as parseCustomRDSafeRaw,
	ParseException as RDParseException
} from './parser-rd';

// =============================================================================
// Re-export shared types from parser/types
// =============================================================================

export type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';

// =============================================================================
// Custom Parser Options
// =============================================================================

/**
 * Options for the custom parser API
 */
export interface CustomParserOptions {
	/** Parser mode: 'strict' throws on error, 'tolerant' collects errors */
	mode?: 'strict' | 'tolerant';
	/**
	 * Configuration for generic function names (f, g, h).
	 * Defaults to DEFAULT_GENERIC_FUNCTIONS which includes: f, g, h, u, v, w, F, G, H.
	 * Set to `null` to disable generic function parsing entirely.
	 */
	genericFunctions?: GenericFunctionConfig | null;
}

// =============================================================================
// Helper to resolve generic functions config
// =============================================================================

function resolveGenericFunctions(
	config: GenericFunctionConfig | null | undefined
): GenericFunctionConfig | undefined {
	// - undefined (not provided): use default
	// - null: disable entirely
	// - GenericFunctionConfig: use provided config
	if (config === null) {
		return undefined;
	}
	return config ?? DEFAULT_GENERIC_FUNCTIONS;
}

// =============================================================================
// Unified API with default generic functions
// =============================================================================

/**
 * Parse a custom syntax string into a MathAST node.
 * Defaults to the Pratt parser implementation with default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode, with default generic functions)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 *
 * @example
 * ```typescript
 * const ast = parseCustom('2+3/4+5');
 * // Produces: Add(Add(2, Div(3,4)), 5)
 *
 * // Parse f'(x) with default generic functions
 * const deriv = parseCustom("f'(x)");
 * // Produces: FunctionNode with derivativeOrder: 1
 * ```
 */
export function parseCustom(input: string, options?: CustomParserOptions): MathNode {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'strict',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomPrattRaw(input, parserOptions);
}

/**
 * Parse a custom syntax string into a MathAST node with error collection.
 * Defaults to the Pratt parser implementation with default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode, with default generic functions)
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
export function parseCustomSafe(input: string, options?: CustomParserOptions): ParseResult {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'tolerant',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomPrattSafeRaw(input, parserOptions);
}

/**
 * Parse a custom syntax string into a MathAST node using Pratt parser.
 * Includes default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode, with default generic functions)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 */
export function parseCustomPratt(input: string, options?: CustomParserOptions): MathNode {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'strict',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomPrattRaw(input, parserOptions);
}

/**
 * Parse a custom syntax string into a MathAST node with error collection using Pratt parser.
 * Includes default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode, with default generic functions)
 * @returns ParseResult containing the AST and errors
 */
export function parseCustomPrattSafe(input: string, options?: CustomParserOptions): ParseResult {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'tolerant',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomPrattSafeRaw(input, parserOptions);
}

/**
 * Parse a custom syntax string into a MathAST node using RD parser.
 * Includes default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode, with default generic functions)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 */
export function parseCustomRD(input: string, options?: CustomParserOptions): MathNode {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'strict',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomRDRaw(input, parserOptions);
}

/**
 * Parse a custom syntax string into a MathAST node with error collection using RD parser.
 * Includes default generic functions.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode, with default generic functions)
 * @returns ParseResult containing the AST and errors
 */
export function parseCustomRDSafe(input: string, options?: CustomParserOptions): ParseResult {
	const genericFunctions = resolveGenericFunctions(options?.genericFunctions);
	const parserOptions: Partial<ParserOptions> = {
		mode: options?.mode ?? 'tolerant',
		...(genericFunctions && { genericFunctions })
	};
	return parseCustomRDSafeRaw(input, parserOptions);
}

// =============================================================================
// Pattern parser exports
// =============================================================================

export { parsePattern, PatternPrattParser, PatternParseError } from './pattern-parser';
export {
	PatternTokenizer,
	tokenizePattern,
	type PatternTokenType,
	type PatternToken
} from './pattern-tokenizer';
