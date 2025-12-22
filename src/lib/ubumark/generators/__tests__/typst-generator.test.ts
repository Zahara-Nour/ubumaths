/**
 * Typst Generator Tests
 * =====================
 *
 * Unit tests for the Typst generation module.
 */

import { describe, it, expect } from 'vitest';
import {
	escapeTypst,
	escapeTypstBrackets,
	resolveImagePath,
	generateTypst,
	transpileImage,
	markdownToTypst,
	convertLatexToTypstMath
} from '../typst-generator';
import type { DocumentNode, ImageNode, TypstTranspilerOptions } from '$lib/exercises/types';

describe('escapeTypst', () => {
	it('should escape hash character', () => {
		expect(escapeTypst('#')).toBe('\\#');
	});

	it('should escape dollar sign', () => {
		expect(escapeTypst('$')).toBe('\\$');
	});

	it('should escape at sign', () => {
		expect(escapeTypst('@')).toBe('\\@');
	});

	it('should escape asterisk', () => {
		expect(escapeTypst('*')).toBe('\\*');
	});

	it('should escape underscore', () => {
		expect(escapeTypst('_')).toBe('\\_');
	});

	it('should escape backtick', () => {
		expect(escapeTypst('`')).toBe('\\`');
	});

	it('should escape angle brackets', () => {
		expect(escapeTypst('<')).toBe('\\<');
		expect(escapeTypst('>')).toBe('\\>');
	});

	it('should escape backslash', () => {
		expect(escapeTypst('\\')).toBe('\\\\');
	});

	it('should escape multiple characters', () => {
		const result = escapeTypst('Price: $10 @ 20% off #sale');
		expect(result).toContain('\\$');
		expect(result).toContain('\\@');
		expect(result).toContain('\\#');
	});

	it('should not escape regular text', () => {
		expect(escapeTypst('Hello World')).toBe('Hello World');
		expect(escapeTypst('abc123')).toBe('abc123');
	});

	it('should handle empty string', () => {
		expect(escapeTypst('')).toBe('');
	});
});

describe('escapeTypstBrackets', () => {
	it('should escape square brackets', () => {
		const result = escapeTypstBrackets('[test]');
		expect(result).toContain('\\[');
		expect(result).toContain('\\]');
	});

	it('should escape both standard chars and brackets', () => {
		const result = escapeTypstBrackets('Price: $10 [sale]');
		expect(result).toContain('\\$');
		expect(result).toContain('\\[');
		expect(result).toContain('\\]');
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

	it('should keep URL as-is', () => {
		const result = resolveImagePath('https://example.com/path/image.png', '');
		expect(result).toBe('https://example.com/path/image.png');
	});

	it('should keep URL with base path as-is (URL takes precedence)', () => {
		const result = resolveImagePath('https://example.com/path/image.png', '/local');
		expect(result).toBe('https://example.com/path/image.png');
	});

	it('should handle relative path without base path', () => {
		const result = resolveImagePath('exercises/image.png', '');
		expect(result).toBe('exercises/image.png');
	});
});

describe('generateTypst', () => {
	it('should generate document with setup', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Hello World' }]
				}
			]
		};

		const typst = generateTypst(ast);

		expect(typst).toContain('#set page');
		expect(typst).toContain('#set text');
		expect(typst).toContain('Hello World');
	});

	it('should generate document without setup when disabled', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Content' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).not.toContain('#set page');
		expect(typst).not.toContain('#set text');
		expect(typst).toContain('Content');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('Simple paragraph');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('Calculate');
		expect(typst).toContain('$x^2$');
		expect(typst).toContain('please');
	});

	it('should use display mode for inline math with limits', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'Calculate ' },
						{ type: 'math-inline', expression: '\\lim_{n \\to +\\infty} u_n', syntax: 'latex' },
						{ type: 'text', content: ' please' }
					]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		// Inline math with lim should use display() for proper limit rendering
		expect(typst).toContain('$display(');
		expect(typst).toContain('lim');
	});

	it('should not use display mode for simple inline math', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'math-inline', expression: 'x + y', syntax: 'latex' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		// Simple math should not use display()
		expect(typst).toContain('$x + y$');
		expect(typst).not.toContain('display');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('$');
		// LaTeX is now converted to Typst syntax
		expect(typst).toContain('integral_0^pi sin(x) dx');
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

		const typst = generateTypst(ast, { includeSetup: false });

		// Typst uses explicit numbering: "1. item"
		expect(typst).toContain('1. First');
		expect(typst).toContain('2. Second');
	});

	it('should generate ordered list with custom start number', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'list',
					ordered: true,
					start: 3,
					items: [
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Third item' }]
								}
							]
						},
						{
							type: 'list-item',
							children: [
								{
									type: 'paragraph',
									children: [{ type: 'text', content: 'Fourth item' }]
								}
							]
						}
					]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		// Should start at 3 and continue to 4
		expect(typst).toContain('3. Third item');
		expect(typst).toContain('4. Fourth item');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('-');
		expect(typst).toContain('Item');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('#table');
		expect(typst).toContain('columns:');
		expect(typst).toContain('f(x)');
	});

	it('should generate basic image', () => {
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('#image');
		expect(typst).toContain('image.png');
		expect(typst).toContain('#align');
	});

	it('should include title and author when provided', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const typst = generateTypst(ast, {
			title: 'Test Document',
			author: 'Test Author'
		});

		expect(typst).toContain('Test Document');
		expect(typst).toContain('Test Author');
		expect(typst).toContain('17pt');
		expect(typst).toContain('12pt');
	});

	it('should customize document options', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const typst = generateTypst(ast, {
			paperSize: 'us-letter',
			fontSize: 12
		});

		expect(typst).toContain('us-letter');
		expect(typst).toContain('12pt');
	});

	it('should generate horizontal rule', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'horizontal-rule'
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('#line(length: 100%)');
	});
});

describe('markdownToTypst', () => {
	it('should convert simple markdown to Typst', async () => {
		const markdown = 'Calculate $x^2$ please';

		const typst = await markdownToTypst(markdown, { includeSetup: false });

		expect(typst).toContain('Calculate');
		expect(typst).toContain('$x^2$');
		expect(typst).toContain('please');
	});

	it('should handle markdown with lists', async () => {
		const markdown = '1. First\n2. Second\n3. Third';

		const typst = await markdownToTypst(markdown, { includeSetup: false });

		// Ordered lists use explicit numbering: "1. First"
		expect(typst).toContain('1. First');
		expect(typst).toContain('2. Second');
		expect(typst).toContain('3. Third');
	});

	it('should generate complete document by default', async () => {
		const markdown = 'Simple text';

		const typst = await markdownToTypst(markdown);

		expect(typst).toContain('#set page');
		expect(typst).toContain('#set text');
	});

	it('should handle markdown with blockquotes', async () => {
		const markdown = '> This is a quoted text\n> with multiple lines';

		const typst = await markdownToTypst(markdown, { includeSetup: false });

		expect(typst).toContain('#quote');
		expect(typst).toContain('block: true');
	});

	it('should handle markdown with code blocks', async () => {
		const markdown = '```javascript\nconst x = 1;\n```';

		const typst = await markdownToTypst(markdown, { includeSetup: false });

		// Language is stripped to avoid syntax highlighting in PDF
		expect(typst).toContain('```\n');
		expect(typst).toContain('const x = 1;');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('#quote(block: true)');
		expect(typst).toContain('Quoted text');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('#quote(block: true)');
		expect(typst).toContain('*important*');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('```');
		expect(typst).toContain('const x = 1;');
	});

	it('should generate code block without language (no syntax highlighting)', () => {
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

		const typst = generateTypst(ast, { includeSetup: false });

		// Language is stripped to avoid syntax highlighting in PDF
		expect(typst).toContain('```\n');
		expect(typst).not.toContain('```javascript');
		expect(typst).toContain('function hello()');
		expect(typst).toContain('console.log("Hello")');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain(code);
	});
});

describe('Image Generation - Basic', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate basic image without attributes (default medium size, center)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'diagram.png'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#image');
		expect(result).toContain('width: 50%');
		expect(result).toContain('diagram.png');
		expect(result).toContain('#align(center)');
	});
});

describe('Image Generation - Size Classes', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate image with sizeClass small', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'small-img.png',
			sizeClass: 'small'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 25%');
	});

	it('should generate image with sizeClass medium', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'medium-img.png',
			sizeClass: 'medium'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 50%');
	});

	it('should generate image with sizeClass large', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'large-img.png',
			sizeClass: 'large'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 75%');
	});

	it('should generate image with sizeClass full', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'full-img.png',
			sizeClass: 'full'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 100%');
	});
});

describe('Image Generation - Width Percent', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate image with widthPercent (overrides sizeClass)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'custom-width.png',
			sizeClass: 'small', // Should be ignored
			widthPercent: 60
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 60%');
		expect(result).not.toContain('width: 25%'); // small sizeClass width should NOT appear
	});

	it('should handle widthPercent at 100', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'full-width.png',
			widthPercent: 100
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 100%');
	});

	it('should handle widthPercent at boundaries', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'test.png',
			widthPercent: 0
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 0%');
	});
});

describe('Image Generation - Alignment', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate image with left alignment', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'left-img.png',
			alignment: 'left'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(left)');
	});

	it('should generate image with center alignment (default)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'center-img.png',
			alignment: 'center'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(center)');
	});

	it('should generate image with right alignment', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'right-img.png',
			alignment: 'right'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(right)');
	});
});

describe('Image Generation - Caption (Figure)', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate image with caption in figure', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'figure.png',
			caption: 'Figure 1: Test diagram'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#figure(');
		expect(result).toContain('image("figure.png"');
		expect(result).toContain('caption: [Figure 1: Test diagram]');
	});

	it('should escape special characters in caption', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'figure.png',
			caption: 'Price: $10 @ [store]'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#figure(');
		expect(result).toContain('\\$');
		expect(result).toContain('\\@');
		expect(result).toContain('\\[');
		expect(result).toContain('\\]');
	});
});

describe('Image Generation - Inline', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate inline image', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'icon.png',
			sizeClass: 'inline'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#box(height: 1em)');
		expect(result).toContain('#image("icon.png")');
		// Inline images should not have alignment or figure
		expect(result).not.toContain('#align');
		expect(result).not.toContain('#figure');
	});
});

describe('Image Generation - All Attributes Combined', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should generate image with all attributes combined', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'complex.png',
			widthPercent: 80,
			alignment: 'left',
			caption: 'A complex figure',
			alt: 'Complex diagram'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#figure(');
		expect(result).toContain('width: 80%');
		expect(result).toContain('caption: [A complex figure]');
		// Note: alt text is not used in Typst output
	});

	it('should handle sizeClass with caption but no widthPercent', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'sized-caption.png',
			sizeClass: 'large',
			caption: 'Large figure with caption'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#figure(');
		expect(result).toContain('width: 75%');
		expect(result).toContain('caption: [Large figure with caption]');
	});
});

describe('Image Generation - Aspect Ratio Handling', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should handle very wide images (panoramic)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'panorama.png',
			originalWidth: 1200,
			originalHeight: 300 // 4:1 ratio (> 3:1)
		};

		const result = transpileImage(node, defaultOptions);

		// Should add height constraint for very wide images
		expect(result).toContain('height: auto');
	});

	it('should handle very tall images', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'tall.png',
			originalWidth: 200,
			originalHeight: 800 // 1:4 ratio (< 1:3)
		};

		const result = transpileImage(node, defaultOptions);

		// Should constrain width for very tall images
		expect(result).toContain('width: 50%');
	});

	it('should not add constraints for normal aspect ratio', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'normal.png',
			originalWidth: 800,
			originalHeight: 600 // 4:3 ratio (normal)
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).not.toContain('height: auto');
		// Should use default medium size
		expect(result).toContain('width: 50%');
	});
});

describe('Image Generation - Path Resolution', () => {
	it('should resolve image path with base path', () => {
		const options: Required<TypstTranspilerOptions> = {
			paperSize: 'a4',
			fontSize: 11,
			language: 'fr',
			imageBasePath: '/images',
			includeSetup: false,
			title: '',
			author: ''
		};

		const node: ImageNode = {
			type: 'image',
			src: 'subdir/image.png'
		};

		const result = transpileImage(node, options);

		expect(result).toContain('/images/subdir/image.png');
	});

	it('should handle URL image paths', () => {
		const options: Required<TypstTranspilerOptions> = {
			paperSize: 'a4',
			fontSize: 11,
			language: 'fr',
			imageBasePath: '',
			includeSetup: false,
			title: '',
			author: ''
		};

		const node: ImageNode = {
			type: 'image',
			src: 'https://example.com/path/to/remote-image.png'
		};

		const result = transpileImage(node, options);

		// Typst can handle URLs directly
		expect(result).toContain('https://example.com/path/to/remote-image.png');
	});
});

describe('Image Generation - Block Without Caption', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should handle image without caption but with sizeClass (block, no figure)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'block-img.png',
			sizeClass: 'large',
			alignment: 'center'
		};

		const result = transpileImage(node, defaultOptions);

		// Should use #align wrapper, not #figure
		expect(result).toContain('#align(center)');
		expect(result).toContain('#image');
		expect(result).not.toContain('#figure');
	});
});

describe('Heading Generation', () => {
	it('should generate h1 heading', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'heading',
					level: 1,
					children: [{ type: 'text', content: 'Main Title' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('= Main Title');
	});

	it('should generate h2 heading', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'heading',
					level: 2,
					children: [{ type: 'text', content: 'Section' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('== Section');
	});

	it('should generate h3 heading', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'heading',
					level: 3,
					children: [{ type: 'text', content: 'Subsection' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('=== Subsection');
	});

	it('should generate heading with formatting', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'heading',
					level: 1,
					children: [
						{ type: 'text', content: 'Title with ' },
						{ type: 'text', content: 'bold', bold: true },
						{ type: 'text', content: ' text' }
					]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('= Title with *bold* text');
	});
});

describe('Text Formatting', () => {
	it('should generate bold text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Bold', bold: true }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('*Bold*');
	});

	it('should generate italic text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Italic', italic: true }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('_Italic_');
	});

	it('should generate inline code', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'code', code: true }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('`code`');
	});

	it('should preserve special characters in inline code without escaping', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: '10**(-4)', code: true }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		// Special characters like * should NOT be escaped in inline code
		expect(typst).toContain('`10**(-4)`');
		expect(typst).not.toContain('\\*');
	});

	it('should unescape markdown escape sequences in inline code', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: '10\\*\\*(-4)', code: true }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		// Escaped \* should become literal * in inline code
		expect(typst).toContain('`10**(-4)`');
		expect(typst).not.toContain('\\*');
	});

	it('should generate strikethrough text with #strike', () => {
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('This is');
		expect(typst).toContain('#strike[deleted]');
		expect(typst).toContain('text');
	});

	it('should generate highlighted text with #highlight', () => {
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('This is');
		expect(typst).toContain('#highlight[important]');
		expect(typst).toContain('text');
	});
});

describe('Edge Cases', () => {
	it('should handle empty document', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toBe('');
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

		const typst = generateTypst(ast, { includeSetup: false });

		// Ordered list uses explicit numbering: "1. Parent"
		expect(typst).toContain('1. Parent');
		expect(typst).toContain('-');
		expect(typst).toContain('Child');
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

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('align: (left, center, right)');
	});

	it('should escape special characters in text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Price: $10 @ #sale' }]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('\\$');
		expect(typst).toContain('\\@');
		expect(typst).toContain('\\#');
	});

	it('should handle line breaks', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', content: 'Line 1' },
						{ type: 'line-break', hard: true },
						{ type: 'text', content: 'Line 2' }
					]
				}
			]
		};

		const typst = generateTypst(ast, { includeSetup: false });

		expect(typst).toContain('Line 1');
		expect(typst).toContain('\\');
		expect(typst).toContain('Line 2');
	});
});

// ============================================================================
// LATEX TO TYPST MATH CONVERSION TESTS
// ============================================================================

describe('convertLatexToTypstMath - Vectors and Accents', () => {
	it('should convert \\vec{x} to arrow(x)', () => {
		expect(convertLatexToTypstMath('\\vec{x}')).toBe('arrow(x)');
	});

	it('should convert \\vec{AB} to arrow(AB)', () => {
		expect(convertLatexToTypstMath('\\vec{AB}')).toBe('arrow(AB)');
	});

	it('should convert \\hat{x} to hat(x)', () => {
		expect(convertLatexToTypstMath('\\hat{x}')).toBe('hat(x)');
	});

	it('should convert \\bar{x} to macron(x)', () => {
		expect(convertLatexToTypstMath('\\bar{x}')).toBe('macron(x)');
	});

	it('should convert \\tilde{x} to tilde(x)', () => {
		expect(convertLatexToTypstMath('\\tilde{x}')).toBe('tilde(x)');
	});

	it('should convert \\dot{x} to dot(x)', () => {
		expect(convertLatexToTypstMath('\\dot{x}')).toBe('dot(x)');
	});

	it('should convert \\ddot{x} to diaer(x)', () => {
		expect(convertLatexToTypstMath('\\ddot{x}')).toBe('diaer(x)');
	});

	it('should convert \\overline{AB} to overline(AB)', () => {
		expect(convertLatexToTypstMath('\\overline{AB}')).toBe('overline(AB)');
	});

	it('should convert \\underline{x} to underline(x)', () => {
		expect(convertLatexToTypstMath('\\underline{x}')).toBe('underline(x)');
	});
});

describe('convertLatexToTypstMath - Ellipsis (Dots)', () => {
	it('should convert \\ldots to ...', () => {
		expect(convertLatexToTypstMath('\\ldots')).toBe('...');
	});

	it('should convert \\cdots to dots.c', () => {
		expect(convertLatexToTypstMath('\\cdots')).toBe('dots.c');
	});

	it('should convert \\vdots to dots.v', () => {
		expect(convertLatexToTypstMath('\\vdots')).toBe('dots.v');
	});

	it('should convert \\ddots to dots.down', () => {
		expect(convertLatexToTypstMath('\\ddots')).toBe('dots.down');
	});

	it('should convert 1, 2, \\ldots, n correctly', () => {
		expect(convertLatexToTypstMath('1, 2, \\ldots, n')).toBe('1, 2, ..., n');
	});
});

describe('convertLatexToTypstMath - Math Spaces', () => {
	it('should convert \\, to thin space with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\,b')).toBe('a thin b');
	});

	it('should convert \\: to med space with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\:b')).toBe('a med b');
	});

	it('should convert \\; to thick space with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\;b')).toBe('a thick b');
	});

	it('should convert \\! to negative thin space with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\!b')).toBe('a negthin b');
	});

	it('should convert \\quad to quad with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\quad b')).toBe('a quad  b');
	});

	it('should convert \\qquad to wide with surrounding spaces', () => {
		expect(convertLatexToTypstMath('a\\qquad b')).toBe('a wide  b');
	});
});

describe('convertLatexToTypstMath - Number Sets (Blackboard Bold)', () => {
	it('should convert \\mathbb{R} to RR', () => {
		expect(convertLatexToTypstMath('\\mathbb{R}')).toBe('RR');
	});

	it('should convert \\mathbb{N} to NN', () => {
		expect(convertLatexToTypstMath('\\mathbb{N}')).toBe('NN');
	});

	it('should convert \\mathbb{Z} to ZZ', () => {
		expect(convertLatexToTypstMath('\\mathbb{Z}')).toBe('ZZ');
	});

	it('should convert \\mathbb{Q} to QQ', () => {
		expect(convertLatexToTypstMath('\\mathbb{Q}')).toBe('QQ');
	});

	it('should convert \\mathbb{C} to CC', () => {
		expect(convertLatexToTypstMath('\\mathbb{C}')).toBe('CC');
	});

	it('should convert x \\in \\mathbb{R} correctly', () => {
		expect(convertLatexToTypstMath('x \\in \\mathbb{R}')).toBe('x in RR');
	});
});

describe('convertLatexToTypstMath - Math Text Styles', () => {
	it('should convert \\mathbf{x} to bold(x)', () => {
		expect(convertLatexToTypstMath('\\mathbf{x}')).toBe('bold(x)');
	});

	it('should convert \\mathit{x} to italic(x)', () => {
		expect(convertLatexToTypstMath('\\mathit{x}')).toBe('italic(x)');
	});

	it('should convert \\mathrm{d} to upright(d)', () => {
		expect(convertLatexToTypstMath('\\mathrm{d}')).toBe('upright(d)');
	});

	it('should convert \\mathcal{L} to cal(L)', () => {
		expect(convertLatexToTypstMath('\\mathcal{L}')).toBe('cal(L)');
	});

	it('should convert \\mathfrak{g} to frak(g)', () => {
		expect(convertLatexToTypstMath('\\mathfrak{g}')).toBe('frak(g)');
	});
});

describe('convertLatexToTypstMath - Integrals and Big Operators', () => {
	it('should convert \\int to integral', () => {
		expect(convertLatexToTypstMath('\\int')).toBe('integral');
	});

	it('should convert \\iint to integral.double', () => {
		expect(convertLatexToTypstMath('\\iint')).toBe('integral.double');
	});

	it('should convert \\iiint to integral.triple', () => {
		expect(convertLatexToTypstMath('\\iiint')).toBe('integral.triple');
	});

	it('should convert \\oint to integral.cont', () => {
		expect(convertLatexToTypstMath('\\oint')).toBe('integral.cont');
	});

	it('should convert \\sum to sum', () => {
		expect(convertLatexToTypstMath('\\sum')).toBe('sum');
	});

	it('should convert \\prod to product', () => {
		expect(convertLatexToTypstMath('\\prod')).toBe('product');
	});

	it('should convert \\int_0^1 f(x) dx correctly', () => {
		const result = convertLatexToTypstMath('\\int_0^1 f(x) dx');
		expect(result).toContain('integral');
		expect(result).toContain('_0^1');
	});

	it('should convert \\sum_{i=1}^{n} correctly', () => {
		const result = convertLatexToTypstMath('\\sum_{i=1}^{n}');
		expect(result).toContain('sum');
		expect(result).toContain('_(i=1)^(n)');
	});
});

describe('convertLatexToTypstMath - Binomial Coefficients', () => {
	it('should convert \\binom{n}{k} to binom(n, k)', () => {
		expect(convertLatexToTypstMath('\\binom{n}{k}')).toBe('binom(n, k)');
	});

	it('should convert \\binom{10}{3} to binom(10, 3)', () => {
		expect(convertLatexToTypstMath('\\binom{10}{3}')).toBe('binom(10, 3)');
	});

	it('should convert nested binomials', () => {
		const result = convertLatexToTypstMath('\\binom{n}{k} + \\binom{n}{k+1}');
		expect(result).toBe('binom(n, k) + binom(n, k+1)');
	});
});

describe('convertLatexToTypstMath - Align Environment', () => {
	it('should remove \\begin{align} and \\end{align}', () => {
		const input = '\\begin{align} x &= 1 \\end{align}';
		const result = convertLatexToTypstMath(input);
		expect(result).not.toContain('\\begin{align}');
		expect(result).not.toContain('\\end{align}');
		expect(result).toContain('x &= 1');
	});

	it('should remove \\begin{align*} and \\end{align*}', () => {
		const input = '\\begin{align*} x &= 1 \\end{align*}';
		const result = convertLatexToTypstMath(input);
		expect(result).not.toContain('\\begin{align*}');
		expect(result).not.toContain('\\end{align*}');
	});

	it('should convert \\\\ to \\ (line break)', () => {
		const input = 'x &= 1 \\\\ y &= 2';
		const result = convertLatexToTypstMath(input);
		expect(result).toBe('x &= 1 \\ y &= 2');
	});

	it('should handle full align environment', () => {
		const input = `\\begin{align}
  x + y &= 5 \\\\
  2x - y &= 1
\\end{align}`;
		const result = convertLatexToTypstMath(input);
		expect(result).not.toContain('\\begin');
		expect(result).not.toContain('\\end');
		expect(result).toContain('x + y &= 5');
		expect(result).toContain('2x - y &= 1');
	});
});

describe('convertLatexToTypstMath - Slant Comparisons', () => {
	it('should convert \\leqslant to lt.eq.slant', () => {
		expect(convertLatexToTypstMath('\\leqslant')).toBe('lt.eq.slant');
	});

	it('should convert \\geqslant to gt.eq.slant', () => {
		expect(convertLatexToTypstMath('\\geqslant')).toBe('gt.eq.slant');
	});

	it('should convert \\nleqslant to lt.eq.slant.not', () => {
		expect(convertLatexToTypstMath('\\nleqslant')).toBe('lt.eq.slant.not');
	});

	it('should convert \\ngeqslant to gt.eq.slant.not', () => {
		expect(convertLatexToTypstMath('\\ngeqslant')).toBe('gt.eq.slant.not');
	});

	it('should handle slant comparison in expression', () => {
		expect(convertLatexToTypstMath('x \\leqslant 5')).toBe('x lt.eq.slant 5');
	});
});

describe('convertLatexToTypstMath - Combined Expressions', () => {
	it('should handle complex expression with vectors and fractions', () => {
		const input = '\\vec{v} = \\frac{\\vec{AB}}{|\\vec{AB}|}';
		const result = convertLatexToTypstMath(input);
		expect(result).toContain('arrow');
		expect(result).toContain('frac');
	});

	it('should handle integral with number set', () => {
		const input = '\\int_{\\mathbb{R}} f(x) dx';
		const result = convertLatexToTypstMath(input);
		expect(result).toContain('integral');
		expect(result).toContain('RR');
	});

	it('should handle sum with binomial', () => {
		const input = '\\sum_{k=0}^{n} \\binom{n}{k}';
		const result = convertLatexToTypstMath(input);
		expect(result).toContain('sum');
		expect(result).toContain('binom');
	});

	it('should handle probability expression', () => {
		const input = 'P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}';
		const result = convertLatexToTypstMath(input);
		expect(result).toContain('binom(n, k)');
	});
});

describe('convertLatexToTypstMath - French Decimal Comma', () => {
	it('should convert {,} to string comma for French notation', () => {
		// {,} -> "," (string comma in Typst, displays as comma without spacing)
		expect(convertLatexToTypstMath('3{,}14')).toBe('3","14');
	});

	it('should handle pi approximation with French comma', () => {
		expect(convertLatexToTypstMath('3{,}14159')).toBe('3","14159');
	});

	it('should handle multiple decimal numbers with French commas', () => {
		expect(convertLatexToTypstMath('x = 1{,}5 + 2{,}3')).toBe('x = 1","5 + 2","3');
	});

	it('should handle decimal in fraction with string comma', () => {
		// String comma is not treated as argument separator
		expect(convertLatexToTypstMath('\\frac{1{,}5}{2}')).toBe('frac(1","5, 2)');
	});

	it('should not affect regular commas (argument separators)', () => {
		expect(convertLatexToTypstMath('(a, b, c)')).toBe('(a, b, c)');
	});
});

describe('convertLatexToTypstMath - French Number Formatting with Digit Grouping', () => {
	it('should convert thin space \\, to Typst thin space for digit grouping', () => {
		// Input: 1\,234 (LaTeX thin space)
		const result = convertLatexToTypstMath('1\\,234');
		expect(result).toBe('1 thin 234');
	});

	it('should handle French decimal with thin spaces in integer part', () => {
		// Input: 1\,234{,}56
		const result = convertLatexToTypstMath('1\\,234{,}56');
		// LaTeX \, -> thin, {,} -> "," (string comma)
		expect(result).toContain('thin');
		expect(result).toBe('1 thin 234","56');
	});

	it('should handle French decimal with thin spaces in decimal part', () => {
		// Input: 3{,}141\,59
		const result = convertLatexToTypstMath('3{,}141\\,59');
		// {,} -> "," (string comma), \, -> thin
		expect(result).toBe('3","141 thin 59');
	});

	it('should handle full French number with thin spaces in both parts', () => {
		// Input: 1\,234\,567{,}890\,123\,45
		const result = convertLatexToTypstMath('1\\,234\\,567{,}890\\,123\\,45');
		// LaTeX \, -> thin, {,} -> "," (string comma)
		expect(result).toBe('1 thin 234 thin 567","890 thin 123 thin 45');
	});

	it('should preserve French comma with thin spaces', () => {
		const result = convertLatexToTypstMath('1\\,234{,}5');
		// LaTeX \, -> thin (Typst thin space)
		// {,} -> "," (Typst string comma)
		expect(result).toBe('1 thin 234","5');
	});
});

describe('convertLatexToTypstMath - Subscripts and Superscripts', () => {
	it('should convert superscript braces to parentheses', () => {
		expect(convertLatexToTypstMath('x^{2}')).toBe('x^(2)');
	});

	it('should convert subscript braces to parentheses', () => {
		expect(convertLatexToTypstMath('x_{i}')).toBe('x_(i)');
	});

	it('should handle multi-character exponents', () => {
		expect(convertLatexToTypstMath('x^{2n}')).toBe('x^(2n)');
	});

	it('should handle multi-character subscripts', () => {
		expect(convertLatexToTypstMath('a_{ij}')).toBe('a_(ij)');
	});

	it('should handle both subscript and superscript', () => {
		expect(convertLatexToTypstMath('x_{i}^{2}')).toBe('x_(i)^(2)');
	});

	it('should keep simple exponents without braces unchanged', () => {
		expect(convertLatexToTypstMath('x^2')).toBe('x^2');
	});

	it('should handle expression with n-1 exponent', () => {
		expect(convertLatexToTypstMath('2^{n-1}')).toBe('2^(n-1)');
	});

	it('should handle sum with limits', () => {
		expect(convertLatexToTypstMath('\\sum_{i=1}^{n}')).toBe('sum_(i=1)^(n)');
	});
});
