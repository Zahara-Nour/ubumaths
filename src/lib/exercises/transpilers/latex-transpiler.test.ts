/**
 * LaTeX Transpiler Tests
 * =======================
 *
 * Unit tests for the LaTeX transpilation module.
 */

import { describe, it, expect } from 'vitest';
import {
	escapeLatex,
	resolveImagePath,
	transpileToLatex,
	markdownToLatex
} from './latex-transpiler';
import type { DocumentNode } from '../types';

describe('escapeLatex', () => {
	it('should escape special LaTeX characters', () => {
		expect(escapeLatex('&')).toBe('\\&');
		expect(escapeLatex('%')).toBe('\\%');
		expect(escapeLatex('$')).toBe('\\$');
		expect(escapeLatex('#')).toBe('\\#');
		expect(escapeLatex('_')).toBe('\\_');
		expect(escapeLatex('{')).toBe('\\{');
		expect(escapeLatex('}')).toBe('\\}');
	});

	it('should escape backslash', () => {
		expect(escapeLatex('\\')).toBe('\\textbackslash{}');
	});

	it('should escape tilde and caret', () => {
		expect(escapeLatex('~')).toBe('\\textasciitilde{}');
		expect(escapeLatex('^')).toBe('\\textasciicircum{}');
	});

	it('should escape multiple characters', () => {
		const result = escapeLatex('Price: $10 & 20% off');
		expect(result).toContain('\\$');
		expect(result).toContain('\\&');
		expect(result).toContain('\\%');
	});

	it('should not escape regular text', () => {
		expect(escapeLatex('Hello World')).toBe('Hello World');
		expect(escapeLatex('abc123')).toBe('abc123');
	});

	it('should handle empty string', () => {
		expect(escapeLatex('')).toBe('');
	});
});

describe('resolveImagePath', () => {
	it('should resolve relative path with base path', () => {
		const result = resolveImagePath('image.png', '/exercises');
		expect(result).toBe('/exercises/image.png');
	});

	it('should keep absolute path as-is', () => {
		const result = resolveImagePath('/abs/path/image.png', '/exercises');
		expect(result).toBe('/abs/path/image.png');
	});

	it('should extract filename from URL', () => {
		const result = resolveImagePath('https://example.com/path/image.png', '');
		expect(result).toBe('image.png');
	});

	it('should handle URL with base path', () => {
		const result = resolveImagePath('https://example.com/path/image.png', '/local');
		expect(result).toBe('/local/image.png');
	});

	it('should handle relative path without base path', () => {
		const result = resolveImagePath('exercises/image.png', '');
		expect(result).toBe('exercises/image.png');
	});
});

describe('transpileToLatex', () => {
	it('should generate document with preamble', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Hello World' }]
				}
			]
		};

		const latex = transpileToLatex(ast);

		expect(latex).toContain('\\documentclass');
		expect(latex).toContain('\\begin{document}');
		expect(latex).toContain('\\end{document}');
		expect(latex).toContain('Hello World');
	});

	it('should generate document without preamble when disabled', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Content' }]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).not.toContain('\\documentclass');
		expect(latex).not.toContain('\\begin{document}');
		expect(latex).toContain('Content');
	});

	it('should transpile paragraph with text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Simple paragraph' }]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('Simple paragraph');
	});

	it('should transpile inline math', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'Calculate ' },
						{ type: 'math-inline', latex: 'x^2' },
						{ type: 'text', content: ' please' }
					]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('Calculate');
		expect(latex).toContain('$x^2$');
		expect(latex).toContain('please');
	});

	it('should transpile block math', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'math-block',
					latex: '\\int_0^\\pi \\sin(x) dx'
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\[');
		expect(latex).toContain('\\int_0^\\pi \\sin(x) dx');
		expect(latex).toContain('\\]');
	});

	it('should transpile ordered list', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'list',
					ordered: true,
					items: [
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'First' }]
								}
							]
						},
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Second' }]
								}
							]
						}
					]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{enumerate}');
		expect(latex).toContain('\\end{enumerate}');
		expect(latex).toContain('\\item');
		expect(latex).toContain('First');
		expect(latex).toContain('Second');
	});

	it('should transpile unordered list', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'list',
					ordered: false,
					items: [
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Item' }]
								}
							]
						}
					]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{itemize}');
		expect(latex).toContain('\\end{itemize}');
		expect(latex).toContain('\\item');
	});

	it('should transpile table', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'table',
					header: [
						{ content: 'x', align: 'left' },
						{ content: 'f(x)', align: 'left' }
					],
					rows: [
						[
							{ content: '0', align: 'left' },
							{ content: '0', align: 'left' }
						],
						[
							{ content: '1', align: 'left' },
							{ content: '2', align: 'left' }
						]
					],
					alignments: ['left', 'left']
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{tabular}');
		expect(latex).toContain('\\end{tabular}');
		expect(latex).toContain('\\hline');
		expect(latex).toContain('&');
		expect(latex).toContain('f(x)');
	});

	it('should transpile image', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'image.png',
					alt: 'Test image'
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\includegraphics');
		expect(latex).toContain('image.png');
		expect(latex).toContain('Test image');
		expect(latex).toContain('\\begin{center}');
		expect(latex).toContain('\\end{center}');
	});

	it('should include title and author when provided', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = transpileToLatex(ast, {
			title: 'Test Document',
			author: 'Test Author'
		});

		expect(latex).toContain('\\title{Test Document}');
		expect(latex).toContain('\\author{Test Author}');
		expect(latex).toContain('\\maketitle');
	});

	it('should customize document options', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = transpileToLatex(ast, {
			documentClass: 'report',
			paperSize: 'letterpaper',
			fontSize: '12pt'
		});

		expect(latex).toContain('\\documentclass[12pt,letterpaper]{report}');
	});

	it('should include extra packages', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = transpileToLatex(ast, {
			extraPackages: ['tikz', 'pgfplots']
		});

		expect(latex).toContain('\\usepackage{tikz}');
		expect(latex).toContain('\\usepackage{pgfplots}');
	});
});

describe('markdownToLatex', () => {
	it('should convert simple markdown to LaTeX', async () => {
		const markdown = 'Calculate $x^2$ please';

		const latex = await markdownToLatex(markdown, { includePreamble: false });

		expect(latex).toContain('Calculate');
		expect(latex).toContain('$x^2$');
		expect(latex).toContain('please');
	});

	it('should handle markdown with lists', async () => {
		const markdown = '1. First\n2. Second\n3. Third';

		const latex = await markdownToLatex(markdown, { includePreamble: false });

		expect(latex).toContain('enumerate');
		expect(latex).toContain('\\item');
	});

	it('should handle markdown with tables', async () => {
		const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';

		const latex = await markdownToLatex(markdown, { includePreamble: false });

		expect(latex).toContain('tabular');
		expect(latex).toContain('&');
	});

	it('should generate complete document by default', async () => {
		const markdown = 'Simple text';

		const latex = await markdownToLatex(markdown);

		expect(latex).toContain('\\documentclass');
		expect(latex).toContain('\\begin{document}');
		expect(latex).toContain('\\end{document}');
	});
});

describe('Edge Cases', () => {
	it('should handle empty document', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toBe('');
	});

	it('should handle nested lists', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'list',
					ordered: true,
					items: [
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Parent' }]
								},
								{
									type: 'list',
									ordered: false,
									items: [
										{
											type: 'list-item',
											children: [
												{
													type: 'paragraph',
													children: [{ type: 'text', content: 'Child' }]
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('enumerate');
		expect(latex).toContain('itemize');
		expect(latex).toContain('Parent');
		expect(latex).toContain('Child');
	});

	it('should handle table with different alignments', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'table',
					header: [
						{ content: 'Left', align: 'left' },
						{ content: 'Center', align: 'center' },
						{ content: 'Right', align: 'right' }
					],
					rows: [],
					alignments: ['left', 'center', 'right']
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('{|l|c|r|}');
	});

	it('should escape special characters in text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Price: $10 & 20% off' }]
				}
			]
		};

		const latex = transpileToLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\$');
		expect(latex).toContain('\\&');
		expect(latex).toContain('\\%');
	});
});
