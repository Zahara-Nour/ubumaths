/**
 * Tests for Quadratic Combination Analysis
 *
 * extractQuadraticCombination extracts the 6 coefficients of a degree ≤ 2
 * polynomial in two variables: A·x² + B·x·y + C·y² + D·x + E·y + F = 0
 */

import { describe, it, expect } from 'vitest';
import { extractQuadraticCombination } from '../quadratic-combination';
import { parseLatex } from '../../parser';
import type { MathNode } from '../../types';
import { isNumber, isOpposite } from '../../guards';

/** Parse LaTeX and extract quadratic coefficients for x, y. */
function extract(latex: string) {
	const node = parseLatex(latex);
	return extractQuadraticCombination(node, ['x', 'y']);
}

/** Get the numeric value of a MathNode (handles number and opposite(number)). */
function nodeToNumber(node: MathNode): number | null {
	if (isNumber(node)) return parseFloat(node.value);
	if (isOpposite(node) && isNumber(node.operand)) return -parseFloat(node.operand.value);
	return null;
}

/** Get numeric value of a monomial key from extraction result. */
function coeff(latex: string, key: string): number | null {
	const result = extract(latex);
	if (!result.isQuadratic) return null;
	if (key === '1') return nodeToNumber(result.constant);
	const c = result.coefficients.get(key);
	if (!c) return null;
	return nodeToNumber(c);
}

describe('extractQuadraticCombination', () => {
	describe('basic monomials', () => {
		it('extracts x² coefficient', () => {
			expect(coeff('3x^2', 'x^2')).toBe(3);
		});

		it('extracts y² coefficient', () => {
			expect(coeff('5y^2', 'y^2')).toBe(5);
		});

		it('extracts x·y coefficient', () => {
			expect(coeff('2xy', 'xy')).toBe(2);
		});

		it('extracts x coefficient (linear)', () => {
			expect(coeff('4x', 'x')).toBe(4);
		});

		it('extracts y coefficient (linear)', () => {
			expect(coeff('-3y', 'y')).toBe(-3);
		});

		it('extracts constant term', () => {
			expect(coeff('7', '1')).toBe(7);
		});
	});

	describe('conic equations', () => {
		it('circle: x² + y² - 9', () => {
			const result = extract('x^2 + y^2 - 9');
			expect(result.isQuadratic).toBe(true);
			expect(coeff('x^2 + y^2 - 9', 'x^2')).toBe(1);
			expect(coeff('x^2 + y^2 - 9', 'y^2')).toBe(1);
			expect(coeff('x^2 + y^2 - 9', 'xy')).toBe(0);
			expect(coeff('x^2 + y^2 - 9', 'x')).toBe(0);
			expect(coeff('x^2 + y^2 - 9', 'y')).toBe(0);
			expect(coeff('x^2 + y^2 - 9', '1')).toBe(-9);
		});

		it('ellipse: x²/4 + y²/9 - 1', () => {
			const result = extract('\\frac{x^2}{4} + \\frac{y^2}{9} - 1');
			expect(result.isQuadratic).toBe(true);
			// x² coefficient = 1/4
			const cx2 = result.coefficients.get('x^2')!;
			expect(cx2).toBeDefined();
		});

		it('hyperbola: x² - y² - 1', () => {
			expect(coeff('x^2 - y^2 - 1', 'x^2')).toBe(1);
			expect(coeff('x^2 - y^2 - 1', 'y^2')).toBe(-1);
			expect(coeff('x^2 - y^2 - 1', '1')).toBe(-1);
		});

		it('general conic: x² + xy + y² - 1', () => {
			const result = extract('x^2 + xy + y^2 - 1');
			expect(result.isQuadratic).toBe(true);
			expect(coeff('x^2 + xy + y^2 - 1', 'x^2')).toBe(1);
			expect(coeff('x^2 + xy + y^2 - 1', 'xy')).toBe(1);
			expect(coeff('x^2 + xy + y^2 - 1', 'y^2')).toBe(1);
			expect(coeff('x^2 + xy + y^2 - 1', '1')).toBe(-1);
		});

		it('crossed lines: xy', () => {
			expect(coeff('xy', 'xy')).toBe(1);
			expect(coeff('xy', 'x^2')).toBe(0);
			expect(coeff('xy', 'y^2')).toBe(0);
		});
	});

	describe('implicit coefficient = 1', () => {
		it('x² alone has coefficient 1', () => {
			expect(coeff('x^2', 'x^2')).toBe(1);
		});

		it('xy alone has coefficient 1', () => {
			expect(coeff('xy', 'xy')).toBe(1);
		});
	});

	describe('combined linear + quadratic', () => {
		it('x² + 2x + 1 (perfect square)', () => {
			expect(coeff('x^2 + 2x + 1', 'x^2')).toBe(1);
			expect(coeff('x^2 + 2x + 1', 'x')).toBe(2);
			expect(coeff('x^2 + 2x + 1', '1')).toBe(1);
		});

		it('2x² - 3xy + y² + x - 5', () => {
			const expr = '2x^2 - 3xy + y^2 + x - 5';
			expect(coeff(expr, 'x^2')).toBe(2);
			expect(coeff(expr, 'xy')).toBe(-3);
			expect(coeff(expr, 'y^2')).toBe(1);
			expect(coeff(expr, 'x')).toBe(1);
			expect(coeff(expr, 'y')).toBe(0);
			expect(coeff(expr, '1')).toBe(-5);
		});
	});

	describe('rejection of degree > 2', () => {
		it('rejects x³', () => {
			const result = extract('x^3');
			expect(result.isQuadratic).toBe(false);
		});

		it('rejects x²y (degree 3)', () => {
			const result = extract('x^2 y');
			expect(result.isQuadratic).toBe(false);
		});

		it('rejects x²y² (degree 4)', () => {
			const result = extract('x^2 y^2');
			expect(result.isQuadratic).toBe(false);
		});
	});

	describe('non-polynomial rejection', () => {
		it('rejects sin(x)', () => {
			const result = extract('\\sin(x)');
			expect(result.isQuadratic).toBe(false);
		});

		it('rejects sqrt(x)', () => {
			const result = extract('\\sqrt{x}');
			expect(result.isQuadratic).toBe(false);
		});
	});

	describe('affine (degree ≤ 1) passes through', () => {
		it('accepts purely linear 2x + 3y + 1 as quadratic (degree ≤ 2)', () => {
			const result = extract('2x + 3y + 1');
			expect(result.isQuadratic).toBe(true);
			expect(coeff('2x + 3y + 1', 'x^2')).toBe(0);
			expect(coeff('2x + 3y + 1', 'xy')).toBe(0);
			expect(coeff('2x + 3y + 1', 'y^2')).toBe(0);
			expect(coeff('2x + 3y + 1', 'x')).toBe(2);
			expect(coeff('2x + 3y + 1', 'y')).toBe(3);
			expect(coeff('2x + 3y + 1', '1')).toBe(1);
		});
	});

	describe('negative and subtraction', () => {
		it('-x² gives coefficient -1', () => {
			expect(coeff('-x^2', 'x^2')).toBe(-1);
		});

		it('x² - y² gives y² coefficient -1', () => {
			expect(coeff('x^2 - y^2', 'y^2')).toBe(-1);
		});
	});
});
