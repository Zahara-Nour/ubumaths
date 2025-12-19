/**
 * Hardbreak Parser Tests
 * ======================
 *
 * Unit tests for hard line breaks in markdown.
 * Supports two syntaxes:
 * - Backslash at end of line: `\\\n`
 * - Two or more spaces at end of line: `  \n`
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';

describe('parseMarkdown - hardbreak support', () => {
	describe('backslash syntax (\\)', () => {
		it('should parse backslash at end of line as hard break', () => {
			const markdown = 'First line\\\nSecond line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				// Should have: text, line-break, text
				expect(paragraph.children.length).toBeGreaterThanOrEqual(3);

				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeDefined();

				if (lineBreak && lineBreak.type === 'line-break') {
					expect(lineBreak.hard).toBe(true);
				}
			}
		});

		it('should parse multiple backslash breaks', () => {
			const markdown = 'Line 1\\\nLine 2\\\nLine 3';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreaks = paragraph.children.filter((n) => n.type === 'line-break');
				expect(lineBreaks).toHaveLength(2);
			}
		});

		it('should NOT parse backslash NOT at end of line', () => {
			const markdown = 'This is a \\ backslash in text';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeUndefined();
			}
		});
	});

	describe('two spaces syntax', () => {
		it('should parse two spaces at end of line as hard break', () => {
			const markdown = 'First line  \nSecond line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeDefined();

				if (lineBreak && lineBreak.type === 'line-break') {
					expect(lineBreak.hard).toBe(true);
				}
			}
		});

		it('should parse three or more spaces at end of line as hard break', () => {
			const markdown = 'First line   \nSecond line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type === 'paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeDefined();

				if (lineBreak && lineBreak.type === 'line-break') {
					expect(lineBreak.hard).toBe(true);
				}
			}
		});

		it('should NOT parse single space at end of line as hard break', () => {
			const markdown = 'First line \nSecond line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeUndefined();
			}
		});
	});

	describe('combined with other inline elements', () => {
		it('should work with bold text', () => {
			const markdown = '**Bold**\\\nNormal';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];

				// Should have bold text
				const boldNode = paragraph.children.find(
					(n) => n.type === 'text' && n.bold && n.content === 'Bold'
				);
				expect(boldNode).toBeDefined();

				// Should have line break
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeDefined();
			}
		});

		it('should work with inline math', () => {
			const markdown = 'Calculate $x^2$\\\nResult';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];

				// Should have math inline
				const mathNode = paragraph.children.find((n) => n.type === 'math-inline');
				expect(mathNode).toBeDefined();

				// Should have line break
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeDefined();
			}
		});

		it('should NOT interpret \\\\ inside math as hardbreak', () => {
			// LaTeX line breaks in math should NOT be treated as hardbreaks
			const markdown = '$$x \\\\ y$$';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('math-block');

			if (ast.children[0].type === 'math-block') {
				// The \\\\ should be preserved in the expression
				expect(ast.children[0].expression).toContain('\\\\');
			}
		});
	});

	describe('in list items', () => {
		it('should work with backslash syntax in list item text', () => {
			const markdown = '1. First line\\\n   Second line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('list');

			if (ast.children[0].type === 'list') {
				const list = ast.children[0];
				expect(list.items).toHaveLength(1);

				const firstItem = list.items[0];
				if (firstItem.children[0].type === 'paragraph') {
					const paragraph = firstItem.children[0];
					const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
					expect(lineBreak).toBeDefined();
				}
			}
		});

		it('should work with two spaces syntax in list item text', () => {
			const markdown = '1. First line  \n   Second line';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('list');

			if (ast.children[0].type === 'list') {
				const list = ast.children[0];
				expect(list.items).toHaveLength(1);

				const firstItem = list.items[0];
				if (firstItem.children[0].type === 'paragraph') {
					const paragraph = firstItem.children[0];
					const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
					expect(lineBreak).toBeDefined();
				}
			}
		});
	});

	describe('edge cases', () => {
		it('should NOT parse backslash followed by non-newline character', () => {
			// Escaped characters like \* should NOT be treated as hardbreaks
			const markdown = 'Escaped \\* asterisk';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreak = paragraph.children.find((n) => n.type === 'line-break');
				expect(lineBreak).toBeUndefined();
			}
		});

		it('should handle hardbreak at start of paragraph', () => {
			const markdown = '\\\nText after break';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				// Line break should be first
				expect(paragraph.children[0].type).toBe('line-break');
			}
		});

		it('should handle hardbreak at end of paragraph', () => {
			const markdown = 'Text before break\\';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				// Should have text and line break
				const lastChild = paragraph.children[paragraph.children.length - 1];
				expect(lastChild.type).toBe('line-break');
			}
		});

		it('should handle consecutive hardbreaks', () => {
			const markdown = 'Line 1\\\n\\\nLine 2';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreaks = paragraph.children.filter((n) => n.type === 'line-break');
				expect(lineBreaks.length).toBeGreaterThanOrEqual(2);
			}
		});

		it('should handle mixed hardbreak syntaxes', () => {
			const markdown = 'Line 1\\\nLine 2  \nLine 3';
			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('paragraph');

			if (ast.children[0].type === 'paragraph') {
				const paragraph = ast.children[0];
				const lineBreaks = paragraph.children.filter((n) => n.type === 'line-break');
				expect(lineBreaks).toHaveLength(2);
			}
		});
	});
});
