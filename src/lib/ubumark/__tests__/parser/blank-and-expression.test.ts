/**
 * Parser Tests — <<expr:NAME>> expression markers
 * ==================================================
 *
 * Tests that the ubumark parser correctly detects <<expr:NAME>> markers
 * in math nodes and populates the expressionName field.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { MathInlineNode, MathBlockNode } from '../../types/ast';

describe('parseMarkdown — <<expr:NAME>> expression markers', () => {
	describe('inline math with expression marker', () => {
		it('should detect <<expr:expression1>> and set expressionName', () => {
			const ast = parseMarkdown('Calculer $<<expr:expression1>>10^2$');

			expect(ast.children).toHaveLength(1);
			const paragraph = ast.children[0];
			expect(paragraph.type).toBe('paragraph');

			if (paragraph.type === 'paragraph') {
				const mathNode = paragraph.children.find((n) => n.type === 'math-inline') as MathInlineNode;
				expect(mathNode).toBeDefined();
				expect(mathNode.expressionName).toBe('expression1');
				expect(mathNode.expression).toBe('10^2');
			}
		});

		it('should remove the marker from expression content', () => {
			const ast = parseMarkdown('$<<expr:expression2>>x + y$');

			if (ast.children[0].type === 'paragraph') {
				const mathNode = ast.children[0].children.find(
					(n) => n.type === 'math-inline'
				) as MathInlineNode;
				expect(mathNode.expression).toBe('x + y');
				expect(mathNode.expression).not.toContain('<<expr:');
			}
		});
	});

	describe('block math with expression marker', () => {
		it('should detect <<expr:expression1>> in block math', () => {
			const ast = parseMarkdown('$$<<expr:expression1>>10^{2} \\times 10^{3}$$');

			expect(ast.children).toHaveLength(1);
			const mathBlock = ast.children[0] as MathBlockNode;
			expect(mathBlock.type).toBe('math-block');
			expect(mathBlock.expressionName).toBe('expression1');
			expect(mathBlock.expression).toBe('10^{2} \\times 10^{3}');
		});

		it('should remove the marker from block math content', () => {
			const ast = parseMarkdown('$$<<expr:expressionPrime>>\\frac{a}{b}$$');

			const mathBlock = ast.children[0] as MathBlockNode;
			expect(mathBlock.expression).toBe('\\frac{a}{b}');
			expect(mathBlock.expression).not.toContain('<<expr:');
		});
	});

	describe('math without expression marker', () => {
		it('should not set expressionName on inline math without marker', () => {
			const ast = parseMarkdown('$x^2 + 1$');

			if (ast.children[0].type === 'paragraph') {
				const mathNode = ast.children[0].children.find(
					(n) => n.type === 'math-inline'
				) as MathInlineNode;
				expect(mathNode.expressionName).toBeUndefined();
				expect(mathNode.expression).toBe('x^2 + 1');
			}
		});

		it('should not set expressionName on block math without marker', () => {
			const ast = parseMarkdown('$$\\int_0^1 x dx$$');

			const mathBlock = ast.children[0] as MathBlockNode;
			expect(mathBlock.expressionName).toBeUndefined();
		});
	});

	describe('expression marker in mixed content', () => {
		it('should handle expression marker alongside plain text and other math', () => {
			const ast = parseMarkdown('Calculer $<<expr:expression1>>10^2$ sachant que $x = 5$');

			if (ast.children[0].type === 'paragraph') {
				const nodes = ast.children[0].children;
				// Should have: text, math(expression), text, math(plain), optional trailing text
				const mathNodes = nodes.filter((n) => n.type === 'math-inline') as MathInlineNode[];
				expect(mathNodes).toHaveLength(2);

				expect(mathNodes[0].expressionName).toBe('expression1');
				expect(mathNodes[0].expression).toBe('10^2');

				expect(mathNodes[1].expressionName).toBeUndefined();
				expect(mathNodes[1].expression).toBe('x = 5');
			}
		});

		it('should handle block expression followed by inline math', () => {
			const md =
				'$$<<expr:expression1>>10^{2} \\times 10^{3}$$\n\nEt $\\placeholder[1]{} + \\placeholder[2]{} = 10$';
			const ast = parseMarkdown(md);

			// First block: math-block with expression
			const mathBlock = ast.children[0] as MathBlockNode;
			expect(mathBlock.type).toBe('math-block');
			expect(mathBlock.expressionName).toBe('expression1');

			// Second block: paragraph with inline math (no expression)
			const paragraph = ast.children[1];
			if (paragraph.type === 'paragraph') {
				const inlineMath = paragraph.children.find(
					(n) => n.type === 'math-inline'
				) as MathInlineNode;
				expect(inlineMath.expressionName).toBeUndefined();
			}
		});
	});

	describe('expression name formats', () => {
		it('should handle expression1, expression2, etc.', () => {
			const ast = parseMarkdown('$<<expr:expression2>>a + b$');

			if (ast.children[0].type === 'paragraph') {
				const mathNode = ast.children[0].children.find(
					(n) => n.type === 'math-inline'
				) as MathInlineNode;
				expect(mathNode.expressionName).toBe('expression2');
			}
		});

		it('should handle longer expression names like expressionPrime', () => {
			const ast = parseMarkdown('$$<<expr:expressionPrime>>f(x)$$');

			const mathBlock = ast.children[0] as MathBlockNode;
			expect(mathBlock.expressionName).toBe('expressionPrime');
		});
	});
});
