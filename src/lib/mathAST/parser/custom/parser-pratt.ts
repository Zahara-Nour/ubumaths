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

import type {
	MathNode,
	GreekLetter,
	MathSymbol,
	RelationType,
	LogicalOperator,
	NodeMetadata
} from '../../types';
import { GREEK_LETTERS } from '../../types';
import type { ParserOptions, ParseResult, ParseError, ParseErrorCode } from '../types';
import { DEFAULT_CAPITAL_PAIRS } from '../types';
import { scanPointNames, type PointNamesSyntax } from '../latex/point-names';
import {
	CustomTokenizer,
	KNOWN_FUNCTION_NAMES,
	unknownFunctionMessage,
	type CustomToken,
	type CustomTokenType
} from './tokenizer';
import { ColorStack, isValidColor, normalizeColor } from '../latex/color-stack';
import {
	NEGATIVE_EXPONENT_BEFORE_GROUP_MESSAGE,
	STACKED_EXPONENTS_MESSAGE
} from '../exponent-rules';
import { MathAST, compose, matrix, euler, complex } from '../../factory';
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

/** Un nom de fonction générique à indice lu en avance (`f_1`, `f_{12}`). */
interface IndexedFunctionName {
	/** Le nom déclaré : `f_1`. */
	name: string;
	/** La lettre : `f`. */
	letter: string;
	/** L'indice, entier : `1`. */
	index: string;
	/** Les jetons qu'il occupe : 3 pour `f_1`, 5 pour `f_{1}`. */
	tokenCount: number;
}

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
	LOGICAL_OR = 6, // || (logical OR)
	LOGICAL_AND = 7, // && (logical AND)
	RELATION = 10, // =, <, >, <=, >=, !=, <=>, =>
	ADDITION = 20, // +, -
	COMPOSITION = 25, // @ (composition operator, between + and *)
	JUXTAPOSE = 27, // durée composée : `2[h] 30[min]`, un bloc face à + et - (au-dessus de la composition)
	MULTIPLY = 30, // *, :/, :, implicit multiplication
	UNARY = 40, // prefix -, +, !
	POWER = 50 // ^, _ (right-associative)
}

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

/** Syntaxe maison : `A_12` est l'indice 12 (comme `x_12`). */
const CUSTOM_POINT_NAMES_SYNTAX: PointNamesSyntax = { bareMultiDigitIndex: true };

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
				? preciseUnexpectedToken(this.currentToken, this.previousToken, this.tokenBeforePrevious)
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

			// Un nombre après une grandeur : durée composée (`2[h] 30[min]`)
			const juxtaposes = this.check('NUMBER') && endsWithQuantity(left);
			const bp = juxtaposes ? BP.JUXTAPOSE : this.getLeftBindingPower();
			if (bp <= minBp) {
				break;
			}

			if (juxtaposes) {
				left = this.parseJuxtaposition(left);
			} else if (this.shouldInsertImplicitMultiply()) {
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

			case 'QUESTION':
				return this.parseAtomWithFraction();

			case 'DOUBLE_LBRACKET':
				return this.parseMatrixLiteral();

			// `[` en position préfixe : toujours un crochet de calcul
			case 'LBRACKET':
				return this.parseAtomWithFraction();

			case 'KEYWORD':
				return this.parseKeyword();

			case 'MINUS':
				return this.parsePrefixMinus();

			case 'PLUS':
				return this.parsePrefixPlus();

			case 'EXCLAMATION':
				return this.parseLogicalNot();

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
				// Crochet de calcul après une expression : multiplication implicite
				if (this.isGroupingBracketHere()) {
					return this.parseImplicitMultiply(left);
				}
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

			case 'AND_AND':
				return this.parseLogicalBinary(left, 'and', BP.LOGICAL_AND);

			case 'OR_OR':
				return this.parseLogicalBinary(left, 'or', BP.LOGICAL_OR);

			case 'PIPE':
				// PIPE in LED position means implicit multiplication with absolute value
				// e.g., 2|x| = 2 * |x|
				// We handle this specially to avoid the ambiguity with closing |
				return this.parseImplicitMultiplyWithAbsoluteValue(left);

			case 'AT':
				// Check if this is the start of a color @color{...}
				// or a composition operator f@g
				// If followed by a letter/func/lparen, it's composition
				// If followed by a color name + {, it's color
				if (this.isCompositionOperator()) {
					return this.parseComposition(left);
				}
				// Otherwise, fall through for implicit multiplication with color
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

			case 'AND_AND':
				return BP.LOGICAL_AND;

			case 'OR_OR':
				return BP.LOGICAL_OR;

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
				// Crochet de calcul : multiplication implicite ; unité : lie très fort
				if (this.isGroupingBracketHere()) {
					return BP.MULTIPLY;
				}
				// Units bind tightly to the preceding expression
				return BP.POWER + 1;

			// @ can be composition (f@g) or color (@red{...})
			// We need to check which case it is
			case 'AT':
				if (this.isCompositionOperator()) {
					return BP.COMPOSITION;
				}
				// Otherwise it's implicit multiplication with color
				return BP.MULTIPLY;

			// For implicit multiplication
			// NOTE: PIPE is NOT included here - it's handled specially in led()
			// because | is both opening and closing delimiter for absolute value
			case 'LETTER':
			case 'LPAREN':
			case 'LBRACE':
			case 'FUNC':
			case 'SYMBOL':
			case 'BACKSLASH':
			case 'QUESTION':
			case 'DOUBLE_LBRACKET':
				return BP.MULTIPLY;

			// `3!27!` : un nombre juste après une factorielle (cf. shouldInsertImplicitMultiply)
			case 'NUMBER':
				return this.previousToken?.type === 'EXCLAMATION' ? BP.MULTIPLY : BP.NONE;

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
	 * Un opérande de fraction : un atome **et ses postfixes** (`^`, `_`, `[unité]`).
	 *
	 * La barre de fraction lie plus fort que `+` ou `*`, mais moins fort qu'une
	 * puissance : `x^2/x` est `x²` divisé par `x`, et `1/x^2` est `1` divisé par
	 * `x²`. En s'arrêtant à l'atome nu, `x^2/x` était refusé (le `/` ne trouvait
	 * pas sa place) et `x/x^2` était lu `(x/x)^2` — relevé du 2026-09-20, §6.9.
	 *
	 * Même chaînage que partout ailleurs dans ce parseur : les postfixes
	 * s'appliquent de gauche à droite (`x^2_1` est `(x²)₁` ; `x^2^3` est refusé depuis le 2026-10-20).
	 */
	private parseFractionOperand(): MathNode {
		let operand = this.parseAtom();

		while (
			this.check('CARET') ||
			this.check('UNDERSCORE') ||
			this.check('PERCENT') ||
			this.check('EXCLAMATION') ||
			this.checkUnitBracket()
		) {
			if (this.check('EXCLAMATION')) {
				// Factorielle postfixe : `n!`, `2^3!` = (2³)!, `n!^2` = (n!)² ; `!=` est
				// un autre token (≠). `3!!` (double factorielle) : refusé.
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
			} else if (this.check('PERCENT')) {
				// Pourcentage, postfixe : `20%`, `x^2%` = (x²) %, `(a+5)%`
				// `20%%` : erreur de lecture, jamais un pourcentage de pourcentage silencieux
				if (operand.type === 'percentage') {
					this.error('Unexpected token: %', this.currentToken.position, 1, 'UNEXPECTED_TOKEN');
				}
				this.advance();
				operand = this.applyColor(MathAST.percentage(operand));
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

			case 'QUESTION':
				return this.parseHole();

			case 'DOUBLE_LBRACKET':
				return this.parseMatrixLiteral();

			case 'LBRACKET':
				return this.parseSquareBrackets();

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
	 * Parse a hole/placeholder: ?
	 * Index is auto-assigned sequentially (1, 2, 3...)
	 */
	private parseHole(): MathNode {
		this.advance(); // consume ?
		this.holeCounter++;
		return this.applyColor(MathAST.hole(this.holeCounter));
	}

	/**
	 * Parse a variable (single letter) or generic function if configured.
	 *
	 * Reserved constants:
	 * - 'e' -> MathConstantNode('euler') - Euler's number
	 * - 'i' -> ComplexNode(0, 1) - imaginary unit
	 *
	 * When genericFunctions option is set and the letter matches a configured name,
	 * we parse it as a function call with optional derivatives, inverse, and composition.
	 */
	private parseVariable(): MathNode {
		const token = this.currentToken;
		const letter = token.value;

		// Deux majuscules collées ou plus : longueur `AB`, nom de figure `ABC` (mode
		// longueur, hors indice). Avant les fonctions génériques : `FG` est une
		// longueur, `F(x)` reste une fonction. Mêmes règles que les parseurs LaTeX.
		const pointNames = this.parsePointNames();
		if (pointNames) return pointNames;

		// Une fonction générique à indice déclarée (`f_1(3)`, `f_{12}(x)`) : un appel,
		// pas `f_1 × (3)`. Un nom indicé non déclaré reste une variable indicée.
		const indexed = this.indexedGenericFunctionName();
		if (indexed) return this.parseGenericFunction(indexed);

		// Reserved constants: 'e' for Euler's number, 'i' for imaginary unit
		// `e_1`, `i_n` : variables indicées (même règle que les parseurs LaTeX)
		if (letter === 'e') {
			this.advance();
			return this.applyColor(this.check('UNDERSCORE') ? MathAST.variable('e') : euler());
		}
		if (letter === 'i' && this.subscriptDepth === 0) {
			this.advance();
			return this.applyColor(
				this.check('UNDERSCORE')
					? MathAST.variable('i')
					: complex(MathAST.number('0'), MathAST.number('1'))
			);
		}
		// `π` tapé tel quel : la constante, comme `\pi` (Q11) ; `π_1` reste une variable
		if (letter === 'π') {
			this.advance();
			return this.applyColor(
				this.check('UNDERSCORE') ? MathAST.variable('π') : MathAST.piConstant()
			);
		}

		// Check if this is a generic function name
		if (this.isGenericFunctionName(letter)) {
			return this.parseGenericFunction();
		}

		// Regular variable
		this.advance();
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
	 * Check if a name is configured as a generic function
	 */
	private isGenericFunctionName(name: string): boolean {
		const config = this.options.genericFunctions;
		return config !== undefined && config.names.includes(name);
	}

	/**
	 * Le nom d'une fonction générique À INDICE à partir du jeton courant :
	 * `f_1`, `f_12` ou `f_{1}`, seulement si `f_1` est déclaré dans
	 * `genericFunctions.names`. Rend aussi l'indice et le nombre de jetons qu'il
	 * occupe (rien n'est consommé) ; `null` sinon. Indice entier seulement : c'est
	 * la forme que l'atelier donne à ses noms (`nextName`).
	 */
	private indexedGenericFunctionName(): IndexedFunctionName | null {
		const config = this.options.genericFunctions;
		if (!config || this.currentToken.type !== 'LETTER') return null;
		if (this.tokenizer.peekAt(0).type !== 'UNDERSCORE') return null;

		const afterUnderscore = this.tokenizer.peekAt(1);
		let index: CustomToken;
		let tokenCount: number;
		if (afterUnderscore.type === 'NUMBER') {
			index = afterUnderscore;
			tokenCount = 3; // f _ 1
		} else if (
			afterUnderscore.type === 'LBRACE' &&
			this.tokenizer.peekAt(2).type === 'NUMBER' &&
			this.tokenizer.peekAt(3).type === 'RBRACE'
		) {
			index = this.tokenizer.peekAt(2);
			tokenCount = 5; // f _ { 1 }
		} else {
			return null;
		}
		if (!/^\d+$/.test(index.value)) return null;

		const letter = this.currentToken.value;
		const name = `${letter}_${index.value}`;
		return this.isGenericFunctionName(name)
			? { name, letter, index: index.value, tokenCount }
			: null;
	}

	/**
	 * Parse a generic function: f(x), f'(x), f''(x), f^{-1}(x), f^{(n)}(x)
	 *
	 * Pattern:
	 * - Function name (single letter, or an indexed name `f_1` when `indexed` is given)
	 * - Optional primes: ' '' '''
	 * - Optional ^{-1} or ^{(n)} for inverse or higher derivative
	 * - OPTIONAL arguments in parentheses: (x) or (x, y)
	 *   (not mandatory for composition support)
	 */
	private parseGenericFunction(indexed?: IndexedFunctionName): MathNode {
		let name: string;
		if (indexed) {
			for (let i = 0; i < indexed.tokenCount; i++) this.advance(); // f _ 1 ou f _ { 1 }
			name = indexed.name;
		} else {
			name = this.advance().value; // consume function name letter
		}

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
			// Peek to see if we have {-1} or {(n)} pattern
			const afterCaret = this.peekNextToken();
			// `f^-1(x)` = `f^{-1}(x)`, la réciproque : sans ça, la puissance des
			// exposants signés (2026-10-20) le lisait f⁻¹·(x)
			if (
				allowInverse &&
				afterCaret.type === 'MINUS' &&
				this.tokenizer.peekAt(1).type === 'NUMBER' &&
				this.tokenizer.peekAt(1).value === '1'
			) {
				this.advance(); // consume ^
				this.advance(); // consume -
				this.advance(); // consume 1
				isInverse = true;
			} else if (afterCaret.type === 'LBRACE') {
				const result = this.tryParseInverseOrHigherDerivative(allowInverse, allowDerivatives);
				if (result.type === 'inverse') {
					isInverse = true;
				} else if (result.type === 'higherDerivative') {
					derivativeOrder = result.order;
				}
			}
		}

		// Check for arguments in parentheses
		// For composition support, parentheses are NOT mandatory
		if (this.check('LPAREN')) {
			this.advance(); // consume (

			// Parse comma-separated arguments
			const args: MathNode[] = [];
			if (!this.check('RPAREN')) {
				args.push(this.parseExpression(BP.NONE));
				while (this.check('COMMA')) {
					this.advance();
					args.push(this.parseExpression(BP.NONE));
				}
			}

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

		// Un nom indicé sans appel (`f_1`, `f_1^2`) : la variable indicée, comme si
		// le nom n'était pas déclaré
		if (indexed) {
			return this.applyColor(
				MathAST.subscript(MathAST.variable(indexed.letter), MathAST.number(indexed.index))
			);
		}

		// Plain letter without parentheses, derivatives, or inverse - it's a variable
		return this.applyColor(
			name === 'e' && !this.check('UNDERSCORE') ? euler() : MathAST.variable(name)
		);
	}

	/**
	 * Try to parse ^{-1} (inverse) or ^{(n)} (higher derivative notation)
	 * Returns what was found and consumes the tokens if successful.
	 */
	private tryParseInverseOrHigherDerivative(
		allowInverse: boolean,
		allowDerivatives: boolean
	): { type: 'inverse' } | { type: 'higherDerivative'; order: number } | { type: 'none' } {
		// Current token should be CARET
		if (!this.check('CARET')) {
			return { type: 'none' };
		}

		// Look at next token (should be LBRACE)
		const braceToken = this.peekNextToken();
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
			this.error(
				'Expected number for derivative order in ^{(n)}',
				this.currentToken.position,
				this.currentToken.length,
				'INVALID_SUPERSCRIPT'
			);
		}

		this.error(
			"Expected '-1' or '(n)' in superscript for generic function",
			this.currentToken.position,
			this.currentToken.length,
			'INVALID_SUPERSCRIPT'
		);
	}

	/**
	 * Peek at the next token without consuming it
	 */
	private peekNextToken(): CustomToken {
		return this.tokenizer.peekAt(0);
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

		const content = this.parseExpression(BP.NONE);
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

		const content = this.parseExpression(BP.NONE);
		this.expect('RBRACKET', "Expected ']' after expression");

		return this.applyColor(
			MathAST.delimiter('parentheses', content, 'grouping', { shape: 'square' })
		);
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

		// Braces are TRANSPARENT - return content directly ; une grandeur y reste fermée
		return this.unitTerm.close(content);
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
	// Matrix Literals
	// =========================================================================

	/**
	 * Parse matrix literal: [[1,2],[3,4]]
	 * Uses Python-like syntax with nested square brackets
	 *
	 * Syntax structure:
	 * - `[[` starts the matrix (consumed as DOUBLE_LBRACKET)
	 * - First row elements come directly: `1,2`
	 * - `]` ends the first row, `,` separates rows
	 * - `[` starts subsequent rows: `[3,4`
	 * - `]]` ends the last row and matrix (consumed as DOUBLE_RBRACKET)
	 */
	private parseMatrixLiteral(): MathNode {
		this.advance(); // consume [[

		const rows: MathNode[][] = [];

		// Parse first row (comes directly after [[, no [ prefix)
		const firstRow = this.parseMatrixRow();
		if (firstRow.length === 0) {
			this.error(
				'Empty matrix row not allowed',
				this.currentToken.position,
				this.currentToken.length,
				'SYNTAX_ERROR'
			);
		}
		rows.push(firstRow);

		// Check for row terminator
		// First row ends with ] or ]] (if single row matrix)
		if (this.check('DOUBLE_RBRACKET')) {
			// Single row matrix like [[1,2,3]]
			this.advance(); // consume ]]
			return this.applyColor(matrix(rows, { matrixType: 'pmatrix' }));
		}

		// Expect ] to close first row
		this.expect('RBRACKET', "Expected ']' to close matrix row");

		// Parse additional rows: ,[ ... ]
		while (this.check('COMMA')) {
			this.advance(); // consume ,

			// Expect [ to start next row
			if (!this.check('LBRACKET')) {
				this.error(
					"Expected '[' to start matrix row",
					this.currentToken.position,
					this.currentToken.length,
					'SYNTAX_ERROR'
				);
			}
			this.advance(); // consume [

			const row = this.parseMatrixRow();
			if (row.length === 0) {
				this.error(
					'Empty matrix row not allowed',
					this.currentToken.position,
					this.currentToken.length,
					'SYNTAX_ERROR'
				);
			}
			rows.push(row);

			// Check for row terminator
			if (this.check('DOUBLE_RBRACKET')) {
				// Last row, matrix ends
				this.advance(); // consume ]]
				return this.applyColor(matrix(rows, { matrixType: 'pmatrix' }));
			}

			// Expect ] to close this row
			this.expect('RBRACKET', "Expected ']' to close matrix row");
		}

		// If we get here, we should have ]]
		this.expect('DOUBLE_RBRACKET', "Expected ']]' to close matrix");

		// Create matrix with default type 'pmatrix' for custom syntax
		return this.applyColor(matrix(rows, { matrixType: 'pmatrix' }));
	}

	/**
	 * Parse a single matrix row: elements separated by commas
	 * Stops at ] or ]]
	 */
	private parseMatrixRow(): MathNode[] {
		const row: MathNode[] = [];

		// Parse elements until ] or ]]
		while (!this.check('RBRACKET') && !this.check('DOUBLE_RBRACKET') && !this.check('EOF')) {
			const element = this.parseExpression(BP.NONE);
			row.push(element);

			// Check for comma between elements
			if (this.check('COMMA')) {
				// Peek to see if next is [ (row separator) or element
				const next = this.tokenizer.peekAt(0);
				if (next.type === 'LBRACKET') {
					// This comma is a row separator, stop here
					break;
				}
				this.advance(); // consume , (element separator)
			} else if (!this.check('RBRACKET') && !this.check('DOUBLE_RBRACKET')) {
				this.error(
					"Expected ',' or ']' in matrix row",
					this.currentToken.position,
					this.currentToken.length,
					'SYNTAX_ERROR'
				);
			}
		}

		return row;
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
		return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.opposite(value)));
	}

	/**
	 * Parse prefix plus: +x
	 */
	private parsePrefixPlus(): MathNode {
		this.advance(); // consume +
		const operand = this.parseExpression(BP.UNARY);
		return this.unitTerm.unary(operand, (value) => this.applyColor(MathAST.positive(value)));
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
		this.refuseCompoundDurationOperand(left);
		this.advance(); // consume operator
		const right = this.parseExpression(BP.MULTIPLY);
		return this.unitTerm.binary(left, right, (factor, value) =>
			this.applyColorWithOperator(MathAST.multiply(factor, value, style), operatorColor)
		);
	}

	/**
	 * Parse division: :/ (inline) or : (ratio)
	 * NOTE: / (fraction) is handled in parseAtomWithFraction, not here!
	 */
	private parseDivision(left: MathNode, style: 'inline' | 'ratio'): MathNode {
		const operatorColor = this.colorStack.current();
		this.refuseCompoundDurationOperand(left);
		this.advance(); // consume operator
		const right = this.parseExpression(BP.MULTIPLY);
		return this.unitTerm.binary(left, right, (numerator, denominator) =>
			this.applyColorWithOperator(MathAST.divide(numerator, denominator, style), operatorColor)
		);
	}

	/**
	 * Check if @ in LED position is a composition operator (f@g)
	 * vs the start of a color expression (@red{...}).
	 *
	 * For composition: @ is followed directly by a function/variable name
	 * For color: @ is followed by a color name, then {
	 *
	 * The key insight is that in `f@g`, we're in LED position after `f`,
	 * and the next expression after @ should be a generic function name.
	 */
	private isCompositionOperator(): boolean {
		// @ is the current token
		if (!this.check('AT')) {
			return false;
		}

		// Peek at what follows @
		const nextToken = this.tokenizer.peekAt(0);

		// If next is a letter that's a generic function name, it's composition
		if (nextToken.type === 'LETTER') {
			const letterName = nextToken.value;
			// It's composition if it's a generic function name
			if (this.isGenericFunctionName(letterName)) {
				return true;
			}
			// Otherwise, check if it could be a color (letters followed by {)
			// We can't easily peek further, so we assume @letter{ is color
			// and @letter without { after function chars is composition
			// For now, be strict: only treat as composition if it's a generic function
		}

		// If next is FUNC (sin, cos, etc.), it's composition
		if (nextToken.type === 'FUNC') {
			return true;
		}

		// If next is LPAREN, it could be composition with parenthesized expression
		// But that's unusual - f@(g) - let's not support that for simplicity
		// Color would be @red{...}, not @(...

		return false;
	}

	/**
	 * Parse composition: f@g
	 * Composition is left-associative: f@g@h = (f@g)@h
	 *
	 * If left or right is a variable that matches a generic function name,
	 * convert it to a function node for proper composition semantics.
	 */
	private parseComposition(left: MathNode): MathNode {
		const operatorColor = this.colorStack.current();
		this.refuseCompoundDurationOperand(left);
		this.advance(); // consume @
		const start = this.currentToken;
		const right = this.parseExpression(BP.COMPOSITION);
		// `f\circ 2~\unit{h}~30~\unit{min}` : une durée composée ne se compose pas
		if (isCompoundDurationOperand(right)) {
			this.error(
				JUXTAPOSITION_MESSAGES.operator,
				start.position,
				start.length,
				'JUXTAPOSED_QUANTITIES'
			);
		}

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
			token.type === 'DOUBLE_RBRACKET' ||
			token.type === 'COMMA' ||
			this.isRelationToken(token.type)
		) {
			return false;
		}

		// NUMBER cannot start implicit multiplication (prevents x2, (a)2)
		// Sauf juste après une factorielle : `3!27!` = 3! × 27! (écriture de `\frac{30!}{3!27!}`)
		if (token.type === 'NUMBER') {
			if (this.previousToken?.type === 'EXCLAMATION') return true;
			return false;
		}

		// AT can be composition (f@g) or color (@red{...})
		// If @ is followed by a generic function name, it's composition not implicit mult
		if (token.type === 'AT' && this.isCompositionOperator()) {
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
			token.type === 'AT' ||
			token.type === 'QUESTION' ||
			token.type === 'DOUBLE_LBRACKET'
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
		const start = this.currentToken;
		const right = this.parseExpression(BP.MULTIPLY);
		return this.unitTerm.binary(left, right, (factor, value) => {
			// `{2[h]}{30[min]}` : une durée composée, pas un produit
			const juxtaposed = juxtaposeImplicit(factor, value);
			if (juxtaposed === null) return this.applyColor(MathAST.multiply(factor, value, 'implicit'));
			return this.juxtaposed(juxtaposed, start);
		});
	}

	/**
	 * Un nombre après une grandeur : `2[h] 30[min]`. Le terme qui suit est lu
	 * avec ses opérateurs (`30[min]*2`, refusé) ; le bloc s'arrête à `+` et `-`.
	 */
	private parseJuxtaposition(left: MathNode): MathNode {
		const number = this.currentToken;
		const right = this.parseExpression(BP.JUXTAPOSE);
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
		return this.juxtaposed(juxtaposed, number);
	}

	/** La durée composée lue, ou son refus posé sur le jeton `at` */
	private juxtaposed(result: MathNode | JuxtapositionRefusal, at: CustomToken): MathNode {
		if (typeof result !== 'string') return result;
		this.error(JUXTAPOSITION_MESSAGES[result], at.position, at.length, 'JUXTAPOSED_QUANTITIES');
	}

	/** `1[h] 30[min]*2` : une durée composée collée à `*`, `:/` ou `:` est ambiguë */
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
		while (this.check('CARET') || this.check('UNDERSCORE') || this.checkUnitBracket()) {
			if (this.check('CARET')) {
				this.advance();
				const exp = this.parsePowerOperand();
				right = this.applyColor(MathAST.superscript(right, exp));
			} else if (this.check('UNDERSCORE')) {
				this.advance();
				const sub = this.parseSubscriptOperand();
				right = this.applyColor(MathAST.subscript(right, sub));
			} else if (this.checkUnitBracket()) {
				right = this.parseUnitPostfix(right);
			}
		}

		return this.applyColor(MathAST.multiply(left, right, 'implicit'));
	}

	// =========================================================================
	// Superscript and Subscript
	// =========================================================================

	/**
	 * Parse superscript: base^exponent (a second `^` right after it is refused)
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

		// Dans un exposant, les parenthèses ne font que grouper, exactement comme
		// les accolades : `x^(1/2)` et `x^{1/2}` doivent donner le MÊME arbre —
		// sinon l'exposant rationnel n'est plus reconnu comme tel. On ne garde
		// donc pas de nœud `delimiter` ici. Avant, `^(` était une erreur de
		// syntaxe : cette branche n'élargit la grammaire que sur ce cas.
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
			const content = this.parseExpression(BP.NONE);
			this.expect('RPAREN', "Expected ')' after exponent");
			return content;
		}

		// `10^-3` = `10^{-3}`, `10^+3` = `10^{+3}` : un signe, puis UN nombre ou
		// UNE lettre ; devant un groupe, on ne sait pas jusqu'où va l'exposant
		if (this.check('MINUS') || this.check('PLUS')) {
			const sign = this.advance();
			if (this.checkGroupStart()) {
				this.error(
					NEGATIVE_EXPONENT_BEFORE_GROUP_MESSAGE,
					sign.position,
					sign.length,
					'NEGATIVE_EXPONENT_BEFORE_GROUP'
				);
			}
			if (this.check('NUMBER') || this.check('LETTER') || this.check('SYMBOL')) {
				const operand = this.parseSinglePowerOperand();
				return this.applyColor(
					sign.type === 'MINUS' ? MathAST.opposite(operand) : MathAST.positive(operand)
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

	/** Un `(`, `{`, `|`, `[` ou une fonction (`sin`, `f(x)` d'une fonction générique) : le début d'un groupe */
	private checkGroupStart(): boolean {
		const genericCall =
			this.check('LETTER') &&
			this.isGenericFunctionName(this.currentToken.value) &&
			['LPAREN', 'PRIME'].includes(this.peekNextToken().type);
		return (
			genericCall ||
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
	// Boolean / Logical
	// =========================================================================

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
	 * Parse prefix logical NOT: !expr
	 */
	private parseLogicalNot(): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume !
		const operand = this.parseExpression(BP.UNARY);
		const node = MathAST.logicalNot(operand);
		if (operatorColor) {
			return { ...node, operatorMetadata: { color: operatorColor } } as MathNode;
		}
		return node;
	}

	/**
	 * Parse infix logical operators: && (and), || (or)
	 */
	private parseLogicalBinary(left: MathNode, operator: LogicalOperator, bp: number): MathNode {
		const operatorColor = this.colorStack.current();
		this.advance(); // consume && or ||
		const right = this.parseExpression(bp);
		const node = MathAST.logical(operator, left, right);
		if (operatorColor) {
			return { ...node, operatorMetadata: { color: operatorColor } } as MathNode;
		}
		return node;
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

		// `racine(x)`, `acoss(x)` : un nom inconnu se REFUSE — lu en produit de
		// lettres, il donnait un résultat faux sans aucune erreur
		if (!KNOWN_FUNCTION_NAMES.includes(name)) {
			this.error(
				unknownFunctionMessage(name),
				funcToken.position,
				funcToken.length,
				'SYNTAX_ERROR'
			);
		}

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
			nthRoot = this.parseExpression(BP.NONE);
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

		// cbrt(x) = ∛x : le même nœud que sqrt[3](x), sans quoi l'arbre aurait une
		// fonction que ni la dérivation ni la normalisation ne connaissent
		if (name === 'cbrt') {
			return this.applyColor(MathAST.func('sqrt', args, { power, base: MathAST.number('3') }));
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
		case 'matrix':
			for (const row of node.rows) {
				children.push(...row);
			}
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
 * Parse a custom syntax string into a MathAST node.
 * Throws ParseException on error in strict mode.
 *
 * @param input - The custom syntax string to parse
 * @param options - Parser options (default: strict mode)
 * @returns The parsed MathNode
 * @throws ParseException if parsing fails in strict mode
 * @throws SecurityError if security limits are exceeded
 */
export function parseCustomPratt(input: string, options?: Partial<ParserOptions>): MathNode {
	// Débordement de pile → SecurityError (voir `guardStackDepth`)
	return guardStackDepth(() => parseCustomPrattUnguarded(input, options));
}

function parseCustomPrattUnguarded(input: string, options?: Partial<ParserOptions>): MathNode {
	const fullOptions: ParserOptions = {
		mode: 'strict',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	checkInputLength(input, security.maxInputLength);

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
export function parseCustomPrattSafe(input: string, options?: Partial<ParserOptions>): ParseResult {
	// Débordement de pile → SecurityError (voir `guardStackDepth`)
	return guardStackDepth(() => parseCustomPrattSafeUnguarded(input, options));
}

function parseCustomPrattSafeUnguarded(
	input: string,
	options?: Partial<ParserOptions>
): ParseResult {
	const fullOptions: ParserOptions = {
		mode: 'tolerant',
		...options
	};

	// Get effective security options (merge with defaults)
	const security = getEffectiveSecurityOptions(fullOptions.security);

	// Check input length BEFORE parsing (fail fast)
	// SecurityError is NOT caught - it propagates up
	checkInputLength(input, security.maxInputLength);

	const parser = new CustomPrattParser(input, fullOptions);

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
