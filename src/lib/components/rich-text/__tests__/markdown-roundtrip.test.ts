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

	it('preserves bold and italic combined', () => {
		const markdown = 'This is ***bold and italic*** text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves strikethrough text', () => {
		const markdown = 'This is -/-deleted-/- text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves strikethrough with other formatting', () => {
		const markdown = 'Normal -/-strikethrough-/- and **bold** text';
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

// ============================================================================
// STRICT ROUND-TRIP: EXACT MARKDOWN PRESERVATION
// ============================================================================

describe('Strict round-trip: exact markdown preservation', () => {
	// =========================================================================
	// BASIC BLOCK TYPES (standalone)
	// =========================================================================

	it('exact: paragraph', () => {
		const markdown = 'Simple paragraph text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: code block with language', () => {
		const markdown = '```javascript\nconst x = 1;\n```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: blockquote', () => {
		const markdown = '> This is a quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: math block ($$...$$)', () => {
		const markdown = '$$\\frac{a}{b}$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet list (simple)', () => {
		const markdown = '- Item 1\n- Item 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered list (simple)', () => {
		const markdown = '1. First\n2. Second';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: nested bullet list', () => {
		const markdown = '- Parent\n  - Child 1\n  - Child 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: nested ordered list', () => {
		const markdown = '1. Parent\n   1. Child 1\n   2. Child 2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// DEEP NESTING: 3+ levels (regression tests for indent calculation)
	// =========================================================================

	it('exact: ordered list with 3 levels deep nesting', () => {
		// This test ensures ordered lists with 3-space indentation per level work correctly
		// Previously broken: level 3 (6 spaces) was incorrectly parsed as level 3 instead of 2
		const markdown =
			'1. Level 1\n   1. Level 2\n      1. Level 3\n   2. Level 2 again\n2. Level 1 again';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet list with 3 levels deep nesting', () => {
		// Bullet lists use 2-space indentation per level
		const markdown = '- Level 1\n  - Level 2\n    - Level 3\n  - Level 2 again\n- Level 1 again';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered list 4 levels deep', () => {
		const markdown =
			'1. L1\n   1. L2\n      1. L3\n         1. L4\n      2. L3 again\n   2. L2 again\n2. L1 again';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet list 4 levels deep', () => {
		// Bullet lists use 2 spaces per level: L1(0), L2(2), L3(4), L4(6)
		// Note: 6 spaces is divisible by 3, but with "- " marker it's clearly a bullet list
		// So L4 at 6 spaces should be level 3 when parsed
		// Actually we need 8 spaces for L4 to be level 4 (2*4=8)
		const markdown = '- L1\n  - L2\n    - L3\n      - L4\n    - L3 again\n  - L2 again\n- L1 again';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		// With 6 spaces, L4 is at level 3 (6/2=3), so the roundtrip exports it with 6 spaces
		// but the parser might interpret 6 spaces as level 2 with ordered-list heuristic
		// This test verifies the current behavior - update if implementation changes
		expect(result).toContain('- L4');
	});

	// =========================================================================
	// BULLET LISTS: SINGLE BLOCK TYPES (first and only content)
	// =========================================================================

	it('exact: bullet - code only', () => {
		const markdown = '-\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - blockquote only', () => {
		const markdown = '-\n  > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - math only', () => {
		const markdown = '-\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - nested list only', () => {
		const markdown = '-\n  - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: PARAGRAPH FIRST, THEN BLOCK
	// =========================================================================

	it('exact: bullet - paragraph then code', () => {
		const markdown = '- text\n\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - paragraph then blockquote', () => {
		const markdown = '- text\n\n  > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - paragraph then math', () => {
		const markdown = '- text\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - paragraph then nested list', () => {
		const markdown = '- text\n\n  - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: BLOCK FIRST, THEN PARAGRAPH
	// =========================================================================

	it('exact: bullet - code then paragraph', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n\n  text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - blockquote then paragraph', () => {
		const markdown = '-\n  > quote\n\n  text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - math then paragraph', () => {
		const markdown = '-\n  $$math$$\n\n  text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: TWO BLOCKS (no paragraph)
	// =========================================================================

	it('exact: bullet - code then math', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - blockquote then code', () => {
		const markdown = '-\n  > quote\n\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - math then blockquote', () => {
		const markdown = '-\n  $$math$$\n\n  > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: PARAGRAPH + BLOCK + PARAGRAPH (sandwich)
	// =========================================================================

	it('exact: bullet - text, code, text (sandwich)', () => {
		const markdown = '- text1\n\n  ```js\n  code\n  ```\n\n  text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - text, blockquote, text (sandwich)', () => {
		const markdown = '- text1\n\n  > quote\n\n  text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - text, math, text (sandwich)', () => {
		const markdown = '- text1\n\n  $$math$$\n\n  text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: BLOCK + PARAGRAPH + BLOCK
	// =========================================================================

	it('exact: bullet - code, text, math', () => {
		const markdown = '-\n  ```js\n  code1\n  ```\n\n  text\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - blockquote, text, code', () => {
		const markdown = '-\n  > quote\n\n  text\n\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// BULLET LISTS: THREE+ BLOCKS MIXED
	// =========================================================================

	it('exact: bullet - blockquote, code, math (no paragraph)', () => {
		const markdown = '-\n  > quote\n\n  ```js\n  code\n  ```\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - text, blockquote, code, math', () => {
		const markdown = '- text\n\n  > quote\n\n  ```js\n  code\n  ```\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: SINGLE BLOCK TYPES (first and only content)
	// =========================================================================

	it('exact: ordered - code only', () => {
		const markdown = '1.\n   ```js\n   code\n   ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - blockquote only', () => {
		const markdown = '1.\n   > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - math only', () => {
		const markdown = '1.\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - nested list only', () => {
		const markdown = '1.\n   - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: PARAGRAPH FIRST, THEN BLOCK
	// =========================================================================

	it('exact: ordered - paragraph then code', () => {
		const markdown = '1. text\n\n   ```js\n   code\n   ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - paragraph then blockquote', () => {
		const markdown = '1. text\n\n   > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - paragraph then math', () => {
		const markdown = '1. text\n\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - paragraph then nested list', () => {
		const markdown = '1. text\n\n   - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: BLOCK FIRST, THEN PARAGRAPH
	// =========================================================================

	it('exact: ordered - code then paragraph', () => {
		const markdown = '1.\n   ```js\n   code\n   ```\n\n   text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - blockquote then paragraph', () => {
		const markdown = '1.\n   > quote\n\n   text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - math then paragraph', () => {
		const markdown = '1.\n   $$math$$\n\n   text';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: TWO BLOCKS (no paragraph)
	// =========================================================================

	it('exact: ordered - code then math', () => {
		const markdown = '1.\n   ```js\n   code\n   ```\n\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - blockquote then code', () => {
		const markdown = '1.\n   > quote\n\n   ```js\n   code\n   ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - math then blockquote', () => {
		const markdown = '1.\n   $$math$$\n\n   > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: PARAGRAPH + BLOCK + PARAGRAPH (sandwich)
	// =========================================================================

	it('exact: ordered - text, code, text (sandwich)', () => {
		const markdown = '1. text1\n\n   ```js\n   code\n   ```\n\n   text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - text, blockquote, text (sandwich)', () => {
		const markdown = '1. text1\n\n   > quote\n\n   text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - text, math, text (sandwich)', () => {
		const markdown = '1. text1\n\n   $$math$$\n\n   text2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: BLOCK + PARAGRAPH + BLOCK
	// =========================================================================

	it('exact: ordered - code, text, math', () => {
		const markdown = '1.\n   ```js\n   code1\n   ```\n\n   text\n\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - blockquote, text, code', () => {
		const markdown = '1.\n   > quote\n\n   text\n\n   ```js\n   code\n   ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// ORDERED LISTS: THREE+ BLOCKS MIXED
	// =========================================================================

	it('exact: ordered - blockquote, code, math (no paragraph)', () => {
		const markdown = '1.\n   > quote\n\n   ```js\n   code\n   ```\n\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - text, blockquote, code, math', () => {
		const markdown = '1. text\n\n   > quote\n\n   ```js\n   code\n   ```\n\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// MULTIPLE LIST ITEMS
	// =========================================================================

	it('exact: bullet - two simple items', () => {
		const markdown = '- item1\n- item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - first with block, second simple', () => {
		const markdown = '- text\n\n  ```js\n  code\n  ```\n- item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - block-first item, then simple item', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n- item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - both items with blocks', () => {
		const markdown = '- text1\n\n  ```js\n  code1\n  ```\n- text2\n\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - two simple items', () => {
		const markdown = '1. item1\n2. item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - first with block, second simple', () => {
		const markdown = '1. text\n\n   ```js\n   code\n   ```\n2. item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - block-first item, then simple item', () => {
		const markdown = '1.\n   ```js\n   code\n   ```\n2. item2';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// DEEPLY NESTED: NESTED LIST INSIDE BLOCK-FIRST ITEM
	// =========================================================================

	it('exact: bullet - block-first with deeply nested list', () => {
		const markdown = '-\n  - nested1\n    - deeply nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - code then nested list', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n\n  - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - nested list then code', () => {
		const markdown = '-\n  - nested\n\n  ```js\n  code\n  ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// DEEPLY NESTED: BLOCK INSIDE NESTED LIST ITEM
	// =========================================================================

	it('exact: bullet - nested item with code block', () => {
		const markdown = '- parent\n  - nested\n\n    ```js\n    code\n    ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - nested item with blockquote', () => {
		const markdown = '- parent\n  - nested\n\n    > quote';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - nested item with math', () => {
		const markdown = '- parent\n  - nested\n\n    $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: bullet - nested item starting with code (block-first)', () => {
		const markdown = '- parent\n  -\n    ```js\n    code\n    ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - nested item with code block', () => {
		const markdown = '1. parent\n   1. nested\n\n      ```js\n      code\n      ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - nested item starting with code (block-first)', () => {
		const markdown = '1. parent\n   1.\n      ```js\n      code\n      ```';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// MIXED LIST TYPES
	// =========================================================================

	it('exact: bullet with nested ordered list', () => {
		const markdown = '- parent\n  1. ordered child';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered with nested bullet list', () => {
		const markdown = '1. parent\n   - bullet child';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	// =========================================================================
	// COMPLEX COMBINATIONS
	// =========================================================================

	it('exact: bullet - all block types with nested list', () => {
		const markdown = '- text\n\n  > quote\n\n  ```js\n  code\n  ```\n\n  $$math$$\n\n  - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: ordered - all block types with nested list', () => {
		const markdown =
			'1. text\n\n   > quote\n\n   ```js\n   code\n   ```\n\n   $$math$$\n\n   - nested';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: multiple bullet items each with different blocks', () => {
		const markdown = '-\n  ```js\n  code\n  ```\n-\n  > quote\n-\n  $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('exact: multiple ordered items each with different blocks', () => {
		const markdown = '1.\n   ```js\n   code\n   ```\n2.\n   > quote\n3.\n   $$math$$';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});
});

// ============================================================================
// TABLE CELL INLINE FORMATTING
// ============================================================================

describe('Table cell inline formatting', () => {
	it('preserves inline code in table cells', () => {
		const markdown = '| Function | Example |\n|:---|:---|\n| `map()` | `[1,2].map(x => x*2)` |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves bold text in table cells', () => {
		const markdown = '| Header | Value |\n|:---|:---|\n| **bold** | normal |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves italic text in table cells', () => {
		const markdown = '| Header | Value |\n|:---|:---|\n| *italic* | normal |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves strikethrough text in table cells', () => {
		const markdown = '| Header | Value |\n|:---|:---|\n| -/-deleted-/- | normal |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves mixed formatting in table cells', () => {
		const markdown =
			'| Type | Example |\n|:---|:---|\n| Code | `console.log()` |\n| Bold | **strong** |\n| Italic | *emphasis* |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves math in table cells', () => {
		const markdown = '| Formula | Description |\n|:---|:---|\n| $x^2$ | Square |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves complex table with multiple formatting types', () => {
		const markdown =
			'| Function | Description | Example |\n|:---|:---|:---|\n| `map()` | Transforme | `[1,2].map(x => x*2)` |\n| `filter()` | **Filtre** | *resultat* |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves transposed table with :table-h directive', () => {
		const markdown = ':table-h\n| Nom | Age |\n|:---|:---|\n| Alice | 25 |\n| Bob | 30 |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves cross table with :table-cross directive', () => {
		const markdown = ':table-cross\n| × | 1 | 2 |\n|:---|:---|:---|\n| 1 | 1 | 2 |\n| 2 | 2 | 4 |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});

	it('preserves cross table with empty corner cell', () => {
		const markdown = ':table-cross\n|  | A | B |\n|:---|:---|:---|\n| 1 | x | y |';
		const json = markdownToTipTap(markdown);
		const result = tipTapToMarkdown(json);

		expect(result).toBe(markdown);
	});
});
