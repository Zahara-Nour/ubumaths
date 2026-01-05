/**
 * Code Block Parser - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
	isCodeFence,
	findCodeBlocks,
	parseCodeBlock,
	containsMathPlaceholders,
	extractLanguage,
	isCodeBlockClosed,
	countCodeLines,
	getFenceStyle
} from '../../parser/code-block-parser';
import type { CodeBlockNode } from '../../types';

describe('Code Block Parser', () => {
	describe('isCodeFence', () => {
		it('should detect backtick fences', () => {
			expect(isCodeFence('```')).toBe(true);
			expect(isCodeFence('```typescript')).toBe(true);
			expect(isCodeFence('````')).toBe(true);
			expect(isCodeFence('   ```')).toBe(true); // with leading spaces
		});

		it('should detect tilde fences', () => {
			expect(isCodeFence('~~~')).toBe(true);
			expect(isCodeFence('~~~python')).toBe(true);
			expect(isCodeFence('~~~~')).toBe(true);
			expect(isCodeFence('   ~~~')).toBe(true); // with leading spaces
		});

		it('should reject invalid fences', () => {
			expect(isCodeFence('``')).toBe(false); // too short
			expect(isCodeFence('~~')).toBe(false); // too short
			expect(isCodeFence('Normal text')).toBe(false);
			expect(isCodeFence('`inline code`')).toBe(false);
			expect(isCodeFence('')).toBe(false);
		});
	});

	describe('findCodeBlocks', () => {
		it('should find single code block', () => {
			const lines = ['text', '```', 'code', '```', 'more text'];
			const blocks = findCodeBlocks(lines);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].startIndex).toBe(1);
			expect(blocks[0].endIndex).toBe(3);
			expect(blocks[0].openFence.type).toBe('backtick');
		});

		it('should find multiple code blocks', () => {
			const lines = [
				'text',
				'```js',
				'const x = 1;',
				'```',
				'middle',
				'~~~python',
				'print("hello")',
				'~~~',
				'end'
			];
			const blocks = findCodeBlocks(lines);

			expect(blocks).toHaveLength(2);

			// First block
			expect(blocks[0].startIndex).toBe(1);
			expect(blocks[0].endIndex).toBe(3);
			expect(blocks[0].openFence.language).toBe('js');

			// Second block
			expect(blocks[1].startIndex).toBe(5);
			expect(blocks[1].endIndex).toBe(7);
			expect(blocks[1].openFence.language).toBe('python');
		});

		it('should handle unclosed code blocks', () => {
			const lines = ['text', '```typescript', 'const x = 1;', 'const y = 2;'];
			const blocks = findCodeBlocks(lines);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].startIndex).toBe(1);
			expect(blocks[0].endIndex).toBe(3); // last line
			expect(blocks[0].closeFence).toBeUndefined();
		});

		it('should not match mismatched fence types', () => {
			const lines = ['```', 'code', '~~~']; // Wrong closing fence
			const blocks = findCodeBlocks(lines);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].endIndex).toBe(2); // Treated as unclosed
		});

		it('should handle nested fence syntax using different fence lengths', () => {
			// In standard Markdown, nested code blocks require different fence lengths
			const lines = [
				'````markdown',
				'Here is an example:',
				'```js',
				'console.log("test");',
				'```',
				'End of example',
				'````'
			];
			const blocks = findCodeBlocks(lines);

			// With 4 backticks for outer fence and 3 for inner, the inner fences are treated as content
			expect(blocks).toHaveLength(1);
			expect(blocks[0].startIndex).toBe(0);
			expect(blocks[0].endIndex).toBe(6);
			expect(blocks[0].openFence.language).toBe('markdown');
			expect(blocks[0].openFence.length).toBe(4);
		});

		it('should close block at first matching fence', () => {
			// Standard behavior: first matching fence closes the block
			const lines = [
				'```markdown',
				'Here is an example:',
				'```js',
				'console.log("test");',
				'```',
				'End of example',
				'```'
			];
			const blocks = findCodeBlocks(lines);

			// The first ``` at line 4 closes the markdown block
			// Line 6 starts a new unclosed block
			expect(blocks).toHaveLength(2);
			expect(blocks[0].startIndex).toBe(0);
			expect(blocks[0].endIndex).toBe(4); // Closed at first matching fence
			expect(blocks[1].startIndex).toBe(6);
			expect(blocks[1].endIndex).toBe(6); // Unclosed
		});

		it('should handle consecutive code blocks', () => {
			// Test actual consecutive blocks (not nested)
			const lines = ['```', 'first block', '```', '```', 'second block', '```'];
			const blocks = findCodeBlocks(lines);

			// Should find 2 separate blocks
			expect(blocks).toHaveLength(2);
			expect(blocks[0].startIndex).toBe(0);
			expect(blocks[0].endIndex).toBe(2);
			expect(blocks[1].startIndex).toBe(3);
			expect(blocks[1].endIndex).toBe(5);
		});
	});

	describe('parseCodeBlock', () => {
		it('should parse simple code block', () => {
			const lines = ['```', 'const x = 1;', 'const y = 2;', '```'];
			const node = parseCodeBlock(lines, 0, 3);

			expect(node).toEqual({
				type: 'code-block',
				code: 'const x = 1;\nconst y = 2;',
				language: undefined
			});
		});

		it('should parse code block with language', () => {
			const lines = ['```typescript', 'const x: number = 1;', '```'];
			const node = parseCodeBlock(lines, 0, 2);

			expect(node).toEqual({
				type: 'code-block',
				code: 'const x: number = 1;',
				language: 'typescript'
			});
		});

		it('should preserve all whitespace and indentation', () => {
			const lines = ['```python', '    def hello():', '        print("world")', '```'];
			const node = parseCodeBlock(lines, 0, 3);

			expect(node).toEqual({
				type: 'code-block',
				code: '    def hello():\n        print("world")',
				language: 'python'
			});
		});

		it('should handle empty code blocks', () => {
			const lines = ['```', '```'];
			const node = parseCodeBlock(lines, 0, 1);

			expect(node).toEqual({
				type: 'code-block',
				code: '',
				language: undefined
			});
		});

		it('should handle unclosed blocks', () => {
			const lines = ['```js', 'console.log("test");', 'const x = 1;'];
			const node = parseCodeBlock(lines, 0);

			expect(node).toEqual({
				type: 'code-block',
				code: 'console.log("test");\nconst x = 1;',
				language: 'js'
			});
		});

		it('should preserve special characters', () => {
			const lines = ['```', '$ echo "test"', '{{ variable }}', '§M:0§', '```'];
			const node = parseCodeBlock(lines, 0, 4);

			expect(node).toEqual({
				type: 'code-block',
				code: '$ echo "test"\n{{ variable }}\n§M:0§',
				language: undefined
			});
		});

		it('should handle tilde fences', () => {
			const lines = ['~~~ruby', 'puts "Hello"', '~~~'];
			const node = parseCodeBlock(lines, 0, 2);

			expect(node).toEqual({
				type: 'code-block',
				code: 'puts "Hello"',
				language: 'ruby'
			});
		});

		it('should return null for invalid indices', () => {
			const lines = ['```', 'code', '```'];

			expect(parseCodeBlock(lines, -1)).toBeNull();
			expect(parseCodeBlock(lines, 10)).toBeNull();
			expect(parseCodeBlock([], 0)).toBeNull();
		});

		it('should return null if not a code fence', () => {
			const lines = ['Not a fence', 'some text'];
			expect(parseCodeBlock(lines, 0)).toBeNull();
		});
	});

	describe('containsMathPlaceholders', () => {
		it('should detect math placeholders', () => {
			expect(containsMathPlaceholders('const formula = §M:0§;')).toBe(true);
			expect(containsMathPlaceholders('§M:42§ + §M:100§')).toBe(true);
			expect(containsMathPlaceholders('text with §M:999§ inside')).toBe(true);
		});

		it('should not detect when no placeholders', () => {
			expect(containsMathPlaceholders('const x = 1;')).toBe(false);
			expect(containsMathPlaceholders('$x = \\frac{1}{2}$')).toBe(false);
			expect(containsMathPlaceholders('')).toBe(false);
		});
	});

	describe('extractLanguage', () => {
		it('should extract language from backtick fences', () => {
			expect(extractLanguage('```typescript')).toBe('typescript');
			expect(extractLanguage('```js')).toBe('js');
			expect(extractLanguage('```python')).toBe('python');
		});

		it('should extract language from tilde fences', () => {
			expect(extractLanguage('~~~ruby')).toBe('ruby');
			expect(extractLanguage('~~~go')).toBe('go');
		});

		it('should handle spaces', () => {
			expect(extractLanguage('``` javascript ')).toBe('javascript');
			expect(extractLanguage('~~~  python  ')).toBe('python');
		});

		it('should return undefined for no language', () => {
			expect(extractLanguage('```')).toBeUndefined();
			expect(extractLanguage('~~~')).toBeUndefined();
		});

		it('should return undefined for non-fences', () => {
			expect(extractLanguage('normal text')).toBeUndefined();
			expect(extractLanguage('')).toBeUndefined();
		});
	});

	describe('isCodeBlockClosed', () => {
		it('should detect closed blocks', () => {
			const lines1 = ['```', 'code', '```'];
			expect(isCodeBlockClosed(lines1, 0)).toBe(true);

			const lines2 = ['~~~python', 'print("test")', '~~~'];
			expect(isCodeBlockClosed(lines2, 0)).toBe(true);
		});

		it('should detect unclosed blocks', () => {
			const lines1 = ['```', 'code'];
			expect(isCodeBlockClosed(lines1, 0)).toBe(false);

			const lines2 = ['~~~', 'content', 'no closing'];
			expect(isCodeBlockClosed(lines2, 0)).toBe(false);
		});

		it('should require matching fence types', () => {
			const lines = ['```', 'code', '~~~'];
			expect(isCodeBlockClosed(lines, 0)).toBe(false);
		});

		it('should handle longer closing fences', () => {
			const lines = ['```', 'code', '````'];
			expect(isCodeBlockClosed(lines, 0)).toBe(true); // Longer is ok
		});

		it('should not accept shorter closing fences', () => {
			const lines = ['````', 'code', '```'];
			expect(isCodeBlockClosed(lines, 0)).toBe(false); // Too short
		});
	});

	describe('countCodeLines', () => {
		it('should count lines correctly', () => {
			const node1: CodeBlockNode = {
				type: 'code-block',
				code: 'line1\nline2\nline3'
			};
			expect(countCodeLines(node1)).toBe(3);

			const node2: CodeBlockNode = {
				type: 'code-block',
				code: 'single line'
			};
			expect(countCodeLines(node2)).toBe(1);
		});

		it('should handle empty code', () => {
			const node: CodeBlockNode = {
				type: 'code-block',
				code: ''
			};
			expect(countCodeLines(node)).toBe(0);
		});

		it('should handle multiline with empty lines', () => {
			const node: CodeBlockNode = {
				type: 'code-block',
				code: 'line1\n\nline3\n\n'
			};
			expect(countCodeLines(node)).toBe(5);
		});
	});

	describe('getFenceStyle', () => {
		it('should identify backtick fences', () => {
			const lines1 = ['```', 'code', '```'];
			expect(getFenceStyle(lines1, 0)).toBe('backtick');

			const lines2 = ['````typescript', 'code'];
			expect(getFenceStyle(lines2, 0)).toBe('backtick');
		});

		it('should identify tilde fences', () => {
			const lines1 = ['~~~', 'code', '~~~'];
			expect(getFenceStyle(lines1, 0)).toBe('tilde');

			const lines2 = ['~~~~python', 'code'];
			expect(getFenceStyle(lines2, 0)).toBe('tilde');
		});

		it('should return null for non-fences', () => {
			const lines = ['not a fence', 'text'];
			expect(getFenceStyle(lines, 0)).toBeNull();
		});

		it('should return null for invalid index', () => {
			const lines = ['```', 'code'];
			expect(getFenceStyle(lines, -1)).toBeNull();
			expect(getFenceStyle(lines, 10)).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		it('should handle code blocks with backticks inside', () => {
			const lines = ['```js', 'const str = `template ${value}`;', '```'];
			const node = parseCodeBlock(lines, 0, 2);

			expect(node?.code).toBe('const str = `template ${value}`;');
		});

		it('should handle code blocks with fence-like content', () => {
			const lines = ['```', 'if (x === ```test```) {', '  // ```', '}', '```'];
			const node = parseCodeBlock(lines, 0, 4);

			expect(node?.code).toBe('if (x === ```test```) {\n  // ```\n}');
		});

		it('should preserve exact content including trailing spaces', () => {
			const lines = ['```', 'line with trailing spaces   ', '  indented  ', '```'];
			const node = parseCodeBlock(lines, 0, 3);

			expect(node?.code).toBe('line with trailing spaces   \n  indented  ');
		});

		it('should handle very long fence markers', () => {
			const lines = ['``````````', 'code', '``````````'];
			const node = parseCodeBlock(lines, 0, 2);

			expect(node).toEqual({
				type: 'code-block',
				code: 'code',
				language: undefined
			});
		});
	});
});
