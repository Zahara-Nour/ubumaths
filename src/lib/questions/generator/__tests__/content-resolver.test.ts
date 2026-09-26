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
import { resolveMarkdownContent, resolveExpression } from '../content-resolver';
import { templateMarkdown } from '$lib/ubumark';
import type { ResolvedVariable } from '../../types';

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

// Un calcul exact (`{{eval:…}}`) rend du LaTeX (`\dfrac{9}{7}`, `2 \sqrt{2}`) ; inséré dans
// une formule en syntaxe maison, il ne doit pas empêcher sa conversion (#381, #579, #586).
describe('Math zone conversion — résultat exact inséré dans une formule maison', () => {
	const vars = (entries: Record<string, string>): ResolvedVariable[] =>
		Object.entries(entries).map(([name, value]) => ({ name, value }));

	it('produit par une fraction exacte : 3*{{eval:9/7}}', () => {
		const result = resolveMarkdownContent(templateMarkdown('$$3*{{eval:9/7}}$$'), []);
		expect(result).toBe('$$3 \\times \\dfrac{9}{7}$$');
	});

	it('fonction affine à coefficients exacts', () => {
		const result = resolveMarkdownContent(
			templateMarkdown('$$f(x)={{{eval:a/b}}}x+{{eval:c/d}}$$'),
			vars({ a: '4', b: '9', c: '9', d: '7' })
		);
		expect(result).toBe('$$f\\left( x \\right) = \\dfrac{4}{9} x + \\dfrac{9}{7}$$');
	});

	it('fraction négative et racine', () => {
		const result = resolveMarkdownContent(
			templateMarkdown('$$x={{eval:-6/8}}$$\n\n$$y={{eval:sqrt(8)}}+1$$'),
			[]
		);
		expect(result).toBe('$$x = -\\dfrac{3}{4}$$\n\n$$y = 2 \\sqrt{2} + 1$$');
	});

	it('une formule entièrement LaTeX reste telle quelle', () => {
		const content = '$$\\begin{align} \\dfrac{9}{7} &= {{eval:18/14}} \\end{align}$$';
		const result = resolveMarkdownContent(templateMarkdown(content), []);
		expect(result).toBe('$$\\begin{align} \\dfrac{9}{7} &= \\dfrac{9}{7} \\end{align}$$');
	});
});

describe('Math zone conversion — formule LaTeX d’auteur non réécrite', () => {
	it('\\dfrac à arguments littéraux : laissé tel quel', () => {
		const content = '$$x=\\dfrac{-b}{2a}$$';
		expect(resolveMarkdownContent(templateMarkdown(content), [])).toBe(content);
	});

	it('racine d’une fraction exacte insérée : \\dfrac{\\sqrt{3}}{2}', () => {
		const result = resolveMarkdownContent(templateMarkdown('$$2*\\dfrac{\\sqrt{3}}{2}$$'), []);
		expect(result).toBe('$$2 \\times \\dfrac{\\sqrt{3}}{2}$$');
	});
});

// Deux formules `$$…$$` sur une même ligne : le texte entre elles était lu comme une
// formule `$…$` (« et » → `\exponentialE t`, « ou » → `o u`).
describe('Math zone conversion — texte entre deux formules en bloc', () => {
	it('le texte entre deux $$…$$ reste du texte', () => {
		const result = resolveMarkdownContent(templateMarkdown('$$x=1$$ et $$y=2$$'), []);
		expect(result).toBe('$$x = 1$$ et $$y = 2$$');
	});

	it('formules en ligne et en bloc mêlées', () => {
		const result = resolveMarkdownContent(templateMarkdown('soit $a=1$ ou $$b=2$$ donc $c=3$'), []);
		expect(result).toBe('soit $a = 1$ ou $$b = 2$$ donc $c = 3$');
	});
});
