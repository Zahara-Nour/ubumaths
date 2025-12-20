/**
 * LaTeX Generator Tests
 * =====================
 *
 * Unit tests for the LaTeX generation module.
 */

import { describe, it, expect } from 'vitest';
import { escapeLatex, resolveImagePath, generateLatex, markdownToLatex } from '../latex-generator';
import type { DocumentNode } from '$lib/exercises/types';

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

describe('generateLatex', () => {
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

		const latex = generateLatex(ast);

		expect(latex).toContain('\\documentclass');
		expect(latex).toContain('\\begin{document}');
		expect(latex).toContain('\\end{document}');
		expect(latex).toContain('Hello World');
	});

	it('should include tkz-tab package in preamble', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Test' }]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: true });

		expect(latex).toContain('\\usepackage{tkz-tab}');
		expect(latex).toContain('\\usetikzlibrary{arrows}');
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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).not.toContain('\\documentclass');
		expect(latex).not.toContain('\\begin{document}');
		expect(latex).toContain('Content');
	});

	it('should generate paragraph with text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Simple paragraph' }]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('Simple paragraph');
	});

	it('should generate inline math', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'Calculate ' },
						{ type: 'math-inline', expression: 'x^2', syntax: 'latex' },
						{ type: 'text', content: ' please' }
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('Calculate');
		expect(latex).toContain('$x^2$');
		expect(latex).toContain('please');
	});

	it('should generate block math', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'math-block',
					expression: '\\int_0^\\pi \\sin(x) dx',
					syntax: 'latex'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\[');
		expect(latex).toContain('\\int_0^\\pi \\sin(x) dx');
		expect(latex).toContain('\\]');
	});

	it('should generate ordered list', () => {
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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{enumerate}');
		expect(latex).toContain('\\end{enumerate}');
		expect(latex).toContain('\\item');
		expect(latex).toContain('First');
		expect(latex).toContain('Second');
	});

	it('should generate unordered list', () => {
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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{itemize}');
		expect(latex).toContain('\\end{itemize}');
		expect(latex).toContain('\\item');
	});

	it('should generate table', () => {
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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{tabular}');
		expect(latex).toContain('\\end{tabular}');
		expect(latex).toContain('\\hline');
		expect(latex).toContain('&');
		expect(latex).toContain('f(x)');
	});

	it('should generate image', () => {
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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\includegraphics');
		expect(latex).toContain('image.png');
		// Note: alt text is for accessibility (HTML), not displayed in LaTeX
		// Use caption if you want visible text under the image
		expect(latex).toContain('\\centering');
		expect(latex).toContain('\\par');
	});

	it('should include title and author when provided', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = generateLatex(ast, {
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

		const latex = generateLatex(ast, {
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

		const latex = generateLatex(ast, {
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

	it('should handle markdown with blockquotes', async () => {
		const markdown = '> This is a quoted text\n> with multiple lines';

		const latex = await markdownToLatex(markdown, { includePreamble: false });

		expect(latex).toContain('\\begin{quote}');
		expect(latex).toContain('\\end{quote}');
	});

	it('should handle markdown with code blocks', async () => {
		const markdown = '```javascript\nconst x = 1;\n```';

		const latex = await markdownToLatex(markdown, { includePreamble: false });

		expect(latex).toContain('\\begin{lstlisting}');
		expect(latex).toContain('language=JavaScript');
		expect(latex).toContain('const x = 1;');
	});
});

describe('Blockquote Generation', () => {
	it('should generate simple blockquote', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'blockquote',
					children: [
						{
							type: 'paragraph',
							children: [{ type: 'text', content: 'Quoted text' }]
						}
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{quote}');
		expect(latex).toContain('\\end{quote}');
		expect(latex).toContain('Quoted text');
	});

	it('should generate nested blockquotes', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'blockquote',
					children: [
						{
							type: 'paragraph',
							children: [{ type: 'text', content: 'Outer quote' }]
						},
						{
							type: 'blockquote',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Inner quote' }]
								}
							]
						}
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		// Should have nested quote environments
		expect(latex.match(/\\begin{quote}/g)?.length).toBe(2);
		expect(latex.match(/\\end{quote}/g)?.length).toBe(2);
		expect(latex).toContain('Outer quote');
		expect(latex).toContain('Inner quote');
	});

	it('should generate blockquote with formatted content', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'blockquote',
					children: [
						{
							type: 'paragraph',
							children: [
								{ type: 'text', content: 'This is ', bold: false },
								{ type: 'text', content: 'important', bold: true },
								{ type: 'text', content: ' text' }
							]
						}
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{quote}');
		expect(latex).toContain('\\textbf{important}');
		expect(latex).toContain('\\end{quote}');
	});
});

describe('Code Block Generation', () => {
	it('should generate code block without language', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: 'const x = 1;'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{lstlisting}');
		expect(latex).toContain('\\end{lstlisting}');
		expect(latex).toContain('const x = 1;');
		// No language option when not specified
		expect(latex).not.toContain('language=');
	});

	it('should generate code block with javascript language', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: 'function hello() {\n  console.log("Hello");\n}',
					language: 'javascript'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{lstlisting}[language=JavaScript]');
		expect(latex).toContain('function hello()');
		expect(latex).toContain('console.log("Hello")');
	});

	it('should generate code block with python language', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: 'def hello():\n    print("Hello")',
					language: 'python'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{lstlisting}[language=Python]');
		expect(latex).toContain('def hello()');
	});

	it('should preserve code content exactly', () => {
		const code = '  indented\n    double indented\n\nwith empty line';
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: code
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain(code);
	});

	it('should include listings package in preamble', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: 'code'
				}
			]
		};

		const latex = generateLatex(ast);

		expect(latex).toContain('\\usepackage{listings}');
		expect(latex).toContain('\\lstset');
	});
});

describe('Image Generation Enhanced', () => {
	it('should generate basic image without attributes (default medium size, center)', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'diagram.png'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\includegraphics');
		expect(latex).toContain('width=0.5\\textwidth');
		expect(latex).toContain('diagram.png');
		expect(latex).toContain('\\centering');
		expect(latex).toContain('\\par');
	});

	it('should generate image with sizeClass small', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'small-img.png',
					sizeClass: 'small'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('width=0.25\\textwidth');
	});

	it('should generate image with sizeClass large', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'large-img.png',
					sizeClass: 'large'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('width=0.75\\textwidth');
	});

	it('should generate image with sizeClass full', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'full-img.png',
					sizeClass: 'full'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('width=\\textwidth');
	});

	it('should generate image with widthPercent (overrides sizeClass)', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'custom-width.png',
					sizeClass: 'small', // Should be ignored
					widthPercent: 60
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('width=0.6\\textwidth');
		expect(latex).not.toContain('0.25'); // small sizeClass width should NOT appear
	});

	it('should generate image with left alignment', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'left-img.png',
					alignment: 'left'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\raggedright');
	});

	it('should generate image with right alignment', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'right-img.png',
					alignment: 'right'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\raggedleft');
	});

	it('should generate image with caption in figure environment', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'figure.png',
					caption: 'Figure 1: Test diagram'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{figure}[htbp]');
		expect(latex).toContain('\\end{figure}');
		expect(latex).toContain('\\caption{Figure 1: Test diagram}');
		expect(latex).toContain('\\centering');
	});

	it('should escape LaTeX special characters in caption', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'figure.png',
					caption: 'Price: $10 & 50% off'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\caption{Price: \\$10 \\& 50\\% off}');
	});

	it('should generate inline image', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'icon.png',
					sizeClass: 'inline'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\includegraphics[height=1em]{icon.png}');
		// Inline images should not have centering or figure environment
		expect(latex).not.toContain('\\centering');
		expect(latex).not.toContain('\\begin{figure}');
		expect(latex).not.toContain('\\par');
	});

	it('should generate image with all attributes combined', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'complex.png',
					widthPercent: 80,
					alignment: 'left',
					caption: 'A complex figure',
					alt: 'Complex diagram'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{figure}[htbp]');
		expect(latex).toContain('\\raggedright');
		expect(latex).toContain('width=0.8\\textwidth');
		expect(latex).toContain('\\caption{A complex figure}');
		expect(latex).toContain('\\end{figure}');
	});

	it('should handle very wide images with aspect ratio constraints', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'panorama.png',
					originalWidth: 1200,
					originalHeight: 300 // 4:1 ratio (> 3:1)
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('keepaspectratio');
		expect(latex).toContain('max height=0.3\\textheight');
	});

	it('should handle very tall images with aspect ratio constraints', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'tall.png',
					originalWidth: 200,
					originalHeight: 800 // 1:4 ratio (< 1:3)
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('keepaspectratio');
		expect(latex).toContain('max width=0.5\\textwidth');
	});

	it('should resolve image path with base path', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'subdir/image.png'
				}
			]
		};

		const latex = generateLatex(ast, {
			includePreamble: false,
			imageBasePath: '/images'
		});

		expect(latex).toContain('/images/subdir/image.png');
	});

	it('should handle URL image paths', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'https://example.com/path/to/remote-image.png'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		// URL images get extracted to filename
		expect(latex).toContain('remote-image.png');
	});

	it('should handle image without caption but with sizeClass (block, no figure)', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'image',
					src: 'block-img.png',
					sizeClass: 'large',
					alignment: 'center'
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		// Should use group with centering, not figure environment
		expect(latex).toContain('{\\centering');
		expect(latex).toContain('\\par}');
		expect(latex).not.toContain('\\begin{figure}');
	});
});

describe('Text Formatting', () => {
	it('should generate strikethrough text with \\sout', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'This is ' },
						{ type: 'text', content: 'deleted', strikethrough: true },
						{ type: 'text', content: ' text' }
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('This is');
		expect(latex).toContain('\\sout{deleted}');
		expect(latex).toContain('text');
	});

	it('should include ulem package in preamble for strikethrough', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Test' }]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: true });

		expect(latex).toContain('\\usepackage[normalem]{ulem}');
	});

	it('should generate highlighted text with \\hl', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'This is ' },
						{ type: 'text', content: 'important', highlight: true },
						{ type: 'text', content: ' text' }
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('This is');
		expect(latex).toContain('\\hl{important}');
		expect(latex).toContain('text');
	});

	it('should include soul package in preamble for highlight', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Test' }]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: true });

		expect(latex).toContain('\\usepackage{soul}');
	});
});

describe('Edge Cases', () => {
	it('should handle empty document', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const latex = generateLatex(ast, { includePreamble: false });

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

		const latex = generateLatex(ast, { includePreamble: false });

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

		const latex = generateLatex(ast, { includePreamble: false });

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

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\$');
		expect(latex).toContain('\\&');
		expect(latex).toContain('\\%');
	});

	it('should generate variation table with tkz-tab', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'variation-table',
					variable: 'x',
					domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
					rows: [
						{
							type: 'sign',
							label: "f'(x)",
							values: new Map([
								['-inf,0', { type: 'sign', value: '+' }],
								['0', { type: 'marker', marker: 'zero' }],
								['0,+inf', { type: 'sign', value: '-' }]
							])
						},
						{
							type: 'variation',
							label: 'f(x)',
							values: new Map([
								['-inf', { expression: '-inf', position: 'bottom' }],
								['0', { expression: '3', position: 'top' }],
								['+inf', { expression: '-inf', position: 'bottom' }]
							])
						}
					]
				}
			]
		};

		const latex = generateLatex(ast, { includePreamble: false });

		expect(latex).toContain('\\begin{tikzpicture}');
		expect(latex).toContain('\\tkzTabInit');
		expect(latex).toContain('\\tkzTabLine');
		expect(latex).toContain('\\tkzTabVar');
		expect(latex).toContain('\\end{tikzpicture}');
	});
});
