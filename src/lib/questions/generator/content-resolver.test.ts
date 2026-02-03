/**
 * Content Resolver Tests
 *
 * Tests for the content resolution pipeline including:
 * - Variable resolution
 * - Math zone conversion (custom → LaTeX)
 *
 * @module questions/generator/content-resolver.test
 */

import { describe, it, expect } from 'vitest';
import { resolveMarkdownContent, resolveExpression } from './content-resolver';
import { templateMarkdown } from '$lib/ubumark';
import type { ResolvedVariable } from '../types';

describe('Content Resolver', () => {
	describe('resolveMarkdownContent', () => {
		describe('Math zone conversion (custom → LaTeX)', () => {
			it('should convert inline math $...$ from custom to LaTeX', () => {
				const template = templateMarkdown('Calculate $a/b$');
				const result = resolveMarkdownContent(template, []);

				// a/b in custom syntax → \dfrac{a}{b} in LaTeX (dfrac = display fraction)
				expect(String(result)).toBe('Calculate $\\dfrac{a}{b}$');
			});

			it('should convert block math $$...$$ from custom to LaTeX', () => {
				const template = templateMarkdown('$$x^2 + 2x + 1$$');
				const result = resolveMarkdownContent(template, []);

				// Should convert to LaTeX (exact output depends on mathAST)
				expect(String(result)).toContain('$$');
				expect(String(result)).toContain('x');
			});

			it('should NOT convert custom math zones ~...~', () => {
				const template = templateMarkdown('Answer: ~a+b~');
				const result = resolveMarkdownContent(template, []);

				// ~...~ should remain unchanged
				expect(String(result)).toBe('Answer: ~a+b~');
			});

			it('should NOT convert custom block math zones ~~...~~', () => {
				const template = templateMarkdown('Expected: ~~x^2~~');
				const result = resolveMarkdownContent(template, []);

				// ~~...~~ should remain unchanged
				expect(String(result)).toBe('Expected: ~~x^2~~');
			});

			it('should convert variables inside $...$ to LaTeX after resolution', () => {
				const template = templateMarkdown('Calculate ${{expr}}$');
				const resolved: ResolvedVariable[] = [{ name: 'expr', value: 'a/b' }];

				const result = resolveMarkdownContent(template, resolved);

				// Variable resolved, then content converted to LaTeX (dfrac = display fraction)
				expect(String(result)).toBe('Calculate $\\dfrac{a}{b}$');
			});

			it('should keep variables inside ~...~ in custom syntax', () => {
				const template = templateMarkdown('Solution: ~{{expr}}~');
				const resolved: ResolvedVariable[] = [{ name: 'expr', value: 'a/b' }];

				const result = resolveMarkdownContent(template, resolved);

				// Variable resolved, but NOT converted to LaTeX
				expect(String(result)).toBe('Solution: ~a/b~');
			});

			it('should handle mixed content with both $...$ and ~...~', () => {
				const template = templateMarkdown('Display: ${{a}}$ and compare with ~{{a}}~');
				const resolved: ResolvedVariable[] = [{ name: 'a', value: 'x/y' }];

				const result = resolveMarkdownContent(template, resolved);

				// $...$ converted to LaTeX, ~...~ remains in custom syntax
				expect(String(result)).toBe('Display: $\\dfrac{x}{y}$ and compare with ~x/y~');
			});

			it('should handle complex expressions with powers', () => {
				// Use braces to ensure fraction parsing: {10^2}/{10^3}
				const template = templateMarkdown('${10^2}/{10^3}$');
				const result = resolveMarkdownContent(template, []);

				// Should produce LaTeX with proper fraction and powers
				expect(String(result)).toContain('frac');
				expect(String(result)).toContain('10');
			});

			it('should handle multiple inline math zones', () => {
				const template = templateMarkdown('$a$ plus $b$ equals $a+b$');
				const result = resolveMarkdownContent(template, []);

				// Each zone should be converted
				const resultStr = String(result);
				expect(resultStr).toContain('$a$');
				expect(resultStr).toContain('$b$');
				expect(resultStr).toContain('$a + b$');
			});
		});

		describe('Variable resolution', () => {
			it('should resolve simple variable references', () => {
				const template = templateMarkdown('Value: {{x}}');
				const resolved: ResolvedVariable[] = [{ name: 'x', value: '42' }];

				const result = resolveMarkdownContent(template, resolved);

				expect(String(result)).toBe('Value: 42');
			});

			it('should resolve multiple variables', () => {
				const template = templateMarkdown('Sum of {{a}} and {{b}}');
				const resolved: ResolvedVariable[] = [
					{ name: 'a', value: '5' },
					{ name: 'b', value: '3' }
				];

				const result = resolveMarkdownContent(template, resolved);

				expect(String(result)).toBe('Sum of 5 and 3');
			});
		});
	});

	describe('resolveExpression', () => {
		it('should resolve variables in plain expressions', () => {
			const result = resolveExpression('{{a}} + {{b}}', [
				{ name: 'a', value: '5' },
				{ name: 'b', value: '3' }
			]);

			expect(result).toBe('5 + 3');
		});

		it('should NOT convert math syntax (no delimiters)', () => {
			// resolveExpression is for answers/solutions - no LaTeX conversion
			const result = resolveExpression('a/b', []);

			expect(result).toBe('a/b');
		});
	});
});
