/**
 * Unit tests for Pattern Syntax Parser
 *
 * Tests the pattern tokenizer and parser that convert pattern strings
 * into Pattern objects equivalent to those built with the P namespace.
 */

import { describe, it, expect } from 'vitest';
import {
	PatternTokenizer,
	tokenizePattern,
	isValidConstraintName
} from '../../parser/custom/pattern-tokenizer';
import { parsePattern, PatternParseError } from '../../parser/custom/pattern-parser';
import { P } from '../builder';

// =============================================================================
// Pattern Tokenizer Tests
// =============================================================================

describe('Pattern Tokenizer', () => {
	// =========================================================================
	// WILDCARD Token Tests
	// =========================================================================

	describe('WILDCARD tokens', () => {
		describe('basic wildcards (letters are wildcards by default)', () => {
			it('tokenizes simple wildcard x', () => {
				const tokens = tokenizePattern('x');

				expect(tokens).toHaveLength(2); // WILDCARD + EOF
				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].value).toBe('x');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBeUndefined();
			});

			it('tokenizes multi-letter wildcard foo', () => {
				const tokens = tokenizePattern('foo');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].value).toBe('foo');
				expect(tokens[0].wildcardName).toBe('foo');
			});

			it('tokenizes wildcard with mixed case MyVar', () => {
				const tokens = tokenizePattern('MyVar');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('MyVar');
			});

			it('tokenizes single letter wildcards', () => {
				const letters = ['a', 'b', 'x', 'y', 'z', 'A', 'Z'];

				for (const letter of letters) {
					const tokens = tokenizePattern(letter);
					expect(tokens[0].type).toBe('WILDCARD');
					expect(tokens[0].wildcardName).toBe(letter);
				}
			});

			it('rejects old _x syntax (not supported)', () => {
				expect(() => tokenizePattern('_x')).toThrow("'_x' syntax is not supported");
				expect(() => tokenizePattern('_foo')).toThrow("'_x' syntax is not supported");
			});
		});

		describe('sequence wildcards', () => {
			it('tokenizes __rest as sequence wildcard (1+ elements)', () => {
				const tokens = tokenizePattern('__rest');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].value).toBe('__rest');
				expect(tokens[0].wildcardName).toBe('rest');
				expect(tokens[0].sequenceType).toBe('sequence');
			});

			it('tokenizes ___opt as optional sequence wildcard (0+ elements)', () => {
				const tokens = tokenizePattern('___opt');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].value).toBe('___opt');
				expect(tokens[0].wildcardName).toBe('opt');
				expect(tokens[0].sequenceType).toBe('optional-sequence');
			});

			it('tokenizes sequence wildcard with constraint', () => {
				const tokens = tokenizePattern('__vars:variable');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('vars');
				expect(tokens[0].sequenceType).toBe('sequence');
				expect(tokens[0].constraintName).toBe('variable');
			});

			it('tokenizes letter wildcard as single type', () => {
				const tokens = tokenizePattern('x');

				expect(tokens[0].sequenceType).toBe('single');
			});
		});

		describe('new syntax without underscore prefix', () => {
			it('tokenizes x as wildcard (letters are wildcards by default)', () => {
				const tokens = tokenizePattern('x');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].sequenceType).toBe('single');
			});

			it('tokenizes multi-letter name as single wildcard', () => {
				const tokens = tokenizePattern('coeff');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('coeff');
			});

			it('tokenizes letter with constraint', () => {
				const tokens = tokenizePattern('n:integer');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('n');
				expect(tokens[0].constraintName).toBe('integer');
			});
		});

		describe('wildcards with constraints', () => {
			it('tokenizes n:number constraint', () => {
				const tokens = tokenizePattern('n:number');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].value).toBe('n:number');
				expect(tokens[0].wildcardName).toBe('n');
				expect(tokens[0].constraintName).toBe('number');
			});

			it('tokenizes x:integer constraint', () => {
				const tokens = tokenizePattern('x:integer');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBe('integer');
			});

			it('tokenizes x:positive constraint', () => {
				const tokens = tokenizePattern('x:positive');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBe('positive');
			});

			it('tokenizes x:negative constraint', () => {
				const tokens = tokenizePattern('x:negative');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBe('negative');
			});

			it('tokenizes x:nonzero constraint', () => {
				const tokens = tokenizePattern('x:nonzero');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBe('nonzero');
			});

			it('tokenizes x:variable constraint', () => {
				const tokens = tokenizePattern('x:variable');

				expect(tokens[0].type).toBe('WILDCARD');
				expect(tokens[0].wildcardName).toBe('x');
				expect(tokens[0].constraintName).toBe('variable');
			});

			it('tokenizes all valid constraints', () => {
				const constraints = [
					'number',
					'integer',
					'positive',
					'negative',
					'nonzero',
					'variable'
				] as const;

				for (const constraint of constraints) {
					const tokens = tokenizePattern(`x:${constraint}`);
					expect(tokens[0].constraintName).toBe(constraint);
				}
			});
		});

		describe('error cases', () => {
			it('throws error for unsupported _x syntax', () => {
				expect(() => tokenizePattern('_x')).toThrow("'_x' syntax is not supported");
				expect(() => tokenizePattern('_foo')).toThrow("'_x' syntax is not supported");
			});

			it('throws error for standalone underscore', () => {
				expect(() => tokenizePattern('_')).toThrow("'_x' syntax is not supported");
			});

			it('throws error for underscore followed by number', () => {
				expect(() => tokenizePattern('_1')).toThrow("'_x' syntax is not supported");
			});

			it('throws error for empty constraint after colon', () => {
				expect(() => tokenizePattern('x:')).toThrow("':' must be followed by a constraint name");
			});

			it('throws error for invalid constraint name', () => {
				expect(() => tokenizePattern('x:invalid')).toThrow("Invalid constraint 'invalid'");
			});

			it('throws error for misspelled constraint', () => {
				expect(() => tokenizePattern('x:numbr')).toThrow("Invalid constraint 'numbr'");
			});

			it('throws error for constraint followed by colon without name', () => {
				expect(() => tokenizePattern('x:+')).toThrow("':' must be followed by a constraint name");
			});

			it('throws error for sequence without name', () => {
				expect(() => tokenizePattern('__')).toThrow("'__' must be followed by a letter");
				expect(() => tokenizePattern('___')).toThrow("'___' must be followed by a letter");
			});
		});

		describe('isValidConstraintName helper', () => {
			it('returns true for valid constraint names', () => {
				expect(isValidConstraintName('number')).toBe(true);
				expect(isValidConstraintName('integer')).toBe(true);
				expect(isValidConstraintName('positive')).toBe(true);
				expect(isValidConstraintName('negative')).toBe(true);
				expect(isValidConstraintName('nonzero')).toBe(true);
				expect(isValidConstraintName('variable')).toBe(true);
			});

			it('returns false for invalid constraint names', () => {
				expect(isValidConstraintName('invalid')).toBe(false);
				expect(isValidConstraintName('numbr')).toBe(false);
				expect(isValidConstraintName('')).toBe(false);
				expect(isValidConstraintName('any')).toBe(false);
			});
		});
	});

	// =========================================================================
	// Other Token Tests
	// =========================================================================

	describe('operator tokens', () => {
		it('tokenizes arithmetic operators', () => {
			const tokens = tokenizePattern('+ - * / ^');

			expect(tokens[0].type).toBe('PLUS');
			expect(tokens[1].type).toBe('MINUS');
			expect(tokens[2].type).toBe('STAR');
			expect(tokens[3].type).toBe('SLASH');
			expect(tokens[4].type).toBe('CARET');
		});

		it('tokenizes parentheses', () => {
			const tokens = tokenizePattern('()');

			expect(tokens[0].type).toBe('LPAREN');
			expect(tokens[1].type).toBe('RPAREN');
		});

		it('tokenizes comma', () => {
			const tokens = tokenizePattern(',');

			expect(tokens[0].type).toBe('COMMA');
		});
	});

	describe('number tokens', () => {
		it('tokenizes integers', () => {
			const tokens = tokenizePattern('42');

			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[0].value).toBe('42');
		});

		it('tokenizes decimals with dot', () => {
			const tokens = tokenizePattern('3.14');

			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[0].value).toBe('3.14');
		});

		it('tokenizes decimals with comma (normalized to dot)', () => {
			const tokens = tokenizePattern('3,14');

			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[0].value).toBe('3.14');
		});
	});

	describe('letter and function tokens', () => {
		it('tokenizes single letter as WILDCARD (letters are wildcards by default)', () => {
			const tokens = tokenizePattern('x');

			expect(tokens[0].type).toBe('WILDCARD');
			expect(tokens[0].value).toBe('x');
			expect(tokens[0].wildcardName).toBe('x');
			expect(tokens[0].sequenceType).toBe('single');
		});

		it('tokenizes letter with constraint as WILDCARD', () => {
			const tokens = tokenizePattern('x:number');

			expect(tokens[0].type).toBe('WILDCARD');
			expect(tokens[0].wildcardName).toBe('x');
			expect(tokens[0].constraintName).toBe('number');
		});

		it('tokenizes $x as LITERAL_VAR', () => {
			const tokens = tokenizePattern('$x');

			expect(tokens[0].type).toBe('LITERAL_VAR');
			expect(tokens[0].value).toBe('$x');
			expect(tokens[0].literalName).toBe('x');
		});

		it('tokenizes function names followed by (', () => {
			const functions = ['sin', 'cos', 'tan', 'ln', 'log', 'exp', 'sqrt'];

			for (const func of functions) {
				// Functions must be followed by ( to be recognized as functions
				const tokens = tokenizePattern(`${func}(x)`);
				expect(tokens[0].type).toBe('FUNC');
				expect(tokens[0].value).toBe(func);
			}
		});
	});

	describe('tokenizer methods', () => {
		it('peek() returns next token without advancing', () => {
			const tokenizer = new PatternTokenizer('x + y');

			const first = tokenizer.peek();
			const second = tokenizer.peek();

			expect(first.type).toBe('WILDCARD');
			expect(second.type).toBe('WILDCARD');
			expect(first).toEqual(second);
		});

		it('nextToken() advances position', () => {
			const tokenizer = new PatternTokenizer('x + y');

			const first = tokenizer.nextToken();
			const second = tokenizer.nextToken();

			expect(first.type).toBe('WILDCARD');
			expect(second.type).toBe('PLUS');
		});

		it('reset() returns to beginning', () => {
			const tokenizer = new PatternTokenizer('x + y');

			tokenizer.nextToken();
			tokenizer.nextToken();
			tokenizer.reset();

			expect(tokenizer.peek().type).toBe('WILDCARD');
		});

		it('handles whitespace correctly', () => {
			const tokens = tokenizePattern('  x   +   y  ');

			expect(tokens[0].type).toBe('WILDCARD');
			expect(tokens[1].type).toBe('PLUS');
			expect(tokens[2].type).toBe('WILDCARD');
		});
	});

	describe('complex tokenization', () => {
		it('tokenizes expression with wildcards and operators', () => {
			const tokens = tokenizePattern('x + y * z');

			expect(tokens.map((t) => t.type)).toEqual([
				'WILDCARD',
				'PLUS',
				'WILDCARD',
				'STAR',
				'WILDCARD',
				'EOF'
			]);
		});

		it('tokenizes function with wildcard argument', () => {
			const tokens = tokenizePattern('sin(x)');

			expect(tokens.map((t) => t.type)).toEqual(['FUNC', 'LPAREN', 'WILDCARD', 'RPAREN', 'EOF']);
		});

		it('tokenizes expression with constrained wildcard', () => {
			const tokens = tokenizePattern('n:number + 0');

			expect(tokens[0].type).toBe('WILDCARD');
			expect(tokens[0].constraintName).toBe('number');
			expect(tokens[1].type).toBe('PLUS');
			expect(tokens[2].type).toBe('NUMBER');
		});
	});
});

// =============================================================================
// Pattern Parser Tests
// =============================================================================

describe('Pattern Parser', () => {
	// =========================================================================
	// Wildcard Parsing
	// =========================================================================

	describe('wildcards', () => {
		it('parses _x as P._(x)', () => {
			const result = parsePattern('x');
			const expected = P._('x');

			expect(result).toEqual(expected);
		});

		it('parses _foo as P._(foo)', () => {
			const result = parsePattern('foo');
			const expected = P._('foo');

			expect(result).toEqual(expected);
		});

		it('parses _n:number as P._(n, P.isNumber())', () => {
			const result = parsePattern('n:number');
			const expected = P._('n', P.isNumber());

			expect(result).toEqual(expected);
		});

		it('parses _x:integer as P._(x, P.isInteger())', () => {
			const result = parsePattern('x:integer');
			const expected = P._('x', P.isInteger());

			expect(result).toEqual(expected);
		});

		it('parses _x:positive as P._(x, P.isPositive())', () => {
			const result = parsePattern('x:positive');
			const expected = P._('x', P.isPositive());

			expect(result).toEqual(expected);
		});

		it('parses _x:negative as P._(x, P.isNegative())', () => {
			const result = parsePattern('x:negative');
			const expected = P._('x', P.isNegative());

			expect(result).toEqual(expected);
		});

		it('parses _x:nonzero as P._(x, P.isNonzero())', () => {
			const result = parsePattern('x:nonzero');
			const expected = P._('x', P.isNonzero());

			expect(result).toEqual(expected);
		});

		it('parses _x:variable as P._(x, P.isVariable())', () => {
			const result = parsePattern('x:variable');
			const expected = P._('x', P.isVariable());

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// New Syntax (no underscore required)
	// =========================================================================

	describe('new syntax without underscore', () => {
		it('parses x as P._(x) - letters are wildcards by default', () => {
			const result = parsePattern('x');
			expect(result).toEqual(P._('x'));
		});

		it('parses x + y as P.add(P._(x), P._(y))', () => {
			const result = parsePattern('x + y');
			expect(result).toEqual(P.add(P._('x'), P._('y')));
		});

		it('parses n:number as P._(n, P.isNumber())', () => {
			const result = parsePattern('n:number');
			expect(result).toEqual(P._('n', P.isNumber()));
		});

		it('parses multi-letter wildcard', () => {
			const result = parsePattern('coeff');
			expect(result).toEqual(P._('coeff'));
		});

		it('parses coeff:number * x as expected', () => {
			const result = parsePattern('coeff:number * x');
			expect(result).toEqual(P.mul(P._('coeff', P.isNumber()), P._('x')));
		});
	});

	// =========================================================================
	// Sequence Wildcards
	// =========================================================================

	describe('sequence wildcards', () => {
		it('parses __rest as P.__(rest) - sequence (1+ elements)', () => {
			const result = parsePattern('__rest');
			expect(result).toEqual(P.__('rest'));
		});

		it('parses ___opt as P.___(opt) - optional sequence (0+ elements)', () => {
			const result = parsePattern('___opt');
			expect(result).toEqual(P.___('opt'));
		});

		it('parses __vars:variable with constraint', () => {
			const result = parsePattern('__vars:variable');
			expect(result).toEqual(P.__('vars', P.isVariable()));
		});

		it('parses a + __rest as expected', () => {
			const result = parsePattern('a + __rest');
			expect(result).toEqual(P.add(P._('a'), P.__('rest')));
		});
	});

	// =========================================================================
	// Binary Operators
	// =========================================================================

	describe('binary operators', () => {
		it('parses _x + _y as P.add(P._(x), P._(y))', () => {
			const result = parsePattern('x + y');
			const expected = P.add(P._('x'), P._('y'));

			expect(result).toEqual(expected);
		});

		it('parses _x - _y as P.sub(P._(x), P._(y))', () => {
			const result = parsePattern('x - y');
			const expected = P.sub(P._('x'), P._('y'));

			expect(result).toEqual(expected);
		});

		it('parses _x * _y as P.mul(P._(x), P._(y))', () => {
			const result = parsePattern('x * y');
			const expected = P.mul(P._('x'), P._('y'));

			expect(result).toEqual(expected);
		});

		it('parses _x / _y as P.div(P._(x), P._(y))', () => {
			const result = parsePattern('x / y');
			const expected = P.div(P._('x'), P._('y'));

			expect(result).toEqual(expected);
		});

		it('parses _x ^ _y as P.pow(P._(x), P._(y))', () => {
			const result = parsePattern('x ^ y');
			const expected = P.pow(P._('x'), P._('y'));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Unary Operators
	// =========================================================================

	describe('unary operators', () => {
		it('parses -x as P.neg(P._(x))', () => {
			const result = parsePattern('-x');
			const expected = P.neg(P._('x'));

			expect(result).toEqual(expected);
		});

		it('parses --x as P.neg(P.neg(P._(x)))', () => {
			const result = parsePattern('--x');
			const expected = P.neg(P.neg(P._('x')));

			expect(result).toEqual(expected);
		});

		it('parses -(x + y) as P.neg(P.paren(P.add(...)))', () => {
			const result = parsePattern('-(x + y)');
			const expected = P.neg(P.paren(P.add(P._('x'), P._('y'))));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Operator Precedence
	// =========================================================================

	describe('operator precedence', () => {
		it('parses _a + _b * _c with correct precedence (mul binds tighter)', () => {
			const result = parsePattern('a + b * c');
			const expected = P.add(P._('a'), P.mul(P._('b'), P._('c')));

			expect(result).toEqual(expected);
		});

		it('parses _a * _b + _c with correct precedence', () => {
			const result = parsePattern('a * b + c');
			const expected = P.add(P.mul(P._('a'), P._('b')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a - _b - _c as left-associative', () => {
			const result = parsePattern('a - b - c');
			const expected = P.sub(P.sub(P._('a'), P._('b')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a ^ _b ^ _c as right-associative', () => {
			const result = parsePattern('a ^ b ^ c');
			const expected = P.pow(P._('a'), P.pow(P._('b'), P._('c')));

			expect(result).toEqual(expected);
		});

		it('parses _a / _b / _c as left-associative', () => {
			const result = parsePattern('a / b / c');
			const expected = P.div(P.div(P._('a'), P._('b')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a + _b - _c as left-associative', () => {
			const result = parsePattern('a + b - c');
			const expected = P.sub(P.add(P._('a'), P._('b')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a * _b / _c with division having higher precedence', () => {
			// Division has BP.FRACTION (25) > BP.MULTIPLY (20)
			const result = parsePattern('a * b / c');
			const expected = P.mul(P._('a'), P.div(P._('b'), P._('c')));

			expect(result).toEqual(expected);
		});

		it('parses -x ^ y with power binding tighter than unary minus', () => {
			const result = parsePattern('-x ^ y');
			const expected = P.neg(P.pow(P._('x'), P._('y')));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Parentheses
	// =========================================================================

	describe('parentheses', () => {
		it('parses (x) as P.paren(P._(x))', () => {
			const result = parsePattern('(x)');
			const expected = P.paren(P._('x'));

			expect(result).toEqual(expected);
		});

		it('parses (a + b) * c with parentheses overriding precedence', () => {
			const result = parsePattern('(a + b) * c');
			const expected = P.mul(P.paren(P.add(P._('a'), P._('b'))), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a * (_b + _c)', () => {
			const result = parsePattern('a * (b + c)');
			const expected = P.mul(P._('a'), P.paren(P.add(P._('b'), P._('c'))));

			expect(result).toEqual(expected);
		});

		it('parses nested parentheses ((x))', () => {
			const result = parsePattern('((x))');
			const expected = P.paren(P.paren(P._('x')));

			expect(result).toEqual(expected);
		});

		it('parses (a + b) ^ c', () => {
			const result = parsePattern('(a + b) ^ c');
			const expected = P.pow(P.paren(P.add(P._('a'), P._('b'))), P._('c'));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Literals
	// =========================================================================

	describe('literals', () => {
		it('parses _x + 0 with number literal', () => {
			const result = parsePattern('x + 0');
			const expected = P.add(P._('x'), P.num(0));

			expect(result).toEqual(expected);
		});

		it('parses _x + 1 with number literal', () => {
			const result = parsePattern('x + 1');
			const expected = P.add(P._('x'), P.num(1));

			expect(result).toEqual(expected);
		});

		it('parses _x * 42 with number literal', () => {
			const result = parsePattern('x * 42');
			const expected = P.mul(P._('x'), P.num(42));

			expect(result).toEqual(expected);
		});

		it('parses x as P._(x) (letters are wildcards by default)', () => {
			const result = parsePattern('x');
			const expected = P._('x');

			expect(result).toEqual(expected);
		});

		it('parses $x as P.var(x) (literal variable with $ prefix)', () => {
			const result = parsePattern('$x');
			const expected = P.var('x');

			expect(result).toEqual(expected);
		});

		it('parses a + $x with mixed wildcard and literal variable', () => {
			const result = parsePattern('a + $x');
			const expected = P.add(P._('a'), P.var('x'));

			expect(result).toEqual(expected);
		});

		it('parses decimal numbers', () => {
			const result = parsePattern('x + 3.14');
			const expected = P.add(P._('x'), P.num(3.14));

			expect(result).toEqual(expected);
		});

		it('parses expression with literal variable using $ prefix', () => {
			const result = parsePattern('$x + 1');
			const expected = P.add(P.var('x'), P.num(1));

			expect(result).toEqual(expected);
		});

		it('parses expression with wildcards (letters are wildcards)', () => {
			const result = parsePattern('x + 1');
			const expected = P.add(P._('x'), P.num(1));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Functions
	// =========================================================================

	describe('functions', () => {
		it('parses sin(x) as P.func(sin, [P._(x)])', () => {
			const result = parsePattern('sin(x)');
			const expected = P.func('sin', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses cos(x) as P.func(cos, [P._(x)])', () => {
			const result = parsePattern('cos(x)');
			const expected = P.func('cos', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses tan(x)', () => {
			const result = parsePattern('tan(x)');
			const expected = P.func('tan', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses sqrt(x) as P.func(sqrt, [P._(x)])', () => {
			const result = parsePattern('sqrt(x)');
			const expected = P.func('sqrt', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses ln(x)', () => {
			const result = parsePattern('ln(x)');
			const expected = P.func('ln', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses exp(x)', () => {
			const result = parsePattern('exp(x)');
			const expected = P.func('exp', [P._('x')]);

			expect(result).toEqual(expected);
		});

		it('parses log(x, b) with multiple arguments', () => {
			const result = parsePattern('log(x, b)');
			const expected = P.func('log', [P._('x'), P._('b')]);

			expect(result).toEqual(expected);
		});

		it('parses function with expression argument', () => {
			const result = parsePattern('sin(x + y)');
			const expected = P.func('sin', [P.add(P._('x'), P._('y'))]);

			expect(result).toEqual(expected);
		});

		it('parses nested functions', () => {
			const result = parsePattern('sin(cos(x))');
			const expected = P.func('sin', [P.func('cos', [P._('x')])]);

			expect(result).toEqual(expected);
		});

		it('parses function in expression', () => {
			const result = parsePattern('sin(x) + cos(x)');
			const expected = P.add(P.func('sin', [P._('x')]), P.func('cos', [P._('x')]));

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Complex Expressions
	// =========================================================================

	describe('complex expressions', () => {
		it('parses _n:number * _x + _c (linear expression)', () => {
			const result = parsePattern('n:number * x + c');
			const expected = P.add(P.mul(P._('n', P.isNumber()), P._('x')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _a * _x^2 + _b * _x + _c (quadratic form)', () => {
			const result = parsePattern('a * x^2 + b * x + c');
			const expected = P.add(
				P.add(P.mul(P._('a'), P.pow(P._('x'), P.num(2))), P.mul(P._('b'), P._('x'))),
				P._('c')
			);

			expect(result).toEqual(expected);
		});

		it('parses sin(x)^2 + cos(x)^2 (trig identity)', () => {
			const result = parsePattern('sin(x)^2 + cos(x)^2');
			const expected = P.add(
				P.pow(P.func('sin', [P._('x')]), P.num(2)),
				P.pow(P.func('cos', [P._('x')]), P.num(2))
			);

			expect(result).toEqual(expected);
		});

		it('parses _a / _b + _c / _d', () => {
			const result = parsePattern('a / b + c / d');
			const expected = P.add(P.div(P._('a'), P._('b')), P.div(P._('c'), P._('d')));

			expect(result).toEqual(expected);
		});

		it('parses (a + b) * (c + d)', () => {
			const result = parsePattern('(a + b) * (c + d)');
			const expected = P.mul(
				P.paren(P.add(P._('a'), P._('b'))),
				P.paren(P.add(P._('c'), P._('d')))
			);

			expect(result).toEqual(expected);
		});

		it('parses -a * b + c', () => {
			const result = parsePattern('-a * b + c');
			const expected = P.add(P.mul(P.neg(P._('a')), P._('b')), P._('c'));

			expect(result).toEqual(expected);
		});

		it('parses _x^_y^_z (nested power, right-assoc)', () => {
			const result = parsePattern('x^y^z');
			const expected = P.pow(P._('x'), P.pow(P._('y'), P._('z')));

			expect(result).toEqual(expected);
		});

		it('parses sqrt(x^2 + y^2) (distance formula)', () => {
			const result = parsePattern('sqrt(x^2 + y^2)');
			const expected = P.func('sqrt', [
				P.add(P.pow(P._('x'), P.num(2)), P.pow(P._('y'), P.num(2)))
			]);

			expect(result).toEqual(expected);
		});
	});

	// =========================================================================
	// Error Cases
	// =========================================================================

	describe('error cases', () => {
		it('throws PatternParseError for empty input', () => {
			expect(() => parsePattern('')).toThrow(PatternParseError);
			expect(() => parsePattern('')).toThrow('Empty input');
		});

		it('throws PatternParseError for whitespace-only input', () => {
			expect(() => parsePattern('   ')).toThrow(PatternParseError);
			expect(() => parsePattern('   ')).toThrow('Empty input');
		});

		it('throws error for incomplete expression: _x +', () => {
			expect(() => parsePattern('x +')).toThrow(PatternParseError);
		});

		it('throws error for incomplete expression: _x *', () => {
			expect(() => parsePattern('x *')).toThrow(PatternParseError);
		});

		it('throws error for missing closing parenthesis', () => {
			expect(() => parsePattern('(x + y')).toThrow(PatternParseError);
			expect(() => parsePattern('(x + y')).toThrow("Expected ')'");
		});

		it('throws error for empty parentheses', () => {
			expect(() => parsePattern('()')).toThrow(PatternParseError);
			expect(() => parsePattern('()')).toThrow('Empty parentheses');
		});

		it('parses function name without parentheses as wildcard', () => {
			// 'sin' without () is just a wildcard named 'sin'
			const result = parsePattern('sin');
			expect(result).toEqual(P._('sin'));
		});

		it('throws error for missing function closing paren', () => {
			expect(() => parsePattern('sin(x')).toThrow(PatternParseError);
			expect(() => parsePattern('sin(x')).toThrow("Expected ')'");
		});

		it('throws error for unexpected token at start', () => {
			expect(() => parsePattern('+ x')).toThrow(PatternParseError);
		});

		it('throws error for double operator', () => {
			expect(() => parsePattern('x ++ y')).toThrow(PatternParseError);
		});

		it('throws error for consecutive operators', () => {
			// Consecutive operators without operand are invalid
			expect(() => parsePattern('x + *')).toThrow(PatternParseError);
			expect(() => parsePattern('x + /')).toThrow(PatternParseError);
		});

		it('throws error for mismatched parentheses', () => {
			expect(() => parsePattern('(x))')).toThrow(PatternParseError);
		});

		describe('PatternParseError properties', () => {
			it('includes position information', () => {
				try {
					parsePattern('');
				} catch (e) {
					expect(e).toBeInstanceOf(PatternParseError);
					if (e instanceof PatternParseError) {
						expect(typeof e.position).toBe('number');
						expect(typeof e.length).toBe('number');
					}
				}
			});
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles multiple wildcards with same name', () => {
			const result = parsePattern('x + x');
			const expected = P.add(P._('x'), P._('x'));

			expect(result).toEqual(expected);
		});

		it('handles long wildcard names', () => {
			const result = parsePattern('verylongwildcardname');
			const expected = P._('verylongwildcardname');

			expect(result).toEqual(expected);
		});

		it('handles expression with many operators', () => {
			const result = parsePattern('a + b - c * d / e ^ f');
			// Precedence: ^ > / > * > +,-
			const expected = P.sub(
				P.add(P._('a'), P._('b')),
				P.mul(P._('c'), P.div(P._('d'), P.pow(P._('e'), P._('f'))))
			);

			expect(result).toEqual(expected);
		});

		it('handles deeply nested parentheses', () => {
			const result = parsePattern('(((x)))');
			const expected = P.paren(P.paren(P.paren(P._('x'))));

			expect(result).toEqual(expected);
		});

		it('handles function with no arguments as error', () => {
			// According to parser, empty function args are allowed
			const result = parsePattern('sin()');
			const expected = P.func('sin', []);

			expect(result).toEqual(expected);
		});

		it('handles constrained wildcard in complex expression', () => {
			const result = parsePattern('a:positive * b:negative');
			const expected = P.mul(P._('a', P.isPositive()), P._('b', P.isNegative()));

			expect(result).toEqual(expected);
		});

		it('handles negative literal in expression', () => {
			const result = parsePattern('x + -1');
			const expected = P.add(P._('x'), P.neg(P.num(1)));

			expect(result).toEqual(expected);
		});

		it('parses consecutive letters as a single multi-letter wildcard', () => {
			// 'xy' becomes a single wildcard named 'xy'
			// This allows wildcards like 'coeff', 'rest', 'base', etc.
			const result = parsePattern('xy');
			expect(result).toEqual(P._('xy'));
		});

		it('parses multi-letter wildcard with constraint', () => {
			const result = parsePattern('coeff:number');
			expect(result).toEqual(P._('coeff', P.isNumber()));
		});

		it('handles power with number exponent', () => {
			const result = parsePattern('x^2');
			const expected = P.pow(P._('x'), P.num(2));

			expect(result).toEqual(expected);
		});

		it('handles function of function result', () => {
			const result = parsePattern('sqrt(sin(x))');
			const expected = P.func('sqrt', [P.func('sin', [P._('x')])]);

			expect(result).toEqual(expected);
		});
	});
});
