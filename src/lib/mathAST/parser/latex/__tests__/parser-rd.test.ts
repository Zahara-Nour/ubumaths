/**
 * Recursive Descent Parser Tests
 *
 * Comprehensive tests for the LaTeX to MathAST Recursive Descent parser including:
 * - Literal parsing (numbers, variables, greek letters, symbols)
 * - Binary operations with precedence
 * - Unary operations
 * - Fractions
 * - Functions with power/base
 * - Delimiters
 * - Relations
 * - Colors (nested)
 * - Units
 * - Implicit multiplication
 * - Error handling
 *
 * @module mathAST/parser/__tests__/parser-rd.test
 */

import { describe, it, expect } from 'vitest';
import { parseRD, parseRDSafe, ParseException } from '../parser-rd';
import type { MathNode } from '../../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to assert node type
 */
function expectType<T extends MathNode['type']>(
	node: MathNode,
	type: T
): asserts node is Extract<MathNode, { type: T }> {
	expect(node.type).toBe(type);
}

/**
 * Helper to parse and return node with type assertion
 */
function parse(input: string): MathNode {
	return parseRD(input);
}

// =============================================================================
// Literals
// =============================================================================

describe('Literals', () => {
	describe('Numbers', () => {
		it('should parse single digit integer', () => {
			const node = parse('5');
			expectType(node, 'number');
			expect(node.value).toBe('5');
		});

		it('should parse multi-digit integer', () => {
			const node = parse('42');
			expectType(node, 'number');
			expect(node.value).toBe('42');
		});

		it('should parse decimal number', () => {
			const node = parse('3.14');
			expectType(node, 'number');
			expect(node.value).toBe('3.14');
		});

		it('should parse decimal without leading zero', () => {
			const node = parse('.5');
			expectType(node, 'number');
			expect(node.value).toBe('.5');
		});

		it('should parse zero', () => {
			const node = parse('0');
			expectType(node, 'number');
			expect(node.value).toBe('0');
		});
	});

	describe('Variables', () => {
		it('should parse single letter variable', () => {
			const node = parse('x');
			expectType(node, 'variable');
			expect(node.name).toBe('x');
		});

		it('should parse uppercase variable', () => {
			const node = parse('X');
			expectType(node, 'variable');
			expect(node.name).toBe('X');
		});
	});

	describe('Greek letters', () => {
		it('should parse lowercase Greek', () => {
			const node = parse('\\alpha');
			expectType(node, 'greek');
			expect(node.letter).toBe('alpha');
		});

		it('should parse uppercase Greek', () => {
			const node = parse('\\Omega');
			expectType(node, 'greek');
			expect(node.letter).toBe('Omega');
		});

		it('should parse common Greek letters', () => {
			const letters = ['beta', 'gamma', 'delta', 'pi', 'theta', 'lambda', 'sigma'];
			for (const letter of letters) {
				const node = parse(`\\${letter}`);
				expectType(node, 'greek');
				expect(node.letter).toBe(letter);
			}
		});
	});

	describe('Symbols', () => {
		it('should parse infinity', () => {
			const node = parse('\\infty');
			expectType(node, 'symbol');
			expect(node.symbol).toBe('infinity');
		});

		it('should parse partial', () => {
			const node = parse('\\partial');
			expectType(node, 'symbol');
			expect(node.symbol).toBe('partial');
		});

		it('should parse nabla', () => {
			const node = parse('\\nabla');
			expectType(node, 'symbol');
			expect(node.symbol).toBe('nabla');
		});

		it('should parse forall', () => {
			const node = parse('\\forall');
			expectType(node, 'symbol');
			expect(node.symbol).toBe('forall');
		});

		it('should parse exists', () => {
			const node = parse('\\exists');
			expectType(node, 'symbol');
			expect(node.symbol).toBe('exists');
		});
	});
});

// =============================================================================
// Binary Operations
// =============================================================================

describe('Binary Operations', () => {
	describe('Addition', () => {
		it('should parse simple addition', () => {
			const node = parse('a + b');
			expectType(node, 'addition');
			expectType(node.left, 'variable');
			expectType(node.right, 'variable');
			expect(node.left.name).toBe('a');
			expect(node.right.name).toBe('b');
		});

		it('should parse chained addition (left associative)', () => {
			const node = parse('a + b + c');
			expectType(node, 'addition');
			expectType(node.left, 'addition');
			expectType(node.right, 'variable');
			expect(node.right.name).toBe('c');
		});

		it('should parse addition with numbers', () => {
			const node = parse('1 + 2');
			expectType(node, 'addition');
			expectType(node.left, 'number');
			expectType(node.right, 'number');
			expect(node.left.value).toBe('1');
			expect(node.right.value).toBe('2');
		});
	});

	describe('Subtraction', () => {
		it('should parse simple subtraction', () => {
			const node = parse('a - b');
			expectType(node, 'subtraction');
			expectType(node.left, 'variable');
			expectType(node.right, 'variable');
		});

		it('should parse mixed addition and subtraction', () => {
			const node = parse('a + b - c');
			expectType(node, 'subtraction');
			expectType(node.left, 'addition');
		});
	});

	describe('Multiplication', () => {
		it('should parse star multiplication', () => {
			const node = parse('a * b');
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('star');
		});

		it('should parse cdot multiplication', () => {
			const node = parse('a \\cdot b');
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('dot');
		});

		it('should parse times multiplication', () => {
			const node = parse('a \\times b');
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('cross');
		});

		it('should have higher precedence than addition', () => {
			const node = parse('a + b * c');
			expectType(node, 'addition');
			expectType(node.right, 'multiplication');
		});
	});

	describe('Division', () => {
		it('should parse inline division', () => {
			const node = parse('a / b');
			expectType(node, 'division');
			expect(node.displayStyle).toBe('inline');
		});

		it('should parse ratio division', () => {
			const node = parse('a : b');
			expectType(node, 'division');
			expect(node.displayStyle).toBe('ratio');
		});

		it('should have same precedence as multiplication', () => {
			const node = parse('a * b / c');
			expectType(node, 'division');
			expectType(node.numerator, 'multiplication');
		});
	});
});

// =============================================================================
// Operator Precedence
// =============================================================================

describe('Operator Precedence', () => {
	it('should respect multiplication over addition', () => {
		// a + b * c should be a + (b * c)
		const node = parse('a + b * c');
		expectType(node, 'addition');
		expectType(node.left, 'variable');
		expectType(node.right, 'multiplication');
	});

	it('should respect power over multiplication', () => {
		// a * b^2 should be a * (b^2)
		const node = parse('a * b^2');
		expectType(node, 'multiplication');
		expectType(node.right, 'superscript');
	});

	it('should handle complex precedence', () => {
		// a + b * c^2 should be a + (b * (c^2))
		const node = parse('a + b * c^2');
		expectType(node, 'addition');
		expectType(node.right, 'multiplication');
		const mult = node.right;
		expectType(mult.right, 'superscript');
	});

	it('should handle parentheses overriding precedence', () => {
		// (a + b) * c should be (a + b) * c
		const node = parse('(a + b) * c');
		expectType(node, 'multiplication');
		expectType(node.left, 'delimiter');
		const delim = node.left;
		expectType(delim.content, 'addition');
	});
});

// =============================================================================
// Unary Operations
// =============================================================================

describe('Unary Operations', () => {
	describe('Prefix minus', () => {
		it('should parse negative number', () => {
			const node = parse('-5');
			expectType(node, 'opposite');
			expectType(node.operand, 'number');
			expect(node.operand.value).toBe('5');
		});

		it('should parse negative variable', () => {
			const node = parse('-x');
			expectType(node, 'opposite');
			expectType(node.operand, 'variable');
		});

		it('should have higher precedence than binary operations', () => {
			// -a + b should be (-a) + b
			const node = parse('-a + b');
			expectType(node, 'addition');
			expectType(node.left, 'opposite');
		});
	});

	describe('Prefix plus', () => {
		it('should parse explicit positive', () => {
			const node = parse('+5');
			expectType(node, 'positive');
			expectType(node.operand, 'number');
		});
	});
});

// =============================================================================
// Fractions
// =============================================================================

describe('Fractions', () => {
	it('should parse simple fraction', () => {
		const node = parse('\\frac{1}{2}');
		expectType(node, 'division');
		expect(node.displayStyle).toBe('fraction');
		expectType(node.numerator, 'number');
		expectType(node.denominator, 'number');
		expect(node.numerator.value).toBe('1');
		expect(node.denominator.value).toBe('2');
	});

	it('should parse fraction with expressions', () => {
		const node = parse('\\frac{a + b}{c - d}');
		expectType(node, 'division');
		expectType(node.numerator, 'addition');
		expectType(node.denominator, 'subtraction');
	});

	it('should parse nested fractions', () => {
		const node = parse('\\frac{\\frac{1}{2}}{3}');
		expectType(node, 'division');
		expectType(node.numerator, 'division');
		expectType(node.denominator, 'number');
	});

	it('should parse fraction in expression', () => {
		const node = parse('x + \\frac{1}{2}');
		expectType(node, 'addition');
		expectType(node.right, 'division');
	});
});

// =============================================================================
// Functions
// =============================================================================

describe('Functions', () => {
	describe('Basic functions', () => {
		it('should parse sin function', () => {
			const node = parse('\\sin(x)');
			expectType(node, 'function');
			expect(node.name).toBe('sin');
			expect(node.args).toHaveLength(1);
			expectType(node.args[0], 'variable');
		});

		it('should parse cos function', () => {
			const node = parse('\\cos(x)');
			expectType(node, 'function');
			expect(node.name).toBe('cos');
		});

		it('should parse log function', () => {
			const node = parse('\\log(x)');
			expectType(node, 'function');
			expect(node.name).toBe('log');
		});

		it('should parse ln function', () => {
			const node = parse('\\ln(x)');
			expectType(node, 'function');
			expect(node.name).toBe('ln');
		});

		it('should parse exp function', () => {
			const node = parse('\\exp(x)');
			expectType(node, 'function');
			expect(node.name).toBe('exp');
		});
	});

	describe('Function with power', () => {
		it('should parse sin^2(x)', () => {
			const node = parse('\\sin^2(x)');
			expectType(node, 'function');
			expect(node.name).toBe('sin');
			expect(node.power).toBeDefined();
			expectType(node.power!, 'number');
			expect(node.power!.value).toBe('2');
		});

		it('should parse sin^{-1}(x) (inverse)', () => {
			const node = parse('\\sin^{-1}(x)');
			expectType(node, 'function');
			expect(node.power).toBeDefined();
			expectType(node.power!, 'opposite');
		});
	});

	describe('Function with base', () => {
		it('should parse log_2(x)', () => {
			const node = parse('\\log_2(x)');
			expectType(node, 'function');
			expect(node.name).toBe('log');
			expect(node.base).toBeDefined();
			expectType(node.base!, 'number');
			expect(node.base!.value).toBe('2');
		});

		it('should parse log_{10}(x)', () => {
			const node = parse('\\log_{10}(x)');
			expectType(node, 'function');
			expect(node.base).toBeDefined();
			expectType(node.base!, 'number');
			expect(node.base!.value).toBe('10');
		});
	});

	describe('Function with complex arguments', () => {
		it('should parse function with expression argument', () => {
			const node = parse('\\sin(x + y)');
			expectType(node, 'function');
			expectType(node.args[0], 'addition');
		});

		it('should parse function with multiple arguments', () => {
			const node = parse('\\gcd(a, b)');
			expectType(node, 'function');
			expect(node.args).toHaveLength(2);
		});
	});

	describe('Square root', () => {
		it('should parse \\sqrt{x}', () => {
			const node = parse('\\sqrt{x}');
			expectType(node, 'function');
			expect(node.name).toBe('sqrt');
			expect(node.args).toHaveLength(1);
		});

		it('should parse \\sqrt{a + b}', () => {
			const node = parse('\\sqrt{a + b}');
			expectType(node, 'function');
			expectType(node.args[0], 'addition');
		});

		it('should parse nth root \\sqrt[3]{x}', () => {
			const node = parse('\\sqrt[3]{x}');
			expectType(node, 'function');
			expect(node.name).toBe('sqrt');
			expect(node.base).toBeDefined();
			expectType(node.base!, 'number');
		});
	});
});

// =============================================================================
// Delimiters
// =============================================================================

describe('Delimiters', () => {
	describe('Parentheses', () => {
		it('should parse simple parentheses', () => {
			const node = parse('(x)');
			expectType(node, 'delimiter');
			expect(node.delimiters).toBe('parentheses');
			expectType(node.content, 'variable');
		});

		it('should parse nested parentheses', () => {
			const node = parse('((x))');
			expectType(node, 'delimiter');
			expectType(node.content, 'delimiter');
		});

		it('should parse expression in parentheses', () => {
			const node = parse('(a + b)');
			expectType(node, 'delimiter');
			expectType(node.content, 'addition');
		});
	});

	describe('\\left...\\right delimiters', () => {
		it('should parse \\left( \\right)', () => {
			const node = parse('\\left( x \\right)');
			expectType(node, 'delimiter');
			expect(node.delimiters).toBe('parentheses');
		});

		it('should parse \\left| \\right| (absolute value) as abs function', () => {
			const node = parse('\\left| x \\right|');
			expectType(node, 'function');
			expect(node.name).toBe('abs');
			expect(node.args).toHaveLength(1);
			expectType(node.args[0], 'variable');
		});
	});

	describe('Absolute value', () => {
		it('should parse simple absolute value as abs function', () => {
			const node = parse('|x|');
			expectType(node, 'function');
			expect(node.name).toBe('abs');
			expect(node.args).toHaveLength(1);
			expectType(node.args[0], 'variable');
		});

		it('should parse absolute value of expression', () => {
			const node = parse('|a - b|');
			expectType(node, 'function');
			expect(node.name).toBe('abs');
			expectType(node.args[0], 'subtraction');
		});
	});
});

// =============================================================================
// Superscripts and Subscripts
// =============================================================================

describe('Superscripts and Subscripts', () => {
	describe('Superscript (exponent)', () => {
		it('should parse simple exponent', () => {
			const node = parse('x^2');
			expectType(node, 'superscript');
			expectType(node.base, 'variable');
			expectType(node.superscript, 'number');
		});

		it('should parse exponent with braces', () => {
			const node = parse('x^{10}');
			expectType(node, 'superscript');
			expectType(node.superscript, 'number');
			expect(node.superscript.value).toBe('10');
		});

		it('should parse complex exponent', () => {
			const node = parse('x^{a + b}');
			expectType(node, 'superscript');
			expectType(node.superscript, 'addition');
		});

		it('should be right-associative with braces', () => {
			// x^{y^z} should be x^(y^z)
			const node = parse('x^{y^z}');
			expectType(node, 'superscript');
			expectType(node.superscript, 'superscript');
		});

		it('should be right-associative without braces', () => {
			// x^2^3 should be x^(2^3), not (x^2)^3
			const node = parse('x^2^3');
			expectType(node, 'superscript');
			// The base should be x (variable), not x^2 (superscript)
			expectType(node.base, 'variable');
			expect(node.base.name).toBe('x');
			// The exponent should be 2^3 (superscript)
			expectType(node.superscript, 'superscript');
			expectType(node.superscript.base, 'number');
			expect(node.superscript.base.value).toBe('2');
			expectType(node.superscript.superscript, 'number');
			expect(node.superscript.superscript.value).toBe('3');
		});

		it('should handle triple chained exponents', () => {
			// a^b^c^d should be a^(b^(c^d))
			const node = parse('a^b^c^d');
			expectType(node, 'superscript');
			expectType(node.base, 'variable');
			expect(node.base.name).toBe('a');
			// a^(b^(c^d))
			expectType(node.superscript, 'superscript');
			expectType(node.superscript.base, 'variable');
			expect(node.superscript.base.name).toBe('b');
			// b^(c^d)
			expectType(node.superscript.superscript, 'superscript');
		});
	});

	describe('Subscript', () => {
		it('should parse simple subscript', () => {
			const node = parse('x_1');
			expectType(node, 'subscript');
			expectType(node.base, 'variable');
			expectType(node.subscript, 'number');
		});

		it('should parse subscript with braces', () => {
			const node = parse('x_{ij}');
			expectType(node, 'subscript');
			// ij becomes implicit multiplication of i and j
			expectType(node.subscript, 'multiplication');
		});

		it('should parse both subscript and superscript', () => {
			const node = parse('x_1^2');
			// x_1^2 is (x_1)^2
			expectType(node, 'superscript');
			expectType(node.base, 'subscript');
		});

		it('should be right-associative without braces', () => {
			// x_a_b should be x_(a_b), not (x_a)_b
			const node = parse('x_a_b');
			expectType(node, 'subscript');
			// The base should be x (variable), not x_a (subscript)
			expectType(node.base, 'variable');
			expect(node.base.name).toBe('x');
			// The subscript should be a_b (subscript)
			expectType(node.subscript, 'subscript');
			expectType(node.subscript.base, 'variable');
			expect(node.subscript.base.name).toBe('a');
			expectType(node.subscript.subscript, 'variable');
			expect(node.subscript.subscript.name).toBe('b');
		});
	});
});

// =============================================================================
// Relations
// =============================================================================

describe('Relations', () => {
	describe('Basic relations', () => {
		it('should parse equals', () => {
			const node = parse('x = 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('=');
		});

		it('should parse less than', () => {
			const node = parse('x < 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('<');
		});

		it('should parse greater than', () => {
			const node = parse('x > 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('>');
		});
	});

	describe('Relation commands', () => {
		it('should parse \\leq', () => {
			const node = parse('x \\leq 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('<=');
		});

		it('should parse \\geq', () => {
			const node = parse('x \\geq 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('>=');
		});

		it('should parse \\neq', () => {
			const node = parse('x \\neq 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('!=');
		});

		it('should parse \\approx', () => {
			const node = parse('x \\approx 5');
			expectType(node, 'relation');
			expect(node.relation).toBe('≈');
		});

		it('should parse \\in', () => {
			const node = parse('x \\in A');
			expectType(node, 'relation');
			expect(node.relation).toBe('∈');
		});

		it('should parse \\subset', () => {
			const node = parse('A \\subset B');
			expectType(node, 'relation');
			expect(node.relation).toBe('⊂');
		});

		it('should parse \\implies', () => {
			const node = parse('P \\implies Q');
			expectType(node, 'relation');
			expect(node.relation).toBe('⟹');
		});

		it('should parse \\iff', () => {
			const node = parse('P \\iff Q');
			expectType(node, 'relation');
			expect(node.relation).toBe('⟺');
		});
	});

	describe('Relation chains', () => {
		it('should parse a < b < c as nested relations', () => {
			const node = parse('a < b < c');
			expectType(node, 'relation');
			expect(node.relation).toBe('<');
			expectType(node.left, 'relation');
			expect(node.left.relation).toBe('<');
		});

		it('should parse a = b = c', () => {
			const node = parse('a = b = c');
			expectType(node, 'relation');
			expectType(node.left, 'relation');
		});

		it('should parse mixed chain a <= b < c', () => {
			const node = parse('a \\leq b < c');
			expectType(node, 'relation');
			expect(node.relation).toBe('<');
			expectType(node.left, 'relation');
			expect(node.left.relation).toBe('<=');
		});
	});
});

// =============================================================================
// Colors
// =============================================================================

describe('Colors', () => {
	it('should parse textcolor and apply to content', () => {
		const node = parse('\\textcolor{red}{x}');
		expectType(node, 'variable');
		expect(node.metadata?.color).toBe('red');
	});

	it('should parse textcolor with expression', () => {
		const node = parse('\\textcolor{blue}{a + b}');
		expectType(node, 'addition');
		expect(node.metadata?.color).toBe('blue');
	});

	it('should handle nested colors', () => {
		const node = parse('\\textcolor{red}{a + \\textcolor{blue}{b}}');
		expectType(node, 'addition');
		expect(node.metadata?.color).toBe('red');
		expectType(node.left, 'variable');
		expect(node.left.metadata?.color).toBe('red');
		expectType(node.right, 'variable');
		expect(node.right.metadata?.color).toBe('blue');
	});

	it('should handle color after nested color ends', () => {
		const node = parse('\\textcolor{red}{a + \\textcolor{blue}{b} + c}');
		expectType(node, 'addition');
		// The outer color should apply to the overall expression
		expect(node.metadata?.color).toBe('red');
	});

	it('should accept standard color names', () => {
		const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
		for (const color of colors) {
			const node = parse(`\\textcolor{${color}}{x}`);
			expect(node.metadata?.color).toBe(color);
		}
	});
});

// =============================================================================
// Units
// =============================================================================

describe('Units', () => {
	it('should parse number with unit', () => {
		const node = parse('5~\\unit{m}');
		expectType(node, 'unit');
		expectType(node.expression, 'number');
		expect(node.expression.value).toBe('5');
		expect(node.unit.original).toBe('m');
	});

	it('should parse expression with unit', () => {
		const node = parse('(a + b)~\\unit{km}');
		expectType(node, 'unit');
		expectType(node.expression, 'delimiter');
	});

	it('should parse compound unit', () => {
		const node = parse('v~\\unit{m/s}');
		expectType(node, 'unit');
		expect(node.unit.original).toBe('m/s');
	});

	it('should parse unit with exponent', () => {
		const node = parse('a~\\unit{m^2}');
		expectType(node, 'unit');
		expect(node.unit.original).toBe('m^2');
	});

	it('should parse complex unit', () => {
		const node = parse('F~\\unit{kg*m/s^2}');
		expectType(node, 'unit');
		expect(node.unit.original).toBe('kg*m/s^2');
	});
});

// =============================================================================
// Implicit Multiplication
// =============================================================================

describe('Implicit Multiplication', () => {
	it('should detect number followed by letter: 2x', () => {
		const node = parse('2x');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
		expectType(node.left, 'number');
		expectType(node.right, 'variable');
	});

	it('should detect number followed by parenthesis: 2(x)', () => {
		const node = parse('2(x)');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
	});

	it('should detect number followed by Greek: 3\\alpha', () => {
		const node = parse('3\\alpha');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
		expectType(node.right, 'greek');
	});

	it('should detect letter followed by letter: xy', () => {
		const node = parse('xy');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
	});

	it('should detect letter followed by Greek: x\\alpha', () => {
		const node = parse('x\\alpha');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
	});

	it('should detect parentheses followed by parentheses: (a)(b)', () => {
		const node = parse('(a)(b)');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
	});

	it('should detect parentheses followed by letter: (a)x', () => {
		const node = parse('(a)x');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
	});

	it('should detect number followed by function: 2\\sin(x)', () => {
		const node = parse('2\\sin(x)');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
		expectType(node.right, 'function');
	});

	it('should chain implicit multiplications: abc', () => {
		const node = parse('abc');
		expectType(node, 'multiplication');
		expectType(node.left, 'multiplication');
	});

	it('should not trigger for operators', () => {
		// a + b should NOT have implicit mult between + and b
		const node = parse('a + b');
		expectType(node, 'addition');
	});
});

// =============================================================================
// Complex Expressions
// =============================================================================

describe('Complex Expressions', () => {
	it('should parse quadratic formula style', () => {
		const node = parse('\\frac{-b + \\sqrt{b^2 - 4ac}}{2a}');
		expectType(node, 'division');
		expect(node.displayStyle).toBe('fraction');
	});

	it('should parse physics equation v = d/t', () => {
		const node = parse('v = d / t');
		expectType(node, 'relation');
		expect(node.relation).toBe('=');
		expectType(node.right, 'division');
	});

	it('should parse Pythagorean theorem a^2 + b^2 = c^2', () => {
		const node = parse('a^2 + b^2 = c^2');
		expectType(node, 'relation');
		expectType(node.left, 'addition');
	});

	it('should parse logarithm identity', () => {
		const node = parse('\\log(xy) = \\log(x) + \\log(y)');
		expectType(node, 'relation');
	});

	it('should parse derivative notation', () => {
		const node = parse('\\frac{\\partial f}{\\partial x}');
		expectType(node, 'division');
	});

	it('should parse integral bounds style', () => {
		const node = parse('a \\leq x \\leq b');
		expectType(node, 'relation');
		expectType(node.left, 'relation');
	});

	it('should parse nested functions', () => {
		const node = parse('\\sin(\\cos(x))');
		expectType(node, 'function');
		expectType(node.args[0], 'function');
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Error Handling', () => {
	describe('Strict mode', () => {
		it('should throw on missing closing parenthesis', () => {
			expect(() => parse('(x + y')).toThrow();
		});

		it('should throw on missing closing brace', () => {
			expect(() => parse('\\frac{1}{2')).toThrow();
		});

		it('should throw on unknown command', () => {
			expect(() => parse('\\unknowncommand')).toThrow();
		});

		it('should throw on invalid color', () => {
			expect(() => parse('\\textcolor{notacolor}{x}')).toThrow();
		});

		it('should provide ParseException with details', () => {
			try {
				parse('(x + y');
				expect.fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(ParseException);
				const pe = e as ParseException;
				expect(pe.code).toBeDefined();
				expect(pe.position).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe('Tolerant mode', () => {
		it('should return errors instead of throwing', () => {
			const result = parseRDSafe('(x + y');
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should include error code in errors', () => {
			const result = parseRDSafe('\\unknowncommand');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBeDefined();
		});

		it('should include position information', () => {
			const result = parseRDSafe('\\unknowncommand');
			expect(result.errors[0].position).toBeGreaterThanOrEqual(0);
			expect(result.errors[0].length).toBeGreaterThan(0);
		});
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
	it('should handle empty input', () => {
		expect(() => parse('')).toThrow();
	});

	it('should handle whitespace-only input', () => {
		expect(() => parse('   ')).toThrow();
	});

	it('should handle deeply nested expressions', () => {
		const node = parse('((((x))))');
		expectType(node, 'delimiter');
	});

	it('should handle multiple operators at same precedence', () => {
		const node = parse('a + b - c + d');
		expectType(node, 'addition');
	});

	it('should handle negative exponent', () => {
		const node = parse('x^{-1}');
		expectType(node, 'superscript');
		expectType(node.superscript, 'opposite');
	});

	it('should handle fraction in exponent', () => {
		const node = parse('x^{\\frac{1}{2}}');
		expectType(node, 'superscript');
		expectType(node.superscript, 'division');
	});

	it('should handle function without parentheses', () => {
		// \sin x should parse as \sin(x) with single argument
		const node = parse('\\sin x');
		expectType(node, 'function');
		expect(node.args).toHaveLength(1);
	});

	it('should handle Greek in subscript', () => {
		const node = parse('x_\\alpha');
		expectType(node, 'subscript');
		expectType(node.subscript, 'greek');
	});

	it('should handle consecutive fractions', () => {
		const node = parse('\\frac{1}{2} + \\frac{3}{4}');
		expectType(node, 'addition');
		expectType(node.left, 'division');
		expectType(node.right, 'division');
	});
});

// =============================================================================
// Brace Groups
// =============================================================================

describe('Brace Groups', () => {
	it('should parse simple brace group', () => {
		const node = parse('{x}');
		expectType(node, 'variable');
	});

	it('should parse expression in braces', () => {
		const node = parse('{a + b}');
		expectType(node, 'addition');
	});

	it('should use braces for grouping in exponents', () => {
		const node = parse('2^{10}');
		expectType(node, 'superscript');
		expectType(node.superscript, 'number');
		expect(node.superscript.value).toBe('10');
	});

	it('should handle nested braces', () => {
		const node = parse('{{x}}');
		expectType(node, 'variable');
	});
});

// =============================================================================
// Mixed Scenarios
// =============================================================================

describe('Mixed Scenarios', () => {
	it('should handle function in fraction', () => {
		const node = parse('\\frac{\\sin(x)}{x}');
		expectType(node, 'division');
		expectType(node.numerator, 'function');
	});

	it('should handle unit with expression', () => {
		const node = parse('v = 10~\\unit{m/s}');
		expectType(node, 'relation');
		expectType(node.right, 'unit');
	});

	it('should handle color with fraction', () => {
		const node = parse('\\textcolor{red}{\\frac{1}{2}}');
		expectType(node, 'division');
		expect(node.metadata?.color).toBe('red');
	});

	it('should handle implicit mult with superscript', () => {
		const node = parse('2x^2');
		// This should be 2 * (x^2)
		expectType(node, 'multiplication');
		expectType(node.right, 'superscript');
	});

	it('should handle coefficient with function', () => {
		const node = parse('2\\sin^2(x)');
		expectType(node, 'multiplication');
		expect(node.displayStyle).toBe('implicit');
		expectType(node.right, 'function');
	});
});
