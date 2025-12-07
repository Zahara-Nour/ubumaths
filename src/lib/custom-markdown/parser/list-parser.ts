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
			content: content.trim(),
			indent,
			ordered: true,
			startNumber,
			marker: `${marker}.`
		};
	}

	// Try unordered list
	const unorderedMatch = line.match(UNORDERED_LIST_REGEX);
	if (unorderedMatch) {
		const [, spaces, marker, content] = unorderedMatch;
		const indent = getIndentLevel(spaces);

		return {
			content: content.trim(),
			indent,
			ordered: false,
			marker
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
 * list structure with nested lists.
 *
 * @param lines - Array of markdown lines (must be consecutive list items)
 * @returns Array of ListNode AST nodes
 *
 * @example
 * const lines = [
 *   '1. First item',
 *   '2. Second item',
 *   '   a. Nested item',
 *   '   b. Another nested',
 *   '3. Third item'
 * ];
 * const lists = parseList(lines);
 */
export function parseList(lines: string[]): ListNode[] {
	if (lines.length === 0) return [];

	// Parse all lines into raw items
	const rawItems = lines
		.map(parseListItemLine)
		.filter((item): item is RawListItem => item !== null);

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
 * Extract all list blocks from lines
 *
 * This function identifies consecutive list item lines and groups them
 * into separate blocks.
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
 */
export function findListBlocks(lines: string[]): [number, number][] {
	const blocks: [number, number][] = [];
	let blockStart: number | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const isBlank = line.trim() === '';

		if (isListItem(line)) {
			if (blockStart === null) {
				blockStart = i;
			}
		} else if (blockStart !== null && (isBlank || i === lines.length - 1)) {
			// End of list block
			blocks.push([blockStart, i - 1]);
			blockStart = null;
		}
	}

	// Handle case where list goes to end of document
	if (blockStart !== null) {
		blocks.push([blockStart, lines.length - 1]);
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
