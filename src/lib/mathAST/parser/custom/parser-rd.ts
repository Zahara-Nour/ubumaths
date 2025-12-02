/**
 * Recursive Descent Parser for Custom Syntax to MathAST
 *
 * A Recursive Descent parser for converting custom mathematical expressions
 * into MathAST nodes. This is an alternative implementation to the Pratt parser
 * and produces identical AST output.
 *
 * Features:
 * - `/` at PRIMARY level creates fractions (not multiplicative level)
 * - `:/` for inline division, `:` for ratio at multiplicative level
 * - Implicit multiplication detection
 * - Mandatory parentheses for functions
 * - Color support via @color{} syntax
 * - Unit support via [unit] syntax
 * - Color stack for @color{} nesting
 * - Tolerant and strict parsing modes
 *
 * Grammar:
 *   expression      := relation
 *   relation        := additive (RELATION_OP additive)*
 *   additive        := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative  := unary (('*' | ':/' | ':' | IMPLICIT) unary)*
 *   unary           := ('+' | '-')? power
 *   power           := postfix ('^' powerOperand | '_' subscriptOperand)*
 *   postfix         := atomWithFraction ('[' unit ']')?
 *   atomWithFraction := atom ('/' atom)*    // CRITICAL: / at primary level!
 *   atom            := NUMBER | LETTER | SYMBOL | function | parens | braces | absValue | color
 *
 * Key difference from LaTeX parser:
 * - `/` has highest precedence (binds at atom level), creating fractions
 * - `2+3/4+5` parses as `Add(Add(2, Div(3,4)), 5)`
 *
 * @module mathAST/parser/custom/parser-rd
 */

import type { MathNode, GreekLetter, MathSymbol, RelationType, NodeMetadata } from '../../types';
import type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { CustomTokenizer, type CustomToken, type CustomTokenType } from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from '../latex/color-stack';
import { MathAST } from '../../factory';
import { parse as parseUnit } from '../../units/parser';

// =============================================================================
// Symbol Mapping
// =============================================================================

/**
 * Map custom syntax symbol names to MathAST GreekLetter type
 */
const GREEK_SYMBOL_MAP: Record<string, GreekLetter> = {
	pi: 'pi',
	alpha: 'alpha',
	beta: 'beta',
	gamma: 'gamma',
	theta: 'theta'
};

/**
 * Map custom syntax symbol names to MathAST MathSymbol type
 */
const MATH_SYMBOL_MAP: Record<string, MathSymbol> = {
	infty: 'infinity'
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
 * Recursive Descent parser for custom syntax to MathAST conversion.
 *
 * Uses a grammar-based approach with explicit precedence levels encoded
 * in the grammar structure itself.
 */
class CustomRDParser {
	private readonly tokenizer: CustomTokenizer;
	private readonly colorStack: ColorStack;
	private readonly options: ParserOptions;
	private readonly errors: ParseError[] = [];
	private currentToken: CustomToken;

	constructor(input: string, options: ParserOptions) {
		this.tokenizer = new CustomTokenizer(input);
		this.colorStack = new ColorStack();
		this.options = options;
		this.currentToken = this.tokenizer.nextToken();
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
			if ((this.currentToken.type as string) !== 'EOF') {
				this.error(
					`Unexpected token: ${this.currentToken.value || this.currentToken.type}`,
					this.currentToken.position,
					this.currentToken.length,
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
	 * Advance to the next token
	 */
	private advance(): CustomToken {
		const prev = this.currentToken;
		this.currentToken = this.tokenizer.nextToken();
		return prev;
	}

	/**
	 * Check if the current token matches the given type
	 */
	private check(type: CustomTokenType): boolean {
		return this.currentToken.type === type;
	}

	/**
	 * Expect a specific token type, advancing if matched
	 */
	private expect(type: CustomTokenType, message?: string): CustomToken {
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
			const operatorColor = this.colorStack.current();
			const relType = this.consumeRelationOperator();
			const right = this.parseAdditive();
			left = this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);
		}

		return left;
	}

	/**
	 * Check if current token is a relation operator
	 */
	private isRelationOperator(): boolean {
		return (
			this.check('EQUALS') ||
			this.check('LESS') ||
			this.check('GREATER') ||
			this.check('LESS_EQUAL') ||
			this.check('GREATER_EQUAL') ||
			this.check('NOT_EQUAL') ||
			this.check('IFF') ||
			this.check('IMPLIES')
		);
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
		if (token.type === 'LESS_EQUAL') {
			this.advance();
			return '<=';
		}
		if (token.type === 'GREATER_EQUAL') {
			this.advance();
			return '>=';
		}
		if (token.type === 'NOT_EQUAL') {
			this.advance();
			return '!=';
		}
		if (token.type === 'IFF') {
			this.advance();
			return '⟺';
		}
		if (token.type === 'IMPLIES') {
			this.advance();
			return '⟹';
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
			const operatorColor = this.colorStack.current();
			const isPlus = this.check('PLUS');
			this.advance();
			const right = this.parseMultiplicative();

			if (isPlus) {
				left = this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
			} else {
				left = this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
			}
		}

		return left;
	}

	/**
	 * multiplicative := unary (('*' | ':/' | ':' | IMPLICIT) unary)*
	 *
	 * Multiplication and division at multiplicative level are left-associative.
	 * Note: '/' is NOT handled here - it's at the PRIMARY level (atomWithFraction)
	 */
	private parseMultiplicative(): MathNode {
		let left = this.parseUnary();

		while (true) {
			const operatorColor = this.colorStack.current();

			if (this.check('STAR')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.multiply(left, right, 'cross'), operatorColor);
			} else if (this.check('COLON_SLASH')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'inline'), operatorColor);
			} else if (this.check('COLON')) {
				this.advance();
				const right = this.parseUnary();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'ratio'), operatorColor);
			} else if (this.shouldInsertImplicitMultiply()) {
				const right = this.parseUnary();
				left = this.applyColor(MathAST.multiply(left, right, 'implicit'));
			} else {
				break;
			}
		}

		return left;
	}

	/**
	 * unary := ('+' | '-')? power
	 */
	private parseUnary(): MathNode {
		if (this.check('MINUS')) {
			// Check for double minus (error case)
			const minusToken = this.currentToken;
			this.advance();

			if (this.check('MINUS')) {
				this.error(
					'Double minus not allowed: use parentheses -(-x) instead',
					minusToken.position,
					2,
					'UNEXPECTED_TOKEN'
				);
			}

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
	 * Handles both superscript and subscript with left-to-right for mixed:
	 * - x_1^2 => (x_1)^2
	 * - x^2_1 => (x^2)_1
	 */
	private parsePower(): MathNode {
		let left = this.parsePostfix();

		while (this.check('CARET') || this.check('UNDERSCORE')) {
			if (this.check('CARET')) {
				this.advance();
				const exponent = this.parsePowerOperand();
				left = this.applyColor(MathAST.superscript(left, exponent));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				const sub = this.parseSubscriptOperand();
				left = this.applyColor(MathAST.subscript(left, sub));
			}
		}

		return left;
	}

	/**
	 * Parse the operand of a superscript (handles braces and single tokens)
	 */
	private parsePowerOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}

		// CRITICAL: Minus REQUIRES braces for exponent
		if (this.check('MINUS')) {
			this.error(
				'Negative exponent requires braces: use x^{-2}',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_SUPERSCRIPT'
			);
		}

		// Number: auto-grouped (entire number, e.g., x^12 is fine)
		if (this.check('NUMBER')) {
			return this.parseNumber();
		}

		// Single letter only
		if (this.check('LETTER')) {
			const letter = this.parseVariable();
			// Check for following letter (error case: x^ab)
			if (this.check('LETTER')) {
				this.error(
					'Multiple letters in exponent require braces: use x^{ab}',
					this.currentToken.position,
					this.currentToken.length,
					'INVALID_SUPERSCRIPT'
				);
			}
			return letter;
		}

		// Symbol
		if (this.check('SYMBOL')) {
			return this.parseSymbol();
		}

		this.error(
			'Expected exponent',
			this.currentToken.position,
			this.currentToken.length,
			'INVALID_SUPERSCRIPT'
		);
	}

	/**
	 * Parse the operand of a subscript (handles braces and single tokens)
	 */
	private parseSubscriptOperand(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}

		// Number: auto-grouped (entire number, e.g., x_12 is fine)
		if (this.check('NUMBER')) {
			return this.parseNumber();
		}

		// Single letter only - multi-letter requires braces
		if (this.check('LETTER')) {
			const letter = this.parseVariable();
			// Check for following letter (error case: x_ab)
			if (this.check('LETTER')) {
				this.error(
					'Multiple letters in subscript require braces: use x_{ab}',
					this.currentToken.position,
					this.currentToken.length,
					'INVALID_SUBSCRIPT'
				);
			}
			return letter;
		}

		// Symbol
		if (this.check('SYMBOL')) {
			return this.parseSymbol();
		}

		this.error(
			'Expected subscript operand',
			this.currentToken.position,
			this.currentToken.length,
			'INVALID_SUBSCRIPT'
		);
	}

	/**
	 * postfix := atomWithFraction ('[' unit ']')?
	 */
	private parsePostfix(): MathNode {
		let node = this.parseAtomWithFraction();

		if (this.check('LBRACKET')) {
			node = this.parseUnitPostfix(node);
		}

		return node;
	}

	/**
	 * atomWithFraction := atom ('/' atom)*
	 *
	 * CRITICAL: This is where '/' is handled at PRIMARY level.
	 * This ensures `2+3/4` parses as `2+(3/4)`, not `(2+3)/4`.
	 * The `/` operator binds tighter than `+` or `*` because it consumes
	 * only the immediately adjacent atoms, not full expressions.
	 */
	private parseAtomWithFraction(): MathNode {
		let left = this.parseAtom();

		// Handle tight-binding / at PRIMARY level
		while (this.check('SLASH')) {
			this.advance(); // consume /
			const right = this.parseAtom(); // Parse ONLY next atom
			left = this.applyColor(MathAST.divide(left, right, 'fraction'));
		}

		return left;
	}

	/**
	 * atom := NUMBER | LETTER | SYMBOL | function | parens | braces | absValue | color
	 */
	private parseAtom(): MathNode {
		const token = this.currentToken;

		switch (token.type) {
			case 'NUMBER':
				return this.parseNumber();

			case 'LETTER':
				return this.parseVariable();

			case 'SYMBOL':
				return this.parseSymbol();

			case 'BACKSLASH':
				return this.parseBackslashSymbol();

			case 'FUNC':
				return this.parseFunction();

			case 'LPAREN':
				return this.parseParentheses();

			case 'LBRACE':
				return this.parseBraceGroup();

			case 'PIPE':
				return this.parseAbsoluteValue();

			case 'AT':
				return this.parseColor();

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

		// These tokens can NEVER start implicit multiplication
		if (
			token.type === 'EOF' ||
			token.type === 'PLUS' ||
			token.type === 'MINUS' ||
			token.type === 'STAR' ||
			token.type === 'SLASH' ||
			token.type === 'COLON_SLASH' ||
			token.type === 'COLON' ||
			token.type === 'CARET' ||
			token.type === 'UNDERSCORE' ||
			token.type === 'RPAREN' ||
			token.type === 'RBRACE' ||
			token.type === 'RBRACKET' ||
			token.type === 'COMMA' ||
			this.isRelationOperator()
		) {
			return false;
		}

		// NUMBER cannot start implicit multiplication (prevents x2, (a)2)
		if (token.type === 'NUMBER') {
			return false;
		}

		// PIPE is special - it can trigger implicit multiplication with absolute value
		// e.g., 2|x| = 2 * |x|
		if (token.type === 'PIPE') {
			return true;
		}

		// These CAN start implicit multiplication
		return (
			token.type === 'LETTER' ||
			token.type === 'LPAREN' ||
			token.type === 'LBRACE' ||
			token.type === 'FUNC' ||
			token.type === 'SYMBOL' ||
			token.type === 'BACKSLASH' ||
			token.type === 'AT'
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
	 * Parse a symbol token (e.g., from \pi, \alpha)
	 */
	private parseSymbol(): MathNode {
		const token = this.advance();
		const symbolName = token.value;

		// Check if it's a Greek letter
		if (symbolName in GREEK_SYMBOL_MAP) {
			return this.applyColor(MathAST.greek(GREEK_SYMBOL_MAP[symbolName]));
		}

		// Check if it's a math symbol
		if (symbolName in MATH_SYMBOL_MAP) {
			return this.applyColor(MathAST.symbol(MATH_SYMBOL_MAP[symbolName]));
		}

		// Unknown symbol
		this.error(`Unknown symbol: \\${symbolName}`, token.position, token.length, 'UNKNOWN_COMMAND');
	}

	/**
	 * Parse a backslash that wasn't recognized as a valid symbol
	 */
	private parseBackslashSymbol(): MathNode {
		const token = this.currentToken;
		this.error(
			`Invalid backslash sequence at position ${token.position}`,
			token.position,
			token.length,
			'UNKNOWN_COMMAND'
		);
	}

	// =========================================================================
	// Delimiter Parsers
	// =========================================================================

	/**
	 * Parse parentheses: (...)
	 * Creates a DelimiterNode (parentheses are NOT transparent)
	 */
	private parseParentheses(): MathNode {
		this.advance(); // consume (

		if (this.check('RPAREN')) {
			this.error('Empty parentheses not allowed', this.currentToken.position, 1, 'EMPTY_GROUP');
		}

		const content = this.parseExpression();
		this.expect('RPAREN', "Expected ')' after expression");

		// Parentheses create a DelimiterNode
		return this.applyColor(MathAST.parentheses(content));
	}

	/**
	 * Parse brace group: {...}
	 * Braces are TRANSPARENT - return content directly, no wrapper node
	 */
	private parseBraceGroup(): MathNode {
		this.advance(); // consume {

		if (this.check('RBRACE')) {
			this.error('Empty brace group not allowed', this.currentToken.position, 1, 'EMPTY_GROUP');
		}

		const content = this.parseExpression();
		this.expect('RBRACE', "Expected '}' after expression");

		// Braces are TRANSPARENT - return content directly
		return content;
	}

	/**
	 * Parse absolute value: |...| -> abs(...)
	 */
	private parseAbsoluteValue(): MathNode {
		this.advance(); // consume first |
		const content = this.parseAbsoluteValueContent();
		this.expect('PIPE', "Expected '|' to close absolute value");

		// abs is represented as FunctionNode with name='abs'
		return this.applyColor(MathAST.func('abs', [content]));
	}

	/**
	 * Parse the content inside absolute value, stopping at PIPE
	 */
	private parseAbsoluteValueContent(): MathNode {
		// We need to parse the expression but stop at PIPE
		// Use a modified parsing approach that stops at PIPE
		return this.parseRelationStopAtPipe();
	}

	/**
	 * Parse relation, stopping at PIPE (for absolute value content)
	 */
	private parseRelationStopAtPipe(): MathNode {
		let left = this.parseAdditiveStopAtPipe();

		while (this.isRelationOperator()) {
			const operatorColor = this.colorStack.current();
			const relType = this.consumeRelationOperator();
			const right = this.parseAdditiveStopAtPipe();
			left = this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);
		}

		return left;
	}

	/**
	 * Parse additive, stopping at PIPE
	 */
	private parseAdditiveStopAtPipe(): MathNode {
		let left = this.parseMultiplicativeStopAtPipe();

		while ((this.check('PLUS') || this.check('MINUS')) && !this.check('PIPE')) {
			const operatorColor = this.colorStack.current();
			const isPlus = this.check('PLUS');
			this.advance();
			const right = this.parseMultiplicativeStopAtPipe();

			if (isPlus) {
				left = this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
			} else {
				left = this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
			}
		}

		return left;
	}

	/**
	 * Parse multiplicative, stopping at PIPE
	 */
	private parseMultiplicativeStopAtPipe(): MathNode {
		let left = this.parseUnaryStopAtPipe();

		while (true) {
			if (this.check('PIPE')) break;

			const operatorColor = this.colorStack.current();

			if (this.check('STAR')) {
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.applyColorWithOperator(MathAST.multiply(left, right, 'cross'), operatorColor);
			} else if (this.check('COLON_SLASH')) {
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'inline'), operatorColor);
			} else if (this.check('COLON')) {
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.applyColorWithOperator(MathAST.divide(left, right, 'ratio'), operatorColor);
			} else if (this.shouldInsertImplicitMultiplyStopAtPipe()) {
				const right = this.parseUnaryStopAtPipe();
				left = this.applyColor(MathAST.multiply(left, right, 'implicit'));
			} else {
				break;
			}
		}

		return left;
	}

	/**
	 * Check for implicit multiply, but don't trigger on PIPE
	 */
	private shouldInsertImplicitMultiplyStopAtPipe(): boolean {
		if (this.check('PIPE')) return false;
		return this.shouldInsertImplicitMultiply();
	}

	/**
	 * Parse unary, stopping at PIPE
	 */
	private parseUnaryStopAtPipe(): MathNode {
		if (this.check('MINUS')) {
			const minusToken = this.currentToken;
			this.advance();

			if (this.check('MINUS')) {
				this.error(
					'Double minus not allowed: use parentheses -(-x) instead',
					minusToken.position,
					2,
					'UNEXPECTED_TOKEN'
				);
			}

			const operand = this.parseUnaryStopAtPipe();
			return this.applyColor(MathAST.opposite(operand));
		}

		if (this.check('PLUS')) {
			this.advance();
			const operand = this.parseUnaryStopAtPipe();
			return this.applyColor(MathAST.positive(operand));
		}

		return this.parsePowerStopAtPipe();
	}

	/**
	 * Parse power, stopping at PIPE
	 */
	private parsePowerStopAtPipe(): MathNode {
		let left = this.parsePostfixStopAtPipe();

		while ((this.check('CARET') || this.check('UNDERSCORE')) && !this.check('PIPE')) {
			if (this.check('CARET')) {
				this.advance();
				const exponent = this.parsePowerOperand();
				left = this.applyColor(MathAST.superscript(left, exponent));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				const sub = this.parseSubscriptOperand();
				left = this.applyColor(MathAST.subscript(left, sub));
			}
		}

		return left;
	}

	/**
	 * Parse postfix, stopping at PIPE
	 */
	private parsePostfixStopAtPipe(): MathNode {
		let node = this.parseAtomWithFractionStopAtPipe();

		if (this.check('LBRACKET')) {
			node = this.parseUnitPostfix(node);
		}

		return node;
	}

	/**
	 * Parse atomWithFraction, stopping at PIPE
	 */
	private parseAtomWithFractionStopAtPipe(): MathNode {
		let left = this.parseAtomStopAtPipe();

		while (this.check('SLASH') && !this.check('PIPE')) {
			this.advance();
			const right = this.parseAtomStopAtPipe();
			left = this.applyColor(MathAST.divide(left, right, 'fraction'));
		}

		return left;
	}

	/**
	 * Parse atom, but PIPE is not allowed (it's the end delimiter)
	 */
	private parseAtomStopAtPipe(): MathNode {
		const token = this.currentToken;

		// PIPE is not an atom here - it's the closing delimiter
		if (token.type === 'PIPE') {
			this.error(
				'Unexpected | inside absolute value',
				token.position,
				token.length,
				'UNEXPECTED_TOKEN'
			);
		}

		return this.parseAtom();
	}

	// =========================================================================
	// Functions
	// =========================================================================

	/**
	 * Parse a function: sin(x), log_2(x), sin^2(x), sqrt([n]x)
	 *
	 * Parentheses are MANDATORY in custom syntax.
	 */
	private parseFunction(): MathNode {
		const funcToken = this.advance(); // consume FUNC token
		const name = funcToken.value;

		// Check for power BEFORE arguments: sin^2
		let power: MathNode | undefined;
		if (this.check('CARET')) {
			this.advance();
			power = this.parsePowerOperand();
		}

		// Check for base (log only): log_2
		let base: MathNode | undefined;
		if (this.check('UNDERSCORE') && name === 'log') {
			this.advance();
			base = this.parseSubscriptOperand();
		}

		// Parentheses are MANDATORY
		if (!this.check('LPAREN')) {
			this.error(
				`Function ${name} requires parentheses: ${name}(...)`,
				this.currentToken.position,
				this.currentToken.length,
				'MISSING_DELIMITER'
			);
		}

		this.advance(); // consume (

		// Handle sqrt([n]x) for nth root - check for bracket INSIDE parentheses
		let nthRoot: MathNode | undefined;
		if (name === 'sqrt' && this.check('LBRACKET')) {
			this.advance();
			nthRoot = this.parseExpression();
			this.expect('RBRACKET', "Expected ']' after nth root index");
		}

		// Parse arguments
		const args: MathNode[] = [];
		if (!this.check('RPAREN')) {
			args.push(this.parseExpression());
			while (this.check('COMMA')) {
				this.advance();
				args.push(this.parseExpression());
			}
		}

		this.expect('RPAREN', "Expected ')' after function arguments");

		// Create function node with power/base if present
		if (name === 'sqrt' && nthRoot) {
			return this.applyColor(MathAST.func('sqrt', args, { power, base: nthRoot }));
		}

		const funcNode = MathAST.func(name, args, { power, base });
		return this.applyColor(funcNode);
	}

	// =========================================================================
	// Colors
	// =========================================================================

	/**
	 * Parse color: @red{...} or @#FF5500{...}
	 */
	private parseColor(): MathNode {
		this.advance(); // consume @

		let color: string;

		if (this.check('HASH')) {
			// Hex color: @#FF5500
			this.advance(); // consume #
			color = '#' + this.scanHexColor();
		} else if (this.check('LETTER')) {
			// Named color: @red
			color = this.scanColorName();
		} else {
			this.error(
				'Expected color name or hex after @',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_COLOR'
			);
		}

		if (!isValidColor(color)) {
			this.error(
				`Invalid color: ${color}`,
				this.currentToken.position,
				color.length,
				'INVALID_COLOR'
			);
		}

		this.expect('LBRACE', "Expected '{' after color");
		this.colorStack.push(normalizeColor(color));
		const content = this.parseExpression();
		this.expect('RBRACE', "Expected '}' after colored content");
		this.colorStack.pop();

		return content; // Color already applied via applyColor() during parsing
	}

	/**
	 * Scan a hex color value (6 hex digits)
	 */
	private scanHexColor(): string {
		let hex = '';

		// Collect letters and numbers for hex color
		while ((this.check('LETTER') || this.check('NUMBER')) && hex.length < 6) {
			hex += this.currentToken.value;
			this.advance();
		}

		return hex;
	}

	/**
	 * Scan a named color (sequence of letters)
	 */
	private scanColorName(): string {
		let name = '';

		while (this.check('LETTER')) {
			name += this.currentToken.value;
			this.advance();
		}

		return name;
	}

	// =========================================================================
	// Units
	// =========================================================================

	/**
	 * Parse unit postfix: expr[unit]
	 */
	private parseUnitPostfix(left: MathNode): MathNode {
		this.advance(); // consume [

		// Collect unit string until ]
		let unitStr = '';

		while (!this.check('RBRACKET') && !this.check('EOF')) {
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
			} else {
				break;
			}
			this.advance();
		}

		this.expect('RBRACKET', "Expected ']' after unit");

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

	// =========================================================================
	// Color Management
	// =========================================================================

	/**
	 * Apply the current color from the stack to a node's metadata
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
// Public API
// =============================================================================

/**
 * Parse a custom syntax string into a MathAST node using Recursive Descent.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 */
export function parseCustomRD(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	const parser = new CustomRDParser(input, fullOptions);
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

	return result;
}

/**
 * Parse a custom syntax string into a MathAST node with error collection.
 * Returns a ParseResult with the AST and any errors.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode)
 * @returns ParseResult containing the AST and errors
 */
export function parseCustomRDSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	const parser = new CustomRDParser(input, fullOptions);

	try {
		const ast = parser.parse();
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
