/**
 * Tests for LaTeX Generator
 *
 * Validates the conversion of AST nodes to LaTeX strings.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LatexGenerator } from '../generator.js';
import type {
	ASTNode,
	NumberNode,
	IdentifierNode,
	GreekNode,
	SymbolNode,
	TemplateNode,
	GroupNode,
	ParenNode,
	AbsNode,
	BinaryOpNode,
	UnaryOpNode,
	FractionNode,
	SuperscriptNode,
	SubscriptNode,
	SubSupNode,
	FunctionNode,
	RootNode
} from '../types.js';

/**
 * Helper to create AST nodes with minimal boilerplate
 */
const createNode = {
	number: (value: string): NumberNode => ({
		type: 'Number',
		value,
		start: 0,
		end: 0
	}),

	identifier: (name: string): IdentifierNode => ({
		type: 'Identifier',
		name,
		start: 0,
		end: 0
	}),

	greek: (name: string): GreekNode => ({
		type: 'Greek',
		name,
		start: 0,
		end: 0
	}),

	symbol: (name: string): SymbolNode => ({
		type: 'Symbol',
		name,
		start: 0,
		end: 0
	}),

	template: (content: string): TemplateNode => ({
		type: 'Template',
		content,
		start: 0,
		end: 0
	}),

	group: (expression: ASTNode): GroupNode => ({
		type: 'Group',
		expression,
		start: 0,
		end: 0
	}),

	paren: (expression: ASTNode, bracket: '(' | '['): ParenNode => ({
		type: 'Paren',
		expression,
		bracket,
		start: 0,
		end: 0
	}),

	abs: (expression: ASTNode): AbsNode => ({
		type: 'Abs',
		expression,
		start: 0,
		end: 0
	}),

	binaryOp: (operator: string, left: ASTNode, right: ASTNode): BinaryOpNode => ({
		type: 'BinaryOp',
		operator,
		left,
		right,
		start: 0,
		end: 0
	}),

	unaryOp: (operator: string, operand: ASTNode): UnaryOpNode => ({
		type: 'UnaryOp',
		operator,
		operand,
		start: 0,
		end: 0
	}),

	fraction: (numerator: ASTNode, denominator: ASTNode): FractionNode => ({
		type: 'Fraction',
		numerator,
		denominator,
		start: 0,
		end: 0
	}),

	superscript: (base: ASTNode, exponent: ASTNode): SuperscriptNode => ({
		type: 'Superscript',
		base,
		exponent,
		start: 0,
		end: 0
	}),

	subscript: (base: ASTNode, subscript: ASTNode): SubscriptNode => ({
		type: 'Subscript',
		base,
		subscript,
		start: 0,
		end: 0
	}),

	subSup: (base: ASTNode, subscript: ASTNode, superscript: ASTNode): SubSupNode => ({
		type: 'SubSup',
		base,
		subscript,
		superscript,
		start: 0,
		end: 0
	}),

	function: (name: string, argument: ASTNode): FunctionNode => ({
		type: 'Function',
		name,
		argument,
		start: 0,
		end: 0
	}),

	root: (index: ASTNode, radicand: ASTNode): RootNode => ({
		type: 'Root',
		index,
		radicand,
		start: 0,
		end: 0
	})
};

describe('LatexGenerator', () => {
	let generator: LatexGenerator;

	beforeEach(() => {
		generator = new LatexGenerator();
	});

	describe('Literals', () => {
		it('generates LaTeX for numbers', () => {
			const node = createNode.number('123');
			const result = generator.generate(node);
			expect(result.latex).toBe('123');
			expect(result.templatesPreserved).toBe(0);
		});

		it('generates LaTeX for decimal numbers', () => {
			const node = createNode.number('3.14');
			const result = generator.generate(node);
			expect(result.latex).toBe('3.14');
		});

		it('generates LaTeX for identifiers', () => {
			const node = createNode.identifier('x');
			const result = generator.generate(node);
			expect(result.latex).toBe('x');
		});

		it('generates LaTeX for multi-character identifiers', () => {
			const node = createNode.identifier('abc');
			const result = generator.generate(node);
			expect(result.latex).toBe('abc');
		});

		it('generates LaTeX for Greek letters', () => {
			const testCases = [
				{ input: 'alpha', expected: '\\alpha' },
				{ input: 'beta', expected: '\\beta' },
				{ input: 'gamma', expected: '\\gamma' },
				{ input: 'delta', expected: '\\delta' },
				{ input: 'pi', expected: '\\pi' },
				{ input: 'theta', expected: '\\theta' },
				{ input: 'Gamma', expected: '\\Gamma' },
				{ input: 'Delta', expected: '\\Delta' },
				{ input: 'Omega', expected: '\\Omega' }
			];

			testCases.forEach(({ input, expected }) => {
				const node = createNode.greek(input);
				const result = generator.generate(node);
				expect(result.latex).toBe(expected);
			});
		});

		it('generates LaTeX for symbols', () => {
			const testCases = [
				{ input: 'oo', expected: '\\infty' },
				{ input: '+-', expected: '\\pm' },
				{ input: '-+', expected: '\\mp' }
			];

			testCases.forEach(({ input, expected }) => {
				const node = createNode.symbol(input);
				const result = generator.generate(node);
				expect(result.latex).toBe(expected);
			});
		});
	});

	describe('Templates', () => {
		it('preserves template placeholders exactly', () => {
			const node = createNode.template('x');
			const result = generator.generate(node);
			expect(result.latex).toBe('{{x}}');
			expect(result.templatesPreserved).toBe(1);
		});

		it('counts multiple template placeholders', () => {
			// Create expression: {{a}} + {{b}}
			const node = createNode.binaryOp('+', createNode.template('a'), createNode.template('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('{{a}}+{{b}}');
			expect(result.templatesPreserved).toBe(2);
		});

		it('preserves complex template content', () => {
			const node = createNode.template('variable_name_123');
			const result = generator.generate(node);
			expect(result.latex).toBe('{{variable_name_123}}');
		});
	});

	describe('Groups', () => {
		it('generates LaTeX for curly brace groups', () => {
			const node = createNode.group(
				createNode.binaryOp('+', createNode.identifier('x'), createNode.identifier('y'))
			);
			const result = generator.generate(node);
			expect(result.latex).toBe('{x+y}');
		});

		it('generates LaTeX for parentheses', () => {
			const node = createNode.paren(
				createNode.binaryOp('+', createNode.identifier('x'), createNode.identifier('y')),
				'('
			);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\left(x+y\\right)');
		});

		it('generates LaTeX for square brackets', () => {
			const node = createNode.paren(
				createNode.binaryOp(',', createNode.identifier('a'), createNode.identifier('b')),
				'['
			);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\left[a,b\\right]');
		});

		it('generates LaTeX for absolute value', () => {
			const node = createNode.abs(createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\left|x\\right|');
		});

		it('generates LaTeX for nested absolute value', () => {
			const node = createNode.abs(
				createNode.binaryOp('+', createNode.identifier('x'), createNode.identifier('y'))
			);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\left|x+y\\right|');
		});
	});

	describe('Binary Operations', () => {
		it('generates LaTeX for addition', () => {
			const node = createNode.binaryOp('+', createNode.identifier('a'), createNode.identifier('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('a+b');
		});

		it('generates LaTeX for subtraction', () => {
			const node = createNode.binaryOp('-', createNode.identifier('a'), createNode.identifier('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('a-b');
		});

		it('generates LaTeX for multiplication with \\times', () => {
			const node = createNode.binaryOp('*', createNode.identifier('a'), createNode.identifier('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('a \\times b');
		});

		it('generates LaTeX for division with \\div', () => {
			const node = createNode.binaryOp(':', createNode.identifier('a'), createNode.identifier('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('a \\div b');
		});

		it('generates LaTeX for equality', () => {
			const node = createNode.binaryOp('=', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x=5');
		});

		it('generates LaTeX for less than', () => {
			const node = createNode.binaryOp('<', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x<5');
		});

		it('generates LaTeX for greater than', () => {
			const node = createNode.binaryOp('>', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x>5');
		});

		it('generates LaTeX for less than or equal', () => {
			const node = createNode.binaryOp('<=', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x\\leq5');
		});

		it('generates LaTeX for greater than or equal', () => {
			const node = createNode.binaryOp('>=', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x\\geq5');
		});

		it('generates LaTeX for not equal', () => {
			const node = createNode.binaryOp('!=', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x\\neq5');
		});

		it('generates LaTeX for approximately equal', () => {
			const node = createNode.binaryOp('~~', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x\\approx5');
		});

		it('generates LaTeX for equivalent', () => {
			const node = createNode.binaryOp('-=', createNode.identifier('x'), createNode.number('5'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x\\equiv5');
		});
	});

	describe('Unary Operations', () => {
		it('generates LaTeX for negation', () => {
			const node = createNode.unaryOp('-', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('-x');
		});

		it('generates LaTeX for positive sign', () => {
			const node = createNode.unaryOp('+', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('+x');
		});
	});

	describe('Fractions', () => {
		it('generates LaTeX for simple fractions', () => {
			const node = createNode.fraction(createNode.identifier('a'), createNode.identifier('b'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{a}{b}');
		});

		it('generates LaTeX for numeric fractions', () => {
			const node = createNode.fraction(createNode.number('1'), createNode.number('2'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{1}{2}');
		});

		it('generates LaTeX for nested fractions', () => {
			// (a/b)/(c/d)
			const numerator = createNode.fraction(createNode.identifier('a'), createNode.identifier('b'));
			const denominator = createNode.fraction(
				createNode.identifier('c'),
				createNode.identifier('d')
			);
			const node = createNode.fraction(numerator, denominator);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{\\frac{a}{b}}{\\frac{c}{d}}');
		});

		it('generates LaTeX for complex numerator', () => {
			// (x+y)/z
			const numerator = createNode.binaryOp(
				'+',
				createNode.identifier('x'),
				createNode.identifier('y')
			);
			const node = createNode.fraction(numerator, createNode.identifier('z'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{x+y}{z}');
		});
	});

	describe('Scripts', () => {
		it('generates LaTeX for superscript', () => {
			const node = createNode.superscript(createNode.identifier('x'), createNode.number('2'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x^{2}');
		});

		it('generates LaTeX for subscript', () => {
			const node = createNode.subscript(createNode.identifier('x'), createNode.identifier('i'));
			const result = generator.generate(node);
			expect(result.latex).toBe('x_{i}');
		});

		it('generates LaTeX for combined subscript and superscript', () => {
			const node = createNode.subSup(
				createNode.identifier('x'),
				createNode.identifier('i'),
				createNode.number('2')
			);
			const result = generator.generate(node);
			expect(result.latex).toBe('x_{i}^{2}');
		});

		it('generates LaTeX for nested superscripts', () => {
			// x^(y^2)
			const exponent = createNode.superscript(createNode.identifier('y'), createNode.number('2'));
			const node = createNode.superscript(createNode.identifier('x'), exponent);
			const result = generator.generate(node);
			expect(result.latex).toBe('x^{y^{2}}');
		});
	});

	describe('Functions', () => {
		it('generates LaTeX for sqrt', () => {
			const node = createNode.function('sqrt', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\sqrt{x}');
		});

		it('generates LaTeX for sqrt with expression', () => {
			const arg = createNode.binaryOp('+', createNode.identifier('a'), createNode.identifier('b'));
			const node = createNode.function('sqrt', arg);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\sqrt{a+b}');
		});

		it('generates LaTeX for sin', () => {
			const node = createNode.function('sin', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\sin\\left(x\\right)');
		});

		it('generates LaTeX for cos', () => {
			const node = createNode.function('cos', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\cos\\left(x\\right)');
		});

		it('generates LaTeX for tan', () => {
			const node = createNode.function('tan', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\tan\\left(x\\right)');
		});

		it('generates LaTeX for log', () => {
			const node = createNode.function('log', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\log\\left(x\\right)');
		});

		it('generates LaTeX for ln', () => {
			const node = createNode.function('ln', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\ln\\left(x\\right)');
		});

		it('generates LaTeX for exp', () => {
			const node = createNode.function('exp', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\exp\\left(x\\right)');
		});

		it('generates LaTeX for abs function', () => {
			const node = createNode.function('abs', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\left|x\\right|');
		});

		it('generates LaTeX for unknown function', () => {
			const node = createNode.function('myFunc', createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\text{myFunc}\\left(x\\right)');
		});
	});

	describe('Root', () => {
		it('generates LaTeX for nth root', () => {
			const node = createNode.root(createNode.number('3'), createNode.identifier('x'));
			const result = generator.generate(node);
			expect(result.latex).toBe('\\sqrt[3]{x}');
		});

		it('generates LaTeX for root with expression', () => {
			const radicand = createNode.binaryOp(
				'+',
				createNode.identifier('a'),
				createNode.identifier('b')
			);
			const node = createNode.root(createNode.identifier('n'), radicand);
			const result = generator.generate(node);
			expect(result.latex).toBe('\\sqrt[n]{a+b}');
		});
	});

	describe('Complex Expressions', () => {
		it('generates LaTeX for quadratic formula', () => {
			// (-b + sqrt(b^2 - 4*a*c)) / (2*a)
			// Build b^2
			const bSquared = createNode.superscript(createNode.identifier('b'), createNode.number('2'));

			// Build 4*a*c
			const fourA = createNode.binaryOp('*', createNode.number('4'), createNode.identifier('a'));
			const fourAC = createNode.binaryOp('*', fourA, createNode.identifier('c'));

			// Build b^2 - 4*a*c
			const discriminant = createNode.binaryOp('-', bSquared, fourAC);

			// Build sqrt(b^2 - 4*a*c)
			const sqrtDiscriminant = createNode.function('sqrt', discriminant);

			// Build -b
			const negB = createNode.unaryOp('-', createNode.identifier('b'));

			// Build -b + sqrt(...)
			const numerator = createNode.binaryOp('+', negB, sqrtDiscriminant);

			// Build 2*a
			const denominator = createNode.binaryOp(
				'*',
				createNode.number('2'),
				createNode.identifier('a')
			);

			// Build full fraction
			const node = createNode.fraction(numerator, denominator);

			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{-b+\\sqrt{b^{2}-4 \\times a \\times c}}{2 \\times a}');
		});

		it('generates LaTeX for trigonometric identity', () => {
			// sin^2(x) + cos^2(x)
			const sinX = createNode.function('sin', createNode.identifier('x'));
			const sinSquared = createNode.superscript(sinX, createNode.number('2'));

			const cosX = createNode.function('cos', createNode.identifier('x'));
			const cosSquared = createNode.superscript(cosX, createNode.number('2'));

			const node = createNode.binaryOp('+', sinSquared, cosSquared);

			const result = generator.generate(node);
			expect(result.latex).toBe('\\sin\\left(x\\right)^{2}+\\cos\\left(x\\right)^{2}');
		});

		it('generates LaTeX for expression with multiple templates', () => {
			// {{a}}*x^2 + {{b}}*x + {{c}}
			const aX2 = createNode.binaryOp(
				'*',
				createNode.template('a'),
				createNode.superscript(createNode.identifier('x'), createNode.number('2'))
			);

			const bX = createNode.binaryOp('*', createNode.template('b'), createNode.identifier('x'));

			const first = createNode.binaryOp('+', aX2, bX);
			const node = createNode.binaryOp('+', first, createNode.template('c'));

			const result = generator.generate(node);
			expect(result.latex).toBe('{{a}} \\times x^{2}+{{b}} \\times x+{{c}}');
			expect(result.templatesPreserved).toBe(3);
		});

		it('generates LaTeX for complex fraction with Greek letters', () => {
			// (alpha + beta) / (gamma * delta)
			const numerator = createNode.binaryOp(
				'+',
				createNode.greek('alpha'),
				createNode.greek('beta')
			);

			const denominator = createNode.binaryOp(
				'*',
				createNode.greek('gamma'),
				createNode.greek('delta')
			);

			const node = createNode.fraction(numerator, denominator);

			const result = generator.generate(node);
			expect(result.latex).toBe('\\frac{\\alpha+\\beta}{\\gamma \\times \\delta}');
		});
	});

	describe('Edge Cases', () => {
		it('handles deeply nested expressions', () => {
			// ((((x))))
			let node: ASTNode = createNode.identifier('x');
			for (let i = 0; i < 4; i++) {
				node = createNode.paren(node, '(');
			}

			const result = generator.generate(node);
			expect(result.latex).toBe('\\left(\\left(\\left(\\left(x\\right)\\right)\\right)\\right)');
		});

		it('handles mixed grouping symbols', () => {
			// [({x})]
			let node: ASTNode = createNode.identifier('x');
			node = createNode.group(node);
			node = createNode.paren(node, '(');
			node = createNode.paren(node, '[');

			const result = generator.generate(node);
			expect(result.latex).toBe('\\left[\\left({x}\\right)\\right]');
		});

		it('handles multiple consecutive operators', () => {
			// a+b-c*d
			const mult = createNode.binaryOp('*', createNode.identifier('c'), createNode.identifier('d'));
			const sub = createNode.binaryOp('-', createNode.identifier('b'), mult);
			const node = createNode.binaryOp('+', createNode.identifier('a'), sub);

			const result = generator.generate(node);
			expect(result.latex).toBe('a+b-c \\times d');
		});

		it('resets template count between generations', () => {
			const node1 = createNode.template('a');
			const result1 = generator.generate(node1);
			expect(result1.templatesPreserved).toBe(1);

			const node2 = createNode.template('b');
			const result2 = generator.generate(node2);
			expect(result2.templatesPreserved).toBe(1);
		});
	});
});
