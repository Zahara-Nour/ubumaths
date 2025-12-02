/**
 * Tests for \textcolor as transparent wrapper
 *
 * These tests verify that \textcolor doesn't change the AST structure,
 * only applies color metadata.
 *
 * @module mathAST/parser/__tests__/textcolor-transparent.test
 */

import { describe, it, expect } from 'vitest';
import { parsePratt } from '../parser-pratt';
import { parseRD } from '../parser-rd';
import type { MathNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to assert node type
 */
function expectType<T extends MathNode['type']>(
	node: MathNode,
	type: T
): asserts node is Extract<MathNode, { type: T }> {
	expect(node.type).toBe(type);
}

/**
 * Test both parsers with the same input
 */
function testBothParsers(
	description: string,
	input: string,
	verify: (node: MathNode) => void
): void {
	describe(description, () => {
		it('[Pratt] ' + description, () => {
			const node = parsePratt(input);
			verify(node);
		});

		it('[RD] ' + description, () => {
			const node = parseRD(input);
			verify(node);
		});
	});
}

// =============================================================================
// \textcolor Transparency Tests
// =============================================================================

describe('\textcolor Transparency - Infix Operators', () => {
	testBothParsers(
		'should parse 5 \\textcolor{red}{+3} as Addition(5, 3) with red on + and 3',
		'5 \\textcolor{red}{+3}',
		(node) => {
			expectType(node, 'addition');
			expectType(node.left, 'number');
			expect(node.left.value).toBe('5');
			expect(node.left.metadata?.color).toBeUndefined();

			// The addition itself should have red color
			expect(node.metadata?.color).toBe('red');

			expectType(node.right, 'number');
			expect(node.right.value).toBe('3');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers(
		'should parse 5 \\textcolor{red}{-3} as Subtraction(5, 3)',
		'5 \\textcolor{red}{-3}',
		(node) => {
			expectType(node, 'subtraction');
			expectType(node.left, 'number');
			expect(node.left.value).toBe('5');

			expect(node.metadata?.color).toBe('red');

			expectType(node.right, 'number');
			expect(node.right.value).toBe('3');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers(
		'should parse 5 \\textcolor{red}{*3} as Multiplication(5, 3)',
		'5 \\textcolor{red}{*3}',
		(node) => {
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('star');
			expectType(node.left, 'number');
			expect(node.left.value).toBe('5');

			expect(node.metadata?.color).toBe('red');

			expectType(node.right, 'number');
			expect(node.right.value).toBe('3');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers(
		'should parse x \\textcolor{blue}{^2} as Superscript(x, 2)',
		'x \\textcolor{blue}{^2}',
		(node) => {
			expectType(node, 'superscript');
			expectType(node.base, 'variable');
			expect(node.base.name).toBe('x');
			expect(node.base.metadata?.color).toBeUndefined();

			expect(node.metadata?.color).toBe('blue');

			expectType(node.superscript, 'number');
			expect(node.superscript.value).toBe('2');
			expect(node.superscript.metadata?.color).toBe('blue');
		}
	);
});

describe('\textcolor Transparency - Complex Expressions', () => {
	testBothParsers(
		'should parse \\textcolor{red}{x}+y as Addition with red only on x',
		'\\textcolor{red}{x}+y',
		(node) => {
			expectType(node, 'addition');
			expectType(node.left, 'variable');
			expect(node.left.name).toBe('x');
			expect(node.left.metadata?.color).toBe('red');

			expectType(node.right, 'variable');
			expect(node.right.name).toBe('y');
			expect(node.right.metadata?.color).toBeUndefined();
		}
	);

	testBothParsers(
		'should parse \\textcolor{red}{x+y} with red on entire expression',
		'\\textcolor{red}{x+y}',
		(node) => {
			expectType(node, 'addition');
			expect(node.metadata?.color).toBe('red');
			expectType(node.left, 'variable');
			expect(node.left.metadata?.color).toBe('red');
			expectType(node.right, 'variable');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers(
		'should parse \\textcolor{blue}{2}\\textcolor{red}{+3} correctly',
		'\\textcolor{blue}{2}\\textcolor{red}{+3}',
		(node) => {
			expectType(node, 'addition');

			expectType(node.left, 'number');
			expect(node.left.value).toBe('2');
			expect(node.left.metadata?.color).toBe('blue');

			expect(node.metadata?.color).toBe('red');

			expectType(node.right, 'number');
			expect(node.right.value).toBe('3');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers(
		'should handle multiple operators: 5 \\textcolor{red}{+3-2}',
		'5 \\textcolor{red}{+3-2}',
		(node) => {
			// This should be: 5 + (3 - 2) all with proper colors
			// Actually, with left-associativity: (5 + 3) - 2
			expectType(node, 'subtraction');
			expectType(node.left, 'addition');
			expectType(node.left.left, 'number');
			expect(node.left.left.value).toBe('5');
			expect(node.left.left.metadata?.color).toBeUndefined();

			// The + operator and 3 should be red
			expect(node.left.metadata?.color).toBe('red');
			expectType(node.left.right, 'number');
			expect(node.left.right.value).toBe('3');
			expect(node.left.right.metadata?.color).toBe('red');

			// The - operator and 2 should be red
			expect(node.metadata?.color).toBe('red');
			expectType(node.right, 'number');
			expect(node.right.value).toBe('2');
			expect(node.right.metadata?.color).toBe('red');
		}
	);
});

describe('\textcolor Transparency - Nested Colors', () => {
	testBothParsers(
		'should handle nested textcolor correctly',
		'\\textcolor{red}{x + \\textcolor{blue}{y}}',
		(node) => {
			expectType(node, 'addition');
			expect(node.metadata?.color).toBe('red');

			expectType(node.left, 'variable');
			expect(node.left.name).toBe('x');
			expect(node.left.metadata?.color).toBe('red');

			expectType(node.right, 'variable');
			expect(node.right.name).toBe('y');
			expect(node.right.metadata?.color).toBe('blue');
		}
	);

	testBothParsers(
		'should handle color scope ending correctly',
		'\\textcolor{red}{a + \\textcolor{blue}{b} + c}',
		(node) => {
			expectType(node, 'addition');
			// The outer addition should be red
			expect(node.metadata?.color).toBe('red');

			// Left side: (a + b)
			expectType(node.left, 'addition');
			expect(node.left.metadata?.color).toBe('red');

			expectType(node.left.left, 'variable');
			expect(node.left.left.name).toBe('a');
			expect(node.left.left.metadata?.color).toBe('red');

			expectType(node.left.right, 'variable');
			expect(node.left.right.name).toBe('b');
			expect(node.left.right.metadata?.color).toBe('blue');

			// Right side: c
			expectType(node.right, 'variable');
			expect(node.right.name).toBe('c');
			expect(node.right.metadata?.color).toBe('red');
		}
	);
});

describe('\textcolor Transparency - Edge Cases', () => {
	testBothParsers(
		'should handle textcolor with implicit multiplication',
		'2\\textcolor{red}{x}',
		(node) => {
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('implicit');

			expectType(node.left, 'number');
			expect(node.left.value).toBe('2');

			expectType(node.right, 'variable');
			expect(node.right.name).toBe('x');
			expect(node.right.metadata?.color).toBe('red');
		}
	);

	testBothParsers('should handle textcolor with relations', 'x \\textcolor{red}{= 5}', (node) => {
		expectType(node, 'relation');
		expect(node.relation).toBe('=');
		expect(node.metadata?.color).toBe('red');

		expectType(node.left, 'variable');
		expect(node.left.name).toBe('x');
		expect(node.left.metadata?.color).toBeUndefined();

		expectType(node.right, 'number');
		expect(node.right.value).toBe('5');
		expect(node.right.metadata?.color).toBe('red');
	});

	testBothParsers('should handle textcolor with division', 'a \\textcolor{green}{/ b}', (node) => {
		expectType(node, 'division');
		expect(node.displayStyle).toBe('inline');
		expect(node.metadata?.color).toBe('green');

		expectType(node.numerator, 'variable');
		expect(node.numerator.name).toBe('a');
		expect(node.numerator.metadata?.color).toBeUndefined();

		expectType(node.denominator, 'variable');
		expect(node.denominator.name).toBe('b');
		expect(node.denominator.metadata?.color).toBe('green');
	});
});

describe('\textcolor Transparency - Operator Color Application', () => {
	testBothParsers(
		'should apply color to operator metadata',
		'a \\textcolor{purple}{+ b}',
		(node) => {
			expectType(node, 'addition');
			// The operator itself should have the color
			expect(node.metadata?.color).toBe('purple');

			expectType(node.left, 'variable');
			expect(node.left.name).toBe('a');
			expect(node.left.metadata?.color).toBeUndefined();

			expectType(node.right, 'variable');
			expect(node.right.name).toBe('b');
			expect(node.right.metadata?.color).toBe('purple');
		}
	);

	testBothParsers(
		'should handle colored multiplication operator',
		'x \\textcolor{orange}{\\cdot y}',
		(node) => {
			expectType(node, 'multiplication');
			expect(node.displayStyle).toBe('dot');
			expect(node.metadata?.color).toBe('orange');

			expectType(node.left, 'variable');
			expect(node.left.name).toBe('x');

			expectType(node.right, 'variable');
			expect(node.right.name).toBe('y');
			expect(node.right.metadata?.color).toBe('orange');
		}
	);
});
