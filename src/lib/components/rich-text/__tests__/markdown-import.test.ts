/**
 * Markdown Import Tests
 * =====================
 *
 * Tests for converting Markdown to TipTap JSON format.
 * Uses the existing markdown parser and converts AST to TipTap structure.
 *
 * @module rich-text/__tests__/markdown-import.test
 */

import { describe, it, expect } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import type { JSONContent } from '@tiptap/core';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract the first paragraph's content from TipTap JSON
 */
function getFirstParagraphContent(json: JSONContent): JSONContent[] | undefined {
	const doc = json;
	if (doc.type !== 'doc' || !doc.content) return undefined;
	const firstBlock = doc.content[0];
	if (firstBlock?.type !== 'paragraph') return undefined;
	return firstBlock.content;
}

/**
 * Find a node by type in TipTap JSON content array
 */
function findNodeByType(content: JSONContent[] | undefined, type: string): JSONContent | undefined {
	return content?.find((node) => node.type === type);
}

// ============================================================================
// BASIC TEXT TESTS
// ============================================================================

describe('markdownToTipTap - Basic Text', () => {
	it('converts plain text to a paragraph with text node', () => {
		const markdown = 'Hello world';
		const result = markdownToTipTap(markdown);

		expect(result.type).toBe('doc');
		expect(result.content).toHaveLength(1);
		expect(result.content?.[0].type).toBe('paragraph');
		expect(result.content?.[0].content?.[0]).toEqual({
			type: 'text',
			text: 'Hello world'
		});
	});

	it('converts multiple paragraphs separated by double newline', () => {
		const markdown = 'First paragraph\n\nSecond paragraph';
		const result = markdownToTipTap(markdown);

		expect(result.type).toBe('doc');
		expect(result.content).toHaveLength(2);
		expect(result.content?.[0].type).toBe('paragraph');
		expect(result.content?.[1].type).toBe('paragraph');
		expect(result.content?.[0].content?.[0].text).toBe('First paragraph');
		expect(result.content?.[1].content?.[0].text).toBe('Second paragraph');
	});

	it('handles empty input', () => {
		const result = markdownToTipTap('');
		expect(result.type).toBe('doc');
		expect(result.content).toEqual([]);
	});
});

// ============================================================================
// TEXT FORMATTING TESTS
// ============================================================================

describe('markdownToTipTap - Text Formatting', () => {
	it('converts **bold** text with bold mark', () => {
		const markdown = 'This is **bold** text';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		expect(content).toBeDefined();
		expect(content).toHaveLength(3);

		// Before bold
		expect(content?.[0]).toEqual({ type: 'text', text: 'This is ' });

		// Bold text
		expect(content?.[1].type).toBe('text');
		expect(content?.[1].text).toBe('bold');
		expect(content?.[1].marks).toContainEqual({ type: 'bold' });

		// After bold
		expect(content?.[2]).toEqual({ type: 'text', text: ' text' });
	});

	it('converts *italic* text with italic mark', () => {
		const markdown = 'This is *italic* text';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		expect(content).toBeDefined();

		const italicNode = content?.find((n) => n.marks?.some((m) => m.type === 'italic'));
		expect(italicNode).toBeDefined();
		expect(italicNode?.text).toBe('italic');
	});

	it('converts _italic_ text (underscore syntax) with italic mark', () => {
		const markdown = 'This is _italic_ text';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const italicNode = content?.find((n) => n.marks?.some((m) => m.type === 'italic'));
		expect(italicNode).toBeDefined();
		expect(italicNode?.text).toBe('italic');
	});

	it('converts `code` text with code mark', () => {
		const markdown = 'Use `console.log()` for debugging';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const codeNode = content?.find((n) => n.marks?.some((m) => m.type === 'code'));
		expect(codeNode).toBeDefined();
		expect(codeNode?.text).toBe('console.log()');
	});

	it('converts __bold__ text (underscore syntax)', () => {
		const markdown = 'This is __bold__ text';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const boldNode = content?.find((n) => n.marks?.some((m) => m.type === 'bold'));
		expect(boldNode).toBeDefined();
		expect(boldNode?.text).toBe('bold');
	});
});

// ============================================================================
// TEMPLATE VARIABLE TESTS
// ============================================================================

describe('markdownToTipTap - Template Variables', () => {
	it('converts {{varName}} to templateVariable node', () => {
		const markdown = 'The value is {{myVar}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const templateNode = findNodeByType(content, 'templateVariable');

		expect(templateNode).toBeDefined();
		expect(templateNode?.attrs?.name).toBe('myVar');
	});

	it('converts multiple variables in same paragraph', () => {
		const markdown = '{{a}} plus {{b}} equals {{c}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const templateNodes = content?.filter((n) => n.type === 'templateVariable');

		expect(templateNodes).toHaveLength(3);
		expect(templateNodes?.[0].attrs?.name).toBe('a');
		expect(templateNodes?.[1].attrs?.name).toBe('b');
		expect(templateNodes?.[2].attrs?.name).toBe('c');
	});

	it('handles variable with underscores {{my_var}}', () => {
		const markdown = 'Value: {{my_var}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const templateNode = findNodeByType(content, 'templateVariable');

		expect(templateNode?.attrs?.name).toBe('my_var');
	});
});

// ============================================================================
// TEMPLATE RANDOM TESTS
// ============================================================================

describe('markdownToTipTap - Template Random', () => {
	it('converts {{1..10}} to templateRandom node', () => {
		const markdown = 'Pick a number: {{1..10}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const randomNode = findNodeByType(content, 'templateRandom');

		expect(randomNode).toBeDefined();
		expect(randomNode?.attrs?.spec).toBe('1..10');
	});

	it('converts {{random:1..10}} with prefix', () => {
		const markdown = 'Number: {{random:1..10}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const randomNode = findNodeByType(content, 'templateRandom');

		expect(randomNode?.attrs?.spec).toBe('random:1..10');
	});

	it('converts discrete list {{a|b|c}}', () => {
		const markdown = 'Choose: {{a|b|c}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const randomNode = findNodeByType(content, 'templateRandom');

		expect(randomNode?.attrs?.spec).toBe('a|b|c');
	});

	it('converts decimal digits {{2.3}}', () => {
		const markdown = 'Decimal: {{2.3}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const randomNode = findNodeByType(content, 'templateRandom');

		expect(randomNode?.attrs?.spec).toBe('2.3');
	});

	it('converts range with exclusions {{1..10!5}}', () => {
		const markdown = 'Range: {{1..10!5}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const randomNode = findNodeByType(content, 'templateRandom');

		expect(randomNode?.attrs?.spec).toBe('1..10!5');
	});
});

// ============================================================================
// TEMPLATE EVAL TESTS
// ============================================================================

describe('markdownToTipTap - Template Eval', () => {
	it('converts {{eval:a+b}} to templateEval node', () => {
		const markdown = 'Result: {{eval:a+b}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const evalNode = findNodeByType(content, 'templateEval');

		expect(evalNode).toBeDefined();
		expect(evalNode?.attrs?.expression).toBe('a+b');
	});

	it('converts eval with modifiers {{eval:x*y|d}}', () => {
		const markdown = 'Value: {{eval:x*y|d}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const evalNode = findNodeByType(content, 'templateEval');

		expect(evalNode?.attrs?.expression).toBe('x*y|d');
	});

	it('converts complex eval expression with variable references', () => {
		// Note: Nested {{var}} inside eval expressions use simple variable names
		// Complex expressions like {{eval:{{a}}*{{b}}}} would require balanced brace parsing
		const markdown = 'Formula: {{eval:a*b+c|d}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const evalNode = findNodeByType(content, 'templateEval');

		expect(evalNode?.attrs?.expression).toBe('a*b+c|d');
	});
});

// ============================================================================
// BLANK FIELD TESTS
// ============================================================================

describe('markdownToTipTap - Blank Fields', () => {
	it('converts {{blank:1}} to blankField node', () => {
		const markdown = 'Answer: {{blank:1}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const blankNode = findNodeByType(content, 'blankField');

		expect(blankNode).toBeDefined();
		expect(blankNode?.attrs?.index).toBe(1);
	});

	it('converts multiple blanks with different indices', () => {
		const markdown = '{{blank:1}} + {{blank:2}} = {{blank:3}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const blankNodes = content?.filter((n) => n.type === 'blankField');

		expect(blankNodes).toHaveLength(3);
		expect(blankNodes?.[0].attrs?.index).toBe(1);
		expect(blankNodes?.[1].attrs?.index).toBe(2);
		expect(blankNodes?.[2].attrs?.index).toBe(3);
	});
});

// ============================================================================
// MATH INLINE TESTS
// ============================================================================

describe('markdownToTipTap - Math Inline', () => {
	it('converts $latex$ to mathInline with syntax=latex', () => {
		const markdown = 'The formula $x^2$ is quadratic';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const mathNode = findNodeByType(content, 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('latex');
		expect(mathNode?.attrs?.originalExpression).toBe('x^2');
	});

	it('converts ~custom~ to mathInline with syntax=custom and transpiled latex', () => {
		const markdown = 'Calculate ~2/3~';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const mathNode = findNodeByType(content, 'mathInline');

		expect(mathNode).toBeDefined();
		expect(mathNode?.attrs?.syntax).toBe('custom');
		expect(mathNode?.attrs?.originalExpression).toBe('2/3');
		// latex should be transpiled (e.g., \frac{2}{3})
		expect(mathNode?.attrs?.latex).toBeDefined();
	});

	it('preserves LaTeX expression in originalExpression', () => {
		const markdown = 'Integral $\\int_0^1 x dx$';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const mathNode = findNodeByType(content, 'mathInline');

		expect(mathNode?.attrs?.originalExpression).toBe('\\int_0^1 x dx');
	});

	it('handles multiple inline math expressions', () => {
		const markdown = '$a$ plus $b$ equals $c$';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);
		const mathNodes = content?.filter((n) => n.type === 'mathInline');

		expect(mathNodes).toHaveLength(3);
	});
});

// ============================================================================
// MATH BLOCK TESTS
// ============================================================================

describe('markdownToTipTap - Math Block', () => {
	it('converts $$block$$ to mathBlock with syntax=latex', () => {
		const markdown = '$$\\frac{a}{b}$$';
		const result = markdownToTipTap(markdown);

		expect(result.content).toHaveLength(1);
		expect(result.content?.[0].type).toBe('mathBlock');
		expect(result.content?.[0].attrs?.syntax).toBe('latex');
		expect(result.content?.[0].attrs?.originalExpression).toBe('\\frac{a}{b}');
	});

	it('converts ~~block~~ to mathBlock with syntax=custom', () => {
		const markdown = '~~sqrt(16)~~';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('mathBlock');
		expect(result.content?.[0].attrs?.syntax).toBe('custom');
		expect(result.content?.[0].attrs?.originalExpression).toBe('sqrt(16)');
	});

	it('handles multiline block math', () => {
		const markdown = '$$\na^2 + b^2 = c^2\n$$';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('mathBlock');
		expect(result.content?.[0].attrs?.originalExpression).toContain('a^2');
	});

	it('handles text followed by blank line followed by block math', () => {
		const markdown = 'Math LaTeX bloc (seul sur sa ligne) :\n\n$$\\frac{-b}{2a}$$';
		const result = markdownToTipTap(markdown);

		// Should have 2 blocks: paragraph + mathBlock
		expect(result.content).toHaveLength(2);
		expect(result.content?.[0].type).toBe('paragraph');
		expect(result.content?.[1].type).toBe('mathBlock');
		expect(result.content?.[1].attrs?.syntax).toBe('latex');
	});
});

// ============================================================================
// HEADING TESTS
// ============================================================================

describe('markdownToTipTap - Headings', () => {
	it('converts # heading to heading level 1', () => {
		const markdown = '# Main Title';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('heading');
		expect(result.content?.[0].attrs?.level).toBe(1);
		expect(result.content?.[0].content?.[0].text).toBe('Main Title');
	});

	it('converts ## to heading level 2', () => {
		const markdown = '## Section';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].attrs?.level).toBe(2);
	});

	it('converts ###### to heading level 6', () => {
		const markdown = '###### Small heading';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].attrs?.level).toBe(6);
	});

	it('parses inline content in headings', () => {
		const markdown = '# Title with **bold** and $x^2$';
		const result = markdownToTipTap(markdown);

		const headingContent = result.content?.[0].content;
		expect(headingContent?.some((n) => n.marks?.some((m) => m.type === 'bold'))).toBe(true);
		expect(headingContent?.some((n) => n.type === 'mathInline')).toBe(true);
	});
});

// ============================================================================
// LIST TESTS
// ============================================================================

describe('markdownToTipTap - Lists', () => {
	it('converts unordered list with - markers', () => {
		const markdown = '- Item 1\n- Item 2\n- Item 3';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('bulletList');
		expect(result.content?.[0].content).toHaveLength(3);
		expect(result.content?.[0].content?.[0].type).toBe('listItem');
	});

	it('converts ordered list with 1. markers', () => {
		const markdown = '1. First\n2. Second\n3. Third';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('orderedList');
		expect(result.content?.[0].content).toHaveLength(3);
	});

	it('handles nested lists', () => {
		const markdown = '- Parent\n  - Child 1\n  - Child 2\n- Parent 2';
		const result = markdownToTipTap(markdown);

		const firstItem = result.content?.[0].content?.[0];
		expect(firstItem?.type).toBe('listItem');
		// Should contain nested bulletList
		const nestedList = firstItem?.content?.find((n) => n.type === 'bulletList');
		expect(nestedList).toBeDefined();
	});

	it('parses inline content in list items', () => {
		const markdown = '- Item with **bold** and $math$';
		const result = markdownToTipTap(markdown);

		const itemContent = result.content?.[0].content?.[0].content?.[0].content;
		expect(itemContent?.some((n) => n.marks?.some((m) => m.type === 'bold'))).toBe(true);
		expect(itemContent?.some((n) => n.type === 'mathInline')).toBe(true);
	});
});

// ============================================================================
// BLOCKQUOTE TESTS
// ============================================================================

describe('markdownToTipTap - Blockquotes', () => {
	it('converts > quote to blockquote', () => {
		const markdown = '> This is a quote';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('blockquote');
		expect(result.content?.[0].content?.[0].type).toBe('paragraph');
	});

	it('handles multiline blockquotes', () => {
		const markdown = '> Line 1\n> Line 2';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('blockquote');
	});

	it('handles nested blockquotes', () => {
		const markdown = '> Outer\n>> Inner';
		const result = markdownToTipTap(markdown);

		const outer = result.content?.[0];
		expect(outer?.type).toBe('blockquote');
		// Should contain nested blockquote
		const inner = outer?.content?.find((n) => n.type === 'blockquote');
		expect(inner).toBeDefined();
	});
});

// ============================================================================
// CODE BLOCK TESTS
// ============================================================================

describe('markdownToTipTap - Code Blocks', () => {
	it('converts fenced code block with language', () => {
		const markdown = '```javascript\nconst x = 1;\n```';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('codeBlock');
		expect(result.content?.[0].attrs?.language).toBe('javascript');
		expect(result.content?.[0].content?.[0].text).toBe('const x = 1;');
	});

	it('converts code block without language', () => {
		const markdown = '```\nplain code\n```';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('codeBlock');
		expect(result.content?.[0].attrs?.language).toBeUndefined();
	});

	it('preserves math syntax inside code blocks', () => {
		const markdown = '```\n$x^2$ should stay as is\n```';
		const result = markdownToTipTap(markdown);

		// Math should NOT be parsed inside code blocks
		expect(result.content?.[0].content?.[0].text).toContain('$x^2$');
	});
});

// ============================================================================
// HORIZONTAL RULE TESTS
// ============================================================================

describe('markdownToTipTap - Horizontal Rules', () => {
	it('converts --- to horizontalRule', () => {
		const markdown = 'Before\n\n---\n\nAfter';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[1].type).toBe('horizontalRule');
	});

	it('converts *** to horizontalRule', () => {
		const markdown = '***';
		const result = markdownToTipTap(markdown);

		expect(result.content?.[0].type).toBe('horizontalRule');
	});
});

// ============================================================================
// MIXED CONTENT TESTS
// ============================================================================

describe('markdownToTipTap - Mixed Content', () => {
	it('handles paragraph with all inline types mixed', () => {
		const markdown = 'Calculate **{{a}}** times $x^2$ and fill {{blank:1}}';
		const result = markdownToTipTap(markdown);

		const content = getFirstParagraphContent(result);

		// Should have text, bold variable, math, and blank
		expect(content?.some((n) => n.type === 'templateVariable')).toBe(true);
		expect(content?.some((n) => n.type === 'mathInline')).toBe(true);
		expect(content?.some((n) => n.type === 'blankField')).toBe(true);
	});

	it('handles complex document structure', () => {
		const markdown = `# Title

This is a paragraph with **bold** and $math$.

- List item 1
- List item 2

> A blockquote

\`\`\`js
code
\`\`\``;

		const result = markdownToTipTap(markdown);

		const types = result.content?.map((n) => n.type);
		expect(types).toContain('heading');
		expect(types).toContain('paragraph');
		expect(types).toContain('bulletList');
		expect(types).toContain('blockquote');
		expect(types).toContain('codeBlock');
	});
});
