/**
 * Markdown Parser Tests
 * ======================
 *
 * Unit tests for the main markdown parser that orchestrates all parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown-parser';

describe('parseMarkdown', () => {
	it('should parse simple text', () => {
		const markdown = 'Hello World';
		const ast = parseMarkdown(markdown);

		expect(ast.type).toBe('document');
		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');
	});

	it('should parse inline math', () => {
		const markdown = 'Calculate $x^2$ please';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		const paragraph = ast.children[0];
		expect(paragraph.type).toBe('paragraph');

		if (paragraph.type === 'paragraph') {
			expect(paragraph.children).toHaveLength(3);
			expect(paragraph.children[0].type).toBe('text');
			expect(paragraph.children[1].type).toBe('math-inline');
			expect(paragraph.children[2].type).toBe('text');

			if (paragraph.children[1].type === 'math-inline') {
				expect(paragraph.children[1].latex).toBe('x^2');
			}
		}
	});

	it('should parse block math', () => {
		const markdown = '$$\\int_0^\\pi \\sin(x) dx$$';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('math-block');

		if (ast.children[0].type === 'math-block') {
			expect(ast.children[0].latex).toBe('\\int_0^\\pi \\sin(x) dx');
		}
	});

	it('should parse lists with inline math', () => {
		const markdown = `1. $2x + 3 = 7$
2. $(x + 2)(x - 3) = 0$
3. $\\frac{x}{2} + \\frac{x}{3} = 5$`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.ordered).toBe(true);
			expect(list.items).toHaveLength(3);

			// Check first item has math
			const firstItem = list.items[0];
			expect(firstItem.children).toHaveLength(1);
			expect(firstItem.children[0].type).toBe('paragraph');

			if (firstItem.children[0].type === 'paragraph') {
				const paragraph = firstItem.children[0];
				expect(paragraph.children).toHaveLength(1);
				expect(paragraph.children[0].type).toBe('math-inline');

				if (paragraph.children[0].type === 'math-inline') {
					expect(paragraph.children[0].latex).toBe('2x + 3 = 7');
				}
			}

			// Check second item
			const secondItem = list.items[1];
			if (secondItem.children[0].type === 'paragraph') {
				const paragraph = secondItem.children[0];
				expect(paragraph.children[0].type).toBe('math-inline');

				if (paragraph.children[0].type === 'math-inline') {
					expect(paragraph.children[0].latex).toBe('(x + 2)(x - 3) = 0');
				}
			}

			// Check third item
			const thirdItem = list.items[2];
			if (thirdItem.children[0].type === 'paragraph') {
				const paragraph = thirdItem.children[0];
				expect(paragraph.children[0].type).toBe('math-inline');

				if (paragraph.children[0].type === 'math-inline') {
					expect(paragraph.children[0].latex).toBe('\\frac{x}{2} + \\frac{x}{3} = 5');
				}
			}
		}
	});

	it('should parse lists with text and math', () => {
		const markdown = `Résoudre les équations suivantes:

1. $2x + 3 = 7$
2. $(x + 2)(x - 3) = 0$`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(2);
		expect(ast.children[0].type).toBe('paragraph');
		expect(ast.children[1].type).toBe('list');

		if (ast.children[1].type === 'list') {
			const list = ast.children[1];
			expect(list.items).toHaveLength(2);

			// Verify math is parsed, not placeholders
			const firstItem = list.items[0];
			if (firstItem.children[0].type === 'paragraph') {
				const paragraph = firstItem.children[0];
				expect(paragraph.children[0].type).toBe('math-inline');

				// Should NOT contain __MATH_1__ placeholder
				if (paragraph.children[0].type === 'text') {
					expect(paragraph.children[0].content).not.toContain('__MATH_');
				}
			}
		}
	});

	it('should parse nested lists with math', () => {
		const markdown = `1. First: $x^2$
  a. Nested: $y^2$
  b. Another: $z^2$
2. Second: $a^2$`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// Check first item has nested list
			const firstItem = list.items[0];
			expect(firstItem.children.length).toBeGreaterThan(1);

			// Find the nested list
			const nestedList = firstItem.children.find((child) => child.type === 'list');
			expect(nestedList).toBeDefined();

			if (nestedList && nestedList.type === 'list') {
				expect(nestedList.items).toHaveLength(2);

				// Check nested items have math parsed
				const nestedItem = nestedList.items[0];
				if (nestedItem.children[0].type === 'paragraph') {
					const hasMath = nestedItem.children[0].children.some(
						(node) => node.type === 'math-inline'
					);
					expect(hasMath).toBe(true);
				}
			}
		}
	});

	it('should parse tables', () => {
		const markdown = `| x | f(x) |
|---|------|
| 0 | 0    |
| 1 | 2    |`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('table');

		if (ast.children[0].type === 'table') {
			const table = ast.children[0];
			expect(table.header).toHaveLength(2);
			expect(table.rows).toHaveLength(2);
		}
	});

	it('should parse headings', () => {
		const markdown = `# Level 1 Heading
## Level 2 Heading
### Level 3 with **bold**`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(3);

		// Check Level 1
		expect(ast.children[0].type).toBe('heading');
		if (ast.children[0].type === 'heading') {
			expect(ast.children[0].level).toBe(1);
			expect(ast.children[0].children).toHaveLength(1);
			if (ast.children[0].children[0].type === 'text') {
				expect(ast.children[0].children[0].content).toBe('Level 1 Heading');
			}
		}

		// Check Level 2
		expect(ast.children[1].type).toBe('heading');
		if (ast.children[1].type === 'heading') {
			expect(ast.children[1].level).toBe(2);
		}

		// Check Level 3 with formatting
		expect(ast.children[2].type).toBe('heading');
		if (ast.children[2].type === 'heading') {
			expect(ast.children[2].level).toBe(3);
			// Should have parsed the bold text
			const boldNode = ast.children[2].children.find(
				(n) => n.type === 'text' && n.bold && n.content === 'bold'
			);
			expect(boldNode).toBeDefined();
		}
	});

	it('should parse horizontal rules', () => {
		const markdown = `Text before

---

Text after`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(3);
		expect(ast.children[0].type).toBe('paragraph');
		expect(ast.children[1].type).toBe('horizontal-rule');
		expect(ast.children[2].type).toBe('paragraph');
	});

	it('should parse images', () => {
		const markdown = '![Test image](image.png)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('image');

		if (ast.children[0].type === 'image') {
			expect(ast.children[0].src).toBe('image.png');
			expect(ast.children[0].alt).toBe('Test image');
		}
	});

	it('should parse text formatting - bold', () => {
		const markdown = 'This is **bold** text';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: plain text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('This is ');
				expect(paragraph.children[0].bold).toBeUndefined();
			}

			// Second: bold text
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe('bold');
				expect(paragraph.children[1].bold).toBe(true);
			}

			// Third: plain text
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' text');
				expect(paragraph.children[2].bold).toBeUndefined();
			}
		}
	});

	it('should parse text formatting - italic', () => {
		const markdown = 'This is *italic* text';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// Check italic node
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe('italic');
				expect(paragraph.children[1].italic).toBe(true);
			}
		}
	});

	it('should parse text formatting - code', () => {
		const markdown = 'This is `code` text';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// Check code node
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe('code');
				expect(paragraph.children[1].code).toBe(true);
			}
		}
	});

	it('should parse mixed formatting', () => {
		const markdown = '**Note** : Utiliser les *propriétés* des fonctions `trigonométriques`.';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have multiple text nodes with different formatting
			const boldNode = paragraph.children.find(
				(n) => n.type === 'text' && n.bold && n.content === 'Note'
			);
			expect(boldNode).toBeDefined();

			const italicNode = paragraph.children.find(
				(n) => n.type === 'text' && n.italic && n.content === 'propriétés'
			);
			expect(italicNode).toBeDefined();

			const codeNode = paragraph.children.find(
				(n) => n.type === 'text' && n.code && n.content === 'trigonométriques'
			);
			expect(codeNode).toBeDefined();

			// Check that we don't have any __BOLD__ or __ITALIC__ placeholders
			const hasPlaceholders = paragraph.children.some(
				(n) =>
					n.type === 'text' && (n.content.includes('__BOLD_') || n.content.includes('__ITALIC_'))
			);
			expect(hasPlaceholders).toBe(false);
		}
	});

	it('should parse complex document', () => {
		const markdown = `# Exercice de Mathématiques

Résoudre les équations suivantes:

1. $2x + 3 = 7$
2. $(x + 2)(x - 3) = 0$
3. $\\frac{x}{2} + \\frac{x}{3} = 5$

## Tableau de valeurs

| x | f(x) |
|---|------|
| 0 | 0    |
| 1 | 2    |

## Formule importante

$$\\int_0^\\pi \\sin(x) dx = 2$$`;

		const ast = parseMarkdown(markdown);

		// Should have multiple blocks
		expect(ast.children.length).toBeGreaterThan(5);

		// Check that lists have math parsed
		const listNode = ast.children.find((child) => child.type === 'list');
		expect(listNode).toBeDefined();

		if (listNode && listNode.type === 'list') {
			const firstItem = listNode.items[0];
			if (firstItem.children[0].type === 'paragraph') {
				const hasMath = firstItem.children[0].children.some((node) => node.type === 'math-inline');
				expect(hasMath).toBe(true);
			}
		}

		// Check for table
		const tableNode = ast.children.find((child) => child.type === 'table');
		expect(tableNode).toBeDefined();

		// Check for block math
		const mathBlockNode = ast.children.find((child) => child.type === 'math-block');
		expect(mathBlockNode).toBeDefined();
	});
});
