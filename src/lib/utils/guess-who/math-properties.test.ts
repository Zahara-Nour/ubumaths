/**
 * Tests for Guess Who Math Game - Math Properties
 *
 * @module utils/guess-who/math-properties.test
 */

import { describe, it, expect } from 'vitest';
import {
	isPrime,
	isEven,
	isOdd,
	isDivisibleBy,
	isMultipleOf,
	getUnitsDigit,
	getTensDigit,
	isPerfectSquare,
	sumOfDigits,
	checkProperty
} from './math-properties';

describe('isPrime', () => {
	it('returns true for prime numbers', () => {
		expect(isPrime(2)).toBe(true);
		expect(isPrime(3)).toBe(true);
		expect(isPrime(17)).toBe(true);
		expect(isPrime(97)).toBe(true);
	});

	it('returns false for non-prime numbers', () => {
		expect(isPrime(4)).toBe(false);
		expect(isPrime(51)).toBe(false);
		expect(isPrime(1)).toBe(false);
	});
});

describe('isEven', () => {
	it('returns true for even numbers', () => {
		expect(isEven(2)).toBe(true);
		expect(isEven(0)).toBe(true);
		expect(isEven(100)).toBe(true);
	});

	it('returns false for odd numbers', () => {
		expect(isEven(3)).toBe(false);
		expect(isEven(99)).toBe(false);
	});
});

describe('isOdd', () => {
	it('returns true for odd numbers', () => {
		expect(isOdd(1)).toBe(true);
		expect(isOdd(99)).toBe(true);
	});

	it('returns false for even numbers', () => {
		expect(isOdd(2)).toBe(false);
		expect(isOdd(100)).toBe(false);
	});
});

describe('isDivisibleBy', () => {
	it('returns true when divisible', () => {
		expect(isDivisibleBy(10, 2)).toBe(true);
		expect(isDivisibleBy(21, 7)).toBe(true);
		expect(isDivisibleBy(100, 5)).toBe(true);
	});

	it('returns false when not divisible', () => {
		expect(isDivisibleBy(10, 3)).toBe(false);
		expect(isDivisibleBy(21, 5)).toBe(false);
	});
});

describe('isMultipleOf', () => {
	it('returns true when n is a multiple of base', () => {
		expect(isMultipleOf(10, 2)).toBe(true);
		expect(isMultipleOf(21, 7)).toBe(true);
	});

	it('returns false when n is not a multiple of base', () => {
		expect(isMultipleOf(10, 3)).toBe(false);
		expect(isMultipleOf(21, 5)).toBe(false);
	});
});

describe('getUnitsDigit', () => {
	it('returns the units digit (last digit)', () => {
		expect(getUnitsDigit(42)).toBe(2);
		expect(getUnitsDigit(7)).toBe(7);
		expect(getUnitsDigit(100)).toBe(0);
	});
});

describe('getTensDigit', () => {
	it('returns the tens digit', () => {
		expect(getTensDigit(42)).toBe(4);
		expect(getTensDigit(7)).toBe(0);
		expect(getTensDigit(156)).toBe(5);
	});
});

describe('isPerfectSquare', () => {
	it('returns true for perfect squares', () => {
		expect(isPerfectSquare(4)).toBe(true);
		expect(isPerfectSquare(9)).toBe(true);
		expect(isPerfectSquare(16)).toBe(true);
		expect(isPerfectSquare(1)).toBe(true);
	});

	it('returns false for non-perfect squares', () => {
		expect(isPerfectSquare(15)).toBe(false);
		expect(isPerfectSquare(2)).toBe(false);
	});
});

describe('sumOfDigits', () => {
	it('returns the sum of all digits', () => {
		expect(sumOfDigits(42)).toBe(6);
		expect(sumOfDigits(123)).toBe(6);
		expect(sumOfDigits(7)).toBe(7);
	});
});

describe('checkProperty', () => {
	it('checks is_even property', () => {
		expect(checkProperty(4, 'is_even')).toBe(true);
		expect(checkProperty(3, 'is_even')).toBe(false);
	});

	it('checks is_odd property', () => {
		expect(checkProperty(3, 'is_odd')).toBe(true);
		expect(checkProperty(4, 'is_odd')).toBe(false);
	});

	it('checks is_prime property', () => {
		expect(checkProperty(17, 'is_prime')).toBe(true);
		expect(checkProperty(4, 'is_prime')).toBe(false);
	});

	it('checks is_multiple_of property with param', () => {
		expect(checkProperty(10, 'is_multiple_of', 2)).toBe(true);
		expect(checkProperty(10, 'is_multiple_of', 3)).toBe(false);
	});

	it('checks is_divisible_by property with param', () => {
		expect(checkProperty(21, 'is_divisible_by', 7)).toBe(true);
		expect(checkProperty(21, 'is_divisible_by', 5)).toBe(false);
	});

	it('checks greater_than property with param', () => {
		expect(checkProperty(50, 'greater_than', 30)).toBe(true);
		expect(checkProperty(20, 'greater_than', 30)).toBe(false);
	});

	it('checks less_than property with param', () => {
		expect(checkProperty(20, 'less_than', 30)).toBe(true);
		expect(checkProperty(50, 'less_than', 30)).toBe(false);
	});

	it('checks units_digit property with param', () => {
		expect(checkProperty(42, 'units_digit', 2)).toBe(true);
		expect(checkProperty(42, 'units_digit', 5)).toBe(false);
	});

	it('checks tens_digit property with param', () => {
		expect(checkProperty(42, 'tens_digit', 4)).toBe(true);
		expect(checkProperty(42, 'tens_digit', 2)).toBe(false);
	});

	it('checks is_perfect_square property', () => {
		expect(checkProperty(16, 'is_perfect_square')).toBe(true);
		expect(checkProperty(15, 'is_perfect_square')).toBe(false);
	});

	it('checks sum_digits property with param', () => {
		expect(checkProperty(42, 'sum_digits', 6)).toBe(true);
		expect(checkProperty(42, 'sum_digits', 5)).toBe(false);
	});
});
