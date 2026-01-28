/**
 * Pratt Parser for Pattern Syntax
 *
 * A Top-Down Operator Precedence (Pratt) parser for converting pattern
 * strings into Pattern objects for MathAST pattern matching.
 *
 * Features:
 * - Letters are wildcards by default: `x`, `a`, `n` become P._('x'), P._('a'), P._('n')
 * - Constraints: `x:number`, `n:integer` add constraints to wildcards
 * - Sequences: `__rest` (1+ elements), `___opt` (0+ elements)
 * - Literal variables: `$x` matches exactly the variable 'x' (rare)
 * - Standard math operators: +, -, *, /, ^
 * - Functions: sin(x), cos(x), etc.
 * - Parentheses: (x + y)
 * - Number literals: 0, 1, 42, 3.14
 *
 * Note: Single underscore `_x` is deprecated. Use `x` directly.
 *
 * @example
 * parsePattern('x + y')          // => P.add(P._('x'), P._('y'))
 * parsePattern('n:number')       // => P._('n', P.isNumber())
 * parsePattern('sin(x)')         // => P.func('sin', [P._('x')])
 * parsePattern('a + __rest')     // => P.add(P._('a'), P.__('rest'))
 * parsePattern('$x + 0')         // => P.add(P.var('x'), P.num(0))
 *
 * @module mathAST/parser/custom/pattern-parser
 */

import type { Pattern, PatternConstraint } from '../../pattern/types';
import { P } from '../../pattern/builder';
import {
	PatternTokenizer,
	type PatternToken,
	type PatternTokenType,
	type WildcardConstraintName
} from './pattern-tokenizer';

// =============================================================================
// Binding Power (Precedence)
// =============================================================================

/**
 * Binding power constants for operator precedence.
 * Higher values bind tighter.
 */
const enum BP {
	NONE = 0,
	ADDITION = 10, // +, -
	MULTIPLY = 20, // *
	FRACTION = 25, // /
	UNARY = 30, // - (prefix)
	POWER = 40 // ^ (right-associative)
}

// =============================================================================
// Constraint Mapping
// =============================================================================

/**
 * Gets the constraint function for a given constraint name.
 * Uses a function to avoid circular dependency issues with P namespace.
 */
function getConstraint(name: WildcardConstraintName): PatternConstraint {
	// Access P lazily to avoid circular dependency at module load time
	const constraintMap: Record<WildcardConstraintName, () => PatternConstraint> = {
		number: P.isNumber,
		integer: P.isInteger,
		positive: P.isPositive,
		negative: P.isNegative,
		nonzero: P.isNonzero,
		variable: P.isVariable
	};
	return constraintMap[name]();
}

// =============================================================================
// Parser Error Class
// =============================================================================

/**
 * Custom error class for pattern parse errors with location information.
 */
export class PatternParseError extends Error {
	readonly position: number;
	readonly length: number;

	constructor(message: string, position: number, length: number) {
		super(message);
		this.name = 'PatternParseError';
		this.position = position;
		this.length = length;
	}
}

// =============================================================================
// Pratt Parser Class
// =============================================================================

/**
 * Pratt parser for pattern syntax to Pattern conversion.
 *
 * Uses top-down operator precedence parsing with:
 * - NUD (Null Denotation) for prefix/primary expressions
 * - LED (Left Denotation) for infix/postfix expressions
 */
export class PatternPrattParser {
	private readonly tokenizer: PatternTokenizer;
	private currentToken: PatternToken;

	constructor(input: string) {
		this.tokenizer = new PatternTokenizer(input);
		this.currentToken = this.tokenizer.nextToken();
	}

	// =========================================================================
	// Public API
	// =========================================================================

	/**
	 * Parse the input and return the Pattern.
	 * @throws PatternParseError if parsing fails
	 */
	parse(): Pattern {
		if (this.currentToken.type === 'EOF') {
			throw new PatternParseError('Empty input', 0, 0);
		}

		const result = this.parseExpression(BP.NONE);

		// Ensure we consumed all input
		// Cast to string to avoid TS narrowing issue (parseExpression advances tokens)
		if ((this.currentToken.type as string) !== 'EOF') {
			this.error(
				`Unexpected token: ${this.currentToken.value || this.currentToken.type}`,
				this.currentToken.position,
				this.currentToken.length
			);
		}

		return result;
	}

	// =========================================================================
	// Token Management
	// =========================================================================

	/**
	 * Advance to the next token.
	 */
	private advance(): PatternToken {
		const prev = this.currentToken;
		this.currentToken = this.tokenizer.nextToken();
		return prev;
	}

	/**
	 * Check if the current token matches the given type.
	 */
	private check(type: PatternTokenType): boolean {
		return this.currentToken.type === type;
	}

	/**
	 * Expect a specific token type, advancing if matched.
	 */
	private expect(type: PatternTokenType, message?: string): PatternToken {
		if (!this.check(type)) {
			this.error(
				message ?? `Expected ${type} but got ${this.currentToken.type}`,
				this.currentToken.position,
				this.currentToken.length
			);
		}
		return this.advance();
	}

	/**
	 * Report an error.
	 */
	private error(message: string, position: number, length: number): never {
		throw new PatternParseError(message, position, length);
	}

	// =========================================================================
	// Main Parsing Methods
	// =========================================================================

	/**
	 * Parse an expression with the given minimum binding power.
	 */
	private parseExpression(minBp: number): Pattern {
		// Parse prefix/primary (NUD)
		let left = this.nud();

		// Parse infix/postfix operators (LED)
		while (true) {
			const bp = this.getLeftBindingPower();
			if (bp <= minBp) {
				break;
			}

			left = this.led(left);
		}

		return left;
	}

	/**
	 * NUD (Null Denotation) - Parse prefix/primary expressions.
	 */
	private nud(): Pattern {
		const token = this.currentToken;

		switch (token.type) {
			case 'WILDCARD':
				return this.parseWildcard();

			case 'NUMBER':
				return this.parseNumber();

			case 'LITERAL_VAR':
				return this.parseLiteralVariable();

			case 'MINUS':
				return this.parsePrefixMinus();

			case 'LPAREN':
				return this.parseParentheses();

			case 'FUNC':
				return this.parseFunction();

			default:
				this.error(`Unexpected token: ${token.value || token.type}`, token.position, token.length);
		}
	}

	/**
	 * LED (Left Denotation) - Parse infix/postfix expressions.
	 */
	private led(left: Pattern): Pattern {
		const token = this.currentToken;

		switch (token.type) {
			case 'PLUS':
				return this.parseAddition(left);

			case 'MINUS':
				return this.parseSubtraction(left);

			case 'STAR':
				return this.parseMultiplication(left);

			case 'SLASH':
				return this.parseDivision(left);

			case 'CARET':
				return this.parsePower(left);

			default:
				this.error(
					`Unexpected token in expression: ${token.value || token.type}`,
					token.position,
					token.length
				);
		}
	}

	// =========================================================================
	// Binding Power
	// =========================================================================

	/**
	 * Get the left binding power of the current token.
	 */
	private getLeftBindingPower(): number {
		const token = this.currentToken;

		switch (token.type) {
			case 'PLUS':
			case 'MINUS':
				return BP.ADDITION;

			case 'STAR':
				return BP.MULTIPLY;

			case 'SLASH':
				return BP.FRACTION;

			case 'CARET':
				return BP.POWER;

			default:
				return BP.NONE;
		}
	}

	// =========================================================================
	// Primary Parsers
	// =========================================================================

	/**
	 * Parse a wildcard pattern.
	 *
	 * Handles:
	 * - Single wildcards: `x`, `_x`, `x:number`
	 * - Sequence wildcards: `__rest` (1+ elements)
	 * - Optional sequence wildcards: `___opt` (0+ elements)
	 */
	private parseWildcard(): Pattern {
		const token = this.advance();

		// token.wildcardName is guaranteed to exist for WILDCARD tokens
		const name = token.wildcardName!;
		const constraintName = token.constraintName;
		const sequenceType = token.sequenceType ?? 'single';

		// Get constraint if present
		const constraint = constraintName ? getConstraint(constraintName) : undefined;

		// Create appropriate pattern based on sequence type
		switch (sequenceType) {
			case 'sequence':
				return constraint ? P.__(name, constraint) : P.__(name);
			case 'optional-sequence':
				return constraint ? P.___(name, constraint) : P.___(name);
			default:
				return constraint ? P._(name, constraint) : P._(name);
		}
	}

	/**
	 * Parse a number literal.
	 */
	private parseNumber(): Pattern {
		const token = this.advance();
		return P.num(parseFloat(token.value));
	}

	/**
	 * Parse a literal variable ($x matches exactly variable 'x').
	 */
	private parseLiteralVariable(): Pattern {
		const token = this.advance();
		return P.var(token.literalName!);
	}

	/**
	 * Parse parentheses: (...)
	 * Creates a delimiter pattern.
	 */
	private parseParentheses(): Pattern {
		this.advance(); // consume (

		if (this.check('RPAREN')) {
			this.error('Empty parentheses not allowed', this.currentToken.position, 1);
		}

		const content = this.parseExpression(BP.NONE);
		this.expect('RPAREN', "Expected ')' after expression");

		return P.paren(content);
	}

	/**
	 * Parse a function: sin(x), log(x), etc.
	 * Parentheses are mandatory.
	 */
	private parseFunction(): Pattern {
		const funcToken = this.advance();
		const name = funcToken.value;

		// Parentheses are mandatory
		if (!this.check('LPAREN')) {
			this.error(
				`Function ${name} requires parentheses: ${name}(...)`,
				this.currentToken.position,
				this.currentToken.length
			);
		}

		this.advance(); // consume (

		// Parse arguments
		const args: Pattern[] = [];
		if (!this.check('RPAREN')) {
			args.push(this.parseExpression(BP.NONE));
			while (this.check('COMMA')) {
				this.advance();
				args.push(this.parseExpression(BP.NONE));
			}
		}

		this.expect('RPAREN', "Expected ')' after function arguments");

		return P.func(name, args);
	}

	// =========================================================================
	// Unary Operators
	// =========================================================================

	/**
	 * Parse prefix minus: -expr
	 */
	private parsePrefixMinus(): Pattern {
		this.advance(); // consume -
		const operand = this.parseExpression(BP.UNARY);
		return P.neg(operand);
	}

	// =========================================================================
	// Binary Operators
	// =========================================================================

	/**
	 * Parse addition: left + right
	 */
	private parseAddition(left: Pattern): Pattern {
		this.advance(); // consume +
		const right = this.parseExpression(BP.ADDITION);
		return P.add(left, right);
	}

	/**
	 * Parse subtraction: left - right
	 */
	private parseSubtraction(left: Pattern): Pattern {
		this.advance(); // consume -
		const right = this.parseExpression(BP.ADDITION);
		return P.sub(left, right);
	}

	/**
	 * Parse multiplication: left * right
	 */
	private parseMultiplication(left: Pattern): Pattern {
		this.advance(); // consume *
		const right = this.parseExpression(BP.MULTIPLY);
		return P.mul(left, right);
	}

	/**
	 * Parse division: left / right
	 */
	private parseDivision(left: Pattern): Pattern {
		this.advance(); // consume /
		const right = this.parseExpression(BP.FRACTION);
		return P.div(left, right);
	}

	/**
	 * Parse power: left ^ right (right-associative)
	 */
	private parsePower(left: Pattern): Pattern {
		this.advance(); // consume ^
		// Right-associative: use BP.POWER - 1 so 2^3^4 parses as 2^(3^4)
		const right = this.parseExpression(BP.POWER - 1);
		return P.pow(left, right);
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a pattern string into a Pattern object.
 *
 * Letters are wildcards by default - no underscore prefix needed.
 * Use $x for literal variable matching (rare).
 *
 * @param input - The pattern syntax string to parse
 * @returns The parsed Pattern
 * @throws PatternParseError if parsing fails
 *
 * @example
 * // Wildcards (letters are wildcards by default)
 * parsePattern('x')                  // => P._('x')
 * parsePattern('x + y')              // => P.add(P._('x'), P._('y'))
 * parsePattern('a * b + c')          // => P.add(P.mul(P._('a'), P._('b')), P._('c'))
 *
 * // Constraints
 * parsePattern('n:number')           // => P._('n', P.isNumber())
 * parsePattern('k:integer')          // => P._('k', P.isInteger())
 *
 * // Sequences (for n-ary patterns)
 * parsePattern('a + __rest')         // => P.add(P._('a'), P.__('rest'))
 * parsePattern('___opt')             // => P.___('opt') (0+ elements)
 *
 * // Literal variables (rare - for matching specific variable names)
 * parsePattern('$x + 0')             // => P.add(P.var('x'), P.num(0))
 *
 * // Old underscore syntax still works
 * parsePattern('_x + _y')            // => P.add(P._('x'), P._('y'))
 *
 * // Other patterns
 * parsePattern('-x')                 // => P.neg(P._('x'))
 * parsePattern('x^2')                // => P.pow(P._('x'), P.num(2))
 * parsePattern('sin(x)')             // => P.func('sin', [P._('x')])
 * parsePattern('(x + y)')            // => P.paren(P.add(P._('x'), P._('y')))
 */
export function parsePattern(input: string): Pattern {
	const parser = new PatternPrattParser(input);
	return parser.parse();
}
