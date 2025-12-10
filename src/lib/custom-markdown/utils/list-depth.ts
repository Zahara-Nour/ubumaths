/**
 * List Depth Analysis Utilities
 * =============================
 *
 * Functions for analyzing ordered list (enumerate) depth in AST.
 * Used for auto-detection of numbering schemes.
 *
 * Key concept: Unordered lists (itemize) are "transparent" - they don't
 * count in the enumerate depth hierarchy.
 *
 * @example
 * ```
 * enumerate     -> depth 1
 *   enumerate   -> depth 2
 *     itemize   -> still depth 2 (itemize is transparent)
 *       enumerate -> depth 3
 * ```
 */

import type { ASTNode, BlockNode, DocumentNode, ListItemNode, ListNode } from '../types/ast';

/**
 * Get the maximum depth of ordered lists in the document.
 * Unordered lists are transparent (don't increment depth).
 *
 * @param node - The document or block node to analyze
 * @returns The maximum enumerate depth found (0 if no ordered lists)
 */
export function getMaxEnumerateDepth(node: DocumentNode | BlockNode): number {
	if (node.type === 'document') {
		return Math.max(0, ...node.children.map((child) => getMaxEnumerateDepth(child)));
	}

	if (node.type === 'list') {
		return getMaxDepthInList(node, 0);
	}

	// Other block types: check children if they exist
	if ('children' in node && Array.isArray(node.children)) {
		return Math.max(0, ...node.children.map((child) => getMaxEnumerateDepthFromNode(child)));
	}

	return 0;
}

/**
 * Get max enumerate depth from any AST node.
 */
function getMaxEnumerateDepthFromNode(node: ASTNode): number {
	if (node.type === 'list') {
		return getMaxDepthInList(node, 0);
	}

	if (node.type === 'list-item') {
		return Math.max(0, ...node.children.map((child) => getMaxEnumerateDepthFromNode(child)));
	}

	// Inline nodes don't contain lists
	return 0;
}

/**
 * Recursively compute max depth within a list.
 *
 * @param list - The list node to analyze
 * @param currentDepth - Current enumerate depth before this list
 * @returns Maximum enumerate depth found
 */
function getMaxDepthInList(list: ListNode, currentDepth: number): number {
	// Only ordered lists increment the depth
	const depthAtThisList = list.ordered ? currentDepth + 1 : currentDepth;

	let maxDepth = depthAtThisList;

	for (const item of list.items) {
		for (const child of item.children) {
			if (child.type === 'list') {
				const childDepth = getMaxDepthInList(child, depthAtThisList);
				maxDepth = Math.max(maxDepth, childDepth);
			} else if (child.type === 'list-item') {
				// Shouldn't happen (list items are inside lists), but handle gracefully
				const itemDepth = getMaxEnumerateDepthFromListItem(child, depthAtThisList);
				maxDepth = Math.max(maxDepth, itemDepth);
			}
		}
	}

	return maxDepth;
}

/**
 * Get max depth from list item children.
 */
function getMaxEnumerateDepthFromListItem(item: ListItemNode, currentDepth: number): number {
	let maxDepth = currentDepth;

	for (const child of item.children) {
		if (child.type === 'list') {
			const childDepth = getMaxDepthInList(child, currentDepth);
			maxDepth = Math.max(maxDepth, childDepth);
		}
	}

	return maxDepth;
}

/**
 * Determine the effective enumerate depth for a list node during rendering.
 * Itemize lists don't increment depth, enumerate lists do.
 *
 * @param list - The list being rendered
 * @param parentEnumerateDepth - The enumerate depth of the parent context
 * @returns The enumerate depth for this list's items
 */
export function getEnumerateDepth(list: ListNode, parentEnumerateDepth: number): number {
	return list.ordered ? parentEnumerateDepth + 1 : parentEnumerateDepth;
}
