/**
 * Math Properties Utilities for Guess Who Math Game
 *
 * @module utils/guess-who/math-properties
 */

/**
 * Question types for Guess Who game
 */
export type QuestionType =
	| 'is_even'
	| 'is_odd'
	| 'is_prime'
	| 'is_multiple_of'
	| 'is_divisible_by'
	| 'greater_than'
	| 'less_than'
	| 'units_digit'
	| 'tens_digit'
	| 'is_perfect_square'
	| 'sum_digits';

/**
 * Check if a number is prime
 */
export function isPrime(n: number): boolean {
	if (n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;

	const sqrt = Math.sqrt(n);
	for (let i = 3; i <= sqrt; i += 2) {
		if (n % i === 0) return false;
	}
	return true;
}

/**
 * Check if a number is even
 */
export function isEven(n: number): boolean {
	return n % 2 === 0;
}

/**
 * Check if a number is odd
 */
export function isOdd(n: number): boolean {
	return n % 2 !== 0;
}

/**
 * Check if n is divisible by divisor
 */
export function isDivisibleBy(n: number, divisor: number): boolean {
	return n % divisor === 0;
}

/**
 * Check if n is a multiple of base (alias for isDivisibleBy)
 */
export function isMultipleOf(n: number, base: number): boolean {
	return isDivisibleBy(n, base);
}

/**
 * Get the units digit (last digit) of a number
 */
export function getUnitsDigit(n: number): number {
	return n % 10;
}

/**
 * Get the tens digit of a number
 */
export function getTensDigit(n: number): number {
	return Math.floor((n % 100) / 10);
}

/**
 * Check if a number is a perfect square
 */
export function isPerfectSquare(n: number): boolean {
	const sqrt = Math.sqrt(n);
	return sqrt === Math.floor(sqrt);
}

/**
 * Calculate the sum of all digits in a number
 */
export function sumOfDigits(n: number): number {
	return Math.abs(n)
		.toString()
		.split('')
		.reduce((sum, digit) => sum + parseInt(digit, 10), 0);
}

/**
 * Master function to check any property based on question type
 */
export function checkProperty(n: number, questionType: QuestionType, param?: number): boolean {
	switch (questionType) {
		case 'is_even':
			return isEven(n);
		case 'is_odd':
			return isOdd(n);
		case 'is_prime':
			return isPrime(n);
		case 'is_multiple_of':
			if (param === undefined) throw new Error('is_multiple_of requires param');
			return isMultipleOf(n, param);
		case 'is_divisible_by':
			if (param === undefined) throw new Error('is_divisible_by requires param');
			return isDivisibleBy(n, param);
		case 'greater_than':
			if (param === undefined) throw new Error('greater_than requires param');
			return n > param;
		case 'less_than':
			if (param === undefined) throw new Error('less_than requires param');
			return n < param;
		case 'units_digit':
			if (param === undefined) throw new Error('units_digit requires param');
			return getUnitsDigit(n) === param;
		case 'tens_digit':
			if (param === undefined) throw new Error('tens_digit requires param');
			return getTensDigit(n) === param;
		case 'is_perfect_square':
			return isPerfectSquare(n);
		case 'sum_digits':
			if (param === undefined) throw new Error('sum_digits requires param');
			return sumOfDigits(n) === param;
	}
}
