/**
 * Eval Parser Tests
 * ==================
 *
 * Comprehensive tests for parsing expression evaluation tokens in Markdown syntax.
 * Tests simple expressions, complex LaTeX, nested variables, edge cases, and modifiers.
 */

import { describe, it, expect } from 'vitest';
import { parseEvalExpression, parseEvalExpressionWithModifiers } from './eval-parser';

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

// ============================================================================
// MODIFIER TESTS
// ============================================================================

describe('parseEvalExpressionWithModifiers', () => {
	describe('Basic parsing without modifiers', () => {
		it('should parse expression without modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:a+b}}');
			expect(result).toEqual({ expression: 'a+b', modifiers: {} });
		});

		it('should parse complex expression without modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:2*a + b^2 - c/3}}');
			expect(result).toEqual({ expression: '2*a + b^2 - c/3', modifiers: {} });
		});

		it('should parse empty expression', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:}}');
			expect(result).toEqual({ expression: '', modifiers: {} });
		});
	});

	describe('Single modifiers', () => {
		it('should parse decimal modifier (short form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:1/3|d}}');
			expect(result).toEqual({ expression: '1/3', modifiers: { decimal: true } });
		});

		it('should parse decimal modifier (long form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|decimal}}');
			expect(result).toEqual({ expression: 'x', modifiers: { decimal: true } });
		});

		it('should parse positive modifier (short form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:5|+}}');
			expect(result).toEqual({ expression: '5', modifiers: { addPositive: true } });
		});

		it('should parse positive modifier (long form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|positive}}');
			expect(result).toEqual({ expression: 'x', modifiers: { addPositive: true } });
		});

		it('should parse bracket modifier (short form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|()}}');
			expect(result).toEqual({ expression: 'x', modifiers: { bracketNegative: true } });
		});

		it('should parse bracket modifier (long form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|bracket}}');
			expect(result).toEqual({ expression: 'x', modifiers: { bracketNegative: true } });
		});

		it('should parse derivative modifier (short form)', () => {
			const result = parseEvalExpressionWithModifiers("{{eval:x^2|'}}");
			expect(result).toEqual({ expression: 'x^2', modifiers: { derivative: true } });
		});

		it('should parse derivative modifier (long form)', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x^2|derivative}}');
			expect(result).toEqual({ expression: 'x^2', modifiers: { derivative: true } });
		});
	});

	describe('Combined modifiers', () => {
		it('should parse two modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:a*b|d,+}}');
			expect(result).toEqual({
				expression: 'a*b',
				modifiers: { decimal: true, addPositive: true }
			});
		});

		it('should parse three modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|d,+,()}}');
			expect(result).toEqual({
				expression: 'x',
				modifiers: { decimal: true, addPositive: true, bracketNegative: true }
			});
		});

		it('should parse mixed short and long modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|decimal,+}}');
			expect(result).toEqual({
				expression: 'x',
				modifiers: { decimal: true, addPositive: true }
			});
		});

		it('should handle spaces around commas', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|d , +}}');
			expect(result).toEqual({
				expression: 'x',
				modifiers: { decimal: true, addPositive: true }
			});
		});
	});

	describe('Edge cases with | character', () => {
		it('should handle | in LaTeX absolute value', () => {
			// |x| should not be parsed as modifiers
			const result = parseEvalExpressionWithModifiers('{{eval:|x|}}');
			expect(result).toEqual({ expression: '|x|', modifiers: {} });
		});

		it('should handle | in more complex absolute value', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:|a+b|}}');
			expect(result).toEqual({ expression: '|a+b|', modifiers: {} });
		});

		it('should handle trailing | with invalid modifier text', () => {
			// |abc123| is not valid modifiers (contains digits)
			const result = parseEvalExpressionWithModifiers('{{eval:x|abc123}}');
			expect(result).toEqual({ expression: 'x|abc123', modifiers: {} });
		});

		it('should handle empty modifier section', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:x|}}');
			expect(result).toEqual({ expression: 'x|', modifiers: {} });
		});
	});

	describe('Backward compatibility', () => {
		it('should strip modifiers when using parseEvalExpression', () => {
			expect(parseEvalExpression('{{eval:a+b|d}}')).toBe('a+b');
		});

		it('should strip combined modifiers when using parseEvalExpression', () => {
			expect(parseEvalExpression('{{eval:x|d,+,()}}')).toBe('x');
		});

		it('should return full expression for absolute value with parseEvalExpression', () => {
			expect(parseEvalExpression('{{eval:|x|}}')).toBe('|x|');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for variable token', () => {
			expect(parseEvalExpressionWithModifiers('{{a}}')).toBeNull();
		});

		it('should return null for random token', () => {
			expect(parseEvalExpressionWithModifiers('{{random:1-10}}')).toBeNull();
		});

		it('should return null for empty string', () => {
			expect(parseEvalExpressionWithModifiers('')).toBeNull();
		});

		it('should return null for malformed token', () => {
			expect(parseEvalExpressionWithModifiers('{{eval:a+b')).toBeNull();
		});
	});

	describe('Variable references with modifiers', () => {
		it('should parse expression with variable references and modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:{{a}}+{{b}}|d}}');
			expect(result).toEqual({
				expression: '{{a}}+{{b}}',
				modifiers: { decimal: true }
			});
		});

		it('should handle complex expression with variables and multiple modifiers', () => {
			const result = parseEvalExpressionWithModifiers('{{eval:{{x}}-5|+,()}}');
			expect(result).toEqual({
				expression: '{{x}}-5',
				modifiers: { addPositive: true, bracketNegative: true }
			});
		});
	});
});
