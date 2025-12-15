/**
 * Markdown Paste Extension for TipTap
 * ====================================
 *
 * A TipTap extension that intercepts paste events and converts
 * Markdown content to rich text format before inserting.
 *
 * Features:
 * - Detects Markdown patterns in pasted plain text
 * - Converts Markdown to TipTap JSON using markdownToTipTap()
 * - Preserves native HTML paste behavior (from rich text copies)
 * - Supports all Ubumaths Markdown features (math, templates, etc.)
 *
 * @module rich-text/markdown-paste-extension
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { containsMarkdownSyntax } from './markdown-detection';
import { markdownToTipTap } from './markdown-import';

/**
 * Check if HTML content is a trivial wrapper that should be ignored
 * in favor of Markdown processing.
 *
 * Many applications (VSCode, browsers, etc.) add trivial HTML wrappers
 * when copying plain text. We want to detect these and prefer the
 * plain text Markdown processing instead.
 *
 * Examples of trivial HTML:
 * - <pre>text</pre>
 * - <span>text</span>
 * - <div>text</div>
 * - <meta charset="...">text (from browsers)
 *
 * Examples of rich HTML (should NOT be ignored):
 * - <p><strong>bold</strong> text</p>
 * - Content from Google Docs, Word, etc.
 */
export function isTrivialHtmlWrapper(html: string): boolean {
	// Normalize whitespace for comparison
	const trimmed = html.trim();

	// Empty HTML is trivial
	if (!trimmed) return true;

	// Very short HTML without meaningful tags is trivial
	if (trimmed.length < 20 && !/<[a-z]/i.test(trimmed)) return true;

	// FIRST: Check if the HTML contains rich formatting tags ANYWHERE in the content
	// If it does, it's NOT trivial - this takes priority
	const richFormattingPatterns = [
		// Inline formatting tags (can appear anywhere in the string)
		/<(strong|b|em|i|u|s|strike|del|mark|sub|sup)\b/i,
		// Links (careful: <a> needs to be followed by space/attribute to avoid false positives)
		/<a\s/i,
		// Block-level formatting tags
		/<(h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|td|th)\b/i,
		// Media elements
		/<(img|video|audio|iframe|figure|figcaption)\b/i,
		// Styled elements (anywhere in string)
		/<[^>]+\sstyle\s*=/i, // Elements with style attribute
		/<[^>]+\sclass\s*=/i // Elements with class attribute
	];

	for (const pattern of richFormattingPatterns) {
		if (pattern.test(trimmed)) {
			// Has rich formatting, NOT trivial
			return false;
		}
	}

	// SECOND: Check for common trivial wrapper patterns
	// These are often added by code editors when copying
	const trivialPatterns = [
		// Simple single-element wrappers with plain text content
		/^<(pre|code|span|div|p)>\s*[\s\S]*?\s*<\/\1>$/i,
		// HTML that's just meta tags and plain text
		/^(<meta[^>]*>|\s)*[^<]+$/i,
		// HTML starting with meta charset and containing simple text
		/^<meta\s+charset=['"][^'"]+['"][^>]*>\s*[^<]*$/i
	];

	for (const pattern of trivialPatterns) {
		if (pattern.test(trimmed)) {
			return true;
		}
	}

	// If we get here, the HTML doesn't have rich formatting
	// Check if it's mostly just text wrapped in simple tags
	const textContent = trimmed.replace(/<[^>]+>/g, '').trim();
	const tagCount = (trimmed.match(/<[^>]+>/g) || []).length;

	// If there are very few tags compared to content length, likely trivial
	if (tagCount <= 4 && textContent.length > 20) {
		return true;
	}

	return false;
}

/**
 * Normalize Markdown indentation by removing common leading whitespace
 * from all lines. This handles cases where text is copied with extra
 * indentation that would break Markdown parsing.
 *
 * Example:
 *   "  # Title\n  - Item 1\n  - Item 2"
 * becomes:
 *   "# Title\n- Item 1\n- Item 2"
 */
export function normalizeMarkdownIndentation(text: string): string {
	const lines = text.split('\n');

	// Find the minimum indentation (ignoring empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim().length === 0) continue; // Skip empty lines
		const match = line.match(/^(\s*)/);
		if (match) {
			minIndent = Math.min(minIndent, match[1].length);
		}
	}

	// If no indentation found or it's 0, return as-is
	if (minIndent === Infinity || minIndent === 0) {
		return text;
	}

	// Remove the common indentation from all lines
	return lines.map((line) => line.slice(minIndent)).join('\n');
}

/**
 * Plugin key for the markdown paste handler
 */
const markdownPastePluginKey = new PluginKey('markdownPaste');

/**
 * Configuration options for the MarkdownPaste extension
 */
export interface MarkdownPasteOptions {
	/**
	 * Whether the extension is enabled
	 * @default true
	 */
	enabled: boolean;
}

/**
 * MarkdownPaste Extension
 *
 * Intercepts paste events and converts Markdown content to rich text.
 * Uses TipTap's insertContent API for reliable JSON-to-node conversion.
 *
 * @example
 * ```typescript
 * import { MarkdownPaste } from './markdown-paste-extension';
 *
 * const editor = new Editor({
 *   extensions: [
 *     // ... other extensions
 *     MarkdownPaste.configure({ enabled: true }),
 *   ],
 * });
 * ```
 */
export const MarkdownPaste = Extension.create<MarkdownPasteOptions>({
	name: 'markdownPaste',

	addOptions() {
		return {
			enabled: true
		};
	},

	addProseMirrorPlugins() {
		const { enabled } = this.options;
		// Store reference to TipTap editor for insertContent
		const editor = this.editor;

		if (!enabled) {
			return [];
		}

		return [
			new Plugin({
				key: markdownPastePluginKey,

				props: {
					handlePaste: (_view, event) => {
						// Only process paste events with clipboard data
						const clipboardData = event.clipboardData;
						if (!clipboardData) {
							return false;
						}

						// Get plain text content
						const plainText = clipboardData.getData('text/plain');

						// If no plain text, nothing to do
						if (!plainText || plainText.trim().length === 0) {
							return false;
						}

						// Check if the plain text contains Markdown syntax
						if (!containsMarkdownSyntax(plainText)) {
							return false;
						}

						// Normalize Markdown: remove common leading whitespace from all lines
						// This handles cases where text is copied with extra indentation
						// while preserving relative indentation for nested lists
						const normalizedText = normalizeMarkdownIndentation(plainText);

						// Convert Markdown to TipTap JSON
						const json = markdownToTipTap(normalizedText);

						// Only process if we got valid content
						if (!json.content || json.content.length === 0) {
							return false;
						}

						// Prevent default paste behavior
						event.preventDefault();

						// Use TipTap's insertContent which handles JSON conversion properly
						// This ensures all node types (lists, math, templates) are created correctly
						editor.commands.insertContent(json.content);

						return true;
					}
				}
			})
		];
	}
});

export default MarkdownPaste;
