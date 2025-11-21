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
 * @module exercises/parser/markdown-parser
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
	BlockquoteNode
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
 * Regex for markdown images: ![alt](url "optional title")
 */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

/**
 * Regex for headings: # Heading or ## Heading, etc.
 */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

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
					latex: placeholder.latex
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
				latex: segment.latex
			});
		}
	}

	return nodes;
}

/**
 * Parse text formatting (bold, italic, code)
 *
 * Parses markdown inline formatting and returns text nodes with appropriate properties.
 * Priority order: code > bold > italic (to avoid conflicts)
 *
 * @param text - Plain text possibly with markdown formatting
 * @returns Array of text nodes with formatting
 */
function parseTextFormatting(text: string): InlineNode[] {
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

// ============================================================================
// LIST POST-PROCESSING
// ============================================================================

/**
 * Process list items to parse inline content (math, formatting)
 *
 * The list-parser creates simple text nodes with placeholders.
 * This function replaces those text nodes with properly parsed inline content.
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
			children: item.children.map((child) => {
				if (child.type === 'paragraph') {
					// Extract text content from the simple text nodes
					const textContent = child.children
						.filter((n) => n.type === 'text')
						.map((n) => (n.type === 'text' ? n.content : ''))
						.join('');

					// Parse inline content with placeholders
					const parsedInline = parseInlineContent(textContent, placeholders, options);

					return {
						type: 'paragraph',
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
 * Parse an image from a line
 *
 * Format: ![alt](url "title")
 *
 * @param line - Line containing image markdown
 * @returns ImageNode or null if no valid image
 */
function parseImageLine(line: string): ImageNode | null {
	const match = line.match(IMAGE_REGEX);
	if (!match) return null;

	// Extract parts
	const fullMatch = match[0];
	const parts = fullMatch.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
	if (!parts) return null;

	const [, alt, src, title] = parts;

	return {
		type: 'image',
		src: src.trim(),
		alt: alt.trim(),
		title: title?.trim()
	};
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
