/**
 * Markdown Paste Extension Tests
 * ==============================
 *
 * Tests for the Markdown paste extension, specifically the
 * trivial HTML wrapper detection logic.
 *
 * @module rich-text/__tests__/markdown-paste.test
 */

import { describe, it, expect } from 'vitest';
import { isTrivialHtmlWrapper } from '../markdown-paste-extension';

// ============================================================================
// TRIVIAL HTML WRAPPER DETECTION TESTS
// ============================================================================

describe('isTrivialHtmlWrapper', () => {
	describe('should return true for trivial wrappers', () => {
		it('handles empty HTML', () => {
			expect(isTrivialHtmlWrapper('')).toBe(true);
			expect(isTrivialHtmlWrapper('   ')).toBe(true);
		});

		it('handles simple <pre> wrapper from code editors', () => {
			const html = '<pre># Titre\n\nTexte avec **gras**</pre>';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles simple <code> wrapper', () => {
			const html = '<code>const x = 1;</code>';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles simple <span> wrapper', () => {
			const html = '<span>Some text content here</span>';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles simple <div> wrapper', () => {
			const html = '<div>Some text content here</div>';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles simple <p> wrapper', () => {
			const html = '<p>Simple paragraph text</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles meta charset from browsers', () => {
			const html = '<meta charset="utf-8">Some plain text';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles plain text without tags', () => {
			const html = 'Just plain text';
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});

		it('handles pre with multiline markdown content', () => {
			const html = `<pre># Title

- Item 1
- Item 2

Math: $x^2$</pre>`;
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});
	});

	describe('should return false for rich HTML', () => {
		it('detects <strong> formatting', () => {
			const html = '<p>Text with <strong>bold</strong> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects <b> formatting', () => {
			const html = '<p>Text with <b>bold</b> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects <em> formatting', () => {
			const html = '<p>Text with <em>italic</em> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects <i> formatting', () => {
			const html = '<p>Text with <i>italic</i> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects <u> formatting', () => {
			const html = '<p>Text with <u>underlined</u> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects <s> strikethrough', () => {
			const html = '<p>Text with <s>strikethrough</s> content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects links', () => {
			const html = '<p>Click <a href="https://example.com">here</a></p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects headings', () => {
			const html = '<h1>Title</h1><p>Content</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects lists', () => {
			const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects ordered lists', () => {
			const html = '<ol><li>First</li><li>Second</li></ol>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects blockquotes', () => {
			const html = '<blockquote>Quote text</blockquote>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects tables', () => {
			const html = '<table><tr><td>Cell</td></tr></table>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects images', () => {
			const html = '<p>Image: <img src="test.png" /></p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects styled spans', () => {
			const html = '<span style="color: red">Red text</span>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects elements with classes', () => {
			const html = '<p class="formatted">Formatted text</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects subscript', () => {
			const html = '<p>H<sub>2</sub>O</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects superscript', () => {
			const html = '<p>x<sup>2</sup></p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('detects mark (highlight)', () => {
			const html = '<p>This is <mark>highlighted</mark> text</p>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles Google Docs style HTML', () => {
			// Google Docs typically outputs complex HTML with spans and classes
			const html =
				'<span class="c1">Text</span><span class="c2" style="font-weight: bold">Bold</span>';
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('handles VSCode HTML output for plain text', () => {
			// VSCode typically wraps in simple div or pre
			const html =
				'<div style="color: #d4d4d4;background-color: #1e1e1e;font-family: Consolas, monospace">plain text</div>';
			// Has style attribute but no rich formatting tags
			// This is borderline - but since it has styling, it's not purely trivial
			// However, the content itself is plain, so our heuristic should handle it
			// For now, we consider styled divs as potentially rich
			expect(isTrivialHtmlWrapper(html)).toBe(false);
		});

		it('handles nested simple tags', () => {
			// Multiple simple tags without formatting
			const html = '<div><p>Text here</p></div>';
			// Has multiple tags but no rich formatting - could be trivial
			// Our current logic checks for tag count vs content length
			expect(isTrivialHtmlWrapper(html)).toBe(true);
		});
	});
});
