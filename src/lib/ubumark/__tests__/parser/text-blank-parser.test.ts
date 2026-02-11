/**
 * Tests for [_] text blank parsing in ubumark
 *
 * Validates:
 * 1. [_] is parsed as a BlankNode with auto-incremented index
 * 2. [_] numbering continues from {{blank:N}} sequence
 * 3. Multiple [_] in a paragraph get consecutive indices
 * 4. [_] inside backticks (code) is NOT parsed as a blank
 * 5. [_] and {{blank:N}} coexist in the same statement
 * 6. ? inside MathInlineNode are NOT treated by the parser
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { ParagraphNode, BlankNode, InlineNode, TextNode } from '../../types/ast';

/** Helper to extract all inline nodes from a parsed document */
function getInlineNodes(markdown: string): InlineNode[] {
	const doc = parseMarkdown(markdown);
	const nodes: InlineNode[] = [];

	for (const block of doc.children) {
		if (block.type === 'paragraph') {
			nodes.push(...(block as ParagraphNode).children);
		}
	}

	return nodes;
}

/** Helper to extract all BlankNodes from parsed markdown */
function getBlankNodes(markdown: string): BlankNode[] {
	return getInlineNodes(markdown).filter((n): n is BlankNode => n.type === 'blank');
}

describe('[_] text blank parsing', () => {
	it('should parse single [_] as a BlankNode', () => {
		const blanks = getBlankNodes('Le nombre est [_].');
		expect(blanks).toHaveLength(1);
		expect(blanks[0].type).toBe('blank');
		expect(blanks[0].index).toBe(0);
	});

	it('should parse multiple [_] with consecutive indices', () => {
		const blanks = getBlankNodes('Le [_] de [_] est [_].');
		expect(blanks).toHaveLength(3);
		expect(blanks[0].index).toBe(0);
		expect(blanks[1].index).toBe(1);
		expect(blanks[2].index).toBe(2);
	});

	it('should number [_] after {{blank:N}} indices', () => {
		const blanks = getBlankNodes('{{blank:0}} plus [_]');
		expect(blanks).toHaveLength(2);
		expect(blanks[0].index).toBe(0); // explicit
		expect(blanks[1].index).toBe(1); // auto
	});

	it('should number [_] continuing from highest {{blank:N}}', () => {
		const blanks = getBlankNodes('{{blank:2}} plus [_] et [_]');
		expect(blanks).toHaveLength(3);
		expect(blanks[0].index).toBe(2); // explicit
		expect(blanks[1].index).toBe(3); // auto (2+1)
		expect(blanks[2].index).toBe(4); // auto (2+2)
	});

	it('should NOT parse [_] inside backticks as a blank', () => {
		const nodes = getInlineNodes('Use `[_]` for blanks');
		const blanks = nodes.filter((n) => n.type === 'blank');
		expect(blanks).toHaveLength(0);
	});

	it('should coexist with {{blank:N}} in the same text', () => {
		const blanks = getBlankNodes('{{blank:0}} et {{blank:1}} puis [_]');
		expect(blanks).toHaveLength(3);
		expect(blanks[0].index).toBe(0);
		expect(blanks[1].index).toBe(1);
		expect(blanks[2].index).toBe(2);
	});

	it('should NOT treat ? in math as a blank (left for Phase 3)', () => {
		// ? inside $...$ should remain as-is (no BlankNode)
		const nodes = getInlineNodes('Calculate $? + ?$');
		const blanks = nodes.filter((n) => n.type === 'blank');
		expect(blanks).toHaveLength(0);
	});

	it('should produce text around [_] as TextNodes', () => {
		const nodes = getInlineNodes('A [_] B');
		expect(nodes).toHaveLength(3);
		expect((nodes[0] as TextNode).type).toBe('text');
		expect((nodes[0] as TextNode).content).toBe('A ');
		expect(nodes[1].type).toBe('blank');
		expect((nodes[2] as TextNode).type).toBe('text');
		expect((nodes[2] as TextNode).content).toBe(' B');
	});

	it('should handle [_] at start and end of text', () => {
		const blanks = getBlankNodes('[_] est [_]');
		expect(blanks).toHaveLength(2);
		expect(blanks[0].index).toBe(0);
		expect(blanks[1].index).toBe(1);
	});

	it('should handle adjacent [_] without space', () => {
		const blanks = getBlankNodes('[_][_]');
		expect(blanks).toHaveLength(2);
		expect(blanks[0].index).toBe(0);
		expect(blanks[1].index).toBe(1);
	});
});
