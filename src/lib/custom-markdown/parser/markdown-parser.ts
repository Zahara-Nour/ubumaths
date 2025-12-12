/**
 * Markdown Parser - Main Orchestrator
 * ====================================
 *
 * This is the main parser that coordinates all sub-parsers to convert
 * markdown text into an AST (Abstract Syntax Tree).
 *
 * Parse Process:
 * 1. Extract math expressions ($...$ and $$...$$) → placeholders
 * 2. Split text into lines
 * 3. Identify block structures (lists, tables, paragraphs)
 * 4. Parse each block with appropriate sub-parser
 * 5. Parse inline content (bold, italic, math placeholders)
 * 6. Reconstruct final AST with math nodes restored
 *
 * @module custom-markdown/parser/markdown-parser
 */

import type {
	BlockNode,
	DocumentNode,
	ParagraphNode,
	InlineNode,
	ParseOptions,
	MathPlaceholder,
	ImageNode,
	ListNode,
	BlockquoteNode,
	ImageSizeClass,
	ImageAlignment,
	BlankNode
} from '../types';
import {
	extractMath,
	isMathPlaceholder,
	findPlaceholder,
	splitTextWithPlaceholders
} from './math-extractor';
import { parseList, findListBlocks, isListItem } from './list-parser';
import { parseTable, findTableBlocks, isTableRow, isAlignmentRow } from './table-parser';
import {
	isBlockquoteLine,
	findBlockquoteBlocks,
	extractBlockquoteContent
} from './blockquote-parser';
import { isCodeFence, findCodeBlocks, parseCodeBlock } from './code-block-parser';

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/**
 * Regex for markdown images with optional attributes: ![alt](url "title"){attrs}
 *
 * Captures:
 * - Group 1: alt text
 * - Group 2: URL
 * - Group 3: optional title (inside quotes)
 * - Group 4: optional attributes (inside curly braces)
 *
 * @example Standard markdown
 * ```
 * ![alt](url.png)
 * ![alt](url.png "title")
 * ```
 *
 * @example Extended syntax with attributes
 * ```
 * ![alt](url.png){size=medium}
 * ![alt](url.png "title"){size=large align=center caption="Figure 1"}
 * ```
 */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/g;

/**
 * Regex for headings: # Heading or ## Heading, etc.
 */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * Regex for blank placeholders: {{blank:N}} where N is a positive integer
 *
 * Used in fill-in-the-blank questions. The index N is 1-based.
 * Note: This pattern is distinct from variable placeholders {{varName}}
 * which use alphanumeric names, not "blank:" prefix.
 *
 * @example
 * ```
 * {{blank:1}} → BlankNode with index 1
 * {{blank:42}} → BlankNode with index 42
 * ```
 */
const BLANK_REGEX = /\{\{blank:(\d+)\}\}/g;

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

/**
 * Parse markdown text into an AST
 *
 * This is the main entry point for parsing markdown content.
 *
 * @param markdown - Raw markdown text
 * @param options - Parse options
 * @returns DocumentNode (root of AST)
 *
 * @example
 * const ast = parseMarkdown("# Hello\n\nCalculate $x^2$");
 */
export function parseMarkdown(markdown: string, options: ParseOptions = {}): DocumentNode {
	// Normalize line endings
	const normalized = markdown.replace(/\r\n/g, '\n');

	// Keep original lines for code blocks (before math extraction)
	const originalLines = normalized.split('\n');

	// Step 1: Extract math expressions
	const { text, placeholders } = extractMath(normalized);

	// Step 2: Split into lines
	const lines = text.split('\n');

	// Step 3: Parse blocks (pass both original and processed lines)
	const blocks = parseBlocks(lines, placeholders, options, originalLines);

	return {
		type: 'document',
		children: blocks
	};
}

// ============================================================================
// BLOCK PARSING
// ============================================================================

/**
 * Parse lines into block nodes
 *
 * This function identifies and parses all block-level structures:
 * - Code blocks (HIGHEST PRIORITY - contains verbatim content)
 * - Blockquotes
 * - Lists
 * - Tables
 * - Paragraphs
 * - Images
 * - Math blocks (standalone $$...$$)
 *
 * @param lines - Array of text lines (with math placeholders)
 * @param placeholders - Math placeholders from extraction
 * @param options - Parse options
 * @param originalLines - Original lines before math extraction (for code blocks)
 * @returns Array of block nodes
 */
function parseBlocks(
	lines: string[],
	placeholders: MathPlaceholder[],
	options: ParseOptions,
	originalLines: string[] = lines
): BlockNode[] {
	const blocks: BlockNode[] = [];
	let i = 0;

	// Find all structured blocks (code, blockquotes, lists, tables)
	// Code blocks have highest priority as their content is verbatim
	// Use original lines for code blocks to preserve math expressions
	const codeBlocks = findCodeBlocks(originalLines);
	const blockquoteBlocks = findBlockquoteBlocks(lines);
	const listBlocks = findListBlocks(lines);
	const tableBlocks = findTableBlocks(lines);

	while (i < lines.length) {
		const line = lines[i];

		// Skip empty lines
		if (line.trim() === '') {
			i++;
			continue;
		}

		// PRIORITY 1: Check if this line is part of a code block (highest priority)
		const codeBlock = codeBlocks.find((range) => i >= range.startIndex && i <= range.endIndex);
		if (codeBlock) {
			// Use original lines to preserve math expressions in code blocks
			const code = parseCodeBlock(originalLines, codeBlock.startIndex, codeBlock.endIndex);
			if (code) {
				// Important: Math expressions are preserved as-is in code blocks
				// Code content is verbatim from original lines
				blocks.push(code);
			}
			i = codeBlock.endIndex + 1;
			continue;
		}

		// PRIORITY 2: Check if this line is part of a blockquote block
		const blockquoteBlock = blockquoteBlocks.find(([start, end]) => i >= start && i <= end);
		if (blockquoteBlock) {
			const [start, end] = blockquoteBlock;
			const blockquoteLines = lines.slice(start, end + 1);
			// Extract content without > markers
			const contentLines = extractBlockquoteContent(blockquoteLines);
			// Parse the extracted content recursively
			const children = parseBlocks(contentLines, placeholders, options);

			// Create blockquote node with parsed children
			const processedBlockquote: BlockquoteNode = {
				type: 'blockquote',
				children
			};
			blocks.push(processedBlockquote);
			i = end + 1;
			continue;
		}

		// Check if this line is part of a list block
		const listBlock = listBlocks.find(([start, end]) => i >= start && i <= end);
		if (listBlock) {
			const [start, end] = listBlock;
			const listLines = lines.slice(start, end + 1);
			const lists = parseList(listLines);
			// Post-process lists to parse inline content
			const processedLists = lists.map((list) =>
				processListInlineContent(list, placeholders, options)
			);
			blocks.push(...processedLists);
			i = end + 1;
			continue;
		}

		// Check if this line is part of a table block
		const tableBlock = tableBlocks.find(([start, end]) => i >= start && i <= end);
		if (tableBlock) {
			const [start, end] = tableBlock;
			const tableLines = lines.slice(start, end + 1);
			const table = parseTable(tableLines);
			if (table) {
				blocks.push(table);
			}
			i = end + 1;
			continue;
		}

		// Check for block math (standalone placeholder that is block math)
		if (isMathPlaceholder(line.trim())) {
			const placeholder = findPlaceholder(placeholders, line.trim());
			if (placeholder && placeholder.isBlock) {
				blocks.push({
					type: 'math-block',
					expression: placeholder.expression,
					syntax: placeholder.syntax
				});
				i++;
				continue;
			}
		}

		// Check for image on its own line
		const imageMatch = line.match(IMAGE_REGEX);
		if (imageMatch && options.parseImages !== false) {
			const image = parseImageLine(line);
			if (image) {
				blocks.push(image);
				i++;
				continue;
			}
		}

		// Check for heading
		const headingMatch = line.match(HEADING_REGEX);
		if (headingMatch) {
			const level = headingMatch[1].length; // Number of # characters
			const content = headingMatch[2].trim();
			const inlineContent = parseInlineContent(content, placeholders, options);

			blocks.push({
				type: 'heading',
				level: level as 1 | 2 | 3 | 4 | 5 | 6,
				children: inlineContent
			});
			i++;
			continue;
		}

		// Check for horizontal rule
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
			blocks.push({
				type: 'horizontal-rule'
			});
			i++;
			continue;
		}

		// Otherwise, collect paragraph lines
		const paragraphLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!isCodeFence(lines[i]) &&
			!isBlockquoteLine(lines[i]) &&
			!isListItem(lines[i]) &&
			!isTableRow(lines[i]) &&
			!isAlignmentRow(lines[i])
		) {
			paragraphLines.push(lines[i]);
			i++;
		}

		if (paragraphLines.length > 0) {
			const paragraph = parseParagraph(paragraphLines.join('\n'), placeholders, options);
			blocks.push(paragraph);
		}
	}

	return blocks;
}

// ============================================================================
// PARAGRAPH PARSING
// ============================================================================

/**
 * Parse a paragraph (inline content)
 *
 * Handles:
 * - Bold, italic, code formatting
 * - Inline math (via placeholders)
 * - Plain text
 *
 * @param text - Paragraph text
 * @param placeholders - Math placeholders
 * @param options - Parse options
 * @returns ParagraphNode
 */
function parseParagraph(
	text: string,
	placeholders: MathPlaceholder[],
	options: ParseOptions
): ParagraphNode {
	const children = parseInlineContent(text, placeholders, options);

	return {
		type: 'paragraph',
		children
	};
}

/**
 * Parse inline content (text with formatting)
 *
 * This is where we handle bold, italic, code, and math placeholders.
 *
 * @param text - Text with inline formatting
 * @param placeholders - Math placeholders
 * @param options - Parse options
 * @returns Array of inline nodes
 */
function parseInlineContent(
	text: string,
	placeholders: MathPlaceholder[],
	_options: ParseOptions
): InlineNode[] {
	const nodes: InlineNode[] = [];

	// Split text by math placeholders first
	const segments = splitTextWithPlaceholders(text, placeholders);

	for (const segment of segments) {
		if (typeof segment === 'string') {
			// Parse text for formatting (bold, italic, code)
			const formatted = parseTextFormatting(segment);
			nodes.push(...formatted);
		} else {
			// Math placeholder → inline math node
			nodes.push({
				type: 'math-inline',
				expression: segment.expression,
				syntax: segment.syntax
			});
		}
	}

	return nodes;
}

/**
 * Parse text for blanks ({{blank:N}})
 *
 * Extracts blank placeholders from text and returns an array of
 * text segments and BlankNodes. Text segments will be further processed
 * for formatting (bold, italic, code).
 *
 * @param text - Text possibly containing {{blank:N}} syntax
 * @returns Array of strings (text segments) and BlankNodes
 */
function parseTextForBlanks(text: string): (string | BlankNode)[] {
	if (!text) return [];

	const results: (string | BlankNode)[] = [];
	let position = 0;

	// Reset regex state for global matching
	const blankRegex = new RegExp(BLANK_REGEX.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = blankRegex.exec(text)) !== null) {
		// Add text segment before this blank
		if (match.index > position) {
			results.push(text.substring(position, match.index));
		}

		// Add blank node with parsed index
		const index = parseInt(match[1], 10);
		results.push({
			type: 'blank',
			index
		});

		position = match.index + match[0].length;
	}

	// Add remaining text after last blank
	if (position < text.length) {
		results.push(text.substring(position));
	}

	return results;
}

/**
 * Parse text formatting (bold, italic, code) for a single text segment
 *
 * Parses markdown inline formatting and returns text nodes with appropriate properties.
 * Priority order: code > bold > italic (to avoid conflicts)
 *
 * @param text - Plain text possibly with markdown formatting
 * @returns Array of text nodes with formatting
 */
function parseTextFormattingSegment(text: string): InlineNode[] {
	if (!text) return [];

	const nodes: InlineNode[] = [];
	let position = 0;

	// Combined regex to find all formatting markers
	// Matches: `code`, **bold**, __bold__, *italic*, _italic_
	const formatRegex = /(`[^`]+`)|(\*\*|__)([^*_]+)\2|(\*|_)([^*_]+)\4/g;
	let match: RegExpExecArray | null;

	while ((match = formatRegex.exec(text)) !== null) {
		// Add unformatted text before this match
		if (match.index > position) {
			nodes.push({
				type: 'text',
				content: text.substring(position, match.index)
			});
		}

		if (match[1]) {
			// Code: `content`
			const content = match[1].slice(1, -1); // Remove backticks
			nodes.push({
				type: 'text',
				content,
				code: true
			});
		} else if (match[2] && match[3]) {
			// Bold: **content** or __content__
			nodes.push({
				type: 'text',
				content: match[3],
				bold: true
			});
		} else if (match[4] && match[5]) {
			// Italic: *content* or _content_
			nodes.push({
				type: 'text',
				content: match[5],
				italic: true
			});
		}

		position = match.index + match[0].length;
	}

	// Add remaining unformatted text
	if (position < text.length) {
		nodes.push({
			type: 'text',
			content: text.substring(position)
		});
	}

	return nodes.length > 0 ? nodes : [{ type: 'text', content: text }];
}

/**
 * Parse text formatting (bold, italic, code) with blank support
 *
 * First extracts {{blank:N}} placeholders, then parses markdown inline
 * formatting on the remaining text segments.
 * Priority order: blanks > code > bold > italic
 *
 * @param text - Plain text possibly with markdown formatting and blanks
 * @returns Array of inline nodes (text, blank)
 */
function parseTextFormatting(text: string): InlineNode[] {
	if (!text) return [];

	// Step 1: Extract blanks first
	const segments = parseTextForBlanks(text);

	// Step 2: Process each segment
	const nodes: InlineNode[] = [];
	for (const segment of segments) {
		if (typeof segment === 'string') {
			// Parse text formatting on text segments
			const formatted = parseTextFormattingSegment(segment);
			nodes.push(...formatted);
		} else {
			// BlankNode - add directly
			nodes.push(segment);
		}
	}

	return nodes;
}

// ============================================================================
// LIST POST-PROCESSING
// ============================================================================

/**
 * Parse content that may contain code blocks into block nodes
 *
 * Handles cases where list item continuations contain fenced code blocks.
 * Returns an array of BlockNode (paragraphs and code blocks).
 *
 * @param content - Text content that may contain code blocks
 * @param placeholders - Math placeholders from extraction
 * @param options - Parse options
 * @returns Array of block nodes
 */
function parseContentWithCodeBlocks(
	content: string,
	placeholders: MathPlaceholder[],
	options: ParseOptions
): BlockNode[] {
	const blocks: BlockNode[] = [];

	// Regex to find fenced code blocks (``` or ~~~)
	// Important: Use [ \t]* instead of \s* to avoid consuming newlines between blocks
	const codeBlockRegex = /^(`{3,}|~{3,})(\w*)\n([\s\S]*?)\n\1[ \t]*$/gm;

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	// Reset regex state
	codeBlockRegex.lastIndex = 0;

	while ((match = codeBlockRegex.exec(content)) !== null) {
		// Add paragraph for content before this code block
		if (match.index > lastIndex) {
			const beforeText = content.slice(lastIndex, match.index).trim();
			if (beforeText) {
				const parsedInline = parseInlineContent(beforeText, placeholders, options);
				blocks.push({
					type: 'paragraph',
					children: parsedInline
				});
			}
		}

		// Add code block
		const language = match[2] || undefined;
		const code = match[3];
		blocks.push({
			type: 'code-block',
			language,
			code
		});

		lastIndex = match.index + match[0].length;
	}

	// Add paragraph for remaining content after last code block
	if (lastIndex < content.length) {
		const afterText = content.slice(lastIndex).trim();
		if (afterText) {
			const parsedInline = parseInlineContent(afterText, placeholders, options);
			blocks.push({
				type: 'paragraph',
				children: parsedInline
			});
		}
	}

	return blocks;
}

/**
 * Check if content contains fenced code blocks
 */
function containsCodeBlocks(content: string): boolean {
	return /^(`{3,}|~{3,})/m.test(content);
}

/**
 * Check if content contains block math placeholders
 */
function containsBlockMath(content: string, placeholders: MathPlaceholder[]): boolean {
	return placeholders.some((p) => p.isBlock && content.includes(p.placeholder));
}

/**
 * Parse content that may contain block math into block nodes
 *
 * Handles cases where list item content contains $$...$$ display math.
 * Returns an array of BlockNode (paragraphs and math-blocks).
 *
 * @param content - Text content that may contain block math placeholders
 * @param placeholders - Math placeholders from extraction
 * @param options - Parse options
 * @returns Array of block nodes
 */
function parseContentWithBlockMath(
	content: string,
	placeholders: MathPlaceholder[],
	options: ParseOptions
): BlockNode[] {
	const blocks: BlockNode[] = [];

	// Find all block math placeholders in this content
	const blockMathPlaceholders = placeholders.filter(
		(p) => p.isBlock && content.includes(p.placeholder)
	);

	if (blockMathPlaceholders.length === 0) {
		// No block math, parse as regular inline content
		const parsedInline = parseInlineContent(content, placeholders, options);
		if (parsedInline.length > 0) {
			blocks.push({
				type: 'paragraph',
				children: parsedInline
			});
		}
		return blocks;
	}

	// Split content by block math placeholders
	let remaining = content;
	for (const placeholder of blockMathPlaceholders) {
		const idx = remaining.indexOf(placeholder.placeholder);
		if (idx === -1) continue;

		// Content before this block math
		const before = remaining.slice(0, idx).trim();
		if (before) {
			const parsedInline = parseInlineContent(before, placeholders, options);
			if (parsedInline.length > 0) {
				blocks.push({
					type: 'paragraph',
					children: parsedInline
				});
			}
		}

		// The block math itself
		blocks.push({
			type: 'math-block',
			expression: placeholder.expression,
			syntax: placeholder.syntax
		});

		// Continue with content after this placeholder
		remaining = remaining.slice(idx + placeholder.placeholder.length);
	}

	// Any remaining content after the last block math
	const after = remaining.trim();
	if (after) {
		const parsedInline = parseInlineContent(after, placeholders, options);
		if (parsedInline.length > 0) {
			blocks.push({
				type: 'paragraph',
				children: parsedInline
			});
		}
	}

	return blocks;
}

/**
 * Process list items to parse inline content (math, formatting)
 *
 * The list-parser creates simple text nodes with placeholders.
 * This function replaces those text nodes with properly parsed inline content.
 * Also handles code blocks that may appear in list item continuations.
 *
 * @param list - ListNode to process
 * @param placeholders - Math placeholders from extraction
 * @param options - Parse options
 * @returns Processed ListNode with inline content parsed
 */
function processListInlineContent(
	list: ListNode,
	placeholders: MathPlaceholder[],
	options: ParseOptions
): ListNode {
	return {
		...list,
		items: list.items.map((item) => ({
			...item,
			children: item.children.flatMap((child) => {
				if (child.type === 'paragraph') {
					// Extract text content from the simple text nodes
					const textContent = child.children
						.filter((n) => n.type === 'text')
						.map((n) => (n.type === 'text' ? n.content : ''))
						.join('');

					// Check if content contains code blocks
					if (containsCodeBlocks(textContent)) {
						// Parse as blocks (may return multiple nodes)
						return parseContentWithCodeBlocks(textContent, placeholders, options);
					}

					// Check if content contains block math ($$...$$)
					if (containsBlockMath(textContent, placeholders)) {
						// Parse as blocks (may return paragraphs and math-blocks)
						return parseContentWithBlockMath(textContent, placeholders, options);
					}

					// Parse inline content with placeholders
					const parsedInline = parseInlineContent(textContent, placeholders, options);

					return {
						type: 'paragraph' as const,
						children: parsedInline
					};
				} else if (child.type === 'list') {
					// Recursively process nested lists
					return processListInlineContent(child, placeholders, options);
				}
				return child;
			})
		}))
	};
}

// ============================================================================
// IMAGE PARSING
// ============================================================================

/**
 * Parsed image attributes from extended markdown syntax
 *
 * @internal Used by parseImageAttributes
 */
interface ParsedImageAttributes {
	sizeClass?: ImageSizeClass;
	widthPercent?: number;
	alignment?: ImageAlignment;
	caption?: string;
}

/**
 * Valid size class values for validation
 */
const VALID_SIZE_CLASSES: ImageSizeClass[] = ['inline', 'small', 'medium', 'large', 'full'];

/**
 * Valid alignment values for validation
 */
const VALID_ALIGNMENTS: ImageAlignment[] = ['left', 'center', 'right'];

/**
 * Parse image attributes from curly brace syntax
 *
 * Supports the following attributes:
 * - `size=<value>` or `size="<value>"` - Semantic size class (inline, small, medium, large, full)
 * - `width=<value>%` or `width="<value>%"` - Width percentage (0-100)
 * - `align=<value>` or `align="<value>"` - Alignment (left, center, right)
 * - `caption="<value>"` or `caption='<value>'` - Figure caption text
 *
 * @param attrString - Attribute string from inside curly braces (e.g., "size=medium align=center")
 * @returns Parsed attributes object
 *
 * @example Parse size class
 * ```typescript
 * parseImageAttributes('size=medium');
 * // { sizeClass: 'medium' }
 * ```
 *
 * @example Parse multiple attributes
 * ```typescript
 * parseImageAttributes('size=large align=center caption="Figure 1"');
 * // { sizeClass: 'large', alignment: 'center', caption: 'Figure 1' }
 * ```
 *
 * @example Parse width percentage
 * ```typescript
 * parseImageAttributes('width=60%');
 * // { widthPercent: 60 }
 * ```
 */
function parseImageAttributes(attrString: string | undefined): ParsedImageAttributes {
	if (!attrString) return {};

	const attrs: ParsedImageAttributes = {};

	// Parse size=medium or size="medium"
	const sizeMatch = attrString.match(/size=["']?(\w+)["']?/);
	if (sizeMatch) {
		const size = sizeMatch[1];
		if (VALID_SIZE_CLASSES.includes(size as ImageSizeClass)) {
			attrs.sizeClass = size as ImageSizeClass;
		}
	}

	// Parse width=60% or width="60%"
	const widthMatch = attrString.match(/width=["']?(\d+)%?["']?/);
	if (widthMatch) {
		const width = parseInt(widthMatch[1], 10);
		// Validate width is between 0 and 100
		if (width >= 0 && width <= 100) {
			attrs.widthPercent = width;
		}
	}

	// Parse align=center or align="center"
	const alignMatch = attrString.match(/align=["']?(\w+)["']?/);
	if (alignMatch) {
		const align = alignMatch[1];
		if (VALID_ALIGNMENTS.includes(align as ImageAlignment)) {
			attrs.alignment = align as ImageAlignment;
		}
	}

	// Parse caption="Figure 1" or caption='Figure 1'
	const captionMatch = attrString.match(/caption=["']([^"']+)["']/);
	if (captionMatch) {
		attrs.caption = captionMatch[1];
	}

	return attrs;
}

/**
 * Parse an image from a line
 *
 * Supports standard markdown and extended syntax with attributes:
 * - Standard: `![alt](url "title")`
 * - Extended: `![alt](url "title"){size=medium align=center caption="Figure 1"}`
 *
 * @param line - Line containing image markdown
 * @returns ImageNode or null if no valid image
 *
 * @example Standard markdown
 * ```typescript
 * parseImageLine('![A cat](cat.png "My cat")');
 * // { type: 'image', src: 'cat.png', alt: 'A cat', title: 'My cat' }
 * ```
 *
 * @example Extended syntax
 * ```typescript
 * parseImageLine('![Figure](graph.png){size=large align=center caption="Results"}');
 * // { type: 'image', src: 'graph.png', alt: 'Figure', sizeClass: 'large', alignment: 'center', caption: 'Results' }
 * ```
 */
function parseImageLine(line: string): ImageNode | null {
	// Use non-global regex for single match extraction
	const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/;
	const match = line.match(regex);
	if (!match) return null;

	const [, alt, src, title, attrsStr] = match;

	// Parse extended attributes if present
	const attrs = parseImageAttributes(attrsStr);

	// Build ImageNode with base fields
	const imageNode: ImageNode = {
		type: 'image',
		src: src.trim(),
		alt: alt?.trim() || undefined,
		title: title?.trim()
	};

	// Add extended attributes if present
	if (attrs.sizeClass) {
		imageNode.sizeClass = attrs.sizeClass;
	}
	if (attrs.widthPercent !== undefined) {
		imageNode.widthPercent = attrs.widthPercent;
	}
	if (attrs.alignment) {
		imageNode.alignment = attrs.alignment;
	}
	if (attrs.caption) {
		imageNode.caption = attrs.caption;
	}

	return imageNode;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape markdown special characters
 *
 * Useful for converting text to markdown safely.
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
	const specialChars = /([\\`*_{}[\]()#+\-.!])/g;
	return text.replace(specialChars, '\\$1');
}

/**
 * Strip all markdown formatting from text
 *
 * Returns plain text without any markdown syntax.
 *
 * @param markdown - Markdown text
 * @returns Plain text
 */
export function stripMarkdown(markdown: string): string {
	let text = markdown;

	// Remove images
	text = text.replace(IMAGE_REGEX, '');

	// Remove links: [text](url) → text
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

	// Remove bold: **text** → text
	text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
	text = text.replace(/__([^_]+)__/g, '$1');

	// Remove italic: *text* → text
	text = text.replace(/\*([^*]+)\*/g, '$1');
	text = text.replace(/_([^_]+)_/g, '$1');

	// Remove code: `code` → code
	text = text.replace(/`([^`]+)`/g, '$1');

	// Remove headings: # text → text
	text = text.replace(/^#+\s+/gm, '');

	// Remove list markers
	text = text.replace(/^\s*[-*+]\s+/gm, '');
	text = text.replace(/^\s*\d+[.)]\s+/gm, '');

	return text.trim();
}

/**
 * Count words in markdown text
 *
 * Strips markdown formatting and counts words.
 *
 * @param markdown - Markdown text
 * @returns Word count
 */
export function countWords(markdown: string): number {
	const plain = stripMarkdown(markdown);
	const words = plain.split(/\s+/).filter((w) => w.length > 0);
	return words.length;
}

/**
 * Get a plain text summary from markdown
 *
 * Strips markdown and truncates to specified length.
 *
 * @param markdown - Markdown text
 * @param maxLength - Maximum length of summary
 * @returns Plain text summary
 */
export function getSummary(markdown: string, maxLength: number = 100): string {
	const plain = stripMarkdown(markdown);

	if (plain.length <= maxLength) {
		return plain;
	}

	return plain.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// AST TRAVERSAL
// ============================================================================

/**
 * Walk the AST and apply a function to each node
 *
 * Useful for transformations, validation, or analysis.
 *
 * @param ast - AST to traverse
 * @param visitor - Function to call on each node
 */
export function walkAST(ast: DocumentNode, visitor: (node: BlockNode) => void): void {
	for (const node of ast.children) {
		visitor(node);

		// Recursively walk nested structures
		if (node.type === 'list') {
			for (const item of node.items) {
				for (const child of item.children) {
					if (child.type === 'list') {
						walkAST({ type: 'document', children: [child] }, visitor);
					}
				}
			}
		} else if (node.type === 'blockquote') {
			// Blockquotes can contain other blocks
			walkAST({ type: 'document', children: node.children }, visitor);
		}
		// Note: Code blocks don't have nested content to walk
	}
}

/**
 * Find all nodes of a specific type in the AST
 *
 * @param ast - AST to search
 * @param type - Node type to find
 * @returns Array of matching nodes
 */
export function findNodes<T extends BlockNode>(ast: DocumentNode, type: string): T[] {
	const results: T[] = [];

	walkAST(ast, (node) => {
		if (node.type === type) {
			results.push(node as T);
		}
	});

	return results;
}
