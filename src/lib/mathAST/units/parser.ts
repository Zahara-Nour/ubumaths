/**
 * Unit AST - Unit String Parser
 *
 * Parses unit strings into Unit objects using a simple tokenizer approach.
 * Supports standard multiplication (., *, ·) and division (/) operators,
 * as well as exponent notation (^).
 *
 * Grammar:
 *   unit_expr = term (('.' | '*' | '·' | '/') term)*
 *   term      = symbol ('^' exponent)?
 *   symbol    = [a-zA-Z€$°μΩ]+
 *   exponent  = '-'? [0-9]+
 *
 * @module mathAST/units/parser
 */

import type { Unit } from './types';
import { resolveUnit } from './definitions';
import { multiply } from './operations';

// =============================================================================
// Types
// =============================================================================

/**
 * Token types for the parser
 */
type TokenType = 'SYMBOL' | 'OPERATOR' | 'EXPONENT' | 'EOF';

/**
 * Token structure
 */
interface Token {
	type: TokenType;
	value: string;
	position: number;
}

/**
 * Parsed term structure (symbol with optional exponent)
 */
interface Term {
	symbol: string;
	exponent: number;
}

// =============================================================================
// Tokenizer
// =============================================================================

/**
 * Tokenize a unit string
 *
 * Splits the input string into tokens: symbols, operators, and exponents.
 * Handles all multiplication operators (., *, ·) and division (/).
 *
 * @param input - The unit string to tokenize
 * @returns Array of tokens
 *
 * @example
 * tokenize('m.s^-1')  // [SYMBOL:m, OPERATOR:., SYMBOL:s, EXPONENT:-1]
 * tokenize('km/h')    // [SYMBOL:km, OPERATOR:/, SYMBOL:h]
 */
function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let position = 0;

	while (position < input.length) {
		const char = input[position];

		// Skip whitespace
		if (/\s/.test(char)) {
			position++;
			continue;
		}

		// Operators: . * · /
		if (char === '.' || char === '*' || char === '·' || char === '/') {
			tokens.push({ type: 'OPERATOR', value: char, position });
			position++;
			continue;
		}

		// Exponent marker: ^
		if (char === '^') {
			// Read exponent value
			position++; // Skip ^
			let exponentStr = '';

			// Optional minus sign
			if (position < input.length && input[position] === '-') {
				exponentStr += '-';
				position++;
			}

			// Read digits
			while (position < input.length && /[0-9]/.test(input[position])) {
				exponentStr += input[position];
				position++;
			}

			if (exponentStr === '' || exponentStr === '-') {
				// Invalid exponent: ^ not followed by a number
				return [];
			}

			tokens.push({
				type: 'EXPONENT',
				value: exponentStr,
				position: position - exponentStr.length
			});
			continue;
		}

		// Symbol: letters and special unit characters
		if (/[a-zA-Z€$°μΩ]/.test(char)) {
			let symbol = '';
			const startPos = position;

			while (position < input.length && /[a-zA-Z€$°μΩ]/.test(input[position])) {
				symbol += input[position];
				position++;
			}

			tokens.push({ type: 'SYMBOL', value: symbol, position: startPos });
			continue;
		}

		// Unknown character
		return [];
	}

	tokens.push({ type: 'EOF', value: '', position });
	return tokens;
}

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse tokens into terms (symbol + optional exponent)
 *
 * Processes a sequence of tokens and extracts terms with their exponents.
 * Handles implicit exponent of 1 when not specified.
 * Tracks division state to negate exponents after a / operator.
 *
 * @param tokens - Array of tokens
 * @returns Array of terms, or null if parsing fails
 */
function parseTerms(tokens: Token[]): Term[] | null {
	const terms: Term[] = [];
	let i = 0;
	let inDivision = false; // Track if we're in division mode

	// Check for empty input
	if (tokens.length === 1 && tokens[0].type === 'EOF') {
		return null;
	}

	// Expect first token to be a symbol
	if (tokens[i].type !== 'SYMBOL') {
		return null;
	}

	while (i < tokens.length && tokens[i].type !== 'EOF') {
		// Expect SYMBOL
		if (tokens[i].type !== 'SYMBOL') {
			return null;
		}

		const symbol = tokens[i].value;
		i++;

		// Check for optional exponent
		let exponent = 1;
		if (i < tokens.length && tokens[i].type === 'EXPONENT') {
			exponent = parseInt(tokens[i].value, 10);
			i++;
		}

		// Apply division mode: negate exponent if we're after a /
		if (inDivision) {
			exponent = -exponent;
		}

		terms.push({ symbol, exponent });

		// Check for operator (or EOF)
		if (i < tokens.length) {
			if (tokens[i].type === 'EOF') {
				break;
			}

			if (tokens[i].type !== 'OPERATOR') {
				return null;
			}

			const operator = tokens[i].value;
			i++;

			// Check that there's a symbol after the operator (not EOF or invalid)
			if (i >= tokens.length || tokens[i].type === 'EOF') {
				return null; // Trailing operator
			}

			// Update division state based on operator
			if (operator === '/') {
				inDivision = true;
			} else {
				// Multiplication operators (., *, ·) reset division mode
				inDivision = false;
			}
		}
	}

	return terms;
}

/**
 * Parse a unit string into a Unit object
 *
 * Tokenizes and parses the input string, validates all symbols using resolveUnit(),
 * and combines terms using multiply() and divide() operations.
 *
 * Returns null for invalid input instead of throwing errors.
 *
 * @param input - The unit string to parse
 * @returns Unit object or null if invalid
 *
 * @example
 * parse('m')       // { components: Map([['m', 1]]), coefficient: 1, original: 'm' }
 * parse('km/h')    // { components: Map([['m', 1], ['s', -1]]), coefficient: 1000/3600, original: 'km/h' }
 * parse('m^2')     // { components: Map([['m', 2]]), coefficient: 1, original: 'm^2' }
 * parse('invalid') // null
 */
export function parse(input: string): Unit | null {
	// Trim whitespace
	const trimmed = input.trim();

	// Empty string
	if (trimmed === '') {
		return null;
	}

	// Tokenize
	const tokens = tokenize(trimmed);
	if (tokens.length === 0) {
		return null;
	}

	// Parse terms
	const terms = parseTerms(tokens);
	if (!terms || terms.length === 0) {
		return null;
	}

	// Validate and resolve each term
	const resolvedTerms: Unit[] = [];
	for (const term of terms) {
		const resolved = resolveUnit(term.symbol);
		if (!resolved) {
			return null; // Unknown symbol
		}

		// Create Unit for this term
		const termUnit: Unit = {
			components: new Map([[resolved.baseSymbol, term.exponent]]),
			coefficient: Math.pow(resolved.coefficient, term.exponent)
		};

		resolvedTerms.push(termUnit);
	}

	// Combine all terms using multiply
	let result = resolvedTerms[0];
	for (let i = 1; i < resolvedTerms.length; i++) {
		result = multiply(result, resolvedTerms[i]);
	}

	// Add original string
	return {
		...result,
		original: trimmed
	};
}

/**
 * Parse a unit string, throwing an error if invalid
 *
 * Wrapper around parse() that throws a descriptive error instead of returning null.
 *
 * @param input - The unit string to parse
 * @returns Unit object
 * @throws Error if the input cannot be parsed
 *
 * @example
 * parseOrThrow('m')    // { components: Map([['m', 1]]), coefficient: 1, original: 'm' }
 * parseOrThrow('xyz')  // throws Error: Invalid unit string: xyz
 */
export function parseOrThrow(input: string): Unit {
	const result = parse(input);
	if (!result) {
		throw new Error(`Invalid unit string: ${input}`);
	}
	return result;
}

// =============================================================================
// Parser Namespace
// =============================================================================

/**
 * Namespace containing all parser functions
 *
 * Usage:
 * - UnitParser.parse('km/h') to parse a unit string
 * - UnitParser.parseOrThrow('m^2') to parse with error throwing
 */
export const UnitParser = {
	parse,
	parseOrThrow
} as const;
