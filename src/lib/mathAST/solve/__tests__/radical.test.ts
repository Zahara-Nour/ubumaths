/**
 * Radical Equation Solver Tests
 *
 * Tests for tryRadicalDecomposition: solving equations with
 * fractional exponents (√x, ∛x, x^(p/q)).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';
import { equals, number, variable, func, superscript, subtract, multiply } from '../../factory';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

/** Build equation from AST nodes */
function eq(
	lhs: import('../../types').MathNode,
	rhs: import('../../types').MathNode
): RelationNode {
	return equals(lhs, rhs);
}

describe('Radical equation solver', () => {
	describe('Simple square root', () => {
		it('should solve √x - 2 = 0 → x = 4', () => {
			const result = solve(parseEquation('\\sqrt{x} - 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(4, 5);
		});

		it('should solve √x = 2 → x = 4', () => {
			const result = solve(parseEquation('\\sqrt{x} = 2'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(4, 5);
		});

		it('should return no-solution for √x + 1 = 0 (√x = -1 impossible)', () => {
			const result = solve(parseEquation('\\sqrt{x} + 1 = 0'));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	describe('With coefficient', () => {
		it('should solve 2√x - 6 = 0 → √x = 3 → x = 9', () => {
			// 2*sqrt(x) - 6 = 0
			const lhs = subtract(
				multiply(number('2'), func('sqrt', [variable('x')]), 'implicit'),
				number('6')
			);
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(9, 5);
		});
	});

	describe('Cube root', () => {
		it('should solve ∛x - 2 = 0 → x = 8', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} - 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(8, 5);
		});

		it('should solve ∛x + 2 = 0 → x = -8 (odd root, negative OK)', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} + 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(-8, 5);
		});
	});

	describe('Composed argument (recursive solve)', () => {
		it('should solve √(x-1) - 3 = 0 → x-1 = 9 → x = 10', () => {
			// sqrt(x-1) - 3 = 0
			const lhs = subtract(func('sqrt', [subtract(variable('x'), number('1'))]), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(10, 5);
		});

		it('should solve √(x²-1) - 2 = 0 → x²-1 = 4 → x = ±√5', () => {
			// sqrt(x^2 - 1) - 2 = 0
			const innerExpr = subtract(superscript(variable('x'), number('2')), number('1'));
			const lhs = subtract(func('sqrt', [innerExpr]), number('2'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			const approxValues = result.solutions.map((s) => s.approximate).sort((a, b) => a! - b!);
			expect(approxValues[0]).toBeCloseTo(-Math.sqrt(5), 5);
			expect(approxValues[1]).toBeCloseTo(Math.sqrt(5), 5);
		});
	});

	describe('General fractional exponents (SuperscriptNode)', () => {
		it('should solve x^(2/3) = 4 → x = 4^(3/2) = 8', () => {
			// x^(2/3) - 4 = 0
			const lhs = subtract(
				superscript(variable('x'), {
					type: 'division',
					numerator: number('2'),
					denominator: number('3'),
					displayStyle: 'fraction'
				}),
				number('4')
			);
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(8, 5);
		});

		it('should solve x^(1/2) - 3 = 0 → x = 9', () => {
			// x^(1/2) - 3 = 0
			const lhs = subtract(
				superscript(variable('x'), {
					type: 'division',
					numerator: number('1'),
					denominator: number('2'),
					displayStyle: 'fraction'
				}),
				number('3')
			);
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(9, 5);
		});
	});

	describe('Non-radical equations (should fall through)', () => {
		it('should NOT intercept polynomial x² - 4 = 0', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'));

			expect(result.equationType).toBe('quadratic');
			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
		});

		it('should NOT intercept linear 2x + 4 = 0', () => {
			const result = solve(parseEquation('2x + 4 = 0'));

			expect(result.equationType).toBe('linear');
			expect(result.status).toBe('unique');
		});
	});
});
