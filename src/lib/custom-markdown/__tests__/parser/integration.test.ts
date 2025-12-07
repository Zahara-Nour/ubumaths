/**
 * Integration test for code block parser with exercise types
 */

import { describe, it, expect } from 'vitest';
import { parseCodeBlock, findCodeBlocks } from '../../parser/code-block-parser';
import type { CodeBlockNode } from '../../types';

describe('Code Block Parser Integration', () => {
	it('should produce valid CodeBlockNode matching the type definition', () => {
		const lines = ['```javascript', 'const x = 1;', '```'];
		const node = parseCodeBlock(lines, 0, 2);

		// Verify the node matches the CodeBlockNode interface
		expect(node).toBeDefined();
		expect(node?.type).toBe('code-block');
		expect(typeof node?.code).toBe('string');
		expect(node?.language).toBe('javascript');

		// Type assertion should work
		const typedNode: CodeBlockNode = node as CodeBlockNode;
		expect(typedNode.type).toBe('code-block');
	});

	it('should handle math placeholders correctly', () => {
		const lines = [
			'```python',
			'# Calculate using formula __MATH_0__',
			'result = solve(__MATH_1__)',
			'```'
		];

		const node = parseCodeBlock(lines, 0, 3);
		expect(node).toBeDefined();

		// Math placeholders should be preserved as-is
		expect(node?.code).toContain('__MATH_0__');
		expect(node?.code).toContain('__MATH_1__');
	});

	it('should work with real markdown content', () => {
		const markdown = `
# Exercise: Programming Basics

Write a function to calculate factorial:

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

# Test
print(factorial(5))  # Should output 120
\`\`\`

Now implement it in JavaScript:

\`\`\`javascript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

console.log(factorial(5)); // Should output 120
\`\`\`
		`.trim();

		const lines = markdown.split('\n');
		const blocks = findCodeBlocks(lines);

		// Should find both code blocks
		expect(blocks).toHaveLength(2);

		// Parse first block (Python)
		const pythonBlock = parseCodeBlock(lines, blocks[0].startIndex, blocks[0].endIndex);
		expect(pythonBlock?.language).toBe('python');
		expect(pythonBlock?.code).toContain('def factorial');
		expect(pythonBlock?.code).toContain('print(factorial(5))');

		// Parse second block (JavaScript)
		const jsBlock = parseCodeBlock(lines, blocks[1].startIndex, blocks[1].endIndex);
		expect(jsBlock?.language).toBe('javascript');
		expect(jsBlock?.code).toContain('function factorial');
		expect(jsBlock?.code).toContain('console.log(factorial(5))');
	});

	it('should handle edge cases in exercise content', () => {
		// Test with content that might appear in math exercises
		const lines = [
			'```',
			'Input: n = 5',
			'Output: 120',
			'',
			'Explanation: 5! = 5 × 4 × 3 × 2 × 1 = 120',
			'```'
		];

		const node = parseCodeBlock(lines, 0, 5);
		expect(node).toBeDefined();
		expect(node?.code).toContain('5! = 5 × 4 × 3 × 2 × 1 = 120');
		expect(node?.language).toBeUndefined();
	});

	it('should handle code blocks with special characters used in math', () => {
		const lines = [
			'```latex',
			'\\frac{a}{b} = \\frac{__MATH_0__}{__MATH_1__}',
			'\\sqrt{x^2 + y^2}',
			'```'
		];

		const node = parseCodeBlock(lines, 0, 3);
		expect(node).toBeDefined();
		expect(node?.language).toBe('latex');
		expect(node?.code).toContain('\\frac{a}{b}');
		expect(node?.code).toContain('\\sqrt{x^2 + y^2}');
	});
});
