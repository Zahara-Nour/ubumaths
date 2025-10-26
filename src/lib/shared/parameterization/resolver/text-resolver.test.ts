/**
 * Text Resolver Tests
 * ====================
 *
 * Tests for resolving parameter tokens in arbitrary text.
 * Tests variable replacement while preserving formatting and context.
 */

import { describe, it, expect } from 'vitest';
import { resolveText } from './text-resolver';
import type { ResolvedVariable } from '../types';

describe('resolveText', () => {
	// ============================================================================
	// MARKDOWN SYNTAX
	// ============================================================================

	describe('Markdown syntax', () => {
		it('should resolve single variable', () => {
			const text = 'Value is {{a}}';
			const resolved: ResolvedVariable[] = [{ name: 'a', value: '42' }];
			expect(resolveText(text, resolved)).toBe('Value is 42');
		});

		it('should resolve multiple variables', () => {
			const text = '{{a}} + {{b}} = {{sum}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '5' },
				{ name: 'b', value: '10' },
				{ name: 'sum', value: '15' }
			];
			expect(resolveText(text, resolved)).toBe('5 + 10 = 15');
		});

		it('should preserve surrounding text', () => {
			const text = 'The answer is {{value}} units.';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: '42' }];
			expect(resolveText(text, resolved)).toBe('The answer is 42 units.');
		});

		it('should handle variable at start', () => {
			const text = '{{value}} is the answer';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: '42' }];
			expect(resolveText(text, resolved)).toBe('42 is the answer');
		});

		it('should handle variable at end', () => {
			const text = 'The answer is {{value}}';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: '42' }];
			expect(resolveText(text, resolved)).toBe('The answer is 42');
		});

		it('should handle consecutive variables', () => {
			const text = '{{a}}{{b}}{{c}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '1' },
				{ name: 'b', value: '2' },
				{ name: 'c', value: '3' }
			];
			expect(resolveText(text, resolved)).toBe('123');
		});

		it('should handle same variable multiple times', () => {
			const text = '{{a}} + {{a}} = {{doubled}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '5' },
				{ name: 'doubled', value: '10' }
			];
			expect(resolveText(text, resolved)).toBe('5 + 5 = 10');
		});

		it('should throw error on undefined variable', () => {
			const text = 'Value: {{undefined}}';
			const resolved: ResolvedVariable[] = [{ name: 'a', value: '5' }];
			expect(() => resolveText(text, resolved)).toThrow(
				'Variable "undefined" not found in resolved variables'
			);
		});
	});

	// ============================================================================
	// LATEX CONTEXT
	// ============================================================================

	describe('LaTeX context', () => {
		it('should handle variables in LaTeX expressions', () => {
			const text = '$$\\frac{{{a}}}{{{b}}}$$';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '3' },
				{ name: 'b', value: '4' }
			];
			expect(resolveText(text, resolved)).toBe('$$\\frac{3}{4}$$');
		});

		it('should handle variables in inline LaTeX', () => {
			const text = 'Calculate $\\sqrt{{{value}}}$';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: '16' }];
			expect(resolveText(text, resolved)).toBe('Calculate $\\sqrt{16}$');
		});

		it('should handle complex LaTeX formula', () => {
			const text = '$$\\sum_{i=1}^{{{n}}} i = {{result}}$$';
			const resolved: ResolvedVariable[] = [
				{ name: 'n', value: '10' },
				{ name: 'result', value: '55' }
			];
			expect(resolveText(text, resolved)).toBe('$$\\sum_{i=1}^{10} i = 55$$');
		});

		it('should preserve LaTeX escapes', () => {
			const text = '$$\\frac{{{a}}}{2} \\times \\sqrt{{{b}}}$$';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '10' },
				{ name: 'b', value: '9' }
			];
			expect(resolveText(text, resolved)).toBe('$$\\frac{10}{2} \\times \\sqrt{9}$$');
		});
	});

	// ============================================================================
	// SPECIAL CHARACTERS & FORMATTING
	// ============================================================================

	describe('Special characters and formatting', () => {
		it('should preserve whitespace', () => {
			const text = '  {{a}}  +  {{b}}  ';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '5' },
				{ name: 'b', value: '10' }
			];
			expect(resolveText(text, resolved)).toBe('  5  +  10  ');
		});

		it('should preserve newlines', () => {
			const text = 'Line 1: {{a}}\nLine 2: {{b}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '5' },
				{ name: 'b', value: '10' }
			];
			expect(resolveText(text, resolved)).toBe('Line 1: 5\nLine 2: 10');
		});

		it('should handle special characters around variables', () => {
			const text = '${{price}} (€{{euros}})';
			const resolved: ResolvedVariable[] = [
				{ name: 'price', value: '99' },
				{ name: 'euros', value: '85' }
			];
			expect(resolveText(text, resolved)).toBe('$99 (€85)');
		});

		it('should handle punctuation', () => {
			const text = '{{a}}, {{b}}; {{c}}!';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '1' },
				{ name: 'b', value: '2' },
				{ name: 'c', value: '3' }
			];
			expect(resolveText(text, resolved)).toBe('1, 2; 3!');
		});

		it('should handle Unicode characters', () => {
			const text = '∑ {{n}} → {{result}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'n', value: '10' },
				{ name: 'result', value: '55' }
			];
			expect(resolveText(text, resolved)).toBe('∑ 10 → 55');
		});

		it('should handle quotes', () => {
			const text = 'She said "{{value}}" loudly';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: 'hello' }];
			expect(resolveText(text, resolved)).toBe('She said "hello" loudly');
		});

		it('should handle parentheses', () => {
			const text = '({{a}} + {{b}})';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '5' },
				{ name: 'b', value: '10' }
			];
			expect(resolveText(text, resolved)).toBe('(5 + 10)');
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		it('should handle empty text', () => {
			const text = '';
			const resolved: ResolvedVariable[] = [];
			expect(resolveText(text, resolved)).toBe('');
		});

		it('should handle text without variables', () => {
			const text = 'No variables here';
			const resolved: ResolvedVariable[] = [];
			expect(resolveText(text, resolved)).toBe('No variables here');
		});

		it('should handle empty resolved array', () => {
			const text = 'Plain text';
			const resolved: ResolvedVariable[] = [];
			expect(resolveText(text, resolved)).toBe('Plain text');
		});

		it('should handle decimal variable values', () => {
			const text = 'Pi = {{pi}}';
			const resolved: ResolvedVariable[] = [{ name: 'pi', value: '3.14159' }];
			expect(resolveText(text, resolved)).toBe('Pi = 3.14159');
		});

		it('should handle negative variable values', () => {
			const text = 'Temperature: {{temp}}°C';
			const resolved: ResolvedVariable[] = [{ name: 'temp', value: '-5' }];
			expect(resolveText(text, resolved)).toBe('Temperature: -5°C');
		});

		it('should handle zero values', () => {
			const text = 'Value: {{zero}}';
			const resolved: ResolvedVariable[] = [{ name: 'zero', value: '0' }];
			expect(resolveText(text, resolved)).toBe('Value: 0');
		});

		it('should handle very long variable values', () => {
			const text = 'Long: {{long}}';
			const longValue = '1234567890'.repeat(10);
			const resolved: ResolvedVariable[] = [{ name: 'long', value: longValue }];
			expect(resolveText(text, resolved)).toBe(`Long: ${longValue}`);
		});

		it('should handle variable names with underscores', () => {
			const text = 'Value: {{my_var_name}}';
			const resolved: ResolvedVariable[] = [{ name: 'my_var_name', value: '42' }];
			expect(resolveText(text, resolved)).toBe('Value: 42');
		});

		it('should handle single character variable names', () => {
			const text = '{{a}} {{b}} {{c}}';
			const resolved: ResolvedVariable[] = [
				{ name: 'a', value: '1' },
				{ name: 'b', value: '2' },
				{ name: 'c', value: '3' }
			];
			expect(resolveText(text, resolved)).toBe('1 2 3');
		});

		it('should handle text with only variables', () => {
			const text = '{{value}}';
			const resolved: ResolvedVariable[] = [{ name: 'value', value: 'content' }];
			expect(resolveText(text, resolved)).toBe('content');
		});

		it('should handle variable values that look like tokens', () => {
			const text = 'Value: {{val}}';
			const resolved: ResolvedVariable[] = [{ name: 'val', value: '{{something}}' }];
			expect(resolveText(text, resolved)).toBe('Value: {{something}}');
		});

		it('should handle HTML-like content', () => {
			const text = '<div>Value: {{a}}</div>';
			const resolved: ResolvedVariable[] = [{ name: 'a', value: '42' }];
			expect(resolveText(text, resolved)).toBe('<div>Value: 42</div>');
		});
	});
});
