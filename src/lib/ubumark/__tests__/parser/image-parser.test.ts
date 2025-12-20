/**
 * Image Parser Tests
 * ==================
 *
 * Unit tests for the extended image parsing functionality in markdown-parser.
 * Tests standard markdown image syntax and extended attribute syntax.
 *
 * Since parseImageLine is not exported, we test via parseMarkdown().
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { ImageNode } from '../../types';

/**
 * Helper function to extract the first image node from parsed markdown
 */
function parseImageMarkdown(markdown: string): ImageNode | null {
	const ast = parseMarkdown(markdown);
	const imageNode = ast.children.find((child) => child.type === 'image');
	return imageNode as ImageNode | null;
}

// ============================================================================
// 1. STANDARD SYNTAX (BACKWARD COMPATIBILITY)
// ============================================================================

describe('Image Parser - Standard Syntax', () => {
	it('should parse basic image: ![alt](url.png)', () => {
		const image = parseImageMarkdown('![alt text](image.png)');

		expect(image).not.toBeNull();
		expect(image?.type).toBe('image');
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('alt text');
		expect(image?.title).toBeUndefined();
	});

	it('should parse image without alt: ![](url.png)', () => {
		const image = parseImageMarkdown('![](image.png)');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBeUndefined();
	});

	it('should parse image with title: ![alt](url.png "title")', () => {
		const image = parseImageMarkdown('![alt text](image.png "My Image Title")');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('alt text');
		expect(image?.title).toBe('My Image Title');
	});

	it('should parse image with URL containing path', () => {
		const image = parseImageMarkdown('![](path/to/image.png)');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('path/to/image.png');
	});

	it('should parse image with full URL', () => {
		const image = parseImageMarkdown('![](https://example.com/image.png)');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('https://example.com/image.png');
	});

	it('should parse image with special characters in alt text', () => {
		const image = parseImageMarkdown('![Figure 1: Triangle ABC](triangle.png)');

		expect(image).not.toBeNull();
		expect(image?.alt).toBe('Figure 1: Triangle ABC');
	});
});

// ============================================================================
// 2. SIZE ATTRIBUTE
// ============================================================================

describe('Image Parser - Size Attribute', () => {
	it('should parse size=small', () => {
		const image = parseImageMarkdown('![](image.png){size=small}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('small');
	});

	it('should parse size=medium', () => {
		const image = parseImageMarkdown('![](image.png){size=medium}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('medium');
	});

	it('should parse size=large', () => {
		const image = parseImageMarkdown('![](image.png){size=large}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('large');
	});

	it('should parse size=full', () => {
		const image = parseImageMarkdown('![](image.png){size=full}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('full');
	});

	it('should parse size=inline', () => {
		const image = parseImageMarkdown('![](image.png){size=inline}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('inline');
	});

	it('should ignore invalid size value', () => {
		const image = parseImageMarkdown('![](image.png){size=invalid}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBeUndefined();
	});

	it('should parse size with quoted value', () => {
		const image = parseImageMarkdown('![](image.png){size="medium"}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('medium');
	});

	it('should parse size with single quoted value', () => {
		const image = parseImageMarkdown("![](image.png){size='large'}");

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('large');
	});
});

// ============================================================================
// 3. WIDTH ATTRIBUTE
// ============================================================================

describe('Image Parser - Width Attribute', () => {
	it('should parse width=50%', () => {
		const image = parseImageMarkdown('![](image.png){width=50%}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(50);
	});

	it('should parse width without percent sign: width=50', () => {
		const image = parseImageMarkdown('![](image.png){width=50}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(50);
	});

	it('should parse width=0%', () => {
		const image = parseImageMarkdown('![](image.png){width=0%}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(0);
	});

	it('should parse width=100%', () => {
		const image = parseImageMarkdown('![](image.png){width=100%}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(100);
	});

	it('should ignore width out of bounds: width=150%', () => {
		const image = parseImageMarkdown('![](image.png){width=150%}');

		expect(image).not.toBeNull();
		// Width out of 0-100 range should be ignored
		expect(image?.widthPercent).toBeUndefined();
	});

	it('should ignore negative width: width=-10%', () => {
		// Regex won't match negative numbers, so widthPercent should be undefined
		const image = parseImageMarkdown('![](image.png){width=-10%}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBeUndefined();
	});

	it('should parse width with quoted value', () => {
		const image = parseImageMarkdown('![](image.png){width="60%"}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(60);
	});

	it('should parse width with single quoted value', () => {
		const image = parseImageMarkdown("![](image.png){width='75%'}");

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(75);
	});

	it('should parse integer width values', () => {
		const image = parseImageMarkdown('![](image.png){width=33}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(33);
	});
});

// ============================================================================
// 4. ALIGN ATTRIBUTE
// ============================================================================

describe('Image Parser - Align Attribute', () => {
	it('should parse align=left', () => {
		const image = parseImageMarkdown('![](image.png){align=left}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBe('left');
	});

	it('should parse align=center', () => {
		const image = parseImageMarkdown('![](image.png){align=center}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBe('center');
	});

	it('should parse align=right', () => {
		const image = parseImageMarkdown('![](image.png){align=right}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBe('right');
	});

	it('should ignore invalid align value', () => {
		const image = parseImageMarkdown('![](image.png){align=invalid}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBeUndefined();
	});

	it('should ignore align=justify (not supported)', () => {
		const image = parseImageMarkdown('![](image.png){align=justify}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBeUndefined();
	});

	it('should parse align with quoted value', () => {
		const image = parseImageMarkdown('![](image.png){align="center"}');

		expect(image).not.toBeNull();
		expect(image?.alignment).toBe('center');
	});
});

// ============================================================================
// 5. CAPTION ATTRIBUTE
// ============================================================================

describe('Image Parser - Caption Attribute', () => {
	it('should parse caption with double quotes', () => {
		const image = parseImageMarkdown('![](image.png){caption="Figure 1"}');

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Figure 1');
	});

	it('should parse caption with single quotes', () => {
		const image = parseImageMarkdown("![](image.png){caption='Figure 1'}");

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Figure 1');
	});

	it('should parse caption with spaces', () => {
		const image = parseImageMarkdown('![](image.png){caption="Figure 1: Triangle rectangle"}');

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Figure 1: Triangle rectangle');
	});

	it('should parse caption with special characters', () => {
		const image = parseImageMarkdown('![](image.png){caption="Graphe de f(x) = x^2"}');

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Graphe de f(x) = x^2');
	});

	it('should parse caption with French accents', () => {
		const image = parseImageMarkdown('![](image.png){caption="Representaton geometrique"}');

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Representaton geometrique');
	});

	it('should not parse caption without quotes', () => {
		// Caption without quotes won't be parsed correctly by the regex
		const image = parseImageMarkdown('![](image.png){caption=Figure}');

		expect(image).not.toBeNull();
		// The regex requires quotes around caption value
		expect(image?.caption).toBeUndefined();
	});
});

// ============================================================================
// 6. COMBINED ATTRIBUTES
// ============================================================================

describe('Image Parser - Combined Attributes', () => {
	it('should parse all attributes together', () => {
		const image = parseImageMarkdown(
			'![alt text](image.png "title"){size=large align=center caption="Figure 1"}'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('alt text');
		expect(image?.title).toBe('title');
		expect(image?.sizeClass).toBe('large');
		expect(image?.alignment).toBe('center');
		expect(image?.caption).toBe('Figure 1');
	});

	it('should parse width + caption', () => {
		const image = parseImageMarkdown('![](image.png){width=60% caption="Test Figure"}');

		expect(image).not.toBeNull();
		expect(image?.widthPercent).toBe(60);
		expect(image?.caption).toBe('Test Figure');
	});

	it('should parse size + align', () => {
		const image = parseImageMarkdown('![](image.png){size=medium align=right}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('medium');
		expect(image?.alignment).toBe('right');
	});

	it('should parse size and width together (both valid)', () => {
		// When both size and width are provided, both should be set
		// The renderer decides which takes priority
		const image = parseImageMarkdown('![](image.png){size=small width=30%}');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('small');
		expect(image?.widthPercent).toBe(30);
	});

	it('should parse attributes in any order', () => {
		const image = parseImageMarkdown(
			'![](image.png){caption="Test" align=left size=large width=80%}'
		);

		expect(image).not.toBeNull();
		expect(image?.caption).toBe('Test');
		expect(image?.alignment).toBe('left');
		expect(image?.sizeClass).toBe('large');
		expect(image?.widthPercent).toBe(80);
	});

	it('should handle title and attributes together', () => {
		const image = parseImageMarkdown('![Graph](graph.png "Function plot"){size=medium}');

		expect(image).not.toBeNull();
		expect(image?.alt).toBe('Graph');
		expect(image?.src).toBe('graph.png');
		expect(image?.title).toBe('Function plot');
		expect(image?.sizeClass).toBe('medium');
	});
});

// ============================================================================
// 7. EDGE CASES
// ============================================================================

describe('Image Parser - Edge Cases', () => {
	it('should parse image with empty curly braces', () => {
		const image = parseImageMarkdown('![](image.png){}');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		// No attributes should be set
		expect(image?.sizeClass).toBeUndefined();
		expect(image?.widthPercent).toBeUndefined();
		expect(image?.alignment).toBeUndefined();
		expect(image?.caption).toBeUndefined();
	});

	it('should handle text after image on same line', () => {
		// When image is followed by text, it might be parsed differently
		const ast = parseMarkdown('![](image.png){size=small} some text after');

		// Should still have an image node
		const imageNode = ast.children.find((child) => child.type === 'image');
		expect(imageNode).toBeDefined();
	});

	it('should parse image with long URL', () => {
		const longUrl =
			'https://storage.example.com/bucket/path/to/very/long/directory/structure/image-file-name.png';
		const image = parseImageMarkdown(`![](${longUrl}){size=medium}`);

		expect(image).not.toBeNull();
		expect(image?.src).toBe(longUrl);
		expect(image?.sizeClass).toBe('medium');
	});

	it('should parse image with underscore in filename', () => {
		const image = parseImageMarkdown('![](my_image_file.png){size=large}');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('my_image_file.png');
	});

	it('should parse image with hyphens in filename', () => {
		const image = parseImageMarkdown('![](my-image-file.png){size=small}');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('my-image-file.png');
	});

	it('should handle multiple images in document', () => {
		const markdown = `![First](first.png){size=small}

![Second](second.png){size=large}`;

		const ast = parseMarkdown(markdown);
		const images = ast.children.filter((child) => child.type === 'image') as ImageNode[];

		expect(images).toHaveLength(2);
		expect(images[0].src).toBe('first.png');
		expect(images[0].sizeClass).toBe('small');
		expect(images[1].src).toBe('second.png');
		expect(images[1].sizeClass).toBe('large');
	});

	it('should handle image within complex document', () => {
		const markdown = `# Title

Some text before.

![Figure](figure.png){size=medium align=center caption="Important figure"}

Some text after.

- List item 1
- List item 2`;

		const ast = parseMarkdown(markdown);
		const imageNode = ast.children.find((child) => child.type === 'image') as ImageNode;

		expect(imageNode).toBeDefined();
		expect(imageNode.src).toBe('figure.png');
		expect(imageNode.sizeClass).toBe('medium');
		expect(imageNode.alignment).toBe('center');
		expect(imageNode.caption).toBe('Important figure');
	});

	it('should not parse image without curly braces as having attributes', () => {
		const image = parseImageMarkdown('![alt](image.png)');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBeUndefined();
		expect(image?.widthPercent).toBeUndefined();
		expect(image?.alignment).toBeUndefined();
		expect(image?.caption).toBeUndefined();
	});

	it('should handle whitespace in attribute string', () => {
		const image = parseImageMarkdown('![](image.png){  size=medium   align=center  }');

		expect(image).not.toBeNull();
		expect(image?.sizeClass).toBe('medium');
		expect(image?.alignment).toBe('center');
	});

	it('should handle various image extensions', () => {
		const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

		for (const ext of extensions) {
			const image = parseImageMarkdown(`![](image.${ext}){size=medium}`);
			expect(image).not.toBeNull();
			expect(image?.src).toBe(`image.${ext}`);
		}
	});
});

// ============================================================================
// 8. PARSEIMAGES OPTION
// ============================================================================

describe('Image Parser - ParseImages Option', () => {
	it('should not parse images when parseImages is false', () => {
		const ast = parseMarkdown('![alt](image.png){size=large}', { parseImages: false });

		// Image should be treated as paragraph text, not as image node
		const imageNode = ast.children.find((child) => child.type === 'image');
		expect(imageNode).toBeUndefined();

		// Should have paragraph instead
		const paragraph = ast.children.find((child) => child.type === 'paragraph');
		expect(paragraph).toBeDefined();
	});

	it('should parse images by default', () => {
		const ast = parseMarkdown('![alt](image.png)');

		const imageNode = ast.children.find((child) => child.type === 'image');
		expect(imageNode).toBeDefined();
	});

	it('should parse images when parseImages is true', () => {
		const ast = parseMarkdown('![alt](image.png)', { parseImages: true });

		const imageNode = ast.children.find((child) => child.type === 'image');
		expect(imageNode).toBeDefined();
	});
});

// ============================================================================
// 9. INTEGRATION WITH OTHER MARKDOWN ELEMENTS
// ============================================================================

describe('Image Parser - Integration', () => {
	it('should work with headings and images', () => {
		const markdown = `# Chapter 1

![Diagram](diagram.png){size=large align=center}

## Section 1.1`;

		const ast = parseMarkdown(markdown);

		expect(ast.children.some((c) => c.type === 'heading')).toBe(true);
		expect(ast.children.some((c) => c.type === 'image')).toBe(true);
	});

	it('should work with lists and images', () => {
		const markdown = `Images in document:

![First](first.png){size=small}

- Item 1
- Item 2

![Second](second.png){size=medium}`;

		const ast = parseMarkdown(markdown);
		const images = ast.children.filter((c) => c.type === 'image');
		const lists = ast.children.filter((c) => c.type === 'list');

		expect(images).toHaveLength(2);
		expect(lists).toHaveLength(1);
	});

	it('should work with math blocks and images', () => {
		const markdown = `Consider the function:

$$f(x) = x^2$$

![Graph](graph.png){size=medium caption="Graph of f(x)"}`;

		const ast = parseMarkdown(markdown);

		const mathBlock = ast.children.find((c) => c.type === 'math-block');
		const image = ast.children.find((c) => c.type === 'image') as ImageNode;

		expect(mathBlock).toBeDefined();
		expect(image).toBeDefined();
		expect(image.caption).toBe('Graph of f(x)');
	});

	it('should work with tables and images', () => {
		const markdown = `| x | y |
|---|---|
| 1 | 2 |

![Result](result.png){size=large}`;

		const ast = parseMarkdown(markdown);

		const table = ast.children.find((c) => c.type === 'table');
		const image = ast.children.find((c) => c.type === 'image');

		expect(table).toBeDefined();
		expect(image).toBeDefined();
	});
});

// ============================================================================
// 6. LINKED IMAGES
// ============================================================================

describe('Image Parser - Linked Images', () => {
	it('should parse basic linked image: [![alt](src)](href)', () => {
		const image = parseImageMarkdown('[![Click me](image.png)](https://example.com)');

		expect(image).not.toBeNull();
		expect(image?.type).toBe('image');
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('Click me');
		expect(image?.href).toBe('https://example.com');
		expect(image?.linkTitle).toBeUndefined();
	});

	it('should parse linked image with image title: [![alt](src "imgTitle")](href)', () => {
		const image = parseImageMarkdown(
			'[![Click me](image.png "Image tooltip")](https://example.com)'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('Click me');
		expect(image?.title).toBe('Image tooltip');
		expect(image?.href).toBe('https://example.com');
		expect(image?.linkTitle).toBeUndefined();
	});

	it('should parse linked image with link title: [![alt](src)](href "linkTitle")', () => {
		const image = parseImageMarkdown(
			'[![Click me](image.png)](https://example.com "Visit Example")'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('Click me');
		expect(image?.href).toBe('https://example.com');
		expect(image?.linkTitle).toBe('Visit Example');
	});

	it('should parse linked image with both titles', () => {
		const image = parseImageMarkdown(
			'[![Click me](image.png "Image tooltip")](https://example.com "Visit Example")'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.alt).toBe('Click me');
		expect(image?.title).toBe('Image tooltip');
		expect(image?.href).toBe('https://example.com');
		expect(image?.linkTitle).toBe('Visit Example');
	});

	it('should parse linked image with attributes', () => {
		const image = parseImageMarkdown(
			'[![Logo](logo.png)](https://company.com){size=medium align=center}'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('logo.png');
		expect(image?.alt).toBe('Logo');
		expect(image?.href).toBe('https://company.com');
		expect(image?.sizeClass).toBe('medium');
		expect(image?.alignment).toBe('center');
	});

	it('should parse linked image with all features', () => {
		const image = parseImageMarkdown(
			'[![Clickable logo](logo.png "Company Logo")](https://company.com "Visit our website"){size=large align=center caption="Our logo"}'
		);

		expect(image).not.toBeNull();
		expect(image?.src).toBe('logo.png');
		expect(image?.alt).toBe('Clickable logo');
		expect(image?.title).toBe('Company Logo');
		expect(image?.href).toBe('https://company.com');
		expect(image?.linkTitle).toBe('Visit our website');
		expect(image?.sizeClass).toBe('large');
		expect(image?.alignment).toBe('center');
		expect(image?.caption).toBe('Our logo');
	});

	it('should not confuse regular link with linked image', () => {
		const ast = parseMarkdown('[Click here](https://example.com)');

		// Regular link should be in a paragraph, not parsed as image
		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');
	});

	it('should not confuse regular image with linked image', () => {
		const image = parseImageMarkdown('![Regular image](image.png)');

		expect(image).not.toBeNull();
		expect(image?.src).toBe('image.png');
		expect(image?.href).toBeUndefined();
	});
});
