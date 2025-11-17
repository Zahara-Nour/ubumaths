/**
 * Syntax Adapter Tests
 * ====================
 *
 * CRITICAL: These tests verify the conversion between database syntax and shared library syntax.
 * Without proper conversion, the entire question generation system fails silently.
 */

import { describe, it, expect } from 'vitest';
import {
	convertToMarkdownSyntax,
	convertToQuestionsSyntax,
	detectSyntax,
	normalizeToMarkdown,
	convertVariableToMarkdown,
	convertContentFieldToMarkdown
} from './syntax-adapter';

describe('Syntax Adapter', () => {
	describe('convertToMarkdownSyntax', () => {
		it('converts variable references', () => {
			expect(convertToMarkdownSyntax('{@:a}')).toBe('{{a}}');
			expect(convertToMarkdownSyntax('{@:myVar}')).toBe('{{myVar}}');
			expect(convertToMarkdownSyntax('{@:x1}')).toBe('{{x1}}');
		});

		it('converts random expressions', () => {
			expect(convertToMarkdownSyntax('{#:1-10}')).toBe('{{random:1-10}}');
			expect(convertToMarkdownSyntax('{#:0.1-0.9:0.1}')).toBe('{{random:0.1-0.9:0.1}}');
			expect(convertToMarkdownSyntax('{#:2.3}')).toBe('{{random:2.3}}');
		});

		it('converts eval expressions', () => {
			expect(convertToMarkdownSyntax('{eval:a+b}')).toBe('{{eval:a+b}}');
			expect(convertToMarkdownSyntax('{eval:2*x+1}')).toBe('{{eval:2*x+1}}');
			expect(convertToMarkdownSyntax('{eval:sqrt(a^2+b^2)}')).toBe('{{eval:sqrt(a^2+b^2)}}');
		});

		it('handles nested variable references in random', () => {
			expect(convertToMarkdownSyntax('{#:1-{@:max}}')).toBe('{{random:1-{{max}}}}');
			expect(convertToMarkdownSyntax('{#:{@:min}-{@:max}}')).toBe('{{random:{{min}}-{{max}}}}');
		});

		it('handles exclusions with variables', () => {
			expect(convertToMarkdownSyntax('{#:1-10!{@:a}}')).toBe('{{random:1-10!{{a}}}}');
			expect(convertToMarkdownSyntax('{#:1-10!{@:a}!{@:b}}')).toBe('{{random:1-10!{{a}}!{{b}}}}');
		});

		it('handles nested variables in eval', () => {
			expect(convertToMarkdownSyntax('{eval:{@:a}+{@:b}}')).toBe('{{eval:{{a}}+{{b}}}}');
			expect(convertToMarkdownSyntax('{eval:({@:a}+{@:b})/{@:c}}')).toBe(
				'{{eval:({{a}}+{{b}})/{{c}}}}'
			);
		});

		it('converts complex mixed expressions', () => {
			const input = 'Calculate {@:a} + {@:b} = {eval:{@:a}+{@:b}}';
			const expected = 'Calculate {{a}} + {{b}} = {{eval:{{a}}+{{b}}}}';
			expect(convertToMarkdownSyntax(input)).toBe(expected);
		});

		it('handles mathematical content with LaTeX', () => {
			const input = '$$\\frac{{@:num}}{{@:den}}$$';
			const expected = '$$\\frac{{{num}}}{{{den}}}$$';
			expect(convertToMarkdownSyntax(input)).toBe(expected);
		});

		it('preserves non-template content', () => {
			expect(convertToMarkdownSyntax('Regular text')).toBe('Regular text');
			expect(convertToMarkdownSyntax('Math: $x^2 + y^2 = z^2$')).toBe('Math: $x^2 + y^2 = z^2$');
		});

		it('handles empty and null inputs', () => {
			expect(convertToMarkdownSyntax('')).toBe('');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(convertToMarkdownSyntax(null as any)).toBe(null);
			expect(convertToMarkdownSyntax(undefined as any)).toBe(undefined);
		});

		// Real-world examples from database
		it('converts actual database templates', () => {
			// From seed template
			const dbStatement = 'Calculer : $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$';
			const expected = 'Calculer : $$\\frac{{{num1}}}{{{den}}} + \\frac{{{num2}}}{{{den}}}$$';
			expect(convertToMarkdownSyntax(dbStatement)).toBe(expected);

			// Variable with exclusion
			const dbVariable = '{#:1-{@:den}-1!{@:num1}}';
			expect(convertToMarkdownSyntax(dbVariable)).toBe('{{random:1-{{den}}-1!{{num1}}}}');

			// Complex eval
			const dbAnswer = '{eval:({@:num1}+{@:num2})/{@:den}}';
			expect(convertToMarkdownSyntax(dbAnswer)).toBe('{{eval:({{num1}}+{{num2}})/{{den}}}}');
		});
	});

	describe('convertToQuestionsSyntax', () => {
		it('converts variable references back', () => {
			expect(convertToQuestionsSyntax('{{a}}')).toBe('{@:a}');
			expect(convertToQuestionsSyntax('{{myVar}}')).toBe('{@:myVar}');
		});

		it('converts random expressions back', () => {
			expect(convertToQuestionsSyntax('{{random:1-10}}')).toBe('{#:1-10}');
			expect(convertToQuestionsSyntax('{{random:0.1-0.9:0.1}}')).toBe('{#:0.1-0.9:0.1}');
		});

		it('converts shorthand random back', () => {
			expect(convertToQuestionsSyntax('{{1-10}}')).toBe('{#:1-10}');
			expect(convertToQuestionsSyntax('{{2.3}}')).toBe('{#:2.3}');
		});

		it('converts eval expressions back', () => {
			expect(convertToQuestionsSyntax('{{eval:a+b}}')).toBe('{eval:a+b}');
		});

		it('round-trip conversion preserves content', () => {
			const original = '{@:a} + {#:1-10} = {eval:{@:a}+5}';
			const converted = convertToMarkdownSyntax(original);
			const backConverted = convertToQuestionsSyntax(converted);
			expect(backConverted).toBe(original);
		});
	});

	describe('detectSyntax', () => {
		it('detects Questions syntax', () => {
			expect(detectSyntax('{@:a}')).toBe('questions');
			expect(detectSyntax('{#:1-10}')).toBe('questions');
			expect(detectSyntax('{eval:a+b}')).toBe('questions');
			expect(detectSyntax('Text with {@:var} inside')).toBe('questions');
		});

		it('detects Markdown syntax', () => {
			expect(detectSyntax('{{a}}')).toBe('markdown');
			expect(detectSyntax('{{random:1-10}}')).toBe('markdown');
			expect(detectSyntax('{{eval:a+b}}')).toBe('markdown');
		});

		it('detects mixed syntax', () => {
			expect(detectSyntax('{@:a} and {{b}}')).toBe('mixed');
			expect(detectSyntax('{#:1-10} with {{random:5-15}}')).toBe('mixed');
		});

		it('detects no syntax', () => {
			expect(detectSyntax('Plain text')).toBe('none');
			expect(detectSyntax('Math: $x^2$')).toBe('none');
			expect(detectSyntax('')).toBe('none');
		});
	});

	describe('normalizeToMarkdown', () => {
		it('converts Questions syntax', () => {
			expect(normalizeToMarkdown('{@:a}')).toBe('{{a}}');
		});

		it('preserves Markdown syntax', () => {
			expect(normalizeToMarkdown('{{a}}')).toBe('{{a}}');
		});

		it('converts mixed syntax', () => {
			expect(normalizeToMarkdown('{@:a} and {{b}}')).toBe('{{a}} and {{b}}');
		});

		it('preserves plain text', () => {
			expect(normalizeToMarkdown('No templates here')).toBe('No templates here');
		});
	});

	describe('helper functions', () => {
		it('converts ContentField', () => {
			const field = { type: 'text', content: 'Value is {@:x}' };
			const converted = convertContentFieldToMarkdown(field);
			expect(converted.content).toBe('Value is {{x}}');
			expect(converted.type).toBe('text');
		});

		it('converts Variable', () => {
			const variable = { name: 'a', expression: '{#:1-{@:max}}' };
			const converted = convertVariableToMarkdown(variable);
			expect(converted.expression).toBe('{{random:1-{{max}}}}');
			expect(converted.name).toBe('a');
		});
	});

	describe('edge cases', () => {
		it('handles multiple conversions in one string', () => {
			const input = '{@:a} {@:b} {#:1-10} {#:5-15} {eval:x} {eval:y}';
			const expected = '{{a}} {{b}} {{random:1-10}} {{random:5-15}} {{eval:x}} {{eval:y}}';
			expect(convertToMarkdownSyntax(input)).toBe(expected);
		});

		it('handles adjacent tokens', () => {
			expect(convertToMarkdownSyntax('{@:a}{@:b}')).toBe('{{a}}{{b}}');
			expect(convertToMarkdownSyntax('{#:1-10}{eval:x}')).toBe('{{random:1-10}}{{eval:x}}');
		});

		it('preserves curly braces in LaTeX', () => {
			const latex = '\\frac{x^2}{2} + \\sqrt{y}';
			expect(convertToMarkdownSyntax(latex)).toBe(latex);
		});

		it('handles deeply nested expressions', () => {
			const input = '{eval:{@:a}*{#:1-{@:max}}}';
			const expected = '{{eval:{{a}}*{{random:1-{{max}}}}}}';
			expect(convertToMarkdownSyntax(input)).toBe(expected);
		});

		it('handles unmatched braces gracefully (random)', () => {
			// Unmatched opening brace - should skip incomplete pattern
			const input = 'Text {#:1-10';
			expect(convertToMarkdownSyntax(input)).toBe(input);
		});

		it('handles unmatched braces gracefully (eval)', () => {
			// Unmatched opening brace - should skip incomplete pattern
			const input = 'Text {eval:x+y';
			expect(convertToMarkdownSyntax(input)).toBe(input);
		});

		it('handles unmatched braces in markdown to questions conversion', () => {
			// Unmatched opening brace in {{eval:
			const input = 'Text {{eval:x+y';
			expect(convertToQuestionsSyntax(input)).toBe(input);
		});

		it('handles unmatched braces in {{random: conversion', () => {
			// Unmatched opening brace
			const input = 'Text {{random:1-10';
			expect(convertToQuestionsSyntax(input)).toBe(input);
		});

		it('handles strings with only braces', () => {
			expect(convertToMarkdownSyntax('{{{{')).toBe('{{{{');
			expect(convertToMarkdownSyntax('}}}}')).toBe('}}}}');
		});

		it('handles mixed valid and invalid patterns', () => {
			const input = '{@:a} {#:incomplete {@:b}';
			// Should convert {@:a} and {@:b}, leave incomplete pattern
			const result = convertToMarkdownSyntax(input);
			expect(result).toContain('{{a}}');
			expect(result).toContain('{{b}}');
		});
	});

	describe('performance tests', () => {
		it('converts large text efficiently (< 5ms per conversion)', () => {
			// Create a large template with many variables
			const variables = Array.from({ length: 100 }, (_, i) => `{@:var${i}}`).join(' + ');
			const randoms = Array.from({ length: 50 }, (_, i) => `{#:${i}-${i + 10}}`).join(' * ');
			const evals = Array.from({ length: 30 }, (_, i) => `{eval:{@:a${i}}+{@:b${i}}}`).join(' - ');
			const largeText = `${variables} ${randoms} ${evals}`;

			const startTime = performance.now();
			const result = convertToMarkdownSyntax(largeText);
			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete in < 5ms
			expect(duration).toBeLessThan(5);

			// Verify conversion happened
			expect(result).toContain('{{var0}}');
			expect(result).toContain('{{random:0-10}}');
			expect(result).toContain('{{eval:{{a0}}+{{b0}}}}');
		});

		it('handles 100 conversions in < 100ms total', () => {
			const templates = Array.from({ length: 100 }, (_, i) => ({
				statement: `Calculate {@:a${i}} + {@:b${i}}`,
				variable: `{#:${i}-${i + 100}}`,
				answer: `{eval:{@:a${i}}+{@:b${i}}}`
			}));

			const startTime = performance.now();
			templates.forEach((t) => {
				convertToMarkdownSyntax(t.statement);
				convertToMarkdownSyntax(t.variable);
				convertToMarkdownSyntax(t.answer);
			});
			const endTime = performance.now();
			const duration = endTime - startTime;

			// 300 conversions in < 100ms (avg < 0.33ms per conversion)
			expect(duration).toBeLessThan(100);
		});

		it('round-trip conversion maintains data integrity', () => {
			const original = '{@:x} + {#:1-{@:max}!{@:x}} = {eval:{@:x}+5}';

			// Convert to Markdown and back 10 times
			let current = original;
			for (let i = 0; i < 10; i++) {
				const markdown = convertToMarkdownSyntax(current);
				current = convertToQuestionsSyntax(markdown);
			}

			// Should be identical to original
			expect(current).toBe(original);
		});

		it('handles deeply nested structures without stack overflow', () => {
			// Create deeply nested eval expression (50 levels)
			let nested = '{@:x}';
			for (let i = 0; i < 50; i++) {
				nested = `{eval:${nested}+1}`;
			}

			// Should not throw, even with deep nesting
			expect(() => convertToMarkdownSyntax(nested)).not.toThrow();

			const result = convertToMarkdownSyntax(nested);
			expect(result).toContain('{{x}}');
			expect(result).toContain('{{eval:');
		});
	});

	describe('syntax detection comprehensive tests', () => {
		it('detects all Questions syntax patterns', () => {
			expect(detectSyntax('{@:var}')).toBe('questions');
			expect(detectSyntax('{#:1-10}')).toBe('questions');
			expect(detectSyntax('{eval:x+y}')).toBe('questions');
		});

		it('detects Markdown syntax patterns', () => {
			expect(detectSyntax('{{var}}')).toBe('markdown');
			expect(detectSyntax('{{random:1-10}}')).toBe('markdown');
			expect(detectSyntax('{{eval:x+y}}')).toBe('markdown');
		});

		it('detects mixed syntax', () => {
			expect(detectSyntax('{@:a} {{b}}')).toBe('mixed');
			expect(detectSyntax('{{a}} {#:1-10}')).toBe('mixed');
			expect(detectSyntax('{eval:x} {{y}}')).toBe('mixed');
		});

		it('detects no syntax in plain text', () => {
			expect(detectSyntax('Calculate 5 + 3')).toBe('none');
			expect(detectSyntax('$$\\frac{x}{y}$$')).toBe('none');
			expect(detectSyntax('')).toBe('none');
		});

		it('handles edge cases in detection', () => {
			expect(detectSyntax('{')).toBe('none');
			expect(detectSyntax('{{')).toBe('markdown');
			expect(detectSyntax('{@:')).toBe('questions');
			expect(detectSyntax('{#:')).toBe('questions');
		});
	});

	describe('normalizeToMarkdown comprehensive tests', () => {
		it('normalizes Questions syntax', () => {
			expect(normalizeToMarkdown('{@:a}')).toBe('{{a}}');
			expect(normalizeToMarkdown('{#:1-10}')).toBe('{{random:1-10}}');
			expect(normalizeToMarkdown('{eval:x}')).toBe('{{eval:x}}');
		});

		it('preserves already-Markdown syntax', () => {
			expect(normalizeToMarkdown('{{a}}')).toBe('{{a}}');
			expect(normalizeToMarkdown('{{random:1-10}}')).toBe('{{random:1-10}}');
		});

		it('normalizes mixed syntax', () => {
			const mixed = '{@:a} and {{b}}';
			const normalized = normalizeToMarkdown(mixed);
			expect(normalized).toBe('{{a}} and {{b}}');
		});

		it('preserves plain text', () => {
			expect(normalizeToMarkdown('No templates')).toBe('No templates');
		});
	});

	describe('helper functions comprehensive tests', () => {
		it('converts ContentField preserving structure', () => {
			const field = {
				type: 'text',
				content: '{@:x} + {#:1-10} = {eval:{@:x}+5}'
			};
			const converted = convertContentFieldToMarkdown(field);

			expect(converted.type).toBe('text');
			expect(converted.content).toBe('{{x}} + {{random:1-10}} = {{eval:{{x}}+5}}');
		});

		it('converts Variable preserving name', () => {
			const variable = {
				name: 'myVar',
				expression: '{#:1-{@:max}}'
			};
			const converted = convertVariableToMarkdown(variable);

			expect(converted.name).toBe('myVar');
			expect(converted.expression).toBe('{{random:1-{{max}}}}');
		});

		it('handles empty ContentField', () => {
			const field = { type: 'text', content: '' };
			const converted = convertContentFieldToMarkdown(field);
			expect(converted.content).toBe('');
		});

		it('handles empty Variable expression', () => {
			const variable = { name: 'x', expression: '' };
			const converted = convertVariableToMarkdown(variable);
			expect(converted.expression).toBe('');
		});
	});

	describe('real-world migration scenarios', () => {
		it('converts complete question template from database', () => {
			const dbTemplate = {
				statement: 'Calculer : $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$',
				variables: [
					{ name: 'den', expression: '{#:2-12}' },
					{ name: 'num1', expression: '{#:1-{@:den}-1}' },
					{ name: 'num2', expression: '{#:1-{@:den}-1!{@:num1}}' }
				],
				answer: '{eval:({@:num1}+{@:num2})/{@:den}}'
			};

			const converted = {
				statement: convertToMarkdownSyntax(dbTemplate.statement),
				variables: dbTemplate.variables.map(convertVariableToMarkdown),
				answer: convertToMarkdownSyntax(dbTemplate.answer)
			};

			expect(converted.statement).toBe(
				'Calculer : $$\\frac{{{num1}}}{{{den}}} + \\frac{{{num2}}}{{{den}}}$$'
			);
			expect(converted.variables[0].expression).toBe('{{random:2-12}}');
			expect(converted.variables[1].expression).toBe('{{random:1-{{den}}-1}}');
			expect(converted.variables[2].expression).toBe('{{random:1-{{den}}-1!{{num1}}}}');
			expect(converted.answer).toBe('{{eval:({{num1}}+{{num2}})/{{den}}}}');
		});

		it('handles template with no dynamic content', () => {
			const staticTemplate = 'What is 2 + 2?';
			expect(convertToMarkdownSyntax(staticTemplate)).toBe(staticTemplate);
		});

		it('handles template with only LaTeX', () => {
			const latexOnly = '$$\\int_0^1 x^2 dx = \\frac{1}{3}$$';
			expect(convertToMarkdownSyntax(latexOnly)).toBe(latexOnly);
		});

		it('converts multiple choice options with variables', () => {
			const choices = [
				'{eval:{@:a}+{@:b}}',
				'{eval:{@:a}-{@:b}}',
				'{eval:{@:a}*{@:b}}',
				'{eval:{@:a}/{@:b}}'
			];

			const converted = choices.map(convertToMarkdownSyntax);

			expect(converted[0]).toBe('{{eval:{{a}}+{{b}}}}');
			expect(converted[1]).toBe('{{eval:{{a}}-{{b}}}}');
			expect(converted[2]).toBe('{{eval:{{a}}*{{b}}}}');
			expect(converted[3]).toBe('{{eval:{{a}}/{{b}}}}');
		});
	});
});
