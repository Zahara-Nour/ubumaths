/**
 * Parser for ASCIIMath expressions
 *
 * Implements a recursive descent parser for ASCIIMath following this grammar:
 *
 * expression     = relation
 * relation       = additive { relation_op additive }
 * additive       = multiplicative { ("+" | "-") multiplicative }
 * multiplicative = fraction { ("*" | ":") fraction }
 * fraction       = power { "/" power }  (left-associative)
 * power          = unary [ ("^" | "_") power ]  (right-associative)
 * unary          = "-" atom | atom  ("-" only if unaryMinusAllowed)
 * atom           = number | symbol | identifier | greek | template | group | function_call | abs
 * group          = "(" expression ")" | "[" expression "]" | "{" expression "}"
 * abs            = "|" expression "|"
 * function_call  = function_1arg "(" expression ")" | "root" "(" expression ")" "(" expression ")"
 * relation_op    = "=" | "<" | ">" | "<=" | ">=" | "!=" | "~~" | "-=" | "~" | "prop"
 *
 * Special rules:
 * 1. Unary minus "-" allowed only after (, [, {, | or at start of expression
 * 2. Fractions "/" are left-associative: a/b/c → (a/b)/c
 * 3. Powers "^" and subscripts "_" are right-associative: x^2^3 → x^(2^3)
 * 4. Combined scripts: x_i^2 or x^2_i → SubSupNode
 */

import type { Token, TokenType, ASTNode } from './types.js';

/**
 * Parse error with position information
 */
export class ParseError extends Error {
	constructor(
		message: string,
		public readonly position: number,
		public readonly token?: Token
	) {
		super(message);
		this.name = 'ParseError';
	}
}

/**
 * Recursive descent parser for ASCIIMath expressions
 */
export class Parser {
	private tokens: Token[];
	private pos: number = 0;
	private unaryMinusAllowed: boolean = true;

	constructor(tokens: Token[]) {
		// Filter out WHITESPACE tokens, keep everything else
		this.tokens = tokens.filter((t) => t.type !== 'WHITESPACE');
	}

	/**
	 * Parse the token stream into an AST
	 */
	parse(): ASTNode {
		if (this.tokens.length === 0 || (this.tokens.length === 1 && this.tokens[0].type === 'EOF')) {
			throw new ParseError('Empty expression', 0);
		}

		const result = this.parseExpression();

		// Ensure we've consumed all tokens except EOF
		if (!this.isAtEnd()) {
			const token = this.peek();
			throw new ParseError(`Unexpected token: ${token.value}`, token.start, token);
		}

		return result;
	}

	// ========== Token Management ==========

	/**
	 * Peek at token at current position + offset
	 */
	private peek(offset: number = 0): Token {
		const index = this.pos + offset;
		if (index >= this.tokens.length) {
			return this.tokens[this.tokens.length - 1]; // Return EOF
		}
		return this.tokens[index];
	}

	/**
	 * Advance and return the current token
	 */
	private advance(): Token {
		if (this.isAtEnd()) {
			return this.peek();
		}
		return this.tokens[this.pos++];
	}

	/**
	 * Check if current token has the specified type
	 */
	private check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek().type === type;
	}

	/**
	 * Check if current token is an OPERATOR with specified value
	 */
	private checkOperator(op: string): boolean {
		if (!this.check('OPERATOR')) return false;
		return this.peek().value === op;
	}

	/**
	 * Consume a token of expected type or throw error
	 */
	private expect(type: TokenType, message: string): Token {
		const token = this.peek();
		if (token.type !== type) {
			throw new ParseError(message, token.start, token);
		}
		return this.advance();
	}

	/**
	 * Check if we're at the end of tokens
	 */
	private isAtEnd(): boolean {
		return this.peek().type === 'EOF';
	}

	// ========== Grammar Parsing Methods ==========

	/**
	 * Parse expression (top-level entry)
	 */
	private parseExpression(): ASTNode {
		return this.parseRelation();
	}

	/**
	 * Parse relation: additive { relation_op additive }
	 */
	private parseRelation(): ASTNode {
		let left = this.parseAdditive();

		while (this.isRelationOp()) {
			const operator = this.advance();
			const right = this.parseAdditive();

			left = {
				type: 'BinaryOp',
				operator: operator.value,
				left,
				right,
				start: left.start,
				end: right.end
			};
		}

		return left;
	}

	/**
	 * Check if current token is a relation operator
	 */
	private isRelationOp(): boolean {
		const token = this.peek();

		// OPERATOR tokens: =, <, >
		if (token.type === 'OPERATOR' && ['=', '<', '>'].includes(token.value)) {
			return true;
		}

		// SYMBOL tokens: <=, >=, !=, ~~, -=, ~, prop
		if (
			token.type === 'SYMBOL' &&
			['<=', '>=', '!=', '~~', '-=', '~', 'prop'].includes(token.value)
		) {
			return true;
		}

		return false;
	}

	/**
	 * Parse additive: multiplicative { ("+" | "-") multiplicative }
	 */
	private parseAdditive(): ASTNode {
		let left = this.parseMultiplicative();

		while (this.checkOperator('+') || this.checkOperator('-')) {
			const operator = this.advance();

			// Disable unary minus after binary operators
			this.unaryMinusAllowed = false;
			const right = this.parseMultiplicative();
			this.unaryMinusAllowed = true;

			left = {
				type: 'BinaryOp',
				operator: operator.value,
				left,
				right,
				start: left.start,
				end: right.end
			};
		}

		return left;
	}

	/**
	 * Parse multiplicative: fraction { ("*" | ":") fraction }
	 */
	private parseMultiplicative(): ASTNode {
		let left = this.parseFraction();

		while (
			this.checkOperator(':') ||
			(this.peek().type === 'SYMBOL' && this.peek().value === '*')
		) {
			const operator = this.advance();

			// Disable unary minus after binary operators
			this.unaryMinusAllowed = false;
			const right = this.parseFraction();
			this.unaryMinusAllowed = true;

			left = {
				type: 'BinaryOp',
				operator: operator.value,
				left,
				right,
				start: left.start,
				end: right.end
			};
		}

		return left;
	}

	/**
	 * Parse fraction: power { "/" power } (left-associative)
	 */
	private parseFraction(): ASTNode {
		let left = this.parsePower();

		while (this.checkOperator('/')) {
			this.advance(); // consume "/"

			// Disable unary minus after division operator
			this.unaryMinusAllowed = false;
			const right = this.parsePower();
			this.unaryMinusAllowed = true;

			left = {
				type: 'Fraction',
				numerator: left,
				denominator: right,
				start: left.start,
				end: right.end
			};
		}

		return left;
	}

	/**
	 * Parse power: unary [ ("^" | "_") power ] (right-associative)
	 * Handles combined subscript/superscript: x_i^2 or x^2_i
	 */
	private parsePower(): ASTNode {
		const base = this.parseUnary();
		return this.parseScripts(base);
	}

	/**
	 * Parse scripts (superscript/subscript) for a given base
	 * Handles combined scripts: x_i^2 or x^2_i → SubSupNode
	 */
	private parseScripts(base: ASTNode): ASTNode {
		if (!this.checkOperator('^') && !this.checkOperator('_')) {
			return base;
		}

		const firstOp = this.advance();
		// For the first script, parse only unary (don't recursively parse scripts)
		const firstExpr = this.parseUnary();

		// Check for second script operator at the same level (not nested)
		if (this.checkOperator('^') || this.checkOperator('_')) {
			const secondOp = this.peek();

			// Ensure we have one ^ and one _
			if (firstOp.value === secondOp.value) {
				// This is a nested script like x^2^3, let it be handled recursively
				// Wrap firstExpr with its script recursively
				const wrappedFirst = this.parseScripts(firstExpr);
				if (firstOp.value === '^') {
					return {
						type: 'Superscript',
						base,
						exponent: wrappedFirst,
						start: base.start,
						end: wrappedFirst.end
					};
				} else {
					return {
						type: 'Subscript',
						base,
						subscript: wrappedFirst,
						start: base.start,
						end: wrappedFirst.end
					};
				}
			}

			// We have one ^ and one _, create SubSup
			this.advance(); // consume second operator
			const secondExpr = this.parseUnary();

			// Create SubSupNode
			return {
				type: 'SubSup',
				base,
				subscript: firstOp.value === '_' ? firstExpr : secondExpr,
				superscript: firstOp.value === '^' ? firstExpr : secondExpr,
				start: base.start,
				end: secondExpr.end
			};
		}

		// Single script - check if it needs further nesting
		const finalExpr = this.parseScripts(firstExpr);

		if (firstOp.value === '^') {
			return {
				type: 'Superscript',
				base,
				exponent: finalExpr,
				start: base.start,
				end: finalExpr.end
			};
		} else {
			return {
				type: 'Subscript',
				base,
				subscript: finalExpr,
				start: base.start,
				end: finalExpr.end
			};
		}
	}

	/**
	 * Parse unary: "-" atom | atom
	 * Unary minus only allowed if unaryMinusAllowed flag is true
	 */
	private parseUnary(): ASTNode {
		if (this.checkOperator('-') && this.unaryMinusAllowed) {
			const operator = this.advance();
			const operand = this.parseAtom();

			return {
				type: 'UnaryOp',
				operator: '-',
				operand,
				start: operator.start,
				end: operand.end
			};
		}

		return this.parseAtom();
	}

	/**
	 * Parse atom: number | symbol | identifier | greek | template | group | function_call | abs
	 */
	private parseAtom(): ASTNode {
		const token = this.peek();

		// Number
		if (token.type === 'NUMBER') {
			this.advance();
			return {
				type: 'Number',
				value: token.value,
				start: token.start,
				end: token.end
			};
		}

		// Template
		if (token.type === 'TEMPLATE') {
			this.advance();
			// Extract content without the surrounding {{}}
			const content = token.value.slice(2, -2);
			return {
				type: 'Template',
				content,
				start: token.start,
				end: token.end
			};
		}

		// Greek
		if (token.type === 'GREEK') {
			this.advance();
			return {
				type: 'Greek',
				name: token.value,
				start: token.start,
				end: token.end
			};
		}

		// Symbol (including multi-char like *, <=, etc.)
		if (token.type === 'SYMBOL') {
			this.advance();
			return {
				type: 'Symbol',
				name: token.value,
				start: token.start,
				end: token.end
			};
		}

		// Function call
		if (token.type === 'FUNCTION') {
			return this.parseFunctionCall(token.value, token);
		}

		// Identifier
		if (token.type === 'IDENTIFIER') {
			this.advance();
			return {
				type: 'Identifier',
				name: token.value,
				start: token.start,
				end: token.end
			};
		}

		// Groups: (), [], {}
		if (token.type === 'LPAREN') {
			return this.parseGroup('LPAREN');
		}
		if (token.type === 'LBRACKET') {
			return this.parseGroup('LBRACKET');
		}
		if (token.type === 'LBRACE') {
			return this.parseGroup('LBRACE');
		}

		// Absolute value
		if (token.type === 'PIPE') {
			return this.parseAbs();
		}

		throw new ParseError(`Unexpected token: ${token.value}`, token.start, token);
	}

	/**
	 * Parse group: (expr), [expr], {expr}
	 */
	private parseGroup(openType: TokenType): ASTNode {
		const openToken = this.advance(); // Consume opening delimiter

		// Set unaryMinusAllowed to true inside groups
		const savedUnaryMinusAllowed = this.unaryMinusAllowed;
		this.unaryMinusAllowed = true;

		const expression = this.parseExpression();

		this.unaryMinusAllowed = savedUnaryMinusAllowed;

		// Expect matching closing delimiter
		const closeType =
			openType === 'LPAREN' ? 'RPAREN' : openType === 'LBRACKET' ? 'RBRACKET' : 'RBRACE';
		const closeToken = this.expect(
			closeType,
			`Expected ${closeType === 'RPAREN' ? ')' : closeType === 'RBRACKET' ? ']' : '}'}`
		);

		// Return appropriate node type
		if (openType === 'LBRACE') {
			return {
				type: 'Group',
				expression,
				start: openToken.start,
				end: closeToken.end
			};
		} else {
			return {
				type: 'Paren',
				expression,
				bracket: openType === 'LPAREN' ? '(' : '[',
				start: openToken.start,
				end: closeToken.end
			};
		}
	}

	/**
	 * Parse absolute value: |expr|
	 */
	private parseAbs(): ASTNode {
		const openPipe = this.advance(); // Consume opening |

		// Set unaryMinusAllowed to true inside absolute value
		const savedUnaryMinusAllowed = this.unaryMinusAllowed;
		this.unaryMinusAllowed = true;

		const expression = this.parseExpression();

		this.unaryMinusAllowed = savedUnaryMinusAllowed;

		const closePipe = this.expect('PIPE', 'Expected closing |');

		return {
			type: 'Abs',
			expression,
			start: openPipe.start,
			end: closePipe.end
		};
	}

	/**
	 * Parse function call: func(expr) or root(n)(x)
	 */
	private parseFunctionCall(name: string, startToken: Token): ASTNode {
		this.advance(); // Consume function name

		// Special case for root: root(index)(radicand)
		if (name === 'root') {
			this.expect('LPAREN', `Expected '(' after ${name}`);
			const index = this.parseExpression();
			this.expect('RPAREN', `Expected ')' after root index`);

			this.expect('LPAREN', `Expected second '(' after root index`);
			const radicand = this.parseExpression();
			const closeToken = this.expect('RPAREN', `Expected ')' after root radicand`);

			return {
				type: 'Root',
				index,
				radicand,
				start: startToken.start,
				end: closeToken.end
			};
		}

		// Regular function: func(expr)
		this.expect('LPAREN', `Expected '(' after ${name}`);
		const argument = this.parseExpression();
		const closeToken = this.expect('RPAREN', `Expected ')' after function argument`);

		return {
			type: 'Function',
			name,
			argument,
			start: startToken.start,
			end: closeToken.end
		};
	}
}
