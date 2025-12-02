/**
 * Custom Syntax Recursive Descent Parser - Tests
 *
 * Comprehensive tests for the custom syntax Recursive Descent parser including:
 * - Literals (numbers with comma, variables, symbols)
 * - `/` at primary level (CRITICAL - many tests)
 * - `:/` and `:` at multiplicative level
 * - Implicit multiplication (allowed and forbidden cases)
 * - Subscripts/superscripts (number grouping, letter rejection)
 * - Functions (all 7, with power, with base, mandatory parens)
 * - Absolute value
 * - Colors (named, hex, nested)
 * - Units
 * - Parentheses vs braces
 * - Relations
 * - Error cases
 * - Complex expressions
 *
 * NOTE: These tests are IDENTICAL to parser-pratt.test.ts to ensure both
 * parsers produce the same output.
 *
 * @module mathAST/parser/custom/__tests__/parser-rd.test
 */

import { describe, it, expect } from 'vitest';
import { parseCustomRD, parseCustomRDSafe, ParseException } from '../parser-rd';
import type {
	MathNode,
	DivisionNode,
	MultiplicationNode,
	AdditionNode,
	RelationNode
} from '../../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to parse and return the AST, throwing on error
 */
function parse(input: string): MathNode {
	return parseCustomRD(input);
}

/**
 * Helper to parse safely and return the result
 */
function parseSafe(input: string) {
	return parseCustomRDSafe(input);
}

/**
 * Type guard for DivisionNode
 */
function _isDivision(node: MathNode): node is DivisionNode {
	return node.type === 'division';
}

/**
 * Type guard for MultiplicationNode
 */
function _isMultiplication(node: MathNode): node is MultiplicationNode {
	return node.type === 'multiplication';
}

/**
 * Type guard for AdditionNode
 */
function _isAddition(node: MathNode): node is AdditionNode {
	return node.type === 'addition';
}

// =============================================================================
// Literals
// =============================================================================

describe('Literals', () => {
	describe('Numbers', () => {
		it('should parse integer', () => {
			const ast = parse('42');
			expect(ast).toEqual({ type: 'number', value: '42' });
		});

		it('should parse decimal with dot', () => {
			const ast = parse('3.14');
			expect(ast).toEqual({ type: 'number', value: '3.14' });
		});

		it('should parse decimal with comma (French notation, normalized to dot)', () => {
			const ast = parse('3,14');
			expect(ast).toEqual({ type: 'number', value: '3.14' });
		});

		it('should parse zero', () => {
			const ast = parse('0');
			expect(ast).toEqual({ type: 'number', value: '0' });
		});

		it('should parse large integer', () => {
			const ast = parse('123456789');
			expect(ast).toEqual({ type: 'number', value: '123456789' });
		});
	});

	describe('Variables', () => {
		it('should parse single letter', () => {
			const ast = parse('x');
			expect(ast).toEqual({ type: 'variable', name: 'x' });
		});

		it('should parse uppercase letter', () => {
			const ast = parse('X');
			expect(ast).toEqual({ type: 'variable', name: 'X' });
		});
	});

	describe('Symbols', () => {
		it('should parse \\pi', () => {
			const ast = parse('\\pi');
			expect(ast).toEqual({ type: 'greek', letter: 'pi' });
		});

		it('should parse \\alpha', () => {
			const ast = parse('\\alpha');
			expect(ast).toEqual({ type: 'greek', letter: 'alpha' });
		});

		it('should parse \\beta', () => {
			const ast = parse('\\beta');
			expect(ast).toEqual({ type: 'greek', letter: 'beta' });
		});

		it('should parse \\gamma', () => {
			const ast = parse('\\gamma');
			expect(ast).toEqual({ type: 'greek', letter: 'gamma' });
		});

		it('should parse \\theta', () => {
			const ast = parse('\\theta');
			expect(ast).toEqual({ type: 'greek', letter: 'theta' });
		});

		it('should parse \\infty', () => {
			const ast = parse('\\infty');
			expect(ast).toEqual({ type: 'symbol', symbol: 'infinity' });
		});
	});
});

// =============================================================================
// Division at PRIMARY Level (CRITICAL)
// =============================================================================

describe('Division at PRIMARY level (CRITICAL)', () => {
	it('2+3/4+5 should parse as Add(Add(2, Div(3,4)), 5)', () => {
		const ast = parse('2+3/4+5');

		// Structure: ((2 + (3/4)) + 5)
		expect(ast.type).toBe('addition');
		const outer = ast as AdditionNode;
		expect(outer.right).toEqual({ type: 'number', value: '5' });

		const inner = outer.left;
		expect(inner.type).toBe('addition');
		const innerAdd = inner as AdditionNode;
		expect(innerAdd.left).toEqual({ type: 'number', value: '2' });

		const frac = innerAdd.right;
		expect(frac.type).toBe('division');
		const div = frac as DivisionNode;
		expect(div.numerator).toEqual({ type: 'number', value: '3' });
		expect(div.denominator).toEqual({ type: 'number', value: '4' });
		expect(div.displayStyle).toBe('fraction');
	});

	it('2*3/4 should parse as Mult(2, Div(3,4))', () => {
		const ast = parse('2*3/4');

		// / has higher precedence than *, so: 2 * (3/4)
		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'number', value: '2' });

		const frac = mult.right;
		expect(frac.type).toBe('division');
		const div = frac as DivisionNode;
		expect(div.numerator).toEqual({ type: 'number', value: '3' });
		expect(div.denominator).toEqual({ type: 'number', value: '4' });
		expect(div.displayStyle).toBe('fraction');
	});

	it('{2+3}/{4+5} should parse as Div(Add(2,3), Add(4,5))', () => {
		const ast = parse('{2+3}/{4+5}');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;
		expect(div.displayStyle).toBe('fraction');

		const num = div.numerator;
		expect(num.type).toBe('addition');
		const numAdd = num as AdditionNode;
		expect(numAdd.left).toEqual({ type: 'number', value: '2' });
		expect(numAdd.right).toEqual({ type: 'number', value: '3' });

		const denom = div.denominator;
		expect(denom.type).toBe('addition');
		const denomAdd = denom as AdditionNode;
		expect(denomAdd.left).toEqual({ type: 'number', value: '4' });
		expect(denomAdd.right).toEqual({ type: 'number', value: '5' });
	});

	it('a/b/c should be left-associative: Div(Div(a,b), c)', () => {
		const ast = parse('a/b/c');

		expect(ast.type).toBe('division');
		const outer = ast as DivisionNode;
		expect(outer.denominator).toEqual({ type: 'variable', name: 'c' });

		const inner = outer.numerator;
		expect(inner.type).toBe('division');
		const innerDiv = inner as DivisionNode;
		expect(innerDiv.numerator).toEqual({ type: 'variable', name: 'a' });
		expect(innerDiv.denominator).toEqual({ type: 'variable', name: 'b' });
	});

	it('simple fraction a/b', () => {
		const ast = parse('a/b');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;
		expect(div.numerator).toEqual({ type: 'variable', name: 'a' });
		expect(div.denominator).toEqual({ type: 'variable', name: 'b' });
		expect(div.displayStyle).toBe('fraction');
	});

	it('1/2 + 3/4 should parse correctly', () => {
		const ast = parse('1/2+3/4');

		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;

		expect(add.left.type).toBe('division');
		expect(add.right.type).toBe('division');
	});

	it('x + 1/y should parse as Add(x, Div(1,y))', () => {
		const ast = parse('x+1/y');

		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;
		expect(add.left).toEqual({ type: 'variable', name: 'x' });

		const frac = add.right;
		expect(frac.type).toBe('division');
		const div = frac as DivisionNode;
		expect(div.numerator).toEqual({ type: 'number', value: '1' });
		expect(div.denominator).toEqual({ type: 'variable', name: 'y' });
	});

	it('(a+b)/(c+d) should work with parentheses', () => {
		const ast = parse('(a+b)/(c+d)');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;

		// Numerator is wrapped in delimiter
		expect(div.numerator.type).toBe('delimiter');
		// Denominator is wrapped in delimiter
		expect(div.denominator.type).toBe('delimiter');
	});

	it('a*b/c*d should parse as Mult(Mult(a, Div(b,c)), d)', () => {
		// a * (b/c) * d = ((a * (b/c)) * d)
		const ast = parse('a*b/c*d');

		expect(ast.type).toBe('multiplication');
		const outer = ast as MultiplicationNode;
		expect(outer.right).toEqual({ type: 'variable', name: 'd' });

		const inner = outer.left;
		expect(inner.type).toBe('multiplication');
		const innerMult = inner as MultiplicationNode;
		expect(innerMult.left).toEqual({ type: 'variable', name: 'a' });

		const frac = innerMult.right;
		expect(frac.type).toBe('division');
		const div = frac as DivisionNode;
		expect(div.numerator).toEqual({ type: 'variable', name: 'b' });
		expect(div.denominator).toEqual({ type: 'variable', name: 'c' });
	});
});

// =============================================================================
// Division Operators at Multiplicative Level
// =============================================================================

describe('Division operators at multiplicative level', () => {
	it(':/ creates inline division', () => {
		const ast = parse('a:/b');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;
		expect(div.numerator).toEqual({ type: 'variable', name: 'a' });
		expect(div.denominator).toEqual({ type: 'variable', name: 'b' });
		expect(div.displayStyle).toBe('inline');
	});

	it(': creates ratio', () => {
		const ast = parse('a:b');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;
		expect(div.numerator).toEqual({ type: 'variable', name: 'a' });
		expect(div.denominator).toEqual({ type: 'variable', name: 'b' });
		expect(div.displayStyle).toBe('ratio');
	});

	it('1+2:/3 - :/ is at multiplicative level', () => {
		const ast = parse('1+2:/3');

		// :/ is at multiplicative level, so: 1 + (2:/3)
		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;
		expect(add.left).toEqual({ type: 'number', value: '1' });

		const div = add.right;
		expect(div.type).toBe('division');
		expect((div as DivisionNode).displayStyle).toBe('inline');
	});
});

// =============================================================================
// Multiplication
// =============================================================================

describe('Multiplication', () => {
	it('* creates cross multiplication', () => {
		const ast = parse('a*b');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'variable', name: 'a' });
		expect(mult.right).toEqual({ type: 'variable', name: 'b' });
		expect(mult.displayStyle).toBe('cross');
	});

	it('implicit multiplication: 2x', () => {
		const ast = parse('2x');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'number', value: '2' });
		expect(mult.right).toEqual({ type: 'variable', name: 'x' });
		expect(mult.displayStyle).toBe('implicit');
	});

	it('implicit multiplication: xy', () => {
		const ast = parse('xy');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'variable', name: 'x' });
		expect(mult.right).toEqual({ type: 'variable', name: 'y' });
		expect(mult.displayStyle).toBe('implicit');
	});

	it('implicit multiplication: 2\\pi', () => {
		const ast = parse('2\\pi');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'number', value: '2' });
		expect(mult.right).toEqual({ type: 'greek', letter: 'pi' });
		expect(mult.displayStyle).toBe('implicit');
	});

	it('implicit multiplication: x(y+1)', () => {
		const ast = parse('x(y+1)');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'variable', name: 'x' });
		expect(mult.right.type).toBe('delimiter');
	});

	it('implicit multiplication: (a)(b)', () => {
		const ast = parse('(a)(b)');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left.type).toBe('delimiter');
		expect(mult.right.type).toBe('delimiter');
	});

	it('no implicit multiplication after number: x2 should NOT be valid implicit mult', () => {
		// x2 = x * 2? No! Numbers cannot START implicit multiplication
		// So x2 should be: x (variable), then 2 (unexpected token)
		const result = parseSafe('x2');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('no implicit multiplication: (a)2 should fail', () => {
		const result = parseSafe('(a)2');
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Subscripts and Superscripts
// =============================================================================

describe('Subscripts and Superscripts', () => {
	describe('Superscripts', () => {
		it('x^2 - single number exponent', () => {
			const ast = parse('x^2');

			expect(ast.type).toBe('superscript');
			expect(ast).toMatchObject({
				type: 'superscript',
				base: { type: 'variable', name: 'x' },
				superscript: { type: 'number', value: '2' }
			});
		});

		it('x^12 - multi-digit number exponent', () => {
			const ast = parse('x^12');

			expect(ast.type).toBe('superscript');
			expect(ast).toMatchObject({
				type: 'superscript',
				base: { type: 'variable', name: 'x' },
				superscript: { type: 'number', value: '12' }
			});
		});

		it('x^n - single letter exponent', () => {
			const ast = parse('x^n');

			expect(ast.type).toBe('superscript');
			expect(ast).toMatchObject({
				type: 'superscript',
				base: { type: 'variable', name: 'x' },
				superscript: { type: 'variable', name: 'n' }
			});
		});

		it('x^{ab} - braced multi-letter exponent', () => {
			const ast = parse('x^{ab}');

			expect(ast.type).toBe('superscript');
			// The superscript should be implicit multiplication a*b
			const sup = ast as { superscript: MathNode };
			expect(sup.superscript.type).toBe('multiplication');
		});

		it('x^{-2} - negative exponent with braces', () => {
			const ast = parse('x^{-2}');

			expect(ast.type).toBe('superscript');
			const sup = ast as { superscript: MathNode };
			expect(sup.superscript.type).toBe('opposite');
		});

		it('x^ab should fail - multi-letter without braces', () => {
			const result = parseSafe('x^ab');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('INVALID_SUPERSCRIPT');
		});

		it('x^-2 should fail - negative without braces', () => {
			const result = parseSafe('x^-2');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('INVALID_SUPERSCRIPT');
		});
	});

	describe('Subscripts', () => {
		it('x_1 - single number subscript', () => {
			const ast = parse('x_1');

			expect(ast.type).toBe('subscript');
			expect(ast).toMatchObject({
				type: 'subscript',
				base: { type: 'variable', name: 'x' },
				subscript: { type: 'number', value: '1' }
			});
		});

		it('x_12 - multi-digit number subscript', () => {
			const ast = parse('x_12');

			expect(ast.type).toBe('subscript');
			expect(ast).toMatchObject({
				type: 'subscript',
				base: { type: 'variable', name: 'x' },
				subscript: { type: 'number', value: '12' }
			});
		});

		it('x_n - single letter subscript', () => {
			const ast = parse('x_n');

			expect(ast.type).toBe('subscript');
			expect(ast).toMatchObject({
				type: 'subscript',
				base: { type: 'variable', name: 'x' },
				subscript: { type: 'variable', name: 'n' }
			});
		});

		it('x_{ab} - braced multi-letter subscript', () => {
			const ast = parse('x_{ab}');

			expect(ast.type).toBe('subscript');
			const sub = ast as { subscript: MathNode };
			expect(sub.subscript.type).toBe('multiplication');
		});

		it('x_ab should fail - multi-letter without braces', () => {
			const result = parseSafe('x_ab');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('INVALID_SUBSCRIPT');
		});
	});

	describe('Mixed subscript/superscript', () => {
		it('x_1^2 - subscript then superscript', () => {
			const ast = parse('x_1^2');

			// Should parse as (x_1)^2
			expect(ast.type).toBe('superscript');
		});

		it('x^2_1 - superscript then subscript', () => {
			const ast = parse('x^2_1');

			// Should parse as (x^2)_1
			expect(ast.type).toBe('subscript');
		});
	});
});

// =============================================================================
// Functions
// =============================================================================

describe('Functions', () => {
	describe('Basic functions', () => {
		it('sin(x)', () => {
			const ast = parse('sin(x)');

			expect(ast.type).toBe('function');
			expect(ast).toMatchObject({
				type: 'function',
				name: 'sin',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('cos(x)', () => {
			const ast = parse('cos(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'cos',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('tan(x)', () => {
			const ast = parse('tan(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'tan',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('ln(x)', () => {
			const ast = parse('ln(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'ln',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('log(x)', () => {
			const ast = parse('log(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'log',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('exp(x)', () => {
			const ast = parse('exp(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'exp',
				args: [{ type: 'variable', name: 'x' }]
			});
		});

		it('sqrt(x)', () => {
			const ast = parse('sqrt(x)');

			expect(ast).toMatchObject({
				type: 'function',
				name: 'sqrt',
				args: [{ type: 'variable', name: 'x' }]
			});
		});
	});

	describe('Functions with power', () => {
		it('sin^2(x)', () => {
			const ast = parse('sin^2(x)');

			expect(ast.type).toBe('function');
			expect(ast).toMatchObject({
				type: 'function',
				name: 'sin',
				args: [{ type: 'variable', name: 'x' }],
				power: { type: 'number', value: '2' }
			});
		});

		it('cos^{-1}(x)', () => {
			const ast = parse('cos^{-1}(x)');

			expect(ast.type).toBe('function');
			const func = ast as { power?: MathNode };
			expect(func.power?.type).toBe('opposite');
		});
	});

	describe('log with base', () => {
		it('log_2(x)', () => {
			const ast = parse('log_2(x)');

			expect(ast.type).toBe('function');
			expect(ast).toMatchObject({
				type: 'function',
				name: 'log',
				args: [{ type: 'variable', name: 'x' }],
				base: { type: 'number', value: '2' }
			});
		});

		it('log_{10}(x)', () => {
			const ast = parse('log_{10}(x)');

			expect(ast.type).toBe('function');
			expect(ast).toMatchObject({
				type: 'function',
				name: 'log',
				args: [{ type: 'variable', name: 'x' }],
				base: { type: 'number', value: '10' }
			});
		});
	});

	describe('sqrt with nth root', () => {
		it('sqrt[3](x) - cube root', () => {
			const ast = parse('sqrt[3](x)');

			expect(ast.type).toBe('function');
			expect(ast).toMatchObject({
				type: 'function',
				name: 'sqrt',
				args: [{ type: 'variable', name: 'x' }],
				base: { type: 'number', value: '3' }
			});
		});
	});

	describe('Functions with multiple arguments', () => {
		it('log(x,10)', () => {
			const ast = parse('log(x,10)');

			expect(ast.type).toBe('function');
			const func = ast as { args: MathNode[] };
			expect(func.args).toHaveLength(2);
		});
	});

	describe('Mandatory parentheses', () => {
		it('sin x should fail - no parentheses', () => {
			const result = parseSafe('sin x');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('MISSING_DELIMITER');
		});

		it('cos x should fail - no parentheses', () => {
			const result = parseSafe('cos x');
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});

// =============================================================================
// Absolute Value
// =============================================================================

describe('Absolute Value', () => {
	it('|x| - simple absolute value', () => {
		const ast = parse('|x|');

		expect(ast.type).toBe('function');
		expect(ast).toMatchObject({
			type: 'function',
			name: 'abs',
			args: [{ type: 'variable', name: 'x' }]
		});
	});

	it('|x+1| - expression inside', () => {
		const ast = parse('|x+1|');

		expect(ast.type).toBe('function');
		const func = ast as { args: MathNode[] };
		expect(func.args[0].type).toBe('addition');
	});

	it('2|x| - multiplication with absolute value', () => {
		const ast = parse('2|x|');

		expect(ast.type).toBe('multiplication');
		const mult = ast as MultiplicationNode;
		expect(mult.left).toEqual({ type: 'number', value: '2' });
		expect(mult.right.type).toBe('function');
	});
});

// =============================================================================
// Colors
// =============================================================================

describe('Colors', () => {
	describe('Named colors', () => {
		it('@red{x} - simple red', () => {
			const ast = parse('@red{x}');

			expect(ast.type).toBe('variable');
			expect(ast.metadata?.color).toBe('red');
		});

		it('@blue{2+3} - expression in blue', () => {
			const ast = parse('@blue{2+3}');

			expect(ast.type).toBe('addition');
			expect(ast.metadata?.color).toBe('blue');
		});
	});

	describe('Hex colors', () => {
		it('@#FF0000{x} - hex red', () => {
			const ast = parse('@#FF0000{x}');

			expect(ast.type).toBe('variable');
			expect(ast.metadata?.color).toBe('#ff0000');
		});

		it('@#00FF00{y} - hex green', () => {
			const ast = parse('@#00FF00{y}');

			expect(ast.type).toBe('variable');
			expect(ast.metadata?.color).toBe('#00ff00');
		});
	});

	describe('Nested colors', () => {
		it('@red{a+@blue{b}} - nested colors', () => {
			const ast = parse('@red{a+@blue{b}}');

			expect(ast.type).toBe('addition');
			expect(ast.metadata?.color).toBe('red');

			const add = ast as AdditionNode;
			expect(add.right.metadata?.color).toBe('blue');
		});
	});

	describe('Invalid colors', () => {
		it('@invalid{x} should fail', () => {
			const result = parseSafe('@invalid{x}');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe('INVALID_COLOR');
		});
	});
});

// =============================================================================
// Units
// =============================================================================

describe('Units', () => {
	it('5[m] - meters', () => {
		const ast = parse('5[m]');

		expect(ast.type).toBe('unit');
		expect(ast).toMatchObject({
			type: 'unit',
			expression: { type: 'number', value: '5' }
		});
	});

	it('10[km/h] - kilometers per hour', () => {
		const ast = parse('10[km/h]');

		expect(ast.type).toBe('unit');
	});

	it('9.8[m/s^2] - acceleration', () => {
		const ast = parse('9.8[m/s^2]');

		expect(ast.type).toBe('unit');
	});

	it('x[m] - variable with unit', () => {
		const ast = parse('x[m]');

		expect(ast.type).toBe('unit');
		expect(ast).toMatchObject({
			type: 'unit',
			expression: { type: 'variable', name: 'x' }
		});
	});
});

// =============================================================================
// Parentheses vs Braces
// =============================================================================

describe('Parentheses vs Braces', () => {
	it('(x) - parentheses create delimiter node', () => {
		const ast = parse('(x)');

		expect(ast.type).toBe('delimiter');
		expect(ast).toMatchObject({
			type: 'delimiter',
			delimiters: 'parentheses',
			content: { type: 'variable', name: 'x' }
		});
	});

	it('{x} - braces are transparent', () => {
		const ast = parse('{x}');

		// Braces should NOT create a wrapper node
		expect(ast.type).toBe('variable');
		expect(ast).toEqual({ type: 'variable', name: 'x' });
	});

	it('({x}) - parentheses around braced content', () => {
		const ast = parse('({x})');

		expect(ast.type).toBe('delimiter');
	});

	it('() should fail - empty parentheses', () => {
		const result = parseSafe('()');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('EMPTY_GROUP');
	});

	it('{} should fail - empty braces', () => {
		const result = parseSafe('{}');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('EMPTY_GROUP');
	});
});

// =============================================================================
// Relations
// =============================================================================

describe('Relations', () => {
	it('x = 5 - equals', () => {
		const ast = parse('x=5');

		expect(ast.type).toBe('relation');
		expect(ast).toMatchObject({
			type: 'relation',
			relation: '=',
			left: { type: 'variable', name: 'x' },
			right: { type: 'number', value: '5' }
		});
	});

	it('x < 5 - less than', () => {
		const ast = parse('x<5');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '<'
		});
	});

	it('x > 5 - greater than', () => {
		const ast = parse('x>5');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '>'
		});
	});

	it('x <= 5 - less than or equal', () => {
		const ast = parse('x<=5');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '<='
		});
	});

	it('x >= 5 - greater than or equal', () => {
		const ast = parse('x>=5');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '>='
		});
	});

	it('x != 5 - not equal', () => {
		const ast = parse('x!=5');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '!='
		});
	});

	it('x <=> y - if and only if', () => {
		const ast = parse('x<=>y');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '⟺'
		});
	});

	it('x => y - implies', () => {
		const ast = parse('x=>y');

		expect(ast).toMatchObject({
			type: 'relation',
			relation: '⟹'
		});
	});

	it('a < b < c - chained relations', () => {
		const ast = parse('a<b<c');

		// Should parse as (a < b) < c due to left associativity
		expect(ast.type).toBe('relation');
		const outer = ast as RelationNode;
		expect(outer.relation).toBe('<');
		expect(outer.right).toEqual({ type: 'variable', name: 'c' });

		expect(outer.left.type).toBe('relation');
	});
});

// =============================================================================
// Error Cases
// =============================================================================

describe('Error cases', () => {
	it('--5 should fail - double minus', () => {
		const result = parseSafe('--5');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('empty input should return null', () => {
		const result = parseSafe('');
		expect(result.ast).toBeNull();
	});

	it('only whitespace should return null', () => {
		const result = parseSafe('   ');
		expect(result.ast).toBeNull();
	});

	it('unmatched parenthesis should fail', () => {
		const result = parseSafe('(x');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('unmatched brace should fail', () => {
		const result = parseSafe('{x');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('unmatched pipe should fail', () => {
		const result = parseSafe('|x');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('trailing operator should fail', () => {
		const result = parseSafe('x+');
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('unknown symbol should fail', () => {
		const result = parseSafe('\\unknown');
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Complex Expressions
// =============================================================================

describe('Complex expressions', () => {
	it('2\\pi*r^2 - circle area', () => {
		const ast = parse('2\\pi*r^2');

		expect(ast.type).toBe('multiplication');
	});

	it('sin(x)^2 + cos(x)^2 = 1 - pythagorean identity', () => {
		const ast = parse('sin(x)^2+cos(x)^2=1');

		expect(ast.type).toBe('relation');
		const rel = ast as RelationNode;
		expect(rel.relation).toBe('=');
		expect(rel.right).toEqual({ type: 'number', value: '1' });
	});

	it('a/b + c/d - sum of fractions', () => {
		const ast = parse('a/b+c/d');

		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;
		expect(add.left.type).toBe('division');
		expect(add.right.type).toBe('division');
	});

	it('{a+b}/{c+d}*x - fraction times variable', () => {
		const ast = parse('{a+b}/{c+d}*x');

		expect(ast.type).toBe('multiplication');
	});

	it('log_2(x^2) - log base 2 of x squared', () => {
		const ast = parse('log_2(x^2)');

		expect(ast.type).toBe('function');
		const func = ast as { name: string; base?: MathNode; args: MathNode[] };
		expect(func.name).toBe('log');
		expect(func.base).toEqual({ type: 'number', value: '2' });
		expect(func.args[0].type).toBe('superscript');
	});

	it('|x-y|/2 - absolute value in numerator', () => {
		const ast = parse('|x-y|/2');

		expect(ast.type).toBe('division');
		const div = ast as DivisionNode;
		expect(div.numerator.type).toBe('function');
	});

	it('@red{x}+@blue{y} - colored sum', () => {
		const ast = parse('@red{x}+@blue{y}');

		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;
		expect(add.left.metadata?.color).toBe('red');
		expect(add.right.metadata?.color).toBe('blue');
	});
});

// =============================================================================
// Unary Operators
// =============================================================================

describe('Unary operators', () => {
	it('-x - negation', () => {
		const ast = parse('-x');

		expect(ast.type).toBe('opposite');
		expect(ast).toMatchObject({
			type: 'opposite',
			operand: { type: 'variable', name: 'x' }
		});
	});

	it('+x - positive', () => {
		const ast = parse('+x');

		expect(ast.type).toBe('positive');
		expect(ast).toMatchObject({
			type: 'positive',
			operand: { type: 'variable', name: 'x' }
		});
	});

	it('-5 - negative number', () => {
		const ast = parse('-5');

		expect(ast.type).toBe('opposite');
		expect(ast).toMatchObject({
			type: 'opposite',
			operand: { type: 'number', value: '5' }
		});
	});

	it('a + -b - binary plus unary', () => {
		const ast = parse('a+-b');

		expect(ast.type).toBe('addition');
		const add = ast as AdditionNode;
		expect(add.right.type).toBe('opposite');
	});

	it('a - -b - subtraction of negative', () => {
		const ast = parse('a--b');

		expect(ast.type).toBe('subtraction');
	});

	it('-{x+y} - negation of braced expression', () => {
		const ast = parse('-{x+y}');

		expect(ast.type).toBe('opposite');
		const opp = ast as { operand: MathNode };
		expect(opp.operand.type).toBe('addition');
	});
});

// =============================================================================
// API Tests
// =============================================================================

describe('API', () => {
	describe('parseCustomRD', () => {
		it('should throw ParseException on error', () => {
			expect(() => parse('((')).toThrow(ParseException);
		});

		it('should throw on empty input', () => {
			expect(() => parse('')).toThrow(ParseException);
		});
	});

	describe('parseCustomRDSafe', () => {
		it('should return errors array on error', () => {
			const result = parseSafe('((');
			expect(result.ast).toBeNull();
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should return ast on success', () => {
			const result = parseSafe('x');
			expect(result.ast).not.toBeNull();
			expect(result.errors).toHaveLength(0);
		});
	});
});
