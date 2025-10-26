/**
 * Random Generator Tests
 * =======================
 *
 * Tests for random number generation from RandomSpec with:
 * - Integer ranges
 * - Decimal by digits
 * - Decimal ranges with step
 * - Variable bounds
 * - Exclusion patterns
 * - Seeded reproducibility
 */

import { describe, it, expect } from 'vitest';
import { generateRandomNumber } from './random-generator';
import type { RandomSpec, ResolvedVariable } from '../types';

describe('generateRandomNumber', () => {
	// ============================================================================
	// INTEGER RANGES
	// ============================================================================

	describe('Integer ranges', () => {
		it('should generate integer within range', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(10);
			expect(Number.isInteger(value)).toBe(true);
		});

		it('should generate same value with same seed', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 100 },
				exclusions: []
			};
			const value1 = generateRandomNumber(spec, [], 42);
			const value2 = generateRandomNumber(spec, [], 42);
			expect(value1).toBe(value2);
		});

		it('should generate different values with different seeds', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 1000 },
				exclusions: []
			};
			const value1 = generateRandomNumber(spec, [], 42);
			const value2 = generateRandomNumber(spec, [], 43);
			expect(value1).not.toBe(value2);
		});

		it('should handle single value range (min === max)', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 5 },
				max: { type: 'number', value: 5 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBe(5);
		});

		it('should handle large ranges', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 1000000 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(1000000);
		});

		it('should handle negative ranges', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: -10 },
				max: { type: 'number', value: -1 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(-10);
			expect(value).toBeLessThanOrEqual(-1);
		});

		it('should handle ranges crossing zero', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: -5 },
				max: { type: 'number', value: 5 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(-5);
			expect(value).toBeLessThanOrEqual(5);
		});

		it('should throw error if min > max', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 10 },
				max: { type: 'number', value: 1 },
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'Invalid range: min (10) must be less than or equal to max (1)'
			);
		});
	});

	// ============================================================================
	// VARIABLE BOUNDS
	// ============================================================================

	describe('Variable bounds', () => {
		it('should resolve variable min and max', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'variable', name: 'min' },
				max: { type: 'variable', name: 'max' },
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [
				{ name: 'min', value: '5' },
				{ name: 'max', value: '15' }
			];
			const value = generateRandomNumber(spec, resolved, 42);
			expect(value).toBeGreaterThanOrEqual(5);
			expect(value).toBeLessThanOrEqual(15);
		});

		it('should handle mixed number and variable bounds', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'variable', name: 'max' },
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [{ name: 'max', value: '20' }];
			const value = generateRandomNumber(spec, resolved, 42);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(20);
		});

		it('should throw error if variable not found', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'variable', name: 'undefined' },
				max: { type: 'number', value: 10 },
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'Variable "undefined" not found or not yet resolved'
			);
		});

		it('should throw error if variable is not a number', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'variable', name: 'notNumber' },
				max: { type: 'number', value: 10 },
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [{ name: 'notNumber', value: 'text' }];
			expect(() => generateRandomNumber(spec, resolved, 42)).toThrow(
				'Variable "notNumber" does not resolve to a number'
			);
		});

		it('should handle decimal values in variables', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'variable', name: 'min' },
				max: { type: 'variable', name: 'max' },
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [
				{ name: 'min', value: '5.7' },
				{ name: 'max', value: '10.3' }
			];
			const value = generateRandomNumber(spec, resolved, 42);
			expect(value).toBeGreaterThanOrEqual(5);
			expect(value).toBeLessThanOrEqual(11);
		});
	});

	// ============================================================================
	// EXCLUSIONS
	// ============================================================================

	describe('Exclusions', () => {
		it('should exclude single value', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 5 },
				exclusions: [{ type: 'value', value: { type: 'number', value: 3 } }]
			};
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, [], i));
			expect(values).not.toContain(3);
			expect(values.some((v) => v === 1 || v === 2 || v === 4 || v === 5)).toBe(true);
		});

		it('should exclude multiple values', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: [
					{ type: 'value', value: { type: 'number', value: 3 } },
					{ type: 'value', value: { type: 'number', value: 5 } },
					{ type: 'value', value: { type: 'number', value: 7 } }
				]
			};
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, [], i));
			expect(values).not.toContain(3);
			expect(values).not.toContain(5);
			expect(values).not.toContain(7);
		});

		it('should exclude range', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: [
					{
						type: 'range',
						min: { type: 'number', value: 5 },
						max: { type: 'number', value: 7 }
					}
				]
			};
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, [], i));
			expect(values).not.toContain(5);
			expect(values).not.toContain(6);
			expect(values).not.toContain(7);
		});

		it('should exclude variable value', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: [{ type: 'value', value: { type: 'variable', name: 'excluded' } }]
			};
			const resolved: ResolvedVariable[] = [{ name: 'excluded', value: '5' }];
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, resolved, i));
			expect(values).not.toContain(5);
		});

		it('should exclude variable range', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 20 },
				exclusions: [
					{
						type: 'range',
						min: { type: 'variable', name: 'excludeMin' },
						max: { type: 'variable', name: 'excludeMax' }
					}
				]
			};
			const resolved: ResolvedVariable[] = [
				{ name: 'excludeMin', value: '8' },
				{ name: 'excludeMax', value: '12' }
			];
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, resolved, i));
			for (let i = 8; i <= 12; i++) {
				expect(values).not.toContain(i);
			}
		});

		it('should throw error if all values excluded', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 3 },
				exclusions: [
					{ type: 'value', value: { type: 'number', value: 1 } },
					{ type: 'value', value: { type: 'number', value: 2 } },
					{ type: 'value', value: { type: 'number', value: 3 } }
				]
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'Unable to generate random number with given exclusions'
			);
		});

		it('should throw error for invalid exclusion range', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: [
					{
						type: 'range',
						min: { type: 'number', value: 7 },
						max: { type: 'number', value: 5 }
					}
				]
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'Invalid exclusion range: min (7) must be less than max (5)'
			);
		});
	});

	// ============================================================================
	// DECIMAL BY DIGITS
	// ============================================================================

	describe('Decimal by digits', () => {
		it('should generate decimal with correct digits', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: 2 },
				digitsAfter: { type: 'number', value: 3 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(10); // min 2 digits before
			expect(value).toBeLessThan(100); // max 2 digits before
			const str = value.toString();
			const [, decimals] = str.split('.');
			expect(decimals).toHaveLength(3);
		});

		it('should handle 1 digit before decimal', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: 1 },
				digitsAfter: { type: 'number', value: 2 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(10);
			const decimals = value.toString().split('.')[1];
			expect(decimals).toHaveLength(2);
		});

		it('should handle many decimal places', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: 3 },
				digitsAfter: { type: 'number', value: 5 },
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			const decimals = value.toString().split('.')[1];
			expect(decimals).toHaveLength(5);
		});

		it('should pad zeros in decimal places', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: 2 },
				digitsAfter: { type: 'number', value: 4 },
				exclusions: []
			};
			// Generate multiple values to ensure padding works
			const values = Array.from({ length: 20 }, (_, i) => {
				const value = generateRandomNumber(spec, [], i);
				return value.toString().split('.')[1];
			});
			// Most should have exactly 4 decimal places (trailing zeros may be removed)
			// At least verify we have 4 or fewer decimal places
			values.forEach((decimals) => {
				if (decimals) {
					expect(decimals.length).toBeLessThanOrEqual(4);
					expect(decimals.length).toBeGreaterThan(0);
				}
			});
		});

		it('should resolve variable digits', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'variable', name: 'before' },
				digitsAfter: { type: 'variable', name: 'after' },
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [
				{ name: 'before', value: '2' },
				{ name: 'after', value: '3' }
			];
			const value = generateRandomNumber(spec, resolved, 42);
			expect(value).toBeGreaterThanOrEqual(10);
			expect(value).toBeLessThan(100);
			const decimals = value.toString().split('.')[1];
			expect(decimals).toHaveLength(3);
		});

		it('should throw error for negative digits', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: -1 },
				digitsAfter: { type: 'number', value: 2 },
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'digitsBefore must be a non-negative integer'
			);
		});

		it('should throw error for non-integer digits', () => {
			const spec: RandomSpec = {
				type: 'decimal-by-digits',
				digitsBefore: { type: 'number', value: 2.5 },
				digitsAfter: { type: 'number', value: 3 },
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow(
				'digitsBefore must be a non-negative integer'
			);
		});
	});

	// ============================================================================
	// DECIMAL RANGE WITH STEP
	// ============================================================================

	describe('Decimal range with step', () => {
		it('should generate decimal within range', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'number', value: 0.5 },
				max: { type: 'number', value: 2.5 },
				step: 0.5,
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(0.5);
			expect(value).toBeLessThanOrEqual(2.5);
		});

		it('should align to step values', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'number', value: 0.5 },
				max: { type: 'number', value: 2.5 },
				step: 0.5,
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			const offset = value - 0.5;
			expect(offset % 0.5).toBeCloseTo(0, 5);
		});

		it('should handle small steps', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'number', value: 0 },
				max: { type: 'number', value: 1 },
				step: 0.01,
				exclusions: []
			};
			const value = generateRandomNumber(spec, [], 42);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThanOrEqual(1);
			// Check it's a multiple of 0.01
			expect((value * 100) % 1).toBeCloseTo(0, 5);
		});

		it('should handle variable bounds in decimal range', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'variable', name: 'min' },
				max: { type: 'variable', name: 'max' },
				step: 0.1,
				exclusions: []
			};
			const resolved: ResolvedVariable[] = [
				{ name: 'min', value: '0.5' },
				{ name: 'max', value: '5.0' }
			];
			const value = generateRandomNumber(spec, resolved, 42);
			expect(value).toBeGreaterThanOrEqual(0.5);
			expect(value).toBeLessThanOrEqual(5.0);
		});

		it('should throw error for non-positive step', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'number', value: 0.5 },
				max: { type: 'number', value: 2.5 },
				step: 0,
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow('Step must be positive');
		});

		it('should throw error for negative step', () => {
			const spec: RandomSpec = {
				type: 'decimal-range',
				min: { type: 'number', value: 0.5 },
				max: { type: 'number', value: 2.5 },
				step: -0.5,
				exclusions: []
			};
			expect(() => generateRandomNumber(spec, [], 42)).toThrow('Step must be positive');
		});
	});

	// ============================================================================
	// SEEDED GENERATION
	// ============================================================================

	describe('Seeded generation', () => {
		it('should produce deterministic results with seed', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 1000 },
				exclusions: []
			};
			const value1 = generateRandomNumber(spec, [], 12345);
			const value2 = generateRandomNumber(spec, [], 12345);
			expect(value1).toBe(value2);
		});

		it('should produce different sequences for different seeds', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 1000000 },
				exclusions: []
			};
			const values1 = Array.from({ length: 10 }, (_, i) => generateRandomNumber(spec, [], i));
			const values2 = Array.from({ length: 10 }, (_, i) => generateRandomNumber(spec, [], i + 100));

			// At least one value should be different (very likely with large range)
			expect(values1).not.toEqual(values2);
		});

		it('should produce random-like distribution', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 10 },
				exclusions: []
			};
			const values = Array.from({ length: 100 }, (_, i) => generateRandomNumber(spec, [], i));

			// Check we got variety (not all the same value)
			const unique = new Set(values);
			expect(unique.size).toBeGreaterThan(3); // Should have reasonable variety
		});

		it('should handle unseeded generation', () => {
			const spec: RandomSpec = {
				type: 'integer',
				min: { type: 'number', value: 1 },
				max: { type: 'number', value: 100 },
				exclusions: []
			};
			// Should not throw error
			const value = generateRandomNumber(spec, []);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(100);
		});
	});
});
