/**
 * TipTap JSON to Markdown Converter
 * ==================================
 *
 * Converts TipTap JSON format back to Markdown text.
 * Preserves original math syntax (LaTeX vs custom) for round-trip compatibility.
 *
 * @module rich-text/markdown-export
 */

import type { JSONContent } from '@tiptap/core';

// ============================================================================
// MAIN CONVERTER
// ============================================================================

/**
 * Convert TipTap JSON document to Markdown text
 *
 * @param json - TipTap JSON document
 * @returns Markdown text
 *
 * @example
 * const markdown = tipTapToMarkdown(json);
 * // Returns: 'Hello **world** with $x^2$'
 */
export function tipTapToMarkdown(json: JSONContent): string {
	if (json.type !== 'doc' || !json.content) {
		return '';
	}

	const blocks = json.content
		.map((block) => convertBlockToMarkdown(block))
		.filter((text) => text !== null);

	return blocks.join('\n\n');
}

// ============================================================================
// BLOCK CONVERSION
// ============================================================================

/**
 * Convert a block node to Markdown
 */
function convertBlockToMarkdown(block: JSONContent, indentLevel = 0): string | null {
	switch (block.type) {
		case 'paragraph':
			return convertParagraphToMarkdown(block);

		case 'heading':
			return convertHeadingToMarkdown(block);

		case 'bulletList':
			return convertBulletListToMarkdown(block, indentLevel);

		case 'orderedList':
			return convertOrderedListToMarkdown(block, indentLevel);

		case 'blockquote':
			return convertBlockquoteToMarkdown(block);

		case 'codeBlock':
			return convertCodeBlockToMarkdown(block);

		case 'mathBlock':
			return convertMathBlockToMarkdown(block);

		case 'horizontalRule':
			return '---';

		default:
			return null;
	}
}

/**
 * Convert paragraph to Markdown
 */
function convertParagraphToMarkdown(para: JSONContent): string {
	if (!para.content) return '';
	return convertInlineNodesToMarkdown(para.content);
}

/**
 * Convert heading to Markdown
 */
function convertHeadingToMarkdown(heading: JSONContent): string {
	const level = (heading.attrs?.level as number) || 1;
	const prefix = '#'.repeat(level);
	const content = heading.content ? convertInlineNodesToMarkdown(heading.content) : '';
	return `${prefix} ${content}`;
}

/**
 * Convert bullet list to Markdown
 */
function convertBulletListToMarkdown(list: JSONContent, indentLevel = 0): string {
	if (!list.content) return '';

	const indent = '  '.repeat(indentLevel);
	const items = list.content.map((item) => {
		const itemContent = convertListItemToMarkdown(item, indentLevel);
		return `${indent}- ${itemContent}`;
	});

	return items.join('\n');
}

/**
 * Convert ordered list to Markdown
 */
function convertOrderedListToMarkdown(list: JSONContent, indentLevel = 0): string {
	if (!list.content) return '';

	const indent = '  '.repeat(indentLevel);
	const startNum = (list.attrs?.start as number) || 1;

	const items = list.content.map((item, index) => {
		const itemContent = convertListItemToMarkdown(item, indentLevel);
		return `${indent}${startNum + index}. ${itemContent}`;
	});

	return items.join('\n');
}

/**
 * Convert list item content to Markdown
 */
function convertListItemToMarkdown(item: JSONContent, indentLevel: number): string {
	if (!item.content) return '';

	const parts: string[] = [];

	for (const child of item.content) {
		if (child.type === 'paragraph') {
			parts.push(convertParagraphToMarkdown(child));
		} else if (child.type === 'bulletList') {
			// Nested list - add newline and indent
			parts.push('\n' + convertBulletListToMarkdown(child, indentLevel + 1));
		} else if (child.type === 'orderedList') {
			parts.push('\n' + convertOrderedListToMarkdown(child, indentLevel + 1));
		}
	}

	return parts.join('');
}

/**
 * Convert blockquote to Markdown
 */
function convertBlockquoteToMarkdown(quote: JSONContent, level = 1): string {
	if (!quote.content) return '';

	const prefix = '> '.repeat(level);
	const lines: string[] = [];

	for (const child of quote.content) {
		if (child.type === 'paragraph') {
			lines.push(prefix + convertParagraphToMarkdown(child));
		} else if (child.type === 'blockquote') {
			// Nested blockquote
			lines.push(convertBlockquoteToMarkdown(child, level + 1));
		} else {
			// Other block types in blockquotes
			const content = convertBlockToMarkdown(child);
			if (content) {
				lines.push(
					content
						.split('\n')
						.map((line) => prefix + line)
						.join('\n')
				);
			}
		}
	}

	return lines.join('\n');
}

/**
 * Convert code block to Markdown
 */
function convertCodeBlockToMarkdown(code: JSONContent): string {
	const language = (code.attrs?.language as string) || '';
	const content = code.content?.[0]?.text || '';
	return `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Convert math block to Markdown
 */
function convertMathBlockToMarkdown(math: JSONContent): string {
	const syntax = (math.attrs?.syntax as string) || 'latex';
	const originalExpression = math.attrs?.originalExpression as string | undefined;
	const latex = math.attrs?.latex as string;

	// Use original expression if available, otherwise fall back to latex
	const expression = originalExpression || latex || '';

	// Use appropriate delimiters based on syntax
	if (syntax === 'custom') {
		return `~~${expression}~~`;
	} else {
		return `$$${expression}$$`;
	}
}

// ============================================================================
// INLINE CONVERSION
// ============================================================================

/**
 * Convert array of inline nodes to Markdown
 */
function convertInlineNodesToMarkdown(nodes: JSONContent[]): string {
	return nodes.map((node) => convertInlineNodeToMarkdown(node)).join('');
}

/**
 * Convert a single inline node to Markdown
 */
function convertInlineNodeToMarkdown(node: JSONContent): string {
	switch (node.type) {
		case 'text':
			return convertTextNodeToMarkdown(node);

		case 'mathInline':
			return convertMathInlineToMarkdown(node);

		case 'templateVariable':
			return `{{${node.attrs?.name || ''}}}`;

		case 'templateRandom':
			return `{{${node.attrs?.spec || ''}}}`;

		case 'templateEval':
			return `{{eval:${node.attrs?.expression || ''}}}`;

		case 'blankField':
			return `{{blank:${node.attrs?.index || 1}}}`;

		case 'hardBreak':
			return '\n';

		default:
			return '';
	}
}

/**
 * Convert text node with marks to Markdown
 */
function convertTextNodeToMarkdown(node: JSONContent): string {
	const text = node.text || '';
	if (!node.marks || node.marks.length === 0) {
		return text;
	}

	let result = text;

	// Check for marks and apply in order: code > bold > italic
	const hasBold = node.marks.some((m) => m.type === 'bold');
	const hasItalic = node.marks.some((m) => m.type === 'italic');
	const hasCode = node.marks.some((m) => m.type === 'code');

	// Code takes precedence (can't have formatting inside code)
	if (hasCode) {
		return `\`${text}\``;
	}

	// Apply bold then italic
	if (hasBold) {
		result = `**${result}**`;
	}
	if (hasItalic) {
		result = `*${result}*`;
	}

	return result;
}

/**
 * Convert math inline to Markdown
 * Preserves original syntax (LaTeX $ vs custom ~)
 */
function convertMathInlineToMarkdown(node: JSONContent): string {
	const syntax = (node.attrs?.syntax as string) || 'latex';
	const originalExpression = node.attrs?.originalExpression as string | undefined;
	const latex = node.attrs?.latex as string;

	// Use original expression if available, otherwise fall back to latex
	const expression = originalExpression || latex || '';

	// Use appropriate delimiters based on syntax
	if (syntax === 'custom') {
		return `~${expression}~`;
	} else {
		return `$${expression}$`;
	}
}
