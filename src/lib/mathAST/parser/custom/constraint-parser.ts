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

import type { PatternConstraint, IntervalConstraint } from '../../pattern/types';
import { P } from '../../pattern/builder';
import type { MathNodeType } from '../../types';
import {
	intervalSet,
	interval,
	openEndpoint,
	closedEndpoint,
	positiveInfinity,
	negativeInfinity
} from '$lib/math/intervals';
import type { Endpoint, EndpointValue } from '$lib/math/intervals';
import { parseCustomPratt } from './parser-pratt';

// =============================================================================
// Token Types
// =============================================================================

type ConstraintTokenType =
	| 'IDENT'
	| 'NUMBER'
	| 'LPAREN'
	| 'RPAREN'
	| 'LBRACKET'
	| 'RBRACKET'
	| 'NOT'
	| 'AND'
	| 'OR'
	| 'COMMA'
	| 'PIPE'
	| 'PLUS'
	| 'MINUS'
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
			case '[':
				this.position++;
				return { type: 'LBRACKET', value: '[', position: startPos };
			case ']':
				this.position++;
				return { type: 'RBRACKET', value: ']', position: startPos };
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
			case '+':
				this.position++;
				return { type: 'PLUS', value: '+', position: startPos };
			case '-':
				// Could be negative number or MINUS token
				if (this.position + 1 < this.length && this.isDigit(this.input[this.position + 1])) {
					return this.scanNumber();
				}
				this.position++;
				return { type: 'MINUS', value: '-', position: startPos };
		}

		// Number (digits, optionally starting with -)
		if (this.isDigit(char)) {
			return this.scanNumber();
		}

		// Identifier (starts with letter, may contain digits for sqrt2, sqrt3, etc.)
		if (this.isLetter(char)) {
			let ident = '';
			while (this.position < this.length && this.isAlphanumeric(this.input[this.position])) {
				ident += this.input[this.position];
				this.position++;
			}

			// Special handling for mathematical domain shortcuts: inR, inN, inZ
			// They can be followed by +, -, * to form inR+, inR-, inR*, inR+*, inR-*, inN*, inZ*
			if (ident === 'inR' || ident === 'inN' || ident === 'inZ') {
				// Check for + or - suffix
				if (this.position < this.length) {
					const nextChar = this.input[this.position];
					if (nextChar === '+' || nextChar === '-') {
						ident += nextChar;
						this.position++;
						// Check for * after + or -
						if (this.position < this.length && this.input[this.position] === '*') {
							ident += '*';
							this.position++;
						}
					} else if (nextChar === '*') {
						ident += '*';
						this.position++;
					}
				}
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

	/**
	 * Get the raw input string.
	 */
	getInput(): string {
		return this.input;
	}

	/**
	 * Get current position in the input.
	 */
	getPosition(): number {
		return this.position;
	}

	/**
	 * Set the position in the input (used after external parsing).
	 */
	setPosition(pos: number): void {
		this.position = pos;
	}

	private skipWhitespace(): void {
		while (this.position < this.length && /\s/.test(this.input[this.position])) {
			this.position++;
		}
	}

	private isLetter(char: string): boolean {
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
	}

	private isAlphanumeric(char: string): boolean {
		return this.isLetter(char) || this.isDigit(char);
	}

	private isDigit(char: string): boolean {
		return char >= '0' && char <= '9';
	}

	private scanNumber(): ConstraintToken {
		const startPos = this.position;
		let value = '';

		// Handle optional minus sign
		if (this.input[this.position] === '-') {
			value += '-';
			this.position++;
		}

		// Scan integer part
		while (this.position < this.length && this.isDigit(this.input[this.position])) {
			value += this.input[this.position];
			this.position++;
		}

		// Scan optional decimal part
		if (
			this.position < this.length &&
			this.input[this.position] === '.' &&
			this.position + 1 < this.length &&
			this.isDigit(this.input[this.position + 1])
		) {
			value += '.';
			this.position++;
			while (this.position < this.length && this.isDigit(this.input[this.position])) {
				value += this.input[this.position];
				this.position++;
			}
		}

		return { type: 'NUMBER', value, position: startPos };
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
	'complexType',
	// Mathematical domain shortcuts
	'inR',
	'inR+',
	'inR+*',
	'inR*',
	'inR-',
	'inR-*',
	'inN',
	'inN*',
	'inZ',
	'inZ*'
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
		// Mathematical domain shortcuts
		case 'inR':
			return P.inR();
		case 'inR+':
			return P.inRplus();
		case 'inR+*':
			return P.inRplusStar();
		case 'inR*':
			return P.inRstar();
		case 'inR-':
			return P.inRminus();
		case 'inR-*':
			return P.inRminusStar();
		case 'inN':
			return P.inN();
		case 'inN*':
			return P.inNstar();
		case 'inZ':
			return P.inZ();
		case 'inZ*':
			return P.inZstar();
		default:
			throw new Error(`Unknown atomic constraint: ${name}`);
	}
}

/**
 * Set of functional constraint names
 */
const FUNCTIONAL_CONSTRAINT_NAMES = new Set([
	'type',
	'freeOf',
	// Comparison operators
	'gt',
	'lt',
	'gte',
	'lte',
	'eq',
	'ne',
	// Interval constraint
	'in'
]);

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
	private readonly input: string;
	private currentToken: ConstraintToken;

	constructor(input: string) {
		this.input = input;
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

		// Check if this is the 'in' constraint (uses brackets, not parentheses)
		if (
			name === 'in' &&
			(this.currentToken.type === 'LBRACKET' || this.currentToken.type === 'RBRACKET')
		) {
			return this.parseFunctional(name);
		}

		// Check if this is a functional constraint
		if (FUNCTIONAL_CONSTRAINT_NAMES.has(name) && this.currentToken.type === 'LPAREN') {
			return this.parseFunctional(name);
		}

		// Otherwise, it's an atomic constraint
		if (!VALID_ATOMIC_NAMES.has(name)) {
			throw new Error(
				`Unknown constraint '${name}' at position ${identToken.position}. ` +
					`Valid constraints: ${Array.from(VALID_ATOMIC_NAMES).join(', ')}, type(...), freeOf(...), in]...[`
			);
		}

		return getAtomicConstraint(name);
	}

	/**
	 * Parse functional constraint: type(...), freeOf(...), in]...[
	 */
	private parseFunctional(funcName: string): PatternConstraint {
		// Special case for 'in' - doesn't use parentheses
		if (funcName === 'in') {
			return this.parseInConstraint();
		}

		this.advance(); // consume (

		if (funcName === 'type') {
			return this.parseTypeConstraint();
		} else if (funcName === 'freeOf') {
			return this.parseFreeOfConstraint();
		} else if (['gt', 'lt', 'gte', 'lte', 'eq', 'ne'].includes(funcName)) {
			return this.parseComparisonConstraint(funcName as 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne');
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

	/**
	 * Parse comparison constraint: gt(n), lt(n), gte(n), lte(n), eq(n), ne(n)
	 * Takes a single number argument.
	 */
	private parseComparisonConstraint(
		operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne'
	): PatternConstraint {
		// Expect a number
		if (this.currentToken.type !== 'NUMBER') {
			throw new Error(
				`Expected number in ${operator}(...) at position ${this.currentToken.position}`
			);
		}
		const numToken = this.advance();
		const value = parseFloat(numToken.value);

		if (!Number.isFinite(value)) {
			throw new Error(`Invalid number '${numToken.value}' in ${operator}(...)`);
		}

		this.expect('RPAREN', `Expected ')' after ${operator} constraint`);

		switch (operator) {
			case 'gt':
				return P.gt(value);
			case 'lt':
				return P.lt(value);
			case 'gte':
				return P.gte(value);
			case 'lte':
				return P.lte(value);
			case 'eq':
				return P.eq(value);
			case 'ne':
				return P.ne(value);
		}
	}

	/**
	 * Parse interval constraint: in]a,b[
	 *
	 * French notation:
	 * - ] = open on left (exclusive)
	 * - [ = closed on left (inclusive)
	 * - [ at end = open on right (exclusive)
	 * - ] at end = closed on right (inclusive)
	 *
	 * Examples:
	 * - in]0,+inf[  → x > 0
	 * - in[0,10]    → 0 <= x <= 10
	 * - in[0,10[    → 0 <= x < 10
	 * - in]-inf,0[  → x < 0
	 *
	 * This method bypasses the constraint tokenizer and works directly with
	 * the input string to support full math expression syntax (including \pi).
	 */
	private parseInConstraint(): IntervalConstraint {
		// Get the position right after 'in' - should be at opening bracket
		const startPos = this.currentToken.position;

		// Expect opening bracket: [ or ]
		if (this.currentToken.type !== 'LBRACKET' && this.currentToken.type !== 'RBRACKET') {
			throw new Error(`Expected '[' or ']' after 'in' at position ${startPos}`);
		}

		// French notation: ] means open, [ means closed (for left endpoint)
		const leftBracketChar = this.input[startPos];
		const lowerType: 'open' | 'closed' = leftBracketChar === ']' ? 'open' : 'closed';

		// Find the closing bracket and extract the interval content
		const { commaPos, endBracketPos, rightBracketChar } = this.findIntervalBounds(startPos + 1);

		// French notation: [ means open, ] means closed (for right endpoint)
		const upperType: 'open' | 'closed' = rightBracketChar === '[' ? 'open' : 'closed';

		// Extract bound strings
		const lowerStr = this.input.slice(startPos + 1, commaPos).trim();
		const upperStr = this.input.slice(commaPos + 1, endBracketPos).trim();

		// Parse bounds
		const lowerValue = this.parseBoundString(lowerStr, startPos + 1);
		const upperValue = this.parseBoundString(upperStr, commaPos + 1);

		// Build endpoints
		const lower: Endpoint =
			lowerType === 'open' ? openEndpoint(lowerValue) : closedEndpoint(lowerValue);
		const upper: Endpoint =
			upperType === 'open' ? openEndpoint(upperValue) : closedEndpoint(upperValue);

		// Update tokenizer position to after the interval
		this.tokenizer.setPosition(endBracketPos + 1);
		this.currentToken = this.tokenizer.nextToken();

		// Create interval domain
		const domain = intervalSet([interval(lower, upper)]);

		return { kind: 'interval', domain };
	}

	/**
	 * Find interval bounds: the comma position and closing bracket position.
	 * Handles nested parentheses/braces.
	 */
	private findIntervalBounds(startPos: number): {
		commaPos: number;
		endBracketPos: number;
		rightBracketChar: string;
	} {
		let pos = startPos;
		let depth = 0;
		let commaPos = -1;

		while (pos < this.input.length) {
			const char = this.input[pos];

			// Track nesting depth
			if (char === '(' || char === '{') {
				depth++;
			} else if (char === ')' || char === '}') {
				depth--;
			}

			// Find comma at depth 0
			if (depth === 0 && char === ',' && commaPos === -1) {
				commaPos = pos;
			}

			// Find closing bracket at depth 0
			if (depth === 0 && (char === '[' || char === ']') && commaPos !== -1) {
				return { commaPos, endBracketPos: pos, rightBracketChar: char };
			}

			pos++;
		}

		throw new Error(`Malformed interval at position ${startPos}: missing comma or closing bracket`);
	}

	/**
	 * Parse a bound string into an EndpointValue.
	 * Handles special cases like +inf, -inf, inf.
	 */
	private parseBoundString(boundStr: string, position: number): EndpointValue {
		const trimmed = boundStr.trim();

		if (!trimmed) {
			throw new Error(`Empty interval bound at position ${position}`);
		}

		// Handle infinity
		if (trimmed === '+inf' || trimmed === 'inf') {
			return positiveInfinity();
		}
		if (trimmed === '-inf') {
			return negativeInfinity();
		}

		// Parse with math parser
		try {
			return parseCustomPratt(trimmed);
		} catch (err) {
			throw new Error(
				`Invalid interval bound '${trimmed}' at position ${position}: ${err instanceof Error ? err.message : String(err)}`
			);
		}
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
