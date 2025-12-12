/**
 * List Parser Tests
 * ==================
 *
 * Unit tests for the list parsing module.
 */

import { describe, it, expect } from 'vitest';
import {
	isListItem,
	parseList,
	findListBlocks,
	getListType,
	countListItems,
	flattenList
} from '../../parser/list-parser';

describe('isListItem', () => {
	it('should identify ordered list items with dot', () => {
		expect(isListItem('1. First item')).toBe(true);
		expect(isListItem('2. Second item')).toBe(true);
		expect(isListItem('10. Tenth item')).toBe(true);
	});

	it('should identify ordered list items with parenthesis', () => {
		expect(isListItem('1) First item')).toBe(true);
		expect(isListItem('2) Second item')).toBe(true);
	});

	it('should identify letter-numbered lists', () => {
		expect(isListItem('a. First')).toBe(true);
		expect(isListItem('b) Second')).toBe(true);
		expect(isListItem('z. Last')).toBe(true);
	});

	it('should identify unordered list items', () => {
		expect(isListItem('- Item')).toBe(true);
		expect(isListItem('* Item')).toBe(true);
		expect(isListItem('+ Item')).toBe(true);
	});

	it('should identify indented list items', () => {
		expect(isListItem('  - Indented')).toBe(true);
		expect(isListItem('    1. Double indented')).toBe(true);
	});

	it('should reject non-list items', () => {
		expect(isListItem('Just text')).toBe(false);
		expect(isListItem('1.No space')).toBe(false);
		expect(isListItem('a.2. Mixed')).toBe(false);
	});
});

describe('parseList', () => {
	it('should parse simple ordered list', () => {
		const lines = ['1. First item', '2. Second item', '3. Third item'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].ordered).toBe(true);
		expect(lists[0].items).toHaveLength(3);
	});

	it('should parse simple unordered list', () => {
		const lines = ['- First item', '- Second item', '- Third item'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].ordered).toBe(false);
		expect(lists[0].items).toHaveLength(3);
	});

	it('should parse nested lists', () => {
		const lines = ['1. First item', '  a. Nested item', '  b. Another nested', '2. Second item'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
		// Check that first item has nested list
		expect(lists[0].items[0].children).toHaveLength(2); // Paragraph + nested list
	});

	it('should parse list with different markers', () => {
		const lines = ['- First', '* Second', '+ Third'];

		const lists = parseList(lines);

		// All should be in same list since they're all unordered
		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(3);
	});

	it('should handle letter-numbered lists', () => {
		const lines = ['a. First', 'b. Second', 'c. Third'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].ordered).toBe(true);
		expect(lists[0].start).toBe(1); // 'a' = 1
	});

	it('should handle empty input', () => {
		const lists = parseList([]);
		expect(lists).toHaveLength(0);
	});

	it('should parse deeply nested lists', () => {
		const lines = [
			'1. Level 1',
			'  a. Level 2',
			'    - Level 3',
			'    - Level 3',
			'  b. Level 2',
			'2. Level 1'
		];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
	});

	it('should preserve list item content', () => {
		const lines = ['1. First item with text', '2. Second item with more text'];

		const lists = parseList(lines);

		// Extract text from first item
		const firstItem = lists[0].items[0];
		const paragraph = firstItem.children[0];
		if (paragraph.type === 'paragraph') {
			const textNode = paragraph.children[0];
			if (textNode.type === 'text') {
				expect(textNode.content).toBe('First item with text');
			}
		}
	});
});

describe('findListBlocks', () => {
	it('should find single list block', () => {
		const lines = ['Text', '1. Item 1', '2. Item 2', '', 'More text'];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([1, 2]);
	});

	it('should find multiple list blocks', () => {
		const lines = [
			'Text',
			'1. First list',
			'2. Item 2',
			'',
			'More text',
			'- Second list',
			'- Item 2',
			''
		];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual([1, 2]);
		expect(blocks[1]).toEqual([5, 6]);
	});

	it('should handle list at start of document', () => {
		const lines = ['1. First', '2. Second', '', 'Text'];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][0]).toBe(0);
	});

	it('should handle list at end of document', () => {
		const lines = ['Text', '', '1. First', '2. Second'];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][1]).toBe(3);
	});

	it('should handle no lists', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle consecutive lists with blank line', () => {
		const lines = ['1. First list', '', '- Second list'];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(2);
	});

	it('should include loose list continuation paragraphs', () => {
		// This is a "loose list" where item 4 has a continuation paragraph
		const lines = ['4. First paragraph of item', '', '   Continuation paragraph', '5. Next item'];

		const blocks = findListBlocks(lines);

		// Should be a single block containing all lines
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([0, 3]);
	});

	it('should handle multiple continuation paragraphs', () => {
		const lines = [
			'1. Item one',
			'',
			'   First continuation',
			'',
			'   Second continuation',
			'2. Item two'
		];

		const blocks = findListBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([0, 5]);
	});
});

describe('parseList with loose lists', () => {
	it('should parse loose list with continuation paragraph', () => {
		const lines = ['1. First paragraph', '', '   Continuation paragraph', '2. Second item'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);

		// First item should have 2 paragraphs
		const firstItem = lists[0].items[0];
		expect(firstItem.children).toHaveLength(2);
		expect(firstItem.children[0].type).toBe('paragraph');
		expect(firstItem.children[1].type).toBe('paragraph');
	});

	it('should preserve continuation content', () => {
		const lines = ['1. Question?', '', '   Interpret the result.', '2. Next question'];

		const lists = parseList(lines);
		const firstItem = lists[0].items[0];

		// Check first paragraph
		const firstPara = firstItem.children[0];
		expect(firstPara.type).toBe('paragraph');
		if (firstPara.type === 'paragraph') {
			const textNode = firstPara.children[0];
			expect(textNode.type).toBe('text');
			if (textNode.type === 'text') {
				expect(textNode.content).toBe('Question?');
			}
		}

		// Check continuation paragraph
		const secondPara = firstItem.children[1];
		expect(secondPara.type).toBe('paragraph');
		if (secondPara.type === 'paragraph') {
			const textNode = secondPara.children[0];
			expect(textNode.type).toBe('text');
			if (textNode.type === 'text') {
				expect(textNode.content).toBe('Interpret the result.');
			}
		}
	});
});

describe('getListType', () => {
	it('should identify ordered list', () => {
		const lines = ['1. Item 1', '2. Item 2'];
		const lists = parseList(lines);

		expect(getListType(lists[0])).toBe('ordered');
	});

	it('should identify unordered list', () => {
		const lines = ['- Item 1', '- Item 2'];
		const lists = parseList(lines);

		expect(getListType(lists[0])).toBe('unordered');
	});

	it('should identify mixed list', () => {
		const lines = ['1. Ordered', '  - Unordered nested'];
		const lists = parseList(lines);

		expect(getListType(lists[0])).toBe('mixed');
	});
});

describe('countListItems', () => {
	it('should count simple list items', () => {
		const lines = ['1. Item 1', '2. Item 2', '3. Item 3'];
		const lists = parseList(lines);

		expect(countListItems(lists[0])).toBe(3);
	});

	it('should count nested list items', () => {
		const lines = ['1. Item 1', '  a. Nested 1', '  b. Nested 2', '2. Item 2'];
		const lists = parseList(lines);

		// Should count parent items + nested items
		const count = countListItems(lists[0]);
		expect(count).toBeGreaterThanOrEqual(2); // At least 2 parent items
	});

	it('should count deeply nested items', () => {
		const lines = [
			'1. Level 1',
			'  a. Level 2',
			'    - Level 3',
			'    - Level 3',
			'  b. Level 2',
			'2. Level 1'
		];
		const lists = parseList(lines);

		const count = countListItems(lists[0]);
		expect(count).toBeGreaterThan(2);
	});
});

describe('flattenList', () => {
	it('should flatten simple list', () => {
		const lines = ['1. First', '2. Second', '3. Third'];
		const lists = parseList(lines);

		const flat = flattenList(lists[0]);

		expect(flat).toHaveLength(3);
		expect(flat[0]).toBe('First');
		expect(flat[1]).toBe('Second');
		expect(flat[2]).toBe('Third');
	});

	it('should flatten nested list', () => {
		const lines = ['1. Parent 1', '  a. Child 1', '  b. Child 2', '2. Parent 2'];
		const lists = parseList(lines);

		const flat = flattenList(lists[0]);

		expect(flat.length).toBeGreaterThanOrEqual(2);
		expect(flat).toContain('Parent 1');
		expect(flat).toContain('Parent 2');
	});

	it('should handle empty list', () => {
		const lines: string[] = [];
		const lists = parseList(lines);

		expect(lists).toHaveLength(0);
	});
});

describe('Edge Cases', () => {
	it('should handle list items with special characters', () => {
		const lines = ['1. Item with $math$', '2. Item with **bold**', '3. Item with [link](url)'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(3);
	});

	it('should handle very long list items', () => {
		const longText = 'a'.repeat(500);
		const lines = [`1. ${longText}`, `2. ${longText}`];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
	});

	it('should handle list starting with high number', () => {
		const lines = ['99. Item', '100. Item'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].ordered).toBe(true);
		expect(lists[0].start).toBe(99);
	});

	it('should handle mixed indentation levels', () => {
		const lines = ['1. Item', '    a. Four spaces', '  b. Two spaces'];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		// Should handle different indentation gracefully
	});

	it('should preserve code blocks with blank lines in list continuations', () => {
		const lines = [
			'1. Item with code:',
			'   ```python',
			'   def foo():',
			'       pass',
			'',
			'   def bar():',
			'       pass',
			'   ```',
			'2. Second item'
		];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
		// First item should have the code block as continuation
		const firstItem = lists[0].items[0];
		expect(firstItem.children.length).toBeGreaterThanOrEqual(1);
		// The continuation should contain the complete code block with blank line preserved
		if (firstItem.continuations && firstItem.continuations.length > 0) {
			const continuation = firstItem.continuations[0];
			expect(continuation).toContain('```python');
			expect(continuation).toContain('def foo()');
			expect(continuation).toContain('def bar()');
		}
	});

	it('should handle multiple consecutive code blocks in list item', () => {
		const lines = [
			'1. Multiple code blocks:',
			'   ```',
			'   code1',
			'   ```',
			'',
			'   ```python',
			'   code2',
			'   ```',
			'',
			'   ~~~bash',
			'   code3',
			'   ~~~',
			'',
			'   Text after code',
			'2. Next item'
		];

		const lists = parseList(lines);

		expect(lists).toHaveLength(1);
		expect(lists[0].items).toHaveLength(2);
		// Check that code blocks are collected properly
		// First item should have children: main paragraph + continuation paragraphs
		const firstItem = lists[0].items[0];
		// Main paragraph + at least one continuation (code blocks and text after)
		expect(firstItem.children.length).toBeGreaterThanOrEqual(2);
	});
});
