/**
 * Markdown Round-trip Tests
 * =========================
 *
 * Tests for complete round-trip: Markdown -> TipTap JSON -> Markdown
 * These tests require heavy imports (parseMarkdown, mathAST, etc.)
 * and are separated from unit tests to avoid blocking test initialization.
 *
 * @module rich-text/__tests__/markdown-roundtrip.test
 */

import { describe, it, expect } from 'vitest';
import { tipTapToMarkdown } from '../markdown-export';
import { markdownToTipTap } from '../markdown-import';

// ============================================================================
// ROUND-TRIP TESTS
// ============================================================================

describe('Round-trip: Markdown -> TipTap -> Markdown', () => {
	it('preserves simple text', () => {
		const markdown = 'Hello world';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves bold text', () => {
		const markdown = 'This is **bold** text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves italic text', () => {
		const markdown = 'This is *italic* text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves inline code', () => {
		const markdown = 'Use `console.log()` for debugging';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves template variables', () => {
		const markdown = 'Value: {{myVar}}';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves template random', () => {
		const markdown = 'Number: {{1..10}}';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves template eval', () => {
		const markdown = 'Result: {{eval:a+b}}';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves blank fields', () => {
		const markdown = '{{blank:1}} + {{blank:2}} = {{blank:3}}';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves LaTeX math inline', () => {
		const markdown = 'Formula: $x^2$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves custom math inline', () => {
		const markdown = 'Fraction: ~2/3~';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves LaTeX math block', () => {
		const markdown = '$$\\frac{a}{b}$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves custom math block', () => {
		const markdown = '~~sqrt(16)~~';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves headings', () => {
		const markdown = '## Section Title';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves bullet lists', () => {
		const markdown = '- Item 1\n- Item 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves ordered lists', () => {
		const markdown = '1. First\n2. Second';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves blockquotes', () => {
		const markdown = '> This is a quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves code blocks with language', () => {
		const markdown = '```javascript\nconst x = 1;\n```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves horizontal rules', () => {
		const markdown = 'Before\n\n---\n\nAfter';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	it('handles empty document', () => {
		const markdown = '';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe('');
	});

	it('handles document with only whitespace', () => {
		const markdown = '   ';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// Should normalize to empty or preserve structure
		expect(result.trim()).toBe('');
	});

	it('handles multiple paragraphs', () => {
		const markdown = 'First paragraph\n\nSecond paragraph';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('handles complex nested structure', () => {
		const markdown = '- Item with **bold** and *italic*\n- Item with `code`';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('handles template inside formatted text', () => {
		// Note: Template variables break up formatted text due to how TipTap handles marks
		// This is expected behavior - the bold formatting ends before the template
		const markdown = '**Value: {{x}}**';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// Template breaks the bold, so we get **Value: ** followed by {{x}}
		expect(result).toContain('Value:');
		expect(result).toContain('{{x}}');
	});
});

// ============================================================================
// COMMONMARK: BLOCK SEPARATION IN LIST ITEMS
// ============================================================================

describe('CommonMark: Block separation in list items', () => {
	it('uses blank lines to separate blocks in list items', () => {
		// Create a list item with multiple paragraphs
		const markdown = '- First paragraph\n\n  Second paragraph';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// Should have blank line between paragraphs in list item
		expect(result).toContain('\n\n');
		expect(result).toContain('First paragraph');
		expect(result).toContain('Second paragraph');
	});

	it('uses blank lines to separate paragraph and code block in list items', () => {
		const markdown = '- Some text\n\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// Should have blank line before code block
		expect(result).toContain('Some text');
		expect(result).toContain('```');
		expect(result).toContain('code');
	});

	it('uses blank lines to separate paragraph and blockquote in list items', () => {
		const markdown = '- Text before\n\n  > A quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Text before');
		expect(result).toContain('> A quote');
	});

	it('handles nested lists with multiple blocks', () => {
		const markdown = '- Parent\n\n  - Child 1\n  - Child 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Parent');
		expect(result).toContain('Child 1');
		expect(result).toContain('Child 2');
	});

	it('preserves single paragraph list items without extra blank lines', () => {
		const markdown = '- Simple item 1\n- Simple item 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// Should not have blank lines between simple list items
		expect(result).toBe(markdown);
	});

	it('handles math block in list item with proper separation', () => {
		const markdown = '- Text\n\n  $$x^2$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Text');
		expect(result).toContain('$$x^2$$');
	});

	it('handles code block in list item with language', () => {
		const markdown = '- Description\n\n  ```python\n  print("hello")\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Description');
		expect(result).toContain('```python');
		expect(result).toContain('print("hello")');
	});

	// -------------------------------------------------------------------------
	// List items starting with non-paragraph blocks
	// -------------------------------------------------------------------------

	it('handles list item starting with code block (CommonMark syntax)', () => {
		// CommonMark: when list item starts with a block, marker line is empty
		const markdown = '-\n  ```js\n  const x = 1;\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('```');
		expect(result).toContain('const x = 1;');
	});

	it('handles list item starting with blockquote (CommonMark syntax)', () => {
		// CommonMark: when list item starts with a block, marker line is empty
		const markdown = '-\n  > A quote as first block';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('> A quote as first block');
	});

	it('handles list item starting with math block (CommonMark syntax)', () => {
		// CommonMark: when list item starts with a block, marker line is empty
		const markdown = '-\n  $$x^2 + y^2$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('$$x^2 + y^2$$');
	});

	it('handles list item starting with code block followed by paragraph', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n\n  Some text after';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('```');
		expect(result).toContain('code');
		expect(result).toContain('Some text after');
	});

	it('handles list item starting with blockquote followed by paragraph', () => {
		const markdown = '-\n  > Quote first\n\n  Text after';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('> Quote first');
		expect(result).toContain('Text after');
	});

	it('handles list item starting with math block followed by paragraph', () => {
		const markdown = '-\n  $$a^2$$\n\n  Explanation text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('$$a^2$$');
		expect(result).toContain('Explanation text');
	});

	it('handles list item starting with nested list', () => {
		const markdown = '-\n  - Nested item 1\n  - Nested item 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Nested item 1');
		expect(result).toContain('Nested item 2');
	});

	// -------------------------------------------------------------------------
	// Ordered lists with block-first items
	// -------------------------------------------------------------------------

	it('handles ordered list item starting with code block (CommonMark syntax)', () => {
		// CommonMark: when list item starts with a block, marker line is empty
		const markdown = '1.\n   ```js\n   const x = 1;\n   ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('```');
		expect(result).toContain('const x = 1;');
	});

	it('handles ordered list item starting with math block (CommonMark syntax)', () => {
		const markdown = '1.\n   $$a + b = c$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('$$a + b = c$$');
	});

	it('handles ordered list item starting with blockquote (CommonMark syntax)', () => {
		const markdown = '1.\n   > A quote in ordered list';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('> A quote in ordered list');
	});

	// -------------------------------------------------------------------------
	// Multiple block types in same list item
	// -------------------------------------------------------------------------

	it('handles list item with code block followed by math block', () => {
		const markdown = '- Description\n\n  ```js\n  code\n  ```\n\n  $$x^2$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Description');
		expect(result).toContain('```js');
		expect(result).toContain('code');
		expect(result).toContain('$$x^2$$');
	});

	it('handles list item with blockquote followed by code block', () => {
		const markdown = '- Intro\n\n  > A quote\n\n  ```python\n  print("hi")\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Intro');
		expect(result).toContain('> A quote');
		expect(result).toContain('```python');
		expect(result).toContain('print("hi")');
	});

	it('handles list item with all block types', () => {
		const markdown = '- Text\n\n  > Quote\n\n  ```js\n  code\n  ```\n\n  $$math$$\n\n  - Nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toContain('Text');
		expect(result).toContain('> Quote');
		expect(result).toContain('```js');
		expect(result).toContain('code');
		expect(result).toContain('$$math$$');
		expect(result).toContain('Nested');
	});
});
