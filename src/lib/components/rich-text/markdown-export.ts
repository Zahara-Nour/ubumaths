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

		case 'image':
			return convertImageToMarkdown(block);

		case 'video':
			return convertVideoToMarkdown(block);

		case 'table':
			return convertTableToMarkdown(block);

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

	// Use 3 spaces for ordered lists to align with "1. " format
	const indent = '   '.repeat(indentLevel);
	const startNum = (list.attrs?.start as number) || 1;

	const items = list.content.map((item, index) => {
		const itemContent = convertListItemToMarkdown(item, indentLevel);
		return `${indent}${startNum + index}. ${itemContent}`;
	});

	return items.join('\n');
}

/**
 * Convert list item content to Markdown
 *
 * CommonMark rules for blocks in list items:
 * - Blocks (paragraphs, code blocks, math blocks) are separated by BLANK LINES
 * - Continuation content is indented (3 spaces for ordered lists)
 * - Hardbreaks (\) are only for line breaks WITHIN a paragraph
 */
function convertListItemToMarkdown(item: JSONContent, indentLevel: number): string {
	if (!item.content) return '';

	const parts: string[] = [];
	// List continuation indent: base indent + 3 spaces for the marker (e.g., "1. ")
	const continuationIndent = '   '.repeat(indentLevel + 1);
	const blockTypes = ['mathBlock', 'codeBlock', 'bulletList', 'orderedList'];

	for (let i = 0; i < item.content.length; i++) {
		const child = item.content[i];
		const prevChild = i > 0 ? item.content[i - 1] : null;
		const isFirstChild = i === 0;
		const prevIsBlock = prevChild && blockTypes.includes(prevChild.type || '');

		if (child.type === 'paragraph') {
			let paraContent = convertParagraphToMarkdown(child);

			// If paragraph follows a block, add blank line + indent (CommonMark)
			if (prevIsBlock) {
				paraContent = '\n\n' + continuationIndent + paraContent;
			} else if (!isFirstChild) {
				// Paragraph follows another paragraph - add blank line + indent
				paraContent = '\n\n' + continuationIndent + paraContent;
			}

			// If paragraph has hardbreaks (internal line breaks), add continuation indent
			if (paraContent.includes('\\\n')) {
				const lines = paraContent.split('\n');
				const indentedContent = lines
					.map((line, idx) => {
						if (idx === 0) return line; // First line: no extra indent
						// Lines after hardbreak need continuation indent
						// But not if they're already indented (from prevIsBlock case)
						if (line.startsWith(continuationIndent)) return line;
						if (line === '') return line; // Empty line (after trailing \)
						return continuationIndent + line;
					})
					.join('\n');
				parts.push(indentedContent);
			} else {
				parts.push(paraContent);
			}
		} else if (child.type === 'bulletList') {
			// Nested list - blank line before + the list content
			const listContent = convertBulletListToMarkdown(child, indentLevel + 1);
			if (isFirstChild) {
				// List at start of item - just newline for the list items
				parts.push('\n' + listContent);
			} else {
				// List after other content - blank line separator
				parts.push('\n\n' + listContent);
			}
		} else if (child.type === 'orderedList') {
			const listContent = convertOrderedListToMarkdown(child, indentLevel + 1);
			if (isFirstChild) {
				parts.push('\n' + listContent);
			} else {
				parts.push('\n\n' + listContent);
			}
		} else if (child.type === 'mathBlock') {
			// Math block inside list item
			const mathMarkdown = convertMathBlockToMarkdown(child);

			let mathOutput: string;
			if (isFirstChild) {
				// Math block at start of item - blank line then indented math
				mathOutput = '\n' + continuationIndent + mathMarkdown;
			} else {
				// Math block after other content - blank line separator + indent
				mathOutput = '\n\n' + continuationIndent + mathMarkdown;
			}

			parts.push(mathOutput);
		} else if (child.type === 'codeBlock') {
			// Code block inside list item - needs proper indentation for each line
			const codeMarkdown = convertCodeBlockToMarkdown(child);

			// Code blocks are multi-line, need to indent each line
			const codeLines = codeMarkdown.split('\n');
			const indentedCode = codeLines
				.map((line, idx) => {
					if (idx === 0) return continuationIndent + line;
					return continuationIndent + line;
				})
				.join('\n');

			let codeOutput: string;
			if (isFirstChild) {
				// Code block at start of item - blank line then indented code
				codeOutput = '\n' + indentedCode;
			} else {
				// Code block after other content - blank line separator
				codeOutput = '\n\n' + indentedCode;
			}

			parts.push(codeOutput);
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
			// Handle newlines within the paragraph text
			const paraContent = convertParagraphToMarkdown(child);
			const paraLines = paraContent.split('\n');
			lines.push(...paraLines.map((line) => prefix + line));
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

/**
 * Convert table to Markdown (GFM format)
 * TipTap structure: table > tableRow > (tableHeader | tableCell)
 * Preserves column alignment with :---, :---:, ---: syntax
 * Output:
 * | Header1 | Header2 |
 * |:--------|:-------:|
 * | Cell1   | Cell2   |
 */
function convertTableToMarkdown(table: JSONContent): string {
	if (!table.content || table.content.length === 0) return '';

	const rows: string[][] = [];
	const alignments: string[] = [];

	for (const row of table.content) {
		if (row.type !== 'tableRow' || !row.content) continue;

		const cells: string[] = [];
		for (let i = 0; i < row.content.length; i++) {
			const cell = row.content[i];
			// Extract text from cell's paragraph content
			const cellText = extractCellText(cell);
			cells.push(cellText);

			// Extract alignment from first row (header) cells
			if (rows.length === 0) {
				const align = cell.attrs?.textAlign as string | undefined;
				alignments.push(align || 'left');
			}
		}
		rows.push(cells);
	}

	if (rows.length === 0) return '';

	// Build markdown table
	const lines: string[] = [];

	// Header row (first row)
	const headerRow = rows[0];
	lines.push('| ' + headerRow.join(' | ') + ' |');

	// Separator row with alignment indicators
	// Always use explicit markers for proper roundtrip:
	// - left: :--- (explicit left-align)
	// - center: :---:
	// - right: ---:
	const separator = alignments.map((align) => {
		switch (align) {
			case 'center':
				return ':---:';
			case 'right':
				return '---:';
			case 'left':
			default:
				return ':---';
		}
	});
	lines.push('|' + separator.join('|') + '|');

	// Data rows
	for (let i = 1; i < rows.length; i++) {
		lines.push('| ' + rows[i].join(' | ') + ' |');
	}

	return lines.join('\n');
}

/**
 * Extract text content from a table cell
 */
function extractCellText(cell: JSONContent): string {
	if (!cell.content) return '';

	const texts: string[] = [];
	for (const block of cell.content) {
		if (block.type === 'paragraph' && block.content) {
			const paraText = convertInlineNodesToMarkdown(block.content);
			texts.push(paraText);
		}
	}
	return texts.join(' ');
}

/**
 * Convert image to Markdown
 * Supports extended attributes: sizeClass, widthPercent, alignment, caption
 * Also supports linked images with href and linkTitle
 *
 * Output formats:
 * - Standard: ![alt](src "title"){attrs}
 * - Linked: [![alt](src "imgTitle")](href "linkTitle"){attrs}
 */
function convertImageToMarkdown(img: JSONContent): string {
	const src = (img.attrs?.src as string) || '';
	const alt = (img.attrs?.alt as string) || '';
	const title = img.attrs?.title as string | undefined;
	const sizeClass = img.attrs?.sizeClass as string | undefined;
	const widthPercent = img.attrs?.widthPercent as number | undefined;
	const alignment = img.attrs?.alignment as string | undefined;
	const caption = img.attrs?.caption as string | undefined;
	const href = img.attrs?.href as string | undefined;
	const linkTitle = img.attrs?.linkTitle as string | undefined;

	// Build base image markdown: ![alt](src "title")
	const imageMarkdown = title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;

	// If linked, wrap image in link syntax: [![...](...)(...)](href "linkTitle")
	let markdown: string;
	if (href) {
		markdown = linkTitle
			? `[${imageMarkdown}](${href} "${linkTitle}")`
			: `[${imageMarkdown}](${href})`;
	} else {
		markdown = imageMarkdown;
	}

	// Build extended attributes if any
	const attrs: string[] = [];
	if (sizeClass) attrs.push(`size=${sizeClass}`);
	if (widthPercent !== undefined && widthPercent !== null) attrs.push(`width=${widthPercent}%`);
	if (alignment) attrs.push(`align=${alignment}`);
	if (caption) attrs.push(`caption="${caption}"`);

	if (attrs.length > 0) {
		markdown += `{${attrs.join(' ')}}`;
	}

	return markdown;
}

/**
 * Convert video to Markdown
 */
function convertVideoToMarkdown(video: JSONContent): string {
	const src = (video.attrs?.src as string) || '';
	const alt = (video.attrs?.alt as string) || '';
	const sizeClass = video.attrs?.sizeClass as string | undefined;
	const widthPercent = video.attrs?.widthPercent as number | undefined;
	const alignment = video.attrs?.alignment as string | undefined;
	const controls = video.attrs?.controls as boolean;
	const autoplay = video.attrs?.autoplay as boolean;
	const loop = video.attrs?.loop as boolean;
	const muted = video.attrs?.muted as boolean;

	let markdown = `!video[${alt}](${src})`;

	// Build attributes - only include non-default values
	const attrs: string[] = [];
	if (sizeClass) attrs.push(`size=${sizeClass}`);
	if (widthPercent !== undefined && widthPercent !== null) attrs.push(`width=${widthPercent}%`);
	if (alignment) attrs.push(`align=${alignment}`);
	// controls defaults to true, so only output if false
	if (controls === false) attrs.push('controls=false');
	if (autoplay) attrs.push('autoplay');
	if (loop) attrs.push('loop');
	if (muted) attrs.push('muted');

	if (attrs.length > 0) {
		markdown += `{${attrs.join(' ')}}`;
	}

	return markdown;
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
			return `{{blank:${node.attrs?.number || 1}}}`;

		case 'hardBreak':
			return '\\\n';

		case 'hashtag':
			return `#${node.attrs?.tag || ''}`;

		case 'mention':
			return `@${node.attrs?.username || ''}`;

		default:
			return '';
	}
}

/**
 * Convert text node with marks to Markdown
 *
 * Handles marks in order: code > bold > italic > link
 * Link mark wraps the entire formatted text.
 */
function convertTextNodeToMarkdown(node: JSONContent): string {
	const text = node.text || '';
	if (!node.marks || node.marks.length === 0) {
		return text;
	}

	let result = text;

	// Check for marks and apply in order: code > bold > italic > link
	const hasBold = node.marks.some((m) => m.type === 'bold');
	const hasItalic = node.marks.some((m) => m.type === 'italic');
	const hasCode = node.marks.some((m) => m.type === 'code');
	const linkMark = node.marks.find((m) => m.type === 'link');

	// Code takes precedence (can't have formatting inside code)
	if (hasCode) {
		result = `\`${text}\``;
	} else {
		// Apply bold then italic
		if (hasBold) {
			result = `**${result}**`;
		}
		if (hasItalic) {
			result = `*${result}*`;
		}
	}

	// Link wraps the entire formatted text
	if (linkMark) {
		const href = linkMark.attrs?.href as string;
		const title = linkMark.attrs?.title as string | undefined;

		if (title) {
			result = `[${result}](${href} "${title}")`;
		} else {
			result = `[${result}](${href})`;
		}
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
