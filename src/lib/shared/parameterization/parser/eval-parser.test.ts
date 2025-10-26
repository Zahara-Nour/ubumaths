/**
 * Eval Parser Tests
 * ==================
 *
 * Comprehensive tests for parsing expression evaluation tokens in dual syntax.
 * Tests simple expressions, complex LaTeX, nested variables, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseEvalExpression } from './eval-parser';

describe('parseEvalExpression - Questions syntax', () => {
	describe('Simple expressions', () => {
		it('should parse simple addition', () => {
			expect(parseEvalExpression('{eval:a+b}', 'questions')).toBe('a+b');
		});

		it('should parse simple subtraction', () => {
			expect(parseEvalExpression('{eval:a-b}', 'questions')).toBe('a-b');
		});

		it('should parse simple multiplication', () => {
			expect(parseEvalExpression('{eval:a*b}', 'questions')).toBe('a*b');
		});

		it('should parse simple division', () => {
			expect(parseEvalExpression('{eval:a/b}', 'questions')).toBe('a/b');
		});

		it('should parse simple exponentiation', () => {
			expect(parseEvalExpression('{eval:a^2}', 'questions')).toBe('a^2');
		});

		it('should parse complex arithmetic expression', () => {
			expect(parseEvalExpression('{eval:2*a+3*b-c/5}', 'questions')).toBe('2*a+3*b-c/5');
		});
	});

	describe('Expressions with variable references', () => {
		it('should parse expression with single variable reference', () => {
			expect(parseEvalExpression('{eval:{@:a}+5}', 'questions')).toBe('{@:a}+5');
		});

		it('should parse expression with multiple variable references', () => {
			expect(parseEvalExpression('{eval:{@:a}+{@:b}}', 'questions')).toBe('{@:a}+{@:b}');
		});

		it('should parse complex expression with variables', () => {
			expect(parseEvalExpression('{eval:2*{@:a}-{@:b}/3}', 'questions')).toBe('2*{@:a}-{@:b}/3');
		});

		it('should preserve nested braces in variables', () => {
			const expr = parseEvalExpression('{eval:({@:a}-{@:b})/({@:c}+{@:d})}', 'questions');
			expect(expr).toBe('({@:a}-{@:b})/({@:c}+{@:d})');
		});
	});

	describe('LaTeX expressions', () => {
		it('should parse LaTeX fraction', () => {
			expect(parseEvalExpression('{eval:\\frac{a}{b}}', 'questions')).toBe('\\frac{a}{b}');
		});

		it('should parse LaTeX square root', () => {
			expect(parseEvalExpression('{eval:\\sqrt{a}}', 'questions')).toBe('\\sqrt{a}');
		});

		it('should parse complex LaTeX expression', () => {
			const expr = parseEvalExpression('{eval:\\frac{-b+\\sqrt{b^2-4ac}}{2a}}', 'questions');
			expect(expr).toBe('\\frac{-b+\\sqrt{b^2-4ac}}{2a}');
		});

		it('should parse LaTeX with variable references', () => {
			const expr = parseEvalExpression('{eval:\\frac{{@:num}}{{@:den}}}', 'questions');
			expect(expr).toBe('\\frac{{@:num}}{{@:den}}');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for variable token', () => {
			expect(parseEvalExpression('{@:a}', 'questions')).toBeNull();
		});

		it('should return null for random token', () => {
			expect(parseEvalExpression('{#:1-10}', 'questions')).toBeNull();
		});

		it('should return empty string for empty expression', () => {
			// Empty expression is valid but empty
			expect(parseEvalExpression('{eval:}', 'questions')).toBe('');
		});

		it('should return null for incomplete token', () => {
			expect(parseEvalExpression('{eval:a+b', 'questions')).toBeNull();
		});

		it('should return null for malformed token', () => {
			expect(parseEvalExpression('eval:a+b}', 'questions')).toBeNull();
		});
	});
});

describe('parseEvalExpression - Markdown syntax', () => {
	describe('Simple expressions', () => {
		it('should parse simple addition', () => {
			expect(parseEvalExpression('{{eval:a+b}}', 'markdown')).toBe('a+b');
		});

		it('should parse complex arithmetic expression', () => {
			expect(parseEvalExpression('{{eval:2*a+3*b-c/5}}', 'markdown')).toBe('2*a+3*b-c/5');
		});
	});

	describe('Expressions with variable references', () => {
		it('should parse expression with Markdown variable references', () => {
			expect(parseEvalExpression('{{eval:{{a}}+{{b}}}}', 'markdown')).toBe('{{a}}+{{b}}');
		});

		it('should parse complex expression with Markdown variables', () => {
			const expr = parseEvalExpression('{{eval:2*{{a}}-{{b}}/3}}', 'markdown');
			expect(expr).toBe('2*{{a}}-{{b}}/3');
		});

		it('should preserve nested braces in Markdown variables', () => {
			const expr = parseEvalExpression('{{eval:({{a}}-{{b}})/({{c}}+{{d}})}}', 'markdown');
			expect(expr).toBe('({{a}}-{{b}})/({{c}}+{{d}})');
		});
	});

	describe('LaTeX expressions', () => {
		it('should parse LaTeX fraction', () => {
			expect(parseEvalExpression('{{eval:\\frac{a}{b}}}', 'markdown')).toBe('\\frac{a}{b}');
		});

		it('should parse LaTeX with Markdown variable references', () => {
			const expr = parseEvalExpression('{{eval:\\frac{{{num}}}{{{den}}}}}', 'markdown');
			expect(expr).toBe('\\frac{{{num}}}{{{den}}}');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for variable token', () => {
			expect(parseEvalExpression('{{a}}', 'markdown')).toBeNull();
		});

		it('should return null for random token', () => {
			expect(parseEvalExpression('{{random:1-10}}', 'markdown')).toBeNull();
		});

		it('should return empty string for empty expression', () => {
			// Empty expression is valid but empty
			expect(parseEvalExpression('{{eval:}}', 'markdown')).toBe('');
		});
	});
});

describe('parseEvalExpression - Auto-detection', () => {
	it('should auto-detect Questions syntax', () => {
		expect(parseEvalExpression('{eval:a+b}')).toBe('a+b');
	});

	it('should auto-detect Markdown syntax', () => {
		expect(parseEvalExpression('{{eval:a+b}}')).toBe('a+b');
	});

	it('should parse Questions syntax without explicit parameter', () => {
		expect(parseEvalExpression('{eval:x*y}')).toBe('x*y');
	});

	it('should parse Markdown syntax without explicit parameter', () => {
		expect(parseEvalExpression('{{eval:x*y}}')).toBe('x*y');
	});
});

describe('parseEvalExpression - Syntax parameter variations', () => {
	it('should parse with explicit questions syntax', () => {
		expect(parseEvalExpression('{eval:a+b}', 'questions')).toBe('a+b');
	});

	it('should parse with explicit markdown syntax', () => {
		expect(parseEvalExpression('{{eval:a+b}}', 'markdown')).toBe('a+b');
	});

	it('should parse with both syntax (Questions)', () => {
		expect(parseEvalExpression('{eval:a+b}', 'both')).toBe('a+b');
	});

	it('should parse with both syntax (Markdown)', () => {
		expect(parseEvalExpression('{{eval:a+b}}', 'both')).toBe('a+b');
	});

	it('should return null when wrong syntax specified', () => {
		expect(parseEvalExpression('{{eval:a+b}}', 'questions')).toBeNull();
		expect(parseEvalExpression('{eval:a+b}', 'markdown')).toBeNull();
	});
});

describe('parseEvalExpression - Edge cases', () => {
	it('should handle expressions with parentheses', () => {
		expect(parseEvalExpression('{eval:(a+b)*(c-d)}', 'questions')).toBe('(a+b)*(c-d)');
	});

	it('should handle expressions with spaces', () => {
		expect(parseEvalExpression('{eval:a + b * c}', 'questions')).toBe('a + b * c');
	});

	it('should handle expressions with numbers', () => {
		expect(parseEvalExpression('{eval:2*3.14*r}', 'questions')).toBe('2*3.14*r');
	});

	it('should handle negative numbers', () => {
		expect(parseEvalExpression('{eval:-5+a}', 'questions')).toBe('-5+a');
	});

	it('should handle very long expressions', () => {
		const longExpr = 'a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p';
		expect(parseEvalExpression(`{eval:${longExpr}}`, 'questions')).toBe(longExpr);
	});

	it('should handle function calls', () => {
		expect(parseEvalExpression('{eval:sqrt(a^2+b^2)}', 'questions')).toBe('sqrt(a^2+b^2)');
	});

	it('should handle nested function calls', () => {
		expect(parseEvalExpression('{eval:sin(cos(x))}', 'questions')).toBe('sin(cos(x))');
	});

	it('should handle special characters', () => {
		expect(parseEvalExpression('{eval:a%b}', 'questions')).toBe('a%b');
	});

	it('should preserve all content between delimiters', () => {
		const complexExpr = '{@:a}*{@:b}+{#:1-10}-{eval:c+d}';
		expect(parseEvalExpression(`{eval:${complexExpr}}`, 'questions')).toBe(complexExpr);
	});

	it('should handle empty string input', () => {
		expect(parseEvalExpression('', 'questions')).toBeNull();
	});

	it('should distinguish from similar patterns', () => {
		expect(parseEvalExpression('prefix{eval:a+b}suffix', 'questions')).toBeNull();
	});
});
