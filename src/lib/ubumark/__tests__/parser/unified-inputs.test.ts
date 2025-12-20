/**
 * Unified Input System Integration Tests
 * =======================================
 *
 * Tests for the unified input system that handles both:
 * - Text blanks ({{blank:N}} syntax)
 * - Math prompts (\placeholder[N]{} syntax within $...$)
 *
 * These tests verify the complete pipeline from markdown parsing
 * to AST generation with proper input detection.
 *
 * @module exercises/parser/unified-inputs.test
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { InputState } from '../../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to create InputState for testing
 */
function createInputState(
	index: number,
	type: 'text' | 'math',
	value = '',
	isCorrect: boolean | null = null
): InputState {
	return { index, value, type, isCorrect };
}

/**
 * Helper to find all text blanks in AST
 */
function findTextBlanks(ast: ReturnType<typeof parseMarkdown>): number[] {
	const indices: number[] = [];

	function traverse(children: unknown[]) {
		for (const node of children) {
			if (typeof node !== 'object' || node === null) continue;

			const n = node as Record<string, unknown>;
			if (n.type === 'blank' && typeof n.index === 'number') {
				indices.push(n.index);
			}
			if (n.type === 'paragraph' && Array.isArray(n.children)) {
				traverse(n.children);
			}
			if (n.type === 'list' && Array.isArray(n.items)) {
				for (const item of n.items as unknown[]) {
					if (typeof item === 'object' && item !== null) {
						const listItem = item as Record<string, unknown>;
						if (Array.isArray(listItem.children)) {
							traverse(listItem.children);
						}
					}
				}
			}
		}
	}

	traverse(ast.children);
	return indices;
}

/**
 * Helper to find all math expressions with placeholders in AST
 *
 * Note: Placeholder detection is done by checking if the expression contains \placeholder
 */
function findMathPrompts(
	ast: ReturnType<typeof parseMarkdown>
): { isBlock: boolean; expression: string }[] {
	const prompts: { isBlock: boolean; expression: string }[] = [];

	function traverse(children: unknown[]) {
		for (const node of children) {
			if (typeof node !== 'object' || node === null) continue;

			const n = node as Record<string, unknown>;
			if (
				(n.type === 'math-inline' || n.type === 'math-block') &&
				typeof n.expression === 'string' &&
				n.expression.includes('\\placeholder')
			) {
				prompts.push({
					isBlock: n.type === 'math-block',
					expression: n.expression as string
				});
			}
			if (n.type === 'paragraph' && Array.isArray(n.children)) {
				traverse(n.children);
			}
			if (n.type === 'list' && Array.isArray(n.items)) {
				for (const item of n.items as unknown[]) {
					if (typeof item === 'object' && item !== null) {
						const listItem = item as Record<string, unknown>;
						if (Array.isArray(listItem.children)) {
							traverse(listItem.children);
						}
					}
				}
			}
		}
	}

	traverse(ast.children);
	return prompts;
}

// ============================================================================
// PARSER INTEGRATION TESTS - TEXT BLANKS
// ============================================================================

describe('Unified Inputs - Text Blanks Parsing', () => {
	it('should parse single text blank', () => {
		const markdown = 'La reponse est {{blank:1}}';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		expect(blanks).toEqual([1]);
	});

	it('should parse multiple text blanks', () => {
		const markdown = '{{blank:1}} + {{blank:2}} = {{blank:3}}';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		expect(blanks).toEqual([1, 2, 3]);
	});

	it('should parse text blanks with surrounding math', () => {
		const markdown = 'Calculer $2 + 3$ = {{blank:1}}';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		expect(blanks).toEqual([1]);

		// Verify math is also parsed
		expect(ast.children[0].type).toBe('paragraph');
		if (ast.children[0].type === 'paragraph') {
			const hasMath = ast.children[0].children.some((n) => n.type === 'math-inline');
			expect(hasMath).toBe(true);
		}
	});

	it('should not parse variable placeholders as blanks', () => {
		const markdown = '{{varName}} is not a blank';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		expect(blanks).toEqual([]);
	});
});

// ============================================================================
// PARSER INTEGRATION TESTS - MATH PROMPTS
// ============================================================================

describe('Unified Inputs - Math Prompts Parsing', () => {
	it('should detect placeholder in inline math', () => {
		const markdown = 'Solve: $x = \\placeholder[1]{}$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].isBlock).toBe(false);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
	});

	it('should detect placeholder in block math', () => {
		const markdown = '$$\\frac{\\placeholder[1]{}}{2} = 5$$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].isBlock).toBe(true);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
	});

	it('should detect multiple placeholders in same expression', () => {
		const markdown = '$\\placeholder[1]{} + \\placeholder[2]{} = \\placeholder[3]{}$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
		expect(prompts[0].expression).toContain('\\placeholder[2]{}');
		expect(prompts[0].expression).toContain('\\placeholder[3]{}');
	});

	it('should handle multiple math expressions with prompts', () => {
		const markdown = 'First: $\\placeholder[1]{}$ and second: $\\placeholder[2]{}$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);
		expect(prompts).toHaveLength(2);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
		expect(prompts[1].expression).toContain('\\placeholder[2]{}');
	});

	it('should not mark regular math as having prompts', () => {
		const markdown = 'Regular math: $x^2 + 2x + 1$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);
		expect(prompts).toHaveLength(0);

		// But math should still be parsed
		if (ast.children[0].type === 'paragraph') {
			const mathNode = ast.children[0].children.find((n) => n.type === 'math-inline');
			expect(mathNode).toBeDefined();
			if (mathNode && mathNode.type === 'math-inline') {
				expect(mathNode.expression).toBe('x^2 + 2x + 1');
			}
		}
	});
});

// ============================================================================
// MIXED INPUTS TESTS
// ============================================================================

describe('Unified Inputs - Mixed Text Blanks and Math Prompts', () => {
	it('should parse both text blanks and math prompts in same document', () => {
		const markdown = `Calculer la valeur de $x$ :

$\\placeholder[1]{} + 5 = 12$

Reponse en texte: {{blank:2}}`;

		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		expect(blanks).toEqual([2]);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
	});

	it('should maintain separate indexing for blanks and prompts', () => {
		// Both use index 1, but they are different types
		const markdown = '$\\placeholder[1]{}$ et {{blank:1}}';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		// Both should find index 1
		expect(blanks).toEqual([1]);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
	});

	it('should handle complex exercise with multiple input types', () => {
		const markdown = `# Exercice

Resoudre l'equation:

$$\\frac{\\placeholder[1]{}}{\\placeholder[2]{}} = \\placeholder[3]{}$$

1. Numerateur: {{blank:1}}
2. Denominateur: {{blank:2}}
3. Resultat: {{blank:3}}`;

		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		expect(blanks).toEqual([1, 2, 3]);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
		expect(prompts[0].expression).toContain('\\placeholder[2]{}');
		expect(prompts[0].expression).toContain('\\placeholder[3]{}');
		expect(prompts[0].isBlock).toBe(true);
	});
});

// ============================================================================
// INPUT STATE TESTS
// ============================================================================

describe('Unified Inputs - InputState Type', () => {
	it('should create valid text input state', () => {
		const state = createInputState(1, 'text', '42', true);

		expect(state.index).toBe(1);
		expect(state.type).toBe('text');
		expect(state.value).toBe('42');
		expect(state.isCorrect).toBe(true);
	});

	it('should create valid math input state', () => {
		const state = createInputState(2, 'math', 'x^2', false);

		expect(state.index).toBe(2);
		expect(state.type).toBe('math');
		expect(state.value).toBe('x^2');
		expect(state.isCorrect).toBe(false);
	});

	it('should handle null validation state', () => {
		const state = createInputState(1, 'text', '', null);

		expect(state.isCorrect).toBe(null);
	});

	it('should support filtering by type', () => {
		const inputs: InputState[] = [
			createInputState(1, 'text', 'a'),
			createInputState(2, 'math', 'x'),
			createInputState(3, 'text', 'b'),
			createInputState(4, 'math', 'y')
		];

		const textInputs = inputs.filter((i) => i.type === 'text');
		const mathInputs = inputs.filter((i) => i.type === 'math');

		expect(textInputs).toHaveLength(2);
		expect(mathInputs).toHaveLength(2);
		expect(textInputs.map((i) => i.index)).toEqual([1, 3]);
		expect(mathInputs.map((i) => i.index)).toEqual([2, 4]);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Unified Inputs - Edge Cases', () => {
	it('should handle empty markdown', () => {
		const ast = parseMarkdown('');

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		expect(blanks).toEqual([]);
		expect(prompts).toEqual([]);
	});

	it('should handle markdown with only text', () => {
		const markdown = 'Just plain text without any inputs';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		expect(blanks).toEqual([]);
		expect(prompts).toEqual([]);
	});

	it('should handle high index numbers', () => {
		const markdown = '{{blank:999}} and $\\placeholder[1000]{}$';
		const ast = parseMarkdown(markdown);

		const blanks = findTextBlanks(ast);
		const prompts = findMathPrompts(ast);

		expect(blanks).toEqual([999]);
		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1000]{}');
	});

	it('should handle duplicate placeholders in same expression', () => {
		const markdown = '$\\placeholder[1]{} = \\placeholder[1]{}$';
		const ast = parseMarkdown(markdown);

		const prompts = findMathPrompts(ast);

		expect(prompts).toHaveLength(1);
		expect(prompts[0].expression).toContain('\\placeholder[1]{}');
	});
});
