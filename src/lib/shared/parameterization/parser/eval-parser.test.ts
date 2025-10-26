/**
 * Eval Parser Tests
 * ==================
 *
 * Comprehensive tests for parsing expression evaluation tokens in Markdown syntax.
 * Tests simple expressions, complex LaTeX, nested variables, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseEvalExpression } from './eval-parser';

describe('parseEvalExpression - Markdown syntax', () => {
	describe('Simple expressions', () => {
		it('should parse simple addition', () => {
			expect(parseEvalExpression('{{eval:a+b}}')).toBe('a+b');
		});

		it('should parse complex arithmetic expression', () => {
			expect(parseEvalExpression('{{eval:2*a+3*b-c/5}}')).toBe('2*a+3*b-c/5');
		});
	});

	describe('Expressions with variable references', () => {
		it('should parse expression with Markdown variable references', () => {
			expect(parseEvalExpression('{{eval:{{a}}+{{b}}}}')).toBe('{{a}}+{{b}}');
		});

		it('should parse complex expression with Markdown variables', () => {
			const expr = parseEvalExpression('{{eval:2*{{a}}-{{b}}/3}}');
			expect(expr).toBe('2*{{a}}-{{b}}/3');
		});

		it('should preserve nested braces in Markdown variables', () => {
			const expr = parseEvalExpression('{{eval:({{a}}-{{b}})/({{c}}+{{d}})}}');
			expect(expr).toBe('({{a}}-{{b}})/({{c}}+{{d}})');
		});
	});

	describe('LaTeX expressions', () => {
		it('should parse LaTeX fraction', () => {
			expect(parseEvalExpression('{{eval:\\frac{a}{b}}}')).toBe('\\frac{a}{b}');
		});

		it('should parse LaTeX with Markdown variable references', () => {
			const expr = parseEvalExpression('{{eval:\\frac{{{num}}}{{{den}}}}}');
			expect(expr).toBe('\\frac{{{num}}}{{{den}}}');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for variable token', () => {
			expect(parseEvalExpression('{{a}}')).toBeNull();
		});

		it('should return null for random token', () => {
			expect(parseEvalExpression('{{random:1-10}}')).toBeNull();
		});

		it('should return empty string for empty expression', () => {
			// Empty expression is valid but empty
			expect(parseEvalExpression('{{eval:}}')).toBe('');
		});
	});
});

describe('parseEvalExpression - Auto-detection', () => {
	it('should auto-detect Markdown syntax', () => {
		expect(parseEvalExpression('{{eval:a+b}}')).toBe('a+b');
	});

	it('should parse Markdown syntax without explicit parameter', () => {
		expect(parseEvalExpression('{{eval:x*y}}')).toBe('x*y');
	});
});

describe('parseEvalExpression - Edge cases', () => {
	it('should handle expressions with parentheses', () => {
		expect(parseEvalExpression('{{eval:(a+b)*(c-d)}}')).toBe('(a+b)*(c-d)');
	});

	it('should handle expressions with spaces', () => {
		expect(parseEvalExpression('{{eval:a + b * c}}')).toBe('a + b * c');
	});

	it('should handle expressions with numbers', () => {
		expect(parseEvalExpression('{{eval:2*3.14*r}}')).toBe('2*3.14*r');
	});

	it('should handle negative numbers', () => {
		expect(parseEvalExpression('{{eval:-5+a}}')).toBe('-5+a');
	});

	it('should handle very long expressions', () => {
		const longExpr = 'a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p';
		expect(parseEvalExpression(`{{eval:${longExpr}}}`)).toBe(longExpr);
	});

	it('should handle function calls', () => {
		expect(parseEvalExpression('{{eval:sqrt(a^2+b^2)}}')).toBe('sqrt(a^2+b^2)');
	});

	it('should handle nested function calls', () => {
		expect(parseEvalExpression('{{eval:sin(cos(x))}}')).toBe('sin(cos(x))');
	});

	it('should handle special characters', () => {
		expect(parseEvalExpression('{{eval:a%b}}')).toBe('a%b');
	});

	it('should preserve all content between delimiters', () => {
		const complexExpr = '{{a}}*{{b}}+{{random:1-10}}-{{eval:c+d}}';
		expect(parseEvalExpression(`{{eval:${complexExpr}}}`)).toBe(complexExpr);
	});

	it('should handle empty string input', () => {
		expect(parseEvalExpression('')).toBeNull();
	});

	it('should distinguish from similar patterns', () => {
		expect(parseEvalExpression('prefix{{eval:a+b}}suffix')).toBeNull();
	});
});
