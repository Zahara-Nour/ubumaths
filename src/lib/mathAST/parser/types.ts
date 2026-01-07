/**
 * LaTeX Parser - Type Definitions
 *
 * Type definitions for the LaTeX to MathAST parser infrastructure.
 * These types are shared between different parser implementations
 * (Pratt parser and Recursive Descent parser).
 *
 * @module mathAST/parser/types
 */

import type { MathNode } from '../types';
import type { ParserSecurityOptions } from './security';

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token types for LaTeX lexing.
 *
 * Categories:
 * - Literals: NUMBER, LETTER
 * - Commands: COMMAND (e.g., \sin, \frac, \alpha)
 * - Operators: PLUS, MINUS, STAR, SLASH, CARET, UNDERSCORE, TILDE
 * - Delimiters: LBRACE, RBRACE, LPAREN, RPAREN, PIPE
 * - Relations: EQUALS, LESS, GREATER
 * - Punctuation: COMMA, COLON
 * - Special: WHITESPACE, EOF
 */
export type TokenType =
	| 'NUMBER' // 42, 3.14, -5
	| 'LETTER' // a, b, x, y (single letter)
	| 'COMMAND' // \sin, \frac, \alpha, \textcolor, \unit, \left, \right, \leq, \geq
	| 'PLUS' // +
	| 'MINUS' // -
	| 'STAR' // *
	| 'SLASH' // /
	| 'CARET' // ^
	| 'UNDERSCORE' // _
	| 'TILDE' // ~
	| 'LBRACE' // {
	| 'RBRACE' // }
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'LBRACKET' // [
	| 'RBRACKET' // ]
	| 'PIPE' // |
	| 'EQUALS' // =
	| 'LESS' // <
	| 'GREATER' // >
	| 'COMMA' // ,
	| 'COLON' // :
	| 'SEMICOLON' // ;
	| 'EXCLAMATION' // !
	| 'AMPERSAND' // &
	| 'PRIME' // ' (apostrophe for derivatives)
	| 'WHITESPACE'
	| 'EOF';

// =============================================================================
// Token
// =============================================================================

/**
 * Represents a single token from the LaTeX lexer.
 *
 * All properties are readonly to ensure immutability.
 *
 * @example
 * // A number token
 * { type: 'NUMBER', value: '42', position: 0, length: 2 }
 *
 * // A command token
 * { type: 'COMMAND', value: 'frac', position: 5, length: 5 }
 */
export interface Token {
	/** The type of this token */
	readonly type: TokenType;

	/** The raw string value of this token */
	readonly value: string;

	/** The starting position in the input string (0-indexed) */
	readonly position: number;

	/** The length of this token in the input string */
	readonly length: number;
}

// =============================================================================
// Parser Options
// =============================================================================

/**
 * Configuration for parsing generic function names (like f, g, h).
 *
 * When enabled, single letters matching the names array will be parsed as
 * function calls rather than variable multiplication.
 *
 * Example:
 * - Without genericFunctions: f(x) = f * (x)
 * - With genericFunctions: { names: ['f'] }: f(x) = FunctionNode(f, [x])
 */
export interface GenericFunctionConfig {
	/** Function names to recognize (typically single letters like 'f', 'g', 'h') */
	readonly names: readonly string[];
	/** Allow prime notation for derivatives: f'(x), f''(x) (default: true) */
	readonly allowDerivatives?: boolean;
	/** Allow inverse notation: f^{-1}(x) (default: true) */
	readonly allowInverse?: boolean;
}

/**
 * Default list of generic function names.
 *
 * This minimal safe list avoids conflicts with common variable names
 * while supporting the most commonly used generic functions in mathematics.
 *
 * - f, g, h: Standard generic functions
 * - u, v, w: Auxiliary functions / parameterizations
 * - F, G, H: Primitives (F = ∫f) / uppercase variants
 */
export const DEFAULT_GENERIC_FUNCTION_NAMES: readonly string[] = [
	'f',
	'g',
	'h',
	'u',
	'v',
	'w',
	'F',
	'G',
	'H'
] as const;

/**
 * Default configuration for generic functions.
 * Uses the minimal safe list with derivatives and inverse enabled.
 */
export const DEFAULT_GENERIC_FUNCTIONS: GenericFunctionConfig = {
	names: DEFAULT_GENERIC_FUNCTION_NAMES,
	allowDerivatives: true,
	allowInverse: true
} as const;

/**
 * Options for configuring parser behavior.
 *
 * - 'strict': Fails on any invalid input
 * - 'tolerant': Attempts to recover from errors and continue parsing
 */
export interface ParserOptions {
	/** Parser mode: strict fails on errors, tolerant attempts recovery */
	readonly mode: 'strict' | 'tolerant';
	/** Configuration for generic function names (f, g, h) */
	readonly genericFunctions?: GenericFunctionConfig;
	/** Security limits for input size, AST depth, and node count */
	readonly security?: ParserSecurityOptions;
}

/**
 * Default parser options
 */
export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
	mode: 'strict'
} as const;

// =============================================================================
// Parse Result
// =============================================================================

/**
 * Result of a parse operation.
 *
 * Contains either the parsed AST or null (if parsing failed),
 * along with any errors that occurred during parsing.
 *
 * In tolerant mode, ast may be non-null even with errors.
 * In strict mode, any error results in ast being null.
 */
export interface ParseResult {
	/** The parsed AST, or null if parsing failed */
	readonly ast: MathNode | null;

	/** Errors encountered during parsing (may be empty) */
	readonly errors: readonly ParseError[];
}

// =============================================================================
// Parse Errors
// =============================================================================

/**
 * Error codes for specific parse error types.
 *
 * These codes help categorize errors for:
 * - User-friendly error messages
 * - Error recovery strategies
 * - Programmatic error handling
 */
export type ParseErrorCode =
	| 'UNEXPECTED_TOKEN' // Got an unexpected token
	| 'UNEXPECTED_EOF' // Unexpected end of input
	| 'MISSING_BRACE' // Missing { or }
	| 'MISSING_DELIMITER' // Missing \left, \right, (, ), etc.
	| 'UNKNOWN_COMMAND' // Unknown LaTeX command
	| 'INVALID_UNIT' // Invalid or unknown unit
	| 'INVALID_COLOR' // Invalid color specification
	| 'INVALID_NUMBER' // Malformed number
	| 'EMPTY_GROUP' // Empty braces {}
	| 'UNBALANCED_DELIMITERS' // Mismatched delimiters
	| 'INVALID_SUBSCRIPT' // Invalid subscript expression
	| 'INVALID_SUPERSCRIPT' // Invalid superscript expression
	| 'SYNTAX_ERROR' // General syntax error
	| 'UNKNOWN_ENVIRONMENT' // Unknown LaTeX environment (e.g., \begin{xyz})
	| 'UNCLOSED_ENVIRONMENT' // Environment not closed (missing \end)
	| 'MISMATCHED_ENVIRONMENT'; // Begin/end environment names don't match

/**
 * Context around an error showing surrounding text.
 */
export interface ErrorContext {
	/** Text before the error (max 20 chars) */
	readonly before: string;
	/** The erroneous segment */
	readonly error: string;
	/** Text after the error (max 20 chars) */
	readonly after: string;
}

/**
 * Represents a parsing error with location information.
 *
 * @example
 * {
 *   message: "Expected '}' but found end of input",
 *   position: 10,
 *   length: 1,
 *   code: 'MISSING_BRACE'
 * }
 */
export interface ParseError {
	/** Human-readable error message */
	readonly message: string;

	/** Position in the input where the error occurred */
	readonly position: number;

	/** Length of the erroneous segment */
	readonly length: number;

	/** Error code for categorization */
	readonly code: ParseErrorCode;

	// Enhanced fields (optional for backwards compatibility)

	/** Context showing surrounding text */
	readonly context?: ErrorContext;

	/** Line number (1-indexed) */
	readonly line?: number;

	/** Column number (1-indexed) */
	readonly column?: number;

	/** Suggestions for fixing the error */
	readonly suggestions?: readonly string[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Known LaTeX commands that the parser recognizes.
 *
 * Categories:
 * - Functions: sin, cos, tan, log, ln, exp, etc.
 * - Structure: frac, sqrt, left, right
 * - Greek letters: alpha, beta, gamma, etc.
 * - Formatting: textcolor, mathbf, mathit
 * - Units: unit
 * - Relations: leq, geq, neq, equiv, etc.
 * - Operators: cdot, times, div, pm, mp
 */
export type KnownCommand =
	// Trigonometric functions
	| 'sin'
	| 'cos'
	| 'tan'
	| 'cot'
	| 'sec'
	| 'csc'
	| 'arcsin'
	| 'arccos'
	| 'arctan'
	// Hyperbolic functions
	| 'sinh'
	| 'cosh'
	| 'tanh'
	// Logarithmic/exponential
	| 'ln'
	| 'log'
	| 'exp'
	// Limits and bounds
	| 'lim'
	| 'min'
	| 'max'
	| 'sup'
	| 'inf'
	// Algebraic
	| 'det'
	| 'dim'
	| 'ker'
	| 'deg'
	| 'gcd'
	| 'lcm'
	| 'arg'
	| 'mod'
	// Structure
	| 'frac'
	| 'dfrac'
	| 'sqrt'
	| 'left'
	| 'right'
	// Greek (limited set - only these are supported by both parsers)
	| 'pi'
	| 'alpha'
	| 'beta'
	| 'gamma'
	| 'theta'
	// Formatting
	| 'textcolor'
	| 'mathbf'
	| 'mathit'
	| 'mathrm'
	// Units
	| 'unit'
	// Relations
	| 'leq'
	| 'geq'
	| 'neq'
	| 'equiv'
	| 'approx'
	| 'simeq'
	| 'sim'
	| 'prec'
	| 'succ'
	| 'subset'
	| 'supset'
	| 'subseteq'
	| 'supseteq'
	| 'in'
	| 'notin'
	| 'implies'
	| 'iff'
	| 'impliedby'
	// Operators
	| 'cdot'
	| 'times'
	| 'div'
	| 'pm'
	| 'mp'
	| 'ast'
	| 'oplus'
	| 'ominus'
	| 'otimes'
	| 'odot'
	// Symbols
	| 'infty'
	| 'emptyset'
	| 'partial'
	| 'nabla'
	| 'forall'
	| 'exists'
	| 'nexists'
	| 'cup'
	| 'cap'
	| 'setminus'
	| 'therefore'
	| 'because'
	| 'blacksquare'
	| 'aleph'
	| 'beth'
	| 'ell'
	| 'wp'
	| 'Re'
	| 'Im'
	| 'hbar'
	| 'perp'
	| 'parallel'
	| 'angle'
	| 'measuredangle'
	| 'triangle'
	| 'square'
	| 'diamond'
	| 'star'
	| 'circ'
	| 'bullet';

/**
 * Type guard to check if a string is a known command
 */
export function isKnownCommand(cmd: string): cmd is KnownCommand {
	return KNOWN_COMMANDS.has(cmd);
}

/**
 * Set of all known commands for efficient lookup
 */
export const KNOWN_COMMANDS: ReadonlySet<string> = new Set<string>([
	// Trigonometric functions
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'arcsin',
	'arccos',
	'arctan',
	// Hyperbolic functions
	'sinh',
	'cosh',
	'tanh',
	// Logarithmic/exponential
	'ln',
	'log',
	'exp',
	// Limits and bounds
	'lim',
	'min',
	'max',
	'sup',
	'inf',
	// Algebraic
	'det',
	'dim',
	'ker',
	'deg',
	'gcd',
	'lcm',
	'arg',
	'mod',
	// Structure
	'frac',
	'dfrac',
	'sqrt',
	'left',
	'right',
	// Greek (limited set - only these are supported by both parsers)
	'pi',
	'alpha',
	'beta',
	'gamma',
	'theta',
	// Formatting
	'textcolor',
	'mathbf',
	'mathit',
	'mathrm',
	// Units
	'unit',
	// Relations
	'leq',
	'geq',
	'neq',
	'equiv',
	'approx',
	'simeq',
	'sim',
	'prec',
	'succ',
	'subset',
	'supset',
	'subseteq',
	'supseteq',
	'in',
	'notin',
	'implies',
	'iff',
	'impliedby',
	// Operators
	'cdot',
	'times',
	'div',
	'pm',
	'mp',
	'ast',
	'oplus',
	'ominus',
	'otimes',
	'odot',
	// Symbols
	'infty',
	'emptyset',
	'partial',
	'nabla',
	'forall',
	'exists',
	'nexists',
	'cup',
	'cap',
	'setminus',
	'therefore',
	'because',
	'blacksquare',
	'aleph',
	'beth',
	'ell',
	'wp',
	'Re',
	'Im',
	'hbar',
	'perp',
	'parallel',
	'angle',
	'measuredangle',
	'triangle',
	'square',
	'diamond',
	'star',
	'circ',
	'bullet'
]);

/**
 * Commands that are mathematical functions (take arguments in parentheses)
 */
export const FUNCTION_COMMANDS: ReadonlySet<string> = new Set<string>([
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'ln',
	'log',
	'exp',
	'lim',
	'min',
	'max',
	'sup',
	'inf',
	'det',
	'dim',
	'ker',
	'deg',
	'gcd',
	'lcm',
	'arg',
	'mod',
	// Statistical functions
	'mean',
	'median',
	'variance',
	'stdev',
	'sum'
]);

/**
 * Commands that are Greek letters (limited set).
 *
 * Only these Greek letters are supported by both LaTeX and Custom parsers.
 * Supported: pi, alpha, beta, gamma, theta
 * Not supported: All other Greek letters (omega, sigma, delta, epsilon, etc.)
 */
export const GREEK_COMMANDS: ReadonlySet<string> = new Set<string>([
	'pi',
	'alpha',
	'beta',
	'gamma',
	'theta'
]);

/**
 * Commands that are binary operators
 */
export const OPERATOR_COMMANDS: ReadonlySet<string> = new Set<string>([
	'cdot',
	'times',
	'div',
	'pm',
	'mp',
	'ast',
	'oplus',
	'ominus',
	'otimes',
	'odot'
]);

/**
 * Commands that are relations
 */
export const RELATION_COMMANDS: ReadonlySet<string> = new Set<string>([
	'leq',
	'leqslant',
	'geq',
	'geqslant',
	'neq',
	'equiv',
	'approx',
	'simeq',
	'sim',
	'prec',
	'succ',
	'subset',
	'supset',
	'subseteq',
	'supseteq',
	'in',
	'notin',
	'implies',
	'iff',
	'impliedby',
	'Rightarrow',
	'Leftrightarrow',
	'Leftarrow'
]);
