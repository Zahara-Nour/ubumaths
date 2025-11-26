/**
 * Unit System - Tokenizer
 * ========================
 *
 * Tokenizes unit expressions for parsing.
 *
 * The tokenizer breaks down unit expressions into tokens that can be processed
 * by the parser. It handles:
 * - Numbers (integers, decimals, scientific notation)
 * - Unit symbols (using UNIT_WHITELIST for greedy matching)
 * - Operators (*, ·, ×, /, ^)
 * - Superscripts (², ³, ⁻¹, etc.)
 * - Parentheses for grouping
 * - Implicit multiplication (space between units)
 *
 * @module questions/units/tokenizer
 */

import { UNIT_WHITELIST } from './definitions';

// ============================================================================
// TOKEN TYPES
// ============================================================================

/**
 * Token type identifiers
 */
export type TokenType =
	| 'NUMBER' // 3.14, -5, 1e-3
	| 'UNIT' // km, m², €
	| 'OPERATOR' // *, ·, /, ^
	| 'EXPONENT' // superscript: ², ³, ⁻¹
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'DOT' // . for multiplication
	| 'EOF'; // End of input

/**
 * Token with type, value, and position
 */
export interface Token {
	/**
	 * Type of the token
	 */
	type: TokenType;

	/**
	 * String value of the token
	 */
	value: string;

	/**
	 * Character position in the input string
	 */
	position: number;
}

// ============================================================================
// SUPERSCRIPT CONVERSION
// ============================================================================

/**
 * Map of Unicode superscript characters to their numeric equivalents
 */
const SUPERSCRIPT_MAP: Record<string, string> = {
	'⁰': '0',
	'¹': '1',
	'²': '2',
	'³': '3',
	'⁴': '4',
	'⁵': '5',
	'⁶': '6',
	'⁷': '7',
	'⁸': '8',
	'⁹': '9',
	'⁻': '-'
};

/**
 * Check if a character is a superscript digit or minus
 */
function isSuperscript(char: string): boolean {
	return char in SUPERSCRIPT_MAP;
}

/**
 * Convert superscript characters to regular digits
 *
 * @example
 * convertSuperscript('²') // '2'
 * convertSuperscript('⁻¹') // '-1'
 * convertSuperscript('³') // '3'
 */
function convertSuperscript(superscript: string): string {
	return superscript
		.split('')
		.map((char) => SUPERSCRIPT_MAP[char] ?? char)
		.join('');
}

// ============================================================================
// CHARACTER CLASSIFICATION
// ============================================================================

/**
 * Check if a character is a digit (0-9)
 */
function isDigit(char: string): boolean {
	return char >= '0' && char <= '9';
}

/**
 * Check if a character is whitespace
 */
function isWhitespace(char: string): boolean {
	return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * Check if a character is a multiplication operator
 */
function isMultiplyOperator(char: string): boolean {
	return char === '*' || char === '·' || char === '×';
}

/**
 * Check if a character could be part of a unit symbol
 * (letters, special currency symbols, degree symbol)
 */
function isUnitChar(char: string): boolean {
	// Letters (a-z, A-Z)
	if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
		return true;
	}

	// Special symbols: €, $, °, μ
	if (char === '€' || char === '$' || char === '°' || char === 'μ') {
		return true;
	}

	return false;
}

// ============================================================================
// TOKENIZER
// ============================================================================

/**
 * Tokenize a unit expression
 *
 * Converts a unit expression string into a sequence of tokens for parsing.
 *
 * Features:
 * - Greedy unit matching using UNIT_WHITELIST (longest match first)
 * - Number parsing (integer, decimal, scientific notation)
 * - Superscript conversion (², ³, ⁻¹ → 2, 3, -1)
 * - Implicit multiplication detection (space between units)
 * - Multiple multiplication operators (*, ·, ×, .)
 *
 * @param input - Unit expression to tokenize
 * @returns Array of tokens ending with EOF
 *
 * @example Simple unit
 * tokenize('km')
 * // → [
 * //   { type: 'UNIT', value: 'km', position: 0 },
 * //   { type: 'EOF', value: '', position: 2 }
 * // ]
 *
 * @example Unit with division
 * tokenize('km/h')
 * // → [
 * //   { type: 'UNIT', value: 'km', position: 0 },
 * //   { type: 'OPERATOR', value: '/', position: 2 },
 * //   { type: 'UNIT', value: 'h', position: 3 },
 * //   { type: 'EOF', value: '', position: 4 }
 * // ]
 *
 * @example Unit with superscripts
 * tokenize('m²·s⁻¹')
 * // → [
 * //   { type: 'UNIT', value: 'm', position: 0 },
 * //   { type: 'EXPONENT', value: '2', position: 1 },
 * //   { type: 'OPERATOR', value: '·', position: 2 },
 * //   { type: 'UNIT', value: 's', position: 3 },
 * //   { type: 'EXPONENT', value: '-1', position: 4 }
 * // ]
 *
 * @example Composite unit with parentheses
 * tokenize('kg·(m/s)²')
 * // → [
 * //   { type: 'UNIT', value: 'kg', position: 0 },
 * //   { type: 'OPERATOR', value: '·', position: 2 },
 * //   { type: 'LPAREN', value: '(', position: 3 },
 * //   { type: 'UNIT', value: 'm', position: 4 },
 * //   { type: 'OPERATOR', value: '/', position: 5 },
 * //   { type: 'UNIT', value: 's', position: 6 },
 * //   { type: 'RPAREN', value: ')', position: 7 },
 * //   { type: 'EXPONENT', value: '2', position: 8 },
 * //   { type: 'EOF', value: '', position: 9 }
 * // ]
 *
 * @example Number with unit
 * tokenize('3.14 m')
 * // → [
 * //   { type: 'NUMBER', value: '3.14', position: 0 },
 * //   { type: 'UNIT', value: 'm', position: 5 },
 * //   { type: 'EOF', value: '', position: 6 }
 * // ]
 *
 * @example Implicit multiplication
 * tokenize('m s')
 * // → [
 * //   { type: 'UNIT', value: 'm', position: 0 },
 * //   { type: 'OPERATOR', value: '*', position: 1 },
 * //   { type: 'UNIT', value: 's', position: 2 },
 * //   { type: 'EOF', value: '', position: 3 }
 * // ]
 */
export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let position = 0;
	let lastTokenType: TokenType | null = null;

	while (position < input.length) {
		const char = input[position];

		// Skip whitespace (but track for implicit multiplication)
		if (isWhitespace(char)) {
			// If there was a unit or ) before whitespace, and a unit comes after,
			// insert implicit multiplication
			if (
				(lastTokenType === 'UNIT' || lastTokenType === 'RPAREN' || lastTokenType === 'EXPONENT') &&
				position + 1 < input.length
			) {
				// Look ahead to see if next non-whitespace is a unit
				let nextPos = position + 1;
				while (nextPos < input.length && isWhitespace(input[nextPos])) {
					nextPos++;
				}

				if (nextPos < input.length && isUnitChar(input[nextPos])) {
					tokens.push({ type: 'OPERATOR', value: '*', position });
					lastTokenType = 'OPERATOR';
				}
			}

			position++;
			continue;
		}

		// Numbers (including negative, decimal, scientific notation)
		if (
			isDigit(char) ||
			(char === '-' && position + 1 < input.length && isDigit(input[position + 1]))
		) {
			const start = position;
			let numStr = '';

			// Optional negative sign
			if (char === '-') {
				numStr += char;
				position++;
			}

			// Integer part
			while (position < input.length && isDigit(input[position])) {
				numStr += input[position];
				position++;
			}

			// Decimal part
			if (position < input.length && input[position] === '.') {
				numStr += input[position];
				position++;

				while (position < input.length && isDigit(input[position])) {
					numStr += input[position];
					position++;
				}
			}

			// Scientific notation (e or E)
			if (position < input.length && (input[position] === 'e' || input[position] === 'E')) {
				numStr += input[position];
				position++;

				// Optional sign after e/E
				if (position < input.length && (input[position] === '+' || input[position] === '-')) {
					numStr += input[position];
					position++;
				}

				// Exponent digits
				while (position < input.length && isDigit(input[position])) {
					numStr += input[position];
					position++;
				}
			}

			tokens.push({ type: 'NUMBER', value: numStr, position: start });
			lastTokenType = 'NUMBER';
			continue;
		}

		// Superscript exponents
		if (isSuperscript(char)) {
			const start = position;
			let superscript = '';

			while (position < input.length && isSuperscript(input[position])) {
				superscript += input[position];
				position++;
			}

			const exponentValue = convertSuperscript(superscript);
			tokens.push({ type: 'EXPONENT', value: exponentValue, position: start });
			lastTokenType = 'EXPONENT';
			continue;
		}

		// Parentheses
		if (char === '(') {
			tokens.push({ type: 'LPAREN', value: char, position });
			lastTokenType = 'LPAREN';
			position++;
			continue;
		}

		if (char === ')') {
			tokens.push({ type: 'RPAREN', value: char, position });
			lastTokenType = 'RPAREN';
			position++;
			continue;
		}

		// Division operator
		if (char === '/') {
			tokens.push({ type: 'OPERATOR', value: char, position });
			lastTokenType = 'OPERATOR';
			position++;
			continue;
		}

		// Caret exponent operator
		if (char === '^') {
			tokens.push({ type: 'OPERATOR', value: char, position });
			lastTokenType = 'OPERATOR';
			position++;
			continue;
		}

		// Multiplication operators (*, ·, ×)
		if (isMultiplyOperator(char)) {
			tokens.push({ type: 'OPERATOR', value: char, position });
			lastTokenType = 'OPERATOR';
			position++;
			continue;
		}

		// Dot (can be multiplication between units, or part of a number - handled above)
		if (char === '.') {
			tokens.push({ type: 'DOT', value: char, position });
			lastTokenType = 'DOT';
			position++;
			continue;
		}

		// Unit symbols (greedy matching using UNIT_WHITELIST)
		if (isUnitChar(char)) {
			const start = position;
			let longestMatch = '';

			// Try to find the longest matching unit from UNIT_WHITELIST
			// We scan ahead and check progressively longer substrings
			let candidateEnd = position + 1;
			while (candidateEnd <= input.length) {
				const candidate = input.slice(position, candidateEnd);

				if (UNIT_WHITELIST.has(candidate)) {
					longestMatch = candidate;
				}

				// Stop if we hit a non-unit character
				if (candidateEnd < input.length && !isUnitChar(input[candidateEnd])) {
					break;
				}

				candidateEnd++;
			}

			if (longestMatch) {
				tokens.push({ type: 'UNIT', value: longestMatch, position: start });
				lastTokenType = 'UNIT';
				position += longestMatch.length;
				continue;
			}

			// If no match found in whitelist, consume single character as unknown unit
			// (will be caught by parser as an error)
			tokens.push({ type: 'UNIT', value: char, position: start });
			lastTokenType = 'UNIT';
			position++;
			continue;
		}

		// Unknown character - skip it (could throw error instead)
		position++;
	}

	// Always end with EOF token
	tokens.push({ type: 'EOF', value: '', position });

	return tokens;
}
