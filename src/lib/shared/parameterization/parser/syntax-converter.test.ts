/**
 * Syntax Converter Tests
 * =======================
 *
 * Comprehensive tests for bidirectional syntax conversion.
 * Tests variable, random, and eval conversion in both directions with edge cases.
 */

import { describe, it, expect } from 'vitest';
import { convertSyntax } from './syntax-converter';

describe('convertSyntax - Variables (Questions → Markdown)', () => {
	it('should convert simple variable', () => {
		const result = convertSyntax('Value: {@:a}', 'questions', 'markdown');
		expect(result).toBe('Value: {{a}}');
	});

	it('should convert multiple variables', () => {
		const result = convertSyntax('{@:a} and {@:b} and {@:c}', 'questions', 'markdown');
		expect(result).toBe('{{a}} and {{b}} and {{c}}');
	});

	it('should convert variable with underscores', () => {
		const result = convertSyntax('{@:my_var}', 'questions', 'markdown');
		expect(result).toBe('{{my_var}}');
	});

	it('should preserve surrounding text', () => {
		const result = convertSyntax('Start {@:x} middle {@:y} end', 'questions', 'markdown');
		expect(result).toBe('Start {{x}} middle {{y}} end');
	});

	it('should handle variables in LaTeX context', () => {
		const result = convertSyntax('$$\\frac{{@:a}}{{@:b}}$$', 'questions', 'markdown');
		expect(result).toBe('$$\\frac{{{a}}}{{{b}}}$$');
	});
});

describe('convertSyntax - Variables (Markdown → Questions)', () => {
	it('should convert simple variable', () => {
		const result = convertSyntax('Value: {{a}}', 'markdown', 'questions');
		expect(result).toBe('Value: {@:a}');
	});

	it('should convert multiple variables', () => {
		const result = convertSyntax('{{a}} and {{b}} and {{c}}', 'markdown', 'questions');
		expect(result).toBe('{@:a} and {@:b} and {@:c}');
	});

	it('should convert variable with underscores', () => {
		const result = convertSyntax('{{my_var}}', 'markdown', 'questions');
		expect(result).toBe('{@:my_var}');
	});

	it('should preserve surrounding text', () => {
		const result = convertSyntax('Start {{x}} middle {{y}} end', 'markdown', 'questions');
		expect(result).toBe('Start {@:x} middle {@:y} end');
	});
});

describe('convertSyntax - Random (Questions → Markdown)', () => {
	it('should convert simple integer range', () => {
		const result = convertSyntax('Random: {#:1-10}', 'questions', 'markdown');
		expect(result).toBe('Random: {{random:1-10}}');
	});

	it('should convert decimal by digits', () => {
		const result = convertSyntax('{#:2.3}', 'questions', 'markdown');
		expect(result).toBe('{{random:2.3}}');
	});

	it('should convert decimal range with step', () => {
		const result = convertSyntax('{#:0.5-9.99:0.01}', 'questions', 'markdown');
		expect(result).toBe('{{random:0.5-9.99:0.01}}');
	});

	it('should convert random with exclusions', () => {
		const result = convertSyntax('{#:1-20!5,7-9}', 'questions', 'markdown');
		expect(result).toBe('{{random:1-20!5,7-9}}');
	});

	it('should convert random with variable bounds', () => {
		const result = convertSyntax('{#:{@:min}-{@:max}}', 'questions', 'markdown');
		expect(result).toBe('{{random:{{min}}-{{max}}}}');
	});

	it('should convert random with variable exclusions', () => {
		const result = convertSyntax('{#:1-100!{@:a},{@:b}}', 'questions', 'markdown');
		expect(result).toBe('{{random:1-100!{{a}},{{b}}}}');
	});

	it('should convert complex random with nested variables', () => {
		const result = convertSyntax('{#:{@:min}-{@:max}!{@:excl}}', 'questions', 'markdown');
		expect(result).toBe('{{random:{{min}}-{{max}}!{{excl}}}}');
	});

	it('should convert negative ranges', () => {
		const result = convertSyntax('{#:-5-10}', 'questions', 'markdown');
		expect(result).toBe('{{random:-5-10}}');
	});
});

describe('convertSyntax - Random (Markdown → Questions)', () => {
	it('should convert explicit random syntax', () => {
		const result = convertSyntax('{{random:1-10}}', 'markdown', 'questions');
		expect(result).toBe('{#:1-10}');
	});

	it('should convert shorthand random syntax', () => {
		const result = convertSyntax('{{1-10}}', 'markdown', 'questions');
		expect(result).toBe('{#:1-10}');
	});

	it('should convert decimal by digits', () => {
		const result = convertSyntax('{{random:2.3}}', 'markdown', 'questions');
		expect(result).toBe('{#:2.3}');
	});

	it('should convert shorthand decimal by digits', () => {
		const result = convertSyntax('{{2.3}}', 'markdown', 'questions');
		expect(result).toBe('{#:2.3}');
	});

	it('should convert with variable bounds', () => {
		const result = convertSyntax('{{random:{{min}}-{{max}}}}', 'markdown', 'questions');
		expect(result).toBe('{#:{@:min}-{@:max}}');
	});

	it('should convert shorthand with variable bounds', () => {
		const result = convertSyntax('{{{{min}}-{{max}}}}', 'markdown', 'questions');
		expect(result).toBe('{#:{@:min}-{@:max}}');
	});

	it('should convert with exclusions', () => {
		const result = convertSyntax('{{random:1-20!5}}', 'markdown', 'questions');
		expect(result).toBe('{#:1-20!5}');
	});
});

describe('convertSyntax - Eval (Questions → Markdown)', () => {
	it('should convert simple eval', () => {
		const result = convertSyntax('Result: {eval:a+b}', 'questions', 'markdown');
		expect(result).toBe('Result: {{eval:a+b}}');
	});

	it('should convert eval token wrapper but preserve inner content', () => {
		// Note: The converter only converts the eval token wrapper, not nested tokens inside
		const result = convertSyntax('{eval:{@:a}+{@:b}}', 'questions', 'markdown');
		expect(result).toBe('{{eval:{@:a}+{@:b}}}');
	});

	it('should convert complex eval expression wrapper', () => {
		// Note: Variables inside eval are not converted
		const result = convertSyntax('{eval:2*{@:a}-{@:b}/3}', 'questions', 'markdown');
		expect(result).toBe('{{eval:2*{@:a}-{@:b}/3}}');
	});

	it('should convert eval with LaTeX wrapper', () => {
		// Note: Variables inside eval are not converted
		const result = convertSyntax('{eval:\\frac{{@:a}}{{@:b}}}', 'questions', 'markdown');
		expect(result).toBe('{{eval:\\frac{{@:a}}{{@:b}}}}');
	});
});

describe('convertSyntax - Eval (Markdown → Questions)', () => {
	it('should convert simple eval', () => {
		const result = convertSyntax('Result: {{eval:a+b}}', 'markdown', 'questions');
		expect(result).toBe('Result: {eval:a+b}');
	});

	it('should convert eval token wrapper but preserve inner content', () => {
		// Note: The converter only converts the eval token wrapper, not nested tokens inside
		const result = convertSyntax('{{eval:{{a}}+{{b}}}}', 'markdown', 'questions');
		expect(result).toBe('{eval:{{a}}+{{b}}}');
	});

	it('should convert complex eval expression wrapper', () => {
		// Note: Variables inside eval are not converted
		const result = convertSyntax('{{eval:2*{{a}}-{{b}}/3}}', 'markdown', 'questions');
		expect(result).toBe('{eval:2*{{a}}-{{b}}/3}');
	});
});

describe('convertSyntax - Mixed content', () => {
	it('should convert all token types (Questions → Markdown)', () => {
		const text = 'Var: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('Var: {{a}}, Random: {{random:1-10}}, Eval: {{eval:a+5}}');
	});

	it('should convert all token types (Markdown → Questions)', () => {
		const text = 'Var: {{a}}, Random: {{1-10}}, Eval: {{eval:a+5}}';
		const result = convertSyntax(text, 'markdown', 'questions');
		expect(result).toBe('Var: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}');
	});

	it('should convert multiple occurrences of same token', () => {
		const result = convertSyntax('{@:a} + {@:a} = 2*{@:a}', 'questions', 'markdown');
		expect(result).toBe('{{a}} + {{a}} = 2*{{a}}');
	});

	it('should handle mixed variables and random with nested references', () => {
		const text = '{@:x} in range {#:{@:min}-{@:max}}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('{{x}} in range {{random:{{min}}-{{max}}}}');
	});

	it('should convert top-level tokens but not nested ones in eval', () => {
		// The eval token wrapper is converted, but tokens inside eval are not
		const text = '{eval:{@:a}+{#:{@:b}-{@:c}}}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('{{eval:{@:a}+{#:{@:b}-{@:c}}}}');
	});
});

describe('convertSyntax - Edge cases', () => {
	it('should handle empty text', () => {
		expect(convertSyntax('', 'questions', 'markdown')).toBe('');
		expect(convertSyntax('', 'markdown', 'questions')).toBe('');
	});

	it('should handle text with no tokens', () => {
		const text = 'No parameterization tokens here';
		expect(convertSyntax(text, 'questions', 'markdown')).toBe(text);
		expect(convertSyntax(text, 'markdown', 'questions')).toBe(text);
	});

	it('should be no-op when source equals target', () => {
		const text = '{@:a} and {#:1-10}';
		expect(convertSyntax(text, 'questions', 'questions')).toBe(text);

		const text2 = '{{a}} and {{1-10}}';
		expect(convertSyntax(text2, 'markdown', 'markdown')).toBe(text2);
	});

	it('should handle both as source syntax', () => {
		const text = '{@:a}';
		expect(convertSyntax(text, 'both', 'markdown')).toBe(text);
	});

	it('should handle both as target syntax', () => {
		const text = '{@:a}';
		expect(convertSyntax(text, 'questions', 'both')).toBe(text);
	});

	it('should preserve non-parameterization braces', () => {
		const text = 'Regular {braces} and {@:var}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('Regular {braces} and {{var}}');
	});

	it('should handle adjacent tokens', () => {
		const result = convertSyntax('{@:a}{@:b}', 'questions', 'markdown');
		expect(result).toBe('{{a}}{{b}}');
	});

	it('should handle tokens at start and end', () => {
		const result = convertSyntax('{@:start} middle {@:end}', 'questions', 'markdown');
		expect(result).toBe('{{start}} middle {{end}}');
	});

	it('should handle very long text with many tokens', () => {
		const tokens = Array.from({ length: 20 }, (_, i) => `{@:var${i}}`).join(' ');
		const result = convertSyntax(tokens, 'questions', 'markdown');
		const expected = Array.from({ length: 20 }, (_, i) => `{{var${i}}}`).join(' ');
		expect(result).toBe(expected);
	});

	it('should handle special characters in expressions', () => {
		const result = convertSyntax('{eval:a*b+c/d-e^f}', 'questions', 'markdown');
		expect(result).toBe('{{eval:a*b+c/d-e^f}}');
	});

	it('should handle LaTeX with multiple variables', () => {
		const text = '$$\\sqrt{{@:a}^2+{@:b}^2}$$';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('$$\\sqrt{{{a}}^2+{{b}}^2}$$');
	});

	it('should maintain token order in conversion', () => {
		const text = '{#:1-10} {@:a} {eval:a+1}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('{{random:1-10}} {{a}} {{eval:a+1}}');
	});

	it('should handle whitespace around tokens', () => {
		const result = convertSyntax('  {@:a}  ', 'questions', 'markdown');
		expect(result).toBe('  {{a}}  ');
	});

	it('should handle newlines with tokens', () => {
		const text = '{@:a}\n{@:b}';
		const result = convertSyntax(text, 'questions', 'markdown');
		expect(result).toBe('{{a}}\n{{b}}');
	});
});

describe('convertSyntax - Bidirectional consistency', () => {
	it('should be reversible for variables', () => {
		const original = '{@:myVar}';
		const toMarkdown = convertSyntax(original, 'questions', 'markdown');
		const backToQuestions = convertSyntax(toMarkdown, 'markdown', 'questions');
		expect(backToQuestions).toBe(original);
	});

	it('should be reversible for random specs', () => {
		const original = '{#:1-10!5}';
		const toMarkdown = convertSyntax(original, 'questions', 'markdown');
		const backToQuestions = convertSyntax(toMarkdown, 'markdown', 'questions');
		expect(backToQuestions).toBe(original);
	});

	it('should be reversible for eval expressions', () => {
		const original = '{eval:a+b*c}';
		const toMarkdown = convertSyntax(original, 'questions', 'markdown');
		const backToQuestions = convertSyntax(toMarkdown, 'markdown', 'questions');
		expect(backToQuestions).toBe(original);
	});

	it('should be reversible for complex mixed content without eval', () => {
		// Note: Eval content is not recursively converted, so we test without nested tokens in eval
		const original = '{@:a} + {#:{@:min}-{@:max}} = {eval:a+5}';
		const toMarkdown = convertSyntax(original, 'questions', 'markdown');
		const backToQuestions = convertSyntax(toMarkdown, 'markdown', 'questions');
		expect(backToQuestions).toBe(original);
	});

	it('should be reversible in opposite direction without eval', () => {
		// Note: Eval content is not recursively converted
		const original = '{{a}} + {{random:{{min}}-{{max}}}} = {{eval:a+5}}';
		const toQuestions = convertSyntax(original, 'markdown', 'questions');
		const backToMarkdown = convertSyntax(toQuestions, 'questions', 'markdown');
		expect(backToMarkdown).toBe(original);
	});
});
