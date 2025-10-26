/**
 * Tokenizer Tests
 * ================
 *
 * Comprehensive tests for dual-syntax parameterization tokenization.
 * Covers Questions syntax, Markdown syntax, mixed syntax, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';

describe('tokenize - Questions syntax', () => {
	describe('Variable tokens', () => {
		it('should extract simple variable token', () => {
			const text = 'Value is {@:a}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'variable',
				content: '{@:a}',
				inner: 'a',
				syntax: 'questions'
			});
		});

		it('should extract multiple variable tokens', () => {
			const text = '{@:a} and {@:b} and {@:c}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(3);
			expect(tokens[0].inner).toBe('a');
			expect(tokens[1].inner).toBe('b');
			expect(tokens[2].inner).toBe('c');
		});

		it('should extract variable with underscores', () => {
			const text = '{@:my_var_name}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('my_var_name');
		});

		it('should extract variable with numbers', () => {
			const text = '{@:var123}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('var123');
		});

		it('should track correct positions', () => {
			const text = 'Start {@:a} end';
			const tokens = tokenize(text, 'questions');

			expect(tokens[0].start).toBe(6);
			expect(tokens[0].end).toBe(11);
			expect(text.substring(tokens[0].start, tokens[0].end)).toBe('{@:a}');
		});
	});

	describe('Random tokens', () => {
		it('should extract integer range token', () => {
			const text = 'Random: {#:1-10}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'random',
				content: '{#:1-10}',
				inner: '1-10',
				syntax: 'questions'
			});
		});

		it('should extract decimal by digits token', () => {
			const text = '{#:2.3}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
			expect(tokens[0].inner).toBe('2.3');
		});

		it('should extract decimal range with step', () => {
			const text = '{#:0.5-9.99:0.01}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('0.5-9.99:0.01');
		});

		it('should extract random with exclusions', () => {
			const text = '{#:1-20!5,7-9}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('1-20!5,7-9');
		});

		it('should extract random with variable bounds', () => {
			const text = '{#:{@:min}-{@:max}}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
			expect(tokens[0].inner).toBe('{@:min}-{@:max}');
		});

		it('should handle negative numbers in ranges', () => {
			const text = '{#:-5-10}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('-5-10');
		});
	});

	describe('Eval tokens', () => {
		it('should extract simple eval token', () => {
			const text = 'Result: {eval:a+b}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'eval',
				content: '{eval:a+b}',
				inner: 'a+b',
				syntax: 'questions'
			});
		});

		it('should extract eval with variables', () => {
			const text = '{eval:{@:a}+{@:b}}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('{@:a}+{@:b}');
		});

		it('should extract eval with complex expression', () => {
			const text = '{eval:sqrt({@:a}^2+{@:b}^2)}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('sqrt({@:a}^2+{@:b}^2)');
		});
	});

	describe('Mixed token types', () => {
		it('should extract all token types', () => {
			const text = 'Var: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}';
			const tokens = tokenize(text, 'questions');

			expect(tokens).toHaveLength(3);
			expect(tokens[0].type).toBe('variable');
			expect(tokens[1].type).toBe('random');
			expect(tokens[2].type).toBe('eval');
		});

		it('should maintain order of tokens', () => {
			const text = '{#:1-10} {@:a} {eval:a+1}';
			const tokens = tokenize(text, 'questions');

			expect(tokens[0].type).toBe('random');
			expect(tokens[1].type).toBe('variable');
			expect(tokens[2].type).toBe('eval');
		});
	});
});

describe('tokenize - Markdown syntax', () => {
	describe('Variable tokens', () => {
		it('should extract simple variable token', () => {
			const text = 'Value is {{a}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'variable',
				content: '{{a}}',
				inner: 'a',
				syntax: 'markdown'
			});
		});

		it('should extract multiple variables', () => {
			const text = '{{a}} and {{b}} and {{c}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(3);
			expect(tokens.map((t) => t.inner)).toEqual(['a', 'b', 'c']);
		});

		it('should extract variable with underscores', () => {
			const text = '{{my_var}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('my_var');
		});

		it('should track correct positions', () => {
			const text = 'Start {{a}} end';
			const tokens = tokenize(text, 'markdown');

			expect(tokens[0].start).toBe(6);
			expect(tokens[0].end).toBe(11);
			expect(text.substring(tokens[0].start, tokens[0].end)).toBe('{{a}}');
		});
	});

	describe('Random tokens - explicit syntax', () => {
		it('should extract integer range with random: prefix', () => {
			const text = 'Random: {{random:1-10}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'random',
				content: '{{random:1-10}}',
				inner: '1-10',
				syntax: 'markdown'
			});
		});

		it('should extract decimal by digits with random: prefix', () => {
			const text = '{{random:2.3}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('2.3');
		});

		it('should extract decimal range with step', () => {
			const text = '{{random:0.5-9.99:0.01}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('0.5-9.99:0.01');
		});
	});

	describe('Random tokens - shorthand auto-detection', () => {
		it('should auto-detect integer range shorthand', () => {
			const text = 'Number: {{1-10}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
			expect(tokens[0].inner).toBe('1-10');
		});

		it('should auto-detect decimal by digits shorthand', () => {
			const text = '{{2.3}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with negative numbers', () => {
			const text = '{{-5-10}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with exclusions', () => {
			const text = '{{1-20!5}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with step notation', () => {
			const text = '{{0.5-9.99:0.01}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with variable bounds', () => {
			const text = '{{{{min}}-{{max}}}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should not confuse simple variable with random', () => {
			const text = '{{myVar}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('variable');
		});
	});

	describe('Eval tokens', () => {
		it('should extract simple eval token', () => {
			const text = 'Result: {{eval:a+b}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'eval',
				content: '{{eval:a+b}}',
				inner: 'a+b',
				syntax: 'markdown'
			});
		});

		it('should extract eval with nested variables', () => {
			const text = '{{eval:{{a}}+{{b}}}}';
			const tokens = tokenize(text, 'markdown');

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('{{a}}+{{b}}');
		});
	});
});

describe('tokenize - Mixed syntax (both)', () => {
	it('should extract tokens from both syntaxes', () => {
		const text = 'Questions: {@:a}, Markdown: {{b}}';
		const tokens = tokenize(text, 'both');

		expect(tokens).toHaveLength(2);
		expect(tokens[0].syntax).toBe('questions');
		expect(tokens[0].inner).toBe('a');
		expect(tokens[1].syntax).toBe('markdown');
		expect(tokens[1].inner).toBe('b');
	});

	it('should extract mixed random tokens', () => {
		const text = 'Questions: {#:1-10}, Markdown: {{random:5-15}}';
		const tokens = tokenize(text, 'both');

		expect(tokens).toHaveLength(2);
		expect(tokens[0].syntax).toBe('questions');
		expect(tokens[1].syntax).toBe('markdown');
		expect(tokens[0].type).toBe('random');
		expect(tokens[1].type).toBe('random');
	});

	it('should extract all token types from both syntaxes', () => {
		// Note: When using 'both' syntax, avoid patterns where one syntax is contained in another
		// E.g., {{eval:x}} contains {eval:x}, so both get extracted
		// Test with non-overlapping patterns
		const text = '{@:a} and {{b}} plus {#:1-10} and {{random:5-15}}';
		const tokens = tokenize(text, 'both');

		expect(tokens).toHaveLength(4);
		expect(tokens.filter((t) => t.syntax === 'questions')).toHaveLength(2);
		expect(tokens.filter((t) => t.syntax === 'markdown')).toHaveLength(2);
		expect(tokens.filter((t) => t.type === 'variable')).toHaveLength(2);
		expect(tokens.filter((t) => t.type === 'random')).toHaveLength(2);
	});

	it('should sort tokens by position', () => {
		const text = '{{b}} {@:a}'; // Markdown first, Questions second
		const tokens = tokenize(text, 'both');

		expect(tokens[0].start).toBe(0);
		expect(tokens[1].start).toBe(6);
		expect(tokens[0].syntax).toBe('markdown');
		expect(tokens[1].syntax).toBe('questions');
	});
});

describe('tokenize - Edge cases', () => {
	it('should handle empty text', () => {
		expect(tokenize('', 'questions')).toEqual([]);
		expect(tokenize('', 'markdown')).toEqual([]);
		expect(tokenize('', 'both')).toEqual([]);
	});

	it('should handle text with no tokens', () => {
		const text = 'No parameterization tokens here';
		expect(tokenize(text, 'questions')).toEqual([]);
		expect(tokenize(text, 'markdown')).toEqual([]);
	});

	it('should handle nested braces in eval', () => {
		// With 'both' syntax, nested {{a}} and {{b}} are also extracted as separate tokens
		const text = '{eval:{{a}}+{{b}}}';
		const tokens = tokenize(text, 'both');

		// Extracts: 1 Questions eval token + 2 Markdown variable tokens inside
		expect(tokens.length).toBeGreaterThan(1);
		expect(tokens.some((t) => t.type === 'eval' && t.syntax === 'questions')).toBe(true);
		expect(tokens.some((t) => t.type === 'variable' && t.syntax === 'markdown')).toBe(true);
	});

	it('should handle deeply nested structures', () => {
		const text = '{#:{@:min}-{@:max}!{@:excl}}';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('random');
	});

	it('should handle unmatched braces gracefully', () => {
		const text = '{@:a} { incomplete {@:b}';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(2);
		expect(tokens[0].inner).toBe('a');
		expect(tokens[1].inner).toBe('b');
	});

	it('should handle non-parameterization braces', () => {
		const text = 'Regular {braces} and {@:var}';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(1);
		expect(tokens[0].inner).toBe('var');
	});

	it('should handle adjacent tokens', () => {
		const text = '{@:a}{@:b}';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(2);
		expect(tokens[0].end).toBe(tokens[1].start);
	});

	it('should handle tokens in LaTeX context', () => {
		const text = '$$\\frac{{@:num}}{{@:den}}$$';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(2);
		expect(tokens[0].inner).toBe('num');
		expect(tokens[1].inner).toBe('den');
	});

	it('should default to both syntax', () => {
		const text = '{@:a} {{b}}';
		const tokens = tokenize(text); // No syntax specified

		expect(tokens).toHaveLength(2);
	});

	it('should handle special characters in expressions', () => {
		const text = '{eval:a*b+c/d-e^f}';
		const tokens = tokenize(text, 'questions');

		expect(tokens).toHaveLength(1);
		expect(tokens[0].inner).toBe('a*b+c/d-e^f');
	});
});
