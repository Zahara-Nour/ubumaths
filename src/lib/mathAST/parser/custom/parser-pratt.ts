/**
 * Pratt Parser for Custom Syntax to MathAST
 *
 * A Top-Down Operator Precedence (Pratt) parser for converting custom
 * mathematical expressions into MathAST nodes.
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
 * Key difference from LaTeX parser:
 * - `/` has highest precedence (binds at atom level), creating fractions
 * - `2+3/4+5` parses as `Add(Add(2, Div(3,4)), 5)`
 *
 * @module mathAST/parser/custom/parser-pratt
 */

import type { MathNode, GreekLetter, MathSymbol, RelationType, NodeMetadata } from '../../types';
import type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { CustomTokenizer, type CustomToken, type CustomTokenType } from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from '../latex/color-stack';
import { MathAST } from '../../factory';
import { parse as parseUnit } from '../../units/parser';

// =============================================================================
// Binding Power (Precedence)
// =============================================================================

/**
 * Binding power constants for operator precedence.
 * Higher values bind tighter.
 *
 * CRITICAL: Unlike the LaTeX parser, `/` is NOT at multiplicative level.
 * Instead, `/` is handled at PRIMARY level in parseAtomWithFraction().
 * This ensures `2+3/4` parses as `2+(3/4)`, not `(2+3)/4`.
 */
const enum BP {
	NONE = 0,
	STOP_AT_PIPE = 1, // Special: stop parsing when encountering PIPE (for absolute value content)
	RELATION = 10, // =, <, >, <=, >=, !=, <=>, =>
	ADDITION = 20, // +, -
	MULTIPLY = 30, // *, :/, :, implicit multiplication
	UNARY = 40, // prefix -, +
	POWER = 50 // ^, _ (right-associative)
}

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

/**
 * Function names recognized by the parser
 * Note: The tokenizer handles function recognition, but this set is kept
 * for potential future use (validation, error messages, etc.)
 */
const _FUNCTION_NAMES: ReadonlySet<string> = new Set([
	'sin',
	'cos',
	'tan',
	'ln',
	'log',
	'exp',
	'sqrt'
]);

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
 * Pratt parser for custom syntax to MathAST conversion.
 *
 * Uses top-down operator precedence parsing with:
 * - NUD (Null Denotation) for prefix/primary expressions
 * - LED (Left Denotation) for infix/postfix expressions
 *
 * Key insight: `/` is handled at PRIMARY level, not multiplicative.
 */
class CustomPrattParser {
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
			const result = this.parseExpression(BP.NONE);
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
			// Special handling for PIPE: it can be both opening (for implicit mult)
			// and closing (for absolute value). We handle it as follows:
			// - If minBp >= BP.STOP_AT_PIPE (we're inside an absolute value), stop at PIPE
			// - If minBp == BP.NONE (top-level), PIPE means implicit mult with absolute value
			if (this.check('PIPE')) {
				if (minBp >= BP.STOP_AT_PIPE) {
					// Inside absolute value context, stop here so expect('PIPE') can consume it
					break;
				}
				// Top-level PIPE: implicit multiplication with absolute value
				left = this.led(left);
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
				return this.parseAtomWithFraction();

			case 'LETTER':
				return this.parseAtomWithFraction();

			case 'SYMBOL':
			case 'BACKSLASH':
				return this.parseAtomWithFraction();

			case 'FUNC':
				return this.parseAtomWithFraction();

			case 'LPAREN':
				return this.parseAtomWithFraction();

			case 'LBRACE':
				return this.parseAtomWithFraction();

			case 'PIPE':
				return this.parseAtomWithFraction();

			case 'AT':
				return this.parseAtomWithFraction();

			case 'MINUS':
				return this.parsePrefixMinus();

			case 'PLUS':
				return this.parsePrefixPlus();

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
				return this.parseMultiplication(left, 'cross');

			case 'COLON_SLASH':
				return this.parseDivision(left, 'inline');

			case 'COLON':
				return this.parseDivision(left, 'ratio');

			case 'CARET':
				return this.parseSuperscript(left);

			case 'UNDERSCORE':
				return this.parseSubscript(left);

			case 'LBRACKET':
				return this.parseUnitPostfix(left);

			case 'EQUALS':
				return this.parseRelation(left, '=');

			case 'LESS':
				return this.parseRelation(left, '<');

			case 'GREATER':
				return this.parseRelation(left, '>');

			case 'LESS_EQUAL':
				return this.parseRelation(left, '<=');

			case 'GREATER_EQUAL':
				return this.parseRelation(left, '>=');

			case 'NOT_EQUAL':
				return this.parseRelation(left, '!=');

			case 'IFF':
				return this.parseRelation(left, '⟺');

			case 'IMPLIES':
				return this.parseRelation(left, '⟹');

			case 'PIPE':
				// PIPE in LED position means implicit multiplication with absolute value
				// e.g., 2|x| = 2 * |x|
				// We handle this specially to avoid the ambiguity with closing |
				return this.parseImplicitMultiplyWithAbsoluteValue(left);

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
	 *
	 * NOTE: SLASH is NOT included here - it's handled at PRIMARY level
	 */
	private getLeftBindingPower(): number {
		const token = this.currentToken;

		switch (token.type) {
			case 'PLUS':
			case 'MINUS':
				return BP.ADDITION;

			case 'STAR':
			case 'COLON_SLASH':
			case 'COLON':
				return BP.MULTIPLY;

			case 'CARET':
			case 'UNDERSCORE':
				return BP.POWER;

			case 'EQUALS':
			case 'LESS':
			case 'GREATER':
			case 'LESS_EQUAL':
			case 'GREATER_EQUAL':
			case 'NOT_EQUAL':
			case 'IFF':
			case 'IMPLIES':
				return BP.RELATION;

			case 'LBRACKET':
				// Units bind tightly to the preceding expression
				return BP.POWER + 1;

			// For implicit multiplication
			// NOTE: PIPE is NOT included here - it's handled specially in led()
			// because | is both opening and closing delimiter for absolute value
			case 'LETTER':
			case 'LPAREN':
			case 'LBRACE':
			case 'FUNC':
			case 'SYMBOL':
			case 'BACKSLASH':
			case 'AT':
				return BP.MULTIPLY;

			default:
				break;
		}

		return BP.NONE;
	}

	// =========================================================================
	// Primary Parsers with Fraction Handling
	// =========================================================================

	/**
	 * Parse an atom and handle tight-binding `/` at PRIMARY level.
	 *
	 * This is the KEY insight: `/` creates fractions at the primary level,
	 * NOT at the multiplicative level. This ensures:
	 * - `2+3/4+5` parses as `Add(Add(2, Div(3,4)), 5)`
	 * - `2*3/4` parses as `Mult(2, Div(3,4))`
	 *
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
	 * Parse a single atomic expression (no `/` handling here)
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
					`Unexpected token in atom: ${token.value || token.type}`,
					token.position,
					token.length,
					'UNEXPECTED_TOKEN'
				);
		}
	}

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

		const content = this.parseExpression(BP.NONE);
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

		const content = this.parseExpression(BP.NONE);
		this.expect('RBRACE', "Expected '}' after expression");

		// Braces are TRANSPARENT - return content directly
		return content;
	}

	/**
	 * Parse absolute value: |...| -> abs(...)
	 */
	private parseAbsoluteValue(): MathNode {
		this.advance(); // consume first |
		// Use STOP_AT_PIPE so parseExpression knows to stop at the closing |
		const content = this.parseExpression(BP.STOP_AT_PIPE);
		this.expect('PIPE', "Expected '|' to close absolute value");

		// abs is represented as FunctionNode with name='abs'
		return this.applyColor(MathAST.func('abs', [content]));
	}

	// =========================================================================
	// Unary Operators
	// =========================================================================

	/**
	 * Parse prefix minus: -x
	 */
	private parsePrefixMinus(): MathNode {
		// Check for double minus (error case)
		const minusToken = this.currentToken;
		this.advance(); // consume first -

		if (this.check('MINUS')) {
			this.error(
				'Double minus not allowed: use parentheses -(-x) instead',
				minusToken.position,
				2,
				'UNEXPECTED_TOKEN'
			);
		}

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
		const operatorColor = this.colorStack.current();
		this.advance(); // consume +
		const right = this.parseExpression(BP.ADDITION);
		return this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
	}

	/**
	 * Parse subtraction: left - right
	 */
	private parseSubtraction(left: MathNode): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume -
		const right = this.parseExpression(BP.ADDITION);
		return this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
	}

	/**
	 * Parse multiplication with explicit operator (* only at multiplicative level)
	 */
	private parseMultiplication(left: MathNode, style: 'cross'): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume operator
		const right = this.parseExpression(BP.MULTIPLY);
		return this.applyColorWithOperator(MathAST.multiply(left, right, style), operatorColor);
	}

	/**
	 * Parse division: :/ (inline) or : (ratio)
	 * NOTE: / (fraction) is handled in parseAtomWithFraction, not here!
	 */
	private parseDivision(left: MathNode, style: 'inline' | 'ratio'): MathNode {
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
			this.isRelationToken(token.type)
		) {
			return false;
		}

		// NUMBER cannot start implicit multiplication (prevents x2, (a)2)
		if (token.type === 'NUMBER') {
			return false;
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

	/**
	 * Check if a token type is a relation
	 */
	private isRelationToken(type: CustomTokenType): boolean {
		return (
			type === 'EQUALS' ||
			type === 'LESS' ||
			type === 'GREATER' ||
			type === 'LESS_EQUAL' ||
			type === 'GREATER_EQUAL' ||
			type === 'NOT_EQUAL' ||
			type === 'IFF' ||
			type === 'IMPLIES'
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

	/**
	 * Parse implicit multiplication with absolute value: 2|x| -> 2 * |x|
	 *
	 * This is handled specially because | is both opening and closing delimiter.
	 * We can't give | binding power without breaking the closing | detection.
	 */
	private parseImplicitMultiplyWithAbsoluteValue(left: MathNode): MathNode {
		// Parse the absolute value directly (don't use parseExpression)
		const absValue = this.parseAbsoluteValue();

		// Check for additional postfix operators (^, _, [])
		let right = absValue;
		while (this.check('CARET') || this.check('UNDERSCORE') || this.check('LBRACKET')) {
			if (this.check('CARET')) {
				this.advance();
				const exp = this.parsePowerOperand();
				right = this.applyColor(MathAST.superscript(right, exp));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				const sub = this.parseSubscriptOperand();
				right = this.applyColor(MathAST.subscript(right, sub));
			} else if (this.check('LBRACKET')) {
				right = this.parseUnitPostfix(right);
			}
		}

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
		const exponent = this.parsePowerOperand();
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

	// =========================================================================
	// Relations
	// =========================================================================

	/**
	 * Parse a relation: left op right
	 */
	private parseRelation(left: MathNode, relType: RelationType): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume operator
		const right = this.parseExpression(BP.RELATION);
		return this.applyColorWithOperator(MathAST.relation(relType, left, right), operatorColor);
	}

	// =========================================================================
	// Functions
	// =========================================================================

	/**
	 * Parse a function: sin(x), log_2(x), sin^2(x), sqrt[n](x)
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

		// Handle sqrt[n] for nth root - check for bracket INSIDE parentheses
		let nthRoot: MathNode | undefined;
		if (name === 'sqrt' && this.check('LBRACKET')) {
			this.advance();
			nthRoot = this.parseExpression(BP.NONE);
			this.expect('RBRACKET', "Expected ']' after nth root index");
		}

		// Parse arguments
		const args: MathNode[] = [];
		if (!this.check('RPAREN')) {
			args.push(this.parseExpression(BP.NONE));
			while (this.check('COMMA')) {
				this.advance();
				args.push(this.parseExpression(BP.NONE));
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
		const content = this.parseExpression(BP.NONE);
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
 * Parse a custom syntax string into a MathAST node.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 */
export function parseCustomPratt(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	const parser = new CustomPrattParser(input, fullOptions);
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
export function parseCustomPrattSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	const parser = new CustomPrattParser(input, fullOptions);

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
