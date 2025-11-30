/**
 * Tokenizer for ASCIIMath expressions
 *
 * Converts ASCIIMath input into a stream of tokens for parsing.
 * Handles numbers, identifiers, functions, Greek letters, symbols,
 * operators, delimiters, templates, and whitespace.
 */

import type { Token, TokenType } from './types.js';
import { isGreekLetter, isFunction, isSymbol, getSymbolKeys } from './symbols.js';

/**
 * Tokenizer class that converts ASCIIMath strings into token streams
 */
export class Tokenizer {
	private input: string;
	private pos: number;
	private tokens: Token[];

	constructor(input: string) {
		this.input = input;
		this.pos = 0;
		this.tokens = [];
	}

	/**
	 * Tokenize the input string and return all tokens
	 */
	tokenize(): Token[] {
		this.tokens = [];
		this.pos = 0;

		while (!this.isAtEnd()) {
			this.scanToken();
		}

		// Add EOF token
		this.tokens.push({
			type: 'EOF',
			value: '',
			start: this.pos,
			end: this.pos
		});

		return this.tokens;
	}

	/**
	 * Peek at character at current position + offset
	 */
	private peek(offset: number = 0): string {
		const index = this.pos + offset;
		if (index >= this.input.length) return '';
		return this.input[index];
	}

	/**
	 * Advance position and return current character
	 */
	private advance(): string {
		if (this.isAtEnd()) return '';
		return this.input[this.pos++];
	}

	/**
	 * Check if we've reached the end of input
	 */
	private isAtEnd(): boolean {
		return this.pos >= this.input.length;
	}

	/**
	 * Check if character is whitespace
	 */
	private isWhitespace(char: string): boolean {
		return char === ' ' || char === '\t' || char === '\n' || char === '\r';
	}

	/**
	 * Check if character is a digit
	 */
	private isDigit(char: string): boolean {
		return char >= '0' && char <= '9';
	}

	/**
	 * Check if character is alphabetic
	 */
	private isAlpha(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
	}

	/**
	 * Check if character is alphanumeric
	 */
	private isAlphaNumeric(char: string): boolean {
		return this.isAlpha(char) || this.isDigit(char);
	}

	/**
	 * Scan and add the next token
	 */
	private scanToken(): void {
		const char = this.peek();

		// Whitespace
		if (this.isWhitespace(char)) {
			const start = this.pos;
			while (this.isWhitespace(this.peek())) {
				this.advance();
			}
			this.tokens.push({
				type: 'WHITESPACE',
				value: this.input.slice(start, this.pos),
				start,
				end: this.pos
			});
			return;
		}

		// Templates {{...}}
		if (char === '{' && this.peek(1) === '{') {
			this.scanTemplate();
			return;
		}

		// Numbers
		if (this.isDigit(char)) {
			this.scanNumber();
			return;
		}

		// Identifiers (including Greek, functions, word symbols)
		if (this.isAlpha(char)) {
			this.scanIdentifier();
			return;
		}

		// Multi-character symbols (must come before single-character operators)
		const symbolMatch = this.scanSymbol();
		if (symbolMatch) {
			return;
		}

		// Single-character operators and delimiters
		const start = this.pos;
		const ch = this.advance();

		switch (ch) {
			case '(':
				this.tokens.push({ type: 'LPAREN', value: ch, start, end: this.pos });
				break;
			case ')':
				this.tokens.push({ type: 'RPAREN', value: ch, start, end: this.pos });
				break;
			case '[':
				this.tokens.push({ type: 'LBRACKET', value: ch, start, end: this.pos });
				break;
			case ']':
				this.tokens.push({ type: 'RBRACKET', value: ch, start, end: this.pos });
				break;
			case '{':
				this.tokens.push({ type: 'LBRACE', value: ch, start, end: this.pos });
				break;
			case '}':
				this.tokens.push({ type: 'RBRACE', value: ch, start, end: this.pos });
				break;
			case '|':
				this.tokens.push({ type: 'PIPE', value: ch, start, end: this.pos });
				break;
			case '+':
			case '-':
			case '*':
			case '/':
			case '^':
			case '_':
			case '=':
			case '<':
			case '>':
			case ':':
				this.tokens.push({ type: 'OPERATOR', value: ch, start, end: this.pos });
				break;
			default:
				// Unknown character - skip it
				break;
		}
	}

	/**
	 * Scan a number token (integer or decimal)
	 */
	private scanNumber(): void {
		const start = this.pos;

		// Scan integer part
		while (this.isDigit(this.peek())) {
			this.advance();
		}

		// Check for decimal point
		if (this.peek() === '.' && this.isDigit(this.peek(1))) {
			// Consume the '.'
			this.advance();

			// Scan fractional part
			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}

		this.tokens.push({
			type: 'NUMBER',
			value: this.input.slice(start, this.pos),
			start,
			end: this.pos
		});
	}

	/**
	 * Scan an identifier and classify it as IDENTIFIER, GREEK, FUNCTION, or SYMBOL
	 */
	private scanIdentifier(): void {
		const start = this.pos;

		// Scan alphanumeric characters
		while (this.isAlphaNumeric(this.peek())) {
			this.advance();
		}

		const value = this.input.slice(start, this.pos);
		let type: TokenType = 'IDENTIFIER';

		// Classify the identifier
		if (isGreekLetter(value)) {
			type = 'GREEK';
		} else if (isFunction(value)) {
			type = 'FUNCTION';
		} else if (isSymbol(value)) {
			type = 'SYMBOL';
		}

		this.tokens.push({
			type,
			value,
			start,
			end: this.pos
		});
	}

	/**
	 * Scan a template placeholder {{...}}
	 * Handles nested braces correctly by counting depth
	 */
	private scanTemplate(): void {
		const start = this.pos;

		// Consume opening {{
		this.advance(); // first {
		this.advance(); // second {

		let depth = 1; // We're inside the first level of braces

		while (!this.isAtEnd() && depth > 0) {
			const char = this.peek();

			if (char === '{') {
				depth++;
				this.advance();
			} else if (char === '}') {
				// Check if this is part of closing }}
				if (this.peek(1) === '}' && depth === 1) {
					// This is our closing }}
					this.advance(); // first }
					this.advance(); // second }
					depth = 0;
				} else {
					// Just a regular closing brace
					depth--;
					this.advance();
				}
			} else {
				this.advance();
			}
		}

		this.tokens.push({
			type: 'TEMPLATE',
			value: this.input.slice(start, this.pos),
			start,
			end: this.pos
		});
	}

	/**
	 * Try to scan a multi-character symbol
	 * Returns true if a symbol was found and added
	 */
	private scanSymbol(): boolean {
		const symbolKeys = getSymbolKeys(); // Already sorted by length (longest first)

		for (const symbol of symbolKeys) {
			// Check if the input matches this symbol at current position
			let matches = true;
			for (let i = 0; i < symbol.length; i++) {
				if (this.peek(i) !== symbol[i]) {
					matches = false;
					break;
				}
			}

			if (matches) {
				const start = this.pos;
				// Consume all characters of the symbol
				for (let i = 0; i < symbol.length; i++) {
					this.advance();
				}

				this.tokens.push({
					type: 'SYMBOL',
					value: symbol,
					start,
					end: this.pos
				});

				return true;
			}
		}

		return false;
	}
}
