/**
 * Markdown Export Tests (Unit Tests)
 * ===================================
 *
 * Tests for converting TipTap JSON to Markdown format.
 * These tests use manually created JSON to avoid heavy imports.
 *
 * @module rich-text/__tests__/markdown-export.test
 */

import { describe, it, expect } from 'vitest';
import { tipTapToMarkdown } from '../markdown-export';
import type { JSONContent } from '@tiptap/core';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal TipTap document with content
 */
function createDoc(...content: JSONContent[]): JSONContent {
	return { type: 'doc', content };
}

/**
 * Create a paragraph with inline content
 */
function createParagraph(...content: JSONContent[]): JSONContent {
	return { type: 'paragraph', content };
}

/**
 * Create a text node with optional marks
 */
function createText(text: string, marks?: Array<{ type: string }>): JSONContent {
	const node: JSONContent = { type: 'text', text };
	if (marks && marks.length > 0) {
		node.marks = marks;
	}
	return node;
}

// ============================================================================
// BASIC TEXT TESTS
// ============================================================================

describe('tipTapToMarkdown - Basic Text', () => {
	it('converts a simple paragraph to text', () => {
		const json = createDoc(createParagraph(createText('Hello world')));
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Hello world');
	});

	it('converts multiple paragraphs with double newlines', () => {
		const json = createDoc(
			createParagraph(createText('First paragraph')),
			createParagraph(createText('Second paragraph'))
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('First paragraph\n\nSecond paragraph');
	});

	it('handles empty document', () => {
		const json = createDoc();
		const result = tipTapToMarkdown(json);

		expect(result).toBe('');
	});

	it('handles empty paragraph', () => {
		const json = createDoc(createParagraph());
		const result = tipTapToMarkdown(json);

		expect(result).toBe('');
	});
});

// ============================================================================
// TEXT FORMATTING TESTS
// ============================================================================

describe('tipTapToMarkdown - Text Formatting', () => {
	it('converts bold mark to **text**', () => {
		const json = createDoc(
			createParagraph(
				createText('This is '),
				createText('bold', [{ type: 'bold' }]),
				createText(' text')
			)
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('This is **bold** text');
	});

	it('converts italic mark to *text*', () => {
		const json = createDoc(
			createParagraph(
				createText('This is '),
				createText('italic', [{ type: 'italic' }]),
				createText(' text')
			)
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('This is *italic* text');
	});

	it('converts code mark to `text`', () => {
		const json = createDoc(
			createParagraph(
				createText('Use '),
				createText('console.log()', [{ type: 'code' }]),
				createText(' for debugging')
			)
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Use `console.log()` for debugging');
	});

	it('handles multiple marks on same text', () => {
		const json = createDoc(
			createParagraph(createText('bold italic', [{ type: 'bold' }, { type: 'italic' }]))
		);
		const result = tipTapToMarkdown(json);

		// Should have both ** and *
		expect(result).toContain('**');
		expect(result).toContain('*');
		expect(result).toContain('bold italic');
	});
});

// ============================================================================
// TEMPLATE VARIABLE TESTS
// ============================================================================

describe('tipTapToMarkdown - Template Variables', () => {
	it('converts templateVariable to {{name}}', () => {
		const json = createDoc(
			createParagraph(createText('Value: '), { type: 'templateVariable', attrs: { name: 'myVar' } })
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Value: {{myVar}}');
	});

	it('converts multiple templateVariable nodes', () => {
		const json = createDoc(
			createParagraph({ type: 'templateVariable', attrs: { name: 'a' } }, createText(' + '), {
				type: 'templateVariable',
				attrs: { name: 'b' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('{{a}} + {{b}}');
	});
});

// ============================================================================
// TEMPLATE RANDOM TESTS
// ============================================================================

describe('tipTapToMarkdown - Template Random', () => {
	it('converts templateRandom to {{spec}}', () => {
		const json = createDoc(
			createParagraph(createText('Number: '), { type: 'templateRandom', attrs: { spec: '1..10' } })
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Number: {{1..10}}');
	});

	it('preserves random: prefix if present', () => {
		const json = createDoc(
			createParagraph({ type: 'templateRandom', attrs: { spec: 'random:1..10' } })
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('{{random:1..10}}');
	});

	it('handles discrete list spec', () => {
		const json = createDoc(createParagraph({ type: 'templateRandom', attrs: { spec: 'a|b|c' } }));
		const result = tipTapToMarkdown(json);

		expect(result).toBe('{{a|b|c}}');
	});
});

// ============================================================================
// TEMPLATE EVAL TESTS
// ============================================================================

describe('tipTapToMarkdown - Template Eval', () => {
	it('converts templateEval to {{eval:expression}}', () => {
		const json = createDoc(
			createParagraph(createText('Result: '), {
				type: 'templateEval',
				attrs: { expression: 'a+b' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Result: {{eval:a+b}}');
	});

	it('preserves modifiers in eval expression', () => {
		const json = createDoc(
			createParagraph({ type: 'templateEval', attrs: { expression: 'x*y|d,+' } })
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('{{eval:x*y|d,+}}');
	});
});

// ============================================================================
// BLANK FIELD TESTS
// ============================================================================

describe('tipTapToMarkdown - Blank Fields', () => {
	it('converts blankField to {{blank:number}}', () => {
		const json = createDoc(
			createParagraph(createText('Answer: '), { type: 'blankField', attrs: { number: 1 } })
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Answer: {{blank:1}}');
	});

	it('handles multiple blank fields', () => {
		const json = createDoc(
			createParagraph(
				{ type: 'blankField', attrs: { number: 1 } },
				createText(' + '),
				{ type: 'blankField', attrs: { number: 2 } },
				createText(' = '),
				{ type: 'blankField', attrs: { number: 3 } }
			)
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('{{blank:1}} + {{blank:2}} = {{blank:3}}');
	});
});

// ============================================================================
// MATH INLINE TESTS
// ============================================================================

describe('tipTapToMarkdown - Math Inline', () => {
	it('uses $originalExpression$ for syntax=latex', () => {
		const json = createDoc(
			createParagraph(createText('Formula: '), {
				type: 'mathInline',
				attrs: { latex: 'x^2', syntax: 'latex', originalExpression: 'x^2' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('Formula: $x^2$');
	});

	it('uses ~originalExpression~ for syntax=custom', () => {
		const json = createDoc(
			createParagraph({
				type: 'mathInline',
				attrs: { latex: '\\frac{2}{3}', syntax: 'custom', originalExpression: '2/3' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('~2/3~');
	});

	it('falls back to $latex$ if no originalExpression', () => {
		const json = createDoc(
			createParagraph({
				type: 'mathInline',
				attrs: { latex: 'x^2', syntax: 'latex' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('$x^2$');
	});

	it('falls back to ~latex~ for custom syntax without originalExpression', () => {
		const json = createDoc(
			createParagraph({
				type: 'mathInline',
				attrs: { latex: '\\frac{2}{3}', syntax: 'custom' }
			})
		);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('~\\frac{2}{3}~');
	});
});

// ============================================================================
// MATH BLOCK TESTS
// ============================================================================

describe('tipTapToMarkdown - Math Block', () => {
	it('uses $$originalExpression$$ for syntax=latex', () => {
		const json = createDoc({
			type: 'mathBlock',
			attrs: { latex: '\\frac{a}{b}', syntax: 'latex', originalExpression: '\\frac{a}{b}' }
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('$$\\frac{a}{b}$$');
	});

	it('uses ~~originalExpression~~ for syntax=custom', () => {
		const json = createDoc({
			type: 'mathBlock',
			attrs: { latex: '\\sqrt{16}', syntax: 'custom', originalExpression: 'sqrt(16)' }
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('~~sqrt(16)~~');
	});
});

// ============================================================================
// HEADING TESTS
// ============================================================================

describe('tipTapToMarkdown - Headings', () => {
	it('converts heading level 1 to #', () => {
		const json = createDoc({
			type: 'heading',
			attrs: { level: 1 },
			content: [createText('Main Title')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('# Main Title');
	});

	it('converts heading level 2 to ##', () => {
		const json = createDoc({
			type: 'heading',
			attrs: { level: 2 },
			content: [createText('Section')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('## Section');
	});

	it('converts heading level 6 to ######', () => {
		const json = createDoc({
			type: 'heading',
			attrs: { level: 6 },
			content: [createText('Small')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('###### Small');
	});

	it('handles inline content in headings', () => {
		const json = createDoc({
			type: 'heading',
			attrs: { level: 1 },
			content: [
				createText('Title with '),
				createText('bold', [{ type: 'bold' }]),
				createText(' text')
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('# Title with **bold** text');
	});
});

// ============================================================================
// LIST TESTS
// ============================================================================

describe('tipTapToMarkdown - Lists', () => {
	it('converts bulletList to - markers', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{ type: 'listItem', content: [createParagraph(createText('Item 1'))] },
				{ type: 'listItem', content: [createParagraph(createText('Item 2'))] }
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('- Item 1\n- Item 2');
	});

	it('converts orderedList to 1. markers', () => {
		const json = createDoc({
			type: 'orderedList',
			content: [
				{ type: 'listItem', content: [createParagraph(createText('First'))] },
				{ type: 'listItem', content: [createParagraph(createText('Second'))] }
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('1. First\n2. Second');
	});

	it('handles nested lists with indentation', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						createParagraph(createText('Parent')),
						{
							type: 'bulletList',
							content: [{ type: 'listItem', content: [createParagraph(createText('Child'))] }]
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toContain('- Parent');
		expect(result).toContain('  - Child');
	});

	it('handles inline content in list items', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						createParagraph(createText('Item with '), createText('bold', [{ type: 'bold' }]))
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('- Item with **bold**');
	});
});

// ============================================================================
// BLOCKQUOTE TESTS
// ============================================================================

describe('tipTapToMarkdown - Blockquotes', () => {
	it('converts blockquote to > prefix', () => {
		const json = createDoc({
			type: 'blockquote',
			content: [createParagraph(createText('This is a quote'))]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('> This is a quote');
	});

	it('handles multiple paragraphs in blockquote', () => {
		const json = createDoc({
			type: 'blockquote',
			content: [createParagraph(createText('Line 1')), createParagraph(createText('Line 2'))]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toContain('> Line 1');
		expect(result).toContain('> Line 2');
	});

	it('handles nested blockquotes', () => {
		const json = createDoc({
			type: 'blockquote',
			content: [
				createParagraph(createText('Outer')),
				{
					type: 'blockquote',
					content: [createParagraph(createText('Inner'))]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toContain('> Outer');
		// Both "> > Inner" and ">> Inner" are valid markdown for nested blockquotes
		expect(result).toMatch(/> ?> Inner/);
	});
});

// ============================================================================
// CODE BLOCK TESTS
// ============================================================================

describe('tipTapToMarkdown - Code Blocks', () => {
	it('converts codeBlock with language', () => {
		const json = createDoc({
			type: 'codeBlock',
			attrs: { language: 'javascript' },
			content: [createText('const x = 1;')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('```javascript\nconst x = 1;\n```');
	});

	it('converts codeBlock without language', () => {
		const json = createDoc({
			type: 'codeBlock',
			content: [createText('plain code')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toBe('```\nplain code\n```');
	});

	it('preserves content with special chars inside code blocks', () => {
		const json = createDoc({
			type: 'codeBlock',
			content: [createText('$x^2$ and **bold**')]
		});
		const result = tipTapToMarkdown(json);

		expect(result).toContain('$x^2$ and **bold**');
	});
});

// ============================================================================
// HORIZONTAL RULE TESTS
// ============================================================================

describe('tipTapToMarkdown - Horizontal Rules', () => {
	it('converts horizontalRule to ---', () => {
		const json = createDoc(
			createParagraph(createText('Before')),
			{ type: 'horizontalRule' },
			createParagraph(createText('After'))
		);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('---');
	});
});

// ============================================================================
// COMMONMARK: LIST ITEMS STARTING WITH BLOCKS
// ============================================================================

describe('tipTapToMarkdown - CommonMark list items with block-first content', () => {
	it('exports list item starting with code block correctly', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'codeBlock',
							attrs: { language: 'js' },
							content: [createText('const x = 1;')]
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		// Should be "-\n   ```js..." not "- \n   ```js..."
		expect(result).toMatch(/^-\n/);
		expect(result).toContain('```js');
		expect(result).toContain('const x = 1;');
	});

	it('exports list item starting with blockquote correctly', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'blockquote',
							content: [createParagraph(createText('A quote'))]
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		// Should be "-\n   > A quote" not "- \n   > A quote"
		expect(result).toMatch(/^-\n/);
		expect(result).toContain('> A quote');
	});

	it('exports list item starting with math block correctly', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'mathBlock',
							attrs: { latex: 'x^2', syntax: 'latex', originalExpression: 'x^2' }
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		// Should be "-\n   $$x^2$$" not "- \n   $$x^2$$"
		expect(result).toMatch(/^-\n/);
		expect(result).toContain('$$x^2$$');
	});

	it('exports list item starting with nested list correctly', () => {
		const json = createDoc({
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'bulletList',
							content: [
								{ type: 'listItem', content: [createParagraph(createText('Nested 1'))] },
								{ type: 'listItem', content: [createParagraph(createText('Nested 2'))] }
							]
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		// Should be "-\n  - Nested 1..." not "- \n  - Nested 1..."
		expect(result).toMatch(/^-\n/);
		expect(result).toContain('- Nested 1');
		expect(result).toContain('- Nested 2');
	});

	it('exports ordered list item starting with code block correctly', () => {
		const json = createDoc({
			type: 'orderedList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'codeBlock',
							attrs: { language: 'python' },
							content: [createText('print("hello")')]
						}
					]
				}
			]
		});
		const result = tipTapToMarkdown(json);

		// Should be "1.\n   ```python..." not "1. \n   ```python..."
		expect(result).toMatch(/^1\.\n/);
		expect(result).toContain('```python');
	});
});
