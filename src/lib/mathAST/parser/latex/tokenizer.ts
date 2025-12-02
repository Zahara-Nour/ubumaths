/**
 * LaTeX Tokenizer
 *
 * Converts LaTeX mathematical expressions into a stream of tokens.
 * This is the first stage of the parser pipeline.
 *
 * Features:
 * - Numbers (integers, decimals): 42, 3.14, .5
 * - Single letters: a-z, A-Z
 * - LaTeX commands: \sin, \frac, \alpha, \textcolor, etc.
 * - Operators: + - * / ^ _ ~
 * - Delimiters: { } ( ) [ ] |
 * - Relations: = < >
 * - Punctuation: , : ; !
 * - Position tracking for error reporting
 * - Whitespace as tokens (needed for implicit multiplication detection)
 *
 * @module mathAST/parser/tokenizer
 */

import type { Token, TokenType } from '../types';

// =============================================================================
// Tokenizer Class
// =============================================================================

/**
 * LaTeX tokenizer that provides both streaming and batch tokenization.
 *
 * Usage:
 * ```typescript
 * // Streaming (one token at a time)
 * const tokenizer = new Tokenizer('x + 2');
 * while (tokenizer.peek().type !== 'EOF') {
 *   const token = tokenizer.nextToken();
 *   // process token
 * }
 *
 * // Batch (all tokens at once)
 * const tokens = tokenize('x + 2');
 * ```
 */
export class Tokenizer {
	private readonly input: string;
	private position: number = 0;
	private readonly length: number;
	private tokenCache: Token[] = [];
	private cachePosition: number = 0;

	constructor(input: string) {
		this.input = input;
		this.length = input.length;
	}

	/**
	 * Returns the next token and advances the position.
	 */
	nextToken(): Token {
		// If we have cached tokens ahead, use them
		if (this.cachePosition < this.tokenCache.length) {
			return this.tokenCache[this.cachePosition++];
		}

		// Otherwise, scan a new token
		const token = this.scanToken();
		this.tokenCache.push(token);
		this.cachePosition++;
		return token;
	}

	/**
	 * Returns the next token without advancing the position.
	 */
	peek(): Token {
		const token = this.peekAt(0);
		return token;
	}

	/**
	 * Returns a token at a specific offset from the current position.
	 * Offset 0 is the next token, offset 1 is the token after that, etc.
	 */
	peekAt(offset: number): Token {
		// Ensure we have enough tokens cached
		while (this.cachePosition + offset >= this.tokenCache.length) {
			const token = this.scanToken();
			this.tokenCache.push(token);
		}

		return this.tokenCache[this.cachePosition + offset];
	}

	/**
	 * Resets the tokenizer to the beginning.
	 */
	reset(): void {
		this.position = 0;
		this.tokenCache = [];
		this.cachePosition = 0;
	}

	/**
	 * Returns the current position in the input string.
	 */
	getPosition(): number {
		return this.position;
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Scans and returns the next token from the input.
	 */
	private scanToken(): Token {
		// Check for EOF
		if (this.position >= this.length) {
			return this.makeToken('EOF', '', this.position);
		}

		const char = this.input[this.position];

		// Whitespace
		if (this.isWhitespace(char)) {
			return this.scanWhitespace();
		}

		// LaTeX command (starts with \)
		if (char === '\\') {
			return this.scanCommand();
		}

		// Number
		if (this.isDigit(char) || (char === '.' && this.isDigitAt(this.position + 1))) {
			return this.scanNumber();
		}

		// Letter
		if (this.isLetter(char)) {
			return this.scanLetter();
		}

		// Single character tokens
		return this.scanSingleChar();
	}

	/**
	 * Scans whitespace characters.
	 */
	private scanWhitespace(): Token {
		const startPos = this.position;
		let value = '';

		while (this.position < this.length && this.isWhitespace(this.input[this.position])) {
			value += this.input[this.position];
			this.position++;
		}

		return this.makeToken('WHITESPACE', value, startPos);
	}

	/**
	 * Scans a LaTeX command starting with \.
	 */
	private scanCommand(): Token {
		const startPos = this.position;
		this.position++; // Skip the backslash

		// Handle special single-character commands
		if (this.position < this.length) {
			const nextChar = this.input[this.position];

			// Single non-letter character after backslash (like \{, \}, \%, etc.)
			if (!this.isLetter(nextChar) && !this.isDigit(nextChar)) {
				this.position++;
				return this.makeToken('COMMAND', nextChar, startPos);
			}
		}

		// Read the command name (letters only)
		let commandName = '';
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			commandName += this.input[this.position];
			this.position++;
		}

		// If no letters after backslash, return just the backslash as a command
		if (commandName === '') {
			return this.makeToken('COMMAND', '', startPos);
		}

		return this.makeToken('COMMAND', commandName, startPos);
	}

	/**
	 * Scans a number (integer or decimal).
	 */
	private scanNumber(): Token {
		const startPos = this.position;
		let value = '';
		let hasDecimal = false;

		// Handle leading decimal point
		if (this.input[this.position] === '.') {
			value = '.';
			hasDecimal = true;
			this.position++;
		}

		// Scan integer part or fractional part
		while (this.position < this.length) {
			const char = this.input[this.position];

			if (this.isDigit(char)) {
				value += char;
				this.position++;
			} else if (char === '.' && !hasDecimal) {
				// Decimal point
				value += char;
				hasDecimal = true;
				this.position++;
			} else {
				break;
			}
		}

		return this.makeToken('NUMBER', value, startPos);
	}

	/**
	 * Scans a single letter.
	 */
	private scanLetter(): Token {
		const startPos = this.position;
		const value = this.input[this.position];
		this.position++;
		return this.makeToken('LETTER', value, startPos);
	}

	/**
	 * Scans a single character token.
	 */
	private scanSingleChar(): Token {
		const startPos = this.position;
		const char = this.input[this.position];
		this.position++;

		const type = this.charToTokenType(char);
		return this.makeToken(type, char, startPos);
	}

	/**
	 * Maps a single character to its token type.
	 */
	private charToTokenType(char: string): TokenType {
		switch (char) {
			case '+':
				return 'PLUS';
			case '-':
				return 'MINUS';
			case '*':
				return 'STAR';
			case '/':
				return 'SLASH';
			case '^':
				return 'CARET';
			case '_':
				return 'UNDERSCORE';
			case '~':
				return 'TILDE';
			case '{':
				return 'LBRACE';
			case '}':
				return 'RBRACE';
			case '(':
				return 'LPAREN';
			case ')':
				return 'RPAREN';
			case '[':
				return 'LBRACKET';
			case ']':
				return 'RBRACKET';
			case '|':
				return 'PIPE';
			case '=':
				return 'EQUALS';
			case '<':
				return 'LESS';
			case '>':
				return 'GREATER';
			case ',':
				return 'COMMA';
			case ':':
				return 'COLON';
			case ';':
				return 'SEMICOLON';
			case '!':
				return 'EXCLAMATION';
			case '&':
				return 'AMPERSAND';
			default:
				// Unknown character - treat as a letter for now
				// The parser will handle unknown characters appropriately
				return 'LETTER';
		}
	}

	/**
	 * Creates a token with the given type, value, and position.
	 */
	private makeToken(type: TokenType, value: string, position: number): Token {
		return {
			type,
			value,
			position,
			length: type === 'COMMAND' ? value.length + 1 : value.length // +1 for backslash in commands
		};
	}

	// =========================================================================
	// Character Classification Helpers
	// =========================================================================

	private isWhitespace(char: string): boolean {
		return char === ' ' || char === '\t' || char === '\n' || char === '\r';
	}

	private isDigit(char: string): boolean {
		return char >= '0' && char <= '9';
	}

	private isDigitAt(pos: number): boolean {
		return pos < this.length && this.isDigit(this.input[pos]);
	}

	private isLetter(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
	}
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Tokenizes a LaTeX string and returns all tokens.
 *
 * This is a convenience function that creates a Tokenizer and collects
 * all tokens into an array.
 *
 * @param input - The LaTeX string to tokenize
 * @returns Array of all tokens, including EOF
 *
 * @example
 * const tokens = tokenize('x + 2');
 * // [
 * //   { type: 'LETTER', value: 'x', position: 0, length: 1 },
 * //   { type: 'WHITESPACE', value: ' ', position: 1, length: 1 },
 * //   { type: 'PLUS', value: '+', position: 2, length: 1 },
 * //   { type: 'WHITESPACE', value: ' ', position: 3, length: 1 },
 * //   { type: 'NUMBER', value: '2', position: 4, length: 1 },
 * //   { type: 'EOF', value: '', position: 5, length: 0 }
 * // ]
 */
export function tokenize(input: string): Token[] {
	const tokenizer = new Tokenizer(input);
	const tokens: Token[] = [];

	let token = tokenizer.nextToken();
	while (token.type !== 'EOF') {
		tokens.push(token);
		token = tokenizer.nextToken();
	}
	tokens.push(token); // Include EOF token

	return tokens;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Filters out whitespace tokens from a token array.
 * Useful when whitespace is not semantically significant.
 *
 * @param tokens - Array of tokens
 * @returns New array with whitespace tokens removed
 */
export function filterWhitespace(tokens: readonly Token[]): Token[] {
	return tokens.filter((t) => t.type !== 'WHITESPACE');
}

/**
 * Checks if a token represents a binary operator.
 */
export function isBinaryOperator(token: Token): boolean {
	return (
		token.type === 'PLUS' ||
		token.type === 'MINUS' ||
		token.type === 'STAR' ||
		token.type === 'SLASH'
	);
}

/**
 * Checks if a token represents a relation.
 */
export function isRelationToken(token: Token): boolean {
	if (token.type === 'EQUALS' || token.type === 'LESS' || token.type === 'GREATER') {
		return true;
	}

	// Check for relation commands
	if (token.type === 'COMMAND') {
		const relationCommands = [
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
			'impliedby'
		];
		return relationCommands.includes(token.value);
	}

	return false;
}

/**
 * Checks if a token is a left delimiter that could start a group.
 */
export function isLeftDelimiter(token: Token): boolean {
	return (
		token.type === 'LPAREN' ||
		token.type === 'LBRACE' ||
		token.type === 'LBRACKET' ||
		token.type === 'PIPE' ||
		(token.type === 'COMMAND' && token.value === 'left')
	);
}

/**
 * Checks if a token is a right delimiter that could end a group.
 */
export function isRightDelimiter(token: Token): boolean {
	return (
		token.type === 'RPAREN' ||
		token.type === 'RBRACE' ||
		token.type === 'RBRACKET' ||
		token.type === 'PIPE' ||
		(token.type === 'COMMAND' && token.value === 'right')
	);
}

/**
 * Gets a human-readable description of a token type.
 */
export function tokenTypeToString(type: TokenType): string {
	switch (type) {
		case 'NUMBER':
			return 'number';
		case 'LETTER':
			return 'letter';
		case 'COMMAND':
			return 'command';
		case 'PLUS':
			return "'+'";
		case 'MINUS':
			return "'-'";
		case 'STAR':
			return "'*'";
		case 'SLASH':
			return "'/'";
		case 'CARET':
			return "'^'";
		case 'UNDERSCORE':
			return "'_'";
		case 'TILDE':
			return "'~'";
		case 'LBRACE':
			return "'{'";
		case 'RBRACE':
			return "'}'";
		case 'LPAREN':
			return "'('";
		case 'RPAREN':
			return "')'";
		case 'LBRACKET':
			return "'['";
		case 'RBRACKET':
			return "']'";
		case 'PIPE':
			return "'|'";
		case 'EQUALS':
			return "'='";
		case 'LESS':
			return "'<'";
		case 'GREATER':
			return "'>'";
		case 'COMMA':
			return "','";
		case 'COLON':
			return "':'";
		case 'SEMICOLON':
			return "';'";
		case 'EXCLAMATION':
			return "'!'";
		case 'AMPERSAND':
			return "'&'";
		case 'WHITESPACE':
			return 'whitespace';
		case 'EOF':
			return 'end of input';
	}
}

/**
 * Returns a human-readable representation of a token.
 */
export function tokenToString(token: Token): string {
	if (token.type === 'EOF') {
		return 'EOF';
	}
	if (token.type === 'WHITESPACE') {
		return 'WHITESPACE';
	}
	if (token.type === 'COMMAND') {
		return `\\${token.value}`;
	}
	return token.value;
}
