/**
 * Recursive Descent Parser for LaTeX to MathAST
 *
 * A Recursive Descent parser for converting LaTeX mathematical expressions
 * into MathAST nodes. This is an alternative implementation to the Pratt parser.
 *
 * Features:
 * - Proper operator precedence handling via grammar rules
 * - Support for all MathAST node types
 * - Implicit multiplication detection
 * - Color stack for \textcolor nesting
 * - Tolerant and strict parsing modes
 * - Right-associative chained exponents: x^2^3 -> x^(2^3)
 * - Left-to-right for mixed: x_1^2 -> (x_1)^2
 *
 * Grammar:
 *   expression      := relation
 *   relation        := additive (RELATION_OP additive)*
 *   additive        := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative  := unary ((MUL_OP | IMPLICIT) unary)*
 *   unary           := ('+' | '-')? power
 *   power           := postfix ('^' powerOperand | '_' subscriptOperand)*
 *   postfix         := primary ('~' '\unit' group)?
 *   primary         := NUMBER | LETTER | GREEK | SYMBOL | fraction | sqrt | function | delimiter | color | braceGroup
 *
 * @module mathAST/parser/parser-rd
 */

import type { MathNode, GreekLetter, MathSymbol, RelationType, NodeMetadata } from '../../types';
import type { Token, ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { Tokenizer } from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from './color-stack';
import { MathAST } from '../../factory';
import { parse as parseUnit } from '../../units/parser';
import { FUNCTION_COMMANDS, GREEK_COMMANDS, RELATION_COMMANDS } from '../types';
import {
	SecurityError,
	getEffectiveSecurityOptions,
	checkInputLength,
	type ParserSecurityOptions
} from '../security';

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
// Recursive Descent Parser Class
// =============================================================================

/**
 * Recursive Descent parser for LaTeX to MathAST conversion.
 *
 * Uses a grammar-based approach with explicit precedence levels encoded
 * in the grammar structure itself.
 */
class RDParser {
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
			const result = this.parseExpression();
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
	// Grammar Rules
	// =========================================================================

	/**
	 * expression := relation
	 */
	private parseExpression(): MathNode {
		return this.parseRelation();
	}

	/**
	 * relation := additive (RELATION_OP additive)*
	 *
	 * Relations are left-associative for chains: a < b < c => (a < b) < c
	 */
	private parseRelation(): MathNode {
		let left = this.parseAdditive();

		while (this.isRelationOperator()) {
			// Capture color before consuming operator (color scope may close during parsing)
			const operatorColor = this.colorStack.current();
			const relType = this.consumeRelationOperator();
			const right = this.parseAdditive();
			left = this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);

			// Check if we need to close a color scope AFTER parsing the operator
			while (this.check('RBRACE') && this.colorScopeStack.length > 0) {
				this.advance(); // consume }
				this.colorScopeStack.pop();
				this.colorStack.pop();
			}
		}

		return left;
	}

	/**
	 * Check if current token is a relation operator
	 */
	private isRelationOperator(): boolean {
		if (this.check('EQUALS') || this.check('LESS') || this.check('GREATER')) {
			return true;
		}
		if (this.currentToken.type === 'COMMAND' && RELATION_COMMANDS.has(this.currentToken.value)) {
			return true;
		}
		return false;
	}

	/**
	 * Consume a relation operator and return its type
	 */
	private consumeRelationOperator(): RelationType {
		const token = this.currentToken;

		if (token.type === 'EQUALS') {
			this.advance();
			return '=';
		}
		if (token.type === 'LESS') {
			this.advance();
			return '<';
		}
		if (token.type === 'GREATER') {
			this.advance();
			return '>';
		}
		if (token.type === 'COMMAND' && RELATION_COMMANDS.has(token.value)) {
			const relType = RELATION_COMMAND_MAP[token.value];
			this.advance();
			return relType;
		}

		// Should not reach here
		this.error(`Expected relation operator`, token.position, token.length, 'UNEXPECTED_TOKEN');
	}

	/**
	 * additive := multiplicative (('+' | '-') multiplicative)*
	 *
	 * Addition and subtraction are left-associative
	 */
	private parseAdditive(): MathNode {
		let left = this.parseMultiplicative();

		while (this.check('PLUS') || this.check('MINUS')) {
			// Capture color BEFORE consuming operator (color scope may close during parsing)
			const operatorColor = this.colorStack.current();
			const isPlus = this.check('PLUS');
			this.advance();
			const right = this.parseMultiplicative();

			if (isPlus) {
				left = this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
			} else {
				left = this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
			}

			// Check if we need to close a color scope AFTER parsing the operator
			while (this.check('RBRACE') && this.colorScopeStack.length > 0) {
				this.advance(); // consume }
				this.colorScopeStack.pop();
				this.colorStack.pop();
			}
		}

		return left;
	}

	/**
	 * multiplicative := unary ((MUL_OP | IMPLICIT) unary)*
	 *
	 * Multiplication and division are left-associative
	 * Includes implicit multiplication detection
	 */
	private parseMultiplicative(): MathNode {
		let left = this.parseUnary();

		while (true) {
			// Special handling for \textcolor in LED position
			// If we see \textcolor{color}{...} and ... starts with an operator,
			// we want to treat it transparently (not as implicit multiplication)
			if (this.checkCommand('textcolor')) {
				this.handleTextColorTransparent();
				// After this, currentToken is the first token inside the { }
				// Continue the loop - it will be handled appropriately
				continue;
			}

			// Capture color BEFORE consuming operator (color scope may close during parsing)
			const operatorColor = this.colorStack.current();

			// Explicit multiplication operators
			if (this.check('STAR')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.multiply(left, right, 'star'), operatorColor);
			} else if (this.check('SLASH')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'inline'), operatorColor);
			} else if (this.check('COLON')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'ratio'), operatorColor);
			}
			// \cdot and \times commands
			else if (this.checkCommand('cdot')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.multiply(left, right, 'dot'), operatorColor);
			} else if (this.checkCommand('times')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.multiply(left, right, 'cross'), operatorColor);
			}
			// Implicit multiplication
			else if (this.shouldInsertImplicitMultiply()) {
				const right = this.parseUnary();
				left = this.applyColorWithOperator(
					MathAST.multiply(left, right, 'implicit'),
					operatorColor
				);
			} else {
				// No more multiplication operators
				break;
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
	 * unary := ('+' | '-')? power
	 */
	private parseUnary(): MathNode {
		if (this.check('MINUS')) {
			this.advance();
			const operand = this.parseUnary();
			return this.applyColor(MathAST.opposite(operand));
		}

		if (this.check('PLUS')) {
			this.advance();
			const operand = this.parseUnary();
			return this.applyColor(MathAST.positive(operand));
		}

		return this.parsePower();
	}

	/**
	 * power := postfix ('^' powerOperand | '_' subscriptOperand)*
	 *
	 * Handles both superscript and subscript with special right-associativity rules:
	 * - x^2^3 => x^(2^3) (right-associative for chained same operator)
	 * - x_1^2 => (x_1)^2 (left-to-right for mixed operators)
	 */
	private parsePower(): MathNode {
		let left = this.parsePostfix();

		while (true) {
			// Special handling for \textcolor in this position
			if (this.checkCommand('textcolor')) {
				this.handleTextColorTransparent();
				continue;
			}

			if (this.check('CARET')) {
				this.advance();
				const exponent = this.parsePowerOperand();
				left = this.applyColor(MathAST.superscript(left, exponent));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				const sub = this.parseSubscriptOperand();
				left = this.applyColor(MathAST.subscript(left, sub));
			} else {
				break;
			}

			// Check if we need to close a color scope AFTER parsing the operator
			while (this.check('RBRACE') && this.colorScopeStack.length > 0) {
				this.advance(); // consume }
				this.colorScopeStack.pop();
				this.colorStack.pop();
			}
		}

		return left;
	}

	/**
	 * Parse the operand of a superscript (handles braces and right-associativity)
	 * For x^2^3 to parse as x^(2^3):
	 * - If braced, just parse the brace group
	 * - If not braced, parse a single primary, then check for chained ^
	 */
	private parsePowerOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}

		// Parse single primary token
		const operand = this.parsePrimary();

		// Check for chained superscript (right-associativity)
		if (this.check('CARET')) {
			this.advance();
			const nextOperand = this.parsePowerOperand();
			return this.applyColor(MathAST.superscript(operand, nextOperand));
		}

		return operand;
	}

	/**
	 * Parse the operand of a subscript (handles braces and right-associativity)
	 * For x_a_b to parse as x_(a_b):
	 * - If braced, just parse the brace group
	 * - If not braced, parse a single primary, then check for chained _
	 */
	private parseSubscriptOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}

		// Parse single primary token
		const operand = this.parsePrimary();

		// Check for chained subscript (right-associativity)
		if (this.check('UNDERSCORE')) {
			this.advance();
			const nextOperand = this.parseSubscriptOperand();
			return this.applyColor(MathAST.subscript(operand, nextOperand));
		}

		return operand;
	}

	/**
	 * postfix := primary ('~' '\unit' group)?
	 */
	private parsePostfix(): MathNode {
		let node = this.parsePrimary();

		if (this.check('TILDE')) {
			this.advance();

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

			node = this.applyColor(MathAST.withUnit(node, unit));
		}

		return node;
	}

	/**
	 * primary := NUMBER | LETTER | GREEK | SYMBOL | fraction | sqrt | function | delimiter | color | braceGroup
	 */
	private parsePrimary(): MathNode {
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
	 * Parse a variable (single letter)
	 */
	private parseVariable(): MathNode {
		const token = this.advance();
		return this.applyColor(MathAST.variable(token.value));
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
		const content = this.parseExpression();
		this.expect('RPAREN', "Expected ')' after expression");
		return this.applyColor(MathAST.delimiter('parentheses', content, 'grouping'));
	}

	/**
	 * Parse brace group: {...}
	 */
	private parseBraceGroup(): MathNode {
		this.advance(); // consume {
		const content = this.parseExpression();
		this.expect('RBRACE', "Expected '}' after expression");
		return content;
	}

	/**
	 * Parse absolute value: |...| → abs(...)
	 */
	private parseAbsoluteValue(): MathNode {
		this.advance(); // consume |
		const content = this.parseExpression();
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
		const content = this.parseExpression();

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
			power = this.parsePowerOperand();
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
		const arg = this.parsePrimary();
		return [arg];
	}

	/**
	 * Parse a comma-separated list of expressions
	 */
	private parseCommaList(): MathNode[] {
		const items: MathNode[] = [];

		items.push(this.parseExpression());

		while (this.check('COMMA')) {
			this.advance();
			items.push(this.parseExpression());
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
		const numerator = this.parseExpression();
		this.expect('RBRACE', "Expected '}' after \\frac numerator");

		// Parse denominator
		this.expect('LBRACE', "Expected '{' for \\frac denominator");
		const denominator = this.parseExpression();
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
			nthRoot = this.parseExpression();
			this.expect('RBRACKET', "Expected ']' after sqrt index");
		}

		// Parse radicand
		this.expect('LBRACE', "Expected '{' for \\sqrt argument");
		const radicand = this.parseExpression();
		this.expect('RBRACE', "Expected '}' after \\sqrt argument");

		// If nth root specified, use base for the index
		if (nthRoot) {
			return this.applyColor(MathAST.func('sqrt', [radicand], { base: nthRoot }));
		}

		return this.applyColor(MathAST.func('sqrt', [radicand]));
	}

	/**
	 * Handle \textcolor transparently (in LED/middle of expression position)
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
	private handleTextColorTransparent(): void {
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

		// Parse content
		this.expect('LBRACE', "Expected '{' for \\textcolor content");
		const content = this.parseExpression();
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
		// Return a number 1 with the unit for standalone \unit
		return this.applyColor(MathAST.withUnit(MathAST.number('1'), unit));
	}

	// =========================================================================
	// Unit Parsing
	// =========================================================================

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
	 * Apply a pre-captured color to a node's metadata and operator/relation metadata.
	 * Used when the color must be captured BEFORE parsing the right operand
	 * (because the color scope might close during parsing).
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
// AST Security Helpers
// =============================================================================

/**
 * Get all child nodes of a MathNode for traversal.
 */
function getNodeChildren(node: MathNode): MathNode[] {
	const children: MathNode[] = [];

	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			children.push(node.left, node.right);
			break;
		case 'division':
			children.push(node.numerator, node.denominator);
			break;
		case 'opposite':
		case 'positive':
			children.push(node.operand);
			break;
		case 'superscript':
			children.push(node.base, node.superscript);
			break;
		case 'subscript':
			children.push(node.base, node.subscript);
			break;
		case 'function':
			children.push(...node.args);
			if (node.power) children.push(node.power);
			if (node.base) children.push(node.base);
			break;
		case 'relation':
			children.push(node.left, node.right);
			break;
		case 'delimiter':
			children.push(node.content);
			break;
		case 'unit':
			children.push(node.expression);
			break;
		case 'composition':
			children.push(node.outer, node.inner);
			break;
		// Leaf nodes: number, variable, greek, symbol, hole - no children
	}

	return children;
}

/**
 * Measure AST depth and node count using iterative BFS (avoids stack overflow).
 */
function measureAST(node: MathNode | null): { depth: number; nodeCount: number } {
	if (!node) return { depth: 0, nodeCount: 0 };

	let nodeCount = 0;
	let maxDepth = 0;

	// Use BFS with depth tracking
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
 * Check AST security limits after parsing.
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
 * Parse a LaTeX string into a MathAST node using Recursive Descent.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The LaTeX string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 * @throws SecurityError if security limits are exceeded
 */
export function parseRD(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	checkInputLength(input, security.maxInputLength);

	const parser = new RDParser(input, fullOptions);
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

	// Check AST limits AFTER parsing
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
export function parseRDSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	// SecurityError is NOT caught - it propagates up
	checkInputLength(input, security.maxInputLength);

	const parser = new RDParser(input, fullOptions);

	try {
		const ast = parser.parse();

		// Check AST limits AFTER parsing
		// SecurityError propagates up (not caught)
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
		throw e;
	}
}
