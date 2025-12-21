/**
 * Unit tests for HoleNode - Mathematical placeholders/blanks
 *
 * Tests cover:
 * - Factory function (hole)
 * - Type guard (isHole)
 * - Custom syntax parsing (?)
 * - LaTeX parsing (\placeholder[N]{})
 * - Custom syntax generation
 * - LaTeX generation
 * - Round-trip conversions
 */

import { describe, it, expect } from 'vitest';
import { hole, MathAST, number, add, implicitMultiply, power } from '../factory';
import { isHole, isLiteralNode, isLeaf } from '../guards';
import { parseCustomPratt } from '../parser/custom/parser-pratt';
import { parseCustomRD } from '../parser/custom/parser-rd';
import { parseLatex } from '../parser';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { prettyPrint } from '../pretty-print';
import type { HoleNode } from '../types';

// =============================================================================
// Factory Tests
// =============================================================================

describe('HoleNode Factory', () => {
	describe('hole()', () => {
		it('creates hole node with index', () => {
			const node = hole(1);
			expect(node.type).toBe('hole');
			expect(node.index).toBe(1);
			expect(node.placeholder).toBeUndefined();
			expect(node.metadata).toBeUndefined();
		});

		it('creates hole node with index and placeholder', () => {
			const node = hole(2, 'answer');
			expect(node.type).toBe('hole');
			expect(node.index).toBe(2);
			expect(node.placeholder).toBe('answer');
		});

		it('creates hole node with metadata', () => {
			const node = hole(1, undefined, { color: 'red' });
			expect(node.type).toBe('hole');
			expect(node.index).toBe(1);
			expect(node.metadata?.color).toBe('red');
		});

		it('creates hole node with all options', () => {
			const node = hole(3, 'x', { color: 'blue' });
			expect(node.type).toBe('hole');
			expect(node.index).toBe(3);
			expect(node.placeholder).toBe('x');
			expect(node.metadata?.color).toBe('blue');
		});

		it('supports zero index', () => {
			const node = hole(0);
			expect(node.index).toBe(0);
		});
	});

	describe('MathAST.hole()', () => {
		it('creates hole node via namespace', () => {
			const node = MathAST.hole(1);
			expect(node.type).toBe('hole');
			expect(node.index).toBe(1);
		});
	});
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('HoleNode Type Guards', () => {
	describe('isHole()', () => {
		it('returns true for hole nodes', () => {
			const node = hole(1);
			expect(isHole(node)).toBe(true);
		});

		it('returns false for number nodes', () => {
			const node = number('42');
			expect(isHole(node)).toBe(false);
		});

		it('returns false for variable nodes', () => {
			const node = MathAST.variable('x');
			expect(isHole(node)).toBe(false);
		});
	});

	describe('isLiteralNode()', () => {
		it('includes hole nodes as literals', () => {
			const node = hole(1);
			expect(isLiteralNode(node)).toBe(true);
		});
	});

	describe('isLeaf()', () => {
		it('hole nodes are leaf nodes', () => {
			const node = hole(1);
			expect(isLeaf(node)).toBe(true);
		});
	});
});

// =============================================================================
// Custom Syntax Parsing Tests
// =============================================================================

describe('Custom Syntax Parsing', () => {
	describe('Pratt Parser', () => {
		it('parses single hole', () => {
			const ast = parseCustomPratt('?');
			expect(ast.type).toBe('hole');
			expect((ast as HoleNode).index).toBe(1);
		});

		it('parses hole in expression', () => {
			const ast = parseCustomPratt('? + 1');
			expect(ast.type).toBe('addition');
			if (ast.type === 'addition') {
				expect(ast.left.type).toBe('hole');
				expect((ast.left as HoleNode).index).toBe(1);
				expect(ast.right.type).toBe('number');
			}
		});

		it('parses multiple holes with sequential indices', () => {
			const ast = parseCustomPratt('? + ?');
			expect(ast.type).toBe('addition');
			if (ast.type === 'addition') {
				expect((ast.left as HoleNode).index).toBe(1);
				expect((ast.right as HoleNode).index).toBe(2);
			}
		});

		it('parses hole as base of power', () => {
			const ast = parseCustomPratt('?^2');
			expect(ast.type).toBe('superscript');
			if (ast.type === 'superscript') {
				expect(ast.base.type).toBe('hole');
				expect((ast.base as HoleNode).index).toBe(1);
			}
		});

		it('parses hole in complex expression', () => {
			const ast = parseCustomPratt('2? + 3');
			expect(ast.type).toBe('addition');
			if (ast.type === 'addition') {
				expect(ast.left.type).toBe('multiplication');
				if (ast.left.type === 'multiplication') {
					expect(ast.left.right.type).toBe('hole');
				}
			}
		});

		it('handles implicit multiplication before hole', () => {
			const ast = parseCustomPratt('x?');
			expect(ast.type).toBe('multiplication');
			if (ast.type === 'multiplication') {
				expect(ast.left.type).toBe('variable');
				expect(ast.right.type).toBe('hole');
			}
		});

		it('handles implicit multiplication after hole', () => {
			const ast = parseCustomPratt('?x');
			expect(ast.type).toBe('multiplication');
			if (ast.type === 'multiplication') {
				expect(ast.left.type).toBe('hole');
				expect(ast.right.type).toBe('variable');
			}
		});
	});

	describe('Recursive Descent Parser', () => {
		it('parses single hole', () => {
			const ast = parseCustomRD('?');
			expect(ast.type).toBe('hole');
			expect((ast as HoleNode).index).toBe(1);
		});

		it('parses multiple holes with sequential indices', () => {
			const ast = parseCustomRD('? * ?');
			expect(ast.type).toBe('multiplication');
			if (ast.type === 'multiplication') {
				expect((ast.left as HoleNode).index).toBe(1);
				expect((ast.right as HoleNode).index).toBe(2);
			}
		});

		it('parses hole in division', () => {
			const ast = parseCustomRD('?/?');
			expect(ast.type).toBe('division');
			if (ast.type === 'division') {
				expect((ast.numerator as HoleNode).index).toBe(1);
				expect((ast.denominator as HoleNode).index).toBe(2);
			}
		});
	});
});

// =============================================================================
// LaTeX Parsing Tests
// =============================================================================

describe('LaTeX Parsing', () => {
	it('parses \\placeholder[1]{}', () => {
		const ast = parseLatex('\\placeholder[1]{}');
		expect(ast.type).toBe('hole');
		expect((ast as HoleNode).index).toBe(1);
	});

	it('parses \\placeholder[5]{}', () => {
		const ast = parseLatex('\\placeholder[5]{}');
		expect(ast.type).toBe('hole');
		expect((ast as HoleNode).index).toBe(5);
	});

	it('parses placeholder without index (defaults to 1)', () => {
		const ast = parseLatex('\\placeholder{}');
		expect(ast.type).toBe('hole');
		expect((ast as HoleNode).index).toBe(1);
	});

	it('parses placeholder in expression', () => {
		const ast = parseLatex('\\placeholder[1]{} + x');
		expect(ast.type).toBe('addition');
		if (ast.type === 'addition') {
			expect(ast.left.type).toBe('hole');
			expect((ast.left as HoleNode).index).toBe(1);
		}
	});

	it('parses multiple placeholders with preserved indices', () => {
		const ast = parseLatex('\\placeholder[3]{} + \\placeholder[1]{}');
		expect(ast.type).toBe('addition');
		if (ast.type === 'addition') {
			expect((ast.left as HoleNode).index).toBe(3);
			expect((ast.right as HoleNode).index).toBe(1);
		}
	});
});

// =============================================================================
// Custom Syntax Generation Tests
// =============================================================================

describe('Custom Syntax Generation', () => {
	it('generates ? for hole', () => {
		const node = hole(1);
		expect(toCustom(node)).toBe('?');
	});

	it('generates ? regardless of index', () => {
		const node = hole(5);
		expect(toCustom(node)).toBe('?');
	});

	it('generates hole in expression', () => {
		const expr = add(hole(1), number('1'));
		expect(toCustom(expr)).toBe('?+1');
	});

	it('generates multiple holes', () => {
		const expr = add(hole(1), hole(2));
		expect(toCustom(expr)).toBe('?+?');
	});

	it('generates hole as power base', () => {
		const expr = power(hole(1), number('2'));
		expect(toCustom(expr)).toBe('?^2');
	});

	it('generates hole with implicit multiplication', () => {
		const expr = implicitMultiply(number('2'), hole(1));
		const result = toCustom(expr);
		expect(result).toBe('2?');
	});
});

// =============================================================================
// LaTeX Generation Tests
// =============================================================================

describe('LaTeX Generation', () => {
	it('generates \\placeholder[N]{} for hole', () => {
		const node = hole(1);
		expect(toLatex(node)).toBe('\\placeholder[1]{}');
	});

	it('preserves index in LaTeX', () => {
		const node = hole(5);
		expect(toLatex(node)).toBe('\\placeholder[5]{}');
	});

	it('generates hole in expression', () => {
		const expr = add(hole(1), MathAST.variable('x'));
		expect(toLatex(expr)).toBe('\\placeholder[1]{} + x');
	});

	it('generates multiple holes with different indices', () => {
		const expr = add(hole(1), hole(2));
		expect(toLatex(expr)).toBe('\\placeholder[1]{} + \\placeholder[2]{}');
	});

	it('generates hole in fraction', () => {
		const expr = MathAST.fraction(hole(1), MathAST.variable('x'));
		expect(toLatex(expr)).toBe('\\dfrac{\\placeholder[1]{}}{x}');
	});
});

// =============================================================================
// Round-trip Tests
// =============================================================================

describe('Round-trip Conversions', () => {
	describe('Custom -> AST -> Custom', () => {
		const customRoundTrips = ['?', '? + 1', '? + ?', '?^2', '2 * ?'];

		customRoundTrips.forEach((input) => {
			it(`round-trips: ${input}`, () => {
				const ast = parseCustomPratt(input);
				const output = toCustom(ast);
				const ast2 = parseCustomPratt(output);
				// Compare structure, not string (indices may differ)
				expect(ast2.type).toBe(ast.type);
			});
		});
	});

	describe('AST -> LaTeX -> AST', () => {
		it('preserves hole index through LaTeX', () => {
			const original = hole(3);
			const latex = toLatex(original);
			const parsed = parseLatex(latex) as HoleNode;
			expect(parsed.index).toBe(3);
		});

		it('preserves complex expression structure', () => {
			const original = add(hole(1), implicitMultiply(hole(2), MathAST.variable('x')));
			const latex = toLatex(original);
			const parsed = parseLatex(latex);
			expect(parsed.type).toBe('addition');
			if (parsed.type === 'addition') {
				expect(parsed.left.type).toBe('hole');
				expect(parsed.right.type).toBe('multiplication');
			}
		});
	});

	describe('LaTeX -> AST -> LaTeX', () => {
		const latexRoundTrips = [
			'\\placeholder[1]{}',
			'\\placeholder[5]{}',
			'\\placeholder[1]{} + x',
			'\\dfrac{\\placeholder[1]{}}{2}'
		];

		latexRoundTrips.forEach((input) => {
			it(`round-trips: ${input}`, () => {
				const ast = parseLatex(input);
				const output = toLatex(ast);
				expect(output).toBe(input);
			});
		});
	});
});

// =============================================================================
// Pretty Print Tests
// =============================================================================

describe('Pretty Print', () => {
	it('pretty prints hole node', () => {
		const node = hole(1);
		const output = prettyPrint(node);
		expect(output).toContain('Hole: ?1');
	});

	it('pretty prints hole with different index', () => {
		const node = hole(5);
		const output = prettyPrint(node);
		expect(output).toContain('Hole: ?5');
	});

	it('pretty prints hole in expression', () => {
		const expr = add(hole(1), number('1'));
		const output = prettyPrint(expr);
		expect(output).toContain('Hole: ?1');
		expect(output).toContain('Number: 1');
	});
});
