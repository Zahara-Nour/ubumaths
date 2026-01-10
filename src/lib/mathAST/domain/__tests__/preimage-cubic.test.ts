/**
 * Tests for cubic polynomial solving in preimage computation
 */

import { describe, it, expect } from 'vitest';
import { classifyExpression, findZeros, solveCubicInequality } from '../preimage';
import { containsValue } from '../algebra';
import { power, variable, add, subtract, implicitMultiply, number } from '../../factory';

describe('cubic expression classification', () => {
	it('classifies x³ as cubic', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const result = classifyExpression(xCubed, 'x');

		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
		}
	});

	it('classifies (x+1)³ correctly', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const cubed = power(xPlus1, number('3'));
		const result = classifyExpression(cubed, 'x');

		// (x+1)³ = x³ + 3x² + 3x + 1
		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(3);
			expect(result.c).toBe(3);
			expect(result.d).toBe(1);
		}
	});

	it('classifies (2x-1)³ correctly', () => {
		const x = variable('x');
		const twoX = implicitMultiply(number('2'), x);
		const twoXMinus1 = subtract(twoX, number('1'));
		const cubed = power(twoXMinus1, number('3'));
		const result = classifyExpression(cubed, 'x');

		// (2x-1)³ = 8x³ - 12x² + 6x - 1
		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(8);
			expect(result.b).toBe(-12);
			expect(result.c).toBe(6);
			expect(result.d).toBe(-1);
		}
	});

	it('classifies x³ + x correctly', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const expr = add(xCubed, x);
		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(1);
			expect(result.d).toBe(0);
		}
	});

	it('classifies x³ - x² + 2x - 3 correctly', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const xSquared = power(x, number('2'));
		const twoX = implicitMultiply(number('2'), x);

		// Build: x³ - x² + 2x - 3
		const part1 = subtract(xCubed, xSquared);
		const part2 = add(part1, twoX);
		const expr = subtract(part2, number('3'));

		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(-1);
			expect(result.c).toBe(2);
			expect(result.d).toBe(-3);
		}
	});

	it('classifies 2x * x² as cubic', () => {
		const x = variable('x');
		const twoX = implicitMultiply(number('2'), x);
		const xSquared = power(x, number('2'));
		const expr = implicitMultiply(twoX, xSquared);
		const result = classifyExpression(expr, 'x');

		// 2x * x² = 2x³
		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(2);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
		}
	});

	it('classifies (x+1)(x²) as cubic', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const xSquared = power(x, number('2'));
		const expr = implicitMultiply(xPlus1, xSquared);
		const result = classifyExpression(expr, 'x');

		// (x+1) * x² = x³ + x²
		expect(result.kind).toBe('cubic');
		if (result.kind === 'cubic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(1);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
		}
	});
});

describe('findZeros for cubic expressions', () => {
	it('finds zero of x³ = 0', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const zeros = findZeros(xCubed, 'x');

		expect(zeros).toHaveLength(1);
		expect(zeros[0]).toBeCloseTo(0, 8);
	});

	it('finds zeros of x³ - x = 0 (factors: x(x-1)(x+1))', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const expr = subtract(xCubed, x);
		const zeros = findZeros(expr, 'x');

		// Roots are -1, 0, 1
		expect(zeros).toHaveLength(3);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-1, 6);
		expect(sortedZeros[1]).toBeCloseTo(0, 6);
		expect(sortedZeros[2]).toBeCloseTo(1, 6);
	});

	it('finds zero of x³ - 8 = 0', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const expr = subtract(xCubed, number('8'));
		const zeros = findZeros(expr, 'x');

		// Only real root is x = 2
		expect(zeros).toHaveLength(1);
		expect(zeros[0]).toBeCloseTo(2, 6);
	});

	it('finds zero of x³ + 1 = 0', () => {
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const expr = add(xCubed, number('1'));
		const zeros = findZeros(expr, 'x');

		// Only real root is x = -1
		expect(zeros).toHaveLength(1);
		expect(zeros[0]).toBeCloseTo(-1, 6);
	});

	it('finds zeros of (x-1)³ = 0 (triple root)', () => {
		const x = variable('x');
		const xMinus1 = subtract(x, number('1'));
		const expr = power(xMinus1, number('3'));
		const zeros = findZeros(expr, 'x');

		expect(zeros.length).toBeGreaterThanOrEqual(1);
		expect(zeros[0]).toBeCloseTo(1, 6);
	});

	it('finds zeros of x³ - 6x² + 11x - 6 = 0 (roots: 1, 2, 3)', () => {
		// (x-1)(x-2)(x-3) = x³ - 6x² + 11x - 6
		const x = variable('x');
		const xCubed = power(x, number('3'));
		const xSquared = power(x, number('2'));
		const sixXSq = implicitMultiply(number('6'), xSquared);
		const elevenX = implicitMultiply(number('11'), x);

		const part1 = subtract(xCubed, sixXSq);
		const part2 = add(part1, elevenX);
		const expr = subtract(part2, number('6'));

		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(3);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(1, 5);
		expect(sortedZeros[1]).toBeCloseTo(2, 5);
		expect(sortedZeros[2]).toBeCloseTo(3, 5);
	});
});

describe('solveCubicInequality', () => {
	describe('one real root cases', () => {
		it('solves x³ >= 0 (root at 0)', () => {
			const domain = solveCubicInequality(1, 0, 0, 0, '>=', 0, false, 'x');
			// x³ >= 0 when x >= 0
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(false);
		});

		it('solves x³ > 0 (strict)', () => {
			const domain = solveCubicInequality(1, 0, 0, 0, '>=', 0, true, 'x');
			// x³ > 0 when x > 0
			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(false);
		});

		it('solves x³ <= 0', () => {
			const domain = solveCubicInequality(1, 0, 0, 0, '<=', 0, false, 'x');
			// x³ <= 0 when x <= 0
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(false);
		});

		it('solves x³ - 8 >= 0 (x >= 2)', () => {
			const domain = solveCubicInequality(1, 0, 0, -8, '>=', 0, false, 'x');
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 3)).toBe(true);
			expect(containsValue(domain, 1)).toBe(false);
		});
	});

	describe('three real roots cases', () => {
		it('solves x³ - x >= 0 (roots: -1, 0, 1)', () => {
			// x³ - x = x(x-1)(x+1), positive when -1 <= x <= 0 or x >= 1
			const domain = solveCubicInequality(1, 0, -1, 0, '>=', 0, false, 'x');

			// Should contain values in [-1, 0] ∪ [1, +∞[
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, -0.5)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);

			// Should not contain values in ]-∞, -1[ ∪ ]0, 1[
			expect(containsValue(domain, -2)).toBe(false);
			expect(containsValue(domain, 0.5)).toBe(false);
		});

		it('solves x³ - x <= 0 (roots: -1, 0, 1)', () => {
			// x³ - x <= 0 when x <= -1 or 0 <= x <= 1
			const domain = solveCubicInequality(1, 0, -1, 0, '<=', 0, false, 'x');

			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);

			expect(containsValue(domain, -0.5)).toBe(false);
			expect(containsValue(domain, 2)).toBe(false);
		});
	});

	describe('negative leading coefficient', () => {
		it('solves -x³ >= 0', () => {
			// -x³ >= 0 when x <= 0
			const domain = solveCubicInequality(-1, 0, 0, 0, '>=', 0, false, 'x');
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(false);
		});

		it('solves -x³ + x >= 0', () => {
			// -x³ + x = -x(x-1)(x+1), positive when x <= -1 or 0 <= x <= 1
			const domain = solveCubicInequality(-1, 0, 1, 0, '>=', 0, false, 'x');

			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);

			expect(containsValue(domain, -0.5)).toBe(false);
			expect(containsValue(domain, 2)).toBe(false);
		});
	});

	describe('with non-zero bounds', () => {
		it('solves x³ >= 1', () => {
			const domain = solveCubicInequality(1, 0, 0, 0, '>=', 1, false, 'x');
			// x³ >= 1 when x >= 1
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
		});

		it('solves x³ <= -8', () => {
			const domain = solveCubicInequality(1, 0, 0, 0, '<=', -8, false, 'x');
			// x³ <= -8 when x <= -2
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -3)).toBe(true);
			expect(containsValue(domain, -1)).toBe(false);
		});
	});
});
