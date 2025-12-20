/**
 * Tokenizer Tests
 * ================
 *
 * Comprehensive tests for Markdown-only parameterization tokenization.
 * Covers variables, random specs, eval expressions, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../../parameterization/parser/tokenizer';

describe('tokenize - Markdown syntax', () => {
	describe('Variable tokens', () => {
		it('should extract simple variable token', () => {
			const text = 'Value is {{a}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'variable',
				content: '{{a}}',
				inner: 'a'
			});
		});

		it('should extract multiple variables', () => {
			const text = '{{a}} and {{b}} and {{c}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(3);
			expect(tokens.map((t) => t.inner)).toEqual(['a', 'b', 'c']);
		});

		it('should extract variable with underscores', () => {
			const text = '{{my_var}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('my_var');
		});

		it('should track correct positions', () => {
			const text = 'Start {{a}} end';
			const tokens = tokenize(text);

			expect(tokens[0].start).toBe(6);
			expect(tokens[0].end).toBe(11);
			expect(text.substring(tokens[0].start, tokens[0].end)).toBe('{{a}}');
		});
	});

	describe('Random tokens - explicit syntax', () => {
		it('should extract integer range with random: prefix', () => {
			const text = 'Random: {{random:1..10}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'random',
				content: '{{random:1..10}}',
				inner: '1..10'
			});
		});

		it('should extract decimal by digits with random: prefix', () => {
			const text = '{{random:2.3}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('2.3');
		});

		it('should extract decimal range with step', () => {
			const text = '{{random:0.5..9.99:0.01}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('0.5..9.99:0.01');
		});
	});

	describe('Random tokens - shorthand auto-detection', () => {
		it('should auto-detect integer range shorthand', () => {
			const text = 'Number: {{1..10}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
			expect(tokens[0].inner).toBe('1..10');
		});

		it('should auto-detect decimal by digits shorthand', () => {
			const text = '{{2.3}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with negative numbers', () => {
			const text = '{{-5..10}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with exclusions', () => {
			const text = '{{1..20!5}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with step notation', () => {
			const text = '{{0.5..9.99:0.01}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should auto-detect with variable bounds', () => {
			const text = '{{{{min}}..{{max}}}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('random');
		});

		it('should not confuse simple variable with random', () => {
			const text = '{{myVar}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('variable');
		});
	});

	describe('Eval tokens', () => {
		it('should extract simple eval token', () => {
			const text = 'Result: {{eval:a+b}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'eval',
				content: '{{eval:a+b}}',
				inner: 'a+b'
			});
		});

		it('should extract eval with nested variables', () => {
			const text = '{{eval:{{a}}+{{b}}}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].inner).toBe('{{a}}+{{b}}');
		});
	});

	describe('Mixed token types', () => {
		it('should extract all token types', () => {
			const text = 'Var: {{a}}, Random: {{random:1..10}}, Eval: {{eval:a+5}}';
			const tokens = tokenize(text);

			expect(tokens).toHaveLength(3);
			expect(tokens[0].type).toBe('variable');
			expect(tokens[1].type).toBe('random');
			expect(tokens[2].type).toBe('eval');
		});

		it('should maintain order of tokens', () => {
			const text = '{{random:1..10}} {{a}} {{eval:a+1}}';
			const tokens = tokenize(text);

			expect(tokens[0].type).toBe('random');
			expect(tokens[1].type).toBe('variable');
			expect(tokens[2].type).toBe('eval');
		});
	});
});

describe('tokenize - Edge cases', () => {
	it('should handle empty text', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('should handle text with no tokens', () => {
		const text = 'No parameterization tokens here';
		expect(tokenize(text)).toEqual([]);
	});

	it('should handle unmatched braces gracefully', () => {
		const text = '{{a}} { incomplete {{b}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(2);
		expect(tokens[0].inner).toBe('a');
		expect(tokens[1].inner).toBe('b');
	});

	it('should handle non-parameterization braces', () => {
		const text = 'Regular {braces} and {{var}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(1);
		expect(tokens[0].inner).toBe('var');
	});

	it('should handle adjacent tokens', () => {
		const text = '{{a}}{{b}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(2);
		expect(tokens[0].end).toBe(tokens[1].start);
	});

	it('should handle tokens in LaTeX context', () => {
		const text = '$$\\frac{{{num}}}{{{den}}}$$';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(2);
		expect(tokens[0].inner).toBe('num');
		expect(tokens[1].inner).toBe('den');
	});

	it('should handle special characters in expressions', () => {
		const text = '{{eval:a*b+c/d-e^f}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(1);
		expect(tokens[0].inner).toBe('a*b+c/d-e^f');
	});
});

describe('tokenize - Special markers (non-parameterization)', () => {
	it('should skip blank markers', () => {
		const text = 'Answer: {{blank:1}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(0);
	});

	it('should skip digits markers', () => {
		const text = 'Number: {{digits:2-4}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(0);
	});

	it('should handle mixed blank and variable tokens', () => {
		const text = '{{blank:1}} + {{a}} = {{blank:2}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('variable');
		expect(tokens[0].inner).toBe('a');
	});

	it('should not confuse similar variable names with markers', () => {
		const text = '{{blanket}} {{digitsum}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(2);
		expect(tokens[0].type).toBe('variable');
		expect(tokens[0].inner).toBe('blanket');
		expect(tokens[1].type).toBe('variable');
		expect(tokens[1].inner).toBe('digitsum');
	});

	it('should handle complex digits syntax', () => {
		const text = '{{digits:{{1}};{{1}}}}';
		const tokens = tokenize(text);

		// Should skip the outer digits: marker
		// Inner {{1}} tokens are inside a skipped marker
		expect(tokens).toHaveLength(0);
	});

	it('should skip blank markers with text around', () => {
		const text = 'Fill in: {{a}} + {{blank:1}} = {{sum}}';
		const tokens = tokenize(text);

		expect(tokens).toHaveLength(2);
		expect(tokens[0].inner).toBe('a');
		expect(tokens[1].inner).toBe('sum');
	});
});
