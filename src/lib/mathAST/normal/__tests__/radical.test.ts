/**
 * Unit tests for radical operations module
 */

import { describe, it, expect } from 'vitest';
import {
	// Helpers
	integerNthRoot,
	extractPerfectPower,
	// Simplification
	simplifyRadical,
	createRadical,
	// Multiplication
	mulRadicalsSameIndex,
	mulRadicals,
	// Comparison
	compareRadicals,
	equalRadicals,
	// Conversion
	radicalToNumber,
	radicalToString,
	hashRadical
} from '../radical';
import type { SimplifiedRadical } from '../types';

describe('radical', () => {
	// ===========================================================================
	// Helper Functions
	// ===========================================================================

	describe('integerNthRoot', () => {
		describe('square roots', () => {
			it('returns exact root for perfect squares', () => {
				expect(integerNthRoot(1n, 2n)).toBe(1n);
				expect(integerNthRoot(4n, 2n)).toBe(2n);
				expect(integerNthRoot(9n, 2n)).toBe(3n);
				expect(integerNthRoot(16n, 2n)).toBe(4n);
				expect(integerNthRoot(25n, 2n)).toBe(5n);
				expect(integerNthRoot(100n, 2n)).toBe(10n);
			});

			it('returns null for non-perfect squares', () => {
				expect(integerNthRoot(2n, 2n)).toBe(null);
				expect(integerNthRoot(3n, 2n)).toBe(null);
				expect(integerNthRoot(5n, 2n)).toBe(null);
				expect(integerNthRoot(10n, 2n)).toBe(null);
				expect(integerNthRoot(99n, 2n)).toBe(null);
			});
		});

		describe('cube roots', () => {
			it('returns exact root for perfect cubes', () => {
				expect(integerNthRoot(1n, 3n)).toBe(1n);
				expect(integerNthRoot(8n, 3n)).toBe(2n);
				expect(integerNthRoot(27n, 3n)).toBe(3n);
				expect(integerNthRoot(64n, 3n)).toBe(4n);
				expect(integerNthRoot(125n, 3n)).toBe(5n);
				expect(integerNthRoot(1000n, 3n)).toBe(10n);
			});

			it('returns null for non-perfect cubes', () => {
				expect(integerNthRoot(2n, 3n)).toBe(null);
				expect(integerNthRoot(9n, 3n)).toBe(null);
				expect(integerNthRoot(26n, 3n)).toBe(null);
			});
		});

		describe('higher roots', () => {
			it('handles fourth roots', () => {
				expect(integerNthRoot(16n, 4n)).toBe(2n);
				expect(integerNthRoot(81n, 4n)).toBe(3n);
				expect(integerNthRoot(15n, 4n)).toBe(null);
			});

			it('handles fifth roots', () => {
				expect(integerNthRoot(32n, 5n)).toBe(2n);
				expect(integerNthRoot(243n, 5n)).toBe(3n);
			});
		});

		describe('edge cases', () => {
			it('handles zero', () => {
				expect(integerNthRoot(0n, 2n)).toBe(0n);
				expect(integerNthRoot(0n, 3n)).toBe(0n);
			});

			it('handles index = 1', () => {
				expect(integerNthRoot(5n, 1n)).toBe(5n);
				expect(integerNthRoot(100n, 1n)).toBe(100n);
			});

			it('handles large perfect powers', () => {
				// 10^10 = (10^5)^2
				expect(integerNthRoot(10n ** 10n, 2n)).toBe(10n ** 5n);
				// 2^30 = (2^10)^3
				expect(integerNthRoot(2n ** 30n, 3n)).toBe(2n ** 10n);
			});
		});
	});

	describe('extractPerfectPower', () => {
		describe('square root extraction', () => {
			it('extracts from 18 = 9 * 2 = 3^2 * 2', () => {
				const [extracted, remaining] = extractPerfectPower(18n, 2n);
				expect(extracted).toBe(3n);
				expect(remaining).toBe(2n);
			});

			it('extracts from 50 = 25 * 2 = 5^2 * 2', () => {
				const [extracted, remaining] = extractPerfectPower(50n, 2n);
				expect(extracted).toBe(5n);
				expect(remaining).toBe(2n);
			});

			it('extracts from 72 = 36 * 2 = 6^2 * 2', () => {
				const [extracted, remaining] = extractPerfectPower(72n, 2n);
				expect(extracted).toBe(6n);
				expect(remaining).toBe(2n);
			});

			it('extracts from 48 = 16 * 3 = 4^2 * 3', () => {
				const [extracted, remaining] = extractPerfectPower(48n, 2n);
				expect(extracted).toBe(4n);
				expect(remaining).toBe(3n);
			});

			it('returns 1 for prime radicand', () => {
				const [extracted, remaining] = extractPerfectPower(5n, 2n);
				expect(extracted).toBe(1n);
				expect(remaining).toBe(5n);
			});

			it('extracts completely for perfect square', () => {
				const [extracted, remaining] = extractPerfectPower(36n, 2n);
				expect(extracted).toBe(6n);
				expect(remaining).toBe(1n);
			});
		});

		describe('cube root extraction', () => {
			it('extracts from 24 = 8 * 3 = 2^3 * 3', () => {
				const [extracted, remaining] = extractPerfectPower(24n, 3n);
				expect(extracted).toBe(2n);
				expect(remaining).toBe(3n);
			});

			it('extracts from 54 = 27 * 2 = 3^3 * 2', () => {
				const [extracted, remaining] = extractPerfectPower(54n, 3n);
				expect(extracted).toBe(3n);
				expect(remaining).toBe(2n);
			});

			it('extracts completely for perfect cube', () => {
				const [extracted, remaining] = extractPerfectPower(64n, 3n);
				expect(extracted).toBe(4n);
				expect(remaining).toBe(1n);
			});
		});

		describe('edge cases', () => {
			it('handles 1', () => {
				const [extracted, remaining] = extractPerfectPower(1n, 2n);
				expect(extracted).toBe(1n);
				expect(remaining).toBe(1n);
			});

			it('handles 0', () => {
				const [extracted, remaining] = extractPerfectPower(0n, 2n);
				expect(extracted).toBe(1n);
				expect(remaining).toBe(0n);
			});
		});
	});

	// ===========================================================================
	// Radical Simplification
	// ===========================================================================

	describe('simplifyRadical', () => {
		describe('square roots', () => {
			it('simplifies sqrt(18) = 3*sqrt(2)', () => {
				const result = simplifyRadical(18n, 2n);
				expect(result.coefficient).toBe(3n);
				expect(result.radicand).toBe(2n);
			});

			it('simplifies sqrt(4) = 2', () => {
				const result = simplifyRadical(4n, 2n);
				expect(result.coefficient).toBe(2n);
				expect(result.radicand).toBe(1n);
			});

			it('simplifies sqrt(50) = 5*sqrt(2)', () => {
				const result = simplifyRadical(50n, 2n);
				expect(result.coefficient).toBe(5n);
				expect(result.radicand).toBe(2n);
			});

			it('simplifies sqrt(72) = 6*sqrt(2)', () => {
				const result = simplifyRadical(72n, 2n);
				expect(result.coefficient).toBe(6n);
				expect(result.radicand).toBe(2n);
			});

			it('keeps sqrt(5) as is', () => {
				const result = simplifyRadical(5n, 2n);
				expect(result.coefficient).toBe(1n);
				expect(result.radicand).toBe(5n);
			});

			it('keeps sqrt(2) as is', () => {
				const result = simplifyRadical(2n, 2n);
				expect(result.coefficient).toBe(1n);
				expect(result.radicand).toBe(2n);
			});

			it('simplifies sqrt(1) = 1', () => {
				const result = simplifyRadical(1n, 2n);
				expect(result.coefficient).toBe(1n);
				expect(result.radicand).toBe(1n);
			});
		});

		describe('cube roots', () => {
			it('simplifies cbrt(27) = 3', () => {
				const result = simplifyRadical(27n, 3n);
				expect(result.coefficient).toBe(3n);
				expect(result.radicand).toBe(1n);
			});

			it('simplifies cbrt(54) = 3*cbrt(2)', () => {
				const result = simplifyRadical(54n, 3n);
				expect(result.coefficient).toBe(3n);
				expect(result.radicand).toBe(2n);
			});

			it('simplifies cbrt(24) = 2*cbrt(3)', () => {
				const result = simplifyRadical(24n, 3n);
				expect(result.coefficient).toBe(2n);
				expect(result.radicand).toBe(3n);
			});

			it('keeps cbrt(5) as is', () => {
				const result = simplifyRadical(5n, 3n);
				expect(result.coefficient).toBe(1n);
				expect(result.radicand).toBe(5n);
			});
		});

		describe('fourth roots', () => {
			it('simplifies root4(16) = 2', () => {
				const result = simplifyRadical(16n, 4n);
				expect(result.coefficient).toBe(2n);
				expect(result.radicand).toBe(1n);
			});

			it('simplifies root4(48) = 2*root4(3)', () => {
				const result = simplifyRadical(48n, 4n);
				expect(result.coefficient).toBe(2n);
				expect(result.radicand).toBe(3n);
			});
		});

		describe('error handling', () => {
			it('throws for non-positive radicand', () => {
				expect(() => simplifyRadical(0n, 2n)).toThrow('must be positive');
				expect(() => simplifyRadical(-1n, 2n)).toThrow('must be positive');
			});

			it('throws for index < 2', () => {
				expect(() => simplifyRadical(4n, 1n)).toThrow('must be at least 2');
				expect(() => simplifyRadical(4n, 0n)).toThrow('must be at least 2');
			});
		});
	});

	describe('createRadical', () => {
		it('creates simplified radical', () => {
			const r = createRadical(2n, 2n);
			expect(r).toEqual({ radicand: 2n, index: 2n });
		});

		it('returns null for perfect power', () => {
			expect(createRadical(4n, 2n)).toBe(null);
			expect(createRadical(27n, 3n)).toBe(null);
		});

		it('simplifies before creating', () => {
			// sqrt(8) = 2*sqrt(2), but this function only returns the radical part
			const r = createRadical(8n, 2n);
			expect(r).toEqual({ radicand: 2n, index: 2n });
		});
	});

	// ===========================================================================
	// Radical Multiplication
	// ===========================================================================

	describe('mulRadicalsSameIndex', () => {
		const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
		const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
		const sqrt8: SimplifiedRadical = { radicand: 8n, index: 2n };

		it('sqrt(2) * sqrt(3) = sqrt(6)', () => {
			const result = mulRadicalsSameIndex(sqrt2, sqrt3);
			expect(result.coefficient).toBe(1n);
			expect(result.radical).toEqual({ radicand: 6n, index: 2n });
		});

		it('sqrt(2) * sqrt(2) = 2', () => {
			const result = mulRadicalsSameIndex(sqrt2, sqrt2);
			expect(result.coefficient).toBe(2n);
			expect(result.radical).toBe(null);
		});

		it('sqrt(2) * sqrt(8) = 4', () => {
			const result = mulRadicalsSameIndex(sqrt2, sqrt8);
			expect(result.coefficient).toBe(4n);
			expect(result.radical).toBe(null);
		});

		it('sqrt(3) * sqrt(3) = 3', () => {
			const result = mulRadicalsSameIndex(sqrt3, sqrt3);
			expect(result.coefficient).toBe(3n);
			expect(result.radical).toBe(null);
		});

		it('sqrt(2) * sqrt(18) = 6', () => {
			const sqrt18: SimplifiedRadical = { radicand: 18n, index: 2n };
			const result = mulRadicalsSameIndex(sqrt2, sqrt18);
			expect(result.coefficient).toBe(6n);
			expect(result.radical).toBe(null);
		});

		it('throws for different indices', () => {
			const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };
			expect(() => mulRadicalsSameIndex(sqrt2, cbrt2)).toThrow('indices must match');
		});

		describe('cube roots', () => {
			const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };
			const cbrt4: SimplifiedRadical = { radicand: 4n, index: 3n };

			it('cbrt(2) * cbrt(4) = 2', () => {
				const result = mulRadicalsSameIndex(cbrt2, cbrt4);
				expect(result.coefficient).toBe(2n);
				expect(result.radical).toBe(null);
			});

			it('cbrt(2) * cbrt(2) = cbrt(4)', () => {
				const result = mulRadicalsSameIndex(cbrt2, cbrt2);
				expect(result.coefficient).toBe(1n);
				expect(result.radical).toEqual({ radicand: 4n, index: 3n });
			});
		});
	});

	describe('mulRadicals', () => {
		const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
		const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
		const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };

		it('delegates to mulRadicalsSameIndex for same index', () => {
			const result = mulRadicals(sqrt2, sqrt3);
			expect(result.coefficient).toBe(1n);
			expect(result.radical).toEqual({ radicand: 6n, index: 2n });
		});

		it('handles different indices', () => {
			// sqrt(2) * cbrt(2) = 2^(1/2) * 2^(1/3) = 2^(1/2 + 1/3) = 2^(5/6)
			// In common index 6: (2^3)^(1/6) * (2^2)^(1/6) = (8*4)^(1/6) = 32^(1/6)
			const result = mulRadicals(sqrt2, cbrt2);
			expect(result.coefficient).toBe(1n);
			expect(result.radical?.radicand).toBe(32n);
			expect(result.radical?.index).toBe(6n);
		});
	});

	// ===========================================================================
	// Radical Comparison
	// ===========================================================================

	describe('compareRadicals', () => {
		const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
		const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
		const sqrt5: SimplifiedRadical = { radicand: 5n, index: 2n };
		const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };
		const cbrt3: SimplifiedRadical = { radicand: 3n, index: 3n };

		it('compares by index first', () => {
			// sqrt < cbrt
			expect(compareRadicals(sqrt2, cbrt2)).toBe(-1);
			expect(compareRadicals(cbrt2, sqrt2)).toBe(1);
			expect(compareRadicals(sqrt5, cbrt2)).toBe(-1); // sqrt(5) < cbrt(2)
		});

		it('compares by radicand for same index', () => {
			expect(compareRadicals(sqrt2, sqrt3)).toBe(-1);
			expect(compareRadicals(sqrt3, sqrt2)).toBe(1);
			expect(compareRadicals(sqrt2, sqrt5)).toBe(-1);
		});

		it('returns 0 for equal radicals', () => {
			expect(compareRadicals(sqrt2, sqrt2)).toBe(0);
			expect(compareRadicals(cbrt3, cbrt3)).toBe(0);
		});

		it('produces correct ordering', () => {
			const radicals = [cbrt3, sqrt5, cbrt2, sqrt2, sqrt3];
			const sorted = [...radicals].sort(compareRadicals);
			expect(sorted).toEqual([sqrt2, sqrt3, sqrt5, cbrt2, cbrt3]);
		});
	});

	describe('equalRadicals', () => {
		const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
		const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
		const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };

		it('returns true for equal radicals', () => {
			expect(equalRadicals(sqrt2, { radicand: 2n, index: 2n })).toBe(true);
		});

		it('returns false for different radicands', () => {
			expect(equalRadicals(sqrt2, sqrt3)).toBe(false);
		});

		it('returns false for different indices', () => {
			expect(equalRadicals(sqrt2, cbrt2)).toBe(false);
		});
	});

	// ===========================================================================
	// Conversion
	// ===========================================================================

	describe('radicalToNumber', () => {
		it('converts square roots', () => {
			expect(radicalToNumber({ radicand: 4n, index: 2n })).toBe(2);
			expect(radicalToNumber({ radicand: 2n, index: 2n })).toBeCloseTo(Math.sqrt(2), 10);
		});

		it('converts cube roots', () => {
			expect(radicalToNumber({ radicand: 8n, index: 3n })).toBe(2);
			expect(radicalToNumber({ radicand: 2n, index: 3n })).toBeCloseTo(Math.cbrt(2), 10);
		});
	});

	describe('radicalToString', () => {
		it('formats square root', () => {
			expect(radicalToString({ radicand: 2n, index: 2n })).toBe('sqrt(2)');
		});

		it('formats cube root', () => {
			expect(radicalToString({ radicand: 5n, index: 3n })).toBe('cbrt(5)');
		});

		it('formats higher roots', () => {
			expect(radicalToString({ radicand: 3n, index: 4n })).toBe('root[4](3)');
			expect(radicalToString({ radicand: 2n, index: 5n })).toBe('root[5](2)');
		});
	});

	describe('hashRadical', () => {
		it('creates consistent hash', () => {
			const r1: SimplifiedRadical = { radicand: 2n, index: 2n };
			const r2: SimplifiedRadical = { radicand: 2n, index: 2n };
			expect(hashRadical(r1)).toBe(hashRadical(r2));
		});

		it('creates different hashes for different radicals', () => {
			const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
			const sqrt3: SimplifiedRadical = { radicand: 3n, index: 2n };
			const cbrt2: SimplifiedRadical = { radicand: 2n, index: 3n };
			expect(hashRadical(sqrt2)).not.toBe(hashRadical(sqrt3));
			expect(hashRadical(sqrt2)).not.toBe(hashRadical(cbrt2));
		});
	});

	// ===========================================================================
	// Integration Tests
	// ===========================================================================

	describe('integration', () => {
		it('verifies sqrt(2) * sqrt(8) = 4', () => {
			// sqrt(2) * sqrt(8) = sqrt(16) = 4
			const sqrt2: SimplifiedRadical = { radicand: 2n, index: 2n };
			const sqrt8: SimplifiedRadical = { radicand: 8n, index: 2n };
			const result = mulRadicalsSameIndex(sqrt2, sqrt8);
			expect(result.coefficient).toBe(4n);
			expect(result.radical).toBe(null);
		});

		it('verifies simplification chain: sqrt(72) = 6*sqrt(2)', () => {
			const result = simplifyRadical(72n, 2n);
			expect(result.coefficient).toBe(6n);
			expect(result.radicand).toBe(2n);
		});

		it('verifies sqrt(200) = 10*sqrt(2)', () => {
			const result = simplifyRadical(200n, 2n);
			expect(result.coefficient).toBe(10n);
			expect(result.radicand).toBe(2n);
		});
	});
});
