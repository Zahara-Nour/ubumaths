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
 *   expression      := logicalOr
 *   logicalOr       := logicalAnd ('||' logicalAnd)*
 *   logicalAnd      := relation ('&&' relation)*
 *   relation        := additive (RELATION_OP additive)*
 *   additive        := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative  := unary (('*' | ':/' | ':' | IMPLICIT) unary)*
 *   unary           := ('!' | '+' | '-')? power
 *   power           := postfix ('^' powerOperand | '_' subscriptOperand)*
 *   postfix         := atomWithFraction ('[' unit ']')?
 *   atomWithFraction := atom ('/' atom)*    // CRITICAL: / at primary level!
 *   atom            := NUMBER | LETTER | KEYWORD | SYMBOL | function | parens | braces | absValue | color
 *
 * Key difference from LaTeX parser:
 * - `/` has highest precedence (binds at atom level), creating fractions
 * - `2+3/4+5` parses as `Add(Add(2, Div(3,4)), 5)`
 *
 * @module mathAST/parser/custom/parser-rd
 */

import type { MathNode, GreekLetter, MathSymbol, RelationType, NodeMetadata } from '../../types';
import { GREEK_LETTERS } from '../../types';
import type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { DEFAULT_CAPITAL_PAIRS } from '../types';
import { scanPointNames, type PointNamesSyntax } from '../latex/point-names';
import { CustomTokenizer, type CustomToken, type CustomTokenType } from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from '../latex/color-stack';
import {
	NEGATIVE_EXPONENT_BEFORE_GROUP_MESSAGE,
	STACKED_EXPONENTS_MESSAGE
} from '../exponent-rules';
import { MathAST, euler, complex } from '../../factory';
import { DOUBLE_FACTORIAL_ERROR, factorialOf } from '../factorial-notation';
import { parse as parseUnit, unitErrorMessage } from '../../units/parser';
import { expectCode, preciseUnexpectedToken, unitErrorCode } from '../refusal-codes';
import {
	JUXTAPOSITION_MESSAGES,
	endsWithQuantity,
	isCompoundDurationOperand,
	juxtaposeAfterNumber,
	juxtaposeImplicit,
	type JuxtapositionRefusal
} from '../juxtaposed-quantities';
import {
	isGroupingBracket,
	readUnitWriting,
	unitWritingAhead,
	UNIT_EXPONENT_MESSAGE,
	UNIT_SPACE_MESSAGE
} from './unit-writing';
import {
	AMBIGUOUS_TERM_MESSAGE,
	missingNumberBeforeUnitMessage,
	UnitTermReader
} from './unit-term';
import {
	SecurityError,
	getEffectiveSecurityOptions,
	checkInputLength,
	guardStackDepth,
	type ParserSecurityOptions
} from '../security';

// =============================================================================
// Symbol Mapping
// =============================================================================

/**
 * Map custom syntax symbol names to MathAST GreekLetter type
 * Note: 'pi' is NOT here - it's a MathConstant, not a GreekLetter
 */
const GREEK_SYMBOL_MAP: Readonly<Record<string, GreekLetter>> = Object.fromEntries(
	GREEK_LETTERS.map((letter) => [letter, letter])
);

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

/** Syntaxe maison : `A_12` est l'indice 12 (comme `x_12`). */
const CUSTOM_POINT_NAMES_SYNTAX: PointNamesSyntax = { bareMultiDigitIndex: true };

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
	private holeCounter: number = 0;
	/** Profondeur d'indice : un `i` en indice (x_i, u_{i+1}) est un nom d'indice, pas l'unité imaginaire */
	private subscriptDepth: number = 0;
	/** L'unité multiplie tout le terme qui la précède (`1/2[m]` = (1/2) m) */
	private readonly unitTerm = new UnitTermReader(() => this.refuseAmbiguousTerm());

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

	/** Dernier token consommé : `3!27!` (un nombre juste après une factorielle) */
	private previousToken: CustomToken | undefined;

	/** Le jeton d'avant `previousToken` : `1.2.3` n'est pas `.3` */
	private tokenBeforePrevious: CustomToken | undefined;

	/**
	 * Advance to the next token
	 */
	private advance(): CustomToken {
		const prev = this.currentToken;
		this.tokenBeforePrevious = this.previousToken;
		this.previousToken = prev;
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
				expectCode(type, this.currentToken)
			);
		}
		return this.advance();
	}

	/**
	 * Report an error
	 */
	private error(message: string, position: number, length: number, code: ParseErrorCode): never {
		// Un jeton refusé sans code précis : `x2`, `(1+x)2`, `.5` disent ce qui manque
		const precise =
			code === 'UNEXPECTED_TOKEN' && position === this.currentToken.position
				? preciseUnexpectedToken(
						this.currentToken,
						this.previousToken,
						this.tokenBeforePrevious,
						this.tokenizer.peek()
					)
				: null;
		if (precise) {
			throw new ParseException(
				precise.message ?? message,
				precise.position ?? position,
				precise.length ?? length,
				precise.code
			);
		}
		throw new ParseException(message, position, length, code);
	}

	// =========================================================================
	// Grammar Rules
	// =========================================================================

	/**
	 * expression := relation
	 */
	private parseExpression(): MathNode {
		return this.parseLogicalOr();
	}

	/**
	 * logicalOr := logicalAnd ('||' logicalAnd)*
	 */
	private parseLogicalOr(): MathNode {
		let left = this.parseLogicalAnd();

		while (this.check('OR_OR')) {
			const operatorColor = this.colorStack.current();
			this.advance(); // consume ||
			const right = this.parseLogicalAnd();
			const node = MathAST.logicalOr(left, right);
			left = operatorColor
				? ({ ...node, operatorMetadata: { color: operatorColor } } as MathNode)
				: node;
		}

		return left;
	}

	/**
	 * logicalAnd := relation ('&&' relation)*
	 */
	private parseLogicalAnd(): MathNode {
		let left = this.parseRelation();

		while (this.check('AND_AND')) {
			const operatorColor = this.colorStack.current();
			this.advance(); // consume &&
			const right = this.parseRelation();
			const node = MathAST.logicalAnd(left, right);
			left = operatorColor
				? ({ ...node, operatorMetadata: { color: operatorColor } } as MathNode)
				: node;
		}

		return left;
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
		let left = this.parseJuxtaposed(() => this.parseMultiplicative());

		while (this.check('PLUS') || this.check('MINUS')) {
			const operatorColor = this.colorStack.current();
			const isPlus = this.check('PLUS');
			this.advance();
			const right = this.parseJuxtaposed(() => this.parseMultiplicative());

			if (isPlus) {
				left = this.applyColorWithOperator(MathAST.add(left, right), operatorColor);
			} else {
				left = this.applyColorWithOperator(MathAST.subtract(left, right), operatorColor);
			}
		}

		return left;
	}

	/**
	 * juxtaposed := multiplicative (NUMBER multiplicative)* — une durée composée
	 * (`2[h] 30[min]`), un bloc face à `+` et `-`. Le terme qui suit est lu avec ses
	 * opérateurs (`30[min]*2`, refusé).
	 */
	private parseJuxtaposed(parseTerm: () => MathNode): MathNode {
		let left = parseTerm();
		while (this.check('NUMBER') && endsWithQuantity(left)) {
			const number = this.currentToken;
			const right = parseTerm();
			const juxtaposed = juxtaposeAfterNumber(left, right);
			if (juxtaposed === null) {
				// `2[m] 30` : le refus habituel d'un nombre après un facteur
				throw new ParseException(
					`Unexpected token: ${number.value}`,
					number.position,
					number.length,
					'MISSING_OPERATOR'
				);
			}
			left = this.juxtaposed(juxtaposed, number);
		}
		return left;
	}

	/** Produit implicite, ou durée composée entre accolades (`{2[h]}{30[min]}`) */
	private implicitProduct(factor: MathNode, value: MathNode, start: CustomToken): MathNode {
		const juxtaposed = juxtaposeImplicit(factor, value);
		if (juxtaposed === null) return this.applyColor(MathAST.multiply(factor, value, 'implicit'));
		return this.juxtaposed(juxtaposed, start);
	}

	/** La durée composée lue, ou son refus posé sur le jeton `at` */
	private juxtaposed(result: MathNode | JuxtapositionRefusal, at: CustomToken): MathNode {
		if (typeof result !== 'string') return result;
		this.error(JUXTAPOSITION_MESSAGES[result], at.position, at.length, 'JUXTAPOSED_QUANTITIES');
	}

	/** `{1[h]}{30[min]}*2` : une durée composée collée à `*`, `:/` ou `:` est ambiguë */
	private refuseCompoundDurationOperand(left: MathNode): void {
		if (!isCompoundDurationOperand(left)) return;
		const token = this.currentToken;
		this.error(
			JUXTAPOSITION_MESSAGES.operator,
			token.position,
			token.length,
			'JUXTAPOSED_QUANTITIES'
		);
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
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnary();
				left = this.unitTerm.binary(left, right, (factor, value) =>
					this.applyColorWithOperator(MathAST.multiply(factor, value, 'cross'), operatorColor)
				);
			} else if (this.check('COLON_SLASH')) {
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnary();
				left = this.unitTerm.binary(left, right, (numerator, denominator) =>
					this.applyColorWithOperator(
						MathAST.divide(numerator, denominator, 'inline'),
						operatorColor
					)
				);
			} else if (this.check('COLON')) {
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnary();
				left = this.unitTerm.binary(left, right, (numerator, denominator) =>
					this.applyColorWithOperator(
						MathAST.divide(numerator, denominator, 'ratio'),
						operatorColor
					)
				);
			} else if (this.shouldInsertImplicitMultiply()) {
				const start = this.currentToken;
				const right = this.parseUnary();
				left = this.unitTerm.binary(left, right, (factor, value) =>
					this.implicitProduct(factor, value, start)
				);
			} else {
				break;
			}
		}

		return left;
	}

	/**
	 * unary := ('!' | '+' | '-')? power
	 */
	private parseUnary(): MathNode {
		if (this.check('EXCLAMATION')) {
			const operatorColor = this.colorStack.current();
			this.advance(); // consume !
			const operand = this.parseUnary();
			const node = MathAST.logicalNot(operand);
			if (operatorColor) {
				return { ...node, operatorMetadata: { color: operatorColor } } as MathNode;
			}
			return node;
		}

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
			return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.opposite(value)));
		}

		if (this.check('PLUS')) {
			this.advance();
			const operand = this.parseUnary();
			return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.positive(value)));
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
	 * Parse the operand of a superscript, then refuse a second `^` right after it
	 */
	private parsePowerOperand(): MathNode {
		const exponent = this.parsePowerOperandContent();
		// `2^3^2` : lu (2³)² ici et 2^(3²) en LaTeX, refusé dans les deux
		if (this.check('CARET')) {
			this.error(
				STACKED_EXPONENTS_MESSAGE,
				this.currentToken.position,
				this.currentToken.length,
				'STACKED_EXPONENTS'
			);
		}
		return exponent;
	}

	/**
	 * Parse the operand of a superscript (handles braces and single tokens)
	 */
	private parsePowerOperandContent(): MathNode {
		if (this.check('LBRACE')) {
			return this.parseBraceGroup();
		}

		// Comme le parseur Pratt : dans un exposant, les parenthèses ne font que
		// grouper (`x^(1/2)` = `x^{1/2}`), sans nœud `delimiter`
		if (this.check('LPAREN')) {
			this.advance(); // consume (
			if (this.check('RPAREN')) {
				this.error(
					'Empty exponent group not allowed',
					this.currentToken.position,
					1,
					'EMPTY_GROUP'
				);
			}
			const content = this.parseExpression();
			this.expect('RPAREN', "Expected ')' after exponent");
			return content;
		}

		// `10^-3` = `10^{-3}`, `10^+3` = `10^{+3}` : un signe, puis UN nombre ou
		// UNE lettre ; devant un groupe, on ne sait pas jusqu'où va l'exposant
		if (this.check('MINUS') || this.check('PLUS')) {
			const sign = this.advance();
			if (this.check('NUMBER') || this.check('LETTER') || this.check('SYMBOL')) {
				const operand = this.parseSinglePowerOperand();
				return this.applyColor(
					sign.type === 'MINUS' ? MathAST.opposite(operand) : MathAST.positive(operand)
				);
			}
			if (this.checkGroupStart()) {
				this.error(
					NEGATIVE_EXPONENT_BEFORE_GROUP_MESSAGE,
					sign.position,
					sign.length,
					'NEGATIVE_EXPONENT_BEFORE_GROUP'
				);
			}
			this.error(
				'Expected exponent',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_SUPERSCRIPT'
			);
		}

		return this.parseSinglePowerOperand();
	}

	/** Un `(`, `{`, `|`, `[` ou un nom de fonction : le début d'un groupe */
	private checkGroupStart(): boolean {
		return (
			this.check('LPAREN') ||
			this.check('LBRACE') ||
			this.check('PIPE') ||
			this.check('LBRACKET') ||
			this.check('DOUBLE_LBRACKET') ||
			this.check('FUNC') ||
			this.check('BACKSLASH')
		);
	}

	/** Un exposant sans accolades : un nombre, une lettre ou un symbole */
	private parseSinglePowerOperand(): MathNode {
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
	 * Parse the operand of a subscript (handles braces and single tokens).
	 * Dans un indice, `i` est une variable (x_i, p_i, u_{i+1}) : l'unité imaginaire n'y a
	 * pas de sens, et la lire ainsi rendait `x_\imaginaryI` dans un énoncé.
	 */
	private parseSubscriptOperand(): MathNode {
		this.subscriptDepth++;
		try {
			return this.parseSubscriptOperandContent();
		} finally {
			this.subscriptDepth--;
		}
	}

	private parseSubscriptOperandContent(): MathNode {
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

		if (this.checkUnitBracket()) {
			node = this.parseUnitPostfix(node);
		}

		return node;
	}

	/**
	 * atomWithFraction := fractionOperand ('/' fractionOperand)*
	 *
	 * CRITICAL: This is where '/' is handled at PRIMARY level.
	 * This ensures `2+3/4` parses as `2+(3/4)`, not `(2+3)/4`.
	 * The `/` operator binds tighter than `+` or `*` because it consumes
	 * only the immediately adjacent operands, not full expressions.
	 */
	private parseAtomWithFraction(): MathNode {
		let left = this.parseFractionOperand();

		// Handle tight-binding / at PRIMARY level
		while (this.check('SLASH')) {
			this.advance(); // consume /
			const right = this.parseFractionOperand(); // Parse ONLY next operand
			left = this.unitTerm.binary(left, right, (numerator, denominator) =>
				this.applyColor(MathAST.divide(numerator, denominator, 'fraction'))
			);
		}

		return left;
	}

	/**
	 * fractionOperand := atom ('^' powerOperand | '_' subscriptOperand | '[' unit ']')*
	 *
	 * Un opérande de fraction est un atome **et ses postfixes**. La barre lie
	 * plus fort que `+` ou `*`, mais moins fort qu'une puissance : `x^2/x` est
	 * `x²` divisé par `x`, et `1/x^2` est `1` divisé par `x²`. En s'arrêtant à
	 * l'atome nu, `x^2/x` était refusé et `x/x^2` lu `(x/x)^2` — relevé du
	 * 2026-09-20, §6.9. Même chaînage de gauche à droite que `parsePower`.
	 */
	private parseFractionOperand(): MathNode {
		let operand = this.parseAtom();

		while (
			this.check('CARET') ||
			this.check('UNDERSCORE') ||
			this.check('EXCLAMATION') ||
			this.checkUnitBracket()
		) {
			if (this.check('EXCLAMATION')) {
				// Factorielle postfixe : `n!`, `2^3!` = (2³)! ; `3!!` refusé
				this.advance();
				if (this.check('EXCLAMATION')) {
					this.error(
						DOUBLE_FACTORIAL_ERROR,
						this.currentToken.position,
						this.currentToken.length,
						'UNEXPECTED_TOKEN'
					);
				}
				operand = this.applyColor(factorialOf(operand));
			} else if (this.check('CARET')) {
				this.advance();
				operand = this.applyColor(MathAST.superscript(operand, this.parsePowerOperand()));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				operand = this.applyColor(MathAST.subscript(operand, this.parseSubscriptOperand()));
			} else {
				operand = this.parseUnitPostfix(operand);
			}
		}

		return operand;
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

			case 'KEYWORD':
				return this.parseKeyword();

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

			case 'QUESTION':
				return this.parseHole();

			// `[` en position d'atome : toujours un crochet de calcul
			case 'LBRACKET':
				return this.parseSquareBrackets();

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
	 * Parse a hole/placeholder: ?
	 * Index is auto-assigned sequentially (1, 2, 3...)
	 */
	private parseHole(): MathNode {
		this.advance(); // consume ?
		this.holeCounter++;
		return this.applyColor(MathAST.hole(this.holeCounter));
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
			token.type === 'SEMICOLON' ||
			this.isRelationOperator()
		) {
			return false;
		}

		// NUMBER cannot start implicit multiplication (prevents x2, (a)2)
		// Sauf juste après une factorielle : `3!27!` = 3! × 27! (écriture de `\frac{30!}{3!27!}`)
		if (token.type === 'NUMBER') {
			if (this.previousToken?.type === 'EXCLAMATION') return true;
			return false;
		}

		// PIPE is special - it can trigger implicit multiplication with absolute value
		// e.g., 2|x| = 2 * |x|
		if (token.type === 'PIPE') {
			return true;
		}

		// Crochet de calcul après une expression : `2[x+1]` (une unité n'en est pas un)
		if (token.type === 'LBRACKET') {
			return this.isGroupingBracketHere();
		}

		// These CAN start implicit multiplication
		return (
			token.type === 'LETTER' ||
			token.type === 'LPAREN' ||
			token.type === 'LBRACE' ||
			token.type === 'FUNC' ||
			token.type === 'SYMBOL' ||
			token.type === 'BACKSLASH' ||
			token.type === 'AT' ||
			token.type === 'QUESTION'
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
	 * Parse a boolean keyword: true, false
	 */
	private parseKeyword(): MathNode {
		const token = this.advance();
		if (token.value === 'true') {
			return this.applyColor(MathAST.boolean(true));
		}
		if (token.value === 'false') {
			return this.applyColor(MathAST.boolean(false));
		}
		this.error(
			`Unknown keyword: "${token.value}"`,
			token.position,
			token.length,
			'UNEXPECTED_TOKEN'
		);
	}

	/**
	 * Parse a variable (single letter)
	 *
	 * Reserved constants:
	 * - 'e' -> MathConstantNode('euler') - Euler's number
	 * - 'i' -> ComplexNode(0, 1) - imaginary unit
	 */
	private parseVariable(): MathNode {
		// Deux majuscules collées ou plus : longueur `AB`, nom de figure `ABC` (mode
		// longueur, hors indice). Mêmes règles que le parseur Pratt et les parseurs LaTeX.
		const pointNames = this.parsePointNames();
		if (pointNames) return pointNames;

		const token = this.advance();
		const letter = token.value;

		// Reserved constants: 'e' for Euler's number, 'i' for imaginary unit
		// `e_1`, `i_n` : variables indicées (même règle que les parseurs LaTeX)
		if (letter === 'e') {
			return this.applyColor(this.check('UNDERSCORE') ? MathAST.variable('e') : euler());
		}
		if (letter === 'i' && this.subscriptDepth === 0) {
			return this.applyColor(
				this.check('UNDERSCORE')
					? MathAST.variable('i')
					: complex(MathAST.number('0'), MathAST.number('1'))
			);
		}
		// `π` tapé tel quel : la constante, comme `\pi` (Q11) ; `π_1` reste une variable
		if (letter === 'π') {
			return this.applyColor(
				this.check('UNDERSCORE') ? MathAST.variable('π') : MathAST.piConstant()
			);
		}

		return this.applyColor(MathAST.variable(letter));
	}

	/**
	 * Points nommés collés à partir du jeton courant (`AB`, `A'B'`, `A_1B_1`, `ABC`) : la
	 * longueur d'un segment pour deux points, un nom de figure au-delà. `null` en mode
	 * produit (défaut), dans un indice (`x_{AB}`), ou s'il n'y a pas deux points collés.
	 */
	private parsePointNames(): MathNode | null {
		const mode = this.options.capitalPairs ?? DEFAULT_CAPITAL_PAIRS;
		if (mode !== 'length' || this.subscriptDepth > 0) return null;

		const scan = scanPointNames(
			(offset) => (offset === 0 ? this.currentToken : this.tokenizer.peekAt(offset - 1)),
			CUSTOM_POINT_NAMES_SYNTAX
		);
		if (!scan) return null;

		// Les jetons lus sont collés : rien à sauter entre eux
		for (let i = 0; i < scan.tokenCount; i++) this.advance();

		const [from, to] = scan.points;
		if (scan.points.length === 2 && from && to) {
			return this.applyColor(MathAST.segmentLength(from, to));
		}
		return this.applyColor(MathAST.figureName(scan.points));
	}

	/**
	 * Parse a symbol token (e.g., from \pi, \alpha)
	 */
	private parseSymbol(): MathNode {
		const token = this.advance();
		const symbolName = token.value;

		// Check if it's π (mathematical constant, not Greek letter)
		if (symbolName === 'pi') {
			return this.applyColor(MathAST.piConstant());
		}

		// Check if it's a Greek letter (alpha, beta, gamma, theta - NOT pi)
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
	 * Crochet de calcul : `[x-1]` — des parenthèses de forme `square`.
	 */
	private parseSquareBrackets(): MathNode {
		this.refuseUnitWithoutNumber();
		this.advance(); // consume [

		if (this.check('RBRACKET')) {
			this.error('Empty brackets not allowed', this.currentToken.position, 1, 'EMPTY_GROUP');
		}

		const content = this.parseExpression();
		this.expect('RBRACKET', "Expected ']' after expression");

		return this.applyColor(
			MathAST.delimiter('parentheses', content, 'grouping', { shape: 'square' })
		);
	}

	/**
	 * `[m]` en tête de terme : une unité sans nombre devant (K2), refusée. Un contenu
	 * qui n'est pas une unité connue (`[x]`, `[x-1]`) reste un crochet de calcul.
	 */
	private refuseUnitWithoutNumber(): void {
		const tokenAt = (offset: number) =>
			offset === 0 ? this.currentToken : this.tokenizer.peekAt(offset - 1);
		if (isGroupingBracket(tokenAt)) return;
		const writing = unitWritingAhead(tokenAt);
		if (writing === null || !parseUnit(writing)) return;
		this.error(
			missingNumberBeforeUnitMessage(writing),
			this.currentToken.position,
			writing.length + 2,
			'MISSING_NUMBER_BEFORE_UNIT'
		);
	}

	/** Refus E7 : après une grandeur, le terme qui porte l'unité compte plusieurs nombres */
	private refuseAmbiguousTerm(): never {
		const token = this.previousToken ?? this.currentToken;
		this.error(AMBIGUOUS_TERM_MESSAGE, token.position, token.length, 'AMBIGUOUS_TERM');
	}

	/**
	 * Le jeton courant est-il un `[` de crochet de calcul (et non d'unité) ?
	 * Regarde en avant jusqu'au `]` apparié, sans rien consommer.
	 */
	private isGroupingBracketHere(): boolean {
		if (!this.check('LBRACKET')) return false;
		return isGroupingBracket((offset) =>
			offset === 0 ? this.currentToken : this.tokenizer.peekAt(offset - 1)
		);
	}

	/** Le jeton courant est-il un `[` d'unité ? */
	private checkUnitBracket(): boolean {
		return this.check('LBRACKET') && !this.isGroupingBracketHere();
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

		// Braces are TRANSPARENT - return content directly ; une grandeur y reste fermée
		return this.unitTerm.close(content);
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
		return this.parseLogicalOrStopAtPipe();
	}

	/**
	 * Parse logicalOr, stopping at PIPE
	 */
	private parseLogicalOrStopAtPipe(): MathNode {
		let left = this.parseLogicalAndStopAtPipe();

		while (this.check('OR_OR') && !this.check('PIPE')) {
			const operatorColor = this.colorStack.current();
			this.advance();
			const right = this.parseLogicalAndStopAtPipe();
			const node = MathAST.logicalOr(left, right);
			left = operatorColor
				? ({ ...node, operatorMetadata: { color: operatorColor } } as MathNode)
				: node;
		}

		return left;
	}

	/**
	 * Parse logicalAnd, stopping at PIPE
	 */
	private parseLogicalAndStopAtPipe(): MathNode {
		let left = this.parseRelationStopAtPipe();

		while (this.check('AND_AND') && !this.check('PIPE')) {
			const operatorColor = this.colorStack.current();
			this.advance();
			const right = this.parseRelationStopAtPipe();
			const node = MathAST.logicalAnd(left, right);
			left = operatorColor
				? ({ ...node, operatorMetadata: { color: operatorColor } } as MathNode)
				: node;
		}

		return left;
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
		let left = this.parseJuxtaposed(() => this.parseMultiplicativeStopAtPipe());

		while ((this.check('PLUS') || this.check('MINUS')) && !this.check('PIPE')) {
			const operatorColor = this.colorStack.current();
			const isPlus = this.check('PLUS');
			this.advance();
			const right = this.parseJuxtaposed(() => this.parseMultiplicativeStopAtPipe());

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
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.unitTerm.binary(left, right, (factor, value) =>
					this.applyColorWithOperator(MathAST.multiply(factor, value, 'cross'), operatorColor)
				);
			} else if (this.check('COLON_SLASH')) {
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.unitTerm.binary(left, right, (numerator, denominator) =>
					this.applyColorWithOperator(
						MathAST.divide(numerator, denominator, 'inline'),
						operatorColor
					)
				);
			} else if (this.check('COLON')) {
				this.refuseCompoundDurationOperand(left);
				this.advance();
				const right = this.parseUnaryStopAtPipe();
				left = this.unitTerm.binary(left, right, (numerator, denominator) =>
					this.applyColorWithOperator(
						MathAST.divide(numerator, denominator, 'ratio'),
						operatorColor
					)
				);
			} else if (this.shouldInsertImplicitMultiplyStopAtPipe()) {
				const start = this.currentToken;
				const right = this.parseUnaryStopAtPipe();
				left = this.unitTerm.binary(left, right, (factor, value) =>
					this.implicitProduct(factor, value, start)
				);
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
		if (this.check('EXCLAMATION')) {
			const operatorColor = this.colorStack.current();
			this.advance();
			const operand = this.parseUnaryStopAtPipe();
			const node = MathAST.logicalNot(operand);
			if (operatorColor) {
				return { ...node, operatorMetadata: { color: operatorColor } } as MathNode;
			}
			return node;
		}

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
			return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.opposite(value)));
		}

		if (this.check('PLUS')) {
			this.advance();
			const operand = this.parseUnaryStopAtPipe();
			return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.positive(value)));
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

		if (this.checkUnitBracket()) {
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
			left = this.unitTerm.binary(left, right, (numerator, denominator) =>
				this.applyColor(MathAST.divide(numerator, denominator, 'fraction'))
			);
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

		// Handle sqrt[n] for nth root - check for bracket BEFORE parentheses
		let nthRoot: MathNode | undefined;
		if (name === 'sqrt' && this.check('LBRACKET')) {
			this.advance();
			nthRoot = this.parseExpression();
			this.expect('RBRACKET', "Expected ']' after nth root index");
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

		// Color already applied via applyColor() during parsing ; des accolades : une grandeur y reste fermée
		return this.unitTerm.close(content);
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

		// Le contenu d'un crochet d'unité est une **écriture d'unité brute**, pas
		// une expression : on recolle le texte des jetons jusqu'au `]`, quel que
		// soit leur type. Sans cela, `2[min]` échouait — le tokenizer y voit la
		// fonction `min` (finding I4 de la revue du 2026-09-20).
		const { text: unitStr, spaceAt } = readUnitWriting(
			() => this.currentToken,
			() => this.advance(),
			(token) => token.type === 'RBRACKET' || token.type === 'EOF'
		);
		if (spaceAt !== null) {
			this.error(UNIT_SPACE_MESSAGE, spaceAt, 1, 'SPACE_IN_UNIT');
		}

		this.expect('RBRACKET', "Expected ']' after unit");
		if (this.check('CARET')) {
			this.error(UNIT_EXPONENT_MESSAGE, this.currentToken.position, 1, 'UNIT_EXPONENT_OUTSIDE');
		}

		const unit = parseUnit(unitStr);
		if (!unit) {
			this.error(
				unitErrorMessage(unitStr),
				this.currentToken.position,
				unitStr.length,
				unitErrorCode(unitStr)
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
 * Parse a custom syntax string into a MathAST node using Recursive Descent.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 * @throws SecurityError if security limits are exceeded
 */
export function parseCustomRD(input: string, options?: Partial<ParserOptions>): MathNode {
	// Débordement de pile → SecurityError (voir `guardStackDepth`)
	return guardStackDepth(() => parseCustomRDUnguarded(input, options));
}

function parseCustomRDUnguarded(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	checkInputLength(input, security.maxInputLength);

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

	// Check AST limits AFTER parsing
	checkASTSecurity(result, security);

	return result;
}

/**
 * Parse a custom syntax string into a MathAST node with error collection.
 * Returns a ParseResult with the AST and any errors.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: tolerant mode)
 * @returns ParseResult containing the AST and errors
 * @throws SecurityError if security limits are exceeded (not caught)
 */
export function parseCustomRDSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	// Débordement de pile → SecurityError (voir `guardStackDepth`)
	return guardStackDepth(() => parseCustomRDSafeUnguarded(input, options));
}

function parseCustomRDSafeUnguarded(input: string, options?: Partial<ParserOptions>): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	// SecurityError is NOT caught - it propagates up
	checkInputLength(input, security.maxInputLength);

	const parser = new CustomRDParser(input, fullOptions);

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
