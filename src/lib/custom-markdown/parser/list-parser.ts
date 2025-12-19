/**
 * List Parser - Parse Ordered and Unordered Lists
 * ================================================
 *
 * This module parses markdown lists (both ordered and unordered) with support
 * for nested lists and different numbering styles.
 *
 * Supported formats:
 * - Ordered lists: 1. 2. 3. or 1) 2) 3) or a. b. c. or a) b) c)
 * - Unordered lists: - or * or +
 * - Nested lists with indentation (2 or 4 spaces)
 *
 * @module custom-markdown/parser/list-parser
 */

import type { ListNode, ListItemNode } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw list item before AST conversion
 */
interface RawListItem {
	content: string; // Text content (without marker)
	indent: number; // Indentation level (0, 1, 2, ...)
	ordered: boolean; // true for numbered lists
	startNumber?: number; // Starting number for ordered lists
	marker: string; // Original marker (e.g., '1.', '-', 'a)')
	continuations: string[]; // Additional paragraphs for this item (loose list support)
}

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/**
 * Regex for ordered list markers: 1. 2. 3. or 1) 2) 3)
 * Also supports letter numbering: a. b. c. or a) b) c)
 */
const ORDERED_LIST_REGEX = /^(\s*)(\d+|[a-z])[.)]\s+(.*)$/;

/**
 * Regex for unordered list markers: - or * or +
 */
const UNORDERED_LIST_REGEX = /^(\s*)([-*+])\s+(.*)$/;

/**
 * Combined regex to detect any list item
 */
const LIST_ITEM_REGEX = /^(\s*)(?:(\d+|[a-z])[.)]|([-*+]))\s+(.*)$/;

// ============================================================================
// LIST DETECTION
// ============================================================================

/**
 * Check if a line is a list item
 *
 * @param line - Line to check
 * @returns true if line is a list item, false otherwise
 */
export function isListItem(line: string): boolean {
	return LIST_ITEM_REGEX.test(line);
}

/**
 * Get indentation level from leading spaces
 *
 * Convention:
 * - 0 spaces = level 0
 * - 2-3 spaces = level 1
 * - 4-5 spaces = level 2
 * - etc.
 *
 * @param spaces - Leading spaces
 * @returns Indent level (0, 1, 2, ...)
 */
function getIndentLevel(spaces: string): number {
	const count = spaces.length;
	if (count === 0) return 0;
	// Every 2 spaces = 1 level
	return Math.floor(count / 2);
}

/**
 * Parse a single list item line
 *
 * @param line - List item line
 * @returns Parsed list item or null if not a valid list item
 */
function parseListItemLine(line: string): RawListItem | null {
	// Try ordered list first
	const orderedMatch = line.match(ORDERED_LIST_REGEX);
	if (orderedMatch) {
		const [, spaces, marker, content] = orderedMatch;
		const indent = getIndentLevel(spaces);

		// Determine start number
		let startNumber = 1;
		if (/^\d+$/.test(marker)) {
			// Numeric marker
			startNumber = Number.parseInt(marker, 10);
		} else {
			// Letter marker (a=1, b=2, etc.)
			startNumber = marker.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
		}

		return {
			// Only trim leading whitespace - trailing spaces may be significant for hardbreaks
			content: content.trimStart(),
			indent,
			ordered: true,
			startNumber,
			marker: `${marker}.`,
			continuations: []
		};
	}

	// Try unordered list
	const unorderedMatch = line.match(UNORDERED_LIST_REGEX);
	if (unorderedMatch) {
		const [, spaces, marker, content] = unorderedMatch;
		const indent = getIndentLevel(spaces);

		return {
			// Only trim leading whitespace - trailing spaces may be significant for hardbreaks
			content: content.trimStart(),
			indent,
			ordered: false,
			marker,
			continuations: []
		};
	}

	return null;
}

// ============================================================================
// LIST PARSING
// ============================================================================

/**
 * Parse consecutive list items into a list structure
 *
 * This function takes an array of lines and parses them into a hierarchical
 * list structure with nested lists. Supports "loose lists" where items can
 * have additional paragraphs separated by blank lines.
 *
 * @param lines - Array of markdown lines (may include list items, blank lines, and continuation content)
 * @returns Array of ListNode AST nodes
 *
 * @example Simple list
 * const lines = [
 *   '1. First item',
 *   '2. Second item',
 *   '   a. Nested item',
 *   '   b. Another nested',
 *   '3. Third item'
 * ];
 * const lists = parseList(lines);
 *
 * @example Loose list with continuation
 * const lines = [
 *   '1. First paragraph of item 1',
 *   '',
 *   '   Second paragraph of item 1',
 *   '2. Item 2'
 * ];
 * const lists = parseList(lines);
 */
export function parseList(lines: string[]): ListNode[] {
	if (lines.length === 0) return [];

	// Parse lines into raw items, collecting continuation content
	const rawItems: RawListItem[] = [];
	let currentItem: RawListItem | null = null;
	let pendingContinuation: string[] = [];

	// Track code fence state to handle blank lines inside code blocks
	let inCodeFence = false;
	let codeFenceChar = '';

	for (const line of lines) {
		const isBlank = line.trim() === '';
		const parsed = parseListItemLine(line);

		if (parsed) {
			// This is a new list item
			// First, save any pending continuation to the previous item
			if (currentItem && pendingContinuation.length > 0) {
				currentItem.continuations.push(pendingContinuation.join('\n').trim());
				pendingContinuation = [];
			}
			currentItem = parsed;
			rawItems.push(currentItem);
			// Reset code fence state for new item
			inCodeFence = false;
			codeFenceChar = '';
		} else if (currentItem && !isBlank) {
			// This is a continuation line (indented content after a list item)
			// Remove only the list continuation indent (2-3 spaces), preserving any additional
			// indentation (important for code blocks where internal indent is meaningful)
			const trimmed = line.replace(/^[ ]{2,3}/, '');

			// Check if this continuation follows a hardbreak (line ending with \)
			// If so, append to the existing content/continuation instead of starting new paragraph
			const lastContent =
				pendingContinuation.length > 0
					? pendingContinuation[pendingContinuation.length - 1]
					: currentItem.content;

			if (lastContent.endsWith('\\')) {
				// Hardbreak continuation - append to the same paragraph
				if (pendingContinuation.length > 0) {
					pendingContinuation[pendingContinuation.length - 1] += '\n' + trimmed;
				} else {
					currentItem.content += '\n' + trimmed;
				}
			} else {
				// Normal continuation - add to pending
				pendingContinuation.push(trimmed);
			}

			// Check for code fence markers (``` or ~~~)
			const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
			if (fenceMatch) {
				const fenceType = fenceMatch[1][0]; // Get the fence character (` or ~)
				if (!inCodeFence) {
					// Opening fence
					inCodeFence = true;
					codeFenceChar = fenceType;
				} else if (fenceType === codeFenceChar) {
					// Closing fence (must match opening type)
					inCodeFence = false;
					codeFenceChar = '';
				}
				// If fenceType doesn't match codeFenceChar, it's content inside the code block
			}
		} else if (isBlank && pendingContinuation.length > 0) {
			// Blank line - behavior depends on whether we're inside a code fence
			if (inCodeFence) {
				// Inside a code fence, blank lines are part of the code
				pendingContinuation.push('');
			} else {
				// Outside code fence - save current continuation paragraph
				if (currentItem) {
					currentItem.continuations.push(pendingContinuation.join('\n').trim());
					pendingContinuation = [];
				}
			}
		}
		// Blank lines between items (with no pending continuation) are just skipped
	}

	// Don't forget to save the last pending continuation
	if (currentItem && pendingContinuation.length > 0) {
		currentItem.continuations.push(pendingContinuation.join('\n').trim());
	}

	if (rawItems.length === 0) return [];

	// Build hierarchical structure
	return buildListHierarchy(rawItems);
}

/**
 * Build hierarchical list structure from flat raw items
 *
 * This is the core algorithm that converts flat list items with indent levels
 * into a nested list structure.
 *
 * Algorithm:
 * 1. Group consecutive items at the same indent level and type
 * 2. For each group, create a ListNode
 * 3. Recursively process nested items within each item
 *
 * @param items - Flat array of raw list items
 * @param baseIndent - Base indentation level (for recursion)
 * @returns Array of ListNode AST nodes
 */
function buildListHierarchy(items: RawListItem[], baseIndent: number = 0): ListNode[] {
	const lists: ListNode[] = [];
	let currentList: ListNode | null = null;

	let i = 0;
	while (i < items.length) {
		const item = items[i];

		// Skip items that are more indented than expected (will be handled as nested)
		if (item.indent < baseIndent) {
			// This item belongs to a parent level, stop here
			break;
		}

		if (item.indent > baseIndent) {
			// This is a nested item, should be handled by parent
			i++;
			continue;
		}

		// Item at current level
		// Check if we need to start a new list (different type)
		if (!currentList || currentList.ordered !== item.ordered) {
			// Create new list
			currentList = {
				type: 'list',
				ordered: item.ordered,
				start: item.ordered ? item.startNumber : undefined,
				items: []
			};
			lists.push(currentList);
		}

		// Create list item
		const listItem: ListItemNode = {
			type: 'list-item',
			children: []
		};

		// Add text content as a paragraph (simplified - will be enhanced in main parser)
		listItem.children.push({
			type: 'paragraph',
			children: [
				{
					type: 'text',
					content: item.content
				}
			]
		});

		// Add continuation paragraphs (for loose lists)
		for (const continuation of item.continuations) {
			if (continuation) {
				listItem.children.push({
					type: 'paragraph',
					children: [
						{
							type: 'text',
							content: continuation
						}
					]
				});
			}
		}

		// Look ahead for nested items
		const nestedItems: RawListItem[] = [];
		let j = i + 1;
		while (j < items.length && items[j].indent > item.indent) {
			nestedItems.push(items[j]);
			j++;
		}

		// Recursively parse nested items
		if (nestedItems.length > 0) {
			const nestedLists = buildListHierarchy(nestedItems, item.indent + 1);
			listItem.children.push(...nestedLists);
			i = j; // Skip the nested items we just processed
		} else {
			i++;
		}

		currentList.items.push(listItem);
	}

	return lists;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a line is a continuation of a list item (indented content)
 *
 * In CommonMark, a line with 2+ spaces of indentation following a list item
 * is considered a continuation of that item (loose list support).
 * This includes code fence markers (``` or ~~~) that are indented.
 *
 * @param line - Line to check
 * @returns true if line is indented continuation content
 */
function isListContinuation(line: string): boolean {
	// Check if line starts with at least 2 spaces and has non-whitespace content
	// This includes indented code fences like "   ```python"
	return /^[ ]{2,}\S/.test(line);
}

/**
 * Extract all list blocks from lines
 *
 * This function identifies consecutive list item lines and groups them
 * into separate blocks. Supports "loose lists" where items can have
 * blank lines followed by indented continuation paragraphs.
 *
 * @param lines - Array of all markdown lines
 * @returns Array of line index ranges for each list block
 *
 * @example
 * const lines = [
 *   'Some text',
 *   '1. Item 1',
 *   '2. Item 2',
 *   '',
 *   'More text',
 *   '- Item A',
 *   '- Item B'
 * ];
 * const blocks = findListBlocks(lines);
 * // Returns: [[1, 2], [5, 6]]
 *
 * @example Loose list with continuation
 * const lines = [
 *   '1. First item',
 *   '',
 *   '   Continuation paragraph',
 *   '2. Second item'
 * ];
 * const blocks = findListBlocks(lines);
 * // Returns: [[0, 3]] - all lines belong to the same list
 */
export function findListBlocks(lines: string[]): [number, number][] {
	const blocks: [number, number][] = [];
	let blockStart: number | null = null;
	let lastItemEnd: number = -1;
	let currentListOrdered: boolean | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const isBlank = line.trim() === '';

		if (isListItem(line)) {
			const isOrdered = ORDERED_LIST_REGEX.test(line);

			if (blockStart === null) {
				blockStart = i;
				currentListOrdered = isOrdered;
			} else if (currentListOrdered !== isOrdered) {
				// Different list type - start new block
				blocks.push([blockStart, lastItemEnd]);
				blockStart = i;
				currentListOrdered = isOrdered;
			}
			lastItemEnd = i;
		} else if (blockStart !== null) {
			if (isBlank) {
				// Blank line - check if the list continues
				let j = i + 1;
				while (j < lines.length && lines[j].trim() === '') {
					j++; // Skip multiple blank lines
				}

				if (j < lines.length) {
					const nextLine = lines[j];
					if (isListContinuation(nextLine)) {
						// List continues with indented continuation paragraph
						continue;
					} else if (isListItem(nextLine)) {
						// Check if it's the same list type
						const nextIsOrdered = ORDERED_LIST_REGEX.test(nextLine);
						if (nextIsOrdered === currentListOrdered) {
							// Same type - continue the list (loose list)
							continue;
						}
					}
				}
				// List ends here
				blocks.push([blockStart, lastItemEnd]);
				blockStart = null;
				currentListOrdered = null;
			} else if (isListContinuation(line)) {
				// Indented continuation content - extend the block
				lastItemEnd = i;
			} else {
				// Non-list, non-indented content - end the block
				blocks.push([blockStart, lastItemEnd]);
				blockStart = null;
				currentListOrdered = null;
			}
		}
	}

	// Handle case where list goes to end of document
	if (blockStart !== null) {
		blocks.push([blockStart, lastItemEnd]);
	}

	return blocks;
}

/**
 * Check if a list is completely ordered or unordered
 *
 * Useful for validation and normalization.
 *
 * @param list - ListNode to check
 * @returns 'ordered' | 'unordered' | 'mixed'
 */
export function getListType(list: ListNode): 'ordered' | 'unordered' | 'mixed' {
	const hasOrdered = list.ordered;

	// Check nested lists
	const nestedTypes = new Set<boolean>();
	nestedTypes.add(hasOrdered);

	function checkNested(items: ListItemNode[]) {
		for (const item of items) {
			for (const child of item.children) {
				if (child.type === 'list') {
					nestedTypes.add(child.ordered);
					checkNested(child.items);
				}
			}
		}
	}

	checkNested(list.items);

	if (nestedTypes.size === 1) {
		return hasOrdered ? 'ordered' : 'unordered';
	}

	return 'mixed';
}

/**
 * Get the total number of items in a list (including nested)
 *
 * @param list - ListNode to count
 * @returns Total item count
 */
export function countListItems(list: ListNode): number {
	let count = list.items.length;

	for (const item of list.items) {
		for (const child of item.children) {
			if (child.type === 'list') {
				count += countListItems(child);
			}
		}
	}

	return count;
}

/**
 * Flatten a nested list into a flat array of items
 *
 * Useful for converting nested lists to a simple enumeration.
 *
 * @param list - ListNode to flatten
 * @returns Array of item contents (strings)
 */
export function flattenList(list: ListNode): string[] {
	const items: string[] = [];

	function traverse(listNode: ListNode) {
		for (const item of listNode.items) {
			// Extract text content from paragraphs
			for (const child of item.children) {
				if (child.type === 'paragraph') {
					const text = child.children
						.filter((n) => n.type === 'text')
						.map((n) => (n.type === 'text' ? n.content : ''))
						.join('');
					if (text) items.push(text);
				} else if (child.type === 'list') {
					traverse(child);
				}
			}
		}
	}

	traverse(list);
	return items;
}
