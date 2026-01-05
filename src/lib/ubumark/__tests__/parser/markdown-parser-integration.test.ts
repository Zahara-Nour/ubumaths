/**
 * Integration tests for the markdown parser with new parsers
 * Tests that blockquotes and code blocks are properly integrated
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { BlockquoteNode, CodeBlockNode, ParagraphNode, ListNode } from '../../types';

describe('Markdown Parser Integration', () => {
	describe('Code Block Integration', () => {
		it('should parse code blocks with highest priority', () => {
			const markdown = `
\`\`\`typescript
> This looks like a blockquote but it's in a code block
- This looks like a list item
| This | looks | like | a | table |
const x = 1;
\`\`\`
`;
			const ast = parseMarkdown(markdown);
			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('code-block');

			const codeBlock = ast.children[0] as CodeBlockNode;
			expect(codeBlock.language).toBe('typescript');
			// Content should be verbatim, including the fake markdown
			expect(codeBlock.code).toContain('> This looks like a blockquote');
			expect(codeBlock.code).toContain('- This looks like a list');
		});

		it('should not replace math placeholders in code blocks', () => {
			const markdown = `
\`\`\`python
# Calculate $x^2 + y^2$
result = x**2 + y**2
\`\`\`
`;
			const ast = parseMarkdown(markdown);
			const codeBlock = ast.children[0] as CodeBlockNode;
			// Math expressions should remain intact in code blocks
			expect(codeBlock.code).toContain('$x^2 + y^2$');
			expect(codeBlock.code).not.toContain('§M:');
		});
	});

	describe('Blockquote Integration', () => {
		it('should parse blockquotes with recursive content', () => {
			const markdown = `
> This is a blockquote with **bold** text
>
> And a second paragraph with $x^2$ math
`;
			const ast = parseMarkdown(markdown);
			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('blockquote');

			const blockquote = ast.children[0] as BlockquoteNode;
			expect(blockquote.children).toHaveLength(2); // Two paragraphs

			// First paragraph
			const para1 = blockquote.children[0] as ParagraphNode;
			expect(para1.type).toBe('paragraph');
			expect(para1.children).toHaveLength(3); // "This is a blockquote with ", "bold", " text"

			// Second paragraph with math
			const para2 = blockquote.children[1] as ParagraphNode;
			const hasMath = para2.children.some(
				(child) => child.type === 'math-inline' && child.expression === 'x^2'
			);
			expect(hasMath).toBe(true);
		});

		it('should parse nested lists in blockquotes', () => {
			const markdown = `
> Here's a list in a blockquote:
> - Item 1
> - Item 2
>   - Nested item
> - Item 3
`;
			const ast = parseMarkdown(markdown);
			const blockquote = ast.children[0] as BlockquoteNode;
			expect(blockquote.children).toHaveLength(2); // Paragraph + List

			const list = blockquote.children[1] as ListNode;
			expect(list.type).toBe('list');
			expect(list.items).toHaveLength(3);
			expect(list.items[1].children[1].type).toBe('list'); // Nested list
		});
	});

	describe('Priority Order', () => {
		it('should respect priority: code > blockquote > list > table', () => {
			// Test that code blocks take priority
			const code = '```\n> blockquote inside code\n```';
			const ast1 = parseMarkdown(code);
			expect(ast1.children[0].type).toBe('code-block');

			// Test that blockquotes take priority over lists at the same position
			const blockquote = '> - This is a blockquote starting with a dash';
			const ast2 = parseMarkdown(blockquote);
			expect(ast2.children[0].type).toBe('blockquote');

			// Inside the blockquote should be a list
			const bq = ast2.children[0] as BlockquoteNode;
			expect(bq.children[0].type).toBe('list');
		});
	});

	describe('Mixed Content', () => {
		it('should parse complex document with all elements', () => {
			const markdown = `
# Document Title

This is a paragraph with **bold** and $x = \\frac{a}{b}$ math.

\`\`\`python
def hello():
    print("World")
\`\`\`

> **Note:** This is important!
>
> Remember to check the formula: $E = mc^2$

## Lists

- First item
- Second item
  - Nested item with \`code\`
- Third item

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

---

Final paragraph with more text.
`;
			const ast = parseMarkdown(markdown);

			// Count each type of node
			const types = ast.children.map((child) => child.type);
			expect(types).toContain('heading');
			expect(types).toContain('paragraph');
			expect(types).toContain('code-block');
			expect(types).toContain('blockquote');
			expect(types).toContain('list');
			expect(types).toContain('table');
			expect(types).toContain('horizontal-rule');

			// Verify code block content is preserved
			const codeBlock = ast.children.find((n) => n.type === 'code-block') as CodeBlockNode;
			expect(codeBlock.language).toBe('python');
			expect(codeBlock.code).toContain('def hello():');

			// Verify blockquote has parsed content
			const blockquote = ast.children.find((n) => n.type === 'blockquote') as BlockquoteNode;
			expect(blockquote.children.length).toBeGreaterThan(0);
			const firstChild = blockquote.children[0] as ParagraphNode;
			expect(firstChild.type).toBe('paragraph');

			// Check that inline math works in blockquote
			const hasEmc2 = blockquote.children.some((child) => {
				if (child.type === 'paragraph') {
					return child.children.some((inline) => {
						return inline.type === 'math-inline' && inline.expression === 'E = mc^2';
					});
				}
				return false;
			});
			expect(hasEmc2).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle blockquotes containing code blocks', () => {
			const markdown = `
> Here's some code in a blockquote:
>
> \`\`\`javascript
> console.log("Hello");
> \`\`\`
>
> And more text after.
`;
			const ast = parseMarkdown(markdown);
			const blockquote = ast.children[0] as BlockquoteNode;

			// Should have: paragraph, code block, paragraph
			expect(blockquote.children).toHaveLength(3);
			expect(blockquote.children[0].type).toBe('paragraph');
			expect(blockquote.children[1].type).toBe('code-block');
			expect(blockquote.children[2].type).toBe('paragraph');

			const codeInBlockquote = blockquote.children[1] as CodeBlockNode;
			expect(codeInBlockquote.language).toBe('javascript');
			expect(codeInBlockquote.code).toBe('console.log("Hello");');
		});

		it('should handle adjacent blocks correctly', () => {
			const markdown = `
\`\`\`
code block
\`\`\`
> blockquote
- list item
`;
			const ast = parseMarkdown(markdown);
			expect(ast.children).toHaveLength(3);
			expect(ast.children[0].type).toBe('code-block');
			expect(ast.children[1].type).toBe('blockquote');
			expect(ast.children[2].type).toBe('list');
		});

		it('should handle empty blockquotes and code blocks', () => {
			const markdown = `
>
>

\`\`\`
\`\`\`
`;
			const ast = parseMarkdown(markdown);

			// Empty blockquote with just empty lines
			const blockquote = ast.children[0] as BlockquoteNode;
			expect(blockquote.type).toBe('blockquote');

			// Empty code block
			const codeBlock = ast.children[1] as CodeBlockNode;
			expect(codeBlock.type).toBe('code-block');
			expect(codeBlock.code).toBe('');
		});
	});

	describe('Probability Tree Integration', () => {
		it('should preserve math expressions in probtree event labels inside list items', () => {
			// This test verifies the fix for the bug where $R_1$ became §M:2§ in list items
			const markdown = `
1. La situation peut être représentée par l'arbre de probabilité ci-contre :

   \`\`\`probtree
   root: L

   $R_1$:0.85
     Rouge:\\ldots
     Bleue:\\ldots
   Bleue:\\ldots
     Rouge:\\ldots
     Bleue:\\ldots
   \`\`\`

2. Les évènements $R_1$ et $\\overline{R_1}$ partitionnent l'univers
`;
			const ast = parseMarkdown(markdown);

			// Should have a list
			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('list');

			const list = ast.children[0] as ListNode;
			expect(list.items).toHaveLength(2);

			// First list item should contain a probability tree
			const firstItem = list.items[0];
			const probTree = firstItem.children.find((c) => c.type === 'probability-tree');
			expect(probTree).toBeDefined();

			// The event label should be $R_1$, not §M:N§
			if (probTree && probTree.type === 'probability-tree') {
				const firstBranch = probTree.root.branches[0];
				expect(firstBranch.eventLabel).toBe('$R_1$');
				// Should NOT contain placeholder
				expect(firstBranch.eventLabel).not.toContain('§M:');
			}
		});

		it('should handle probtree with custom math syntax in list items', () => {
			const markdown = `
- Item with probtree:

  \`\`\`probtree
  root: Test

  ~A~:0.5
    B:0.3
  ~C~:0.5
    D:0.7
  \`\`\`
`;
			const ast = parseMarkdown(markdown);

			const list = ast.children[0] as ListNode;
			const probTree = list.items[0].children.find((c) => c.type === 'probability-tree');

			if (probTree && probTree.type === 'probability-tree') {
				// Custom math syntax should be preserved
				expect(probTree.root.branches[0].eventLabel).toBe('~A~');
				expect(probTree.root.branches[1].eventLabel).toBe('~C~');
				// Should NOT contain placeholder
				expect(probTree.root.branches[0].eventLabel).not.toContain('§M:');
			}
		});
	});
});
