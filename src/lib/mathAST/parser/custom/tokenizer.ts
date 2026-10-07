/**
 * Custom Syntax Tokenizer
 *
 * Converts custom mathematical expressions into a stream of tokens.
 * This tokenizer is designed for a more concise, user-friendly syntax
 * compared to LaTeX.
 *
 * Features:
 * - Numbers (integers, decimals with dot or comma): 42, 3.14, 3,14
 * - Single letters: a-z, A-Z
 * - Backslash symbols: \pi, \alpha, \beta, \gamma, \theta, \infty
 * - Functions: sin, cos, tan, ln, log, exp, sqrt
 * - Operators: + - * / : :/ ^ _
 * - Assignment: := <- (variable/function assignment)
 * - Delimiters: { } ( ) [ ] |
 * - Relations: = < > <= >= != <=> =>
 * - Colors: @ # (for hex colors)
 * - Whitespace is stripped at construction time
 * - Position tracking for error reporting
 *
 * @module mathAST/parser/custom/tokenizer
 */

import { GREEK_LETTERS } from '../../types';

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token types for custom syntax lexing.
 *
 * Categories:
 * - Literals: NUMBER, LETTER
 * - Symbols: BACKSLASH, SYMBOL (for \pi, \alpha, etc.)
 * - Functions: FUNC (sin, cos, etc.)
 * - Operators: PLUS, MINUS, STAR, SLASH, COLON, COLON_SLASH, CARET, UNDERSCORE
 * - Delimiters: LBRACE, RBRACE, LPAREN, RPAREN, LBRACKET, RBRACKET, PIPE
 * - Relations: EQUALS, LESS, GREATER, LESS_EQUAL, GREATER_EQUAL, NOT_EQUAL, IFF, IMPLIES
 * - Punctuation: COMMA
 * - Colors: AT, HASH
 * - Special: EOF
 */
export type CustomTokenType =
	| 'NUMBER' // 42, 3.14, 3,14 (comma as decimal separator too)
	| 'LETTER' // single a-z, A-Z
	| 'BACKSLASH' // \ (for symbols)
	| 'SYMBOL' // pi, alpha, beta, gamma, theta, infty (after \)
	| 'FUNC' // sin, cos, tan, ln, log, exp, sqrt
	| 'KEYWORD' // true, false (boolean literals)
	| 'PLUS' // +
	| 'MINUS' // -
	| 'STAR' // *
	| 'SLASH' // /
	| 'COLON' // :
	| 'COLON_SLASH' // :/ (TWO chars, single token)
	| 'ASSIGN' // := (assignment operator)
	| 'ARROW' // <- (assignment operator, R-style)
	| 'CARET' // ^
	| 'UNDERSCORE' // _
	| 'PIPE' // |
	| 'AT' // @
	| 'HASH' // # (for hex colors)
	| 'QUESTION' // ? (for holes/placeholders)
	| 'PRIME' // ' (apostrophe for derivatives)
	| 'EXCLAMATION' // ! (logical NOT)
	| 'PERCENT' // % (pourcentage, postfixe)
	| 'AND_AND' // && (logical AND)
	| 'OR_OR' // || (logical OR)
	| 'LPAREN' // (
	| 'RPAREN' // )
	| 'LBRACE' // {
	| 'RBRACE' // }
	| 'LBRACKET' // [
	| 'RBRACKET' // ]
	| 'DOUBLE_LBRACKET' // [[ (matrix start)
	| 'DOUBLE_RBRACKET' // ]] (matrix end)
	| 'EQUALS' // =
	| 'LESS' // <
	| 'GREATER' // >
	| 'LESS_EQUAL' // <=
	| 'GREATER_EQUAL' // >=
	| 'NOT_EQUAL' // !=
	| 'IFF' // <=>
	| 'IMPLIES' // =>
	| 'COMMA' // , (for function args, NOT decimal when between digits)
	| 'EOF';

// =============================================================================
// Token Interface
// =============================================================================

/**
 * Represents a single token from the custom syntax lexer.
 *
 * All properties are readonly to ensure immutability.
 *
 * @example
 * // A number token
 * { type: 'NUMBER', value: '42', position: 0, length: 2 }
 *
 * // A symbol token
 * { type: 'SYMBOL', value: 'pi', position: 5, length: 3 }
 */
export interface CustomToken {
	/** The type of this token */
	readonly type: CustomTokenType;

	/** The raw string value of this token */
	readonly value: string;

	/** The starting position in the input string (0-indexed, after whitespace stripping) */
	readonly position: number;

	/** The length of this token in the input string */
	readonly length: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid symbol names that can appear after backslash
 */
export const VALID_SYMBOLS: ReadonlySet<string> = new Set([...GREEK_LETTERS, 'pi', 'infty']);

/**
 * Function names that are recognized as FUNC tokens.
 * Note: FUNCTION_NAMES_BY_LENGTH is used for actual matching.
 * This set is kept for potential validation/lookup purposes.
 */
const _FUNCTION_NAMES: ReadonlySet<string> = new Set([
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'ln',
	'log',
	'exp',
	'sqrt',
	// Racine cubique : cbrt(x) = sqrt[3](x)
	'cbrt',
	// Inverse trigonometric functions
	'arcsin',
	'arccos',
	'arctan',
	// Hyperbolic functions
	'sinh',
	'cosh',
	'tanh',
	'coth',
	'sech',
	'csch',
	// Inverse hyperbolic functions
	'arcsinh',
	'arccosh',
	'arctanh',
	// Rounding & piecewise functions
	'floor',
	'ceil',
	'round',
	'abs',
	'sign',
	'sgn',
	// Statistical functions
	'mean',
	'median',
	'variance',
	'stdev',
	'min',
	'max',
	'sum',
	// Number theory functions
	'gcd',
	'mod',
	// Combinatorics
	'factorial',
	'binom'
]);

/**
 * Keywords sorted by length (longest first) for greedy matching.
 */
const KEYWORDS_BY_LENGTH: readonly string[] = ['false', 'true'];

/**
 * Function names sorted by length (longest first) for greedy matching.
 * This ensures that "sqrt" is matched before "s" when checking prefixes.
 */
const FUNCTION_NAMES_BY_LENGTH: readonly string[] = [
	'factorial', // 9 chars
	'variance', // 8 chars
	'arcsinh', // 7 chars
	'arccosh', // 7 chars
	'arctanh', // 7 chars
	'arcsin', // 6 chars
	'arccos', // 6 chars
	'arctan', // 6 chars
	'median', // 6 chars
	'stdev', // 5 chars
	'binom', // 5 chars
	'floor', // 5 chars
	'round', // 5 chars
	'sign', // 4 chars
	'sinh', // 4 chars
	'cosh', // 4 chars
	'tanh', // 4 chars
	'coth', // 4 chars — avant 'cot', sinon "coth" se lit "cot"+"h"
	'sech', // 4 chars — avant 'sec'
	'csch', // 4 chars — avant 'csc'
	'sqrt', // 4 chars
	'cbrt', // 4 chars — racine cubique, lue sqrt[3]
	'mean', // 4 chars
	'ceil', // 4 chars
	'sin', // 3 chars
	'cos', // 3 chars
	'tan', // 3 chars
	'cot', // 3 chars
	'sec', // 3 chars
	'csc', // 3 chars
	'sgn', // 3 chars
	'log', // 3 chars
	'exp', // 3 chars
	'min', // 3 chars
	'max', // 3 chars
	'sum', // 3 chars
	'abs', // 3 chars
	'gcd', // 3 chars
	'mod', // 3 chars
	'ln' // 2 chars
];

// =============================================================================
// Noms de fonction : alias et noms inconnus
// =============================================================================

/**
 * Les alias usuels d'une fonction, lus sous le nom du MOTEUR.
 *
 * ⚠️ Sans eux, `acos(3x)` se lisait a·cos(3x) et `tg(3x)` t·g(3x), sans
 * aucune erreur. Un alias n'est reconnu que s'il forme TOUTE la suite de
 * lettres et qu'il est collé à `(` : `chx` ou `th` seuls restent des produits.
 */
export const FUNCTION_ALIASES: Readonly<Record<string, string>> = {
	acos: 'arccos',
	asin: 'arcsin',
	atan: 'arctan',
	Arccos: 'arccos',
	Arcsin: 'arcsin',
	Arctan: 'arctan',
	sh: 'sinh',
	ch: 'cosh',
	th: 'tanh',
	tg: 'tan'
};

/** Ce qu'est une suite de lettres collée à `(` : un alias ou un nom inconnu. */
export type FunctionCallReading =
	| { readonly kind: 'alias'; readonly name: string; readonly canonical: string }
	| { readonly kind: 'unknown'; readonly name: string };

function isAsciiLetter(char: string | undefined): boolean {
	return char !== undefined && /^[A-Za-z]$/.test(char);
}

/**
 * Lire la suite de lettres qui COMMENCE en `start`, si elle est collée à `(`.
 *
 * Règle (aucun nom de fonction lu en silence comme autre chose) :
 * - toute la suite est un alias (`acos`, `sh`, `tg`…) → `alias` ;
 * - elle commence par une fonction connue (`sin(`, `sqrt(`) → `null`, lecture habituelle ;
 * - deux lettres (`ab(x+1)`, `ax(x-2)`) → `null` : un produit, l'écriture courante ;
 * - UNE lettre puis une fonction connue (`xsin(x)`, `3bcos(x)`) → `null` : un produit ;
 * - sinon (`racine(`, `acoss(`, `arcos(`, `abc(`) → `unknown` : refusé, le
 *   message propose `a*b*c*(…)` pour un produit voulu.
 *
 * `null` aussi au milieu d'une suite (lettre avant) ou derrière `\` (commande).
 */
export function readFunctionCall(input: string, start: number): FunctionCallReading | null {
	if (!isAsciiLetter(input[start])) return null;
	const before = input[start - 1];
	if (isAsciiLetter(before) || before === '\\') return null;
	let end = start;
	while (isAsciiLetter(input[end])) end++;
	if (input[end] !== '(') return null;
	const name = input.slice(start, end);

	const canonical = FUNCTION_ALIASES[name];
	if (canonical !== undefined) return { kind: 'alias', name, canonical };
	if (FUNCTION_NAMES_BY_LENGTH.some((f) => name.startsWith(f))) return null;
	if (name.length <= 2) return null;
	if (FUNCTION_NAMES_BY_LENGTH.includes(name.slice(1))) return null;
	return { kind: 'unknown', name };
}

/** La première suite de lettres collée à `(` qui n'est ni une fonction ni un produit lisible. */
export function findUnknownFunctionCall(input: string): string | null {
	for (let i = 0; i < input.length; i++) {
		const reading = readFunctionCall(input, i);
		if (reading?.kind === 'unknown') return reading.name;
	}
	return null;
}

/** Les noms de fonction de la notation maison, alias compris. */
export const KNOWN_FUNCTION_NAMES: readonly string[] = [
	...FUNCTION_NAMES_BY_LENGTH,
	...Object.keys(FUNCTION_ALIASES)
];

/** Les fonctions citées par le message d'un nom inconnu. */
const SHOWN_FUNCTIONS = [
	'sqrt',
	'cbrt',
	'exp',
	'ln',
	'log',
	'sin',
	'cos',
	'tan',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'abs',
	'floor',
	'ceil',
	'round',
	'sign'
];

/** Le message d'un nom de fonction inconnu, en français. */
export function unknownFunctionMessage(name: string): string {
	return `Fonction inconnue : ${name}. Fonctions disponibles : ${SHOWN_FUNCTIONS.join(', ')}. Pour un produit, écris ${name.split('').join('*')}*(…).`;
}

// =============================================================================
// Tokenizer Class
// =============================================================================

/**
 * Custom syntax tokenizer that provides both streaming and batch tokenization.
 *
 * Whitespace is skipped dynamically during scanning to preserve comma semantics:
 * - "1,2" → decimal number 1.2 (French format)
 * - "1, 2" → two numbers 1 and 2 with comma separator (function arguments)
 *
 * Usage:
 * ```typescript
 * // Streaming (one token at a time)
 * const tokenizer = new CustomTokenizer('x + 2');
 * while (tokenizer.peek().type !== 'EOF') {
 *   const token = tokenizer.nextToken();
 *   // process token
 * }
 *
 * // Batch (all tokens at once)
 * const tokens = tokenize('x + 2');
 * ```
 */
export class CustomTokenizer {
	private readonly input: string;
	private readonly length: number;
	private position: number = 0;
	private tokenCache: CustomToken[] = [];
	private cachePosition: number = 0;
	/**
	 * Track matrix depth for context-aware comma parsing.
	 * Inside matrices ([[...]]), comma should NOT be treated as decimal separator.
	 */
	private matrixDepth: number = 0;
	/**
	 * Pile des parenthèses et accolades ouvertes : `call` pour la parenthèse d'un appel
	 * de fonction (`mod(`, `gcd(`), `group` pour toute autre. Dans un appel, la virgule
	 * entre deux chiffres sépare les arguments : `mod(16,4)` = mod(16 ; 4), jamais
	 * mod(16,4). Ambiguïté (`max(2,5)`) : le séparateur l'emporte. Un décimal à virgule
	 * reste possible dans un groupement intérieur : `mod((2,5)*4,3)`, `mod({2,5},4)`.
	 */
	private openers: Array<'call' | 'group'> = [];
	/** Type du dernier jeton produit (une parenthèse qui suit un FUNC ouvre un appel) */
	private lastTokenType: CustomTokenType | null = null;

	constructor(input: string) {
		// Keep original input (don't strip whitespace)
		// Whitespace is skipped dynamically during scanning
		this.input = input;
		this.length = this.input.length;
	}

	/**
	 * Skips over any whitespace at the current position.
	 */
	private skipWhitespace(): void {
		while (this.position < this.length && /\s/.test(this.input[this.position])) {
			this.position++;
		}
	}

	/**
	 * Returns the next token and advances the position.
	 */
	nextToken(): CustomToken {
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
	peek(): CustomToken {
		return this.peekAt(0);
	}

	/**
	 * Returns a token at a specific offset from the current position.
	 * Offset 0 is the next token, offset 1 is the token after that, etc.
	 */
	peekAt(offset: number): CustomToken {
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
		this.matrixDepth = 0;
		this.openers = [];
		this.lastTokenType = null;
	}

	/**
	 * Returns the current position in the input string.
	 */
	getPosition(): number {
		return this.position;
	}

	/**
	 * Returns the original input (whitespace preserved).
	 */
	getInput(): string {
		return this.input;
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Scans the next token and keeps track of the opened parentheses / braces.
	 */
	private scanToken(): CustomToken {
		const token = this.scanRawToken();
		if (token.type === 'LPAREN') {
			this.openers.push(this.lastTokenType === 'FUNC' ? 'call' : 'group');
		} else if (token.type === 'LBRACE') {
			this.openers.push('group');
		} else if (token.type === 'RPAREN' || token.type === 'RBRACE') {
			this.openers.pop();
		}
		this.lastTokenType = token.type;
		return token;
	}

	/** Vrai si la position courante est directement dans les parenthèses d'un appel */
	private isInsideFunctionCall(): boolean {
		return this.openers[this.openers.length - 1] === 'call';
	}

	/**
	 * Scans and returns the next token from the input.
	 */
	private scanRawToken(): CustomToken {
		// Skip any whitespace before the token
		this.skipWhitespace();

		// Check for EOF
		if (this.position >= this.length) {
			return this.makeToken('EOF', '', this.position);
		}

		const char = this.input[this.position];

		// Backslash symbol (starts with \)
		if (char === '\\') {
			return this.scanBackslashSymbol();
		}

		// Number (digit or comma/dot that starts a decimal)
		if (this.isDigit(char)) {
			return this.scanNumber();
		}

		// Letter or function name
		if (this.isLetter(char)) {
			return this.scanIdentifier();
		}

		// Multi-character operators and relations
		// Must check longer sequences first

		// <=>
		if (char === '<' && this.peekChar(1) === '=' && this.peekChar(2) === '>') {
			return this.scanMultiChar('IFF', '<=>', 3);
		}

		// <- (arrow assignment, MUST be before <= for greedy matching)
		// Only matches when chars are adjacent (no space between)
		if (char === '<' && this.peekChar(1) === '-') {
			return this.scanMultiChar('ARROW', '<-', 2);
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

		// && (logical AND)
		if (char === '&' && this.peekChar(1) === '&') {
			return this.scanMultiChar('AND_AND', '&&', 2);
		}

		// || (logical OR)
		if (char === '|' && this.peekChar(1) === '|') {
			return this.scanMultiChar('OR_OR', '||', 2);
		}

		// =>
		if (char === '=' && this.peekChar(1) === '>') {
			return this.scanMultiChar('IMPLIES', '=>', 2);
		}

		// :=
		if (char === ':' && this.peekChar(1) === '=') {
			return this.scanMultiChar('ASSIGN', ':=', 2);
		}

		// :/
		if (char === ':' && this.peekChar(1) === '/') {
			return this.scanMultiChar('COLON_SLASH', ':/', 2);
		}

		// [[ (matrix start)
		if (char === '[' && this.peekChar(1) === '[') {
			this.matrixDepth++;
			return this.scanMultiChar('DOUBLE_LBRACKET', '[[', 2);
		}

		// ]] (matrix end) — seulement dans une matrice : ailleurs, deux crochets
		// de calcul qui se ferment ensemble (`2[3(x+1)-[x-2]]`).
		if (char === ']' && this.peekChar(1) === ']' && this.matrixDepth > 0) {
			this.matrixDepth--;
			return this.scanMultiChar('DOUBLE_RBRACKET', ']]', 2);
		}

		// Single character tokens
		return this.scanSingleChar();
	}

	/**
	 * Scans a backslash followed by a symbol name.
	 */
	private scanBackslashSymbol(): CustomToken {
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
	 * Scans a number (integer, decimal, or scientific notation).
	 *
	 * Rules:
	 * - 42 -> NUMBER "42"
	 * - 3.14 -> NUMBER "3.14"
	 * - 3,14 -> NUMBER "3.14" (comma normalized to dot) - BUT NOT inside matrices
	 *   nor directly inside a function call: mod(16,4) -> 16 , 4
	 * - 1e10, 1E10, 1.5e-10, 3,14e10 -> Scientific notation
	 * - Comma is only decimal if preceded AND followed by digits
	 * - Inside matrices ([[...]]), comma is ALWAYS an element separator, never decimal
	 * - Directly inside a function call (`mod(`, `gcd(`, `max(`…), comma is ALWAYS an
	 *   argument separator: `max(2,5)` = 5 (the separator wins the ambiguity)
	 */
	private scanNumber(): CustomToken {
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
			// Comma is NOT a decimal separator inside matrices (matrixDepth > 0)
			// nor directly inside a function call (argument separator)
			const isCommaDecimal = char === ',' && this.matrixDepth === 0 && !this.isInsideFunctionCall();
			if ((char === '.' || isCommaDecimal) && this.isDigitAt(this.position + 1)) {
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

		// Check for exponent part (scientific notation)
		if (this.position < this.length) {
			const expChar = this.input[this.position];
			if (expChar === 'e' || expChar === 'E') {
				// Look ahead to validate exponent format
				let expStart = this.position + 1;

				// Check for optional sign
				if (
					expStart < this.length &&
					(this.input[expStart] === '+' || this.input[expStart] === '-')
				) {
					expStart++;
				}

				// Must have at least one digit after e/E or e+/e-
				if (expStart < this.length && this.isDigit(this.input[expStart])) {
					// Valid scientific notation - consume it all
					value += this.input[this.position]; // 'e' or 'E'
					this.position++;

					// Consume optional sign
					if (this.input[this.position] === '+' || this.input[this.position] === '-') {
						value += this.input[this.position];
						this.position++;
					}

					// Consume exponent digits
					while (this.position < this.length && this.isDigit(this.input[this.position])) {
						value += this.input[this.position];
						this.position++;
					}
				}
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
	 * Scans an identifier (letter sequence) and determines if it's a function or letter(s).
	 *
	 * Rules:
	 * - Function name at start of identifier -> FUNC (greedy match)
	 * - Single letter (if not start of function name) -> LETTER
	 * - Multi-letter non-function -> treated as consecutive letters (tokenized one at a time)
	 */
	private scanIdentifier(): CustomToken {
		const startPos = this.position;

		// Look ahead to see the full identifier starting here
		let identifier = '';
		let tempPos = this.position;
		while (tempPos < this.length && this.isLetter(this.input[tempPos])) {
			identifier += this.input[tempPos];
			tempPos++;
		}

		// Check for boolean keywords first (true, false)
		for (const keyword of KEYWORDS_BY_LENGTH) {
			if (identifier.startsWith(keyword)) {
				this.position = startPos + keyword.length;
				return {
					type: 'KEYWORD',
					value: keyword,
					position: startPos,
					length: keyword.length
				};
			}
		}

		// Alias (`acos(` → arccos) ou nom inconnu (`racine(`) : un FUNC, que le
		// parseur refuse s'il n'est pas connu — jamais une suite de lettres muette
		const call = readFunctionCall(this.input, startPos);
		if (call !== null) {
			this.position = startPos + call.name.length;
			return {
				type: 'FUNC',
				value: call.kind === 'alias' ? call.canonical : call.name,
				position: startPos,
				length: call.name.length
			};
		}

		// Check if any function name is a prefix of (or equals) this identifier
		// We check longest functions first to ensure greedy matching
		for (const funcName of FUNCTION_NAMES_BY_LENGTH) {
			if (identifier.startsWith(funcName)) {
				this.position = startPos + funcName.length;
				return {
					type: 'FUNC',
					value: funcName,
					position: startPos,
					length: funcName.length
				};
			}
		}

		// Not a function - return single letter
		const letter = this.input[this.position];
		this.position++;
		return {
			type: 'LETTER',
			value: letter,
			position: startPos,
			length: 1
		};
	}

	/**
	 * Scans a multi-character token.
	 */
	private scanMultiChar(type: CustomTokenType, value: string, length: number): CustomToken {
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
	private scanSingleChar(): CustomToken {
		const startPos = this.position;
		// Un POINT de code, pas une unité UTF-16 : `𝔻` (U+1D53B) est une paire de
		// substitution, lue en deux moitiés cassées (`\ud835 \udd3b`) sinon
		const char = String.fromCodePoint(this.input.codePointAt(this.position) ?? 0);
		this.position += char.length;

		const type = this.charToTokenType(char);
		return this.makeToken(type, char, startPos);
	}

	/**
	 * Maps a single character to its token type.
	 */
	private charToTokenType(char: string): CustomTokenType {
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
			case '_':
				return 'UNDERSCORE';
			case '|':
				return 'PIPE';
			case '@':
				return 'AT';
			case '#':
				return 'HASH';
			case '?':
				return 'QUESTION';
			case "'":
				return 'PRIME';
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
			case '!':
				return 'EXCLAMATION';
			case '%':
				return 'PERCENT';
			default:
				// Unknown character - treat as a letter for now
				return 'LETTER';
		}
	}

	/**
	 * Creates a token with the given type, value, and position.
	 */
	private makeToken(type: CustomTokenType, value: string, position: number): CustomToken {
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
 * Tokenizes a custom syntax string and returns all tokens.
 *
 * This is a convenience function that creates a CustomTokenizer and collects
 * all tokens into an array.
 *
 * @param input - The custom syntax string to tokenize
 * @returns Array of all tokens, including EOF
 *
 * @example
 * const tokens = tokenize('x + 2');
 * // [
 * //   { type: 'LETTER', value: 'x', position: 0, length: 1 },
 * //   { type: 'PLUS', value: '+', position: 1, length: 1 },
 * //   { type: 'NUMBER', value: '2', position: 2, length: 1 },
 * //   { type: 'EOF', value: '', position: 3, length: 0 }
 * // ]
 */
export function tokenize(input: string): CustomToken[] {
	const tokenizer = new CustomTokenizer(input);
	const tokens: CustomToken[] = [];

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
export function isBinaryOperator(token: CustomToken): boolean {
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
export function isRelationToken(token: CustomToken): boolean {
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
 * Checks if a token represents an assignment operator.
 */
export function isAssignmentToken(token: CustomToken): boolean {
	return token.type === 'ASSIGN' || token.type === 'ARROW';
}

/**
 * Checks if a token is a left delimiter that could start a group.
 */
export function isLeftDelimiter(token: CustomToken): boolean {
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
export function isRightDelimiter(token: CustomToken): boolean {
	return (
		token.type === 'RPAREN' ||
		token.type === 'RBRACE' ||
		token.type === 'RBRACKET' ||
		token.type === 'PIPE'
	);
}

/**
 * Gets a human-readable description of a token type.
 */
export function tokenTypeToString(type: CustomTokenType): string {
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
		case 'KEYWORD':
			return 'keyword';
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
		case 'ASSIGN':
			return "':='";
		case 'ARROW':
			return "'<-'";
		case 'CARET':
			return "'^'";
		case 'UNDERSCORE':
			return "'_'";
		case 'PIPE':
			return "'|'";
		case 'AT':
			return "'@'";
		case 'HASH':
			return "'#'";
		case 'QUESTION':
			return "'?'";
		case 'PRIME':
			return "'''";
		case 'EXCLAMATION':
			return "'!'";
		case 'PERCENT':
			return "'%'";
		case 'AND_AND':
			return "'&&'";
		case 'OR_OR':
			return "'||'";
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
		case 'DOUBLE_LBRACKET':
			return "'[['";
		case 'DOUBLE_RBRACKET':
			return "']]'";
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
		case 'EOF':
			return 'end of input';
	}
}

/**
 * Returns a human-readable representation of a token.
 */
export function tokenToString(token: CustomToken): string {
	if (token.type === 'EOF') {
		return 'EOF';
	}
	if (token.type === 'SYMBOL') {
		return `\\${token.value}`;
	}
	if (token.type === 'BACKSLASH') {
		return '\\';
	}
	return token.value;
}
