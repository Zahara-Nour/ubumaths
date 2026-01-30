/**
 * Tests for quartic polynomial solving in preimage computation
 */

import { describe, it, expect } from 'vitest';
import { classifyExpression, findZeros, solveQuarticInequality } from '../preimage';
import { containsValue } from '../algebra';
import { power, variable, add, subtract, implicitMultiply, number } from '../../factory';

describe('quartic expression classification', () => {
	it('classifies x⁴ as quartic', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const result = classifyExpression(x4, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x+1)⁴ correctly', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const fourth = power(xPlus1, number('4'));
		const result = classifyExpression(fourth, 'x');

		// (x+1)⁴ = x⁴ + 4x³ + 6x² + 4x + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(4);
			expect(result.c).toBe(6);
			expect(result.d).toBe(4);
			expect(result.e).toBe(1);
		}
	});

	it('classifies (2x-1)⁴ correctly', () => {
		const x = variable('x');
		const twoX = implicitMultiply(number('2'), x);
		const twoXMinus1 = subtract(twoX, number('1'));
		const fourth = power(twoXMinus1, number('4'));
		const result = classifyExpression(fourth, 'x');

		// (2x-1)⁴ = 16x⁴ - 32x³ + 24x² - 8x + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(16);
			expect(result.b).toBe(-32);
			expect(result.c).toBe(24);
			expect(result.d).toBe(-8);
			expect(result.e).toBe(1);
		}
	});

	it('classifies x⁴ + x² correctly', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const x2 = power(x, number('2'));
		const expr = add(x4, x2);
		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(1);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x²)² as quartic', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x4 = power(x2, number('2'));
		const result = classifyExpression(x4, 'x');

		// (x²)² = x⁴
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x²+1)² correctly', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x2Plus1 = add(x2, number('1'));
		const squared = power(x2Plus1, number('2'));
		const result = classifyExpression(squared, 'x');

		// (x²+1)² = x⁴ + 2x² + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(2);
			expect(result.d).toBe(0);
			expect(result.e).toBe(1);
		}
	});

	it('classifies x(x+1)(x-1)(x+2) as quartic via multiplication', () => {
		const x = variable('x');
		// x * (x+1) = x² + x
		const xTimesXPlus1 = implicitMultiply(x, add(x, number('1')));
		// (x-1) * (x+2) = x² + x - 2
		const xMinus1TimesXPlus2 = implicitMultiply(subtract(x, number('1')), add(x, number('2')));
		// Product: (x² + x)(x² + x - 2) = x⁴ + 2x³ - x² - 2x
		const expr = implicitMultiply(xTimesXPlus1, xMinus1TimesXPlus2);
		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(2);
			expect(result.c).toBe(-1);
			expect(result.d).toBe(-2);
			expect(Math.abs(result.e)).toBeLessThan(1e-10); // Allow -0 or +0
		}
	});

	it('classifies (x+1)(x³) as quartic', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const x3 = power(x, number('3'));
		const expr = implicitMultiply(xPlus1, x3);
		const result = classifyExpression(expr, 'x');

		// (x+1) * x³ = x⁴ + x³
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(1);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});
});

describe('findZeros for quartic expressions', () => {
	it('finds zeros of x⁴ = 0', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const zeros = findZeros(x4, 'x');

		expect(zeros).toHaveLength(1);
		expect(zeros[0]).toBeCloseTo(0, 8);
	});

	it('finds zeros of x⁴ - 1 = 0 (roots: ±1)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = subtract(x4, number('1'));
		const zeros = findZeros(expr, 'x');

		// Real roots are x = ±1 (the other two are complex: ±i)
		expect(zeros).toHaveLength(2);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-1, 6);
		expect(sortedZeros[1]).toBeCloseTo(1, 6);
	});

	it('finds zeros of x⁴ - 5x² + 4 = 0 (roots: ±1, ±2)', () => {
		// x⁴ - 5x² + 4 = (x² - 1)(x² - 4) = (x-1)(x+1)(x-2)(x+2)
		const x = variable('x');
		const x4 = power(x, number('4'));
		const x2 = power(x, number('2'));
		const fiveX2 = implicitMultiply(number('5'), x2);
		const expr = add(subtract(x4, fiveX2), number('4'));
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(4);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(-1, 6);
		expect(sortedZeros[2]).toBeCloseTo(1, 6);
		expect(sortedZeros[3]).toBeCloseTo(2, 6);
	});

	it('finds zero of (x-1)⁴ = 0 (quadruple root)', () => {
		const x = variable('x');
		const xMinus1 = subtract(x, number('1'));
		const expr = power(xMinus1, number('4'));
		const zeros = findZeros(expr, 'x');

		expect(zeros.length).toBeGreaterThanOrEqual(1);
		expect(zeros[0]).toBeCloseTo(1, 6);
	});

	it('finds zeros of x⁴ + 1 = 0 (no real roots)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = add(x4, number('1'));
		const zeros = findZeros(expr, 'x');

		// All roots are complex (±(1±i)/√2)
		expect(zeros).toHaveLength(0);
	});

	it('finds zeros of x⁴ - 16 = 0 (roots: ±2)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = subtract(x4, number('16'));
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(2);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(2, 6);
	});

	it('finds zeros of (x² - 1)(x² - 4) = 0', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x2Minus1 = subtract(x2, number('1'));
		const x2Minus4 = subtract(x2, number('4'));
		const expr = implicitMultiply(x2Minus1, x2Minus4);
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(4);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(-1, 6);
		expect(sortedZeros[2]).toBeCloseTo(1, 6);
		expect(sortedZeros[3]).toBeCloseTo(2, 6);
	});
});

describe('solveQuarticInequality', () => {
	describe('no real roots cases', () => {
		it('solves x⁴ + 1 >= 0 (always true)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 1, '>=', 0, false, 'x');
			// x⁴ + 1 > 0 for all x
			expect(domain.kind).toBe('universal');
		});

		it('solves x⁴ + 1 <= 0 (never true)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 1, '<=', 0, false, 'x');
			// x⁴ + 1 > 0 for all x, never <= 0
			expect(domain.kind).toBe('empty');
		});

		it('solves -x⁴ - 1 >= 0 (never true)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, -1, '>=', 0, false, 'x');
			// -x⁴ - 1 < 0 for all x
			expect(domain.kind).toBe('empty');
		});

		it('solves -x⁴ - 1 <= 0 (always true)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, -1, '<=', 0, false, 'x');
			// -x⁴ - 1 < 0 for all x
			expect(domain.kind).toBe('universal');
		});
	});

	describe('two roots cases (x⁴ - 1)', () => {
		it('solves x⁴ - 1 >= 0 (|x| >= 1)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '>=', 0, false, 'x');
			// x⁴ - 1 >= 0 when |x| >= 1
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, 0.5)).toBe(false);
			expect(containsValue(domain, -0.5)).toBe(false);
		});

		it('solves x⁴ - 1 <= 0 (|x| <= 1)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '<=', 0, false, 'x');
			// x⁴ - 1 <= 0 when |x| <= 1
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, -0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(false);
			expect(containsValue(domain, -2)).toBe(false);
		});

		it('solves x⁴ - 1 > 0 (strict)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '>=', 0, true, 'x');
			// x⁴ - 1 > 0 when |x| > 1
			expect(containsValue(domain, 1)).toBe(false);
			expect(containsValue(domain, -1)).toBe(false);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
		});
	});

	describe('four roots cases (x⁴ - 5x² + 4)', () => {
		it('solves x⁴ - 5x² + 4 >= 0 (|x| <= 1 or |x| >= 2)', () => {
			// x⁴ - 5x² + 4 = (x² - 1)(x² - 4) = (x-1)(x+1)(x-2)(x+2)
			// >= 0 when x <= -2 or -1 <= x <= 1 or x >= 2
			const domain = solveQuarticInequality(1, 0, -5, 0, 4, '>=', 0, false, 'x');

			expect(containsValue(domain, -3)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 3)).toBe(true);

			expect(containsValue(domain, -1.5)).toBe(false);
			expect(containsValue(domain, 1.5)).toBe(false);
		});

		it('solves x⁴ - 5x² + 4 <= 0 (-2 <= x <= -1 or 1 <= x <= 2)', () => {
			const domain = solveQuarticInequality(1, 0, -5, 0, 4, '<=', 0, false, 'x');

			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1.5)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 1.5)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);

			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, -3)).toBe(false);
			expect(containsValue(domain, 3)).toBe(false);
		});
	});

	describe('with non-zero bounds', () => {
		it('solves x⁴ >= 1', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 0, '>=', 1, false, 'x');
			// x⁴ >= 1 when |x| >= 1
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
		});

		it('solves x⁴ <= 16', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 0, '<=', 16, false, 'x');
			// x⁴ <= 16 when |x| <= 2
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, 3)).toBe(false);
			expect(containsValue(domain, -3)).toBe(false);
		});
	});

	describe('negative leading coefficient', () => {
		it('solves -x⁴ + 1 >= 0 (|x| <= 1)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, 1, '>=', 0, false, 'x');
			// -x⁴ + 1 >= 0 when x⁴ <= 1, i.e., |x| <= 1
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(false);
			expect(containsValue(domain, -2)).toBe(false);
		});

		it('solves -x⁴ + 1 <= 0 (|x| >= 1)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, 1, '<=', 0, false, 'x');
			// -x⁴ + 1 <= 0 when x⁴ >= 1, i.e., |x| >= 1
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
		});
	});
});
