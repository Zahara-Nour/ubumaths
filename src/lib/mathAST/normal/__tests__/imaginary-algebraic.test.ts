/**
 * Tests for imaginary unit support in AlgebraicTerm operations
 *
 * Tests the hasImaginaryUnit flag and i × i = -1 multiplication rule.
 */
import { describe, it, expect } from 'vitest';
import {
	mulAlgebraic,
	addAlgebraic,
	negAlgebraic,
	ALGEBRAIC_ZERO,
	ALGEBRAIC_IMAGINARY,
	algebraicFromRational
} from '../algebraic';
import { ONE, fromInteger } from '../rational';
import type { AlgebraicCoefficient, AlgebraicTerm } from '../types';
import {
	compareAlgebraicTerms,
	sameRadicalSignature,
	getRadicalSignature,
	hashAlgebraicTerm
} from '../compare';
import { hashAlgebraicTerm as hashAlgebraicTermHash } from '../hash';

// Helper to create an imaginary term
function imaginaryTerm(n: bigint, d: bigint = 1n): AlgebraicTerm {
	return { rational: { n, d }, radicals: [], hasImaginaryUnit: true };
}

// Helper to create a real term
function realTerm(n: bigint, d: bigint = 1n): AlgebraicTerm {
	return { rational: { n, d }, radicals: [] };
}

// Helper to create an algebraic coefficient
function coef(terms: AlgebraicTerm[]): AlgebraicCoefficient {
	return { terms };
}

describe('ALGEBRAIC_IMAGINARY constant', () => {
	it('represents i = complex(0, 1)', () => {
		expect(ALGEBRAIC_IMAGINARY.terms).toHaveLength(1);
		expect(ALGEBRAIC_IMAGINARY.terms[0].rational).toEqual(ONE);
		expect(ALGEBRAIC_IMAGINARY.terms[0].radicals).toEqual([]);
		expect(ALGEBRAIC_IMAGINARY.terms[0].hasImaginaryUnit).toBe(true);
	});
});

describe('Imaginary term comparison', () => {
	describe('compareAlgebraicTerms', () => {
		it('orders real terms before imaginary terms', () => {
			const real = realTerm(3n);
			const imag = imaginaryTerm(3n);
			expect(compareAlgebraicTerms(real, imag)).toBe(-1);
			expect(compareAlgebraicTerms(imag, real)).toBe(1);
		});

		it('orders imaginary terms among themselves by coefficient', () => {
			const i2 = imaginaryTerm(2n);
			const i3 = imaginaryTerm(3n);
			expect(compareAlgebraicTerms(i2, i3)).toBe(-1);
			expect(compareAlgebraicTerms(i3, i2)).toBe(1);
		});

		it('considers terms with same coefficient but different imaginary flag as different', () => {
			const real = realTerm(3n);
			const imag = imaginaryTerm(3n);
			expect(compareAlgebraicTerms(real, imag)).not.toBe(0);
		});
	});

	describe('sameRadicalSignature', () => {
		it('returns false for real vs imaginary with same radicals', () => {
			const real = realTerm(1n);
			const imag = imaginaryTerm(1n);
			expect(sameRadicalSignature(real, imag)).toBe(false);
		});

		it('returns true for both imaginary with same radicals', () => {
			const i1 = imaginaryTerm(2n);
			const i2 = imaginaryTerm(3n);
			expect(sameRadicalSignature(i1, i2)).toBe(true);
		});

		it('returns true for both real with same radicals', () => {
			const r1 = realTerm(2n);
			const r2 = realTerm(3n);
			expect(sameRadicalSignature(r1, r2)).toBe(true);
		});
	});

	describe('getRadicalSignature', () => {
		it('returns "i" for pure imaginary unit', () => {
			const i = imaginaryTerm(1n);
			expect(getRadicalSignature(i)).toBe('i');
		});

		it('returns empty string for pure real', () => {
			const r = realTerm(1n);
			expect(getRadicalSignature(r)).toBe('');
		});
	});

	describe('hashAlgebraicTerm', () => {
		it('hashes imaginary unit as "i"', () => {
			const i = imaginaryTerm(1n);
			expect(hashAlgebraicTerm(i)).toBe('i');
			expect(hashAlgebraicTermHash(i)).toBe('i');
		});

		it('hashes 2i as "2*i"', () => {
			const i2 = imaginaryTerm(2n);
			expect(hashAlgebraicTerm(i2)).toBe('2*i');
			expect(hashAlgebraicTermHash(i2)).toBe('2*i');
		});

		it('hashes 3/4*i correctly', () => {
			const term = imaginaryTerm(3n, 4n);
			expect(hashAlgebraicTerm(term)).toBe('3/4*i');
		});
	});
});

describe('Imaginary multiplication (i × i = -1)', () => {
	it('i × i = -1', () => {
		const result = mulAlgebraic(ALGEBRAIC_IMAGINARY, ALGEBRAIC_IMAGINARY);
		// Should be -1 (real, not imaginary)
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(-1n);
		expect(result.terms[0].rational.d).toBe(1n);
		expect(result.terms[0].hasImaginaryUnit).not.toBe(true);
	});

	it('2i × 3i = -6', () => {
		const i2 = coef([imaginaryTerm(2n)]);
		const i3 = coef([imaginaryTerm(3n)]);
		const result = mulAlgebraic(i2, i3);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(-6n);
		expect(result.terms[0].hasImaginaryUnit).not.toBe(true);
	});

	it('real × i = imaginary', () => {
		const r3 = algebraicFromRational(fromInteger(3n));
		const result = mulAlgebraic(r3, ALGEBRAIC_IMAGINARY);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(3n);
		expect(result.terms[0].hasImaginaryUnit).toBe(true);
	});

	it('i × real = imaginary', () => {
		const r3 = algebraicFromRational(fromInteger(3n));
		const result = mulAlgebraic(ALGEBRAIC_IMAGINARY, r3);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(3n);
		expect(result.terms[0].hasImaginaryUnit).toBe(true);
	});

	it('i × 0 = 0', () => {
		const result = mulAlgebraic(ALGEBRAIC_IMAGINARY, ALGEBRAIC_ZERO);
		expect(result.terms).toHaveLength(0);
	});

	it('(2 + 3i) × i = 2i - 3 = -3 + 2i', () => {
		const complex = coef([realTerm(2n), imaginaryTerm(3n)]);
		const result = mulAlgebraic(complex, ALGEBRAIC_IMAGINARY);
		// 2 × i = 2i, 3i × i = -3
		// So result should be -3 + 2i
		expect(result.terms).toHaveLength(2);
		// Real part: -3
		const realPart = result.terms.find((t) => t.hasImaginaryUnit !== true);
		expect(realPart?.rational.n).toBe(-3n);
		// Imaginary part: 2i
		const imagPart = result.terms.find((t) => t.hasImaginaryUnit === true);
		expect(imagPart?.rational.n).toBe(2n);
	});
});

describe('Imaginary addition', () => {
	it('i + i = 2i', () => {
		const result = addAlgebraic(ALGEBRAIC_IMAGINARY, ALGEBRAIC_IMAGINARY);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(2n);
		expect(result.terms[0].hasImaginaryUnit).toBe(true);
	});

	it('2i + 3i = 5i', () => {
		const i2 = coef([imaginaryTerm(2n)]);
		const i3 = coef([imaginaryTerm(3n)]);
		const result = addAlgebraic(i2, i3);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(5n);
		expect(result.terms[0].hasImaginaryUnit).toBe(true);
	});

	it('3 + 2i keeps both terms separate', () => {
		const r3 = algebraicFromRational(fromInteger(3n));
		const i2 = coef([imaginaryTerm(2n)]);
		const result = addAlgebraic(r3, i2);
		expect(result.terms).toHaveLength(2);
	});

	it('(3 + 2i) + (1 + 4i) = 4 + 6i', () => {
		const c1 = coef([realTerm(3n), imaginaryTerm(2n)]);
		const c2 = coef([realTerm(1n), imaginaryTerm(4n)]);
		const result = addAlgebraic(c1, c2);
		expect(result.terms).toHaveLength(2);
		const realPart = result.terms.find((t) => t.hasImaginaryUnit !== true);
		expect(realPart?.rational.n).toBe(4n);
		const imagPart = result.terms.find((t) => t.hasImaginaryUnit === true);
		expect(imagPart?.rational.n).toBe(6n);
	});

	it('3i + (-3i) = 0', () => {
		const i3 = coef([imaginaryTerm(3n)]);
		const iNeg3 = coef([imaginaryTerm(-3n)]);
		const result = addAlgebraic(i3, iNeg3);
		expect(result.terms).toHaveLength(0);
	});
});

describe('Imaginary negation', () => {
	it('negates imaginary unit: -i', () => {
		const result = negAlgebraic(ALGEBRAIC_IMAGINARY);
		expect(result.terms).toHaveLength(1);
		expect(result.terms[0].rational.n).toBe(-1n);
		expect(result.terms[0].hasImaginaryUnit).toBe(true);
	});

	it('negates complex number: -(3 + 2i) = -3 - 2i', () => {
		const c = coef([realTerm(3n), imaginaryTerm(2n)]);
		const result = negAlgebraic(c);
		expect(result.terms).toHaveLength(2);
		const realPart = result.terms.find((t) => t.hasImaginaryUnit !== true);
		expect(realPart?.rational.n).toBe(-3n);
		const imagPart = result.terms.find((t) => t.hasImaginaryUnit === true);
		expect(imagPart?.rational.n).toBe(-2n);
	});
});
