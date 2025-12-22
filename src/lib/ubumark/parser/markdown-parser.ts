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
 * @module ubumark/parser/markdown-parser
 */

import type {
	BlockNode,
	DocumentNode,
	ParagraphNode,
	InlineNode,
	ParseOptions,
	MathPlaceholder,
	ImageNode,
	VideoNode,
	ListNode,
	BlockquoteNode,
	ImageSizeClass,
	ImageAlignment,
	BlankNode,
	LinkNode,
	HashtagNode,
	MentionNode,
	HintReferenceNode
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
import { findVariationBlocks, parseVariationTable } from './variation-table-parser';
import { findProbTreeBlocks, parseProbabilityTree } from './probability-tree-parser';

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
 * Regex for markdown videos: !video[alt](url "title"){attrs}
 *
 * Captures:
 * - Group 1: alt text
 * - Group 2: URL (video file or YouTube URL)
 * - Group 3: optional title (inside quotes)
 * - Group 4: optional attributes (inside curly braces)
 *
 * @example HTML5 video
 * ```
 * !video[Demo](video.mp4)
 * !video[Demo](video.mp4 "title")
 * ```
 *
 * @example Extended syntax with attributes
 * ```
 * !video[Demo](video.mp4){controls}
 * !video[Demo](video.mp4 "title"){size=large align=center controls autoplay loop muted}
 * ```
 *
 * @example YouTube video
 * ```
 * !video[Tutorial](https://youtube.com/watch?v=VIDEO_ID){size=large}
 * !video[Tutorial](https://youtu.be/VIDEO_ID){align=center}
 * ```
 */
const VIDEO_REGEX = /!video\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/;

/**
 * Regex for linked images: [![alt](src "imgTitle")](href "linkTitle"){attrs}
 *
 * Captures:
 * - Group 1: alt text
 * - Group 2: image URL (src)
 * - Group 3: optional image title
 * - Group 4: link URL (href)
 * - Group 5: optional link title
 * - Group 6: optional attributes (inside curly braces)
 *
 * @example Basic linked image
 * ```
 * [![Click me](image.png)](https://example.com)
 * ```
 *
 * @example Linked image with titles
 * ```
 * [![Click me](image.png "Image title")](https://example.com "Link title")
 * ```
 *
 * @example Linked image with attributes
 * ```
 * [![Click me](image.png)](https://example.com){size=medium align=center}
 * ```
 */
const LINKED_IMAGE_REGEX =
	/\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/g;

/**
 * Regex for headings: # Heading or ## Heading, etc.
 */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * Check if a line is a heading (starts with 1-6 # followed by space)
 */
function isHeading(line: string): boolean {
	return HEADING_REGEX.test(line);
}

/**
 * Check if a line is a horizontal rule (ubumark uses -- not ---, ***, ___)
 */
function isHorizontalRule(line: string): boolean {
	return /^-{2,}$/.test(line.trim());
}

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

/**
 * Regex for markdown links: [text](url) or [text](url "title")
 *
 * Uses negative lookbehind to NOT match images (which have ! prefix).
 *
 * Captures:
 * - Group 1: link text
 * - Group 2: URL
 * - Group 3: optional title (inside quotes)
 *
 * @example
 * ```
 * [text](https://example.com)
 * [text](https://example.com "title")
 * ```
 */
const LINK_REGEX = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

/**
 * Regex for hashtags: #tag (must start with lowercase letter, supports accents)
 *
 * Uses negative lookbehind to NOT match if preceded by alphanumeric.
 * Does NOT match:
 * - Headings: "# Heading" (space after #)
 * - Hex colors: "#FF0000" (uppercase only)
 *
 * Starts with lowercase letter to avoid matching hex colors (#AABBCC).
 *
 * Captures:
 * - Group 1: tag name (without #)
 *
 * @example
 * ```
 * #mathematiques
 * #equation-2nde
 * #algebre_II
 * ```
 */
const HASHTAG_REGEX = /(?<![a-zA-Z0-9])#([a-zàâäéèêëïîôùûüçœæ][a-zA-Zàâäéèêëïîôùûüçœæ0-9_-]*)/g;

/**
 * Regex for mentions: @username (must start with letter)
 *
 * Uses negative lookbehind to NOT match if preceded by alphanumeric, dot, or @.
 * This prevents matching emails like "user@example.com".
 *
 * Captures:
 * - Group 1: username (without @)
 *
 * @example
 * ```
 * @alice
 * @jean.dupont
 * @user_123
 * ```
 */
const MENTION_REGEX = /(?<![a-zA-Z0-9.@])@([a-zA-Z][a-zA-Z0-9_.-]*)/g;

/**
 * Regex for hint references: {{hint:id}} where id starts with a letter
 *
 * Used in exercises to reference hints defined in the variation's hints array.
 * The hint ID must start with a letter and can contain letters, numbers, dashes, underscores.
 *
 * Note: This pattern is distinct from:
 * - Variable placeholders {{varName}} which don't have the "hint:" prefix
 * - Blank placeholders {{blank:N}} which use numeric indices
 *
 * Captures:
 * - Group 1: hint ID (without "hint:" prefix)
 *
 * @example
 * ```
 * {{hint:derivative-rule}} → HintReferenceNode with hintId 'derivative-rule'
 * {{hint:formula1}} → HintReferenceNode with hintId 'formula1'
 * {{hint:rappel_addition}} → HintReferenceNode with hintId 'rappel_addition'
 * ```
 */
const HINT_REFERENCE_REGEX = /\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g;

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

	// Find all structured blocks (code, variation tables, probability trees, blockquotes, lists, tables)
	// Code blocks, variation tables, and probability trees have highest priority as their content is verbatim
	// Use original lines for code blocks to preserve math expressions
	const variationBlocks = findVariationBlocks(originalLines);
	const probTreeBlocks = findProbTreeBlocks(originalLines);
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

		// PRIORITY 1a: Check if this line is part of a variation table block (highest priority)
		// Variation tables use ```variation syntax and must be checked before regular code blocks
		const variationBlock = variationBlocks.find(
			(range) => i >= range.startIndex && i <= range.endIndex
		);
		if (variationBlock) {
			const result = parseVariationTable(
				originalLines,
				variationBlock.startIndex,
				variationBlock.endIndex
			);
			if (result.node) {
				blocks.push(result.node);
			}
			// Note: Errors are silently ignored for now; could be logged if needed
			i = variationBlock.endIndex + 1;
			continue;
		}

		// PRIORITY 1b: Check if this line is part of a probability tree block
		// Probability trees use ```probtree syntax and must be checked before regular code blocks
		const probTreeBlock = probTreeBlocks.find(
			(range) => i >= range.startIndex && i <= range.endIndex
		);
		if (probTreeBlock) {
			const result = parseProbabilityTree(
				originalLines,
				probTreeBlock.startIndex,
				probTreeBlock.endIndex
			);
			if (result.node) {
				blocks.push(result.node);
			}
			// Note: Errors are silently ignored for now; could be logged if needed
			i = probTreeBlock.endIndex + 1;
			continue;
		}

		// PRIORITY 1c: Check if this line is part of a code block (highest priority)
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
				// Post-process table to restore math placeholders in cell content
				const processedTable = processTableCellContent(table, placeholders);
				blocks.push(processedTable);
			}
			i = end + 1;
			continue;
		}

		// Check for standalone math placeholder (block or inline on its own line)
		if (isMathPlaceholder(line.trim())) {
			const placeholder = findPlaceholder(placeholders, line.trim());
			if (placeholder) {
				if (placeholder.isBlock) {
					// Block math: create a math-block node
					blocks.push({
						type: 'math-block',
						expression: placeholder.expression,
						syntax: placeholder.syntax
					});
				} else {
					// Inline math on its own line: wrap in a paragraph
					blocks.push({
						type: 'paragraph',
						children: [
							{
								type: 'math-inline',
								expression: placeholder.expression,
								syntax: placeholder.syntax
							}
						]
					});
				}
				i++;
				continue;
			}
		}

		// Check for image on its own line (linked or standard)
		const linkedImageMatch = line.match(LINKED_IMAGE_REGEX);
		const imageMatch = line.match(IMAGE_REGEX);
		if ((linkedImageMatch || imageMatch) && options.parseImages !== false) {
			const image = parseImageLine(line);
			if (image) {
				blocks.push(image);
				i++;
				continue;
			}
		}

		// Check for video on its own line (must start with !video[)
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith('!video[')) {
			const video = parseVideoLine(trimmedLine);
			if (video) {
				blocks.push(video);
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

		// Check for horizontal rule (ubumark uses -- not ---, ***, ___ which are bold+italic)
		if (/^-{2,}$/.test(line.trim())) {
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
			!isAlignmentRow(lines[i]) &&
			!isHeading(lines[i]) &&
			!isHorizontalRule(lines[i]) &&
			!isMathPlaceholder(lines[i].trim())
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
 * Parse text for links ([text](url) or [text](url "title"))
 *
 * Extracts markdown links from text and returns an array of
 * text segments and LinkNodes. Text segments will be further processed
 * for formatting (bold, italic, code).
 *
 * Note: Uses negative lookbehind to not match images (![alt](url)).
 *
 * @param text - Text possibly containing [text](url) syntax
 * @returns Array of strings (text segments) and LinkNodes
 */
function parseTextForLinks(text: string): (string | LinkNode)[] {
	if (!text) return [];

	const results: (string | LinkNode)[] = [];
	let position = 0;

	// Reset regex state for global matching
	const linkRegex = new RegExp(LINK_REGEX.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = linkRegex.exec(text)) !== null) {
		// Add text segment before this link
		if (match.index > position) {
			results.push(text.substring(position, match.index));
		}

		// Add link node
		const linkNode: LinkNode = {
			type: 'link',
			text: match[1], // link text
			url: match[2] // URL
		};

		// Add optional title if present
		if (match[3]) {
			linkNode.title = match[3];
		}

		results.push(linkNode);
		position = match.index + match[0].length;
	}

	// Add remaining text after last link
	if (position < text.length) {
		results.push(text.substring(position));
	}

	return results;
}

/**
 * Parse text for hashtags (#tag)
 *
 * Extracts hashtag markers from text and returns an array of
 * text segments and HashtagNodes. Text segments will be further processed
 * for formatting (bold, italic, code).
 *
 * @param text - Text possibly containing #tag syntax
 * @returns Array of strings (text segments) and HashtagNodes
 */
function parseTextForHashtags(text: string): (string | HashtagNode)[] {
	if (!text) return [];

	const results: (string | HashtagNode)[] = [];
	let position = 0;

	// Reset regex state for global matching
	const hashtagRegex = new RegExp(HASHTAG_REGEX.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = hashtagRegex.exec(text)) !== null) {
		// Add text segment before this hashtag
		if (match.index > position) {
			results.push(text.substring(position, match.index));
		}

		// Add hashtag node
		const hashtagNode: HashtagNode = {
			type: 'hashtag',
			tag: match[1] // tag name without #
		};

		results.push(hashtagNode);
		position = match.index + match[0].length;
	}

	// Add remaining text after last hashtag
	if (position < text.length) {
		results.push(text.substring(position));
	}

	return results;
}

/**
 * Parse text for mentions (@username)
 *
 * Extracts mention markers from text and returns an array of
 * text segments and MentionNodes. Text segments will be further processed
 * for formatting (bold, italic, code).
 *
 * Note: Uses negative lookbehind to not match emails (user@example.com).
 *
 * @param text - Text possibly containing @username syntax
 * @returns Array of strings (text segments) and MentionNodes
 */
function parseTextForMentions(text: string): (string | MentionNode)[] {
	if (!text) return [];

	const results: (string | MentionNode)[] = [];
	let position = 0;

	// Reset regex state for global matching
	const mentionRegex = new RegExp(MENTION_REGEX.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = mentionRegex.exec(text)) !== null) {
		// Add text segment before this mention
		if (match.index > position) {
			results.push(text.substring(position, match.index));
		}

		// Add mention node
		const mentionNode: MentionNode = {
			type: 'mention',
			username: match[1] // username without @
		};

		results.push(mentionNode);
		position = match.index + match[0].length;
	}

	// Add remaining text after last mention
	if (position < text.length) {
		results.push(text.substring(position));
	}

	return results;
}

/**
 * Parse text for hint references ({{hint:id}})
 *
 * Extracts hint reference markers from text and returns an array of
 * text segments and HintReferenceNodes. Text segments will be further processed
 * for formatting (bold, italic, code).
 *
 * @param text - Text possibly containing {{hint:id}} syntax
 * @returns Array of strings (text segments) and HintReferenceNodes
 */
function parseTextForHints(text: string): (string | HintReferenceNode)[] {
	if (!text) return [];

	const results: (string | HintReferenceNode)[] = [];
	let position = 0;

	// Reset regex state for global matching
	const hintRegex = new RegExp(HINT_REFERENCE_REGEX.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = hintRegex.exec(text)) !== null) {
		// Add text segment before this hint reference
		if (match.index > position) {
			results.push(text.substring(position, match.index));
		}

		// Add hint reference node
		const hintNode: HintReferenceNode = {
			type: 'hint-reference',
			hintId: match[1] // hint ID without "hint:" prefix
		};

		results.push(hintNode);
		position = match.index + match[0].length;
	}

	// Add remaining text after last hint reference
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
	// Matches: `code`, -/-strikethrough-/-, ==highlight==, ***bold+italic***, ___bold+italic___, **bold**, __bold__, *italic*, _italic_
	// Order matters: ***bold+italic*** and ___bold+italic___ must come before **bold**, __bold__, *italic*, _italic_
	const formatRegex =
		/(`[^`]+`)|(-\/-)(.+?)-\/-|(==)(.+?)==|(\*\*\*)(.+?)\*\*\*|(___)(.+?)___|(\*\*|__)([^*_]+)\10|(\*|_)([^*_]+)\12/g;
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
			// Strikethrough: -/-content-/-
			nodes.push({
				type: 'text',
				content: match[3],
				strikethrough: true
			});
		} else if (match[4] && match[5]) {
			// Highlight: ==content==
			nodes.push({
				type: 'text',
				content: match[5],
				highlight: true
			});
		} else if (match[6] && match[7]) {
			// Bold+Italic: ***content***
			nodes.push({
				type: 'text',
				content: match[7],
				bold: true,
				italic: true
			});
		} else if (match[8] && match[9]) {
			// Bold+Italic: ___content___
			nodes.push({
				type: 'text',
				content: match[9],
				bold: true,
				italic: true
			});
		} else if (match[10] && match[11]) {
			// Bold: **content** or __content__
			nodes.push({
				type: 'text',
				content: match[11],
				bold: true
			});
		} else if (match[12] && match[13]) {
			// Italic: *content* or _content_
			nodes.push({
				type: 'text',
				content: match[13],
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
 * Parse text formatting (bold, italic, code) with blank, hint, link, hashtag, and mention support
 *
 * Processing pipeline:
 * 1. Extract {{blank:N}} placeholders
 * 2. Extract {{hint:id}} references
 * 3. Extract [text](url) links
 * 4. Extract #hashtags
 * 5. Extract @mentions
 * 6. Parse remaining text for formatting (bold, italic, code)
 *
 * Priority order: blanks > hints > links > hashtags > mentions > code > bold > italic
 *
 * @param text - Plain text possibly with markdown formatting, blanks, hints, links, hashtags, and mentions
 * @returns Array of inline nodes (text, blank, hint-reference, link, hashtag, mention)
 */
function parseTextFormatting(text: string): InlineNode[] {
	if (!text) return [];

	// Step 1: Extract blanks first
	const blankSegments = parseTextForBlanks(text);

	// Step 2-6: Process each segment through the pipeline
	const nodes: InlineNode[] = [];
	for (const blankSegment of blankSegments) {
		if (typeof blankSegment === 'string') {
			// Step 2: Extract hint references from text segment
			const hintSegments = parseTextForHints(blankSegment);

			for (const hintSegment of hintSegments) {
				if (typeof hintSegment === 'string') {
					// Step 3: Extract links from text segment
					const linkSegments = parseTextForLinks(hintSegment);

					for (const linkSegment of linkSegments) {
						if (typeof linkSegment === 'string') {
							// Step 4: Extract hashtags from text segment
							const hashtagSegments = parseTextForHashtags(linkSegment);

							for (const hashtagSegment of hashtagSegments) {
								if (typeof hashtagSegment === 'string') {
									// Step 5: Extract mentions from text segment
									const mentionSegments = parseTextForMentions(hashtagSegment);

									for (const mentionSegment of mentionSegments) {
										if (typeof mentionSegment === 'string') {
											// Step 6: Parse text formatting on remaining text
											const formatted = parseTextFormattingSegment(mentionSegment);
											nodes.push(...formatted);
										} else {
											// MentionNode - add directly
											nodes.push(mentionSegment);
										}
									}
								} else {
									// HashtagNode - add directly
									nodes.push(hashtagSegment);
								}
							}
						} else {
							// LinkNode - add directly
							nodes.push(linkSegment);
						}
					}
				} else {
					// HintReferenceNode - add directly
					nodes.push(hintSegment);
				}
			}
		} else {
			// BlankNode - add directly
			nodes.push(blankSegment);
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
 * Returns an array of BlockNode (paragraphs, code blocks, variation tables, probability trees).
 *
 * Special handling for:
 * - ```variation blocks → parsed as variation-table nodes
 * - ```probtree blocks → parsed as probability-tree nodes
 * - Other code blocks → parsed as code-block nodes
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

		const language = match[2] || undefined;
		const code = match[3];

		// Check for special block types
		if (language === 'variation') {
			// Parse as variation table
			const lines = ['```variation', ...code.split('\n'), '```'];
			const result = parseVariationTable(lines, 0, lines.length - 1);
			if (result.node) {
				blocks.push(result.node);
			}
		} else if (language === 'probtree') {
			// Parse as probability tree
			const lines = ['```probtree', ...code.split('\n'), '```'];
			const result = parseProbabilityTree(lines, 0, lines.length - 1);
			if (result.node) {
				blocks.push(result.node);
			}
		} else {
			// Regular code block
			blocks.push({
				type: 'code-block',
				language,
				code
			});
		}

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
// TABLE PROCESSING
// ============================================================================

/**
 * Restore math placeholders in a string to their original markdown syntax
 *
 * This converts __MATH_0__ back to $expression$ or ~expression~ etc.
 * Used for table cell content which stores strings, not parsed InlineNodes.
 *
 * @param text - Text with placeholders
 * @param placeholders - Math placeholders from extraction
 * @returns Text with placeholders restored to original syntax
 */
function restorePlaceholdersToMarkdown(text: string, placeholders: MathPlaceholder[]): string {
	let result = text;

	for (const p of placeholders) {
		if (result.includes(p.placeholder)) {
			// Restore to original markdown syntax based on type
			const [openDelim, closeDelim] = p.isBlock
				? p.syntax === 'latex'
					? ['$$', '$$']
					: ['~~', '~~']
				: p.syntax === 'latex'
					? ['$', '$']
					: ['~', '~'];

			result = result.replace(p.placeholder, `${openDelim}${p.expression}${closeDelim}`);
		}
	}

	return result;
}

/**
 * Process table to restore math placeholders in cell content
 *
 * Table cells store content as strings, so we restore placeholders
 * to their original markdown syntax for downstream processing.
 *
 * @param table - TableNode to process
 * @param placeholders - Math placeholders from extraction
 * @returns Processed TableNode with placeholders restored in cell content
 */
function processTableCellContent(
	table: import('../types').TableNode,
	placeholders: MathPlaceholder[]
): import('../types').TableNode {
	return {
		...table,
		header: table.header.map((cell) => ({
			...cell,
			content: restorePlaceholdersToMarkdown(cell.content, placeholders)
		})),
		rows: table.rows.map((row) =>
			row.map((cell) => ({
				...cell,
				content: restorePlaceholdersToMarkdown(cell.content, placeholders)
			}))
		)
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
 * Supports standard markdown, linked images, and extended syntax with attributes:
 * - Standard: `![alt](url "title")`
 * - Linked: `[![alt](url)](href)` or `[![alt](url "imgTitle")](href "linkTitle")`
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
 * @example Linked image
 * ```typescript
 * parseImageLine('[![Click](cat.png)](https://example.com)');
 * // { type: 'image', src: 'cat.png', alt: 'Click', href: 'https://example.com' }
 * ```
 *
 * @example Extended syntax
 * ```typescript
 * parseImageLine('![Figure](graph.png){size=large align=center caption="Results"}');
 * // { type: 'image', src: 'graph.png', alt: 'Figure', sizeClass: 'large', alignment: 'center', caption: 'Results' }
 * ```
 */
function parseImageLine(line: string): ImageNode | null {
	// First, try to match linked image: [![alt](src)](href)
	const linkedRegex =
		/\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/;
	const linkedMatch = line.match(linkedRegex);

	if (linkedMatch) {
		const [, alt, src, imgTitle, href, linkTitle, attrsStr] = linkedMatch;

		// Parse extended attributes if present
		const attrs = parseImageAttributes(attrsStr);

		// Build ImageNode with link fields
		const imageNode: ImageNode = {
			type: 'image',
			src: src.trim(),
			alt: alt?.trim() || undefined,
			title: imgTitle?.trim(),
			href: href.trim(),
			linkTitle: linkTitle?.trim()
		};

		// Add extended attributes if present
		if (attrs.sizeClass) imageNode.sizeClass = attrs.sizeClass;
		if (attrs.widthPercent !== undefined) imageNode.widthPercent = attrs.widthPercent;
		if (attrs.alignment) imageNode.alignment = attrs.alignment;
		if (attrs.caption) imageNode.caption = attrs.caption;

		return imageNode;
	}

	// Fall back to standard image: ![alt](src)
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
// VIDEO PARSING
// ============================================================================

/**
 * Video provider detection result
 */
interface VideoProviderInfo {
	provider: 'html5' | 'youtube';
	videoId?: string;
}

/**
 * Detect video provider from URL
 *
 * Analyzes the URL to determine if it's a YouTube video or an HTML5 video file.
 * Extracts YouTube video ID if applicable.
 *
 * @param url - Video URL to analyze
 * @returns Provider information with optional video ID
 *
 * @example YouTube URLs
 * ```typescript
 * detectVideoProvider('https://youtube.com/watch?v=ABC123');
 * // { provider: 'youtube', videoId: 'ABC123' }
 *
 * detectVideoProvider('https://youtu.be/ABC123');
 * // { provider: 'youtube', videoId: 'ABC123' }
 *
 * detectVideoProvider('https://youtube.com/embed/ABC123');
 * // { provider: 'youtube', videoId: 'ABC123' }
 * ```
 *
 * @example HTML5 video files
 * ```typescript
 * detectVideoProvider('video.mp4');
 * // { provider: 'html5' }
 *
 * detectVideoProvider('/assets/demo.webm');
 * // { provider: 'html5' }
 * ```
 */
function detectVideoProvider(url: string): VideoProviderInfo {
	// YouTube patterns
	// Pattern 1: https://youtube.com/watch?v=VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID
	const youtubeWatch = url.match(
		/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/
	);
	if (youtubeWatch) {
		return { provider: 'youtube', videoId: youtubeWatch[1] };
	}

	// Pattern 2: https://youtu.be/VIDEO_ID
	const youtubeShort = url.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/);
	if (youtubeShort) {
		return { provider: 'youtube', videoId: youtubeShort[1] };
	}

	// Pattern 3: https://youtube.com/embed/VIDEO_ID
	const youtubeEmbed = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
	if (youtubeEmbed) {
		return { provider: 'youtube', videoId: youtubeEmbed[1] };
	}

	// Default: HTML5 video
	return { provider: 'html5' };
}

/**
 * Parsed video attributes from extended markdown syntax
 *
 * @internal Used by parseVideoAttributes
 */
interface ParsedVideoAttributes {
	sizeClass?: ImageSizeClass;
	widthPercent?: number;
	alignment?: ImageAlignment;
	controls?: boolean;
	autoplay?: boolean;
	loop?: boolean;
	muted?: boolean;
}

/**
 * Parse video attributes from curly brace syntax
 *
 * Supports the following attributes:
 * - `size=<value>` - Semantic size class (inline, small, medium, large, full)
 * - `width=<value>%` - Width percentage (0-100)
 * - `align=<value>` - Alignment (left, center, right)
 * - `controls` or `controls=true/false` - Show video controls (default: true)
 * - `autoplay` or `autoplay=true/false` - Auto-play video (default: false)
 * - `loop` or `loop=true/false` - Loop video (default: false)
 * - `muted` or `muted=true/false` - Mute video (default: false)
 *
 * @param attrString - Attribute string from inside curly braces
 * @returns Parsed video attributes object
 *
 * @example Boolean attributes
 * ```typescript
 * parseVideoAttributes('controls');
 * // { controls: true }
 *
 * parseVideoAttributes('controls=false');
 * // { controls: false }
 *
 * parseVideoAttributes('autoplay loop muted');
 * // { autoplay: true, loop: true, muted: true }
 * ```
 *
 * @example Combined attributes
 * ```typescript
 * parseVideoAttributes('size=large align=center controls autoplay');
 * // { sizeClass: 'large', alignment: 'center', controls: true, autoplay: true }
 * ```
 */
function parseVideoAttributes(attrString: string | undefined): ParsedVideoAttributes {
	if (!attrString) return { controls: true }; // Default: controls enabled

	const attrs: ParsedVideoAttributes = {};

	// Parse size (same as images)
	const sizeMatch = attrString.match(/size=["']?(\w+)["']?/);
	if (sizeMatch) {
		const size = sizeMatch[1];
		if (VALID_SIZE_CLASSES.includes(size as ImageSizeClass)) {
			attrs.sizeClass = size as ImageSizeClass;
		}
	}

	// Parse width percentage (same as images)
	const widthMatch = attrString.match(/width=["']?(\d+)%?["']?/);
	if (widthMatch) {
		const width = parseInt(widthMatch[1], 10);
		if (width >= 0 && width <= 100) {
			attrs.widthPercent = width;
		}
	}

	// Parse alignment (same as images)
	const alignMatch = attrString.match(/align=["']?(\w+)["']?/);
	if (alignMatch) {
		const align = alignMatch[1];
		if (VALID_ALIGNMENTS.includes(align as ImageAlignment)) {
			attrs.alignment = align as ImageAlignment;
		}
	}

	// Parse boolean attributes: controls, autoplay, loop, muted
	// Support both {controls} (implicit true) and {controls=false} (explicit false)
	const parseBooleanAttr = (name: string): boolean | undefined => {
		// Check for explicit value: attr=true or attr=false
		const explicitMatch = attrString.match(new RegExp(`${name}=["']?(true|false)["']?`));
		if (explicitMatch) {
			return explicitMatch[1] === 'true';
		}

		// Check for implicit true: just the attribute name present
		const implicitMatch = attrString.match(new RegExp(`\\b${name}\\b`));
		if (implicitMatch) {
			return true;
		}

		return undefined;
	};

	const controls = parseBooleanAttr('controls');
	const autoplay = parseBooleanAttr('autoplay');
	const loop = parseBooleanAttr('loop');
	const muted = parseBooleanAttr('muted');

	// Set controls with default value of true
	attrs.controls = controls !== undefined ? controls : true;

	// Only set other boolean attrs if explicitly specified
	if (autoplay !== undefined) attrs.autoplay = autoplay;
	if (loop !== undefined) attrs.loop = loop;
	if (muted !== undefined) attrs.muted = muted;

	return attrs;
}

/**
 * Parse a video from a line
 *
 * Supports video markdown syntax with attributes:
 * - Standard: `!video[alt](url "title")`
 * - Extended: `!video[alt](url "title"){size=medium controls autoplay}`
 *
 * Automatically detects YouTube vs HTML5 videos based on URL.
 *
 * @param line - Line containing video markdown
 * @returns VideoNode or null if no valid video
 *
 * @example HTML5 video
 * ```typescript
 * parseVideoLine('!video[Demo](demo.mp4){controls}');
 * // { type: 'video', src: 'demo.mp4', alt: 'Demo', provider: 'html5', controls: true }
 * ```
 *
 * @example YouTube video
 * ```typescript
 * parseVideoLine('!video[Tutorial](https://youtube.com/watch?v=ABC123){size=large}');
 * // { type: 'video', src: '...', alt: 'Tutorial', provider: 'youtube', videoId: 'ABC123', sizeClass: 'large' }
 * ```
 */
function parseVideoLine(line: string): VideoNode | null {
	const regex = new RegExp(VIDEO_REGEX.source);
	const match = line.match(regex);
	if (!match) return null;

	const [, alt, src, , attrsStr] = match;

	// Detect video provider
	const providerInfo = detectVideoProvider(src);

	// Parse attributes
	const attrs = parseVideoAttributes(attrsStr);

	// Build VideoNode
	const videoNode: VideoNode = {
		type: 'video',
		src: src.trim(),
		alt: alt?.trim() || undefined,
		provider: providerInfo.provider
	};

	// Add YouTube video ID if applicable
	if (providerInfo.videoId) {
		videoNode.videoId = providerInfo.videoId;
	}

	// Add sizing attributes
	if (attrs.sizeClass) videoNode.sizeClass = attrs.sizeClass;
	if (attrs.widthPercent !== undefined) videoNode.widthPercent = attrs.widthPercent;
	if (attrs.alignment) videoNode.alignment = attrs.alignment;

	// Add playback attributes
	if (attrs.controls !== undefined) videoNode.controls = attrs.controls;
	if (attrs.autoplay !== undefined) videoNode.autoplay = attrs.autoplay;
	if (attrs.loop !== undefined) videoNode.loop = attrs.loop;
	if (attrs.muted !== undefined) videoNode.muted = attrs.muted;

	return videoNode;
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
