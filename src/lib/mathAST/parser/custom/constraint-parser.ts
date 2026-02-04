/**
 * Constraint Expression Parser
 *
 * Pratt parser for parsing constraint expressions in pattern syntax.
 * Supports atomic constraints, functional constraints, and logical operators.
 *
 * Grammar:
 * ```
 * constraint_expr  ::= or_expr
 * or_expr          ::= and_expr ('|' and_expr)*
 * and_expr         ::= unary_expr ('&' unary_expr)*
 * unary_expr       ::= '!' unary_expr | primary_expr
 * primary_expr     ::= atomic | functional | '(' constraint_expr ')'
 *
 * atomic           ::= number | integer | positive | negative | nonzero | variable
 *                    | integerType | rationalType | algebraicType | realType
 *                    | transcendentalType | complexType
 *
 * functional       ::= 'type' '(' IDENT ('|' IDENT)* ')'
 *                    | 'freeOf' '(' IDENT (',' IDENT)* ')'
 * ```
 *
 * Operator precedence (highest to lowest):
 * 1. ! (NOT) - highest
 * 2. & (AND)
 * 3. | (OR) - lowest
 *
 * @example
 * parseConstraintExpr('positive & nonzero')
 * parseConstraintExpr('number | variable')
 * parseConstraintExpr('!negative')
 * parseConstraintExpr('!(positive & zero)')
 * parseConstraintExpr('freeOf(n) & type(addition)')
 *
 * @module mathAST/parser/custom/constraint-parser
 */

import type { PatternConstraint } from '../../pattern/types';
import { P } from '../../pattern/builder';
import type { MathNodeType } from '../../types';

// =============================================================================
// Token Types
// =============================================================================

type ConstraintTokenType =
	| 'IDENT'
	| 'LPAREN'
	| 'RPAREN'
	| 'NOT'
	| 'AND'
	| 'OR'
	| 'COMMA'
	| 'PIPE'
	| 'EOF';

interface ConstraintToken {
	readonly type: ConstraintTokenType;
	readonly value: string;
	readonly position: number;
}

// =============================================================================
// Constraint Tokenizer
// =============================================================================

/**
 * Simple tokenizer for constraint expressions.
 */
class ConstraintTokenizer {
	private readonly input: string;
	private readonly length: number;
	private position: number = 0;

	constructor(input: string) {
		this.input = input;
		this.length = input.length;
	}

	nextToken(): ConstraintToken {
		this.skipWhitespace();

		if (this.position >= this.length) {
			return { type: 'EOF', value: '', position: this.position };
		}

		const char = this.input[this.position];
		const startPos = this.position;

		// Single character tokens
		switch (char) {
			case '(':
				this.position++;
				return { type: 'LPAREN', value: '(', position: startPos };
			case ')':
				this.position++;
				return { type: 'RPAREN', value: ')', position: startPos };
			case '!':
				this.position++;
				return { type: 'NOT', value: '!', position: startPos };
			case '&':
				this.position++;
				return { type: 'AND', value: '&', position: startPos };
			case '|':
				this.position++;
				return { type: 'PIPE', value: '|', position: startPos };
			case ',':
				this.position++;
				return { type: 'COMMA', value: ',', position: startPos };
		}

		// Identifier (letters only)
		if (this.isLetter(char)) {
			let ident = '';
			while (this.position < this.length && this.isLetter(this.input[this.position])) {
				ident += this.input[this.position];
				this.position++;
			}
			return { type: 'IDENT', value: ident, position: startPos };
		}

		throw new Error(
			`Unexpected character '${char}' at position ${startPos} in constraint expression`
		);
	}

	peek(): ConstraintToken {
		const savedPos = this.position;
		const token = this.nextToken();
		this.position = savedPos;
		return token;
	}

	private skipWhitespace(): void {
		while (this.position < this.length && /\s/.test(this.input[this.position])) {
			this.position++;
		}
	}

	private isLetter(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
	}
}

// =============================================================================
// Atomic Constraint Mapping
// =============================================================================

/**
 * Valid atomic constraint names.
 * Defined separately to avoid accessing P at module load time.
 */
const VALID_ATOMIC_NAMES = new Set([
	// Basic constraints
	'number',
	'integer',
	'positive',
	'negative',
	'nonzero',
	'nonone',
	'variable',
	// Numeric type constraints
	'integerType',
	'rationalType',
	'algebraicType',
	'realType',
	'transcendentalType',
	'complexType'
]);

/**
 * Gets an atomic constraint by name.
 * Uses a function to avoid circular dependency issues with P namespace.
 * P is accessed lazily only when this function is called (at parse time, not module load time).
 */
function getAtomicConstraint(name: string): PatternConstraint {
	switch (name) {
		// Basic constraints
		case 'number':
			return P.isNumber();
		case 'integer':
			return P.isInteger();
		case 'positive':
			return P.isPositive();
		case 'negative':
			return P.isNegative();
		case 'nonzero':
			return P.isNonzero();
		case 'nonone':
			return P.isNonone();
		case 'variable':
			return P.isVariable();
		// Numeric type constraints
		case 'integerType':
			return P.isIntegerType();
		case 'rationalType':
			return P.isRationalType();
		case 'algebraicType':
			return P.isAlgebraicType();
		case 'realType':
			return P.isRealType();
		case 'transcendentalType':
			return P.isTranscendentalType();
		case 'complexType':
			return P.isComplexType();
		default:
			throw new Error(`Unknown atomic constraint: ${name}`);
	}
}

/**
 * Set of functional constraint names
 */
const FUNCTIONAL_CONSTRAINT_NAMES = new Set(['type', 'freeOf']);

// =============================================================================
// Binding Power (Precedence)
// =============================================================================

/**
 * Binding power for operators.
 * Higher values bind tighter.
 */
const enum BP {
	NONE = 0,
	OR = 10, // |
	AND = 20, // &
	NOT = 30 // ! (prefix)
}

// =============================================================================
// Constraint Parser
// =============================================================================

/**
 * Pratt parser for constraint expressions.
 */
class ConstraintParser {
	private readonly tokenizer: ConstraintTokenizer;
	private currentToken: ConstraintToken;

	constructor(input: string) {
		this.tokenizer = new ConstraintTokenizer(input);
		this.currentToken = this.tokenizer.nextToken();
	}

	/**
	 * Parse the constraint expression and return a PatternConstraint.
	 */
	parse(): PatternConstraint {
		if (this.currentToken.type === 'EOF') {
			throw new Error('Empty constraint expression');
		}

		const result = this.parseExpr(BP.NONE);

		// Cast to string to avoid TS narrowing issue (parseExpr advances tokens)
		if ((this.currentToken.type as string) !== 'EOF') {
			throw new Error(
				`Unexpected token '${this.currentToken.value}' at position ${this.currentToken.position}`
			);
		}

		return result;
	}

	// =========================================================================
	// Token Management
	// =========================================================================

	private advance(): ConstraintToken {
		const prev = this.currentToken;
		this.currentToken = this.tokenizer.nextToken();
		return prev;
	}

	private expect(type: ConstraintTokenType, message?: string): ConstraintToken {
		if (this.currentToken.type !== type) {
			throw new Error(
				message ??
					`Expected ${type} but got ${this.currentToken.type} at position ${this.currentToken.position}`
			);
		}
		return this.advance();
	}

	// =========================================================================
	// Main Parsing
	// =========================================================================

	/**
	 * Parse an expression with minimum binding power.
	 */
	private parseExpr(minBp: number): PatternConstraint {
		// Parse prefix (NUD)
		let left = this.parsePrefix();

		// Parse infix (LED)
		while (true) {
			const bp = this.getInfixBp();
			if (bp <= minBp) {
				break;
			}

			left = this.parseInfix(left);
		}

		return left;
	}

	/**
	 * Parse prefix expression (NUD).
	 */
	private parsePrefix(): PatternConstraint {
		const token = this.currentToken;

		switch (token.type) {
			case 'NOT':
				return this.parseNot();

			case 'LPAREN':
				return this.parseGrouped();

			case 'IDENT':
				return this.parseIdentifier();

			default:
				throw new Error(
					`Unexpected token '${token.value || token.type}' at position ${token.position}`
				);
		}
	}

	/**
	 * Parse infix expression (LED).
	 */
	private parseInfix(left: PatternConstraint): PatternConstraint {
		const token = this.currentToken;

		switch (token.type) {
			case 'AND':
				return this.parseAnd(left);

			case 'OR':
			case 'PIPE':
				return this.parseOr(left);

			default:
				throw new Error(`Unexpected infix operator '${token.value}' at position ${token.position}`);
		}
	}

	/**
	 * Get the binding power of the current infix operator.
	 */
	private getInfixBp(): number {
		switch (this.currentToken.type) {
			case 'AND':
				return BP.AND;
			case 'OR':
			case 'PIPE':
				return BP.OR;
			default:
				return BP.NONE;
		}
	}

	// =========================================================================
	// Specific Parsers
	// =========================================================================

	/**
	 * Parse NOT: !expr
	 */
	private parseNot(): PatternConstraint {
		this.advance(); // consume !
		const operand = this.parseExpr(BP.NOT);
		return P.not(operand);
	}

	/**
	 * Parse grouped expression: (expr)
	 */
	private parseGrouped(): PatternConstraint {
		this.advance(); // consume (
		const expr = this.parseExpr(BP.NONE);
		this.expect('RPAREN', "Expected ')' after grouped expression");
		return expr;
	}

	/**
	 * Parse AND: left & right
	 */
	private parseAnd(left: PatternConstraint): PatternConstraint {
		this.advance(); // consume &
		const right = this.parseExpr(BP.AND);

		// Flatten nested ANDs
		const leftConstraints = left.kind === 'and' ? left.constraints : [left];
		const rightConstraints = right.kind === 'and' ? right.constraints : [right];

		return P.and(...leftConstraints, ...rightConstraints);
	}

	/**
	 * Parse OR: left | right
	 */
	private parseOr(left: PatternConstraint): PatternConstraint {
		this.advance(); // consume | or PIPE
		const right = this.parseExpr(BP.OR);

		// Flatten nested ORs
		const leftConstraints = left.kind === 'or' ? left.constraints : [left];
		const rightConstraints = right.kind === 'or' ? right.constraints : [right];

		return P.or(...leftConstraints, ...rightConstraints);
	}

	/**
	 * Parse identifier - either atomic constraint or functional constraint.
	 */
	private parseIdentifier(): PatternConstraint {
		const identToken = this.advance();
		const name = identToken.value;

		// Check if this is a functional constraint
		if (FUNCTIONAL_CONSTRAINT_NAMES.has(name) && this.currentToken.type === 'LPAREN') {
			return this.parseFunctional(name);
		}

		// Otherwise, it's an atomic constraint
		if (!VALID_ATOMIC_NAMES.has(name)) {
			throw new Error(
				`Unknown constraint '${name}' at position ${identToken.position}. ` +
					`Valid constraints: ${Array.from(VALID_ATOMIC_NAMES).join(', ')}, type(...), freeOf(...)`
			);
		}

		return getAtomicConstraint(name);
	}

	/**
	 * Parse functional constraint: type(...) or freeOf(...)
	 */
	private parseFunctional(funcName: string): PatternConstraint {
		this.advance(); // consume (

		if (funcName === 'type') {
			return this.parseTypeConstraint();
		} else if (funcName === 'freeOf') {
			return this.parseFreeOfConstraint();
		}

		throw new Error(`Unknown functional constraint '${funcName}'`);
	}

	/**
	 * Parse type constraint: type(ident | ident | ...)
	 * The pipe separates alternative types (OR semantics).
	 */
	private parseTypeConstraint(): PatternConstraint {
		const types: MathNodeType[] = [];

		// Parse first type
		const firstToken = this.expect('IDENT', 'Expected type name in type(...)');
		types.push(firstToken.value as MathNodeType);

		// Parse additional types separated by |
		while (this.currentToken.type === 'PIPE') {
			this.advance(); // consume |
			const typeToken = this.expect('IDENT', 'Expected type name after |');
			types.push(typeToken.value as MathNodeType);
		}

		this.expect('RPAREN', "Expected ')' after type constraint");

		return P.isType(...types);
	}

	/**
	 * Parse freeOf constraint: freeOf(var, var, ...)
	 * Comma separates variable names.
	 */
	private parseFreeOfConstraint(): PatternConstraint {
		const variables: string[] = [];

		// Parse first variable
		const firstToken = this.expect('IDENT', 'Expected variable name in freeOf(...)');
		variables.push(firstToken.value);

		// Parse additional variables separated by comma
		while (this.currentToken.type === 'COMMA') {
			this.advance(); // consume ,
			const varToken = this.expect('IDENT', 'Expected variable name after comma');
			variables.push(varToken.value);
		}

		this.expect('RPAREN', "Expected ')' after freeOf constraint");

		return P.isFreeOf(...variables);
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a constraint expression string into a PatternConstraint.
 *
 * Supports:
 * - Atomic constraints: number, integer, positive, negative, nonzero, variable,
 *   integerType, rationalType, algebraicType, realType, transcendentalType, complexType
 * - Functional constraints: type(a|b|c), freeOf(x,y,z)
 * - Logical operators: ! (NOT), & (AND), | (OR)
 * - Grouping: (...)
 *
 * Operator precedence (highest to lowest):
 * 1. ! (NOT)
 * 2. & (AND)
 * 3. | (OR)
 *
 * @param input - The constraint expression string
 * @returns The parsed PatternConstraint
 * @throws Error if parsing fails
 *
 * @example
 * // Atomic constraints
 * parseConstraintExpr('number')          // => { kind: 'number' }
 * parseConstraintExpr('positive')        // => { kind: 'positive' }
 *
 * // AND constraint
 * parseConstraintExpr('positive & nonzero')
 * // => { kind: 'and', constraints: [{ kind: 'positive' }, { kind: 'nonzero' }] }
 *
 * // OR constraint
 * parseConstraintExpr('number | variable')
 * // => { kind: 'or', constraints: [{ kind: 'number' }, { kind: 'variable' }] }
 *
 * // NOT constraint
 * parseConstraintExpr('!negative')
 * // => { kind: 'not', constraint: { kind: 'negative' } }
 *
 * // Grouping
 * parseConstraintExpr('!(positive & nonzero)')
 *
 * // Functional constraints
 * parseConstraintExpr('type(addition|multiplication)')
 * parseConstraintExpr('freeOf(x,y)')
 *
 * // Complex expressions
 * parseConstraintExpr('freeOf(n) & type(addition)')
 */
export function parseConstraintExpr(input: string): PatternConstraint {
	const parser = new ConstraintParser(input);
	return parser.parse();
}

/**
 * Check if a string is a valid atomic constraint name.
 */
export function isValidAtomicConstraint(name: string): boolean {
	return VALID_ATOMIC_NAMES.has(name);
}

/**
 * Get all valid atomic constraint names.
 */
export function getAtomicConstraintNames(): readonly string[] {
	return Array.from(VALID_ATOMIC_NAMES);
}
