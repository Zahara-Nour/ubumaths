/**
 * Label Parser Utility
 *
 * Parses markdown label strings to InlineNode[] for rendering in shape labels.
 * Supports: text, **bold**, *italic*, `code`, $math$
 *
 * @module whiteboard/utils/label-parser
 */

import { parseMarkdown } from '$lib/ubumark';
import type { InlineNode, ParagraphNode } from '$lib/ubumark';

/**
 * Parse a label markdown string to inline nodes.
 *
 * The label is parsed as markdown, and only the inline content
 * from the first paragraph is extracted. This ensures labels
 * remain inline-only (no block elements).
 *
 * @param labelMarkdown - The markdown string to parse
 * @returns Array of inline nodes for rendering
 *
 * @example
 * // Simple text
 * parseLabelToInline('A') // [{ type: 'text', content: 'A' }]
 *
 * // Math expression
 * parseLabelToInline('$\\alpha$') // [{ type: 'math-inline', expression: '\\alpha', syntax: 'latex' }]
 *
 * // Mixed content
 * parseLabelToInline('Point **A**') // [{ type: 'text', content: 'Point ' }, { type: 'text', content: 'A', bold: true }]
 */
export function parseLabelToInline(labelMarkdown: string): InlineNode[] {
	if (!labelMarkdown.trim()) {
		return [];
	}

	try {
		const doc = parseMarkdown(labelMarkdown);

		// Extract inline nodes from first paragraph
		const firstParagraph = doc.children.find(
			(node): node is ParagraphNode => node.type === 'paragraph'
		);

		return firstParagraph?.children ?? [];
	} catch {
		// Fallback: return as plain text on parse error
		return [{ type: 'text', content: labelMarkdown }];
	}
}

/**
 * Check if a label string contains any content worth rendering.
 *
 * @param labelMarkdown - The markdown string to check
 * @returns true if the label has renderable content
 */
export function hasLabelContent(labelMarkdown: string | undefined): boolean {
	return !!labelMarkdown?.trim();
}
