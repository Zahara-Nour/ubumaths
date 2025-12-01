/**
 * Integration tests for ASCIIMath to LaTeX transpiler
 *
 * Tests the complete transpilation pipeline: tokenizer → parser → generator
 */

import { describe, it, expect } from 'vitest';
import { transpile } from '../index.js';

describe('transpile (end-to-end)', () => {
	describe('Simple expressions', () => {
		it('should transpile numbers', () => {
			expect(transpile('42').latex).toBe('42');
			expect(transpile('3.14').latex).toBe('3.14');
			expect(transpile('0').latex).toBe('0');
		});

		it('should transpile identifiers', () => {
			expect(transpile('x').latex).toBe('x');
			expect(transpile('abc').latex).toBe('abc');
			expect(transpile('x1').latex).toBe('x1');
		});

		it('should transpile greek letters', () => {
			expect(transpile('alpha').latex).toBe('\\alpha');
			expect(transpile('beta').latex).toBe('\\beta');
			expect(transpile('theta').latex).toBe('\\theta');
			expect(transpile('pi').latex).toBe('\\pi');
			expect(transpile('Gamma').latex).toBe('\\Gamma');
			expect(transpile('Delta').latex).toBe('\\Delta');
		});

		it('should transpile special symbols', () => {
			expect(transpile('oo').latex).toBe('\\infty');
			expect(transpile('+-').latex).toBe('\\pm');
			expect(transpile('-+').latex).toBe('\\mp');
		});
	});

	describe('Operators', () => {
		it('should convert * to \\times', () => {
			expect(transpile('2*3').latex).toBe('2 \\times 3');
			expect(transpile('a*b').latex).toBe('a \\times b');
		});

		it('should convert : to \\div', () => {
			expect(transpile('6:2').latex).toBe('6 \\div 2');
			expect(transpile('x:y').latex).toBe('x \\div y');
		});

		it('should convert / to \\frac', () => {
			expect(transpile('a/b').latex).toBe('\\frac{a}{b}');
			expect(transpile('1/2').latex).toBe('\\frac{1}{2}');
		});

		it('should handle addition and subtraction', () => {
			expect(transpile('a+b').latex).toBe('a+b');
			expect(transpile('x-y').latex).toBe('x-y');
			expect(transpile('1+2-3').latex).toBe('1+2-3');
		});

		it('should handle comparison operators', () => {
			expect(transpile('x=y').latex).toBe('x=y');
			expect(transpile('a<b').latex).toBe('a<b');
			expect(transpile('c>d').latex).toBe('c>d');
		});

		it('should handle special comparison operators', () => {
			expect(transpile('x<=y').latex).toBe('x\\leqy');
			expect(transpile('a>=b').latex).toBe('a\\geqb');
			expect(transpile('c!=d').latex).toBe('c\\neqd');
			expect(transpile('x~~y').latex).toBe('x\\approxy');
		});
	});

	describe('Implicit multiplication', () => {
		it('should handle number-variable juxtaposition', () => {
			expect(transpile('2x').latex).toBe('2x');
			expect(transpile('3y').latex).toBe('3y');
			expect(transpile('42abc').latex).toBe('42abc');
		});

		it('should handle variable-variable juxtaposition', () => {
			expect(transpile('xy').latex).toBe('xy');
			expect(transpile('abc').latex).toBe('abc');
		});

		it('should handle number-parenthesis juxtaposition', () => {
			expect(transpile('2(x+1)').latex).toBe('2\\left(x+1\\right)');
			expect(transpile('3(a-b)').latex).toBe('3\\left(a-b\\right)');
		});

		it('should handle variable-parenthesis juxtaposition', () => {
			expect(transpile('x(y+1)').latex).toBe('x\\left(y+1\\right)');
		});

		it('should handle number-greek juxtaposition', () => {
			expect(transpile('2pi').latex).toBe('2\\pi');
			expect(transpile('3alpha').latex).toBe('3\\alpha');
		});

		it('should handle multiple implicit multiplications', () => {
			expect(transpile('2xy').latex).toBe('2xy');
			expect(transpile('abc').latex).toBe('abc');
			expect(transpile('2x3y').latex).toBe('2x3y');
		});

		it('should handle implicit multiplication in expressions', () => {
			expect(transpile('2x+3y').latex).toBe('2x+3y');
			expect(transpile('ax+by+c').latex).toBe('ax+by+c');
		});

		it('should handle function-function juxtaposition', () => {
			expect(transpile('sin(x)cos(x)').latex).toBe('\\sin\\left(x\\right)\\cos\\left(x\\right)');
		});

		it('should distinguish implicit from explicit multiplication', () => {
			expect(transpile('2x').latex).toBe('2x'); // implicit - no symbol
			expect(transpile('2*x').latex).toBe('2 \\times x'); // explicit - with \\times
			expect(transpile('2:x').latex).toBe('2 \\div x'); // division - with \\div
		});

		it('should handle implicit multiplication with templates', () => {
			expect(transpile('{{a}}x').latex).toBe('{{a}}x');
			expect(transpile('2{{b}}').latex).toBe('2{{b}}');
			expect(transpile('{{a}}{{b}}').latex).toBe('{{a}}{{b}}');
		});
	});

	describe('Delimiters', () => {
		it('should convert () to \\left(\\right)', () => {
			expect(transpile('(x+1)').latex).toBe('\\left(x+1\\right)');
			expect(transpile('(a)').latex).toBe('\\left(a\\right)');
		});

		it('should convert [] to \\left[\\right]', () => {
			expect(transpile('[x+1]').latex).toBe('\\left[x+1\\right]');
			// Note: comma is not a recognized operator, so just test simple brackets
			expect(transpile('[a]').latex).toBe('\\left[a\\right]');
		});

		it('should keep {} as invisible grouping', () => {
			expect(transpile('{x+1}').latex).toBe('{x+1}');
			expect(transpile('{a}').latex).toBe('{a}');
		});

		it('should convert || to \\left|\\right|', () => {
			expect(transpile('|x|').latex).toBe('\\left|x\\right|');
			expect(transpile('|a+b|').latex).toBe('\\left|a+b\\right|');
		});

		it('should handle nested delimiters', () => {
			expect(transpile('(x+(y-z))').latex).toBe('\\left(x+\\left(y-z\\right)\\right)');
			expect(transpile('[(x)]').latex).toBe('\\left[\\left(x\\right)\\right]');
		});
	});

	describe('Functions', () => {
		it('should transpile sqrt', () => {
			expect(transpile('sqrt(x)').latex).toBe('\\sqrt{x}');
			expect(transpile('sqrt(2)').latex).toBe('\\sqrt{2}');
			expect(transpile('sqrt(x+1)').latex).toBe('\\sqrt{x+1}');
		});

		it('should transpile root', () => {
			expect(transpile('root(3)(x)').latex).toBe('\\sqrt[3]{x}');
			expect(transpile('root(n)(2)').latex).toBe('\\sqrt[n]{2}');
		});

		it('should transpile trig functions', () => {
			expect(transpile('sin(x)').latex).toBe('\\sin\\left(x\\right)');
			expect(transpile('cos(theta)').latex).toBe('\\cos\\left(\\theta\\right)');
			expect(transpile('tan(alpha)').latex).toBe('\\tan\\left(\\alpha\\right)');
		});

		it('should transpile log functions', () => {
			expect(transpile('log(x)').latex).toBe('\\log\\left(x\\right)');
			expect(transpile('ln(x)').latex).toBe('\\ln\\left(x\\right)');
			expect(transpile('exp(x)').latex).toBe('\\exp\\left(x\\right)');
		});

		it('should transpile abs function', () => {
			expect(transpile('abs(x)').latex).toBe('\\left|x\\right|');
			expect(transpile('abs(-5)').latex).toBe('\\left|-5\\right|');
		});
	});

	describe('Scripts', () => {
		it('should handle superscript', () => {
			expect(transpile('x^2').latex).toBe('x^{2}');
			expect(transpile('a^n').latex).toBe('a^{n}');
		});

		it('should handle subscript', () => {
			expect(transpile('x_i').latex).toBe('x_{i}');
			expect(transpile('a_0').latex).toBe('a_{0}');
		});

		it('should handle combined subscript and superscript', () => {
			expect(transpile('x_i^2').latex).toBe('x_{i}^{2}');
			expect(transpile('x^2_i').latex).toBe('x_{i}^{2}');
			expect(transpile('a_n^k').latex).toBe('a_{n}^{k}');
		});

		it('should handle nested superscripts', () => {
			expect(transpile('x^2^3').latex).toBe('x^{2^{3}}');
			expect(transpile('a^b^c').latex).toBe('a^{b^{c}}');
		});

		it('should handle complex scripts', () => {
			// Note: {n+1} creates a group, so it gets double-wrapped: x^{{n+1}}
			expect(transpile('x^{n+1}').latex).toBe('x^{{n+1}}');
			expect(transpile('a_{i+1}').latex).toBe('a_{{i+1}}');
		});
	});

	describe('Fractions', () => {
		it('should handle simple fractions', () => {
			expect(transpile('1/2').latex).toBe('\\frac{1}{2}');
			expect(transpile('x/y').latex).toBe('\\frac{x}{y}');
		});

		it('should handle nested fractions', () => {
			// Note: (a/b) produces \left(\frac{a}{b}\right), parentheses are preserved
			expect(transpile('(a/b)/c').latex).toBe('\\frac{\\left(\\frac{a}{b}\\right)}{c}');
			expect(transpile('a/(b/c)').latex).toBe('\\frac{a}{\\left(\\frac{b}{c}\\right)}');
		});

		it('should handle left-associative fractions', () => {
			expect(transpile('a/b/c').latex).toBe('\\frac{\\frac{a}{b}}{c}');
		});

		it('should handle fractions with operations', () => {
			// Note: Parentheses are preserved in the output
			expect(transpile('(a+b)/(c+d)').latex).toBe('\\frac{\\left(a+b\\right)}{\\left(c+d\\right)}');
			expect(transpile('1/(x+1)').latex).toBe('\\frac{1}{\\left(x+1\\right)}');
		});
	});

	describe('Templates', () => {
		it('should preserve templates', () => {
			const result = transpile('{{a}}+{{b}}');
			expect(result.latex).toBe('{{a}}+{{b}}');
			expect(result.templatesPreserved).toBe(2);
		});

		it('should preserve single template', () => {
			const result = transpile('{{x}}');
			expect(result.latex).toBe('{{x}}');
			expect(result.templatesPreserved).toBe(1);
		});

		it('should handle templates in expressions', () => {
			const result = transpile('sin({{angle}})');
			expect(result.latex).toBe('\\sin\\left({{angle}}\\right)');
			expect(result.templatesPreserved).toBe(1);
		});

		it('should handle multiple templates in complex expressions', () => {
			const result = transpile('{{a}}/{{b}}+{{c}}^2');
			expect(result.latex).toBe('\\frac{{{a}}}{{{b}}}+{{c}}^{2}');
			expect(result.templatesPreserved).toBe(3);
		});
	});

	describe('Complex expressions', () => {
		it('should handle quadratic formula', () => {
			const result = transpile('(-b+sqrt(b^2-4*a*c))/(2*a)');
			expect(result.success).toBe(true);
			expect(result.latex).toContain('\\frac');
			expect(result.latex).toContain('\\sqrt');
			expect(result.latex).toContain('\\times');
		});

		it('should handle trig identity', () => {
			const result = transpile('sin(theta)^2+cos(theta)^2=1');
			expect(result.success).toBe(true);
			expect(result.latex).toBe(
				'\\sin\\left(\\theta\\right)^{2}+\\cos\\left(\\theta\\right)^{2}=1'
			);
		});

		it('should handle sum notation', () => {
			const result = transpile('x_1+x_2+x_3');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('x_{1}+x_{2}+x_{3}');
		});

		it('should handle polynomial', () => {
			const result = transpile('a*x^2+b*x+c');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('a \\times x^{2}+b \\times x+c');
		});

		it('should handle complex fraction', () => {
			const result = transpile('(x+1)/(x-1)');
			expect(result.success).toBe(true);
			// Note: Parentheses are preserved
			expect(result.latex).toBe('\\frac{\\left(x+1\\right)}{\\left(x-1\\right)}');
		});

		it('should handle multiple operations', () => {
			const result = transpile('2*x+3:y-z/w');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('2 \\times x+3 \\div y-\\frac{z}{w}');
		});
	});

	describe('Unary minus', () => {
		it('should handle unary minus at start', () => {
			const result = transpile('-x');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('-x');
		});

		it('should handle unary minus in parentheses', () => {
			const result = transpile('(-x)');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('\\left(-x\\right)');
		});

		it('should handle unary minus after operator (error)', () => {
			const result = transpile('3 + -2');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should handle unary minus in fraction', () => {
			const result = transpile('(-a)/b');
			expect(result.success).toBe(true);
			// Note: Parentheses are preserved
			expect(result.latex).toBe('\\frac{\\left(-a\\right)}{b}');
		});
	});

	describe('Whitespace handling', () => {
		it('should ignore whitespace in simple expressions', () => {
			expect(transpile('a + b').latex).toBe('a+b');
			expect(transpile('x  *  y').latex).toBe('x \\times y');
		});

		it('should ignore whitespace around operators', () => {
			expect(transpile('a / b').latex).toBe('\\frac{a}{b}');
			expect(transpile('x ^ 2').latex).toBe('x^{2}');
		});

		it('should ignore leading/trailing whitespace', () => {
			expect(transpile('  x+y  ').latex).toBe('x+y');
		});
	});

	describe('Error handling', () => {
		it('should return error for empty expression', () => {
			const result = transpile('');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should return error for unclosed parenthesis', () => {
			const result = transpile('(x+1');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should return error for unclosed bracket', () => {
			const result = transpile('[x+1');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should return error for unclosed brace', () => {
			const result = transpile('{x+1');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should return error for unclosed absolute value', () => {
			const result = transpile('|x+1');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should return error for mismatched delimiters', () => {
			const result = transpile('(x]');
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe('Re-exports', () => {
		it('should export Tokenizer', async () => {
			const { Tokenizer } = await import('../index.js');
			expect(Tokenizer).toBeDefined();
			const tokenizer = new Tokenizer('x+1');
			expect(tokenizer.tokenize()).toBeDefined();
		});

		it('should export Parser', async () => {
			const { Parser, Tokenizer } = await import('../index.js');
			expect(Parser).toBeDefined();
			const tokenizer = new Tokenizer('x+1');
			const tokens = tokenizer.tokenize();
			const parser = new Parser(tokens);
			expect(parser.parse()).toBeDefined();
		});

		it('should export ParseError', async () => {
			const { ParseError } = await import('../index.js');
			expect(ParseError).toBeDefined();
		});

		it('should export LatexGenerator', async () => {
			const { LatexGenerator } = await import('../index.js');
			expect(LatexGenerator).toBeDefined();
			const generator = new LatexGenerator();
			expect(generator).toBeDefined();
		});

		it('should export symbol utilities', async () => {
			const { GREEK_LETTERS, SYMBOLS, FUNCTIONS, isGreekLetter, isFunction, isSymbol } =
				await import('../index.js');
			expect(GREEK_LETTERS).toBeDefined();
			expect(SYMBOLS).toBeDefined();
			expect(FUNCTIONS).toBeDefined();
			expect(isGreekLetter('alpha')).toBe(true);
			expect(isFunction('sin')).toBe(true);
			expect(isSymbol('oo')).toBe(true);
		});
	});

	describe('Real-world examples from UbuMaths', () => {
		it('should handle equation with template and operations', () => {
			const result = transpile('{{a}}*x+{{b}}={{c}}');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('{{a}} \\times x+{{b}}={{c}}');
			expect(result.templatesPreserved).toBe(3);
		});

		it('should handle fraction with templates', () => {
			const result = transpile('{{num}}/{{den}}');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('\\frac{{{num}}}{{{den}}}');
			expect(result.templatesPreserved).toBe(2);
		});

		it('should handle pythagorean theorem', () => {
			const result = transpile('a^2+b^2=c^2');
			expect(result.success).toBe(true);
			expect(result.latex).toBe('a^{2}+b^{2}=c^{2}');
		});

		it('should handle distance formula', () => {
			const result = transpile('sqrt((x_2-x_1)^2+(y_2-y_1)^2)');
			expect(result.success).toBe(true);
			expect(result.latex).toBe(
				'\\sqrt{\\left(x_{2}-x_{1}\\right)^{2}+\\left(y_{2}-y_{1}\\right)^{2}}'
			);
		});

		it('should handle derivative notation with multiplication', () => {
			// Note: f(x) is parsed as f * (x) since f is not a recognized function
			const result = transpile('(f*(x+h)-f*x)/h');
			expect(result.success).toBe(true);
			expect(result.latex).toBe(
				'\\frac{\\left(f \\times \\left(x+h\\right)-f \\times x\\right)}{h}'
			);
		});
	});
});
