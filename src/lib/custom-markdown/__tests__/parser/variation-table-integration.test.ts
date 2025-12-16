/**
 * Variation Table Integration Tests
 * ==================================
 *
 * Tests for integration of variation table parsing with the main markdown parser.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { VariationTableNode } from '../../types/variation-table';

describe('Variation Table Integration', () => {
	it('should parse variation block in markdown document', () => {
		const markdown = `# Title

Some text before.

\`\`\`variation
variable: x
domain: -inf, 0, +inf

sign: f(x)
  -inf,0: +
  0: z
  0,+inf: -
\`\`\`

Some text after.`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(4);
		expect(ast.children[0].type).toBe('heading');
		expect(ast.children[1].type).toBe('paragraph');
		expect(ast.children[2].type).toBe('variation-table');
		expect(ast.children[3].type).toBe('paragraph');

		const variationNode = ast.children[2] as VariationTableNode;
		expect(variationNode.variable).toBe('x');
		expect(variationNode.domain).toHaveLength(3);
		expect(variationNode.rows).toHaveLength(1);
	});

	it('should not interfere with regular code blocks', () => {
		const markdown = `\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`variation
variable: x
domain: 0, 1

sign: f(x)
  0,1: +
\`\`\`

\`\`\`javascript
console.log("hello");
\`\`\``;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(3);
		expect(ast.children[0].type).toBe('code-block');
		expect(ast.children[1].type).toBe('variation-table');
		expect(ast.children[2].type).toBe('code-block');
	});

	it('should handle multiple variation tables', () => {
		const markdown = `\`\`\`variation
variable: x
domain: 0, 1

sign: f(x)
  0,1: +
\`\`\`

\`\`\`variation
variable: t
domain: -1, 0, 1

variation: g(t)
  -1: -1, bottom
  0: 0, center
  1: 1, top
\`\`\``;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(2);
		expect(ast.children[0].type).toBe('variation-table');
		expect(ast.children[1].type).toBe('variation-table');

		const first = ast.children[0] as VariationTableNode;
		const second = ast.children[1] as VariationTableNode;

		expect(first.variable).toBe('x');
		expect(second.variable).toBe('t');
	});

	it('should handle variation table with complex math expressions', () => {
		const markdown = `\`\`\`variation
variable: x
domain: 0, \\frac{\\pi}{2}, \\pi

sign: \\cos(x)
  0,\\frac{\\pi}{2}: +
  \\frac{\\pi}{2}: z
  \\frac{\\pi}{2},\\pi: -
\`\`\``;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(1);
		expect(ast.children[0].type).toBe('variation-table');

		const node = ast.children[0] as VariationTableNode;
		expect(node.domain[1].expression).toBe('\\frac{\\pi}{2}');
	});

	it('should handle variation table mixed with other block elements', () => {
		const markdown = `# Analyse de fonction

## Tableau de signes

\`\`\`variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 3, top
  +inf: -inf, bottom
\`\`\`

## Conclusion

- La fonction admet un maximum en $x = 0$
- Ce maximum vaut $f(0) = 3$`;

		const ast = parseMarkdown(markdown);

		// h1, h2, variation-table, h2, list
		expect(ast.children).toHaveLength(5);
		expect(ast.children[0].type).toBe('heading');
		expect(ast.children[1].type).toBe('heading');
		expect(ast.children[2].type).toBe('variation-table');
		expect(ast.children[3].type).toBe('heading');
		expect(ast.children[4].type).toBe('list');
	});

	it('should handle invalid variation block gracefully', () => {
		const markdown = `\`\`\`variation
domain: 0, 1
\`\`\``;

		const ast = parseMarkdown(markdown);

		// Invalid block (missing variable) should not produce a node
		// The parser returns null for invalid blocks, so no variation-table node
		expect(ast.children.every((c) => c.type !== 'variation-table')).toBe(true);
	});

	it('should preserve math expressions in other parts when variation table present', () => {
		const markdown = `Calculate $x^2$ for all $x$.

\`\`\`variation
variable: x
domain: -1, 0, 1

variation: f(x)
  -1: 1, top
  0: 0, bottom
  1: 1, top
\`\`\`

The result is $f(x) = x^2$.`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(3);
		expect(ast.children[0].type).toBe('paragraph');
		expect(ast.children[1].type).toBe('variation-table');
		expect(ast.children[2].type).toBe('paragraph');
	});
});
