/**
 * Markdown Parser Tests
 * ======================
 *
 * Unit tests for the main markdown parser that orchestrates all parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';

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
				expect(paragraph.children[1].expression).toBe('x^2');
			}
		}
	});

	it('should parse block math', () => {
		const markdown = '$$\\int_0^\\pi \\sin(x) dx$$';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('math-block');

		if (ast.children[0].type === 'math-block') {
			expect(ast.children[0].expression).toBe('\\int_0^\\pi \\sin(x) dx');
		}
	});

	it('should parse standalone inline math (on its own line)', () => {
		// Regression test: inline math alone on a line should be wrapped in paragraph
		// This was causing an infinite loop before the fix
		const markdown = '$1$';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			expect(ast.children[0].children).toHaveLength(1);
			expect(ast.children[0].children[0].type).toBe('math-inline');

			if (ast.children[0].children[0].type === 'math-inline') {
				expect(ast.children[0].children[0].expression).toBe('1');
			}
		}
	});

	it('should parse standalone custom inline math (on its own line)', () => {
		const markdown = '~2x+3~';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			expect(ast.children[0].children).toHaveLength(1);
			expect(ast.children[0].children[0].type).toBe('math-inline');

			if (ast.children[0].children[0].type === 'math-inline') {
				expect(ast.children[0].children[0].expression).toBe('2x+3');
				expect(ast.children[0].children[0].syntax).toBe('custom');
			}
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
					expect(paragraph.children[0].expression).toBe('2x + 3 = 7');
				}
			}

			// Check second item
			const secondItem = list.items[1];
			if (secondItem.children[0].type === 'paragraph') {
				const paragraph = secondItem.children[0];
				expect(paragraph.children[0].type).toBe('math-inline');

				if (paragraph.children[0].type === 'math-inline') {
					expect(paragraph.children[0].expression).toBe('(x + 2)(x - 3) = 0');
				}
			}

			// Check third item
			const thirdItem = list.items[2];
			if (thirdItem.children[0].type === 'paragraph') {
				const paragraph = thirdItem.children[0];
				expect(paragraph.children[0].type).toBe('math-inline');

				if (paragraph.children[0].type === 'math-inline') {
					expect(paragraph.children[0].expression).toBe('\\frac{x}{2} + \\frac{x}{3} = 5');
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

				// Should NOT contain §M:N§ placeholder
				if (paragraph.children[0].type === 'text') {
					expect(paragraph.children[0].content).not.toContain('§M:');
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

	it('should parse text formatting - strikethrough', () => {
		const markdown = 'This is -/-deleted-/- text';
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
				expect(paragraph.children[0].strikethrough).toBeUndefined();
			}

			// Second: strikethrough text
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe('deleted');
				expect(paragraph.children[1].strikethrough).toBe(true);
			}

			// Third: plain text
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' text');
				expect(paragraph.children[2].strikethrough).toBeUndefined();
			}
		}
	});

	it('should parse text formatting - highlight', () => {
		const markdown = 'This is ==highlighted== text';
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
				expect(paragraph.children[0].highlight).toBeUndefined();
			}

			// Second: highlighted text
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe('highlighted');
				expect(paragraph.children[1].highlight).toBe(true);
			}

			// Third: plain text
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' text');
				expect(paragraph.children[2].highlight).toBeUndefined();
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

describe('parseMarkdown - bold with math regression', () => {
	it('should render bold text that contains math expressions', () => {
		// Regression test: **Étude de la fonction $\sinh$** was not rendering bold
		// because the old placeholder format (__MATH_N__) contained underscores which broke the bold regex
		const markdown = '**Étude de la fonction $\\sinh$**';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have 3 children: bold text, math, bold text
			expect(paragraph.children.length).toBeGreaterThanOrEqual(2);

			// First text should be bold
			const firstChild = paragraph.children[0];
			expect(firstChild.type).toBe('text');
			if (firstChild.type === 'text') {
				expect(firstChild.bold).toBe(true);
				expect(firstChild.content).toBe('Étude de la fonction ');
			}

			// Should have math inline
			const mathChild = paragraph.children.find((c) => c.type === 'math-inline');
			expect(mathChild).toBeDefined();
			if (mathChild && mathChild.type === 'math-inline') {
				expect(mathChild.expression).toBe('\\sinh');
			}
		}
	});

	it('should render bold list items with math in nested lists', () => {
		// The original bug case from the user
		const markdown = `1. **Étude de la fonction $\\sinh$**
   1. Montrer que la fonction $\\sinh$ est impaire.
   2. Calculer la fonction dérivée de $\\sinh$, en préciser le signe.`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(1);

			// First item's first paragraph should contain bold text
			const firstItem = list.items[0];
			expect(firstItem.children[0].type).toBe('paragraph');

			if (firstItem.children[0].type === 'paragraph') {
				const paragraph = firstItem.children[0];

				// First child should be bold text
				const boldText = paragraph.children.find((c) => c.type === 'text' && c.bold);
				expect(boldText).toBeDefined();

				// Should also contain math
				const mathNode = paragraph.children.find((c) => c.type === 'math-inline');
				expect(mathNode).toBeDefined();
			}
		}
	});

	it('should handle italic with math', () => {
		const markdown = '*calcul de $x^2$*';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have italic text
			const italicChild = paragraph.children.find((c) => c.type === 'text' && c.italic);
			expect(italicChild).toBeDefined();

			// Should have math
			const mathChild = paragraph.children.find((c) => c.type === 'math-inline');
			expect(mathChild).toBeDefined();
		}
	});
});

describe('parseMarkdown - blank support', () => {
	it('should parse single blank', () => {
		const markdown = '{{blank:1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('blank');

			if (paragraph.children[0].type === 'blank') {
				expect(paragraph.children[0].index).toBe(1);
			}
		}
	});

	it('should parse blank with surrounding text', () => {
		const markdown = 'Texte {{blank:1}} suite';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: plain text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Texte ');
			}

			// Second: blank
			expect(paragraph.children[1].type).toBe('blank');
			if (paragraph.children[1].type === 'blank') {
				expect(paragraph.children[1].index).toBe(1);
			}

			// Third: plain text
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' suite');
			}
		}
	});

	it('should parse blank with math', () => {
		const markdown = '$x$ = {{blank:1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: math inline
			expect(paragraph.children[0].type).toBe('math-inline');
			if (paragraph.children[0].type === 'math-inline') {
				expect(paragraph.children[0].expression).toBe('x');
			}

			// Second: text " = "
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe(' = ');
			}

			// Third: blank
			expect(paragraph.children[2].type).toBe('blank');
			if (paragraph.children[2].type === 'blank') {
				expect(paragraph.children[2].index).toBe(1);
			}
		}
	});

	it('should parse multiple blanks', () => {
		const markdown = 'Calculer $2 + 3$ = {{blank:1}} et $4 + 5$ = {{blank:2}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Find all blanks
			const blanks = paragraph.children.filter((node) => node.type === 'blank');
			expect(blanks).toHaveLength(2);

			if (blanks[0].type === 'blank' && blanks[1].type === 'blank') {
				expect(blanks[0].index).toBe(1);
				expect(blanks[1].index).toBe(2);
			}
		}
	});

	it('should NOT parse variable placeholders as blanks', () => {
		const markdown = '{{a}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);

			// Should be text, not blank
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('{{a}}');
			}
		}
	});

	it('should parse blank with formatting', () => {
		const markdown = '**Reponse:** {{blank:1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have bold text and blank
			const boldNode = paragraph.children.find(
				(n) => n.type === 'text' && n.bold && n.content === 'Reponse:'
			);
			expect(boldNode).toBeDefined();

			const blankNode = paragraph.children.find((n) => n.type === 'blank');
			expect(blankNode).toBeDefined();

			if (blankNode && blankNode.type === 'blank') {
				expect(blankNode.index).toBe(1);
			}
		}
	});

	it('should parse high index blanks', () => {
		const markdown = '{{blank:42}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('blank');

			if (paragraph.children[0].type === 'blank') {
				expect(paragraph.children[0].index).toBe(42);
			}
		}
	});

	it('should parse code blocks in list item continuations', () => {
		const markdown = `1. Item with code:

   \`\`\`python
   def hello():
       print("world")
   \`\`\`

2. Next item`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// First item should have paragraph + code block
			const firstItem = list.items[0];
			expect(firstItem.children.length).toBeGreaterThanOrEqual(2);

			// Find the code block
			const codeBlock = firstItem.children.find((c) => c.type === 'code-block');
			expect(codeBlock).toBeDefined();

			if (codeBlock && codeBlock.type === 'code-block') {
				expect(codeBlock.language).toBe('python');
				expect(codeBlock.code).toContain('def hello()');
			}
		}
	});

	it('should parse images in list item continuations', () => {
		const markdown = `1. Item with image:

   ![A cat](cat.png)

2. Next item`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// First item should have paragraph + image
			const firstItem = list.items[0];
			expect(firstItem.children.length).toBeGreaterThanOrEqual(2);

			// Find the image
			const image = firstItem.children.find((c) => c.type === 'image');
			expect(image).toBeDefined();

			if (image && image.type === 'image') {
				expect(image.src).toBe('cat.png');
				expect(image.alt).toBe('A cat');
			}
		}
	});

	it('should parse image as first element in list item (block-first with empty marker line)', () => {
		const markdown = `-
  ![Figure](graph.png)

- Second item`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// First item should have just the image
			const firstItem = list.items[0];
			const image = firstItem.children.find((c) => c.type === 'image');
			expect(image).toBeDefined();

			if (image && image.type === 'image') {
				expect(image.src).toBe('graph.png');
				expect(image.alt).toBe('Figure');
			}
		}
	});

	it('should parse image on same line as list marker', () => {
		const markdown = `- ![Figure](graph.png)
- Second item`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// First item should have the image
			const firstItem = list.items[0];
			const image = firstItem.children.find((c) => c.type === 'image');
			expect(image).toBeDefined();

			if (image && image.type === 'image') {
				expect(image.src).toBe('graph.png');
				expect(image.alt).toBe('Figure');
			}
		}
	});

	it('should parse video in list item continuations', () => {
		const markdown = `1. Watch this:

   !video[Demo](demo.mp4)

2. Next item`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];

			// First item should have paragraph + video
			const firstItem = list.items[0];

			// Find the video
			const video = firstItem.children.find((c) => c.type === 'video');
			expect(video).toBeDefined();

			if (video && video.type === 'video') {
				expect(video.src).toBe('demo.mp4');
				expect(video.alt).toBe('Demo');
			}
		}
	});
});

describe('parseMarkdown - link support', () => {
	it('should parse simple link', () => {
		const markdown = '[Click here](https://example.com)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('link');

			if (paragraph.children[0].type === 'link') {
				expect(paragraph.children[0].text).toBe('Click here');
				expect(paragraph.children[0].url).toBe('https://example.com');
				expect(paragraph.children[0].title).toBeUndefined();
			}
		}
	});

	it('should parse link with title', () => {
		const markdown = '[Click here](https://example.com "My title")';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('link');

			if (paragraph.children[0].type === 'link') {
				expect(paragraph.children[0].text).toBe('Click here');
				expect(paragraph.children[0].url).toBe('https://example.com');
				expect(paragraph.children[0].title).toBe('My title');
			}
		}
	});

	it('should parse link surrounded by text', () => {
		const markdown = 'Visit [our website](https://example.com) for more info.';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: text before link
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Visit ');
			}

			// Second: the link
			expect(paragraph.children[1].type).toBe('link');
			if (paragraph.children[1].type === 'link') {
				expect(paragraph.children[1].text).toBe('our website');
				expect(paragraph.children[1].url).toBe('https://example.com');
			}

			// Third: text after link
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' for more info.');
			}
		}
	});

	it('should parse multiple links', () => {
		const markdown = '[First](https://first.com) and [Second](https://second.com)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First link
			expect(paragraph.children[0].type).toBe('link');
			if (paragraph.children[0].type === 'link') {
				expect(paragraph.children[0].text).toBe('First');
				expect(paragraph.children[0].url).toBe('https://first.com');
			}

			// Text between
			expect(paragraph.children[1].type).toBe('text');
			if (paragraph.children[1].type === 'text') {
				expect(paragraph.children[1].content).toBe(' and ');
			}

			// Second link
			expect(paragraph.children[2].type).toBe('link');
			if (paragraph.children[2].type === 'link') {
				expect(paragraph.children[2].text).toBe('Second');
				expect(paragraph.children[2].url).toBe('https://second.com');
			}
		}
	});

	it('should not parse images as links (negative lookbehind)', () => {
		const markdown = '![Alt text](image.png)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('image');

		// Should NOT be parsed as a link
		if (ast.children[0].type === 'image') {
			expect(ast.children[0].src).toBe('image.png');
			expect(ast.children[0].alt).toBe('Alt text');
		}
	});

	it('should parse link and image on same line', () => {
		const markdown = 'Check [this](https://example.com) and ![img](pic.png)';
		const ast = parseMarkdown(markdown);

		// This is complex - the whole line becomes a paragraph since image is inline
		// Actually images on their own line are block-level, mixed with text they stay inline
		expect(ast.children.length).toBeGreaterThan(0);
	});
});

describe('parseMarkdown - hashtag support', () => {
	it('should parse simple hashtag', () => {
		const markdown = '#mathematiques';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hashtag');

			if (paragraph.children[0].type === 'hashtag') {
				expect(paragraph.children[0].tag).toBe('mathematiques');
			}
		}
	});

	it('should parse hashtag with accents', () => {
		const markdown = '#équation-dérivée';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hashtag');

			if (paragraph.children[0].type === 'hashtag') {
				expect(paragraph.children[0].tag).toBe('équation-dérivée');
			}
		}
	});

	it('should parse hashtag with underscore and digits', () => {
		const markdown = '#algebre_2nde';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hashtag');

			if (paragraph.children[0].type === 'hashtag') {
				expect(paragraph.children[0].tag).toBe('algebre_2nde');
			}
		}
	});

	it('should NOT parse heading as hashtag (space after #)', () => {
		const markdown = '# Heading';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('heading');

		if (ast.children[0].type === 'heading') {
			expect(ast.children[0].level).toBe(1);
		}
	});

	it('should NOT parse hex color as hashtag (digits only)', () => {
		const markdown = 'Color: #FF0000';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should be plain text, not hashtag
			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeUndefined();

			// Text should contain #FF0000
			const textContent = paragraph.children
				.filter((n) => n.type === 'text')
				.map((n) => (n.type === 'text' ? n.content : ''))
				.join('');
			expect(textContent).toContain('#FF0000');
		}
	});

	it('should parse multiple hashtags', () => {
		const markdown = '#math #facile';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			const hashtags = paragraph.children.filter((n) => n.type === 'hashtag');
			expect(hashtags).toHaveLength(2);

			if (hashtags[0].type === 'hashtag' && hashtags[1].type === 'hashtag') {
				expect(hashtags[0].tag).toBe('math');
				expect(hashtags[1].tag).toBe('facile');
			}
		}
	});

	it('should parse hashtag in text', () => {
		const markdown = 'Exercice sur les #fractions niveau #facile';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have text + hashtag + text + hashtag
			expect(paragraph.children.length).toBeGreaterThanOrEqual(4);

			// First text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Exercice sur les ');
			}

			// First hashtag
			expect(paragraph.children[1].type).toBe('hashtag');
			if (paragraph.children[1].type === 'hashtag') {
				expect(paragraph.children[1].tag).toBe('fractions');
			}

			// Find the second hashtag
			const hashtags = paragraph.children.filter((n) => n.type === 'hashtag');
			expect(hashtags).toHaveLength(2);
			if (hashtags[1].type === 'hashtag') {
				expect(hashtags[1].tag).toBe('facile');
			}
		}
	});

	it('should NOT parse hashtag preceded by alphanumeric', () => {
		const markdown = 'test#nohashtag';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should be plain text, no hashtag
			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeUndefined();
		}
	});

	it('should parse hashtag with math', () => {
		const markdown = 'Calculate $x^2$ #exercice';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have math and hashtag
			const mathNode = paragraph.children.find((n) => n.type === 'math-inline');
			expect(mathNode).toBeDefined();

			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeDefined();
			if (hashtagNode && hashtagNode.type === 'hashtag') {
				expect(hashtagNode.tag).toBe('exercice');
			}
		}
	});
});

describe('parseMarkdown - mention support', () => {
	it('should parse simple mention', () => {
		const markdown = '@alice';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('mention');

			if (paragraph.children[0].type === 'mention') {
				expect(paragraph.children[0].username).toBe('alice');
			}
		}
	});

	it('should parse mention with dot', () => {
		const markdown = '@jean.dupont';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('mention');

			if (paragraph.children[0].type === 'mention') {
				expect(paragraph.children[0].username).toBe('jean.dupont');
			}
		}
	});

	it('should parse mention with underscore and digits', () => {
		const markdown = '@user_123';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('mention');

			if (paragraph.children[0].type === 'mention') {
				expect(paragraph.children[0].username).toBe('user_123');
			}
		}
	});

	it('should NOT parse email as mention', () => {
		const markdown = 'Contact user@example.com for help';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have any mention nodes
			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeUndefined();

			// Email should be in text
			const textContent = paragraph.children
				.filter((n) => n.type === 'text')
				.map((n) => (n.type === 'text' ? n.content : ''))
				.join('');
			expect(textContent).toContain('user@example.com');
		}
	});

	it('should NOT parse mention starting with digit', () => {
		const markdown = '@123user';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have mention (starts with digit)
			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeUndefined();
		}
	});

	it('should parse multiple mentions', () => {
		const markdown = '@alice @bob';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			const mentions = paragraph.children.filter((n) => n.type === 'mention');
			expect(mentions).toHaveLength(2);

			if (mentions[0].type === 'mention' && mentions[1].type === 'mention') {
				expect(mentions[0].username).toBe('alice');
				expect(mentions[1].username).toBe('bob');
			}
		}
	});

	it('should parse mention in text', () => {
		const markdown = 'Bravo @marie pour cette solution !';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have text + mention + text
			expect(paragraph.children.length).toBeGreaterThanOrEqual(3);

			// First text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Bravo ');
			}

			// Mention
			expect(paragraph.children[1].type).toBe('mention');
			if (paragraph.children[1].type === 'mention') {
				expect(paragraph.children[1].username).toBe('marie');
			}

			// After text
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' pour cette solution !');
			}
		}
	});

	it('should NOT parse mention preceded by alphanumeric', () => {
		const markdown = 'test@notamention';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should be plain text, no mention
			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeUndefined();
		}
	});

	it('should parse mention with hashtag', () => {
		const markdown = 'Exercice #algebre pour @classe';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have both hashtag and mention
			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeDefined();
			if (hashtagNode && hashtagNode.type === 'hashtag') {
				expect(hashtagNode.tag).toBe('algebre');
			}

			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeDefined();
			if (mentionNode && mentionNode.type === 'mention') {
				expect(mentionNode.username).toBe('classe');
			}
		}
	});

	it('should parse mention with link', () => {
		const markdown = 'Contact @admin at [support](https://help.example.com)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have both mention and link
			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeDefined();
			if (mentionNode && mentionNode.type === 'mention') {
				expect(mentionNode.username).toBe('admin');
			}

			const linkNode = paragraph.children.find((n) => n.type === 'link');
			expect(linkNode).toBeDefined();
			if (linkNode && linkNode.type === 'link') {
				expect(linkNode.text).toBe('support');
				expect(linkNode.url).toBe('https://help.example.com');
			}
		}
	});
});

describe('parseMarkdown - hint reference support', () => {
	it('should parse simple hint reference', () => {
		const markdown = '{{hint:formula1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hint-reference');

			if (paragraph.children[0].type === 'hint-reference') {
				expect(paragraph.children[0].hintId).toBe('formula1');
			}
		}
	});

	it('should parse hint reference with dash', () => {
		const markdown = '{{hint:derivative-rule}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hint-reference');

			if (paragraph.children[0].type === 'hint-reference') {
				expect(paragraph.children[0].hintId).toBe('derivative-rule');
			}
		}
	});

	it('should parse hint reference with underscore', () => {
		const markdown = '{{hint:rappel_addition}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(1);
			expect(paragraph.children[0].type).toBe('hint-reference');

			if (paragraph.children[0].type === 'hint-reference') {
				expect(paragraph.children[0].hintId).toBe('rappel_addition');
			}
		}
	});

	it('should parse hint reference surrounded by text', () => {
		const markdown = 'Calculate the derivative. {{hint:derivative-rule}} Then simplify.';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			expect(paragraph.children).toHaveLength(3);

			// First: text before hint
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('Calculate the derivative. ');
			}

			// Second: hint reference
			expect(paragraph.children[1].type).toBe('hint-reference');
			if (paragraph.children[1].type === 'hint-reference') {
				expect(paragraph.children[1].hintId).toBe('derivative-rule');
			}

			// Third: text after hint
			expect(paragraph.children[2].type).toBe('text');
			if (paragraph.children[2].type === 'text') {
				expect(paragraph.children[2].content).toBe(' Then simplify.');
			}
		}
	});

	it('should parse multiple hint references', () => {
		const markdown = '{{hint:step1}} and {{hint:step2}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			const hints = paragraph.children.filter((n) => n.type === 'hint-reference');
			expect(hints).toHaveLength(2);

			if (hints[0].type === 'hint-reference' && hints[1].type === 'hint-reference') {
				expect(hints[0].hintId).toBe('step1');
				expect(hints[1].hintId).toBe('step2');
			}
		}
	});

	it('should NOT parse hint starting with digit', () => {
		const markdown = '{{hint:123-invalid}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have hint-reference node (starts with digit)
			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeUndefined();

			// Should be plain text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('{{hint:123-invalid}}');
			}
		}
	});

	it('should NOT parse variable placeholders as hints', () => {
		const markdown = '{{varName}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should NOT have hint-reference (no "hint:" prefix)
			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeUndefined();

			// Should be plain text
			expect(paragraph.children[0].type).toBe('text');
			if (paragraph.children[0].type === 'text') {
				expect(paragraph.children[0].content).toBe('{{varName}}');
			}
		}
	});

	it('should NOT parse blank placeholders as hints', () => {
		const markdown = '{{blank:1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];
			// Should be blank, not hint-reference
			expect(paragraph.children[0].type).toBe('blank');
			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeUndefined();
		}
	});

	it('should parse hint reference with math', () => {
		const markdown = 'Calculate $x^2$ {{hint:formula}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have math and hint
			const mathNode = paragraph.children.find((n) => n.type === 'math-inline');
			expect(mathNode).toBeDefined();
			if (mathNode && mathNode.type === 'math-inline') {
				expect(mathNode.expression).toBe('x^2');
			}

			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('formula');
			}
		}
	});

	it('should parse hint reference with blank', () => {
		const markdown = '{{blank:1}} {{hint:hint1}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have blank and hint
			const blankNode = paragraph.children.find((n) => n.type === 'blank');
			expect(blankNode).toBeDefined();
			if (blankNode && blankNode.type === 'blank') {
				expect(blankNode.index).toBe(1);
			}

			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('hint1');
			}
		}
	});

	it('should parse hint reference with link', () => {
		const markdown = 'See {{hint:explanation}} or [docs](https://example.com)';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have hint and link
			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('explanation');
			}

			const linkNode = paragraph.children.find((n) => n.type === 'link');
			expect(linkNode).toBeDefined();
			if (linkNode && linkNode.type === 'link') {
				expect(linkNode.text).toBe('docs');
				expect(linkNode.url).toBe('https://example.com');
			}
		}
	});

	it('should parse hint reference with hashtag and mention', () => {
		const markdown = '{{hint:help}} #math @teacher';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have hint, hashtag, and mention
			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('help');
			}

			const hashtagNode = paragraph.children.find((n) => n.type === 'hashtag');
			expect(hashtagNode).toBeDefined();
			if (hashtagNode && hashtagNode.type === 'hashtag') {
				expect(hashtagNode.tag).toBe('math');
			}

			const mentionNode = paragraph.children.find((n) => n.type === 'mention');
			expect(mentionNode).toBeDefined();
			if (mentionNode && mentionNode.type === 'mention') {
				expect(mentionNode.username).toBe('teacher');
			}
		}
	});

	it('should parse hint reference with formatting', () => {
		const markdown = '**Important:** {{hint:key-formula}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('paragraph');

		if (ast.children[0].type === 'paragraph') {
			const paragraph = ast.children[0];

			// Should have bold text and hint
			const boldNode = paragraph.children.find(
				(n) => n.type === 'text' && n.bold && n.content === 'Important:'
			);
			expect(boldNode).toBeDefined();

			const hintNode = paragraph.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('key-formula');
			}
		}
	});

	it('should parse hint reference in list item', () => {
		const markdown = `1. Solve $x^2 = 4$ {{hint:square-root}}
2. Simplify {{hint:simplify}}`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('list');

		if (ast.children[0].type === 'list') {
			const list = ast.children[0];
			expect(list.items).toHaveLength(2);

			// Check first item has hint
			const firstItem = list.items[0];
			if (firstItem.children[0].type === 'paragraph') {
				const hintNode = firstItem.children[0].children.find((n) => n.type === 'hint-reference');
				expect(hintNode).toBeDefined();
				if (hintNode && hintNode.type === 'hint-reference') {
					expect(hintNode.hintId).toBe('square-root');
				}
			}

			// Check second item has hint
			const secondItem = list.items[1];
			if (secondItem.children[0].type === 'paragraph') {
				const hintNode = secondItem.children[0].children.find((n) => n.type === 'hint-reference');
				expect(hintNode).toBeDefined();
				if (hintNode && hintNode.type === 'hint-reference') {
					expect(hintNode.hintId).toBe('simplify');
				}
			}
		}
	});

	it('should parse hint reference in heading', () => {
		const markdown = '## Formula {{hint:definition}}';
		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('heading');

		if (ast.children[0].type === 'heading') {
			const heading = ast.children[0];
			expect(heading.level).toBe(2);

			const hintNode = heading.children.find((n) => n.type === 'hint-reference');
			expect(hintNode).toBeDefined();
			if (hintNode && hintNode.type === 'hint-reference') {
				expect(hintNode.hintId).toBe('definition');
			}
		}
	});

	// =====================================
	// Paragraph Interruption Tests
	// =====================================
	// In ubumark, block elements can interrupt paragraphs without a blank line

	describe('paragraph interruption', () => {
		it('should allow heading to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
# Heading`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('heading');

			if (ast.children[1].type === 'heading') {
				expect(ast.children[1].level).toBe(1);
			}
		});

		it('should allow math block $$...$$ to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
$$x^2 + y^2 = z^2$$`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('math-block');

			if (ast.children[1].type === 'math-block') {
				expect(ast.children[1].expression).toBe('x^2 + y^2 = z^2');
			}
		});

		it('should allow math block ~~...~~ to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
~~a + b = c~~`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('math-block');

			if (ast.children[1].type === 'math-block') {
				expect(ast.children[1].expression).toBe('a + b = c');
			}
		});

		it('should allow code fence to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
\`\`\`js
const x = 1;
\`\`\``;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('code-block');

			if (ast.children[1].type === 'code-block') {
				expect(ast.children[1].language).toBe('js');
			}
		});

		it('should allow blockquote to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
> Quote here`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('blockquote');
		});

		it('should allow unordered list to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
- item 1
- item 2`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('list');

			if (ast.children[1].type === 'list') {
				expect(ast.children[1].ordered).toBe(false);
				expect(ast.children[1].items).toHaveLength(2);
			}
		});

		it('should allow ordered list to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
1. first
2. second`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('list');

			if (ast.children[1].type === 'list') {
				expect(ast.children[1].ordered).toBe(true);
				expect(ast.children[1].items).toHaveLength(2);
			}
		});

		it('should allow horizontal rule (--) to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
--`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('horizontal-rule');
		});

		it('should allow table to interrupt paragraph (no blank line)', () => {
			const markdown = `Some text
| A | B |
|---|---|
| 1 | 2 |`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(2);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('table');
		});

		it('should handle multiple consecutive interruptions', () => {
			const markdown = `Text 1
# Heading
Text 2
$$math$$
Text 3`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(5);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('heading');
			expect(ast.children[2].type).toBe('paragraph');
			expect(ast.children[3].type).toBe('math-block');
			expect(ast.children[4].type).toBe('paragraph');
		});
	});

	// =========================================================================
	// HORIZONTAL TABLES
	// =========================================================================
	describe('Horizontal Tables (:table-h)', () => {
		it('should parse :table-h directive followed by table', () => {
			const markdown = `:table-h
| Nom | Alice | Bob |
|-----|-------|-----|
| Age | 25    | 30  |`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			expect(ast.children[0].type).toBe('table');

			const table = ast.children[0] as { type: string; orientation?: string };
			expect(table.orientation).toBe('horizontal');
		});

		it('should parse vertical table without directive', () => {
			const markdown = `| A | B |
|---|---|
| 1 | 2 |`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(1);
			const table = ast.children[0] as { type: string; orientation?: string };
			expect(table.orientation).toBe('vertical');
		});

		it('should handle mixed horizontal and vertical tables', () => {
			const markdown = `:table-h
| H1 | a | b |
|----|---|---|
| H2 | c | d |

| V1 | V2 |
|----|-----|
| x  | y   |`;

			const ast = parseMarkdown(markdown);

			const tables = ast.children.filter((n) => n.type === 'table') as Array<{
				type: string;
				orientation?: string;
			}>;
			expect(tables).toHaveLength(2);
			expect(tables[0].orientation).toBe('horizontal');
			expect(tables[1].orientation).toBe('vertical');
		});

		it('should preserve math in horizontal table cells', () => {
			const markdown = `:table-h
| Variable | $x$ | $y$ |
|----------|-----|-----|
| Valeur   | 5   | 10  |`;

			const ast = parseMarkdown(markdown);

			const table = ast.children[0] as {
				type: string;
				header: Array<{ content: string }>;
			};
			expect(table.header[1].content).toContain('$');
		});

		it('should handle text before and after horizontal table', () => {
			const markdown = `Some text before

:table-h
| A | B |
|---|---|
| 1 | 2 |

Some text after`;

			const ast = parseMarkdown(markdown);

			expect(ast.children).toHaveLength(3);
			expect(ast.children[0].type).toBe('paragraph');
			expect(ast.children[1].type).toBe('table');
			expect(ast.children[2].type).toBe('paragraph');

			const table = ast.children[1] as { type: string; orientation?: string };
			expect(table.orientation).toBe('horizontal');
		});
	});
});
