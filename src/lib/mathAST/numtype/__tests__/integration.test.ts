/**
 * Integration Tests for Numeric Type System with Pattern Matching
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { match, P } from '../../pattern';
import {
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isRealType,
	isTranscendentalType,
	isComplexType
} from '../predicates';

describe('Pattern matching with numeric type constraints', () => {
	describe('P.isIntegerType()', () => {
		it('should match integer expressions', () => {
			const pattern = P._('n', P.isIntegerType());

			const match1 = match(pattern, parseLatex('5'));
			expect(match1.success).toBe(true);

			const match2 = match(pattern, parseLatex('2 + 3'));
			expect(match2.success).toBe(true);

			const match3 = match(pattern, parseLatex('\\sqrt{4}')); // = 2
			expect(match3.success).toBe(true);
		});

		it('should not match non-integer expressions', () => {
			const pattern = P._('n', P.isIntegerType());

			const match1 = match(pattern, parseLatex('\\frac{1}{2}'));
			expect(match1.success).toBe(false);

			const match2 = match(pattern, parseLatex('\\sqrt{2}'));
			expect(match2.success).toBe(false);

			const match3 = match(pattern, parseLatex('\\pi'));
			expect(match3.success).toBe(false);
		});
	});

	describe('P.isRationalType()', () => {
		it('should match integer and rational expressions', () => {
			const pattern = P._('r', P.isRationalType());

			// Integers are rational
			const match1 = match(pattern, parseLatex('5'));
			expect(match1.success).toBe(true);

			// Fractions are rational
			const match2 = match(pattern, parseLatex('\\frac{1}{2}'));
			expect(match2.success).toBe(true);

			// Integer division is rational
			const match3 = match(pattern, parseLatex('\\frac{3}{4}'));
			expect(match3.success).toBe(true);
		});

		it('should not match irrational expressions', () => {
			const pattern = P._('r', P.isRationalType());

			const match1 = match(pattern, parseLatex('\\sqrt{2}'));
			expect(match1.success).toBe(false);

			const match2 = match(pattern, parseLatex('\\pi'));
			expect(match2.success).toBe(false);
		});
	});

	describe('P.isAlgebraicType()', () => {
		it('should match algebraic expressions', () => {
			const pattern = P._('a', P.isAlgebraicType());

			// Integers
			expect(match(pattern, parseLatex('5')).success).toBe(true);

			// Rationals
			expect(match(pattern, parseLatex('\\frac{1}{2}')).success).toBe(true);

			// Irrational algebraics
			expect(match(pattern, parseLatex('\\sqrt{2}')).success).toBe(true);
		});

		it('should not match transcendental expressions', () => {
			const pattern = P._('a', P.isAlgebraicType());

			expect(match(pattern, parseLatex('\\pi')).success).toBe(false);
			expect(match(pattern, parseLatex('\\sin(1)')).success).toBe(false);
		});
	});

	describe('P.isTranscendentalType()', () => {
		it('should match transcendental expressions', () => {
			const pattern = P._('t', P.isTranscendentalType());

			expect(match(pattern, parseLatex('\\pi')).success).toBe(true);
			expect(match(pattern, parseLatex('e')).success).toBe(true);
			expect(match(pattern, parseLatex('\\sin(1)')).success).toBe(true);
			expect(match(pattern, parseLatex('\\ln(2)')).success).toBe(true);
		});

		it('should not match algebraic expressions', () => {
			const pattern = P._('t', P.isTranscendentalType());

			expect(match(pattern, parseLatex('5')).success).toBe(false);
			expect(match(pattern, parseLatex('\\sqrt{2}')).success).toBe(false);
		});
	});

	describe('P.isRealType()', () => {
		it('should match all real expressions', () => {
			const pattern = P._('x', P.isRealType());

			// Integers
			expect(match(pattern, parseLatex('5')).success).toBe(true);

			// Rationals
			expect(match(pattern, parseLatex('\\frac{1}{2}')).success).toBe(true);

			// Irrational algebraics
			expect(match(pattern, parseLatex('\\sqrt{2}')).success).toBe(true);

			// Transcendentals
			expect(match(pattern, parseLatex('\\pi')).success).toBe(true);
		});

		it('should not match complex expressions', () => {
			const pattern = P._('x', P.isRealType());

			expect(match(pattern, parseLatex('\\sqrt{-1}')).success).toBe(false);
		});
	});

	describe('P.isComplexType()', () => {
		it('should match complex expressions', () => {
			const pattern = P._('z', P.isComplexType());

			expect(match(pattern, parseLatex('\\sqrt{-1}')).success).toBe(true);
		});
	});

	describe('strict mode', () => {
		it('should require exact type match when strict is true', () => {
			// With strict, only exact rationals match, not integers
			const strictPattern = P._('r', P.isRationalType(true));

			// 1/2 is exactly rational
			expect(match(strictPattern, parseLatex('\\frac{1}{2}')).success).toBe(true);

			// 5 is integer, not exactly rational
			expect(match(strictPattern, parseLatex('5')).success).toBe(false);
		});

		it('should allow subtypes when strict is false', () => {
			const pattern = P._('r', P.isRationalType(false));

			// Both integer and rational should match
			expect(match(pattern, parseLatex('5')).success).toBe(true);
			expect(match(pattern, parseLatex('\\frac{1}{2}')).success).toBe(true);
		});
	});

	describe('combined constraints', () => {
		it('should work with and()', () => {
			// Match positive integers
			const pattern = P._('n', P.and(P.isIntegerType(), P.isPositive()));

			expect(match(pattern, parseLatex('5')).success).toBe(true);
			expect(match(pattern, parseLatex('-3')).success).toBe(false);
			expect(match(pattern, parseLatex('\\frac{1}{2}')).success).toBe(false);
		});

		it('should work with or()', () => {
			// Match integer or transcendental (not rational fractions)
			const pattern = P._('x', P.or(P.isIntegerType(), P.isTranscendentalType()));

			expect(match(pattern, parseLatex('5')).success).toBe(true);
			expect(match(pattern, parseLatex('\\pi')).success).toBe(true);
			expect(match(pattern, parseLatex('\\frac{1}{2}')).success).toBe(false);
		});

		it('should work with not()', () => {
			// Match anything except transcendental
			const pattern = P._('x', P.not(P.isTranscendentalType()));

			expect(match(pattern, parseLatex('5')).success).toBe(true);
			expect(match(pattern, parseLatex('\\sqrt{2}')).success).toBe(true);
			expect(match(pattern, parseLatex('\\pi')).success).toBe(false);
		});
	});

	describe('structural patterns with type constraints', () => {
		it('should match power patterns with integer exponent', () => {
			// Match x^n where n is an integer
			const pattern = P.pow(P._('x'), P._('n', P.isIntegerType()));

			const match1 = match(pattern, parseLatex('x^2'));
			expect(match1.success).toBe(true);

			const match2 = match(pattern, parseLatex('x^{\\frac{1}{2}}'));
			expect(match2.success).toBe(false);
		});

		it('should match sum patterns with type constraints', () => {
			// Match integer + transcendental
			const pattern = P.add(P._('a', P.isIntegerType()), P._('b', P.isTranscendentalType()));

			const match1 = match(pattern, parseLatex('2 + \\pi'));
			expect(match1.success).toBe(true);

			const match2 = match(pattern, parseLatex('2 + 3'));
			expect(match2.success).toBe(false);
		});
	});
});

describe('Type predicates', () => {
	it('isIntegerType should work correctly', () => {
		expect(isIntegerType(parseLatex('5'))).toBe(true);
		expect(isIntegerType(parseLatex('\\frac{1}{2}'))).toBe(false);
	});

	it('isRationalType should work correctly', () => {
		expect(isRationalType(parseLatex('5'))).toBe(true);
		expect(isRationalType(parseLatex('\\frac{1}{2}'))).toBe(true);
		expect(isRationalType(parseLatex('\\sqrt{2}'))).toBe(false);
	});

	it('isAlgebraicType should work correctly', () => {
		expect(isAlgebraicType(parseLatex('5'))).toBe(true);
		expect(isAlgebraicType(parseLatex('\\sqrt{2}'))).toBe(true);
		expect(isAlgebraicType(parseLatex('\\pi'))).toBe(false);
	});

	it('isTranscendentalType should work correctly', () => {
		expect(isTranscendentalType(parseLatex('\\pi'))).toBe(true);
		expect(isTranscendentalType(parseLatex('e'))).toBe(true);
		expect(isTranscendentalType(parseLatex('5'))).toBe(false);
	});

	it('isRealType should work correctly', () => {
		expect(isRealType(parseLatex('5'))).toBe(true);
		expect(isRealType(parseLatex('\\pi'))).toBe(true);
		expect(isRealType(parseLatex('\\sqrt{-1}'))).toBe(false);
	});

	it('isComplexType should work correctly', () => {
		expect(isComplexType(parseLatex('\\sqrt{-1}'))).toBe(true);
		expect(isComplexType(parseLatex('5'))).toBe(false);
	});
});
