/**
 * Pattern Syntax Tokenizer
 *
 * Converts pattern strings into a stream of tokens for pattern parsing.
 * Extends the regular tokenizer syntax with WILDCARD tokens for pattern matching.
 *
 * Features:
 * - WILDCARD: Letters are wildcards by default (`x`, `a`, `n`)
 *   - Constraints: `x:number`, `x:integer`, `x:positive`, etc.
 * - SEQUENCES: `__x` for sequence (1+), `___x` for optional sequence (0+)
 * - LITERAL_VAR: `$x` for literal variable matching (rare use case)
 *
 * Note: Single underscore `_x` is NOT supported. Use `x` directly.
 *
 * @example
 * // Tokenize a pattern with wildcards (letters are wildcards by default)
 * const tokenizer = new PatternTokenizer('x + y:number');
 * // Produces: WILDCARD(x), PLUS, WILDCARD(y:number)
 *
 * // Sequences
 * const tokenizer2 = new PatternTokenizer('a + __rest');
 * // Produces: WILDCARD(a), PLUS, WILDCARD(__rest, sequence)
 *
 * @module mathAST/parser/custom/pattern-tokenizer
 */

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token types for pattern syntax lexing.
 *
 * Includes all types from the regular tokenizer plus:
 * - WILDCARD: Pattern wildcard - letters are wildcards by default (`x`, `a`)
 *   Use `__x` for sequences (1+) or `___x` for optional sequences (0+)
 * - LITERAL_VAR: Literal variable matching with `$x` syntax (rare)
 */
export type PatternTokenType =
	| 'NUMBER' // 42, 3.14, 3,14 (comma as decimal separator too)
	| 'LETTER' // NOT USED IN PATTERNS - letters become WILDCARD
	| 'BACKSLASH' // \ (for symbols)
	| 'SYMBOL' // pi, alpha, beta, gamma, theta, infty (after \)
	| 'FUNC' // sin, cos, tan, ln, log, exp, sqrt
	| 'PLUS' // +
	| 'MINUS' // -
	| 'STAR' // *
	| 'SLASH' // /
	| 'COLON' // :
	| 'COLON_SLASH' // :/ (TWO chars, single token)
	| 'CARET' // ^
	| 'PIPE' // |
	| 'AT' // @
	| 'HASH' // # (for hex colors)
	| 'QUESTION' // ? (for holes/placeholders)
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'LBRACE' // {
	| 'RBRACE' // }
	| 'LBRACKET' // [
	| 'RBRACKET' // ]
	| 'EQUALS' // =
	| 'LESS' // <
	| 'GREATER' // >
	| 'LESS_EQUAL' // <=
	| 'GREATER_EQUAL' // >=
	| 'NOT_EQUAL' // !=
	| 'IFF' // <=>
	| 'IMPLIES' // =>
	| 'COMMA' // , (for function args, NOT decimal when between digits)
	| 'WILDCARD' // x, _x, x:constraint, __x (sequence), ___x (optional sequence)
	| 'LITERAL_VAR' // $x for literal variable matching
	| 'ARROW' // -> (for rule syntax)
	| 'SEMICOLON' // ; (for rule conditions)
	| 'EOF';

// =============================================================================
// Constraint Types
// =============================================================================

/**
 * Valid constraint names for wildcards.
 * Maps to the `kind` field of PatternConstraint in pattern/types.ts
 */
export type WildcardConstraintName =
	| 'number'
	| 'integer'
	| 'positive'
	| 'negative'
	| 'nonzero'
	| 'variable';

/**
 * Set of valid constraint names for fast lookup
 */
const VALID_CONSTRAINTS: ReadonlySet<string> = new Set<WildcardConstraintName>([
	'number',
	'integer',
	'positive',
	'negative',
	'nonzero',
	'variable'
]);

/**
 * Type guard to check if a string is a valid constraint name
 */
export function isValidConstraintName(name: string): name is WildcardConstraintName {
	return VALID_CONSTRAINTS.has(name);
}

// =============================================================================
// Token Interface
// =============================================================================

/**
 * Wildcard sequence type for __x and ___x patterns
 */
export type WildcardSequenceType = 'single' | 'sequence' | 'optional-sequence';

/**
 * Represents a single token from the pattern syntax lexer.
 *
 * All properties are readonly to ensure immutability.
 * WILDCARD tokens have additional wildcardName and optional constraintName fields.
 *
 * @example
 * // A wildcard token (letter is wildcard by default)
 * { type: 'WILDCARD', value: 'x', position: 0, length: 1, wildcardName: 'x', sequenceType: 'single' }
 *
 * // A wildcard token with constraint
 * { type: 'WILDCARD', value: 'y:number', position: 4, length: 8, wildcardName: 'y', constraintName: 'number', sequenceType: 'single' }
 *
 * // A sequence wildcard (__x matches 1+ elements)
 * { type: 'WILDCARD', value: '__rest', position: 0, length: 6, wildcardName: 'rest', sequenceType: 'sequence' }
 *
 * // A literal variable ($x matches exactly variable 'x')
 * { type: 'LITERAL_VAR', value: '$x', position: 0, length: 2, literalName: 'x' }
 */
export interface PatternToken {
	/** The type of this token */
	readonly type: PatternTokenType;

	/** The raw string value of this token */
	readonly value: string;

	/** The starting position in the input string (0-indexed, after whitespace stripping) */
	readonly position: number;

	/** The length of this token in the input string */
	readonly length: number;

	/** For WILDCARD tokens: the name part (e.g., 'x' from 'x' or '_x') */
	readonly wildcardName?: string;

	/** For WILDCARD tokens: the optional constraint (e.g., 'number' from 'x:number') */
	readonly constraintName?: WildcardConstraintName;

	/** For WILDCARD tokens: sequence type (single, sequence for __, optional-sequence for ___) */
	readonly sequenceType?: WildcardSequenceType;

	/** For LITERAL_VAR tokens: the literal variable name (e.g., 'x' from '$x') */
	readonly literalName?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid symbol names that can appear after backslash
 */
const VALID_SYMBOLS: ReadonlySet<string> = new Set([
	'pi',
	'alpha',
	'beta',
	'gamma',
	'theta',
	'infty'
]);

/**
 * Function names sorted by length (longest first) for greedy matching.
 * This ensures that "sqrt" is matched before "s" when checking prefixes.
 */
const FUNCTION_NAMES_BY_LENGTH: readonly string[] = [
	'sqrt', // 4 chars
	'sin', // 3 chars
	'cos', // 3 chars
	'tan', // 3 chars
	'log', // 3 chars
	'exp', // 3 chars
	'ln' // 2 chars
];

// =============================================================================
// Tokenizer Class
// =============================================================================

/**
 * Pattern syntax tokenizer that provides both streaming and batch tokenization.
 *
 * Whitespace is stripped from input at construction time.
 * Recognizes all regular math tokens plus WILDCARD tokens for patterns.
 *
 * Usage:
 * ```typescript
 * // Streaming (one token at a time)
 * const tokenizer = new PatternTokenizer('x + y:number');
 * while (tokenizer.peek().type !== 'EOF') {
 *   const token = tokenizer.nextToken();
 *   // process token
 * }
 *
 * // Batch (all tokens at once)
 * const tokens = tokenizePattern('x + y:number');
 * ```
 */
export class PatternTokenizer {
	private readonly input: string;
	private readonly length: number;
	private position: number = 0;
	private tokenCache: PatternToken[] = [];
	private cachePosition: number = 0;

	constructor(input: string) {
		// Strip all whitespace at construction time
		this.input = input.replace(/\s+/g, '');
		this.length = this.input.length;
	}

	/**
	 * Returns the next token and advances the position.
	 */
	nextToken(): PatternToken {
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
	peek(): PatternToken {
		return this.peekAt(0);
	}

	/**
	 * Returns the token after peek() without advancing.
	 * Convenience method equivalent to peekAt(1).
	 */
	peekNext(): PatternToken {
		return this.peekAt(1);
	}

	/**
	 * Returns a token at a specific offset from the current position.
	 * Offset 0 is the next token, offset 1 is the token after that, etc.
	 */
	peekAt(offset: number): PatternToken {
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

	/**
	 * Returns the processed input (with whitespace stripped).
	 */
	getInput(): string {
		return this.input;
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Scans and returns the next token from the input.
	 */
	private scanToken(): PatternToken {
		// Check for EOF
		if (this.position >= this.length) {
			return this.makeToken('EOF', '', this.position);
		}

		const char = this.input[this.position];

		// Dollar sign: literal variable ($x)
		if (char === '$') {
			return this.scanLiteralVariable();
		}

		// Underscore: check if this is a wildcard pattern with _ prefix
		if (char === '_') {
			return this.scanUnderscoreWildcard();
		}

		// Backslash symbol (starts with \)
		if (char === '\\') {
			return this.scanBackslashSymbol();
		}

		// Number (digit or comma/dot that starts a decimal)
		if (this.isDigit(char)) {
			return this.scanNumber();
		}

		// Letter: in pattern syntax, letters are wildcards by default
		if (this.isLetter(char)) {
			return this.scanLetterWildcard();
		}

		// Multi-character operators and relations
		// Must check longer sequences first

		// <=>
		if (char === '<' && this.peekChar(1) === '=' && this.peekChar(2) === '>') {
			return this.scanMultiChar('IFF', '<=>', 3);
		}

		// <=
		if (char === '<' && this.peekChar(1) === '=') {
			return this.scanMultiChar('LESS_EQUAL', '<=', 2);
		}

		// >=
		if (char === '>' && this.peekChar(1) === '=') {
			return this.scanMultiChar('GREATER_EQUAL', '>=', 2);
		}

		// !=
		if (char === '!' && this.peekChar(1) === '=') {
			return this.scanMultiChar('NOT_EQUAL', '!=', 2);
		}

		// =>
		if (char === '=' && this.peekChar(1) === '>') {
			return this.scanMultiChar('IMPLIES', '=>', 2);
		}

		// :/
		if (char === ':' && this.peekChar(1) === '/') {
			return this.scanMultiChar('COLON_SLASH', ':/', 2);
		}

		// -> (MUST be checked BEFORE single - is scanned)
		if (char === '-' && this.peekChar(1) === '>') {
			return this.scanMultiChar('ARROW', '->', 2);
		}

		// Single character tokens
		return this.scanSingleChar();
	}

	/**
	 * Scans a literal variable starting with $.
	 * $x matches exactly the variable named "x".
	 */
	private scanLiteralVariable(): PatternToken {
		const startPos = this.position;
		this.position++; // Skip the $

		// Check if followed by a letter (required)
		if (this.position >= this.length || !this.isLetter(this.input[this.position])) {
			throw new Error(
				`Invalid pattern syntax at position ${startPos}: '$' must be followed by a letter to form a literal variable (e.g., '$x')`
			);
		}

		// Scan the variable name (one or more letters)
		let literalName = '';
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			literalName += this.input[this.position];
			this.position++;
		}

		const value = this.input.slice(startPos, this.position);

		return {
			type: 'LITERAL_VAR',
			value,
			position: startPos,
			length: this.position - startPos,
			literalName
		};
	}

	/**
	 * Scans a sequence wildcard starting with underscores.
	 *
	 * Patterns:
	 * - `__x` or `__x:constraint` - sequence wildcard (1+ elements)
	 * - `___x` or `___x:constraint` - optional sequence wildcard (0+ elements)
	 *
	 * Single underscore `_x` is NOT supported - use `x` directly for wildcards.
	 */
	private scanUnderscoreWildcard(): PatternToken {
		const startPos = this.position;

		// Count underscores
		let underscoreCount = 0;
		while (this.position < this.length && this.input[this.position] === '_') {
			underscoreCount++;
			this.position++;
		}

		// Single underscore is not allowed - must use letter directly
		if (underscoreCount === 1) {
			throw new Error(
				`Invalid pattern syntax at position ${startPos}: '_x' syntax is not supported. Use 'x' directly for wildcards, '__x' for sequences (1+), or '___x' for optional sequences (0+).`
			);
		}

		// Check if followed by a letter (required for sequence wildcard)
		if (this.position >= this.length || !this.isLetter(this.input[this.position])) {
			throw new Error(
				`Invalid pattern syntax at position ${startPos}: '${'_'.repeat(underscoreCount)}' must be followed by a letter (e.g., '__rest', '___opt')`
			);
		}

		// Determine sequence type
		const sequenceType: WildcardSequenceType =
			underscoreCount >= 3 ? 'optional-sequence' : 'sequence';

		// Scan the wildcard name (one or more letters)
		let wildcardName = '';
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			wildcardName += this.input[this.position];
			this.position++;
		}

		// Check for optional constraint (`:constraint`)
		const constraintName = this.scanOptionalConstraint();

		const value = this.input.slice(startPos, this.position);

		return {
			type: 'WILDCARD',
			value,
			position: startPos,
			length: this.position - startPos,
			wildcardName,
			constraintName,
			sequenceType
		};
	}

	/**
	 * Scans a letter which becomes a wildcard in pattern syntax.
	 * In patterns, letters like 'x', 'a', 'n' are wildcards by default.
	 * Function names (sin, cos, etc.) are still recognized as functions.
	 */
	private scanLetterWildcard(): PatternToken {
		const startPos = this.position;

		// Look ahead to see the full identifier starting here
		let identifier = '';
		let tempPos = this.position;
		while (tempPos < this.length && this.isLetter(this.input[tempPos])) {
			identifier += this.input[tempPos];
			tempPos++;
		}

		// Check if this is a function name (sin, cos, etc.)
		// We check longest functions first to ensure greedy matching
		for (const funcName of FUNCTION_NAMES_BY_LENGTH) {
			if (identifier.startsWith(funcName)) {
				// Check if followed by '(' - this confirms it's a function
				const afterFunc = startPos + funcName.length;
				if (afterFunc < this.length && this.input[afterFunc] === '(') {
					this.position = afterFunc;
					return {
						type: 'FUNC',
						value: funcName,
						position: startPos,
						length: funcName.length
					};
				}
			}
		}

		// Not a function - treat as wildcard
		// Scan the full name (for multi-letter wildcards like 'rest', 'coeff')
		let wildcardName = '';
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			wildcardName += this.input[this.position];
			this.position++;
		}

		// Check for optional constraint (`:constraint`)
		const constraintName = this.scanOptionalConstraint();

		const value = this.input.slice(startPos, this.position);

		return {
			type: 'WILDCARD',
			value,
			position: startPos,
			length: this.position - startPos,
			wildcardName,
			constraintName,
			sequenceType: 'single'
		};
	}

	/**
	 * Scans an optional constraint suffix like `:number` or `:positive`.
	 * Returns undefined if no constraint is present.
	 */
	private scanOptionalConstraint(): WildcardConstraintName | undefined {
		if (this.position >= this.length || this.input[this.position] !== ':') {
			return undefined;
		}

		const colonPos = this.position;
		this.position++; // Skip the colon

		// Read the constraint name (letters only)
		let constraintStr = '';
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			constraintStr += this.input[this.position];
			this.position++;
		}

		if (constraintStr === '') {
			throw new Error(
				`Invalid pattern syntax at position ${colonPos}: ':' must be followed by a constraint name (number, integer, positive, negative, nonzero, variable)`
			);
		}

		if (!isValidConstraintName(constraintStr)) {
			throw new Error(
				`Invalid constraint '${constraintStr}' at position ${colonPos + 1}. Valid constraints: number, integer, positive, negative, nonzero, variable`
			);
		}

		return constraintStr;
	}

	/**
	 * Scans a backslash followed by a symbol name.
	 */
	private scanBackslashSymbol(): PatternToken {
		const startPos = this.position;
		this.position++; // Skip the backslash

		// If at end or next char is not a letter, return just backslash
		if (this.position >= this.length || !this.isLetter(this.input[this.position])) {
			return this.makeToken('BACKSLASH', '\\', startPos);
		}

		// Read the symbol name (letters only)
		let symbolName = '';
		const symbolStart = this.position;
		while (this.position < this.length && this.isLetter(this.input[this.position])) {
			symbolName += this.input[this.position];
			this.position++;
		}

		// Validate that it's a known symbol
		if (VALID_SYMBOLS.has(symbolName)) {
			return {
				type: 'SYMBOL',
				value: symbolName,
				position: startPos,
				length: this.position - startPos
			};
		}

		// Unknown symbol - reset position and return just backslash
		// Then the identifier will be scanned separately
		this.position = symbolStart;
		return this.makeToken('BACKSLASH', '\\', startPos);
	}

	/**
	 * Scans a number (integer or decimal with dot or comma).
	 *
	 * Rules:
	 * - 42 -> NUMBER "42"
	 * - 3.14 -> NUMBER "3.14"
	 * - 3,14 -> NUMBER "3.14" (comma normalized to dot)
	 * - Comma is only decimal if preceded AND followed by digits
	 */
	private scanNumber(): PatternToken {
		const startPos = this.position;
		let value = '';
		let hasDecimal = false;

		// Scan integer part
		while (this.position < this.length && this.isDigit(this.input[this.position])) {
			value += this.input[this.position];
			this.position++;
		}

		// Check for decimal separator (dot or comma)
		if (this.position < this.length) {
			const char = this.input[this.position];
			if ((char === '.' || char === ',') && this.isDigitAt(this.position + 1)) {
				// This is a decimal separator
				value += '.'; // Normalize comma to dot
				hasDecimal = true;
				this.position++;

				// Scan fractional part
				while (this.position < this.length && this.isDigit(this.input[this.position])) {
					value += this.input[this.position];
					this.position++;
				}
			} else if (char === '.' && !hasDecimal) {
				// Trailing dot (e.g., "42.")
				value += '.';
				this.position++;
			}
		}

		return {
			type: 'NUMBER',
			value,
			position: startPos,
			length: this.position - startPos
		};
	}

	/**
	 * Scans a multi-character token.
	 */
	private scanMultiChar(type: PatternTokenType, value: string, length: number): PatternToken {
		const startPos = this.position;
		this.position += length;
		return {
			type,
			value,
			position: startPos,
			length
		};
	}

	/**
	 * Scans a single character token.
	 */
	private scanSingleChar(): PatternToken {
		const startPos = this.position;
		const char = this.input[this.position];
		this.position++;

		const type = this.charToTokenType(char);
		return this.makeToken(type, char, startPos);
	}

	/**
	 * Maps a single character to its token type.
	 */
	private charToTokenType(char: string): PatternTokenType {
		switch (char) {
			case '+':
				return 'PLUS';
			case '-':
				return 'MINUS';
			case '*':
				return 'STAR';
			case '/':
				return 'SLASH';
			case ':':
				return 'COLON';
			case '^':
				return 'CARET';
			case '|':
				return 'PIPE';
			case '@':
				return 'AT';
			case '#':
				return 'HASH';
			case '?':
				return 'QUESTION';
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
			case '=':
				return 'EQUALS';
			case '<':
				return 'LESS';
			case '>':
				return 'GREATER';
			case ',':
				return 'COMMA';
			case ';':
				return 'SEMICOLON';
			case '!':
				// Standalone ! (not followed by =) - treat as unknown, use LETTER as fallback
				return 'LETTER';
			default:
				// Unknown character - treat as a letter for now
				return 'LETTER';
		}
	}

	/**
	 * Creates a token with the given type, value, and position.
	 */
	private makeToken(type: PatternTokenType, value: string, position: number): PatternToken {
		return {
			type,
			value,
			position,
			length: value.length
		};
	}

	// =========================================================================
	// Character Classification Helpers
	// =========================================================================

	private isDigit(char: string): boolean {
		return char >= '0' && char <= '9';
	}

	private isDigitAt(pos: number): boolean {
		return pos < this.length && this.isDigit(this.input[pos]);
	}

	private isLetter(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
	}

	/**
	 * Peeks at a character at a given offset from current position.
	 * Returns empty string if out of bounds.
	 */
	private peekChar(offset: number): string {
		const pos = this.position + offset;
		return pos < this.length ? this.input[pos] : '';
	}
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Tokenizes a pattern syntax string and returns all tokens.
 *
 * This is a convenience function that creates a PatternTokenizer and collects
 * all tokens into an array.
 *
 * @param input - The pattern syntax string to tokenize
 * @returns Array of all tokens, including EOF
 *
 * @example
 * const tokens = tokenizePattern('x + y:number');
 * // [
 * //   { type: 'WILDCARD', value: 'x', position: 0, length: 1, wildcardName: 'x' },
 * //   { type: 'PLUS', value: '+', position: 2, length: 1 },
 * //   { type: 'WILDCARD', value: 'y:number', position: 4, length: 8, wildcardName: 'y', constraintName: 'number' },
 * //   { type: 'EOF', value: '', position: 12, length: 0 }
 * // ]
 */
export function tokenizePattern(input: string): PatternToken[] {
	const tokenizer = new PatternTokenizer(input);
	const tokens: PatternToken[] = [];

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
 * Checks if a token represents a binary operator.
 */
export function isBinaryOperator(token: PatternToken): boolean {
	return (
		token.type === 'PLUS' ||
		token.type === 'MINUS' ||
		token.type === 'STAR' ||
		token.type === 'SLASH' ||
		token.type === 'COLON' ||
		token.type === 'COLON_SLASH'
	);
}

/**
 * Checks if a token represents a relation.
 */
export function isRelationToken(token: PatternToken): boolean {
	return (
		token.type === 'EQUALS' ||
		token.type === 'LESS' ||
		token.type === 'GREATER' ||
		token.type === 'LESS_EQUAL' ||
		token.type === 'GREATER_EQUAL' ||
		token.type === 'NOT_EQUAL' ||
		token.type === 'IFF' ||
		token.type === 'IMPLIES'
	);
}

/**
 * Checks if a token is a left delimiter that could start a group.
 */
export function isLeftDelimiter(token: PatternToken): boolean {
	return (
		token.type === 'LPAREN' ||
		token.type === 'LBRACE' ||
		token.type === 'LBRACKET' ||
		token.type === 'PIPE'
	);
}

/**
 * Checks if a token is a right delimiter that could end a group.
 */
export function isRightDelimiter(token: PatternToken): boolean {
	return (
		token.type === 'RPAREN' ||
		token.type === 'RBRACE' ||
		token.type === 'RBRACKET' ||
		token.type === 'PIPE'
	);
}

/**
 * Checks if a token is a wildcard.
 */
export function isWildcardToken(token: PatternToken): boolean {
	return token.type === 'WILDCARD';
}

/**
 * Gets a human-readable description of a token type.
 */
export function tokenTypeToString(type: PatternTokenType): string {
	switch (type) {
		case 'NUMBER':
			return 'number';
		case 'LETTER':
			return 'letter';
		case 'SYMBOL':
			return 'symbol';
		case 'BACKSLASH':
			return 'backslash';
		case 'FUNC':
			return 'function';
		case 'WILDCARD':
			return 'wildcard';
		case 'PLUS':
			return "'+'";
		case 'MINUS':
			return "'-'";
		case 'STAR':
			return "'*'";
		case 'SLASH':
			return "'/'";
		case 'COLON':
			return "':'";
		case 'COLON_SLASH':
			return "':/'";
		case 'CARET':
			return "'^'";
		case 'PIPE':
			return "'|'";
		case 'AT':
			return "'@'";
		case 'HASH':
			return "'#'";
		case 'QUESTION':
			return "'?'";
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
		case 'EQUALS':
			return "'='";
		case 'LESS':
			return "'<'";
		case 'GREATER':
			return "'>'";
		case 'LESS_EQUAL':
			return "'<='";
		case 'GREATER_EQUAL':
			return "'>='";
		case 'NOT_EQUAL':
			return "'!='";
		case 'IFF':
			return "'<=>'";
		case 'IMPLIES':
			return "'=>'";
		case 'COMMA':
			return "','";
		case 'ARROW':
			return "'->'";
		case 'SEMICOLON':
			return "';'";
		case 'EOF':
			return 'end of input';
	}
}

/**
 * Returns a human-readable representation of a token.
 */
export function tokenToString(token: PatternToken): string {
	if (token.type === 'EOF') {
		return 'EOF';
	}
	if (token.type === 'SYMBOL') {
		return `\\${token.value}`;
	}
	if (token.type === 'BACKSLASH') {
		return '\\';
	}
	if (token.type === 'WILDCARD') {
		return token.value;
	}
	return token.value;
}
