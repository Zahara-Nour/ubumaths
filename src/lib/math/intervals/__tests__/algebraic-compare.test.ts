/**
 * Tests for algebraic-compare.ts
 *
 * Tests exact numerical comparison of algebraic coefficients.
 */

import { describe, it, expect } from 'vitest';
import { compareAlgebraicNumerically } from '../algebraic-compare';
import { algebraicFromRational } from '$lib/mathAST/normal/algebraic';
import { rational } from '$lib/mathAST/normal/rational';
import type { AlgebraicCoefficient, SimplifiedRadical } from '$lib/mathAST/normal/types';

// Helper to create a radical coefficient
function radicalCoef(
	radicand: bigint,
	index: bigint = 2n,
	coefN: bigint = 1n,
	coefD: bigint = 1n
): AlgebraicCoefficient {
	const radical: SimplifiedRadical = { radicand, index };
	return {
		terms: [
			{
				rational: { n: coefN, d: coefD },
				radicals: [radical]
			}
		]
	};
}

// Helper to create a rational coefficient
function rationalCoef(n: bigint, d: bigint = 1n): AlgebraicCoefficient {
	return algebraicFromRational(rational(n, d));
}

describe('compareAlgebraicNumerically', () => {
	describe('rational comparisons (exact)', () => {
		it('compares 1/3 < 1/2 exactly', () => {
			const oneThird = rationalCoef(1n, 3n);
			const oneHalf = rationalCoef(1n, 2n);
			const result = compareAlgebraicNumerically(oneThird, oneHalf);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares 2/4 = 1/2 exactly', () => {
			const twoFourths = rationalCoef(2n, 4n);
			const oneHalf = rationalCoef(1n, 2n);
			const result = compareAlgebraicNumerically(twoFourths, oneHalf);
			expect(result.result).toBe(0);
			expect(result.exact).toBe(true);
		});

		it('compares 3/2 > 1 exactly', () => {
			const threeHalves = rationalCoef(3n, 2n);
			const one = rationalCoef(1n);
			const result = compareAlgebraicNumerically(threeHalves, one);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});

		it('compares negative rationals correctly', () => {
			const negOne = rationalCoef(-1n);
			const negTwo = rationalCoef(-2n);
			const result = compareAlgebraicNumerically(negOne, negTwo);
			expect(result.result).toBe(1); // -1 > -2
			expect(result.exact).toBe(true);
		});

		it('compares zero correctly', () => {
			const zero = rationalCoef(0n);
			const one = rationalCoef(1n);
			const result = compareAlgebraicNumerically(zero, one);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});
	});

	describe('radical comparisons (exact via squaring)', () => {
		it('compares sqrt(2) < sqrt(3) exactly', () => {
			const sqrt2 = radicalCoef(2n);
			const sqrt3 = radicalCoef(3n);
			const result = compareAlgebraicNumerically(sqrt2, sqrt3);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares sqrt(4) = sqrt(4) exactly', () => {
			// Note: sqrt(4) would normally simplify to 2, but testing raw
			const sqrt4a = radicalCoef(4n);
			const sqrt4b = radicalCoef(4n);
			const result = compareAlgebraicNumerically(sqrt4a, sqrt4b);
			expect(result.result).toBe(0);
			expect(result.exact).toBe(true);
		});

		it('compares 2*sqrt(3) > 3 exactly (since 12 > 9)', () => {
			// 2*sqrt(3) vs 3
			// (2*sqrt(3))^2 = 4*3 = 12
			// 3^2 = 9
			// 12 > 9, so 2*sqrt(3) > 3
			const twoSqrt3 = radicalCoef(3n, 2n, 2n);
			const three = rationalCoef(3n);
			const result = compareAlgebraicNumerically(twoSqrt3, three);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});

		it('compares sqrt(2) with coefficients: 3*sqrt(2) > 2*sqrt(2)', () => {
			const threeSqrt2 = radicalCoef(2n, 2n, 3n);
			const twoSqrt2 = radicalCoef(2n, 2n, 2n);
			const result = compareAlgebraicNumerically(threeSqrt2, twoSqrt2);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});
	});

	describe('rational vs radical comparisons (exact)', () => {
		it('compares 3/2 > sqrt(2) exactly (since 9/4 > 2)', () => {
			// 3/2 vs sqrt(2)
			// (3/2)^2 = 9/4 = 2.25
			// sqrt(2)^2 = 2
			// 9/4 > 2, so 3/2 > sqrt(2)
			const threeHalves = rationalCoef(3n, 2n);
			const sqrt2 = radicalCoef(2n);
			const result = compareAlgebraicNumerically(threeHalves, sqrt2);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});

		it('compares 1 < sqrt(2) exactly (since 1 < 2)', () => {
			const one = rationalCoef(1n);
			const sqrt2 = radicalCoef(2n);
			const result = compareAlgebraicNumerically(one, sqrt2);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares 2 > sqrt(3) exactly (since 4 > 3)', () => {
			const two = rationalCoef(2n);
			const sqrt3 = radicalCoef(3n);
			const result = compareAlgebraicNumerically(two, sqrt3);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});
	});

	describe('sign handling', () => {
		it('compares -sqrt(2) < sqrt(3) exactly', () => {
			const negSqrt2 = radicalCoef(2n, 2n, -1n);
			const sqrt3 = radicalCoef(3n);
			const result = compareAlgebraicNumerically(negSqrt2, sqrt3);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares -sqrt(2) > -sqrt(3) exactly (since -1.41 > -1.73)', () => {
			const negSqrt2 = radicalCoef(2n, 2n, -1n);
			const negSqrt3 = radicalCoef(3n, 2n, -1n);
			const result = compareAlgebraicNumerically(negSqrt2, negSqrt3);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(true);
		});

		it('compares -sqrt(2) < sqrt(2) exactly (opposite signs, same radicand)', () => {
			const negSqrt2 = radicalCoef(2n, 2n, -1n);
			const sqrt2 = radicalCoef(2n);
			const result = compareAlgebraicNumerically(negSqrt2, sqrt2);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares 0 < sqrt(2)', () => {
			const zero = rationalCoef(0n);
			const sqrt2 = radicalCoef(2n);
			const result = compareAlgebraicNumerically(zero, sqrt2);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});

		it('compares -1 < 0', () => {
			const negOne = rationalCoef(-1n);
			const zero = rationalCoef(0n);
			const result = compareAlgebraicNumerically(negOne, zero);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(true);
		});
	});

	describe('fallback to numeric (non-exact)', () => {
		it('uses fallback for sum of radicals: sqrt(2) + sqrt(3) vs 3', () => {
			// sqrt(2) + sqrt(3) ~ 1.41 + 1.73 ~ 3.14 > 3
			const sumRadicals: AlgebraicCoefficient = {
				terms: [
					{ rational: { n: 1n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }] },
					{ rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 2n }] }
				]
			};
			const three = rationalCoef(3n);
			const result = compareAlgebraicNumerically(sumRadicals, three);
			expect(result.result).toBe(1);
			expect(result.exact).toBe(false); // Fallback used
		});

		it('uses fallback for cube roots', () => {
			// cbrt(2) vs cbrt(3) - not square roots, so fallback
			const cbrt2: AlgebraicCoefficient = {
				terms: [{ rational: { n: 1n, d: 1n }, radicals: [{ radicand: 2n, index: 3n }] }]
			};
			const cbrt3: AlgebraicCoefficient = {
				terms: [{ rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 3n }] }]
			};
			const result = compareAlgebraicNumerically(cbrt2, cbrt3);
			expect(result.result).toBe(-1);
			expect(result.exact).toBe(false); // Fallback used (cube roots not handled exactly)
		});
	});
});
