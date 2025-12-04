/**
 * Spreadsheet Lexer - Tokenizer for spreadsheet formulas
 *
 * This module provides a lexer (tokenizer) for spreadsheet formulas.
 * It converts a raw formula string into a sequence of tokens that
 * can be consumed by the parser.
 *
 * Supported tokens:
 * - Numbers: 42, 3.14, .5, 5., -10
 * - Strings: "hello", 'world'
 * - Booleans: TRUE, FALSE, VRAI, FAUX
 * - Cell references: A1, B2, Z20, AA1
 * - Functions: SUM, AVERAGE, SOMME, etc.
 * - Operators: +, -, *, /, ^
 * - Comparisons: =, <>, <, >, <=, >=
 * - Punctuation: (, ), ,, :
 *
 * @module spreadsheet/parser/lexer
 */

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token types recognized by the lexer
 */
export type TokenType =
	| 'NUMBER' // 42, 3.14, -5
	| 'STRING' // "hello", 'world'
	| 'BOOLEAN' // TRUE, FALSE, VRAI, FAUX
	| 'CELL_REF' // A1, B2, AA10
	| 'FUNCTION' // SUM, AVERAGE, SOMME, etc.
	| 'IDENTIFIER' // Unknown identifier (for error reporting)
	| 'OPERATOR' // +, -, *, /, ^
	| 'COMPARISON' // =, <>, <, >, <=, >=
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'COMMA' // ,
	| 'COLON' // :
	| 'EOF'; // End of input

/**
 * A single token produced by the lexer
 */
export interface Token {
	/** Type of the token */
	readonly type: TokenType;
	/** Raw string value of the token */
	readonly value: string;
	/** Position in the input string (0-indexed) */
	readonly position: number;
}

// =============================================================================
// Lexer Result Types
// =============================================================================

/**
 * Result of tokenizing an input string
 */
export type LexerResult =
	| { readonly success: true; readonly tokens: Token[] }
	| { readonly success: false; readonly error: string; readonly position: number };

// =============================================================================
// Patterns and Constants
// =============================================================================

/**
 * Cell reference pattern
 * Matches: A1, B2, Z20, AA1, AB10 (1-2 letters followed by 1-2 digits)
 */
const CELL_REF_PATTERN = /^[A-Z]{1,2}[1-9][0-9]?$/;

/**
 * Operator characters
 */
const OPERATORS = new Set(['+', '-', '*', '/', '^']);

/**
 * Boolean literals (uppercase)
 */
const BOOLEAN_LITERALS = new Set(['TRUE', 'FALSE', 'VRAI', 'FAUX']);

// =============================================================================
// Lexer Implementation
// =============================================================================

/**
 * Tokenize a spreadsheet formula
 *
 * @param input - The formula string to tokenize
 * @returns LexerResult with tokens or error information
 *
 * @example
 * tokenize('=A1+B2')
 * // Returns: { success: true, tokens: [
 * //   { type: 'CELL_REF', value: 'A1', position: 1 },
 * //   { type: 'OPERATOR', value: '+', position: 3 },
 * //   { type: 'CELL_REF', value: 'B2', position: 4 },
 * //   { type: 'EOF', value: '', position: 6 }
 * // ]}
 */
export function tokenize(input: string): LexerResult {
	const tokens: Token[] = [];
	let pos = 0;

	// Skip leading '=' if present (formula marker)
	if (input.startsWith('=')) {
		pos = 1;
	}

	while (pos < input.length) {
		const char = input[pos];

		// Skip whitespace
		if (isWhitespace(char)) {
			pos++;
			continue;
		}

		// Numbers (including decimals)
		if (isDigit(char) || (char === '.' && pos + 1 < input.length && isDigit(input[pos + 1]))) {
			const result = readNumber(input, pos);
			if (!result.success) {
				return { success: false, error: result.error, position: result.position };
			}
			tokens.push(result.token);
			pos = result.nextPos;
			continue;
		}

		// Strings (double or single quoted)
		if (char === '"' || char === "'") {
			const result = readString(input, pos, char);
			if (!result.success) {
				return { success: false, error: result.error, position: result.position };
			}
			tokens.push(result.token);
			pos = result.nextPos;
			continue;
		}

		// Identifiers (cell refs, functions, booleans)
		if (isAlpha(char)) {
			const result = readIdentifier(input, pos);
			tokens.push(result.token);
			pos = result.nextPos;
			continue;
		}

		// Operators
		if (OPERATORS.has(char)) {
			tokens.push({ type: 'OPERATOR', value: char, position: pos });
			pos++;
			continue;
		}

		// Comparison operators
		if (char === '=' || char === '<' || char === '>') {
			const result = readComparison(input, pos);
			tokens.push(result.token);
			pos = result.nextPos;
			continue;
		}

		// Punctuation
		if (char === '(') {
			tokens.push({ type: 'LPAREN', value: '(', position: pos });
			pos++;
			continue;
		}

		if (char === ')') {
			tokens.push({ type: 'RPAREN', value: ')', position: pos });
			pos++;
			continue;
		}

		if (char === ',') {
			tokens.push({ type: 'COMMA', value: ',', position: pos });
			pos++;
			continue;
		}

		if (char === ':') {
			tokens.push({ type: 'COLON', value: ':', position: pos });
			pos++;
			continue;
		}

		// Unknown character
		return {
			success: false,
			error: `Caractere inattendu : '${char}'`,
			position: pos
		};
	}

	// Add EOF token
	tokens.push({ type: 'EOF', value: '', position: pos });

	return { success: true, tokens };
}

// =============================================================================
// Character Classification Helpers
// =============================================================================

/**
 * Check if a character is whitespace
 */
function isWhitespace(char: string): boolean {
	return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * Check if a character is a digit
 */
function isDigit(char: string): boolean {
	return char >= '0' && char <= '9';
}

/**
 * Check if a character is an alphabetic letter
 */
function isAlpha(char: string): boolean {
	return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}

/**
 * Check if a character is alphanumeric or underscore
 */
function isAlphaNumeric(char: string): boolean {
	return isAlpha(char) || isDigit(char) || char === '_';
}

// =============================================================================
// Token Reading Functions
// =============================================================================

type ReadResult =
	| { success: true; token: Token; nextPos: number }
	| { success: false; error: string; position: number };

/**
 * Read a number token (integer or decimal)
 */
function readNumber(input: string, start: number): ReadResult {
	let pos = start;
	let hasDecimal = false;

	// Read digits before decimal point (or the leading decimal point)
	if (input[pos] === '.') {
		hasDecimal = true;
		pos++;
	}

	// Read integer part
	while (pos < input.length && isDigit(input[pos])) {
		pos++;
	}

	// Read decimal point and fraction
	if (!hasDecimal && pos < input.length && input[pos] === '.') {
		hasDecimal = true;
		pos++;

		// Read digits after decimal point
		while (pos < input.length && isDigit(input[pos])) {
			pos++;
		}
	}

	const value = input.slice(start, pos);

	// Validate the number
	if (value === '.' || value === '') {
		return {
			success: false,
			error: "Nombre invalide : '.'",
			position: start
		};
	}

	return {
		success: true,
		token: { type: 'NUMBER', value, position: start },
		nextPos: pos
	};
}

/**
 * Read a string token (quoted)
 */
function readString(input: string, start: number, quote: string): ReadResult {
	let pos = start + 1; // Skip opening quote
	let value = '';

	while (pos < input.length) {
		const char = input[pos];

		if (char === quote) {
			// Check for escaped quote (doubled)
			if (pos + 1 < input.length && input[pos + 1] === quote) {
				value += quote;
				pos += 2;
				continue;
			}

			// End of string
			return {
				success: true,
				token: { type: 'STRING', value, position: start },
				nextPos: pos + 1
			};
		}

		value += char;
		pos++;
	}

	// Unterminated string
	return {
		success: false,
		error: 'Chaine non terminee (guillemet manquant)',
		position: start
	};
}

/**
 * Read an identifier (cell ref, function name, boolean)
 */
function readIdentifier(
	input: string,
	start: number
): { success: true; token: Token; nextPos: number } {
	let pos = start;

	// Read alphanumeric characters
	while (pos < input.length && isAlphaNumeric(input[pos])) {
		pos++;
	}

	const value = input.slice(start, pos).toUpperCase();

	// Check if it's a boolean literal
	if (BOOLEAN_LITERALS.has(value)) {
		return {
			success: true,
			token: { type: 'BOOLEAN', value, position: start },
			nextPos: pos
		};
	}

	// Check if it's a cell reference
	if (CELL_REF_PATTERN.test(value)) {
		return {
			success: true,
			token: { type: 'CELL_REF', value, position: start },
			nextPos: pos
		};
	}

	// Check if followed by '(' -> function name
	// Skip whitespace to check for parenthesis
	let lookAhead = pos;
	while (lookAhead < input.length && isWhitespace(input[lookAhead])) {
		lookAhead++;
	}

	if (lookAhead < input.length && input[lookAhead] === '(') {
		return {
			success: true,
			token: { type: 'FUNCTION', value, position: start },
			nextPos: pos
		};
	}

	// Otherwise it's an unknown identifier
	return {
		success: true,
		token: { type: 'IDENTIFIER', value, position: start },
		nextPos: pos
	};
}

/**
 * Read a comparison operator
 */
function readComparison(
	input: string,
	start: number
): { success: true; token: Token; nextPos: number } {
	const char = input[start];
	let value = char;
	let pos = start + 1;

	if (char === '<') {
		// <> or <= or just <
		if (pos < input.length && (input[pos] === '>' || input[pos] === '=')) {
			value += input[pos];
			pos++;
		}
	} else if (char === '>') {
		// >= or just >
		if (pos < input.length && input[pos] === '=') {
			value += input[pos];
			pos++;
		}
	}
	// '=' is just '='

	return {
		success: true,
		token: { type: 'COMPARISON', value, position: start },
		nextPos: pos
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a human-readable description of a token
 *
 * @param token - The token to describe
 * @returns A human-readable description
 */
export function describeToken(token: Token): string {
	switch (token.type) {
		case 'NUMBER':
			return `nombre ${token.value}`;
		case 'STRING':
			return `chaine "${token.value}"`;
		case 'BOOLEAN':
			return `booleen ${token.value}`;
		case 'CELL_REF':
			return `cellule ${token.value}`;
		case 'FUNCTION':
			return `fonction ${token.value}`;
		case 'IDENTIFIER':
			return `identifiant ${token.value}`;
		case 'OPERATOR':
			return `operateur ${token.value}`;
		case 'COMPARISON':
			return `comparaison ${token.value}`;
		case 'LPAREN':
			return 'parenthese ouvrante';
		case 'RPAREN':
			return 'parenthese fermante';
		case 'COMMA':
			return 'virgule';
		case 'COLON':
			return 'deux-points';
		case 'EOF':
			return 'fin de formule';
	}
}
