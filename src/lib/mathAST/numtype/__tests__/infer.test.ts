/**
 * Tests for Type Inference
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType } from '../infer';
import type { TypeContext } from '../types';

describe('inferType - literals', () => {
	describe('numbers', () => {
		it('should infer integer for whole numbers', () => {
			expect(inferType(parseLatex('5')).base).toBe('integer');
			expect(inferType(parseLatex('-3')).base).toBe('integer');
			expect(inferType(parseLatex('0')).base).toBe('integer');
			expect(inferType(parseLatex('42')).base).toBe('integer');
		});

		it('should infer integer for numbers with decimal that are mathematically integers', () => {
			expect(inferType(parseLatex('5.0')).base).toBe('integer');
			expect(inferType(parseLatex('100.00')).base).toBe('integer');
		});

		it('should infer real for non-integer decimals', () => {
			expect(inferType(parseLatex('3.14')).base).toBe('real');
			expect(inferType(parseLatex('1.5')).base).toBe('real');
			expect(inferType(parseLatex('0.1')).base).toBe('real');
		});

		it('should track sign information', () => {
			expect(inferType(parseLatex('5')).sign).toBe('positive');
			expect(inferType(parseLatex('-3')).sign).toBe('negative');
			expect(inferType(parseLatex('0')).sign).toBe('zero');
		});
	});

	describe('mathematical constants', () => {
		it('should infer transcendental for pi', () => {
			expect(inferType(parseLatex('\\pi')).base).toBe('transcendental');
		});

		it('should infer transcendental for e', () => {
			expect(inferType(parseLatex('e')).base).toBe('transcendental');
		});

		it('should mark constants as positive', () => {
			expect(inferType(parseLatex('\\pi')).sign).toBe('positive');
			expect(inferType(parseLatex('e')).sign).toBe('positive');
		});
	});

	describe('variables', () => {
		it('should default to real for unknown variables', () => {
			expect(inferType(parseLatex('x')).base).toBe('real');
			expect(inferType(parseLatex('y')).base).toBe('real');
		});

		it('should use context for known variables', () => {
			const ctx: TypeContext = {
				variables: new Map([
					['n', 'integer'],
					['q', 'rational']
				])
			};
			expect(inferType(parseLatex('n'), ctx).base).toBe('integer');
			expect(inferType(parseLatex('q'), ctx).base).toBe('rational');
		});

		it('should return unknown in strict mode for unknown variables', () => {
			const ctx: TypeContext = { strict: true };
			expect(inferType(parseLatex('x'), ctx).base).toBe('unknown');
		});
	});
});

describe('inferType - arithmetic', () => {
	describe('addition', () => {
		it('should preserve integer type for integer + integer', () => {
			expect(inferType(parseLatex('2 + 3')).base).toBe('integer');
			expect(inferType(parseLatex('1 + 2 + 3')).base).toBe('integer');
		});

		it('should return rational for integer + rational', () => {
			expect(inferType(parseLatex('2 + \\frac{1}{2}')).base).toBe('rational');
		});

		it('should return real for integer + real', () => {
			expect(inferType(parseLatex('2 + 3.14')).base).toBe('real');
		});

		it('should return real for algebraic + transcendental', () => {
			expect(inferType(parseLatex('2 + \\pi')).base).toBe('real');
		});
	});

	describe('subtraction', () => {
		it('should preserve integer type for integer - integer', () => {
			expect(inferType(parseLatex('5 - 3')).base).toBe('integer');
		});
	});

	describe('multiplication', () => {
		it('should preserve integer type for integer * integer', () => {
			expect(inferType(parseLatex('2 \\cdot 3')).base).toBe('integer');
			expect(inferType(parseLatex('2 \\times 3')).base).toBe('integer');
		});

		it('should return rational for integer * rational', () => {
			expect(inferType(parseLatex('2 \\cdot \\frac{1}{3}')).base).toBe('rational');
		});
	});

	describe('division', () => {
		it('should return rational for integer / integer', () => {
			expect(inferType(parseLatex('\\frac{1}{2}')).base).toBe('rational');
			expect(inferType(parseLatex('\\frac{6}{3}')).base).toBe('rational'); // Even though it simplifies to 2
		});

		it('should return rational for rational / rational', () => {
			expect(inferType(parseLatex('\\frac{\\frac{1}{2}}{\\frac{1}{3}}')).base).toBe('rational');
		});
	});

	describe('negation', () => {
		it('should preserve type for negation', () => {
			expect(inferType(parseLatex('-5')).base).toBe('integer');
			expect(inferType(parseLatex('-\\pi')).base).toBe('transcendental');
		});

		it('should flip sign for negation', () => {
			expect(inferType(parseLatex('-5')).sign).toBe('negative');
			expect(inferType(parseLatex('-(-3)')).sign).toBe('positive');
		});
	});
});

describe('inferType - powers', () => {
	describe('integer exponents', () => {
		it('should return integer for integer ^ positive integer', () => {
			expect(inferType(parseLatex('2^3')).base).toBe('integer');
			expect(inferType(parseLatex('5^2')).base).toBe('integer');
		});

		it('should return rational for integer ^ negative integer', () => {
			expect(inferType(parseLatex('2^{-1}')).base).toBe('rational');
			expect(inferType(parseLatex('3^{-2}')).base).toBe('rational');
		});

		it('should return integer for x^0', () => {
			expect(inferType(parseLatex('5^0')).base).toBe('integer');
			expect(inferType(parseLatex('x^0')).base).toBe('integer');
		});
	});

	describe('square roots', () => {
		it('should return integer for perfect squares', () => {
			expect(inferType(parseLatex('\\sqrt{4}')).base).toBe('integer');
			expect(inferType(parseLatex('\\sqrt{9}')).base).toBe('integer');
			expect(inferType(parseLatex('\\sqrt{16}')).base).toBe('integer');
		});

		it('should return irrational_algebraic for non-perfect squares', () => {
			expect(inferType(parseLatex('\\sqrt{2}')).base).toBe('irrational_algebraic');
			expect(inferType(parseLatex('\\sqrt{3}')).base).toBe('irrational_algebraic');
			expect(inferType(parseLatex('\\sqrt{5}')).base).toBe('irrational_algebraic');
		});

		it('should return complex for negative under square root', () => {
			expect(inferType(parseLatex('\\sqrt{-1}')).base).toBe('complex');
			expect(inferType(parseLatex('\\sqrt{-4}')).base).toBe('complex');
		});
	});
});

describe('inferType - functions', () => {
	describe('transcendental functions', () => {
		it('should return transcendental for sin, cos, tan', () => {
			expect(inferType(parseLatex('\\sin(1)')).base).toBe('transcendental');
			expect(inferType(parseLatex('\\cos(2)')).base).toBe('transcendental');
			expect(inferType(parseLatex('\\tan(3)')).base).toBe('transcendental');
		});

		it('should return transcendental for exp and ln', () => {
			expect(inferType(parseLatex('\\exp(1)')).base).toBe('transcendental');
			expect(inferType(parseLatex('\\ln(2)')).base).toBe('transcendental');
		});

		it('should return integer for special values', () => {
			expect(inferType(parseLatex('\\sin(0)')).base).toBe('integer');
			expect(inferType(parseLatex('\\cos(0)')).base).toBe('integer');
			expect(inferType(parseLatex('\\exp(0)')).base).toBe('integer');
			expect(inferType(parseLatex('\\ln(1)')).base).toBe('integer');
		});
	});

	describe('rounding functions', () => {
		it('should return integer for floor, ceil, round', () => {
			expect(inferType(parseLatex('\\lfloor 3.7 \\rfloor')).base).toBe('integer');
			expect(inferType(parseLatex('\\lceil 3.2 \\rceil')).base).toBe('integer');
		});
	});

	describe('abs function', () => {
		it('should preserve type for abs', () => {
			expect(inferType(parseLatex('|5|')).base).toBe('integer');
			expect(inferType(parseLatex('|-5|')).base).toBe('integer');
		});

		it('should make sign positive for abs', () => {
			expect(inferType(parseLatex('|-5|')).sign).toBe('positive');
		});
	});
});

describe('inferType - with context', () => {
	it('should infer integer for expressions with integer variables', () => {
		const ctx: TypeContext = {
			variables: new Map([['n', 'integer']])
		};
		expect(inferType(parseLatex('2n'), ctx).base).toBe('integer');
		expect(inferType(parseLatex('n + 1'), ctx).base).toBe('integer');
		expect(inferType(parseLatex('n^2'), ctx).base).toBe('integer');
	});

	it('should infer rational for expressions mixing integer and rational', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['n', 'integer'],
				['q', 'rational']
			])
		};
		expect(inferType(parseLatex('n + q'), ctx).base).toBe('rational');
	});
});

describe('inferType - caching', () => {
	it('should return same result for same node', () => {
		const node = parseLatex('2 + 3');
		const result1 = inferType(node);
		const result2 = inferType(node);
		expect(result1).toEqual(result2);
	});

	it('should return different results for different contexts', () => {
		const node = parseLatex('x');
		const ctx1: TypeContext = { variables: new Map([['x', 'integer']]) };
		const ctx2: TypeContext = { variables: new Map([['x', 'rational']]) };
		expect(inferType(node, ctx1).base).toBe('integer');
		expect(inferType(node, ctx2).base).toBe('rational');
	});
});
