/**
 * Tests for List Depth Analysis Utilities
 * ========================================
 *
 * Tests for getMaxEnumerateDepth and getEnumerateDepth functions.
 */

import { describe, it, expect } from 'vitest';
import { getMaxEnumerateDepth, getEnumerateDepth } from '../list-depth';
import type { DocumentNode, ListNode, ListItemNode, ParagraphNode } from '../../types/ast';

// Helper to create a paragraph node
function paragraph(text: string): ParagraphNode {
	return {
		type: 'paragraph',
		children: [{ type: 'text', content: text }]
	};
}

// Helper to create a list item with content
function listItem(...children: (ParagraphNode | ListNode)[]): ListItemNode {
	return {
		type: 'list-item',
		children
	};
}

// Helper to create an ordered list
function orderedList(...items: ListItemNode[]): ListNode {
	return {
		type: 'list',
		ordered: true,
		items
	};
}

// Helper to create an unordered list (itemize)
function unorderedList(...items: ListItemNode[]): ListNode {
	return {
		type: 'list',
		ordered: false,
		items
	};
}

// Helper to create a document
function doc(...children: (ParagraphNode | ListNode)[]): DocumentNode {
	return {
		type: 'document',
		children
	};
}

describe('getMaxEnumerateDepth', () => {
	describe('empty/simple documents', () => {
		it('should return 0 for empty document', () => {
			const document = doc();
			expect(getMaxEnumerateDepth(document)).toBe(0);
		});

		it('should return 0 for document without lists', () => {
			const document = doc(paragraph('Hello'), paragraph('World'));
			expect(getMaxEnumerateDepth(document)).toBe(0);
		});

		it('should return 0 for document with only unordered lists', () => {
			const document = doc(
				unorderedList(listItem(paragraph('item 1')), listItem(paragraph('item 2')))
			);
			expect(getMaxEnumerateDepth(document)).toBe(0);
		});
	});

	describe('flat ordered lists', () => {
		it('should return 1 for single flat ordered list', () => {
			const document = doc(
				orderedList(listItem(paragraph('item 1')), listItem(paragraph('item 2')))
			);
			expect(getMaxEnumerateDepth(document)).toBe(1);
		});

		it('should return 1 for multiple flat ordered lists', () => {
			const document = doc(
				orderedList(listItem(paragraph('a'))),
				orderedList(listItem(paragraph('b')))
			);
			expect(getMaxEnumerateDepth(document)).toBe(1);
		});
	});

	describe('nested ordered lists', () => {
		it('should return 2 for two-level nested enumerate', () => {
			const document = doc(
				orderedList(
					listItem(
						paragraph('Question 1'),
						orderedList(listItem(paragraph('a')), listItem(paragraph('b')))
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(2);
		});

		it('should return 3 for three-level nested enumerate', () => {
			const document = doc(
				orderedList(
					listItem(
						paragraph('Question 1'),
						orderedList(
							listItem(
								paragraph('a'),
								orderedList(listItem(paragraph('i')), listItem(paragraph('ii')))
							)
						)
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(3);
		});

		it('should find max depth across siblings', () => {
			// First question has 2 levels, second has 3 levels
			const document = doc(
				orderedList(
					listItem(paragraph('Q1'), orderedList(listItem(paragraph('a')))),
					listItem(
						paragraph('Q2'),
						orderedList(listItem(paragraph('a'), orderedList(listItem(paragraph('i')))))
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(3);
		});
	});

	describe('itemize transparency', () => {
		it('should not count unordered list as a level', () => {
			// enumerate > itemize (should still be depth 1)
			const document = doc(
				orderedList(listItem(paragraph('Q1'), unorderedList(listItem(paragraph('bullet')))))
			);
			expect(getMaxEnumerateDepth(document)).toBe(1);
		});

		it('should correctly track depth through transparent itemize', () => {
			// enumerate (1) > itemize (transparent) > enumerate (2)
			const document = doc(
				orderedList(
					listItem(
						paragraph('Q1'),
						unorderedList(listItem(paragraph('bullet'), orderedList(listItem(paragraph('sub')))))
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(2);
		});

		it('should handle complex nesting with multiple itemize levels', () => {
			// enumerate (1) > itemize > itemize > enumerate (2)
			const document = doc(
				orderedList(
					listItem(
						paragraph('Q1'),
						unorderedList(
							listItem(
								paragraph('bullet 1'),
								unorderedList(
									listItem(paragraph('sub-bullet'), orderedList(listItem(paragraph('numbered'))))
								)
							)
						)
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(2);
		});

		it('should handle enumerate > itemize > enumerate > enumerate correctly', () => {
			// enumerate (1) > itemize (transparent) > enumerate (2) > enumerate (3)
			const document = doc(
				orderedList(
					listItem(
						paragraph('Q1'),
						unorderedList(
							listItem(
								paragraph('bullet'),
								orderedList(listItem(paragraph('a'), orderedList(listItem(paragraph('i')))))
							)
						)
					)
				)
			);
			expect(getMaxEnumerateDepth(document)).toBe(3);
		});
	});
});

describe('getEnumerateDepth', () => {
	it('should increment depth for ordered list', () => {
		const list = orderedList(listItem(paragraph('item')));
		expect(getEnumerateDepth(list, 0)).toBe(1);
		expect(getEnumerateDepth(list, 1)).toBe(2);
		expect(getEnumerateDepth(list, 2)).toBe(3);
	});

	it('should not increment depth for unordered list', () => {
		const list = unorderedList(listItem(paragraph('item')));
		expect(getEnumerateDepth(list, 0)).toBe(0);
		expect(getEnumerateDepth(list, 1)).toBe(1);
		expect(getEnumerateDepth(list, 2)).toBe(2);
	});
});
