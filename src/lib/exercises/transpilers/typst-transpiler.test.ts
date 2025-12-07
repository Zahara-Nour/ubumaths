/**
 * Typst Transpiler Tests
 * =======================
 *
 * Unit tests for the Typst transpilation module.
 */

import { describe, it, expect } from 'vitest';
import {
	escapeTypst,
	escapeTypstBrackets,
	resolveImagePath,
	transpileToTypst,
	transpileImage,
	markdownToTypst
} from './typst-transpiler';
import type { DocumentNode, ImageNode, TypstTranspilerOptions } from '../types';

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

describe('transpileToTypst', () => {
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

		const typst = transpileToTypst(ast);

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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).not.toContain('#set page');
		expect(typst).not.toContain('#set text');
		expect(typst).toContain('Content');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('Simple paragraph');
	});

	it('should transpile inline math', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('Calculate');
		expect(typst).toContain('$x^2$');
		expect(typst).toContain('please');
	});

	it('should transpile block math', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('$');
		expect(typst).toContain('\\int_0^\\pi \\sin(x) dx');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('+');
		expect(typst).toContain('First');
		expect(typst).toContain('Second');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('-');
		expect(typst).toContain('Item');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('#table');
		expect(typst).toContain('columns:');
		expect(typst).toContain('f(x)');
	});

	it('should transpile basic image', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('#image');
		expect(typst).toContain('image.png');
		expect(typst).toContain('#align');
	});

	it('should include title and author when provided', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const typst = transpileToTypst(ast, {
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

		const typst = transpileToTypst(ast, {
			paperSize: 'us-letter',
			fontSize: 12
		});

		expect(typst).toContain('us-letter');
		expect(typst).toContain('12pt');
	});

	it('should transpile horizontal rule', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'horizontal-rule'
				}
			]
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

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

		expect(typst).toContain('+');
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

		expect(typst).toContain('```javascript');
		expect(typst).toContain('const x = 1;');
	});
});

describe('Blockquote Transpilation', () => {
	it('should transpile simple blockquote', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('#quote(block: true)');
		expect(typst).toContain('Quoted text');
	});

	it('should transpile blockquote with formatted content', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('#quote(block: true)');
		expect(typst).toContain('*important*');
	});
});

describe('Code Block Transpilation', () => {
	it('should transpile code block without language', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'code-block',
					code: 'const x = 1;'
				}
			]
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('```');
		expect(typst).toContain('const x = 1;');
	});

	it('should transpile code block with javascript language', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('```javascript');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain(code);
	});
});

describe('Image Transpilation - Basic', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile basic image without attributes (default medium size, center)', () => {
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

describe('Image Transpilation - Size Classes', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile image with sizeClass small', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'small-img.png',
			sizeClass: 'small'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 25%');
	});

	it('should transpile image with sizeClass medium', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'medium-img.png',
			sizeClass: 'medium'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 50%');
	});

	it('should transpile image with sizeClass large', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'large-img.png',
			sizeClass: 'large'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 75%');
	});

	it('should transpile image with sizeClass full', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'full-img.png',
			sizeClass: 'full'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('width: 100%');
	});
});

describe('Image Transpilation - Width Percent', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile image with widthPercent (overrides sizeClass)', () => {
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

describe('Image Transpilation - Alignment', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile image with left alignment', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'left-img.png',
			alignment: 'left'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(left)');
	});

	it('should transpile image with center alignment (default)', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'center-img.png',
			alignment: 'center'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(center)');
	});

	it('should transpile image with right alignment', () => {
		const node: ImageNode = {
			type: 'image',
			src: 'right-img.png',
			alignment: 'right'
		};

		const result = transpileImage(node, defaultOptions);

		expect(result).toContain('#align(right)');
	});
});

describe('Image Transpilation - Caption (Figure)', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile image with caption in figure', () => {
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

describe('Image Transpilation - Inline', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile inline image', () => {
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

describe('Image Transpilation - All Attributes Combined', () => {
	const defaultOptions: Required<TypstTranspilerOptions> = {
		paperSize: 'a4',
		fontSize: 11,
		language: 'fr',
		imageBasePath: '',
		includeSetup: false,
		title: '',
		author: ''
	};

	it('should transpile image with all attributes combined', () => {
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

describe('Image Transpilation - Aspect Ratio Handling', () => {
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

describe('Image Transpilation - Path Resolution', () => {
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

describe('Image Transpilation - Block Without Caption', () => {
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

describe('Heading Transpilation', () => {
	it('should transpile h1 heading', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('= Main Title');
	});

	it('should transpile h2 heading', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('== Section');
	});

	it('should transpile h3 heading', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('=== Subsection');
	});

	it('should transpile heading with formatting', () => {
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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('= Title with *bold* text');
	});
});

describe('Text Formatting', () => {
	it('should transpile bold text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Bold', bold: true }]
				}
			]
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('*Bold*');
	});

	it('should transpile italic text', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'Italic', italic: true }]
				}
			]
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('_Italic_');
	});

	it('should transpile inline code', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', content: 'code', code: true }]
				}
			]
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('`code`');
	});
});

describe('Edge Cases', () => {
	it('should handle empty document', () => {
		const ast: DocumentNode = {
			type: 'document',
			children: []
		};

		const typst = transpileToTypst(ast, { includeSetup: false });

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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('+');
		expect(typst).toContain('-');
		expect(typst).toContain('Parent');
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

		const typst = transpileToTypst(ast, { includeSetup: false });

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

		const typst = transpileToTypst(ast, { includeSetup: false });

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

		const typst = transpileToTypst(ast, { includeSetup: false });

		expect(typst).toContain('Line 1');
		expect(typst).toContain('\\');
		expect(typst).toContain('Line 2');
	});
});
