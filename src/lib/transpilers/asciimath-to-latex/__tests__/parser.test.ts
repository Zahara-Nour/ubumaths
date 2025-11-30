/**
 * Tests for the ASCIIMath parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../tokenizer.js';
import { Parser, ParseError } from '../parser.js';
import type { ASTNode } from '../types.js';

/**
 * Helper function to parse ASCIIMath expression
 */
function parse(input: string): ASTNode {
	const tokenizer = new Tokenizer(input);
	const tokens = tokenizer.tokenize();
	const parser = new Parser(tokens);
	return parser.parse();
}

/**
 * Helper function to test parsing errors
 */
function expectParseError(input: string, expectedMessage?: string): void {
	expect(() => parse(input)).toThrow(ParseError);
	if (expectedMessage) {
		try {
			parse(input);
		} catch (error) {
			expect(error).toBeInstanceOf(ParseError);
			expect((error as ParseError).message).toContain(expectedMessage);
		}
	}
}

describe('Parser - Atoms', () => {
	describe('Numbers', () => {
		it('should parse integer', () => {
			const ast = parse('42');
			expect(ast).toMatchObject({
				type: 'Number',
				value: '42'
			});
		});

		it('should parse decimal', () => {
			const ast = parse('3.14');
			expect(ast).toMatchObject({
				type: 'Number',
				value: '3.14'
			});
		});

		it('should parse zero', () => {
			const ast = parse('0');
			expect(ast).toMatchObject({
				type: 'Number',
				value: '0'
			});
		});
	});

	describe('Identifiers', () => {
		it('should parse single letter identifier', () => {
			const ast = parse('x');
			expect(ast).toMatchObject({
				type: 'Identifier',
				name: 'x'
			});
		});

		it('should parse multi-letter identifier', () => {
			const ast = parse('abc');
			expect(ast).toMatchObject({
				type: 'Identifier',
				name: 'abc'
			});
		});

		it('should parse identifier with numbers', () => {
			const ast = parse('x1');
			expect(ast).toMatchObject({
				type: 'Identifier',
				name: 'x1'
			});
		});
	});

	describe('Greek letters', () => {
		it('should parse lowercase greek', () => {
			const ast = parse('alpha');
			expect(ast).toMatchObject({
				type: 'Greek',
				name: 'alpha'
			});
		});

		it('should parse uppercase greek', () => {
			const ast = parse('Delta');
			expect(ast).toMatchObject({
				type: 'Greek',
				name: 'Delta'
			});
		});

		it('should parse pi', () => {
			const ast = parse('pi');
			expect(ast).toMatchObject({
				type: 'Greek',
				name: 'pi'
			});
		});
	});

	describe('Symbols', () => {
		it('should parse infinity', () => {
			const ast = parse('oo');
			expect(ast).toMatchObject({
				type: 'Symbol',
				name: 'oo'
			});
		});

		it('should parse multiplication symbol', () => {
			const ast = parse('times');
			expect(ast).toMatchObject({
				type: 'Symbol',
				name: 'times'
			});
		});

		it('should parse cdot', () => {
			const ast = parse('cdot');
			expect(ast).toMatchObject({
				type: 'Symbol',
				name: 'cdot'
			});
		});

		it('should parse asterisk as symbol', () => {
			const ast = parse('*');
			expect(ast).toMatchObject({
				type: 'Symbol',
				name: '*'
			});
		});
	});

	describe('Templates', () => {
		it('should parse simple template', () => {
			const ast = parse('{{x}}');
			expect(ast).toMatchObject({
				type: 'Template',
				content: 'x'
			});
		});

		it('should parse template with expression', () => {
			const ast = parse('{{2*x+1}}');
			expect(ast).toMatchObject({
				type: 'Template',
				content: '2*x+1'
			});
		});

		it('should parse template with nested braces', () => {
			const ast = parse('{{func({a, b})}}');
			expect(ast).toMatchObject({
				type: 'Template',
				content: 'func({a, b})'
			});
		});
	});
});

describe('Parser - Groups', () => {
	describe('Parentheses', () => {
		it('should parse simple parentheses', () => {
			const ast = parse('(x)');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '(',
				expression: {
					type: 'Identifier',
					name: 'x'
				}
			});
		});

		it('should parse parentheses with expression', () => {
			const ast = parse('(x+y)');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '(',
				expression: {
					type: 'BinaryOp',
					operator: '+',
					left: { type: 'Identifier', name: 'x' },
					right: { type: 'Identifier', name: 'y' }
				}
			});
		});

		it('should parse nested parentheses', () => {
			const ast = parse('((x))');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '(',
				expression: {
					type: 'Paren',
					bracket: '(',
					expression: {
						type: 'Identifier',
						name: 'x'
					}
				}
			});
		});
	});

	describe('Brackets', () => {
		it('should parse simple brackets', () => {
			const ast = parse('[x]');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '[',
				expression: {
					type: 'Identifier',
					name: 'x'
				}
			});
		});

		it('should parse brackets with addition (intervals need different notation)', () => {
			const ast = parse('[a+b]');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '[',
				expression: {
					type: 'BinaryOp',
					operator: '+'
				}
			});
		});
	});

	describe('Braces', () => {
		it('should parse simple braces', () => {
			const ast = parse('{x}');
			expect(ast).toMatchObject({
				type: 'Group',
				expression: {
					type: 'Identifier',
					name: 'x'
				}
			});
		});

		it('should parse braces with expression', () => {
			const ast = parse('{x+y}');
			expect(ast).toMatchObject({
				type: 'Group',
				expression: {
					type: 'BinaryOp',
					operator: '+',
					left: { type: 'Identifier', name: 'x' },
					right: { type: 'Identifier', name: 'y' }
				}
			});
		});
	});

	describe('Nested groups', () => {
		it('should parse nested mixed groups', () => {
			const ast = parse('({[x]})');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '(',
				expression: {
					type: 'Group',
					expression: {
						type: 'Paren',
						bracket: '[',
						expression: {
							type: 'Identifier',
							name: 'x'
						}
					}
				}
			});
		});

		it('should parse multiple nested parentheses', () => {
			const ast = parse('(((x+y)))');
			expect(ast.type).toBe('Paren');
		});
	});

	describe('Unclosed groups', () => {
		it('should error on unclosed parenthesis', () => {
			expectParseError('(x', 'Expected )');
		});

		it('should error on unclosed bracket', () => {
			expectParseError('[x', 'Expected ]');
		});

		it('should error on unclosed brace', () => {
			expectParseError('{x', 'Expected }');
		});

		it('should error on mismatched delimiters', () => {
			expectParseError('(x]', 'Expected )');
		});
	});
});

describe('Parser - Absolute Value', () => {
	it('should parse simple absolute value', () => {
		const ast = parse('|x|');
		expect(ast).toMatchObject({
			type: 'Abs',
			expression: {
				type: 'Identifier',
				name: 'x'
			}
		});
	});

	it('should parse absolute value with expression', () => {
		const ast = parse('|x+y|');
		expect(ast).toMatchObject({
			type: 'Abs',
			expression: {
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'x' },
				right: { type: 'Identifier', name: 'y' }
			}
		});
	});

	it('should parse absolute value with negative', () => {
		const ast = parse('|-x|');
		expect(ast).toMatchObject({
			type: 'Abs',
			expression: {
				type: 'UnaryOp',
				operator: '-',
				operand: { type: 'Identifier', name: 'x' }
			}
		});
	});

	it('should parse nested absolute values', () => {
		const ast = parse('||x||');
		expect(ast).toMatchObject({
			type: 'Abs',
			expression: {
				type: 'Abs',
				expression: {
					type: 'Identifier',
					name: 'x'
				}
			}
		});
	});

	it('should error on unclosed absolute value', () => {
		expectParseError('|x', 'Expected closing |');
	});
});

describe('Parser - Functions', () => {
	describe('Standard functions', () => {
		it('should parse sqrt', () => {
			const ast = parse('sqrt(x)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'sqrt',
				argument: {
					type: 'Identifier',
					name: 'x'
				}
			});
		});

		it('should parse sin', () => {
			const ast = parse('sin(x)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'sin',
				argument: { type: 'Identifier', name: 'x' }
			});
		});

		it('should parse cos', () => {
			const ast = parse('cos(theta)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'cos',
				argument: { type: 'Greek', name: 'theta' }
			});
		});

		it('should parse tan', () => {
			const ast = parse('tan(pi/4)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'tan'
			});
		});

		it('should parse log', () => {
			const ast = parse('log(100)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'log',
				argument: { type: 'Number', value: '100' }
			});
		});

		it('should parse ln', () => {
			const ast = parse('ln(e)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'ln'
			});
		});

		it('should parse exp', () => {
			const ast = parse('exp(x)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'exp'
			});
		});

		it('should parse abs as function', () => {
			const ast = parse('abs(x)');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'abs',
				argument: { type: 'Identifier', name: 'x' }
			});
		});
	});

	describe('Root function', () => {
		it('should parse square root using root', () => {
			const ast = parse('root(2)(x)');
			expect(ast).toMatchObject({
				type: 'Root',
				index: { type: 'Number', value: '2' },
				radicand: { type: 'Identifier', name: 'x' }
			});
		});

		it('should parse cube root', () => {
			const ast = parse('root(3)(27)');
			expect(ast).toMatchObject({
				type: 'Root',
				index: { type: 'Number', value: '3' },
				radicand: { type: 'Number', value: '27' }
			});
		});

		it('should parse nth root with expression', () => {
			const ast = parse('root(n)(x+y)');
			expect(ast).toMatchObject({
				type: 'Root',
				index: { type: 'Identifier', name: 'n' },
				radicand: {
					type: 'BinaryOp',
					operator: '+',
					left: { type: 'Identifier', name: 'x' },
					right: { type: 'Identifier', name: 'y' }
				}
			});
		});
	});

	describe('Function errors', () => {
		it('should error on missing opening parenthesis', () => {
			expectParseError('sqrt x)', "Expected '(' after sqrt");
		});

		it('should error on missing closing parenthesis', () => {
			expectParseError('sqrt(x', "Expected ')' after function argument");
		});

		it('should error on root missing second parenthesis group', () => {
			expectParseError('root(2)', "Expected second '(' after root index");
		});
	});

	describe('Nested functions', () => {
		it('should parse nested function calls', () => {
			const ast = parse('sqrt(sqrt(x))');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'sqrt',
				argument: {
					type: 'Function',
					name: 'sqrt',
					argument: { type: 'Identifier', name: 'x' }
				}
			});
		});

		it('should parse sin of sqrt', () => {
			const ast = parse('sin(sqrt(x))');
			expect(ast).toMatchObject({
				type: 'Function',
				name: 'sin',
				argument: {
					type: 'Function',
					name: 'sqrt'
				}
			});
		});
	});
});

describe('Parser - Binary Operators', () => {
	describe('Addition', () => {
		it('should parse addition', () => {
			const ast = parse('x+y');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'x' },
				right: { type: 'Identifier', name: 'y' }
			});
		});

		it('should parse multiple additions (left-associative)', () => {
			const ast = parse('a+b+c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '+',
				left: {
					type: 'BinaryOp',
					operator: '+',
					left: { type: 'Identifier', name: 'a' },
					right: { type: 'Identifier', name: 'b' }
				},
				right: { type: 'Identifier', name: 'c' }
			});
		});
	});

	describe('Subtraction', () => {
		it('should parse subtraction', () => {
			const ast = parse('x-y');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '-',
				left: { type: 'Identifier', name: 'x' },
				right: { type: 'Identifier', name: 'y' }
			});
		});

		it('should parse multiple subtractions (left-associative)', () => {
			const ast = parse('a-b-c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '-',
				left: {
					type: 'BinaryOp',
					operator: '-',
					left: { type: 'Identifier', name: 'a' },
					right: { type: 'Identifier', name: 'b' }
				},
				right: { type: 'Identifier', name: 'c' }
			});
		});

		it('should parse mixed addition and subtraction', () => {
			const ast = parse('a+b-c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '-',
				left: {
					type: 'BinaryOp',
					operator: '+',
					left: { type: 'Identifier', name: 'a' },
					right: { type: 'Identifier', name: 'b' }
				},
				right: { type: 'Identifier', name: 'c' }
			});
		});
	});

	describe('Multiplication', () => {
		it('should parse multiplication with *', () => {
			const ast = parse('x*y');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '*',
				left: { type: 'Identifier', name: 'x' },
				right: { type: 'Identifier', name: 'y' }
			});
		});

		it('should parse multiplication with :', () => {
			const ast = parse('2:3');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: ':',
				left: { type: 'Number', value: '2' },
				right: { type: 'Number', value: '3' }
			});
		});

		it('should parse multiple multiplications', () => {
			const ast = parse('a*b*c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '*',
				left: {
					type: 'BinaryOp',
					operator: '*',
					left: { type: 'Identifier', name: 'a' },
					right: { type: 'Identifier', name: 'b' }
				},
				right: { type: 'Identifier', name: 'c' }
			});
		});
	});

	describe('Operator precedence', () => {
		it('should give multiplication higher precedence than addition', () => {
			const ast = parse('a+b*c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'a' },
				right: {
					type: 'BinaryOp',
					operator: '*',
					left: { type: 'Identifier', name: 'b' },
					right: { type: 'Identifier', name: 'c' }
				}
			});
		});

		it('should give multiplication higher precedence than subtraction', () => {
			const ast = parse('a-b*c');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '-',
				left: { type: 'Identifier', name: 'a' },
				right: {
					type: 'BinaryOp',
					operator: '*'
				}
			});
		});

		it('should parse complex precedence', () => {
			const ast = parse('a+b*c-d:e');
			expect(ast.type).toBe('BinaryOp');
		});
	});
});

describe('Parser - Fractions', () => {
	it('should parse simple fraction', () => {
		const ast = parse('x/y');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: { type: 'Identifier', name: 'x' },
			denominator: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse number fraction', () => {
		const ast = parse('1/2');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: { type: 'Number', value: '1' },
			denominator: { type: 'Number', value: '2' }
		});
	});

	it('should parse left-associative fractions: a/b/c = (a/b)/c', () => {
		const ast = parse('a/b/c');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: {
				type: 'Fraction',
				numerator: { type: 'Identifier', name: 'a' },
				denominator: { type: 'Identifier', name: 'b' }
			},
			denominator: { type: 'Identifier', name: 'c' }
		});
	});

	it('should parse fraction with expression in numerator', () => {
		const ast = parse('(x+y)/z');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: {
				type: 'Paren',
				expression: {
					type: 'BinaryOp',
					operator: '+'
				}
			},
			denominator: { type: 'Identifier', name: 'z' }
		});
	});

	it('should parse fraction with expression in denominator', () => {
		const ast = parse('x/(y+z)');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: { type: 'Identifier', name: 'x' },
			denominator: {
				type: 'Paren',
				expression: {
					type: 'BinaryOp',
					operator: '+'
				}
			}
		});
	});

	it('should give fraction higher precedence than addition', () => {
		const ast = parse('a+b/c');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+',
			left: { type: 'Identifier', name: 'a' },
			right: {
				type: 'Fraction',
				numerator: { type: 'Identifier', name: 'b' },
				denominator: { type: 'Identifier', name: 'c' }
			}
		});
	});

	it('should give fraction lower precedence than power', () => {
		const ast = parse('x^2/y');
		expect(ast).toMatchObject({
			type: 'Fraction',
			numerator: {
				type: 'Superscript',
				base: { type: 'Identifier', name: 'x' },
				exponent: { type: 'Number', value: '2' }
			},
			denominator: { type: 'Identifier', name: 'y' }
		});
	});
});

describe('Parser - Power and Subscript', () => {
	describe('Superscript (^)', () => {
		it('should parse simple superscript', () => {
			const ast = parse('x^2');
			expect(ast).toMatchObject({
				type: 'Superscript',
				base: { type: 'Identifier', name: 'x' },
				exponent: { type: 'Number', value: '2' }
			});
		});

		it('should parse right-associative superscripts: x^2^3 = x^(2^3)', () => {
			const ast = parse('x^2^3');
			expect(ast).toMatchObject({
				type: 'Superscript',
				base: { type: 'Identifier', name: 'x' },
				exponent: {
					type: 'Superscript',
					base: { type: 'Number', value: '2' },
					exponent: { type: 'Number', value: '3' }
				}
			});
		});

		it('should parse superscript with expression', () => {
			const ast = parse('x^{n+1}');
			expect(ast).toMatchObject({
				type: 'Superscript',
				base: { type: 'Identifier', name: 'x' },
				exponent: {
					type: 'Group',
					expression: {
						type: 'BinaryOp',
						operator: '+'
					}
				}
			});
		});
	});

	describe('Subscript (_)', () => {
		it('should parse simple subscript', () => {
			const ast = parse('x_i');
			expect(ast).toMatchObject({
				type: 'Subscript',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Identifier', name: 'i' }
			});
		});

		it('should parse right-associative subscripts', () => {
			const ast = parse('x_i_j');
			expect(ast).toMatchObject({
				type: 'Subscript',
				base: { type: 'Identifier', name: 'x' },
				subscript: {
					type: 'Subscript',
					base: { type: 'Identifier', name: 'i' },
					subscript: { type: 'Identifier', name: 'j' }
				}
			});
		});

		it('should parse subscript with number', () => {
			const ast = parse('x_1');
			expect(ast).toMatchObject({
				type: 'Subscript',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Number', value: '1' }
			});
		});
	});

	describe('Combined subscript and superscript', () => {
		it('should parse subscript then superscript: x_i^2', () => {
			const ast = parse('x_i^2');
			expect(ast).toMatchObject({
				type: 'SubSup',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Identifier', name: 'i' },
				superscript: { type: 'Number', value: '2' }
			});
		});

		it('should parse superscript then subscript: x^2_i', () => {
			const ast = parse('x^2_i');
			expect(ast).toMatchObject({
				type: 'SubSup',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Identifier', name: 'i' },
				superscript: { type: 'Number', value: '2' }
			});
		});

		it('should parse combined with expressions', () => {
			const ast = parse('x_{i+1}^{n-1}');
			expect(ast).toMatchObject({
				type: 'SubSup',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Group' },
				superscript: { type: 'Group' }
			});
		});

		it('should parse triple superscripts with right-associativity: x^2^3^4 = x^(2^(3^4))', () => {
			const ast = parse('x^2^3^4');
			expect(ast).toMatchObject({
				type: 'Superscript',
				base: { type: 'Identifier', name: 'x' },
				exponent: {
					type: 'Superscript',
					base: { type: 'Number', value: '2' },
					exponent: {
						type: 'Superscript',
						base: { type: 'Number', value: '3' },
						exponent: { type: 'Number', value: '4' }
					}
				}
			});
		});

		it('should parse triple subscripts with right-associativity: x_i_j_k = x_(i_(j_k))', () => {
			const ast = parse('x_i_j_k');
			expect(ast).toMatchObject({
				type: 'Subscript',
				base: { type: 'Identifier', name: 'x' },
				subscript: {
					type: 'Subscript',
					base: { type: 'Identifier', name: 'i' },
					subscript: {
						type: 'Subscript',
						base: { type: 'Identifier', name: 'j' },
						subscript: { type: 'Identifier', name: 'k' }
					}
				}
			});
		});
	});

	describe('Power precedence', () => {
		it('should give power higher precedence than multiplication', () => {
			const ast = parse('x*y^2');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '*',
				left: { type: 'Identifier', name: 'x' },
				right: {
					type: 'Superscript',
					base: { type: 'Identifier', name: 'y' },
					exponent: { type: 'Number', value: '2' }
				}
			});
		});

		it('should give power higher precedence than addition', () => {
			const ast = parse('x+y^2');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'x' },
				right: {
					type: 'Superscript',
					base: { type: 'Identifier', name: 'y' },
					exponent: { type: 'Number', value: '2' }
				}
			});
		});
	});
});

describe('Parser - Relations', () => {
	it('should parse equality', () => {
		const ast = parse('x=y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '=',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse less than', () => {
		const ast = parse('x<y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '<',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse greater than', () => {
		const ast = parse('x>y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '>',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse less than or equal', () => {
		const ast = parse('x<=y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '<=',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse greater than or equal', () => {
		const ast = parse('x>=y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '>=',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse not equal', () => {
		const ast = parse('x!=y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '!=',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse approximately equal', () => {
		const ast = parse('x~~y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '~~',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse equivalent', () => {
		const ast = parse('x-=y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '-=',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse similar', () => {
		const ast = parse('x~y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '~',
			left: { type: 'Identifier', name: 'x' },
			right: { type: 'Identifier', name: 'y' }
		});
	});

	it('should parse proportional', () => {
		const ast = parse('y prop x');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: 'prop',
			left: { type: 'Identifier', name: 'y' },
			right: { type: 'Identifier', name: 'x' }
		});
	});

	it('should parse relation with expression', () => {
		const ast = parse('x+1=y-2');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '=',
			left: {
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'x' },
				right: { type: 'Number', value: '1' }
			},
			right: {
				type: 'BinaryOp',
				operator: '-',
				left: { type: 'Identifier', name: 'y' },
				right: { type: 'Number', value: '2' }
			}
		});
	});

	it('should parse chained relations', () => {
		const ast = parse('a<b<c');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '<',
			left: {
				type: 'BinaryOp',
				operator: '<',
				left: { type: 'Identifier', name: 'a' },
				right: { type: 'Identifier', name: 'b' }
			},
			right: { type: 'Identifier', name: 'c' }
		});
	});
});

describe('Parser - Unary Minus', () => {
	describe('Valid cases', () => {
		it('should parse unary minus at start', () => {
			const ast = parse('-x');
			expect(ast).toMatchObject({
				type: 'UnaryOp',
				operator: '-',
				operand: { type: 'Identifier', name: 'x' }
			});
		});

		it('should parse unary minus with number', () => {
			const ast = parse('-5');
			expect(ast).toMatchObject({
				type: 'UnaryOp',
				operator: '-',
				operand: { type: 'Number', value: '5' }
			});
		});

		it('should parse unary minus after opening paren', () => {
			const ast = parse('(-x)');
			expect(ast).toMatchObject({
				type: 'Paren',
				expression: {
					type: 'UnaryOp',
					operator: '-',
					operand: { type: 'Identifier', name: 'x' }
				}
			});
		});

		it('should parse unary minus after opening bracket', () => {
			const ast = parse('[-x]');
			expect(ast).toMatchObject({
				type: 'Paren',
				bracket: '[',
				expression: {
					type: 'UnaryOp',
					operator: '-',
					operand: { type: 'Identifier', name: 'x' }
				}
			});
		});

		it('should parse unary minus after opening brace', () => {
			const ast = parse('{-x}');
			expect(ast).toMatchObject({
				type: 'Group',
				expression: {
					type: 'UnaryOp',
					operator: '-',
					operand: { type: 'Identifier', name: 'x' }
				}
			});
		});

		it('should parse unary minus in absolute value', () => {
			const ast = parse('|-x|');
			expect(ast).toMatchObject({
				type: 'Abs',
				expression: {
					type: 'UnaryOp',
					operator: '-',
					operand: { type: 'Identifier', name: 'x' }
				}
			});
		});

		it('should parse expression with unary minus in addition', () => {
			const ast = parse('x+(-y)');
			expect(ast).toMatchObject({
				type: 'BinaryOp',
				operator: '+',
				left: { type: 'Identifier', name: 'x' },
				right: {
					type: 'Paren',
					expression: {
						type: 'UnaryOp',
						operator: '-',
						operand: { type: 'Identifier', name: 'y' }
					}
				}
			});
		});

		it('should parse double unary minus', () => {
			const ast = parse('(-(-x))');
			expect(ast).toMatchObject({
				type: 'Paren',
				expression: {
					type: 'UnaryOp',
					operator: '-',
					operand: {
						type: 'Paren',
						expression: {
							type: 'UnaryOp',
							operator: '-',
							operand: { type: 'Identifier', name: 'x' }
						}
					}
				}
			});
		});
	});

	describe('Invalid cases (should error)', () => {
		it('should error on unary minus after binary plus', () => {
			expectParseError('x+-y', 'Unexpected token');
		});

		it('should error on unary minus after binary minus', () => {
			expectParseError('x--y', 'Unexpected token');
		});

		it('should error on unary minus after multiplication', () => {
			expectParseError('x*-y', 'Unexpected token');
		});

		it('should error on unary minus after division', () => {
			expectParseError('x/-y', 'Unexpected token');
		});
	});
});

describe('Parser - Complex Expressions', () => {
	it('should parse quadratic formula', () => {
		const ast = parse('(-b+sqrt(b^2-4*a*c))/(2*a)');
		expect(ast.type).toBe('Fraction');
	});

	it('should parse trigonometric expression', () => {
		const ast = parse('sin(x)^2+cos(x)^2=1');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '='
		});
	});

	it('should parse nested fractions', () => {
		const ast = parse('1/(1+1/(1+1/x))');
		expect(ast.type).toBe('Fraction');
	});

	it('should parse sum with subscripts and superscripts', () => {
		const ast = parse('x_1^2+x_2^2');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+',
			left: {
				type: 'SubSup',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Number', value: '1' },
				superscript: { type: 'Number', value: '2' }
			},
			right: {
				type: 'SubSup',
				base: { type: 'Identifier', name: 'x' },
				subscript: { type: 'Number', value: '2' },
				superscript: { type: 'Number', value: '2' }
			}
		});
	});

	it('should parse Greek letters in expression', () => {
		const ast = parse('alpha+beta=gamma');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '='
		});
	});

	it('should parse expression with template', () => {
		const ast = parse('{{a}}*x+{{b}}');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+',
			left: {
				type: 'BinaryOp',
				operator: '*',
				left: { type: 'Template', content: 'a' },
				right: { type: 'Identifier', name: 'x' }
			},
			right: { type: 'Template', content: 'b' }
		});
	});

	it('should parse expression with identifiers and subscripts', () => {
		const ast = parse('x_1+x_2=0');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '='
		});
	});

	it('should parse nested brackets', () => {
		const ast = parse('[[a]]');
		expect(ast).toMatchObject({
			type: 'Paren',
			bracket: '[',
			expression: {
				type: 'Paren',
				bracket: '[',
				expression: {
					type: 'Identifier',
					name: 'a'
				}
			}
		});
	});
});

describe('Parser - Error Handling', () => {
	it('should error on empty input', () => {
		expectParseError('', 'Empty expression');
	});

	it('should error on whitespace only', () => {
		expectParseError('   ', 'Empty expression');
	});

	it('should error on unexpected closing paren', () => {
		expectParseError(')', 'Unexpected token');
	});

	it('should error on unexpected operator at start', () => {
		expectParseError('+x', 'Unexpected token');
	});

	it('should error on unexpected operator at end', () => {
		expectParseError('x+', 'Unexpected token');
	});

	it('should provide position information in errors', () => {
		try {
			parse('x+');
		} catch (error) {
			expect(error).toBeInstanceOf(ParseError);
			expect((error as ParseError).position).toBeGreaterThan(0);
		}
	});

	it('should provide token information in errors', () => {
		try {
			parse('(x');
		} catch (error) {
			expect(error).toBeInstanceOf(ParseError);
			expect((error as ParseError).token).toBeDefined();
		}
	});
});

describe('Parser - Edge Cases', () => {
	it('should handle whitespace between tokens', () => {
		const ast = parse('x + y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+'
		});
	});

	it('should handle multiple spaces', () => {
		const ast = parse('x    +    y');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+'
		});
	});

	it('should handle tabs and newlines', () => {
		const ast = parse('x\t+\ny');
		expect(ast).toMatchObject({
			type: 'BinaryOp',
			operator: '+'
		});
	});

	it('should parse single-character identifier', () => {
		const ast = parse('a');
		expect(ast).toMatchObject({
			type: 'Identifier',
			name: 'a'
		});
	});

	it('should parse very long identifier', () => {
		const ast = parse('variableName123');
		expect(ast).toMatchObject({
			type: 'Identifier',
			name: 'variableName123'
		});
	});

	it('should parse expression with all operator types', () => {
		const ast = parse('a+b-c*d:e/f^g_h');
		expect(ast.type).toBe('BinaryOp');
	});
});
