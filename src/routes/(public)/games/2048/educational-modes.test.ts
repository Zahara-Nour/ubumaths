/**
 * Unit tests for educational modes tile generation logic
 */

import { describe, it, expect } from 'vitest';
import {
	generateEducationalTile,
	getMergeDisplayValue,
	canMerge,
	getWinningValue
} from './educational-modes';

describe('Educational Modes - Tile Generation', () => {
	describe('generateEducationalTile - classic mode', () => {
		it('should generate 2 or 4 for classic mode without target', () => {
			for (let i = 0; i < 50; i++) {
				const tile = generateEducationalTile('classic');
				expect([2, 4]).toContain(tile.value);
				expect(tile.displayValue).toBe(tile.value.toString());
			}
		});

		it('should generate specific value when targetValue is provided', () => {
			const tile = generateEducationalTile('classic', 16);
			expect(tile.value).toBe(16);
			expect(tile.displayValue).toBe('16');
		});
	});

	describe('generateEducationalTile - multiplication mode', () => {
		it('should generate valid multiplication expressions', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('multiplication');
				expect(tile.value).toBeGreaterThan(0);
				expect(tile.displayValue).toMatch(/^\d+×\d+$/);

				// Extract factors and verify multiplication
				const [a, b] = tile.displayValue.split('×').map(Number);
				expect(a * b).toBe(tile.value);
			}
		});

		it('should use factors within multiplication table (1-12)', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('multiplication');
				const [a, b] = tile.displayValue.split('×').map(Number);

				expect(a).toBeGreaterThanOrEqual(1);
				expect(a).toBeLessThanOrEqual(12);
				expect(b).toBeGreaterThanOrEqual(1);
				expect(b).toBeLessThanOrEqual(12);
			}
		});

		it('should handle value 2 correctly', () => {
			const tile = generateEducationalTile('multiplication', 2);
			expect(tile.value).toBe(2);
			expect(['2×1', '1×2']).toContain(tile.displayValue);
		});

		it('should handle large values > 144 by showing number', () => {
			const tile = generateEducationalTile('multiplication', 200);
			expect(tile.value).toBe(200);
			expect(tile.displayValue).toBe('200');
		});

		it('should generate factors for common values', () => {
			// Test common merged values
			const testValues = [6, 12, 18, 24, 36, 48, 72, 144];

			for (const val of testValues) {
				const tile = generateEducationalTile('multiplication', val);
				expect(tile.value).toBe(val);

				if (val <= 144) {
					// Should show multiplication expression
					expect(tile.displayValue).toMatch(/^\d+×\d+$/);
					const [a, b] = tile.displayValue.split('×').map(Number);
					expect(a * b).toBe(val);
				}
			}
		});
	});

	describe('generateEducationalTile - equations mode', () => {
		it('should generate valid equation expressions', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('equations');
				expect(tile.value).toBeGreaterThan(0);
				expect(tile.displayValue).toMatch(/^(x[+\-]?\d*|\d*x|x=\d+)$/);
			}
		});

		it('should generate equations with addition format', () => {
			const seenAddition = [];
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('equations', 10);
				if (tile.displayValue.includes('x+')) {
					seenAddition.push(tile.displayValue);
				}
			}
			// Should see at least some addition equations
			expect(seenAddition.length).toBeGreaterThan(0);
		});

		it('should generate equations with subtraction format', () => {
			const seenSubtraction = [];
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('equations', 10);
				if (tile.displayValue.includes('x-')) {
					seenSubtraction.push(tile.displayValue);
				}
			}
			// Should see at least some subtraction equations
			expect(seenSubtraction.length).toBeGreaterThan(0);
		});

		it('should generate equations with multiplication format', () => {
			const seenMultiplication = [];
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('equations', 12); // 12 is divisible
				if (tile.displayValue.match(/^\d+x$/)) {
					seenMultiplication.push(tile.displayValue);
				}
			}
			// Should see at least some multiplication equations
			expect(seenMultiplication.length).toBeGreaterThan(0);
		});

		it('should handle specific target values', () => {
			const tile = generateEducationalTile('equations', 50);
			expect(tile.value).toBe(50);
			expect(tile.displayValue).toBeTruthy();
		});
	});

	describe('generateEducationalTile - fractions mode', () => {
		it('should generate valid fraction expressions', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('fractions');
				expect(tile.value).toBeGreaterThan(0);
				expect(tile.displayValue).toMatch(/^\d+\/\d+$/);
			}
		});

		it('should encode fractions correctly (numerator * 1000 + denominator)', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('fractions');
				const value = tile.value;
				const num = Math.floor(value / 1000);
				const den = value % 1000;

				// Verify displayValue matches encoding
				const [displayNum, displayDen] = tile.displayValue.split('/').map(Number);

				// Display should be equivalent fraction
				expect(displayNum / displayDen).toBeCloseTo(num / den, 5);
			}
		});

		it('should generate simple fractions for initial tiles', () => {
			const initialValues = new Set<number>();
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('fractions');
				initialValues.add(tile.value);
			}

			// Should see common simple fractions
			// 1/2 = 1002, 1/4 = 1004, 1/3 = 1003, 2/3 = 2003, 3/4 = 3004
			const expectedValues = [1002, 1004, 1003, 2003, 3004];
			for (const val of expectedValues) {
				expect(initialValues.has(val)).toBe(true);
			}
		});

		it('should generate equivalent fractions for merged tiles', () => {
			// Start with 1/2 (encoded as 1002)
			const tile = generateEducationalTile('fractions', 1002);
			expect(tile.value).toBe(1002); // Value stays the same

			// Display should show equivalent fraction
			const [displayNum, displayDen] = tile.displayValue.split('/').map(Number);
			expect(displayNum / displayDen).toBeCloseTo(1 / 2, 5);
		});

		it('should keep denominator below 100 for readability', () => {
			for (let i = 0; i < 100; i++) {
				const tile = generateEducationalTile('fractions', 1002); // 1/2
				const [, displayDen] = tile.displayValue.split('/').map(Number);
				expect(displayDen).toBeLessThan(100);
			}
		});

		it('should decode fraction encoding correctly', () => {
			// Test specific encodings
			const testCases = [
				{ encoded: 1002, num: 1, den: 2 }, // 1/2
				{ encoded: 1004, num: 1, den: 4 }, // 1/4
				{ encoded: 3004, num: 3, den: 4 }, // 3/4
				{ encoded: 2003, num: 2, den: 3 }, // 2/3
				{ encoded: 5010, num: 5, den: 10 } // 5/10
			];

			for (const { encoded, num, den } of testCases) {
				const decodedNum = Math.floor(encoded / 1000);
				const decodedDen = encoded % 1000;

				expect(decodedNum).toBe(num);
				expect(decodedDen).toBe(den);
			}
		});
	});
});

describe('getMergeDisplayValue', () => {
	it('should return display value for classic mode', () => {
		const display = getMergeDisplayValue(8, 'classic');
		expect(display).toBe('8');
	});

	it('should return multiplication display for multiplication mode', () => {
		const display = getMergeDisplayValue(12, 'multiplication');
		expect(display).toMatch(/^\d+×\d+$/);
	});

	it('should return equation display for equations mode', () => {
		const display = getMergeDisplayValue(20, 'equations');
		expect(display).toBeTruthy();
	});

	it('should return fraction display for fractions mode', () => {
		const display = getMergeDisplayValue(1002, 'fractions');
		expect(display).toMatch(/^\d+\/\d+$/);
	});
});

describe('canMerge', () => {
	it('should allow merge when values are equal in classic mode', () => {
		expect(canMerge(4, 4, 'classic')).toBe(true);
		expect(canMerge(8, 8, 'classic')).toBe(true);
	});

	it('should not allow merge when values are different in classic mode', () => {
		expect(canMerge(2, 4, 'classic')).toBe(false);
		expect(canMerge(8, 16, 'classic')).toBe(false);
	});

	it('should allow merge when values are equal in multiplication mode', () => {
		expect(canMerge(6, 6, 'multiplication')).toBe(true);
		expect(canMerge(12, 12, 'multiplication')).toBe(true);
	});

	it('should not allow merge when values are different in multiplication mode', () => {
		expect(canMerge(6, 12, 'multiplication')).toBe(false);
	});

	it('should allow merge when values are equal in equations mode', () => {
		expect(canMerge(10, 10, 'equations')).toBe(true);
	});

	it('should allow merge when values are equal in fractions mode', () => {
		expect(canMerge(1002, 1002, 'fractions')).toBe(true);
	});

	it('should not allow merge when fraction encodings differ', () => {
		// 1/2 vs 1/4
		expect(canMerge(1002, 1004, 'fractions')).toBe(false);
	});
});

describe('getWinningValue', () => {
	it('should return 2048 for classic mode', () => {
		expect(getWinningValue('classic')).toBe(2048);
	});

	it('should return 144 (12×12) for multiplication mode', () => {
		expect(getWinningValue('multiplication')).toBe(144);
	});

	it('should return 100 for equations mode', () => {
		expect(getWinningValue('equations')).toBe(100);
	});

	it('should return 1001 (1/1) for fractions mode', () => {
		expect(getWinningValue('fractions')).toBe(1001);
	});
});

describe('Edge Cases and Validation', () => {
	it('should handle edge case of value 2 in multiplication mode', () => {
		const tile = generateEducationalTile('multiplication', 2);
		expect(tile.value).toBe(2);
		const [a, b] = tile.displayValue.split('×').map(Number);
		expect(a * b).toBe(2);
	});

	it('should handle prime numbers in multiplication mode', () => {
		// Primes > 12 should fallback to number display
		const tile = generateEducationalTile('multiplication', 13);
		expect(tile.value).toBe(13);
		expect(tile.displayValue).toBe('13');
	});

	it('should handle value 1 in multiplication mode', () => {
		const tile = generateEducationalTile('multiplication', 1);
		expect(tile.value).toBe(1);
		// 1 has factor pair (1, 1), should show '1×1'
		expect(tile.displayValue).toBe('1×1');
	});

	it('should handle very large values gracefully', () => {
		const tile1 = generateEducationalTile('multiplication', 1000);
		expect(tile1.value).toBe(1000);
		expect(tile1.displayValue).toBe('1000');

		const tile2 = generateEducationalTile('equations', 1000);
		expect(tile2.value).toBe(1000);
		expect(tile2.displayValue).toBeTruthy();
	});

	it('should generate consistent results for same targetValue', () => {
		// Same targetValue should produce tiles with same value (but potentially different displays)
		const tile1 = generateEducationalTile('multiplication', 24);
		const tile2 = generateEducationalTile('multiplication', 24);

		expect(tile1.value).toBe(24);
		expect(tile2.value).toBe(24);

		// Both should be valid multiplication expressions
		expect(tile1.displayValue).toMatch(/^\d+×\d+$/);
		expect(tile2.displayValue).toMatch(/^\d+×\d+$/);
	});
});

describe('Mathematical Correctness', () => {
	it('multiplication mode - all displays should calculate correctly', () => {
		const testValues = [2, 4, 6, 8, 12, 16, 18, 24, 36, 48, 72, 144];

		for (const value of testValues) {
			for (let i = 0; i < 10; i++) {
				const tile = generateEducationalTile('multiplication', value);
				expect(tile.value).toBe(value);

				if (tile.displayValue.includes('×')) {
					const [a, b] = tile.displayValue.split('×').map(Number);
					expect(a * b).toBe(value);
				} else {
					// Fallback to number display
					expect(parseInt(tile.displayValue)).toBe(value);
				}
			}
		}
	});

	it('fractions mode - all displays should be equivalent', () => {
		const testEncodings = [1002, 1004, 2003, 3004]; // 1/2, 1/4, 2/3, 3/4

		for (const encoding of testEncodings) {
			const num = Math.floor(encoding / 1000);
			const den = encoding % 1000;
			const expectedRatio = num / den;

			for (let i = 0; i < 10; i++) {
				const tile = generateEducationalTile('fractions', encoding);
				expect(tile.value).toBe(encoding);

				const [displayNum, displayDen] = tile.displayValue.split('/').map(Number);
				expect(displayNum / displayDen).toBeCloseTo(expectedRatio, 5);
			}
		}
	});
});
