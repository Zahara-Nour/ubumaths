/**
 * Unit tests for canonical ordering module
 */

import { describe, it, expect } from 'vitest';
import {
	// Level 1: Radicals
	compareRadicals,
	compareRadicalArrays,
	equalRadicalArrays,
	hashRadicalArray,
	// Level 2: Algebraic Terms
	compareAlgebraicTerms,
	sameRadicalSignature,
	hashAlgebraicTerm,
	getRadicalSignature,
	// Sorting
	sortRadicals,
	sortAlgebraicTerms,
	// Validation
	isRadicalArraySorted,
	isAlgebraicTermArraySorted
} from '../compare';
import type { SimplifiedRadical, AlgebraicTerm, Rational } from '../types';

// Helper to create rationals
const r = (n: bigint, d: bigint = 1n): Rational => ({ n, d });

// Common test radicals
const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
const sqrt5: SimplifiedRadical = { radicand: 5n, index: 2n };
const _sqrt6: SimplifiedRadical = { radicand: 6n, index: 2n };
const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };
const cbrt3: SimplifiedRadical = { radicand: 3n, index: 3n };

describe('compare', () => {
	// ===========================================================================
	// Level 1: SimplifiedRadical Ordering
	// ===========================================================================

	describe('compareRadicals', () => {
		describe('same index ordering', () => {
			it('orders by radicand ascending', () => {
				expect(compareRadicals(sqrt2, sqrt3)).toBe(-1);
				expect(compareRadicals(sqrt3, sqrt2)).toBe(1);
				expect(compareRadicals(sqrt2, sqrt5)).toBe(-1);
				expect(compareRadicals(sqrt3, sqrt5)).toBe(-1);
			});

			it('returns 0 for identical radicals', () => {
				expect(compareRadicals(sqrt2, sqrt2)).toBe(0);
				expect(compareRadicals(cbrt3, cbrt3)).toBe(0);
			});
		});

		describe('different index ordering', () => {
			it('orders by index ascending', () => {
				// Square roots before cube roots
				expect(compareRadicals(sqrt2, cbrt2)).toBe(-1);
				expect(compareRadicals(cbrt2, sqrt2)).toBe(1);
			});

			it('index takes priority over radicand', () => {
				// sqrt(5) < cbrt(2) because 2 < 3 (index)
				expect(compareRadicals(sqrt5, cbrt2)).toBe(-1);
				// sqrt(100) < cbrt(2)
				const sqrt100: SimplifiedRadical = { radicand: 100n, index: 2n };
				expect(compareRadicals(sqrt100, cbrt2)).toBe(-1);
			});
		});

		describe('expected ordering', () => {
			it('produces canonical order: sqrt(2) < sqrt(3) < sqrt(5) < cbrt(2) < cbrt(3)', () => {
				const radicals = [cbrt3, sqrt5, cbrt2, sqrt2, sqrt3];
				const sorted = [...radicals].sort(compareRadicals);
				expect(sorted).toEqual([sqrt2, sqrt3, sqrt5, cbrt2, cbrt3]);
			});
		});
	});

	describe('compareRadicalArrays', () => {
		it('empty array comes first', () => {
			expect(compareRadicalArrays([], [sqrt2])).toBe(-1);
			expect(compareRadicalArrays([sqrt2], [])).toBe(1);
		});

		it('compares lexicographically', () => {
			expect(compareRadicalArrays([sqrt2], [sqrt3])).toBe(-1);
			expect(compareRadicalArrays([sqrt2, sqrt3], [sqrt2, sqrt5])).toBe(-1);
		});

		it('shorter array comes first when prefix matches', () => {
			expect(compareRadicalArrays([sqrt2], [sqrt2, sqrt3])).toBe(-1);
			expect(compareRadicalArrays([sqrt2, sqrt3], [sqrt2])).toBe(1);
		});

		it('returns 0 for identical arrays', () => {
			expect(compareRadicalArrays([], [])).toBe(0);
			expect(compareRadicalArrays([sqrt2], [sqrt2])).toBe(0);
			expect(compareRadicalArrays([sqrt2, sqrt3], [sqrt2, sqrt3])).toBe(0);
		});
	});

	describe('equalRadicalArrays', () => {
		it('returns true for identical arrays', () => {
			expect(equalRadicalArrays([], [])).toBe(true);
			expect(equalRadicalArrays([sqrt2], [sqrt2])).toBe(true);
			expect(equalRadicalArrays([sqrt2, sqrt3], [sqrt2, sqrt3])).toBe(true);
		});

		it('returns false for different lengths', () => {
			expect(equalRadicalArrays([sqrt2], [])).toBe(false);
			expect(equalRadicalArrays([sqrt2], [sqrt2, sqrt3])).toBe(false);
		});

		it('returns false for different contents', () => {
			expect(equalRadicalArrays([sqrt2], [sqrt3])).toBe(false);
			expect(equalRadicalArrays([sqrt2, sqrt3], [sqrt2, sqrt5])).toBe(false);
		});
	});

	describe('hashRadicalArray', () => {
		it('returns empty string for empty array', () => {
			expect(hashRadicalArray([])).toBe('');
		});

		it('returns consistent hash', () => {
			expect(hashRadicalArray([sqrt2])).toBe(hashRadicalArray([sqrt2]));
			expect(hashRadicalArray([sqrt2, sqrt3])).toBe(hashRadicalArray([sqrt2, sqrt3]));
		});

		it('returns different hash for different arrays', () => {
			expect(hashRadicalArray([sqrt2])).not.toBe(hashRadicalArray([sqrt3]));
			expect(hashRadicalArray([sqrt2])).not.toBe(hashRadicalArray([sqrt2, sqrt3]));
		});

		it('includes both index and radicand', () => {
			expect(hashRadicalArray([sqrt2])).not.toBe(hashRadicalArray([cbrt2]));
		});
	});

	// ===========================================================================
	// Level 2: AlgebraicTerm Ordering
	// ===========================================================================

	describe('compareAlgebraicTerms', () => {
		// Pure rationals
		const three: AlgebraicTerm = { rational: r(3n), radicals: [] };
		const five: AlgebraicTerm = { rational: r(5n), radicals: [] };

		// Single radical terms
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const twoSqrt2: AlgebraicTerm = { rational: r(2n), radicals: [sqrt2] };
		const threeSqrt2: AlgebraicTerm = { rational: r(3n), radicals: [sqrt2] };
		const oneSqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };

		// Multi-radical terms
		const sqrt2sqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2, sqrt3] };

		describe('radical count ordering', () => {
			it('pure rationals come first', () => {
				expect(compareAlgebraicTerms(three, oneSqrt2)).toBe(-1);
				expect(compareAlgebraicTerms(oneSqrt2, three)).toBe(1);
			});

			it('fewer radicals come first', () => {
				expect(compareAlgebraicTerms(oneSqrt2, sqrt2sqrt3)).toBe(-1);
				expect(compareAlgebraicTerms(sqrt2sqrt3, oneSqrt2)).toBe(1);
			});
		});

		describe('same radical count - lexicographic radical ordering', () => {
			it('compares by radicals first', () => {
				expect(compareAlgebraicTerms(oneSqrt2, oneSqrt3)).toBe(-1);
				expect(compareAlgebraicTerms(oneSqrt3, oneSqrt2)).toBe(1);
			});
		});

		describe('same radicals - rational value ordering', () => {
			it('compares by rational coefficient', () => {
				expect(compareAlgebraicTerms(oneSqrt2, twoSqrt2)).toBe(-1);
				expect(compareAlgebraicTerms(twoSqrt2, threeSqrt2)).toBe(-1);
				expect(compareAlgebraicTerms(threeSqrt2, oneSqrt2)).toBe(1);
			});

			it('pure rationals ordered by value', () => {
				expect(compareAlgebraicTerms(three, five)).toBe(-1);
				expect(compareAlgebraicTerms(five, three)).toBe(1);
			});
		});

		describe('expected ordering', () => {
			it('produces canonical order: 3 < 5 < sqrt(2) < 2*sqrt(2) < sqrt(3) < sqrt(2)*sqrt(3)', () => {
				const terms = [sqrt2sqrt3, oneSqrt3, twoSqrt2, oneSqrt2, five, three];
				const sorted = [...terms].sort(compareAlgebraicTerms);
				expect(sorted).toEqual([three, five, oneSqrt2, twoSqrt2, oneSqrt3, sqrt2sqrt3]);
			});
		});

		describe('equality', () => {
			it('returns 0 for identical terms', () => {
				expect(compareAlgebraicTerms(three, three)).toBe(0);
				expect(compareAlgebraicTerms(oneSqrt2, oneSqrt2)).toBe(0);
			});
		});
	});

	describe('sameRadicalSignature', () => {
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const threeSqrt2: AlgebraicTerm = { rational: r(3n), radicals: [sqrt2] };
		const oneSqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };
		const pure3: AlgebraicTerm = { rational: r(3n), radicals: [] };
		const pure5: AlgebraicTerm = { rational: r(5n), radicals: [] };

		it('returns true for same radicals regardless of coefficient', () => {
			expect(sameRadicalSignature(oneSqrt2, threeSqrt2)).toBe(true);
		});

		it('returns true for pure rationals', () => {
			expect(sameRadicalSignature(pure3, pure5)).toBe(true);
		});

		it('returns false for different radicals', () => {
			expect(sameRadicalSignature(oneSqrt2, oneSqrt3)).toBe(false);
		});

		it('returns false for different numbers of radicals', () => {
			const sqrt2sqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2, sqrt3] };
			expect(sameRadicalSignature(oneSqrt2, sqrt2sqrt3)).toBe(false);
		});
	});

	describe('hashAlgebraicTerm', () => {
		const pure3: AlgebraicTerm = { rational: r(3n), radicals: [] };
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const twoSqrt2: AlgebraicTerm = { rational: r(2n), radicals: [sqrt2] };
		const halfSqrt2: AlgebraicTerm = { rational: r(1n, 2n), radicals: [sqrt2] };

		it('produces string representation', () => {
			expect(hashAlgebraicTerm(pure3)).toBe('3');
			expect(hashAlgebraicTerm(oneSqrt2)).toContain('1');
			expect(hashAlgebraicTerm(oneSqrt2)).toContain('R2:2');
		});

		it('different terms have different hashes', () => {
			expect(hashAlgebraicTerm(oneSqrt2)).not.toBe(hashAlgebraicTerm(twoSqrt2));
			expect(hashAlgebraicTerm(pure3)).not.toBe(hashAlgebraicTerm(oneSqrt2));
		});

		it('handles fractions', () => {
			expect(hashAlgebraicTerm(halfSqrt2)).toContain('1/2');
		});
	});

	describe('getRadicalSignature', () => {
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const threeSqrt2: AlgebraicTerm = { rational: r(3n), radicals: [sqrt2] };
		const oneSqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };
		const pure3: AlgebraicTerm = { rational: r(3n), radicals: [] };

		it('same radicals have same signature', () => {
			expect(getRadicalSignature(oneSqrt2)).toBe(getRadicalSignature(threeSqrt2));
		});

		it('different radicals have different signatures', () => {
			expect(getRadicalSignature(oneSqrt2)).not.toBe(getRadicalSignature(oneSqrt3));
		});

		it('pure rationals have empty signature', () => {
			expect(getRadicalSignature(pure3)).toBe('');
		});
	});

	// ===========================================================================
	// Sorting Utilities
	// ===========================================================================

	describe('sortRadicals', () => {
		it('sorts radicals in canonical order', () => {
			const unsorted = [sqrt5, cbrt2, sqrt2, sqrt3, cbrt3];
			const sorted = sortRadicals(unsorted);
			expect(sorted).toEqual([sqrt2, sqrt3, sqrt5, cbrt2, cbrt3]);
		});

		it('does not modify original array', () => {
			const original = [sqrt5, sqrt2];
			sortRadicals(original);
			expect(original).toEqual([sqrt5, sqrt2]);
		});

		it('handles empty array', () => {
			expect(sortRadicals([])).toEqual([]);
		});

		it('handles single element', () => {
			expect(sortRadicals([sqrt2])).toEqual([sqrt2]);
		});
	});

	describe('sortAlgebraicTerms', () => {
		const pure3: AlgebraicTerm = { rational: r(3n), radicals: [] };
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const oneSqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };

		it('sorts terms in canonical order', () => {
			const unsorted = [oneSqrt3, oneSqrt2, pure3];
			const sorted = sortAlgebraicTerms(unsorted);
			expect(sorted).toEqual([pure3, oneSqrt2, oneSqrt3]);
		});

		it('does not modify original array', () => {
			const original = [oneSqrt3, pure3];
			sortAlgebraicTerms(original);
			expect(original).toEqual([oneSqrt3, pure3]);
		});
	});

	// ===========================================================================
	// Validation
	// ===========================================================================

	describe('isRadicalArraySorted', () => {
		it('returns true for sorted arrays', () => {
			expect(isRadicalArraySorted([])).toBe(true);
			expect(isRadicalArraySorted([sqrt2])).toBe(true);
			expect(isRadicalArraySorted([sqrt2, sqrt3, sqrt5])).toBe(true);
			expect(isRadicalArraySorted([sqrt2, sqrt3, cbrt2])).toBe(true);
		});

		it('returns false for unsorted arrays', () => {
			expect(isRadicalArraySorted([sqrt3, sqrt2])).toBe(false);
			expect(isRadicalArraySorted([cbrt2, sqrt5])).toBe(false);
		});
	});

	describe('isAlgebraicTermArraySorted', () => {
		const pure3: AlgebraicTerm = { rational: r(3n), radicals: [] };
		const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };
		const oneSqrt3: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };

		it('returns true for sorted arrays', () => {
			expect(isAlgebraicTermArraySorted([])).toBe(true);
			expect(isAlgebraicTermArraySorted([pure3])).toBe(true);
			expect(isAlgebraicTermArraySorted([pure3, oneSqrt2, oneSqrt3])).toBe(true);
		});

		it('returns false for unsorted arrays', () => {
			expect(isAlgebraicTermArraySorted([oneSqrt2, pure3])).toBe(false);
			expect(isAlgebraicTermArraySorted([oneSqrt3, oneSqrt2])).toBe(false);
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('combines correctly: sorting maintains like-term grouping', () => {
			// Terms that can be combined should have same signature
			const sqrt2_a: AlgebraicTerm = { rational: r(3n), radicals: [sqrt2] };
			const sqrt2_b: AlgebraicTerm = { rational: r(2n), radicals: [sqrt2] };
			const sqrt3_a: AlgebraicTerm = { rational: r(1n), radicals: [sqrt3] };

			// After sorting, terms with same signature should be adjacent
			const sorted = sortAlgebraicTerms([sqrt3_a, sqrt2_a, sqrt2_b]);

			// First two should be sqrt2 terms
			expect(sameRadicalSignature(sorted[0], sorted[1])).toBe(true);
			// Third is different
			expect(sameRadicalSignature(sorted[1], sorted[2])).toBe(false);
		});

		it('handles negative rationals', () => {
			const negSqrt2: AlgebraicTerm = { rational: r(-1n), radicals: [sqrt2] };
			const posSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };

			// Same signature
			expect(sameRadicalSignature(negSqrt2, posSqrt2)).toBe(true);

			// Negative comes before positive in rational comparison
			expect(compareAlgebraicTerms(negSqrt2, posSqrt2)).toBe(-1);
		});

		it('handles fractional rationals', () => {
			const halfSqrt2: AlgebraicTerm = { rational: r(1n, 2n), radicals: [sqrt2] };
			const oneSqrt2: AlgebraicTerm = { rational: r(1n), radicals: [sqrt2] };

			// Same signature
			expect(sameRadicalSignature(halfSqrt2, oneSqrt2)).toBe(true);

			// 1/2 < 1
			expect(compareAlgebraicTerms(halfSqrt2, oneSqrt2)).toBe(-1);
		});
	});
});
