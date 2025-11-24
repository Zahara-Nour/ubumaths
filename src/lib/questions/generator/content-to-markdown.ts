/**
 * ContentField to Markdown Conversion
 * ====================================
 *
 * Converts ContentField[] (legacy Questions format) to unified markdown string.
 * This enables using the new MarkdownRenderer for question display.
 *
 * @module questions/generator/content-to-markdown
 */

import type { ContentField } from '../types';

/**
 * Convert a single ContentField to markdown string
 *
 * @param field - The content field to convert
 * @returns Markdown string representation
 *
 * @example Text field
 * ```typescript
 * contentFieldToMarkdown({ type: 'text', content: 'Calculate $$2+3$$' })
 * // => 'Calculate $$2+3$$'
 * ```
 *
 * @example Image field
 * ```typescript
 * contentFieldToMarkdown({ type: 'image', content: '/img/triangle.png', alt: 'A triangle' })
 * // => '![A triangle](/img/triangle.png)'
 * ```
 */
export function contentFieldToMarkdown(field: ContentField): string {
	if (field.type === 'text') {
		return field.content;
	} else if (field.type === 'image') {
		const alt = field.alt || '';
		return `![${alt}](${field.content})`;
	}
	return '';
}

/**
 * Convert an array of ContentFields to a unified markdown string
 *
 * Multiple fields are joined with double newlines (paragraph breaks).
 * Empty fields are filtered out.
 *
 * @param fields - Array of content fields to convert
 * @returns Unified markdown string
 *
 * @example Mixed content
 * ```typescript
 * contentFieldsToMarkdown([
 *   { type: 'text', content: 'Look at the image below:' },
 *   { type: 'image', content: '/img/graph.png', alt: 'A graph' },
 *   { type: 'text', content: 'What is the value of $$x$$?' }
 * ])
 * // => 'Look at the image below:\n\n![A graph](/img/graph.png)\n\nWhat is the value of $$x$$?'
 * ```
 *
 * @example Single text field (most common case)
 * ```typescript
 * contentFieldsToMarkdown([{ type: 'text', content: 'Calculate $$3 \\times 4$$' }])
 * // => 'Calculate $$3 \\times 4$$'
 * ```
 */
export function contentFieldsToMarkdown(fields: ContentField[]): string {
	if (!fields || fields.length === 0) {
		return '';
	}

	return fields
		.map(contentFieldToMarkdown)
		.filter((s) => s.length > 0)
		.join('\n\n');
}

/**
 * Convert choices array to markdown (for multiple choice questions)
 *
 * Each choice's content fields are converted and joined.
 *
 * NOTE: Reserved for Phase 4 - choices rendering via MarkdownRenderer.
 * Currently choices are rendered using ContentField[] directly in MultipleChoiceInput.
 *
 * @param choices - Array of choice objects with content fields
 * @returns Array of markdown strings for each choice
 *
 * @example
 * ```typescript
 * choicesToMarkdown([
 *   { content: [{ type: 'text', content: '$$x = 5$$' }], isCorrect: true },
 *   { content: [{ type: 'text', content: '$$x = 3$$' }], isCorrect: false }
 * ])
 * // => ['$$x = 5$$', '$$x = 3$$']
 * ```
 */
export function choicesToMarkdown(
	choices: { content: ContentField[]; isCorrect?: boolean; originalIndex?: number }[]
): string[] {
	return choices.map((choice) => contentFieldsToMarkdown(choice.content));
}
