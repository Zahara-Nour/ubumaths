/**
 * Tests for Markdown Detection Utility
 */

import { describe, it, expect } from 'vitest';
import {
	containsMarkdownSyntax,
	isHtmlContent,
	calculateMarkdownScore,
	getDetectedPatterns
} from './markdown-detection';

describe('containsMarkdownSyntax', () => {
	describe('returns true for Markdown content', () => {
		it('detects headings', () => {
			expect(containsMarkdownSyntax('# Title')).toBe(true);
			expect(containsMarkdownSyntax('## Subtitle')).toBe(true);
			expect(containsMarkdownSyntax('### Section')).toBe(true);
		});

		it('detects bold text', () => {
			expect(containsMarkdownSyntax('Hello **world**')).toBe(true);
			expect(containsMarkdownSyntax('Hello __world__')).toBe(true);
		});

		it('detects italic text', () => {
			expect(containsMarkdownSyntax('Hello *world*')).toBe(true);
		});

		it('detects inline code', () => {
			expect(containsMarkdownSyntax('Use `const` for constants')).toBe(true);
		});

		it('detects code blocks', () => {
			expect(containsMarkdownSyntax('```js\nconst x = 1;\n```')).toBe(true);
		});

		it('detects unordered lists', () => {
			expect(containsMarkdownSyntax('- First item\n- Second item')).toBe(true);
			expect(containsMarkdownSyntax('* First item\n* Second item')).toBe(true);
		});

		it('detects ordered lists', () => {
			expect(containsMarkdownSyntax('1. First item\n2. Second item')).toBe(true);
		});

		it('detects blockquotes', () => {
			expect(containsMarkdownSyntax('> This is a quote')).toBe(true);
		});

		it('detects links', () => {
			expect(containsMarkdownSyntax('Visit [Google](https://google.com)')).toBe(true);
		});

		it('detects images', () => {
			expect(containsMarkdownSyntax('![Alt text](image.png)')).toBe(true);
		});

		it('detects math inline (LaTeX)', () => {
			expect(containsMarkdownSyntax('The formula is $x^2 + y^2 = r^2$')).toBe(true);
		});

		it('detects math inline (custom)', () => {
			expect(containsMarkdownSyntax('Calculate ~2/3 + 1/4~')).toBe(true);
		});

		it('detects math blocks', () => {
			expect(containsMarkdownSyntax('$$\\frac{a}{b}$$')).toBe(true);
			expect(containsMarkdownSyntax('~~(a+b)^2~~')).toBe(true);
		});

		it('detects template variables', () => {
			expect(containsMarkdownSyntax('Hello {{name}}')).toBe(true);
			expect(containsMarkdownSyntax('Value: {{1..10}}')).toBe(true);
			expect(containsMarkdownSyntax('Result: {{eval:a+b}}')).toBe(true);
		});

		it('detects tables', () => {
			const table = '| Name | Age |\n|------|-----|\n| John | 30 |';
			expect(containsMarkdownSyntax(table)).toBe(true);
		});

		it('detects complex Markdown documents', () => {
			const doc = `# Title

This is a **bold** statement with *italic* words.

## Features

- Item one
- Item two with \`code\`

> A wise quote

\`\`\`javascript
const x = 1;
\`\`\`
`;
			expect(containsMarkdownSyntax(doc)).toBe(true);
		});
	});

	describe('returns false for non-Markdown content', () => {
		it('rejects plain text', () => {
			expect(containsMarkdownSyntax('Hello world')).toBe(false);
			expect(containsMarkdownSyntax('This is just regular text')).toBe(false);
		});

		it('rejects empty text', () => {
			expect(containsMarkdownSyntax('')).toBe(false);
		});

		it('rejects very short text', () => {
			expect(containsMarkdownSyntax('Hi')).toBe(false);
		});

		it('rejects HTML content', () => {
			expect(containsMarkdownSyntax('<p>Hello world</p>')).toBe(false);
			expect(containsMarkdownSyntax('<div>Content</div>')).toBe(false);
			expect(containsMarkdownSyntax('<span>Text</span>')).toBe(false);
		});

		it('rejects text that accidentally looks like single patterns', () => {
			// Single asterisk (not bold/italic)
			expect(containsMarkdownSyntax('5 * 3 = 15')).toBe(false);
			// Hash in middle of text (not heading)
			expect(containsMarkdownSyntax('Issue #123')).toBe(false);
		});
	});
});

describe('isHtmlContent', () => {
	it('returns true for HTML with tags', () => {
		expect(isHtmlContent('<p>Hello</p>')).toBe(true);
		expect(isHtmlContent('<div class="test">Content</div>')).toBe(true);
		expect(isHtmlContent('<span>Text</span>')).toBe(true);
		expect(isHtmlContent('<br />')).toBe(true);
		expect(isHtmlContent('<br>')).toBe(true);
	});

	it('returns true for DOCTYPE', () => {
		expect(isHtmlContent('<!DOCTYPE html><html>...')).toBe(true);
	});

	it('returns false for plain text', () => {
		expect(isHtmlContent('Hello world')).toBe(false);
		expect(isHtmlContent('No tags here')).toBe(false);
	});

	it('returns false for Markdown', () => {
		expect(isHtmlContent('# Title')).toBe(false);
		expect(isHtmlContent('**bold**')).toBe(false);
	});
});

describe('calculateMarkdownScore', () => {
	it('returns 0 for plain text', () => {
		expect(calculateMarkdownScore('Hello world')).toBe(0);
	});

	it('returns positive score for Markdown', () => {
		expect(calculateMarkdownScore('# Title')).toBeGreaterThan(0);
		expect(calculateMarkdownScore('**bold**')).toBeGreaterThan(0);
	});

	it('returns higher score for more patterns', () => {
		const simple = '**bold**';
		const complex = '# Title\n\n**bold** and *italic*\n\n- list item';
		expect(calculateMarkdownScore(complex)).toBeGreaterThan(calculateMarkdownScore(simple));
	});
});

describe('getDetectedPatterns', () => {
	it('returns empty array for plain text', () => {
		expect(getDetectedPatterns('Hello world')).toEqual([]);
	});

	it('returns detected pattern names', () => {
		const patterns = getDetectedPatterns('# Title\n\n**bold**');
		expect(patterns).toContain('heading');
		expect(patterns).toContain('bold (**)');
	});

	it('returns multiple patterns for complex Markdown', () => {
		const doc = '# Title\n\n- List item\n\n`code`';
		const patterns = getDetectedPatterns(doc);
		expect(patterns.length).toBeGreaterThan(2);
	});
});
