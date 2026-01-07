/**
 * Pratt Parser for LaTeX to MathAST
 *
 * A Top-Down Operator Precedence (Pratt) parser for converting LaTeX
 * mathematical expressions into MathAST nodes.
 *
 * Features:
 * - Proper operator precedence handling
 * - Support for all MathAST node types
 * - Implicit multiplication detection
 * - Color stack for \textcolor nesting
 * - Tolerant and strict parsing modes
 *
 * @module mathAST/parser/parser-pratt
 */

import type { MathNode, GreekLetter, MathSymbol, RelationType, NodeMetadata } from '../../types';
import type { Token, ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { Tokenizer } from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from './color-stack';
import { MathAST, compose } from '../../factory';
import { parse as parseUnit } from '../../units/parser';
import { FUNCTION_COMMANDS, GREEK_COMMANDS, RELATION_COMMANDS } from '../types';
import { SecurityError, checkInputLength, getEffectiveSecurityOptions } from '../security';
import type { ParserSecurityOptions } from '../security';

// =============================================================================
// Binding Power (Precedence)
// =============================================================================

/**
 * Binding power constants for operator precedence.
 * Higher values bind tighter.
 * Note: POWER and SUBSCRIPT intentionally share the same binding power (50)
 * for correct mathematical semantics (x_1^2 parses as (x_1)^2).
 */
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
const enum BP {
	NONE = 0,
	RELATION = 10, // =, <, >, <=, >=, !=, etc.
	ADDITION = 20, // +, -
	COMPOSITION = 25, // \circ (composition operator, between + and *)
	MULTIPLY = 30, // *, implicit, \cdot, \times
	UNARY = 40, // prefix -, +
	POWER = 50, // ^ (right-associative)
	SUBSCRIPT = 50 // _ (same as POWER for mixed sub/superscript handling)
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

// =============================================================================
// Command Classification
// =============================================================================

/**
 * Symbol commands mapped to their MathSymbol type
 */
const SYMBOL_COMMAND_MAP: Record<string, MathSymbol> = {
	infty: 'infinity',
	emptyset: 'emptyset',
	partial: 'partial',
	nabla: 'nabla',
	forall: 'forall',
	exists: 'exists',
	nexists: 'nexists',
	cup: 'union',
	cap: 'intersection',
	setminus: 'setminus',
	therefore: 'therefore',
	because: 'because',
	blacksquare: 'qed',
	aleph: 'aleph',
	beth: 'beth',
	ell: 'ell',
	wp: 'wp',
	Re: 'Re',
	Im: 'Im',
	hbar: 'hbar',
	perp: 'perp',
	parallel: 'parallel',
	angle: 'angle',
	measuredangle: 'measuredangle',
	triangle: 'triangle',
	square: 'square',
	diamond: 'diamond',
	star: 'star',
	circ: 'circ',
	bullet: 'bullet'
};

/**
 * Relation commands mapped to their RelationType
 */
const RELATION_COMMAND_MAP: Record<string, RelationType> = {
	leq: '<=',
	leqslant: '<=',
	geq: '>=',
	geqslant: '>=',
	neq: '!=',
	equiv: '≡',
	approx: '≈',
	simeq: '≃',
	sim: '∼',
	prec: '≺',
	succ: '≻',
	subset: '⊂',
	supset: '⊃',
	subseteq: '⊆',
	supseteq: '⊇',
	in: '∈',
	notin: '∉',
	implies: '⟹',
	iff: '⟺',
	impliedby: '⟸',
	Rightarrow: '⟹',
	Leftrightarrow: '⟺',
	Leftarrow: '⟸'
};

// =============================================================================
// Parser Error Class
// =============================================================================

/**
 * Custom error class for parse errors with location information
 */
export class ParseException extends Error {
	readonly position: number;
	readonly length: number;
	readonly code: ParseErrorCode;

	constructor(message: string, position: number, length: number, code: ParseErrorCode) {
		super(message);
		this.name = 'ParseException';
		this.position = position;
		this.length = length;
		this.code = code;
	}

	toParseError(): ParseError {
		return {
			message: this.message,
			position: this.position,
			length: this.length,
			code: this.code
		};
	}
}

// =============================================================================
// Pratt Parser Class
// =============================================================================

/**
 * Pratt parser for LaTeX to MathAST conversion.
 *
 * Uses top-down operator precedence parsing with:
 * - NUD (Null Denotation) for prefix/primary expressions
 * - LED (Left Denotation) for infix/postfix expressions
 */
class PrattParser {
	private readonly tokenizer: Tokenizer;
	private readonly colorStack: ColorStack;
	private readonly options: ParserOptions;
	private readonly errors: ParseError[] = [];
	private currentToken: Token;
	/** Stack of color brace positions - each entry marks that we're in a \textcolor{} scope */
	private readonly colorScopeStack: number[] = [];

	constructor(input: string, options: ParserOptions) {
		this.tokenizer = new Tokenizer(input);
		this.colorStack = new ColorStack();
		this.options = options;
		this.currentToken = this.skipWhitespace();
	}

	// =========================================================================
	// Public API
	// =========================================================================

	/**
	 * Parse the input and return the AST
	 */
	parse(): MathNode | null {
		if (this.currentToken.type === 'EOF') {
			return null;
		}

		try {
			const result = this.parseExpression(BP.NONE);
			// Ensure we consumed all input
			// Re-read currentToken to get fresh type - parseExpression may have advanced it
			const finalToken = this.currentToken;
			if (finalToken.type !== 'EOF') {
				this.error(
					`Unexpected token: ${finalToken.value}`,
					finalToken.position,
					finalToken.length,
					'UNEXPECTED_TOKEN'
				);
			}
			return result;
		} catch (e) {
			if (e instanceof ParseException) {
				this.errors.push(e.toParseError());
				if (this.options.mode === 'strict') {
					return null;
				}
			}
			throw e;
		}
	}

	/**
	 * Get collected errors
	 */
	getErrors(): readonly ParseError[] {
		return this.errors;
	}

	// =========================================================================
	// Token Management
	// =========================================================================

	/**
	 * Advance to the next token, skipping whitespace
	 */
	private advance(): Token {
		const prev = this.currentToken;
		this.currentToken = this.skipWhitespace();
		return prev;
	}

	/**
	 * Get the next non-whitespace token without advancing
	 */
	private skipWhitespace(): Token {
		let token = this.tokenizer.nextToken();
		while (token.type === 'WHITESPACE') {
			token = this.tokenizer.nextToken();
		}
		return token;
	}

	/**
	 * Peek at the next non-whitespace token without consuming
	 */
	private peekNextNonWhitespace(): Token {
		let offset = 0;
		let token = this.tokenizer.peekAt(offset);
		while (token.type === 'WHITESPACE') {
			offset++;
			token = this.tokenizer.peekAt(offset);
		}
		return token;
	}

	/**
	 * Check if the current token matches the given type
	 */
	private check(type: Token['type']): boolean {
		return this.currentToken.type === type;
	}

	/**
	 * Check if the current token is a command with the given value
	 */
	private checkCommand(value: string): boolean {
		return this.currentToken.type === 'COMMAND' && this.currentToken.value === value;
	}

	/**
	 * Expect a specific token type, advancing if matched
	 */
	private expect(type: Token['type'], message?: string): Token {
		if (!this.check(type)) {
			this.error(
				message ?? `Expected ${type} but got ${this.currentToken.type}`,
				this.currentToken.position,
				this.currentToken.length,
				'UNEXPECTED_TOKEN'
			);
		}
		return this.advance();
	}

	/**
	 * Report an error
	 */
	private error(message: string, position: number, length: number, code: ParseErrorCode): never {
		throw new ParseException(message, position, length, code);
	}

	// =========================================================================
	// Main Parsing Methods
	// =========================================================================

	/**
	 * Parse an expression with the given minimum binding power
	 */
	private parseExpression(minBp: number): MathNode {
		// Parse prefix/primary (NUD)
		let left = this.nud();

		// Parse infix/postfix operators (LED)
		while (true) {
			// Special handling for \textcolor in LED position
			// If we see \textcolor{color}{...} and ... starts with an operator,
			// we want to treat it transparently (not as implicit multiplication)
			if (this.checkCommand('textcolor')) {
				this.handleTextColorInLED();
				// After this, currentToken is the first token inside the { }
				// Continue the loop - it will be handled appropriately
				continue;
			}

			const bp = this.getLeftBindingPower();
			if (bp <= minBp) {
				break;
			}

			// Check for implicit multiplication
			if (this.shouldInsertImplicitMultiply()) {
				left = this.parseImplicitMultiply(left);
			} else {
				left = this.led(left);
			}

			// Check if we need to close a color scope AFTER parsing the operator
			// This ensures the operator node gets the color applied before we pop it
			while (this.check('RBRACE') && this.colorScopeStack.length > 0) {
				this.advance(); // consume }
				this.colorScopeStack.pop();
				this.colorStack.pop();
			}
		}

		return left;
	}

	/**
	 * NUD (Null Denotation) - Parse prefix/primary expressions
	 */
	private nud(): MathNode {
		const token = this.currentToken;

		switch (token.type) {
			case 'NUMBER':
				return this.parseNumber();

			case 'LETTER':
				return this.parseVariable();

			case 'COMMAND':
				return this.parseCommand();

			case 'LPAREN':
				return this.parseParentheses();

			case 'MINUS':
				return this.parsePrefixMinus();

			case 'PLUS':
				return this.parsePrefixPlus();

			case 'LBRACE':
				return this.parseBraceGroup();

			case 'PIPE':
				return this.parseAbsoluteValue();

			default:
				this.error(
					`Unexpected token: ${token.value || token.type}`,
					token.position,
					token.length,
					'UNEXPECTED_TOKEN'
				);
		}
	}

	/**
	 * LED (Left Denotation) - Parse infix/postfix expressions
	 */
	private led(left: MathNode): MathNode {
		const token = this.currentToken;

		switch (token.type) {
			case 'PLUS':
				return this.parseAddition(left);

			case 'MINUS':
				return this.parseSubtraction(left);

			case 'STAR':
				return this.parseMultiplication(left, 'star');

			case 'SLASH':
				return this.parseDivision(left, 'inline');

			case 'COLON':
				return this.parseDivision(left, 'ratio');

			case 'CARET':
				return this.parseSuperscript(left);

			case 'UNDERSCORE':
				return this.parseSubscript(left);

			case 'EQUALS':
				return this.parseRelation(left, '=');

			case 'LESS':
				return this.parseRelation(left, '<');

			case 'GREATER':
				return this.parseRelation(left, '>');

			case 'TILDE':
				return this.parseUnit(left);

			case 'COMMAND':
				if (RELATION_COMMANDS.has(token.value)) {
					const relType = RELATION_COMMAND_MAP[token.value];
					if (relType) {
						return this.parseRelationCommand(left, relType);
					}
				}
				if (token.value === 'cdot') {
					return this.parseMultiplicationCommand(left, 'dot');
				}
				if (token.value === 'times') {
					return this.parseMultiplicationCommand(left, 'cross');
				}
				if (token.value === 'circ') {
					return this.parseComposition(left);
				}
				// \textcolor is now handled in parseExpression() before we get here
				// Fall through for implicit multiplication
				break;

			default:
				break;
		}

		// If we get here, try implicit multiplication
		if (this.shouldInsertImplicitMultiply()) {
			return this.parseImplicitMultiply(left);
		}

		this.error(
			`Unexpected token in expression: ${token.value || token.type}`,
			token.position,
			token.length,
			'UNEXPECTED_TOKEN'
		);
	}

	// =========================================================================
	// Binding Power
	// =========================================================================

	/**
	 * Get the left binding power of the current token
	 */
	private getLeftBindingPower(): number {
		const token = this.currentToken;

		switch (token.type) {
			case 'PLUS':
			case 'MINUS':
				return BP.ADDITION;

			case 'STAR':
			case 'SLASH':
			case 'COLON':
				return BP.MULTIPLY;

			case 'CARET':
			case 'UNDERSCORE':
				return BP.POWER;

			case 'EQUALS':
			case 'LESS':
			case 'GREATER':
				return BP.RELATION;

			case 'TILDE':
				return BP.MULTIPLY + 1; // Slightly higher than multiply to bind units

			case 'COMMAND':
				if (RELATION_COMMANDS.has(token.value)) {
					return BP.RELATION;
				}
				if (token.value === 'cdot' || token.value === 'times') {
					return BP.MULTIPLY;
				}
				if (token.value === 'circ') {
					return BP.COMPOSITION;
				}
				// \textcolor is handled specially - it's transparent
				if (token.value === 'textcolor') {
					// Return NONE so it doesn't interfere with expression parsing
					// It will be handled in LED by checking for it explicitly
					return BP.MULTIPLY; // Actually, we need this for the LED handler
				}
				// For implicit multiplication with functions/greek/special commands
				if (
					FUNCTION_COMMANDS.has(token.value) ||
					GREEK_COMMANDS.has(token.value) ||
					token.value in SYMBOL_COMMAND_MAP ||
					token.value === 'frac' ||
					token.value === 'dfrac' ||
					token.value === 'sqrt' ||
					token.value === 'left'
				) {
					return BP.MULTIPLY;
				}
				break;

			case 'NUMBER':
			case 'LETTER':
			case 'LPAREN':
				// Implicit multiplication
				return BP.MULTIPLY;

			default:
				break;
		}

		return BP.NONE;
	}

	// =========================================================================
	// Primary Parsers
	// =========================================================================

	/**
	 * Parse a number literal
	 */
	private parseNumber(): MathNode {
		const token = this.advance();
		return this.applyColor(MathAST.number(token.value));
	}

	/**
	 * Parse a variable (single letter) or generic function if configured.
	 *
	 * When genericFunctions option is set and the letter matches a configured name,
	 * we parse it as a function call with optional derivatives, inverse, and composition.
	 */
	private parseVariable(): MathNode {
		const token = this.currentToken;
		const letter = token.value;

		// Check if this is a generic function name
		if (this.isGenericFunctionName(letter)) {
			return this.parseGenericFunction();
		}

		// Regular variable
		this.advance();
		return this.applyColor(MathAST.variable(letter));
	}

	/**
	 * Check if a name is configured as a generic function
	 */
	private isGenericFunctionName(name: string): boolean {
		const config = this.options.genericFunctions;
		return config !== undefined && config.names.includes(name);
	}

	/**
	 * Parse a generic function: f(x), f'(x), f''(x), f^{-1}(x), f^{(n)}(x)
	 *
	 * Pattern:
	 * - Function name (single letter)
	 * - Optional primes: ' '' '''
	 * - Optional ^{-1} or ^{(n)} for inverse or higher derivative
	 * - MANDATORY arguments in parentheses: (x) or (x, y)
	 *
	 * Special case: If no parentheses follow, return as a "naked" function
	 * suitable for composition like f \circ g.
	 */
	private parseGenericFunction(): MathNode {
		const nameToken = this.advance(); // consume function name letter
		const name = nameToken.value;

		// Count prime marks for derivatives: f', f'', f'''
		let derivativeOrder = 0;
		const config = this.options.genericFunctions;
		const allowDerivatives = config?.allowDerivatives !== false; // default true
		const allowInverse = config?.allowInverse !== false; // default true

		if (allowDerivatives) {
			while (this.check('PRIME')) {
				this.advance();
				derivativeOrder++;
			}
		}

		// Check for ^{-1} (inverse) or ^{(n)} (higher derivative notation)
		let isInverse = false;
		if (this.check('CARET')) {
			// Peek ahead to see what follows the ^
			const afterCaret = this.peekNextNonWhitespace();
			if (afterCaret.type === 'LBRACE') {
				// Could be ^{-1} or ^{(n)}
				// We need to look inside the brace group
				const result = this.tryParseInverseOrHigherDerivative(allowInverse, allowDerivatives);
				if (result.type === 'inverse') {
					isInverse = true;
				} else if (result.type === 'higherDerivative') {
					derivativeOrder = result.order;
				}
				// If result.type === 'none', don't consume the ^ - it might be a power
			}
		}

		// Check for arguments in parentheses
		// Parentheses are MANDATORY for generic functions to be parsed as functions
		// f alone without parentheses should be a variable (unless it has derivative marks or inverse)
		if (this.check('LPAREN')) {
			this.advance(); // consume (
			const args = this.parseCommaList();
			this.expect('RPAREN', "Expected ')' after function arguments");

			return this.applyColor(
				MathAST.func(name, args, {
					...(derivativeOrder > 0 && { derivativeOrder }),
					...(isInverse && { isInverse })
				})
			);
		}

		// No parentheses - if there are derivative marks or inverse, return as function
		// Otherwise return as variable
		if (derivativeOrder > 0 || isInverse) {
			return this.applyColor(
				MathAST.func(name, [], {
					...(derivativeOrder > 0 && { derivativeOrder }),
					...(isInverse && { isInverse })
				})
			);
		}

		// Plain letter without parentheses, derivatives, or inverse - it's a variable
		return this.applyColor(MathAST.variable(name));
	}

	/**
	 * Try to parse ^{-1} (inverse) or ^{(n)} (higher derivative notation)
	 * Returns what was found and consumes the tokens if successful.
	 */
	private tryParseInverseOrHigherDerivative(
		allowInverse: boolean,
		allowDerivatives: boolean
	): { type: 'inverse' } | { type: 'higherDerivative'; order: number } | { type: 'none' } {
		// Save state in case we need to backtrack
		// We'll peek ahead to check the pattern without committing

		// Current token should be CARET
		if (!this.check('CARET')) {
			return { type: 'none' };
		}

		// Look at next token (should be LBRACE)
		const braceToken = this.peekNextNonWhitespace();
		if (braceToken.type !== 'LBRACE') {
			return { type: 'none' };
		}

		// Consume ^ and {
		this.advance(); // consume ^
		this.advance(); // consume {

		// Check for -1 (inverse)
		if (allowInverse && this.check('MINUS')) {
			this.advance(); // consume -
			if (this.check('NUMBER') && this.currentToken.value === '1') {
				this.advance(); // consume 1
				this.expect('RBRACE', "Expected '}' after ^{-1}");
				return { type: 'inverse' };
			}
			// Not ^{-1}, this is an error or something else
			// For now, error out
			this.error(
				'Expected 1 after - in superscript',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_SUPERSCRIPT'
			);
		}

		// Check for (n) (higher derivative notation)
		if (allowDerivatives && this.check('LPAREN')) {
			this.advance(); // consume (
			if (this.check('NUMBER')) {
				const orderToken = this.advance();
				const order = parseInt(orderToken.value, 10);
				this.expect('RPAREN', "Expected ')' after derivative order");
				this.expect('RBRACE', "Expected '}' after ^{(n)}");
				return { type: 'higherDerivative', order };
			}
			// Not a number, error
			this.error(
				'Expected number for derivative order in ^{(n)}',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_SUPERSCRIPT'
			);
		}

		// Neither ^{-1} nor ^{(n)}, this is probably a regular superscript
		// We've already consumed ^ and {, so we need to parse the content as superscript
		// This is a bit tricky - for now, error out since we already consumed tokens
		this.error(
			"Expected '-1' or '(n)' in superscript for generic function",
			this.currentToken.position,
			this.currentToken.length,
			'INVALID_SUPERSCRIPT'
		);
	}

	/**
	 * Parse a LaTeX command
	 */
	private parseCommand(): MathNode {
		const token = this.currentToken;
		const cmd = token.value;

		// Greek letters
		if (GREEK_COMMANDS.has(cmd)) {
			this.advance();
			return this.applyColor(MathAST.greek(cmd as GreekLetter));
		}

		// Symbol commands
		if (cmd in SYMBOL_COMMAND_MAP) {
			this.advance();
			return this.applyColor(MathAST.symbol(SYMBOL_COMMAND_MAP[cmd]));
		}

		// Function commands
		if (FUNCTION_COMMANDS.has(cmd)) {
			return this.parseFunction();
		}

		// Special commands
		switch (cmd) {
			case 'frac':
			case 'dfrac':
				return this.parseFraction();

			case 'sqrt':
				return this.parseSqrt();

			case 'left':
				return this.parseLeftDelimiter();

			case 'textcolor':
				return this.parseTextColor();

			case 'unit':
				// \unit{...} as a standalone command - parse the unit
				return this.parseUnitCommand();

			case 'placeholder':
				return this.parsePlaceholder();

			default:
				this.error(`Unknown command: \\${cmd}`, token.position, token.length, 'UNKNOWN_COMMAND');
		}
	}

	// =========================================================================
	// Delimiter Parsers
	// =========================================================================

	/**
	 * Parse simple parentheses: (...)
	 */
	private parseParentheses(): MathNode {
		this.advance(); // consume (
		const content = this.parseExpression(BP.NONE);
		this.expect('RPAREN', "Expected ')' after expression");
		return this.applyColor(MathAST.delimiter('parentheses', content, 'grouping'));
	}

	/**
	 * Parse brace group: {...}
	 *
	 * Special handling: if this is part of a \textcolor scope,
	 * the opening brace is already consumed by parseTextColor()
	 */
	private parseBraceGroup(): MathNode {
		this.advance(); // consume {
		// If this opens a color scope, it was already handled
		// This is for regular brace groups like {x+y}
		const content = this.parseExpression(BP.NONE);
		this.expect('RBRACE', "Expected '}' after expression");
		// Check if this closes a color scope
		if (this.colorScopeStack.length > 0) {
			this.colorScopeStack.pop();
			this.colorStack.pop();
		}
		return content;
	}

	/**
	 * Parse absolute value: |...| → abs(...)
	 */
	private parseAbsoluteValue(): MathNode {
		this.advance(); // consume |
		const content = this.parseExpression(BP.NONE);
		this.expect('PIPE', "Expected '|' to close absolute value");
		return this.applyColor(MathAST.abs(content));
	}

	/**
	 * Parse \left...\right delimiters
	 * Note: \left| x \right| is parsed as abs(x)
	 */
	private parseLeftDelimiter(): MathNode {
		this.advance(); // consume \left

		// Get the opening delimiter
		const openToken = this.currentToken;
		let isAbsolute = false;

		if (openToken.type === 'LPAREN' || (openToken.type === 'COMMAND' && openToken.value === '(')) {
			this.advance();
		} else if (openToken.type === 'PIPE') {
			isAbsolute = true;
			this.advance();
		} else {
			this.error(
				`Expected delimiter after \\left, got ${openToken.value || openToken.type}`,
				openToken.position,
				openToken.length,
				'MISSING_DELIMITER'
			);
		}

		// Parse content
		const content = this.parseExpression(BP.NONE);

		// Expect \right
		if (!this.checkCommand('right')) {
			this.error(
				'Expected \\right to close delimiter',
				this.currentToken.position,
				this.currentToken.length,
				'MISSING_DELIMITER'
			);
		}
		this.advance(); // consume \right

		// Get the closing delimiter
		const closeToken = this.currentToken;
		if (!isAbsolute) {
			if (
				closeToken.type !== 'RPAREN' &&
				!(closeToken.type === 'COMMAND' && closeToken.value === ')')
			) {
				this.error(
					`Expected ')' after \\right, got ${closeToken.value || closeToken.type}`,
					closeToken.position,
					closeToken.length,
					'MISSING_DELIMITER'
				);
			}
		} else {
			if (closeToken.type !== 'PIPE') {
				this.error(
					`Expected '|' after \\right, got ${closeToken.value || closeToken.type}`,
					closeToken.position,
					closeToken.length,
					'MISSING_DELIMITER'
				);
			}
		}
		this.advance();

		// Return abs() for absolute value, delimiter for parentheses
		if (isAbsolute) {
			return this.applyColor(MathAST.abs(content));
		}
		return this.applyColor(MathAST.delimiter('parentheses', content, 'grouping'));
	}

	// =========================================================================
	// Unary Operators
	// =========================================================================

	/**
	 * Parse prefix minus: -x
	 */
	private parsePrefixMinus(): MathNode {
		this.advance(); // consume -
		const operand = this.parseExpression(BP.UNARY);
		return this.applyColor(MathAST.opposite(operand));
	}

	/**
	 * Parse prefix plus: +x
	 */
	private parsePrefixPlus(): MathNode {
		this.advance(); // consume +
		const operand = this.parseExpression(BP.UNARY);
		return this.applyColor(MathAST.positive(operand));
	}

	// =========================================================================
	// Binary Operators
	// =========================================================================

	/**
	 * Parse addition: left + right
	 */
	private parseAddition(left: MathNode): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume +
		const right = this.parseExpression(BP.ADDITION);
		return this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
	}

	/**
	 * Parse subtraction: left - right
	 */
	private parseSubtraction(left: MathNode): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume -
		const right = this.parseExpression(BP.ADDITION);
		return this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
	}

	/**
	 * Parse multiplication with explicit operator
	 */
	private parseMultiplication(left: MathNode, style: 'star' | 'dot' | 'cross'): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume operator
		const right = this.parseExpression(BP.MULTIPLY);
		return this.applyColorWithOperator(MathAST.multiply(left, right, style), operatorColor);
	}

	/**
	 * Parse multiplication command (\cdot, \times)
	 */
	private parseMultiplicationCommand(left: MathNode, style: 'dot' | 'cross'): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume command
		const right = this.parseExpression(BP.MULTIPLY);
		return this.applyColorWithOperator(MathAST.multiply(left, right, style), operatorColor);
	}

	/**
	 * Parse composition: f \circ g
	 * Composition is left-associative: f \circ g \circ h = (f \circ g) \circ h
	 *
	 * If left or right is a variable that matches a generic function name,
	 * convert it to a function node for proper composition semantics.
	 */
	private parseComposition(left: MathNode): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume \circ
		const right = this.parseExpression(BP.COMPOSITION);

		// Convert variables to functions if they are generic function names
		const leftFunc = this.variableToFunctionIfGeneric(left);
		const rightFunc = this.variableToFunctionIfGeneric(right);

		const node = compose(leftFunc, rightFunc);
		if (operatorColor) {
			return { ...node, operatorMetadata: { color: operatorColor } } as MathNode;
		}
		return node;
	}

	/**
	 * Convert a variable node to a function node if the variable name
	 * matches a generic function name. Used for composition.
	 */
	private variableToFunctionIfGeneric(node: MathNode): MathNode {
		if (node.type === 'variable' && this.isGenericFunctionName(node.name)) {
			return MathAST.func(node.name, [], node.metadata ? { metadata: node.metadata } : undefined);
		}
		return node;
	}

	/**
	 * Parse division: left / right or left : right
	 */
	private parseDivision(left: MathNode, style: 'inline' | 'ratio'): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume operator
		const right = this.parseExpression(BP.MULTIPLY);
		return this.applyColorWithOperator(MathAST.divide(left, right, style), operatorColor);
	}

	// =========================================================================
	// Implicit Multiplication
	// =========================================================================

	/**
	 * Check if we should insert implicit multiplication
	 */
	private shouldInsertImplicitMultiply(): boolean {
		const token = this.currentToken;

		// Can't have implicit mult at start or after operators
		if (
			token.type === 'EOF' ||
			token.type === 'PLUS' ||
			token.type === 'MINUS' ||
			token.type === 'STAR' ||
			token.type === 'SLASH' ||
			token.type === 'CARET' ||
			token.type === 'UNDERSCORE' ||
			token.type === 'EQUALS' ||
			token.type === 'LESS' ||
			token.type === 'GREATER' ||
			token.type === 'COLON' ||
			token.type === 'TILDE' ||
			token.type === 'RPAREN' ||
			token.type === 'RBRACE' ||
			token.type === 'RBRACKET' ||
			token.type === 'PIPE' ||
			token.type === 'COMMA'
		) {
			return false;
		}

		// Check for relation commands
		if (token.type === 'COMMAND' && RELATION_COMMANDS.has(token.value)) {
			return false;
		}

		// Check for multiplication commands
		if (token.type === 'COMMAND' && (token.value === 'cdot' || token.value === 'times')) {
			return false;
		}

		// Check for composition command
		if (token.type === 'COMMAND' && token.value === 'circ') {
			return false;
		}

		// Check for \right
		if (token.type === 'COMMAND' && token.value === 'right') {
			return false;
		}

		// \textcolor is special - it should be transparent, not trigger implicit mult
		// When we see "5 \textcolor{red}{+3}", we want + to be infix, not "5 * \textcolor{red}{+3}"
		if (token.type === 'COMMAND' && token.value === 'textcolor') {
			return false;
		}

		// Tokens that CAN trigger implicit multiplication:
		// NUMBER, LETTER, LPAREN, COMMAND (greek, function, symbol, \left, \frac, \sqrt)
		return (
			token.type === 'NUMBER' ||
			token.type === 'LETTER' ||
			token.type === 'LPAREN' ||
			(token.type === 'COMMAND' &&
				(GREEK_COMMANDS.has(token.value) ||
					FUNCTION_COMMANDS.has(token.value) ||
					token.value in SYMBOL_COMMAND_MAP ||
					token.value === 'frac' ||
					token.value === 'dfrac' ||
					token.value === 'sqrt' ||
					token.value === 'left'))
		);
	}

	/**
	 * Parse implicit multiplication
	 */
	private parseImplicitMultiply(left: MathNode): MathNode {
		// Don't advance - nud will consume the next token
		const right = this.parseExpression(BP.MULTIPLY);
		return this.applyColor(MathAST.multiply(left, right, 'implicit'));
	}

	// =========================================================================
	// Superscript and Subscript
	// =========================================================================

	/**
	 * Parse superscript: base^exponent (right-associative)
	 */
	private parseSuperscript(left: MathNode): MathNode {
		this.advance(); // consume ^
		const exponent = this.parseSuperscriptOperand();
		return this.applyColor(MathAST.superscript(left, exponent));
	}

	/**
	 * Parse subscript: base_subscript (right-associative)
	 */
	private parseSubscript(left: MathNode): MathNode {
		this.advance(); // consume _
		const subscript = this.parseSubscriptOperand();
		return this.applyColor(MathAST.subscript(left, subscript));
	}

	/**
	 * Parse the operand of a superscript (handles braces and single tokens)
	 * Right-associative only for chained superscripts: x^2^3 → x^(2^3)
	 * But left-to-right for mixed: x_1^2 → (x_1)^2
	 */
	private parseSuperscriptOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}
		// Parse single token first
		const operand = this.nud();
		// Check for chained superscript (same operator → right-associative)
		if (this.check('CARET')) {
			// x^2^3 → x^(2^3)
			return this.parseSuperscript(operand);
		}
		return operand;
	}

	/**
	 * Parse the operand of a subscript (handles braces and single tokens)
	 * Right-associative only for chained subscripts: x_a_b → x_(a_b)
	 * But left-to-right for mixed: x^2_1 → (x^2)_1
	 */
	private parseSubscriptOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}
		// Parse single token first
		const operand = this.nud();
		// Check for chained subscript (same operator → right-associative)
		if (this.check('UNDERSCORE')) {
			// x_a_b → x_(a_b)
			return this.parseSubscript(operand);
		}
		return operand;
	}

	// =========================================================================
	// Relations
	// =========================================================================

	/**
	 * Parse a relation: left op right
	 */
	private parseRelation(left: MathNode, relType: RelationType): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume operator
		const right = this.parseExpression(BP.RELATION);
		return this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);
	}

	/**
	 * Parse a relation command: left \leq right
	 */
	private parseRelationCommand(left: MathNode, relType: RelationType): MathNode {
		// Capture color before parsing right side (which may close color scope)
		const operatorColor = this.colorStack.current();
		this.advance(); // consume command
		const right = this.parseExpression(BP.RELATION);
		return this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);
	}

	// =========================================================================
	// Placeholder (Hole) Parser
	// =========================================================================

	/**
	 * Parse a placeholder/hole: \placeholder[N]{}
	 * The index N is preserved from the LaTeX source.
	 * If N is not provided, defaults to 1.
	 */
	private parsePlaceholder(): MathNode {
		this.advance(); // consume \placeholder

		// Parse optional index: [N]
		let index = 1;
		if (this.check('LBRACKET')) {
			this.advance(); // consume [
			if (this.check('NUMBER')) {
				const indexToken = this.advance();
				index = parseInt(indexToken.value, 10);
			}
			this.expect('RBRACKET', "Expected ']' after placeholder index");
		}

		// Parse required empty braces: {}
		this.expect('LBRACE', "Expected '{' after \\placeholder");
		this.expect('RBRACE', "Expected '}' to close \\placeholder");

		return this.applyColor(MathAST.hole(index));
	}

	// =========================================================================
	// Functions
	// =========================================================================

	/**
	 * Parse a function: \sin(x), \log_2(x), \sin^2(x)
	 */
	private parseFunction(): MathNode {
		const token = this.advance();
		const name = token.value;

		// Check for power: \sin^2
		let power: MathNode | undefined;
		if (this.check('CARET')) {
			this.advance();
			power = this.parseSuperscriptOperand();
		}

		// Check for base (log only): \log_2
		let base: MathNode | undefined;
		if (this.check('UNDERSCORE')) {
			this.advance();
			base = this.parseSubscriptOperand();
		}

		// Parse arguments
		const args = this.parseFunctionArguments();

		return this.applyColor(MathAST.func(name, args, { power, base }));
	}

	/**
	 * Parse function arguments
	 */
	private parseFunctionArguments(): MathNode[] {
		// Function arguments can be:
		// 1. Parentheses: \sin(x)
		// 2. \left...\right: \sin\left( x \right)
		// 3. Braces: \sin{x}
		// 4. Single token: \sin x

		if (this.check('LPAREN')) {
			this.advance();
			const args = this.parseCommaList();
			this.expect('RPAREN', "Expected ')' after function arguments");
			return args;
		}

		if (this.checkCommand('left')) {
			const delim = this.parseLeftDelimiter();
			// Extract content from delimiter
			if (delim.type === 'delimiter') {
				return [delim.content];
			}
			return [delim];
		}

		if (this.check('LBRACE')) {
			const content = this.parseBraceGroup();
			return [content];
		}

		// Single token argument
		const arg = this.nud();
		return [arg];
	}

	/**
	 * Parse a comma-separated list of expressions
	 */
	private parseCommaList(): MathNode[] {
		const items: MathNode[] = [];

		items.push(this.parseExpression(BP.NONE));

		while (this.check('COMMA')) {
			this.advance();
			items.push(this.parseExpression(BP.NONE));
		}

		return items;
	}

	// =========================================================================
	// Special Commands
	// =========================================================================

	/**
	 * Parse \frac{num}{denom}
	 */
	private parseFraction(): MathNode {
		this.advance(); // consume \frac

		// Parse numerator
		this.expect('LBRACE', "Expected '{' for \\frac numerator");
		const numerator = this.parseExpression(BP.NONE);
		this.expect('RBRACE', "Expected '}' after \\frac numerator");

		// Parse denominator
		this.expect('LBRACE', "Expected '{' for \\frac denominator");
		const denominator = this.parseExpression(BP.NONE);
		this.expect('RBRACE', "Expected '}' after \\frac denominator");

		return this.applyColor(MathAST.divide(numerator, denominator, 'fraction'));
	}

	/**
	 * Parse \sqrt{x} or \sqrt[n]{x}
	 */
	private parseSqrt(): MathNode {
		this.advance(); // consume \sqrt

		// Check for optional index: \sqrt[n]
		let nthRoot: MathNode | undefined;
		if (this.check('LBRACKET')) {
			this.advance();
			nthRoot = this.parseExpression(BP.NONE);
			this.expect('RBRACKET', "Expected ']' after sqrt index");
		}

		// Parse radicand
		this.expect('LBRACE', "Expected '{' for \\sqrt argument");
		const radicand = this.parseExpression(BP.NONE);
		this.expect('RBRACE', "Expected '}' after \\sqrt argument");

		// If nth root specified, use a different representation
		// For now, we'll just use sqrt function
		if (nthRoot) {
			return this.applyColor(MathAST.func('sqrt', [radicand], { base: nthRoot }));
		}

		return this.applyColor(MathAST.func('sqrt', [radicand]));
	}

	/**
	 * Handle \textcolor in LED position (after an operand)
	 *
	 * For example: 5 \textcolor{red}{+3}
	 * We want + to be seen as an infix operator between 5 and 3, not prefix.
	 *
	 * This method:
	 * 1. Consumes \textcolor
	 * 2. Parses and pushes the color
	 * 3. Consumes the opening { for content
	 * 4. Tracks this as a "transparent" color scope
	 */
	private handleTextColorInLED(): void {
		this.advance(); // consume \textcolor

		// Parse color
		this.expect('LBRACE', "Expected '{' for \\textcolor color");
		const colorStr = this.parseColorString();
		this.expect('RBRACE', "Expected '}' after \\textcolor color");

		// Validate and normalize color
		if (!isValidColor(colorStr)) {
			this.error(
				`Invalid color: ${colorStr}`,
				this.currentToken.position,
				colorStr.length,
				'INVALID_COLOR'
			);
		}
		const color = normalizeColor(colorStr);

		// Push color onto stack
		this.colorStack.push(color);

		// Expect and consume opening brace for content
		this.expect('LBRACE', "Expected '{' for \\textcolor content");

		// Mark that we're in a transparent color scope
		// When we see the closing }, we'll pop both this marker and the color
		this.colorScopeStack.push(1);
	}

	/**
	 * Parse \textcolor{color}{content}
	 *
	 * This is called from NUD (prefix position) like: \textcolor{red}{x+y}
	 * It parses the content as a complete expression.
	 */
	private parseTextColor(): MathNode {
		this.advance(); // consume \textcolor

		// Parse color
		this.expect('LBRACE', "Expected '{' for \\textcolor color");
		const colorStr = this.parseColorString();
		this.expect('RBRACE', "Expected '}' after \\textcolor color");

		// Validate and normalize color
		if (!isValidColor(colorStr)) {
			this.error(
				`Invalid color: ${colorStr}`,
				this.currentToken.position,
				colorStr.length,
				'INVALID_COLOR'
			);
		}
		const color = normalizeColor(colorStr);

		// Push color onto stack
		this.colorStack.push(color);

		// Parse content - expect opening brace
		this.expect('LBRACE', "Expected '{' for \\textcolor content");

		// Parse the content as a complete expression
		const content = this.parseExpression(BP.NONE);

		// Expect closing brace
		this.expect('RBRACE', "Expected '}' after \\textcolor content");

		// Pop color from stack
		this.colorStack.pop();

		return content;
	}

	/**
	 * Parse a color string (sequence of letters)
	 */
	private parseColorString(): string {
		let color = '';

		// Handle hex color starting with #
		if (this.currentToken.type === 'LETTER' && this.currentToken.value === '#') {
			// This shouldn't happen with the tokenizer, but handle it
			color += '#';
			this.advance();
		}

		// Collect letters and numbers for the color
		while (this.currentToken.type === 'LETTER' || this.currentToken.type === 'NUMBER') {
			color += this.currentToken.value;
			this.advance();
		}

		return color;
	}

	/**
	 * Parse \unit{...} command as standalone
	 */
	private parseUnitCommand(): MathNode {
		this.advance(); // consume \unit
		this.expect('LBRACE', "Expected '{' for \\unit");
		const unitStr = this.parseUnitString();
		this.expect('RBRACE', "Expected '}' after \\unit");

		const unit = parseUnit(unitStr);
		if (!unit) {
			this.error(
				`Invalid unit: ${unitStr}`,
				this.currentToken.position,
				unitStr.length,
				'INVALID_UNIT'
			);
		}

		// Create a unit node with empty expression (just the unit)
		// This is unusual - normally units are attached to expressions
		// Return a number 1 with the unit for standalone \unit
		return this.applyColor(MathAST.withUnit(MathAST.number('1'), unit));
	}

	// =========================================================================
	// Unit Parsing
	// =========================================================================

	/**
	 * Parse unit after tilde: expr ~ \unit{...}
	 */
	private parseUnit(left: MathNode): MathNode {
		this.advance(); // consume ~

		// Expect \unit command
		if (!this.checkCommand('unit')) {
			this.error(
				`Expected \\unit after ~`,
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_UNIT'
			);
		}
		this.advance(); // consume \unit

		this.expect('LBRACE', "Expected '{' for \\unit");
		const unitStr = this.parseUnitString();
		this.expect('RBRACE', "Expected '}' after \\unit");

		const unit = parseUnit(unitStr);
		if (!unit) {
			this.error(
				`Invalid unit: ${unitStr}`,
				this.currentToken.position,
				unitStr.length,
				'INVALID_UNIT'
			);
		}

		return this.applyColor(MathAST.withUnit(left, unit));
	}

	/**
	 * Parse the content of a \unit{...} command
	 */
	private parseUnitString(): string {
		let unitStr = '';

		// Collect tokens until closing brace
		while (!this.check('RBRACE') && !this.check('EOF')) {
			const token = this.currentToken;
			if (token.type === 'LETTER') {
				unitStr += token.value;
			} else if (token.type === 'NUMBER') {
				unitStr += token.value;
			} else if (token.type === 'CARET') {
				unitStr += '^';
			} else if (token.type === 'MINUS') {
				unitStr += '-';
			} else if (token.type === 'SLASH') {
				unitStr += '/';
			} else if (token.type === 'STAR') {
				unitStr += '*';
			} else if (token.type === 'COMMAND') {
				// Some commands like \cdot might appear in units
				if (token.value === 'cdot') {
					unitStr += '.';
				} else {
					// Skip unknown commands in units
					unitStr += token.value;
				}
			} else {
				break;
			}
			this.advance();
		}

		return unitStr;
	}

	// =========================================================================
	// Color Management
	// =========================================================================

	/**
	 * Apply the current color from the stack to a node's metadata
	 * Also applies operatorMetadata for binary/unary ops, relationMetadata for relations
	 */
	private applyColor(node: MathNode): MathNode {
		const color = this.colorStack.current();
		if (!color) {
			return node;
		}

		// If the node already has metadata, merge the color
		const existingMeta = node.metadata;
		const newMeta: NodeMetadata = existingMeta ? { ...existingMeta, color } : { color };

		// Create a new node with the metadata
		let result = { ...node, metadata: newMeta } as MathNode;

		// Also apply extended metadata based on node type
		const colorMeta: NodeMetadata = { color };

		switch (node.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
			case 'division':
			case 'opposite':
			case 'positive':
				result = { ...result, operatorMetadata: colorMeta } as MathNode;
				break;
			case 'relation':
				result = { ...result, relationMetadata: colorMeta } as MathNode;
				break;
			case 'delimiter':
				result = { ...result, delimiterMetadata: colorMeta } as MathNode;
				break;
			case 'function':
				result = { ...result, nameMetadata: colorMeta, delimiterMetadata: colorMeta } as MathNode;
				break;
		}

		return result;
	}

	/**
	 * Apply operator color that was captured before parsing the right side.
	 * This is needed because the color scope may close while parsing the right side.
	 */
	private applyColorWithOperator(node: MathNode, operatorColor: string | undefined): MathNode {
		if (!operatorColor) {
			return node;
		}

		const colorMeta: NodeMetadata = { color: operatorColor };

		switch (node.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
			case 'division':
				return { ...node, metadata: colorMeta, operatorMetadata: colorMeta } as MathNode;
			case 'relation':
				return { ...node, metadata: colorMeta, relationMetadata: colorMeta } as MathNode;
			default:
				return { ...node, metadata: colorMeta } as MathNode;
		}
	}
}

// =============================================================================
// Security Helpers
// =============================================================================

/**
 * Get children of a MathNode.
 */
function getNodeChildren(node: MathNode): MathNode[] {
	const children: MathNode[] = [];

	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			if (node.left) children.push(node.left);
			if (node.right) children.push(node.right);
			break;
		case 'division':
			if (node.numerator) children.push(node.numerator);
			if (node.denominator) children.push(node.denominator);
			break;
		case 'superscript':
			if (node.base) children.push(node.base);
			if (node.superscript) children.push(node.superscript);
			break;
		case 'subscript':
			if (node.base) children.push(node.base);
			if (node.subscript) children.push(node.subscript);
			break;
		case 'opposite':
		case 'positive':
			if (node.operand) children.push(node.operand);
			break;
		case 'delimiter':
			if (node.content) children.push(node.content);
			break;
		case 'function':
			for (const arg of node.args) {
				if (arg) children.push(arg);
			}
			break;
		case 'relation':
			if (node.left) children.push(node.left);
			if (node.right) children.push(node.right);
			break;
		case 'composition':
			if (node.outer) children.push(node.outer);
			if (node.inner) children.push(node.inner);
			break;
		case 'unit':
			if (node.expression) children.push(node.expression);
			break;
		// Leaf nodes: number, variable, greek, symbol, hole
	}

	return children;
}

/**
 * Measure the depth and node count of an AST using iterative BFS.
 * Avoids stack overflow for large ASTs.
 */
function measureAST(node: MathNode | null): { depth: number; nodeCount: number } {
	if (!node) {
		return { depth: 0, nodeCount: 0 };
	}

	let nodeCount = 0;
	let maxDepth = 0;

	// BFS with depth tracking
	const queue: Array<{ node: MathNode; depth: number }> = [{ node, depth: 1 }];

	while (queue.length > 0) {
		const current = queue.shift()!;
		nodeCount++;
		maxDepth = Math.max(maxDepth, current.depth);

		const children = getNodeChildren(current.node);
		for (const child of children) {
			queue.push({ node: child, depth: current.depth + 1 });
		}
	}

	return { depth: maxDepth, nodeCount };
}

/**
 * Check AST against security limits.
 */
function checkASTSecurity(ast: MathNode | null, security: Required<ParserSecurityOptions>): void {
	if (!ast) return;

	const metrics = measureAST(ast);

	if (metrics.depth > security.maxASTDepth) {
		throw new SecurityError(
			`AST depth ${metrics.depth} exceeds maximum allowed ${security.maxASTDepth}`,
			'AST_TOO_DEEP'
		);
	}

	if (metrics.nodeCount > security.maxNodeCount) {
		throw new SecurityError(
			`AST node count ${metrics.nodeCount} exceeds maximum allowed ${security.maxNodeCount}`,
			'AST_TOO_MANY_NODES'
		);
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a LaTeX string into a MathAST node.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The LaTeX string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 * @throws SecurityError if security limits are exceeded
 */
export function parsePratt(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	// Security checks
	const security = getEffectiveSecurityOptions(fullOptions.security);
	checkInputLength(input, security.maxInputLength);

	const parser = new PrattParser(input, fullOptions);
	const result = parser.parse();

	if (result === null) {
		const errors = parser.getErrors();
		if (errors.length > 0) {
			throw new ParseException(
				errors[0].message,
				errors[0].position,
				errors[0].length,
				errors[0].code
			);
		}
		throw new ParseException('Empty input', 0, 0, 'UNEXPECTED_EOF');
	}

	// Check AST security limits
	checkASTSecurity(result, security);

	return result;
}

/**
 * Parse a LaTeX string into a MathAST node with error collection.
 * Returns a ParseResult with the AST and any errors.
 *
 * @param input - The LaTeX string to parse
 * @param options - Parser options (default: tolerant mode)
 * @returns ParseResult containing the AST and errors
 * @throws SecurityError if security limits are exceeded (not caught)
 */
export function parsePrattSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	// Security checks - rethrow SecurityError (not a parse error)
	const security = getEffectiveSecurityOptions(fullOptions.security);
	checkInputLength(input, security.maxInputLength);

	const parser = new PrattParser(input, fullOptions);

	try {
		const ast = parser.parse();

		// Check AST security limits
		checkASTSecurity(ast, security);

		return {
			ast,
			errors: parser.getErrors()
		};
	} catch (e) {
		if (e instanceof ParseException) {
			return {
				ast: null,
				errors: [...parser.getErrors(), e.toParseError()]
			};
		}
		throw e; // Rethrow SecurityError and other errors
	}
}
