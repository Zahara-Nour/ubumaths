/**
 * Spreadsheet Parser - Recursive descent parser for spreadsheet formulas
 *
 * This module provides a parser that converts tokenized formulas into
 * an Abstract Syntax Tree (AST). The parser uses recursive descent
 * to handle operator precedence correctly.
 *
 * Grammar (pseudo-BNF):
 * ```
 * formula     -> "=" expression | expression
 * expression  -> comparison
 * comparison  -> additive (("=" | "<>" | "<" | ">" | "<=" | ">=") additive)*
 * additive    -> multiplicative (("+" | "-") multiplicative)*
 * multiplicative -> power (("*" | "/") power)*
 * power       -> unary ("^" power)?
 * unary       -> ("-" | "+") unary | primary
 * primary     -> NUMBER | STRING | BOOLEAN | cellRef | range | functionCall | "(" expression ")"
 * cellRef     -> CELL_REF
 * range       -> CELL_REF ":" CELL_REF
 * functionCall -> FUNCTION "(" argList? ")"
 * argList     -> expression ("," expression)*
 * ```
 *
 * @module spreadsheet/parser/parser
 */

import type {
	ASTNode,
	ParseResult,
	ParseError,
	BinaryOperator,
	UnaryOperator,
	ComparisonOperator,
	CellRefNode
} from './ast';
import { COMPARISON_OPERATORS, UNARY_OPERATORS } from './ast';
import { tokenize, describeToken } from './lexer';
import type { Token, TokenType } from './lexer';
import { normalizeFunction, isFunctionName } from '../functions/aliases';
import { parseCellRef } from '../cell-reference';

// =============================================================================
// Parser State
// =============================================================================

/**
 * Internal parser state
 */
interface ParserState {
	/** Token stream */
	tokens: Token[];
	/** Current position in token stream */
	pos: number;
	/** Original input string (for error reporting) */
	input: string;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a spreadsheet formula into an AST
 *
 * Handles formulas with or without leading '='.
 *
 * @param formula - The formula string to parse
 * @returns ParseResult with AST or error information
 *
 * @example
 * parse('=A1+B2')
 * // Returns: { success: true, ast: { type: 'binaryOp', operator: '+', ... }}
 *
 * @example
 * parse('=SUM(A1:A10)')
 * // Returns: { success: true, ast: { type: 'functionCall', name: 'SUM', ... }}
 *
 * @example
 * parse('=SOMME(A1:A10)')
 * // Returns: { success: true, ast: { type: 'functionCall', name: 'SUM', ... }}
 * // (French alias normalized to English)
 */
export function parse(formula: string): ParseResult {
	// Tokenize input
	const lexResult = tokenize(formula);
	if (!lexResult.success) {
		return {
			success: false,
			error: {
				message: lexResult.error,
				position: lexResult.position
			}
		};
	}

	// Parse tokens
	return parseTokens(lexResult.tokens, formula);
}

/**
 * Parse a token stream into an AST
 *
 * This is a lower-level API for when you already have tokens.
 *
 * @param tokens - The token stream to parse
 * @param input - Original input string (for error messages)
 * @returns ParseResult with AST or error information
 */
export function parseTokens(tokens: Token[], input: string = ''): ParseResult {
	const state: ParserState = { tokens, pos: 0, input };

	try {
		const ast = parseExpression(state);

		// Ensure we consumed all tokens (except EOF)
		if (!isAtEnd(state)) {
			const token = peek(state);
			return {
				success: false,
				error: {
					message: `Element inattendu apres l'expression : ${describeToken(token)}`,
					position: token.position,
					token: token.value
				}
			};
		}

		return { success: true, ast };
	} catch (e) {
		if (e instanceof ParseException) {
			return {
				success: false,
				error: e.toParseError()
			};
		}
		// Re-throw unexpected errors
		throw e;
	}
}

// =============================================================================
// Parse Exception
// =============================================================================

/**
 * Internal exception for parse errors
 */
class ParseException extends Error {
	constructor(
		message: string,
		public readonly position: number,
		public readonly token?: string
	) {
		super(message);
		this.name = 'ParseException';
	}

	toParseError(): ParseError {
		return {
			message: this.message,
			position: this.position,
			token: this.token
		};
	}
}

// =============================================================================
// Token Navigation
// =============================================================================

/**
 * Check if we've reached the end of input
 */
function isAtEnd(state: ParserState): boolean {
	return state.pos >= state.tokens.length || state.tokens[state.pos].type === 'EOF';
}

/**
 * Look at the current token without consuming it
 */
function peek(state: ParserState): Token {
	if (state.pos >= state.tokens.length) {
		return { type: 'EOF', value: '', position: state.input.length };
	}
	return state.tokens[state.pos];
}

/**
 * Look at the next token without consuming the current one
 */
function _peekNext(state: ParserState): Token {
	if (state.pos + 1 >= state.tokens.length) {
		return { type: 'EOF', value: '', position: state.input.length };
	}
	return state.tokens[state.pos + 1];
}

/**
 * Consume the current token and return it
 */
function advance(state: ParserState): Token {
	if (!isAtEnd(state)) {
		state.pos++;
	}
	return state.tokens[state.pos - 1];
}

/**
 * Check if the current token is of a specific type
 */
function check(state: ParserState, type: TokenType): boolean {
	if (isAtEnd(state)) return false;
	return peek(state).type === type;
}

/**
 * Check if the current token matches a specific type and value
 */
function checkValue(state: ParserState, type: TokenType, value: string): boolean {
	if (isAtEnd(state)) return false;
	const token = peek(state);
	return token.type === type && token.value === value;
}

/**
 * Consume a token of a specific type, or throw an error
 */
function expect(state: ParserState, type: TokenType, message: string): Token {
	if (check(state, type)) {
		return advance(state);
	}
	const token = peek(state);
	throw new ParseException(message, token.position, token.value);
}

// =============================================================================
// Expression Parsing
// =============================================================================

/**
 * Parse an expression (top-level)
 */
function parseExpression(state: ParserState): ASTNode {
	return parseComparison(state);
}

/**
 * Parse a comparison expression
 * comparison -> additive (("=" | "<>" | "<" | ">" | "<=" | ">=") additive)*
 */
function parseComparison(state: ParserState): ASTNode {
	let left = parseAdditive(state);

	while (check(state, 'COMPARISON')) {
		const opToken = advance(state);
		const operator = opToken.value as ComparisonOperator;

		// Validate operator
		if (!COMPARISON_OPERATORS.includes(operator)) {
			throw new ParseException(
				`Operateur de comparaison inconnu : ${operator}`,
				opToken.position,
				operator
			);
		}

		const right = parseAdditive(state);
		left = {
			type: 'comparison',
			operator,
			left,
			right
		};
	}

	return left;
}

/**
 * Parse an additive expression
 * additive -> multiplicative (("+" | "-") multiplicative)*
 */
function parseAdditive(state: ParserState): ASTNode {
	let left = parseMultiplicative(state);

	while (checkValue(state, 'OPERATOR', '+') || checkValue(state, 'OPERATOR', '-')) {
		const opToken = advance(state);
		const operator = opToken.value as BinaryOperator;
		const right = parseMultiplicative(state);
		left = {
			type: 'binaryOp',
			operator,
			left,
			right
		};
	}

	return left;
}

/**
 * Parse a multiplicative expression
 * multiplicative -> power (("*" | "/") power)*
 */
function parseMultiplicative(state: ParserState): ASTNode {
	let left = parsePower(state);

	while (checkValue(state, 'OPERATOR', '*') || checkValue(state, 'OPERATOR', '/')) {
		const opToken = advance(state);
		const operator = opToken.value as BinaryOperator;
		const right = parsePower(state);
		left = {
			type: 'binaryOp',
			operator,
			left,
			right
		};
	}

	return left;
}

/**
 * Parse a power expression (right-associative)
 * power -> unary ("^" power)?
 */
function parsePower(state: ParserState): ASTNode {
	const left = parseUnary(state);

	if (checkValue(state, 'OPERATOR', '^')) {
		advance(state);
		const right = parsePower(state); // Right-associative
		return {
			type: 'binaryOp',
			operator: '^',
			left,
			right
		};
	}

	return left;
}

/**
 * Parse a unary expression
 * unary -> ("-" | "+") unary | primary
 */
function parseUnary(state: ParserState): ASTNode {
	if (checkValue(state, 'OPERATOR', '-') || checkValue(state, 'OPERATOR', '+')) {
		const opToken = advance(state);
		const operator = opToken.value as UnaryOperator;

		// Validate operator
		if (!UNARY_OPERATORS.includes(operator)) {
			throw new ParseException(
				`Operateur unaire inconnu : ${operator}`,
				opToken.position,
				operator
			);
		}

		const operand = parseUnary(state);
		return {
			type: 'unaryOp',
			operator,
			operand
		};
	}

	return parsePrimary(state);
}

/**
 * Parse a primary expression
 * primary -> NUMBER | STRING | BOOLEAN | cellRef | range | functionCall | "(" expression ")"
 */
function parsePrimary(state: ParserState): ASTNode {
	const token = peek(state);

	// Number
	if (check(state, 'NUMBER')) {
		advance(state);
		const value = parseFloat(token.value);
		if (isNaN(value)) {
			throw new ParseException(`Nombre invalide : ${token.value}`, token.position, token.value);
		}
		return { type: 'number', value };
	}

	// String
	if (check(state, 'STRING')) {
		advance(state);
		return { type: 'string', value: token.value };
	}

	// Boolean
	if (check(state, 'BOOLEAN')) {
		advance(state);
		const upperValue = token.value.toUpperCase();
		const value = upperValue === 'TRUE' || upperValue === 'VRAI';
		return { type: 'boolean', value };
	}

	// Cell reference (might be start of a range)
	if (check(state, 'CELL_REF')) {
		return parseCellRefOrRange(state);
	}

	// Function call
	if (check(state, 'FUNCTION')) {
		return parseFunctionCall(state);
	}

	// Parenthesized expression
	if (check(state, 'LPAREN')) {
		advance(state); // consume '('
		const expr = parseExpression(state);
		expect(state, 'RPAREN', "Parenthese fermante ')' attendue");
		return expr;
	}

	// Unknown identifier (error)
	if (check(state, 'IDENTIFIER')) {
		advance(state);
		throw new ParseException(
			`Identifiant inconnu : ${token.value}. Verifiez l'orthographe ou utilisez une reference de cellule valide.`,
			token.position,
			token.value
		);
	}

	// Unexpected token
	throw new ParseException(
		`Expression attendue, mais recu : ${describeToken(token)}`,
		token.position,
		token.value
	);
}

/**
 * Parse a cell reference, or a range if followed by ':'
 */
function parseCellRefOrRange(state: ParserState): ASTNode {
	const startToken = advance(state);
	const startCellRef = createCellRefNode(startToken);

	// Check for range (colon)
	if (check(state, 'COLON')) {
		advance(state); // consume ':'

		// Expect another cell reference
		const endToken = expect(state, 'CELL_REF', "Reference de cellule attendue apres ':'");
		const endCellRef = createCellRefNode(endToken);

		return {
			type: 'rangeRef',
			start: startCellRef,
			end: endCellRef
		};
	}

	return startCellRef;
}

/**
 * Create a CellRefNode from a token
 */
function createCellRefNode(token: Token): CellRefNode {
	const ref = token.value.toUpperCase();
	const parsed = parseCellRef(ref);

	if (!parsed) {
		throw new ParseException(`Reference de cellule invalide : ${ref}`, token.position, ref);
	}

	return {
		type: 'cellRef',
		ref,
		col: parsed.col,
		row: parsed.row
	};
}

/**
 * Parse a function call
 * functionCall -> FUNCTION "(" argList? ")"
 */
function parseFunctionCall(state: ParserState): ASTNode {
	const funcToken = advance(state);
	const rawName = funcToken.value;

	// Normalize function name (French -> English)
	const name = normalizeFunction(rawName);

	// Validate function name
	if (!isFunctionName(rawName)) {
		throw new ParseException(`Fonction inconnue : ${rawName}. #NAME?`, funcToken.position, rawName);
	}

	// Expect opening parenthesis
	expect(state, 'LPAREN', `Parenthese ouvrante '(' attendue apres ${rawName}`);

	// Parse arguments
	const args: ASTNode[] = [];

	// Check for empty argument list
	if (!check(state, 'RPAREN')) {
		// Parse first argument
		args.push(parseExpression(state));

		// Parse remaining arguments
		while (check(state, 'COMMA')) {
			advance(state); // consume ','
			args.push(parseExpression(state));
		}
	}

	// Expect closing parenthesis
	expect(state, 'RPAREN', `Parenthese fermante ')' attendue pour ${rawName}`);

	return {
		type: 'functionCall',
		name,
		args
	};
}
