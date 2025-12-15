/**
 * Markdown to TipTap JSON Converter
 * ==================================
 *
 * Converts Markdown text to TipTap JSON format using the existing
 * custom-markdown parser. Handles all supported block and inline types.
 *
 * @module rich-text/markdown-import
 */

import type { JSONContent } from '@tiptap/core';
import { parseMarkdown } from '$lib/custom-markdown/parser/markdown-parser';
import { parseCustomSafe, toLatex } from '$lib/mathAST';
import type {
	DocumentNode,
	BlockNode,
	InlineNode,
	ParagraphNode,
	HeadingNode,
	ListNode,
	ListItemNode,
	BlockquoteNode,
	CodeBlockNode,
	MathBlockNode,
	TextNode,
	MathInlineNode,
	BlankNode,
	ImageNode,
	VideoNode,
	TableNode,
	LinkNode,
	HashtagNode,
	MentionNode
} from '$lib/custom-markdown/types';

// ============================================================================
// TEMPLATE DETECTION REGEX (same as template-extensions.ts)
// ============================================================================

/**
 * Regex patterns for detecting template syntax in text
 */
const TEMPLATE_PATTERNS = {
	// Variable: {{varName}} - letters/underscores only, NOT random/eval/blank
	variable: /^\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}$/,

	// Random: {{1..10}}, {{random:...}}, {{a|b|c}}, {{2.3}}
	random:
		/^\{\{((?:random:)?(?:\d+(?:\.\d+)?\.{2}\d+(?:\.\d+)?(?::\d+(?:\.\d+)?)?(?:![^}]+)?(?:;[+-]+)?|\d+\.\d+|[^}|]+(?:\|[^}|]+)+))\}\}$/,

	// Eval: {{eval:expression}}
	eval: /^\{\{eval:([^}]+)\}\}$/,

	// Blank: {{blank:N}}
	blank: /^\{\{blank:(\d+)\}\}$/
};

/**
 * Classify a potential template string
 * Returns the type and extracted content, or null if not a template
 */
function classifyTemplate(
	text: string
): { type: 'variable' | 'random' | 'eval' | 'blank'; value: string } | null {
	// Check blank first (most specific)
	const blankMatch = text.match(TEMPLATE_PATTERNS.blank);
	if (blankMatch) {
		return { type: 'blank', value: blankMatch[1] };
	}

	// Check eval
	const evalMatch = text.match(TEMPLATE_PATTERNS.eval);
	if (evalMatch) {
		return { type: 'eval', value: evalMatch[1] };
	}

	// Check variable (must be just letters/underscores)
	const varMatch = text.match(TEMPLATE_PATTERNS.variable);
	if (varMatch) {
		return { type: 'variable', value: varMatch[1] };
	}

	// Check random (includes ranges, discrete lists, decimal digits)
	const randomMatch = text.match(TEMPLATE_PATTERNS.random);
	if (randomMatch) {
		return { type: 'random', value: randomMatch[1] };
	}

	return null;
}

// ============================================================================
// MAIN CONVERTER
// ============================================================================

/**
 * Convert Markdown text to TipTap JSON format
 *
 * Uses the existing markdown parser to create an AST, then converts
 * that AST to TipTap's JSON structure.
 *
 * @param markdown - Markdown text to convert
 * @returns TipTap JSON document
 *
 * @example
 * const json = markdownToTipTap('Hello **world** with $x^2$');
 * // Returns: { type: 'doc', content: [...] }
 */
export function markdownToTipTap(markdown: string): JSONContent {
	if (!markdown || markdown.trim() === '') {
		return { type: 'doc', content: [] };
	}

	// Parse markdown to AST using existing parser
	const ast = parseMarkdown(markdown);

	// Convert AST to TipTap JSON
	return convertDocument(ast);
}

// ============================================================================
// DOCUMENT CONVERSION
// ============================================================================

/**
 * Convert DocumentNode to TipTap doc
 */
function convertDocument(doc: DocumentNode): JSONContent {
	const content = doc.children
		.map((block) => convertBlock(block))
		.filter((node): node is JSONContent => node !== null);

	return {
		type: 'doc',
		content
	};
}

// ============================================================================
// BLOCK CONVERSION
// ============================================================================

/**
 * Convert a block node to TipTap JSON
 */
function convertBlock(block: BlockNode): JSONContent | null {
	switch (block.type) {
		case 'paragraph':
			return convertParagraph(block);

		case 'heading':
			return convertHeading(block);

		case 'list':
			return convertList(block);

		case 'blockquote':
			return convertBlockquote(block);

		case 'code-block':
			return convertCodeBlock(block);

		case 'math-block':
			return convertMathBlock(block);

		case 'horizontal-rule':
			return { type: 'horizontalRule' };

		case 'image':
			return convertImage(block as ImageNode);

		case 'video':
			return convertVideo(block as VideoNode);

		case 'table':
			return convertTable(block as TableNode);

		default:
			return null;
	}
}

/**
 * Convert ParagraphNode to TipTap paragraph
 */
function convertParagraph(para: ParagraphNode): JSONContent | null {
	const content = convertInlineNodes(para.children);

	// Skip empty paragraphs
	if (content.length === 0) {
		return null;
	}

	return {
		type: 'paragraph',
		content
	};
}

/**
 * Convert HeadingNode to TipTap heading
 */
function convertHeading(heading: HeadingNode): JSONContent {
	const content = convertInlineNodes(heading.children);

	return {
		type: 'heading',
		attrs: { level: heading.level },
		content
	};
}

/**
 * Convert ListNode to TipTap bulletList or orderedList
 */
function convertList(list: ListNode): JSONContent {
	const type = list.ordered ? 'orderedList' : 'bulletList';

	const content = list.items.map((item) => convertListItem(item));

	const result: JSONContent = {
		type,
		content
	};

	// Add start attribute for ordered lists that don't start at 1
	if (list.ordered && list.start && list.start !== 1) {
		result.attrs = { start: list.start };
	}

	return result;
}

/**
 * Convert ListItemNode to TipTap listItem
 */
function convertListItem(item: ListItemNode): JSONContent {
	const content: JSONContent[] = [];

	for (const child of item.children) {
		if (child.type === 'paragraph') {
			const para = convertParagraph(child);
			if (para) content.push(para);
		} else if (child.type === 'list') {
			content.push(convertList(child));
		} else if (child.type === 'code-block') {
			const code = convertCodeBlock(child);
			if (code) content.push(code);
		} else if (child.type === 'math-block') {
			content.push(convertMathBlock(child));
		}
		// Other block types in list items not supported
	}

	return {
		type: 'listItem',
		content
	};
}

/**
 * Convert BlockquoteNode to TipTap blockquote
 */
function convertBlockquote(quote: BlockquoteNode): JSONContent {
	const content = quote.children
		.map((block) => convertBlock(block))
		.filter((node): node is JSONContent => node !== null);

	return {
		type: 'blockquote',
		content
	};
}

/**
 * Convert CodeBlockNode to TipTap codeBlock
 */
function convertCodeBlock(code: CodeBlockNode): JSONContent {
	const result: JSONContent = {
		type: 'codeBlock',
		content: [{ type: 'text', text: code.code }]
	};

	if (code.language) {
		result.attrs = { language: code.language };
	}

	return result;
}

/**
 * Convert MathBlockNode to TipTap mathBlock
 */
function convertMathBlock(math: MathBlockNode): JSONContent {
	// For custom syntax, transpile to LaTeX
	let latex = math.expression;
	if (math.syntax === 'custom') {
		const parseResult = parseCustomSafe(math.expression);
		if (parseResult.ast) {
			latex = toLatex(parseResult.ast);
		}
	}

	return {
		type: 'mathBlock',
		attrs: {
			latex,
			syntax: math.syntax,
			originalExpression: math.expression
		}
	};
}

/**
 * Convert ImageNode to TipTap image
 * Supports extended attributes: sizeClass, widthPercent, alignment, caption
 * Also supports linked images with href and linkTitle
 */
function convertImage(img: ImageNode): JSONContent {
	const attrs: Record<string, unknown> = {
		src: img.src,
		alt: img.alt || '',
		title: img.title || null
	};

	// Add extended attributes if present
	if (img.sizeClass) attrs.sizeClass = img.sizeClass;
	if (img.widthPercent !== undefined) attrs.widthPercent = img.widthPercent;
	if (img.alignment) attrs.alignment = img.alignment;
	if (img.caption) attrs.caption = img.caption;

	// Add link attributes for linked images
	if (img.href) attrs.href = img.href;
	if (img.linkTitle) attrs.linkTitle = img.linkTitle;

	return {
		type: 'image',
		attrs
	};
}

/**
 * Convert VideoNode to TipTap video
 */
function convertVideo(video: VideoNode): JSONContent {
	return {
		type: 'video',
		attrs: {
			src: video.src,
			alt: video.alt || '',
			provider: video.provider || 'html5',
			videoId: video.videoId || null,
			sizeClass: video.sizeClass || null,
			widthPercent: video.widthPercent,
			alignment: video.alignment || null,
			controls: video.controls ?? true,
			autoplay: video.autoplay ?? false,
			loop: video.loop ?? false,
			muted: video.muted ?? false
		}
	};
}

/**
 * Parse inline markdown content from a string (for table cells)
 * Handles both LaTeX ($...$) and custom (~...~) math expressions
 */
function parseInlineMarkdownString(text: string): JSONContent[] {
	if (!text) return [];

	// Combined regex for both LaTeX ($...$) and custom (~...~) math
	// Uses alternation to match either pattern
	const mathRegex = /\$([^$\n]+)\$|~([^~\n]+)~/g;
	const segments: JSONContent[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = mathRegex.exec(text)) !== null) {
		// Add text before math
		if (match.index > lastIndex) {
			const beforeText = text.substring(lastIndex, match.index);
			if (beforeText) {
				segments.push({ type: 'text', text: beforeText });
			}
		}

		// Determine if it's LaTeX or custom syntax
		const isLatex = match[1] !== undefined;
		const expression = isLatex ? match[1] : match[2];

		// For custom syntax, convert to LaTeX
		let latex = expression;
		if (!isLatex) {
			const parseResult = parseCustomSafe(expression);
			if (parseResult.ast) {
				latex = toLatex(parseResult.ast);
			}
		}

		segments.push({
			type: 'mathInline',
			attrs: {
				latex,
				syntax: isLatex ? 'latex' : 'custom',
				originalExpression: expression
			}
		});

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text after last math
	if (lastIndex < text.length) {
		const remainingText = text.substring(lastIndex);
		if (remainingText) {
			segments.push({ type: 'text', text: remainingText });
		}
	}

	// If no math found, return the whole text
	if (segments.length === 0 && text) {
		segments.push({ type: 'text', text });
	}

	return segments;
}

/**
 * Convert TableNode to TipTap table
 * TipTap table structure: table > tableRow > (tableHeader | tableCell)
 * Preserves column alignment from GFM syntax (:---, :---:, ---:)
 */
function convertTable(table: TableNode): JSONContent {
	const rows: JSONContent[] = [];
	const alignments = table.alignments || [];

	// Convert header row
	const headerRow: JSONContent = {
		type: 'tableRow',
		content: table.header.map((cell, index) => {
			const align = alignments[index] || 'left';
			return {
				type: 'tableHeader',
				attrs: {
					colspan: 1,
					rowspan: 1,
					colwidth: null,
					textAlign: align
				},
				content: [
					{
						type: 'paragraph',
						attrs: align !== 'left' ? { textAlign: align } : undefined,
						content: parseInlineMarkdownString(cell.content)
					}
				]
			};
		})
	};
	rows.push(headerRow);

	// Convert data rows
	for (const row of table.rows) {
		const tableRow: JSONContent = {
			type: 'tableRow',
			content: row.map((cell, index) => {
				const align = alignments[index] || 'left';
				return {
					type: 'tableCell',
					attrs: {
						colspan: 1,
						rowspan: 1,
						colwidth: null,
						textAlign: align
					},
					content: [
						{
							type: 'paragraph',
							attrs: align !== 'left' ? { textAlign: align } : undefined,
							content: parseInlineMarkdownString(cell.content)
						}
					]
				};
			})
		};
		rows.push(tableRow);
	}

	return {
		type: 'table',
		content: rows
	};
}

// ============================================================================
// INLINE CONVERSION
// ============================================================================

/**
 * Convert array of InlineNodes to TipTap content
 *
 * This function handles the complexity of:
 * 1. Converting text nodes with formatting marks
 * 2. Extracting template syntax from text ({{var}}, {{1..10}}, etc.)
 * 3. Converting math nodes
 * 4. Converting blank nodes
 */
function convertInlineNodes(nodes: InlineNode[]): JSONContent[] {
	const result: JSONContent[] = [];

	for (const node of nodes) {
		const converted = convertInlineNode(node);
		result.push(...converted);
	}

	return result;
}

/**
 * Convert a single inline node to TipTap content
 * May return multiple nodes (e.g., when extracting templates from text)
 */
function convertInlineNode(node: InlineNode): JSONContent[] {
	switch (node.type) {
		case 'text':
			return convertTextNode(node);

		case 'math-inline':
			return [convertMathInline(node)];

		case 'blank':
			return [convertBlankNode(node)];

		case 'line-break':
			return [{ type: 'hardBreak' }];

		case 'link':
			return [convertLinkNode(node)];

		case 'hashtag':
			return [convertHashtagNode(node)];

		case 'mention':
			return [convertMentionNode(node)];

		default:
			return [];
	}
}

/**
 * Convert TextNode to TipTap text nodes
 *
 * This function also extracts template syntax from text content,
 * as the markdown parser doesn't handle templates natively.
 */
function convertTextNode(node: TextNode): JSONContent[] {
	const results: JSONContent[] = [];

	// Extract templates from text content
	const segments = extractTemplatesFromText(node.content);

	for (const segment of segments) {
		if (typeof segment === 'string') {
			// Plain text - apply formatting if needed
			if (segment.length > 0) {
				const textNode: JSONContent = {
					type: 'text',
					text: segment
				};

				// Apply marks from the original node
				const marks: Array<{ type: string }> = [];
				if (node.bold) marks.push({ type: 'bold' });
				if (node.italic) marks.push({ type: 'italic' });
				if (node.code) marks.push({ type: 'code' });

				if (marks.length > 0) {
					textNode.marks = marks;
				}

				results.push(textNode);
			}
		} else {
			// Template node
			results.push(segment);
		}
	}

	return results;
}

/**
 * Extract template syntax from text content
 *
 * Looks for patterns like {{varName}}, {{1..10}}, {{eval:expr}}, {{blank:N}}
 * and returns an array of strings and template nodes.
 */
function extractTemplatesFromText(text: string): Array<string | JSONContent> {
	const results: Array<string | JSONContent> = [];

	// Regex to find any {{...}} pattern
	const templateRegex = /\{\{([^}]+)\}\}/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = templateRegex.exec(text)) !== null) {
		// Add text before this match
		if (match.index > lastIndex) {
			results.push(text.substring(lastIndex, match.index));
		}

		// Classify the template
		const fullMatch = match[0];
		const classified = classifyTemplate(fullMatch);

		if (classified) {
			switch (classified.type) {
				case 'variable':
					results.push({
						type: 'templateVariable',
						attrs: { name: classified.value }
					});
					break;

				case 'random':
					results.push({
						type: 'templateRandom',
						attrs: { spec: classified.value }
					});
					break;

				case 'eval':
					results.push({
						type: 'templateEval',
						attrs: { expression: classified.value }
					});
					break;

				case 'blank':
					results.push({
						type: 'blankField',
						attrs: { number: parseInt(classified.value, 10) }
					});
					break;
			}
		} else {
			// Not a recognized template, keep as text
			results.push(fullMatch);
		}

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text after last match
	if (lastIndex < text.length) {
		results.push(text.substring(lastIndex));
	}

	return results;
}

/**
 * Convert MathInlineNode to TipTap mathInline
 */
function convertMathInline(node: MathInlineNode): JSONContent {
	// For custom syntax, transpile to LaTeX
	let latex = node.expression;
	if (node.syntax === 'custom') {
		const parseResult = parseCustomSafe(node.expression);
		if (parseResult.ast) {
			latex = toLatex(parseResult.ast);
		}
	}

	return {
		type: 'mathInline',
		attrs: {
			latex,
			syntax: node.syntax,
			originalExpression: node.expression
		}
	};
}

/**
 * Convert BlankNode to TipTap blankField
 */
function convertBlankNode(node: BlankNode): JSONContent {
	return {
		type: 'blankField',
		attrs: {
			number: node.index
		}
	};
}

/**
 * Convert LinkNode to TipTap text with link mark
 *
 * In TipTap, links are represented as text nodes with a 'link' mark
 * that contains the href and optional title attributes.
 */
function convertLinkNode(node: LinkNode): JSONContent {
	const linkMark: { type: 'link'; attrs: { href: string; title?: string | null } } = {
		type: 'link',
		attrs: {
			href: node.url,
			title: node.title || null
		}
	};

	return {
		type: 'text',
		text: node.text,
		marks: [linkMark]
	};
}

/**
 * Convert HashtagNode to TipTap hashtag node
 *
 * Hashtags are inline atomic nodes that display as chips/badges.
 */
function convertHashtagNode(node: HashtagNode): JSONContent {
	return {
		type: 'hashtag',
		attrs: {
			tag: node.tag
		}
	};
}

/**
 * Convert MentionNode to TipTap mention node
 *
 * Mentions are inline atomic nodes that display as chips/badges.
 */
function convertMentionNode(node: MentionNode): JSONContent {
	return {
		type: 'mention',
		attrs: {
			username: node.username
		}
	};
}
