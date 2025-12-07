/**
 * Blockquote Parser Tests
 * ========================
 *
 * Unit tests for the blockquote parsing module.
 */

import { describe, it, expect } from 'vitest';
import {
	isBlockquoteLine,
	findBlockquoteBlocks,
	parseBlockquote,
	extractBlockquoteContent,
	getBlockquoteLevel,
	hasNestedBlockquotes,
	normalizeBlockquoteLines
} from '../../parser/blockquote-parser';

describe('isBlockquoteLine', () => {
	it('should identify simple blockquote lines', () => {
		expect(isBlockquoteLine('> texte')).toBe(true);
		expect(isBlockquoteLine('> Hello world')).toBe(true);
		expect(isBlockquoteLine('> ')).toBe(true);
		expect(isBlockquoteLine('>')).toBe(true);
	});

	it('should identify blockquotes without space after marker', () => {
		expect(isBlockquoteLine('>texte')).toBe(true);
		expect(isBlockquoteLine('>no space')).toBe(true);
	});

	it('should identify nested blockquotes', () => {
		expect(isBlockquoteLine('>> nested')).toBe(true);
		expect(isBlockquoteLine('>>> deep')).toBe(true);
		expect(isBlockquoteLine('>>>>very deep')).toBe(true);
	});

	it('should identify indented blockquotes', () => {
		expect(isBlockquoteLine('  > Indented')).toBe(true);
		expect(isBlockquoteLine('    > Double indented')).toBe(true);
	});

	it('should reject non-blockquote lines', () => {
		expect(isBlockquoteLine('Just text')).toBe(false);
		expect(isBlockquoteLine('Normal paragraph')).toBe(false);
		expect(isBlockquoteLine('')).toBe(false);
		expect(isBlockquoteLine('   ')).toBe(false);
	});

	it('should reject lines with > in the middle', () => {
		expect(isBlockquoteLine('This > is not a quote')).toBe(false);
		expect(isBlockquoteLine('a > b > c')).toBe(false);
		expect(isBlockquoteLine('text > more text')).toBe(false);
	});

	it('should reject lines with > after text', () => {
		expect(isBlockquoteLine('Text then >')).toBe(false);
		expect(isBlockquoteLine('5 > 3')).toBe(false);
	});
});

describe('findBlockquoteBlocks', () => {
	it('should find single blockquote block', () => {
		const lines = ['Text', '> Quote line 1', '> Quote line 2', 'More text'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([1, 2]);
	});

	it('should find multiple separated blockquote blocks', () => {
		const lines = [
			'Text',
			'> First quote',
			'> More first',
			'',
			'Normal text',
			'> Second quote',
			'>> Nested'
		];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual([1, 2]);
		expect(blocks[1]).toEqual([5, 6]);
	});

	it('should handle blockquote at start of document', () => {
		const lines = ['> First', '> Second', '', 'Text'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][0]).toBe(0);
	});

	it('should handle blockquote at end of document', () => {
		const lines = ['Text', '', '> First', '> Second'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0][1]).toBe(3);
	});

	it('should handle consecutive blockquotes separated by non-quote line', () => {
		const lines = ['> First quote', '', '> Second quote'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(2);
	});

	it('should handle no blockquotes', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle single line blockquote', () => {
		const lines = ['Text', '> Single quote', 'More text'];

		const blocks = findBlockquoteBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([1, 1]);
	});
});

describe('parseBlockquote', () => {
	it('should parse simple single line blockquote', () => {
		const lines = ['> Hello world'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
		expect(result.children).toEqual([]);
	});

	it('should parse multi-line blockquote', () => {
		const lines = ['> First paragraph', '> Second paragraph', '> Third paragraph'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
	});

	it('should parse nested blockquotes', () => {
		const lines = ['> Outer', '>> Inner', '>>> Deepest'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
	});

	it('should handle blank lines within blockquote', () => {
		const lines = ['> First paragraph', '>', '> Second paragraph'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
	});

	it('should return empty blockquote for empty array', () => {
		const result = parseBlockquote([]);

		expect(result.type).toBe('blockquote');
		expect(result.children).toEqual([]);
	});

	it('should return empty blockquote for non-blockquote lines', () => {
		const lines = ['Normal text', 'More text'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
		expect(result.children).toEqual([]);
	});

	it('should handle blockquote with only marker', () => {
		const lines = ['>'];

		const result = parseBlockquote(lines);

		expect(result.type).toBe('blockquote');
	});
});

describe('extractBlockquoteContent', () => {
	it('should extract content from simple blockquote', () => {
		const lines = ['> # Heading', '> Some text'];

		const content = extractBlockquoteContent(lines);

		expect(content).toContain('# Heading');
		expect(content).toContain('Some text');
	});

	it('should extract content from nested blockquote', () => {
		const lines = ['> Outer', '>> Nested'];

		const content = extractBlockquoteContent(lines);

		expect(content.length).toBe(2);
		// Nested content should still have one > marker
		expect(content[1]).toMatch(/^>/);
	});

	it('should handle empty array', () => {
		const content = extractBlockquoteContent([]);

		expect(content).toEqual([]);
	});

	it('should preserve formatting in content', () => {
		const lines = ['> **bold** and _italic_', '> $math$ formula'];

		const content = extractBlockquoteContent(lines);

		expect(content[0]).toContain('**bold**');
		expect(content[1]).toContain('$math$');
	});
});

describe('getBlockquoteLevel', () => {
	it('should return level 1 for single marker', () => {
		expect(getBlockquoteLevel('> Text')).toBe(1);
		expect(getBlockquoteLevel('>Text')).toBe(1);
	});

	it('should return level 2 for double marker', () => {
		expect(getBlockquoteLevel('>> Text')).toBe(2);
		expect(getBlockquoteLevel('>>Text')).toBe(2);
	});

	it('should return level 3 for triple marker', () => {
		expect(getBlockquoteLevel('>>> Text')).toBe(3);
		expect(getBlockquoteLevel('>>>Text')).toBe(3);
	});

	it('should return level 0 for non-blockquote lines', () => {
		expect(getBlockquoteLevel('Normal text')).toBe(0);
		expect(getBlockquoteLevel('')).toBe(0);
		expect(getBlockquoteLevel('   ')).toBe(0);
	});

	it('should return level 0 for lines with > in middle', () => {
		expect(getBlockquoteLevel('a > b')).toBe(0);
		expect(getBlockquoteLevel('text > quote')).toBe(0);
	});

	it('should handle deeply nested blockquotes', () => {
		expect(getBlockquoteLevel('>>>>>')).toBe(5);
		expect(getBlockquoteLevel('>>>>>> Deep')).toBe(6);
	});
});

describe('hasNestedBlockquotes', () => {
	it('should return false for flat blockquotes', () => {
		const lines = ['> Text', '> More text', '> Even more'];

		expect(hasNestedBlockquotes(lines)).toBe(false);
	});

	it('should return true for nested blockquotes', () => {
		const lines = ['> Text', '>> Nested'];

		expect(hasNestedBlockquotes(lines)).toBe(true);
	});

	it('should return true for deeply nested blockquotes', () => {
		const lines = ['> Level 1', '>> Level 2', '>>> Level 3'];

		expect(hasNestedBlockquotes(lines)).toBe(true);
	});

	it('should return false for empty array', () => {
		expect(hasNestedBlockquotes([])).toBe(false);
	});

	it('should return false for non-blockquote lines', () => {
		const lines = ['Normal text', 'More text'];

		expect(hasNestedBlockquotes(lines)).toBe(false);
	});

	it('should handle mixed content with nesting', () => {
		const lines = ['> Start', '>> Nested', '> Back to level 1'];

		expect(hasNestedBlockquotes(lines)).toBe(true);
	});
});

describe('normalizeBlockquoteLines', () => {
	it('should remove trailing blank blockquote lines', () => {
		const lines = ['> Text', '>', '>'];

		const normalized = normalizeBlockquoteLines(lines);

		expect(normalized).toHaveLength(1);
		expect(normalized[0]).toBe('> Text');
	});

	it('should preserve internal blank blockquote lines', () => {
		const lines = ['> Text', '>', '> More'];

		const normalized = normalizeBlockquoteLines(lines);

		expect(normalized).toHaveLength(3);
	});

	it('should handle empty array', () => {
		const normalized = normalizeBlockquoteLines([]);

		expect(normalized).toEqual([]);
	});

	it('should handle single line', () => {
		const lines = ['> Single'];

		const normalized = normalizeBlockquoteLines(lines);

		expect(normalized).toHaveLength(1);
		expect(normalized[0]).toBe('> Single');
	});

	it('should handle all blank blockquote lines', () => {
		const lines = ['>', '>', '>'];

		const normalized = normalizeBlockquoteLines(lines);

		expect(normalized).toEqual([]);
	});

	it('should not modify lines with content', () => {
		const lines = ['> First', '> Second', '> Third'];

		const normalized = normalizeBlockquoteLines(lines);

		expect(normalized).toHaveLength(3);
		expect(normalized).toEqual(lines);
	});
});

describe('Edge Cases', () => {
	it('should handle empty strings in array', () => {
		const blocks = findBlockquoteBlocks(['', '', '']);
		expect(blocks).toHaveLength(0);

		const level = getBlockquoteLevel('');
		expect(level).toBe(0);

		const isQuote = isBlockquoteLine('');
		expect(isQuote).toBe(false);
	});

	it('should handle whitespace-only strings', () => {
		const isQuote = isBlockquoteLine('   ');
		expect(isQuote).toBe(false);

		const level = getBlockquoteLevel('   ');
		expect(level).toBe(0);
	});

	it('should handle blockquote markers with spaces', () => {
		expect(isBlockquoteLine('  >  spaced  ')).toBe(true);
		expect(getBlockquoteLevel('  > spaced')).toBe(1);
	});

	it('should handle very long blockquote content', () => {
		const longText = '> ' + 'a'.repeat(1000);
		const lines = [longText];

		const result = parseBlockquote(lines);
		expect(result.type).toBe('blockquote');

		const level = getBlockquoteLevel(longText);
		expect(level).toBe(1);
	});

	it('should handle special characters in blockquotes', () => {
		const lines = ['> $\\frac{1}{2}$', '> **bold** _italic_', '> [link](url)'];

		const result = parseBlockquote(lines);
		expect(result.type).toBe('blockquote');

		const content = extractBlockquoteContent(lines);
		expect(content[0]).toContain('$\\frac{1}{2}$');
	});

	it('should handle Unicode content', () => {
		const lines = ['> Bonjour le monde', '> Caracteres speciaux: e, a, u'];

		const result = parseBlockquote(lines);
		expect(result.type).toBe('blockquote');

		const content = extractBlockquoteContent(lines);
		expect(content[0]).toBe('Bonjour le monde');
	});

	it('should handle blockquote followed immediately by another', () => {
		const lines = ['> First quote', '> Second line of first', '>> Nested starts here'];

		const blocks = findBlockquoteBlocks(lines);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([0, 2]);
	});

	it('should handle mixed indentation in blockquotes', () => {
		const lines = ['> Normal', '  > Indented', '> Normal again'];

		const blocks = findBlockquoteBlocks(lines);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual([0, 2]);
	});
});

describe('Content Extraction Details', () => {
	it('should strip leading space after single marker', () => {
		const lines = ['> Hello'];
		const content = extractBlockquoteContent(lines);
		expect(content[0]).toBe('Hello');
	});

	it('should handle blockquote without space after marker', () => {
		const lines = ['>Hello'];
		const content = extractBlockquoteContent(lines);
		expect(content[0]).toBe('Hello');
	});

	it('should preserve nested markers for recursive parsing', () => {
		const lines = ['> Outer', '>> Inner nested'];
		const content = extractBlockquoteContent(lines);

		// The inner content should still have a > for recursive parsing
		expect(content[1]).toMatch(/^>/);
	});

	it('should handle multiple levels of nesting correctly', () => {
		const lines = ['>> Level 2', '>>> Level 3'];
		const content = extractBlockquoteContent(lines);

		// At level 2 base, level 3 should have one > marker remaining
		expect(content[1]).toBe('> Level 3');
	});
});
