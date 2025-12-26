/**
 * Semantic Roundtrip Tests
 * ========================
 *
 * Tests that verify semantic equivalence during markdown roundtrips.
 * Unlike strict roundtrip tests that require exact markdown preservation,
 * semantic tests verify that:
 *
 * 1. **Structure Preservation**: The TipTap JSON structure is preserved
 *    (same nodes, same content, same attributes) even if the markdown
 *    text differs slightly due to whitespace normalization.
 *
 * 2. **Stability**: After one roundtrip, subsequent roundtrips produce
 *    identical output (idempotent after first conversion).
 *
 * This is important because CommonMark allows multiple valid representations
 * of the same document structure (e.g., different blank line patterns).
 *
 * @module rich-text/__tests__/markdown-semantic-roundtrip.test
 */

import { describe, it, expect } from 'vitest';
import { tipTapToMarkdown } from '../markdown-export';
import { markdownToTipTap } from '../markdown-import';
import type { JSONContent } from '@tiptap/core';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Performs a full roundtrip: Markdown -> TipTap JSON -> Markdown
 */
function roundtrip(markdown: string): string {
	const json = markdownToTipTap(markdown);
	return tipTapToMarkdown(json);
}

/**
 * Performs a double roundtrip to test stability
 */
function doubleRoundtrip(markdown: string): { first: string; second: string } {
	const first = roundtrip(markdown);
	const second = roundtrip(first);
	return { first, second };
}

/**
 * Deep compares two TipTap JSON structures for semantic equivalence.
 * Ignores attributes that don't affect content semantics.
 */
function stripNonSemanticAttributes(json: JSONContent): JSONContent {
	const result: JSONContent = { type: json.type };

	// Copy only semantically meaningful attributes
	if (json.attrs) {
		const attrs: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(json.attrs)) {
			// Skip attributes that don't affect content semantics
			if (key === 'tight' || key === 'loose') continue;
			attrs[key] = value;
		}
		if (Object.keys(attrs).length > 0) {
			result.attrs = attrs;
		}
	}

	// Copy text content
	if (json.text !== undefined) {
		result.text = json.text;
	}

	// Copy marks
	if (json.marks && json.marks.length > 0) {
		result.marks = json.marks;
	}

	// Recursively process children
	if (json.content && json.content.length > 0) {
		result.content = json.content.map(stripNonSemanticAttributes);
	}

	return result;
}

/**
 * Tests that a markdown string is stable after roundtrip
 * (second export matches first export)
 */
function assertStability(markdown: string): void {
	const { first, second } = doubleRoundtrip(markdown);
	expect(second).toBe(first);
}

/**
 * Tests both semantic equivalence and stability
 */
function assertSemanticRoundtrip(markdown: string): void {
	const json1 = markdownToTipTap(markdown);
	const exported = tipTapToMarkdown(json1);
	const json2 = markdownToTipTap(exported);

	// Semantic equivalence: JSON structures should match
	const stripped1 = stripNonSemanticAttributes(json1);
	const stripped2 = stripNonSemanticAttributes(json2);
	expect(stripped2).toEqual(stripped1);

	// Stability: second export should match first
	const exported2 = tipTapToMarkdown(json2);
	expect(exported2).toBe(exported);
}

// ============================================================================
// SEMANTIC EQUIVALENCE TESTS
// ============================================================================

describe('Semantic Equivalence: Different markdown, same structure', () => {
	describe('Blank line variations', () => {
		it('loose vs tight list produces same paragraph content', () => {
			// Different blank line patterns can produce same content structure
			const tight = '- Item 1\n- Item 2';
			const loose = '- Item 1\n\n- Item 2';

			// Both should have the same text content
			const tightJson = markdownToTipTap(tight);
			const looseJson = markdownToTipTap(loose);

			// Extract text content from both
			const extractTexts = (json: JSONContent): string[] => {
				const texts: string[] = [];
				const visit = (node: JSONContent) => {
					if (node.text) texts.push(node.text);
					node.content?.forEach(visit);
				};
				visit(json);
				return texts;
			};

			expect(extractTexts(tightJson)).toEqual(extractTexts(looseJson));
		});

		it('extra blank lines between paragraphs normalize to single separation', () => {
			const single = 'First\n\nSecond';
			const double = 'First\n\n\nSecond';
			const triple = 'First\n\n\n\nSecond';

			// All should produce same structure after roundtrip
			const r1 = roundtrip(single);
			const r2 = roundtrip(double);
			const r3 = roundtrip(triple);

			// All normalize to same output
			expect(r2).toBe(r1);
			expect(r3).toBe(r1);
		});
	});

	describe('Indentation normalization', () => {
		it('code block indentation variations normalize', () => {
			// Extra indentation in code blocks should be preserved relative to base
			const md = '- Item\n\n  ```js\n  code\n  ```';
			assertSemanticRoundtrip(md);
		});

		it('nested list indentation is stable after roundtrip', () => {
			// Different indentation levels produce different structures,
			// but each should be stable after roundtrip
			const normal = '- Parent\n  - Child'; // 2 spaces - standard nesting
			assertStability(normal);

			// Over-indented content may be interpreted differently by parser
			// but once parsed, should remain stable
			const overIndented = '- Parent\n    - Child'; // 4 spaces
			assertStability(overIndented);
		});
	});
});

// ============================================================================
// STABILITY TESTS (Idempotent after first roundtrip)
// ============================================================================

describe('Stability: Second roundtrip matches first', () => {
	describe('Simple content', () => {
		it('paragraphs are stable', () => {
			assertStability('Simple paragraph');
			assertStability('First paragraph\n\nSecond paragraph');
		});

		it('inline formatting is stable', () => {
			assertStability('Text with **bold** and *italic*');
			assertStability('Use `inline code` here');
		});

		it('math is stable', () => {
			assertStability('Inline $x^2$ math');
			assertStability('Custom ~2/3~ fraction');
			assertStability('$$\\frac{a}{b}$$');
		});
	});

	describe('Block elements', () => {
		it('code blocks are stable', () => {
			assertStability('```javascript\nconst x = 1;\n```');
			assertStability('```\nno language\n```');
		});

		it('blockquotes are stable', () => {
			assertStability('> Simple quote');
			assertStability('> Line 1\n> Line 2');
		});

		it('horizontal rules are stable', () => {
			assertStability('Before\n\n---\n\nAfter');
		});

		it('headings are stable', () => {
			assertStability('# Heading 1');
			assertStability('## Heading 2');
			assertStability('### Heading 3');
		});
	});

	describe('Lists', () => {
		it('simple bullet lists are stable', () => {
			assertStability('- Item 1\n- Item 2\n- Item 3');
		});

		it('simple ordered lists are stable', () => {
			assertStability('1. First\n2. Second\n3. Third');
		});

		it('nested bullet lists are stable', () => {
			assertStability('- Parent\n  - Child 1\n  - Child 2');
		});

		it('nested ordered lists are stable', () => {
			assertStability('1. Parent\n   1. Child 1\n   2. Child 2');
		});

		it('mixed list types are stable', () => {
			assertStability('- Bullet\n  1. Ordered child');
			assertStability('1. Ordered\n   - Bullet child');
		});

		it('deeply nested lists (3+ levels) are stable', () => {
			assertStability('- L1\n  - L2\n    - L3');
			assertStability('1. L1\n   1. L2\n      1. L3');
		});
	});

	describe('Lists with blocks', () => {
		it('list with code block is stable', () => {
			assertStability('- Text\n\n  ```js\n  code\n  ```');
		});

		it('list with blockquote is stable', () => {
			assertStability('- Text\n\n  > quote');
		});

		it('list with math block is stable', () => {
			assertStability('- Text\n\n  $$math$$');
		});

		it('list starting with code block is stable', () => {
			assertStability('-\n  ```js\n  code\n  ```');
		});

		it('list starting with blockquote is stable', () => {
			assertStability('-\n  > quote');
		});

		it('list starting with math block is stable', () => {
			assertStability('-\n  $$math$$');
		});

		it('list with multiple block types is stable', () => {
			assertStability('- Text\n\n  > quote\n\n  ```js\n  code\n  ```\n\n  $$math$$');
		});

		it('nested list with blocks is stable', () => {
			assertStability('- Parent\n  - Child\n\n    ```js\n    code\n    ```');
		});
	});

	describe('Tables', () => {
		it('simple table is stable', () => {
			assertStability('| A | B |\n| --- | --- |\n| 1 | 2 |');
		});

		it('table in list item is stable', () => {
			assertStability('- Item\n\n  | A | B |\n  | --- | --- |\n  | 1 | 2 |');
		});

		it('table with :table-h directive is stable', () => {
			assertStability(':table-h\n| A | B |\n|:---|:---|\n| 1 | 2 |');
		});

		it('table with :table-h directive in list item is stable', () => {
			assertStability('- Item\n\n  :table-h\n  | A | B |\n  |:---|:---|\n  | 1 | 2 |');
		});

		it('ordered list with table and text is stable', () => {
			assertStability(
				'1. Voici le tableau donnant la loi de probabilité de Z.\n\n   | Eleve | Note | Mention |\n   |:---|:---|:---|\n   | Alice | 18 | TB |\n   | Bob | 14 | B |\n   | Claire | 16 | TB |'
			);
		});

		it('ordered list with :table-h table is stable', () => {
			assertStability(
				'1. Voici le tableau.\n\n   :table-h\n   | Eleve | Note |\n   |:---|:---|\n   | Alice | 18 |'
			);
		});
	});
});

// ============================================================================
// COMPLEX DOCUMENT TESTS
// ============================================================================

describe('Complex Documents: Full semantic roundtrip', () => {
	it('document with all block types', () => {
		const markdown = `# Heading

Paragraph with **bold** and *italic*.

> Blockquote

\`\`\`javascript
const code = true;
\`\`\`

$$\\frac{a}{b}$$

- List item 1
- List item 2

1. Ordered 1
2. Ordered 2

---

Final paragraph.`;

		assertSemanticRoundtrip(markdown);
	});

	it('document with complex list nesting', () => {
		const markdown = `- Level 1 first
  - Level 2 first
    - Level 3
  - Level 2 second
- Level 1 second
  1. Ordered child
  2. Another ordered`;

		assertSemanticRoundtrip(markdown);
	});

	it('document with blocks in nested lists', () => {
		const markdown = `- Parent item

  \`\`\`js
  code in parent
  \`\`\`

  - Child with quote

    > nested quote

  - Child with math

    $$x^2$$`;

		assertSemanticRoundtrip(markdown);
	});

	it('document with tables and lists', () => {
		const markdown = `## Data Table

| Name | Value |
| --- | --- |
| A | 1 |
| B | 2 |

### List with Table

- Item with table

  | X | Y |
  | --- | --- |
  | 1 | 2 |`;

		assertSemanticRoundtrip(markdown);
	});

	it('document with math inline and block', () => {
		const markdown = `Inline math: $x^2 + y^2 = z^2$

Custom notation: ~2/3~

Block math:

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

In a list:

- Formula: $E = mc^2$

  $$\\int_0^\\infty e^{-x^2} dx$$`;

		assertSemanticRoundtrip(markdown);
	});

	it('document with template variables', () => {
		const markdown = `Value: {{myVar}}

Random: {{1..10}}

Evaluated: {{eval:a+b}}

In list:

- {{blank:1}} + {{blank:2}} = {{blank:3}}`;

		assertSemanticRoundtrip(markdown);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases: Semantic handling of tricky inputs', () => {
	it('empty document remains empty', () => {
		const result = roundtrip('');
		expect(result).toBe('');
		assertStability('');
	});

	it('whitespace-only normalizes to empty', () => {
		const result = roundtrip('   \n\n   ');
		expect(result.trim()).toBe('');
	});

	it('single list item with only block', () => {
		assertSemanticRoundtrip('-\n  ```js\n  single\n  ```');
	});

	it('ordered list starting at different number', () => {
		// Note: We might normalize to 1, this tests current behavior
		const markdown = '5. Starting at 5\n6. Continuing';
		assertStability(markdown);
	});

	it('deeply nested mixed lists (4 levels)', () => {
		const markdown = '- L1\n  1. L2\n     - L3\n       1. L4';
		assertSemanticRoundtrip(markdown);
	});

	it('consecutive code blocks in list', () => {
		const markdown = '- Item\n\n  ```js\n  first\n  ```\n\n  ```python\n  second\n  ```';
		assertSemanticRoundtrip(markdown);
	});

	it('multiline blockquote in list', () => {
		const markdown = '- Item\n\n  > Line 1\n  > Line 2\n  > Line 3';
		assertSemanticRoundtrip(markdown);
	});

	it('list with table and other blocks', () => {
		const markdown = '- Before table\n\n  | A | B |\n  | --- | --- |\n  | 1 | 2 |\n\n  After table';
		assertSemanticRoundtrip(markdown);
	});
});

// ============================================================================
// REGRESSION TESTS: Previously problematic patterns
// ============================================================================

describe('Regression: Previously problematic patterns', () => {
	it('multiline blockquote lines not merged', () => {
		const markdown = '- Item\n\n  > Line 1\n  > Line 2';
		const json = markdownToTipTap(markdown);

		// Find the blockquote content
		const findBlockquote = (node: JSONContent): JSONContent | null => {
			if (node.type === 'blockquote') return node;
			for (const child of node.content || []) {
				const found = findBlockquote(child);
				if (found) return found;
			}
			return null;
		};

		const blockquote = findBlockquote(json);
		expect(blockquote).not.toBeNull();

		// Should have two paragraphs, not one merged paragraph
		expect(blockquote!.content?.length).toBe(2);
	});

	it('table in list not lost during import', () => {
		const markdown = '- Item\n\n  | A | B |\n  | --- | --- |\n  | 1 | 2 |';
		const json = markdownToTipTap(markdown);
		const exported = tipTapToMarkdown(json);

		// Table should be present in both JSON and exported markdown
		expect(exported).toContain('| A | B |');
		expect(exported).toContain('| 1 | 2 |');
	});

	it('nested list after block uses correct blank line', () => {
		const markdown = '- Text\n\n  ```js\n  code\n  ```\n\n  - Nested';
		const { first, second } = doubleRoundtrip(markdown);

		// Should be stable and have correct structure
		expect(second).toBe(first);
		expect(first).toContain('```js');
		expect(first).toContain('- Nested');
	});

	it('deep nesting preserves correct indentation', () => {
		const markdown = '1. L1\n   1. L2\n      1. L3\n   2. L2b\n2. L1b';
		const { first, second } = doubleRoundtrip(markdown);

		expect(second).toBe(first);
		// Verify structure is preserved
		expect(first).toContain('L1');
		expect(first).toContain('L2');
		expect(first).toContain('L3');
	});
});
