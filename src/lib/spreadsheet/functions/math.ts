/**
 * Spreadsheet Math Functions
 *
 * This module provides mathematical functions for the spreadsheet calculator.
 * All functions follow spreadsheet conventions and handle errors appropriately.
 *
 * @module spreadsheet/functions/math
 */

import type { ComputedValue, ErrorCode } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Arguments passed to a spreadsheet function
 * Can include arrays (from range expansion)
 */
export type FunctionArgs = ComputedValue[];

/**
 * A spreadsheet function that takes arguments and returns a computed value
 */
export type SpreadsheetFunction = (args: FunctionArgs) => ComputedValue;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an error value
 */
function makeError(code: ErrorCode, message: string): ComputedValue {
	return { type: 'error', code, message };
}

/**
 * Create a number value
 */
function makeNumber(value: number): ComputedValue {
	// Check for invalid numeric results
	if (!isFinite(value)) {
		return makeError('#NUM!', 'Resultat numerique invalide');
	}
	return { type: 'number', value };
}

/**
 * Check if a value is a number
 */
function isNumber(value: ComputedValue): value is { type: 'number'; value: number } {
	return value.type === 'number';
}

/**
 * Check if a value is an error
 */
function isError(
	value: ComputedValue
): value is { type: 'error'; code: ErrorCode; message: string } {
	return value.type === 'error';
}

/**
 * Check if a value is empty
 */
function isEmpty(value: ComputedValue): value is { type: 'empty' } {
	return value.type === 'empty';
}

/**
 * Convert a value to a number, returning null if not convertible
 */
function toNumber(value: ComputedValue): number | null {
	if (isNumber(value)) return value.value;
	if (value.type === 'boolean') return value.value ? 1 : 0;
	if (value.type === 'string') {
		const parsed = parseFloat(value.value);
		return isNaN(parsed) ? null : parsed;
	}
	if (isEmpty(value)) return null; // Empty cells are skipped in aggregations
	return null;
}

/**
 * Flatten arguments, extracting numbers and propagating errors
 * Returns an array of numbers, or an error if any argument is an error
 */
function flattenNumericArgs(args: FunctionArgs): number[] | ComputedValue {
	const numbers: number[] = [];

	for (const arg of args) {
		// Propagate errors
		if (isError(arg)) {
			return arg;
		}

		// Skip empty values
		if (isEmpty(arg)) {
			continue;
		}

		// Convert to number
		const num = toNumber(arg);
		if (num !== null) {
			numbers.push(num);
		}
	}

	return numbers;
}

/**
 * Require exactly N numeric arguments
 */
function requireNumericArgs(
	args: FunctionArgs,
	count: number,
	funcName: string
): number[] | ComputedValue {
	// Check for errors first
	for (const arg of args) {
		if (isError(arg)) {
			return arg;
		}
	}

	if (args.length !== count) {
		return makeError('#VALUE!', `${funcName} attend ${count} argument(s), recu ${args.length}`);
	}

	const numbers: number[] = [];
	for (let i = 0; i < count; i++) {
		const arg = args[i];
		const num = toNumber(arg);
		if (num === null) {
			return makeError('#VALUE!', `${funcName} : argument ${i + 1} doit etre un nombre`);
		}
		numbers.push(num);
	}

	return numbers;
}

/**
 * Require at least N numeric arguments
 */
function requireAtLeastNumericArgs(
	args: FunctionArgs,
	minCount: number,
	funcName: string
): number[] | ComputedValue {
	// Check for errors first
	for (const arg of args) {
		if (isError(arg)) {
			return arg;
		}
	}

	const flattened = flattenNumericArgs(args);
	if (!Array.isArray(flattened)) {
		return flattened;
	}

	if (flattened.length < minCount) {
		return makeError('#VALUE!', `${funcName} necessite au moins ${minCount} nombre(s)`);
	}

	return flattened;
}

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * SUM - Sum of all numeric values
 * SUM(value1, [value2], ...) or SUM(range)
 */
function SUM(args: FunctionArgs): ComputedValue {
	const numbers = flattenNumericArgs(args);
	if (!Array.isArray(numbers)) return numbers;

	if (numbers.length === 0) {
		return makeNumber(0);
	}

	const sum = numbers.reduce((acc, n) => acc + n, 0);
	return makeNumber(sum);
}

/**
 * AVERAGE - Arithmetic mean of numeric values
 * AVERAGE(value1, [value2], ...) or AVERAGE(range)
 */
function AVERAGE(args: FunctionArgs): ComputedValue {
	const numbers = requireAtLeastNumericArgs(args, 1, 'AVERAGE');
	if (!Array.isArray(numbers)) return numbers;

	const sum = numbers.reduce((acc, n) => acc + n, 0);
	return makeNumber(sum / numbers.length);
}

/**
 * MIN - Minimum value
 * MIN(value1, [value2], ...) or MIN(range)
 */
function MIN(args: FunctionArgs): ComputedValue {
	const numbers = flattenNumericArgs(args);
	if (!Array.isArray(numbers)) return numbers;

	if (numbers.length === 0) {
		return makeNumber(0); // Excel behavior
	}

	return makeNumber(Math.min(...numbers));
}

/**
 * MAX - Maximum value
 * MAX(value1, [value2], ...) or MAX(range)
 */
function MAX(args: FunctionArgs): ComputedValue {
	const numbers = flattenNumericArgs(args);
	if (!Array.isArray(numbers)) return numbers;

	if (numbers.length === 0) {
		return makeNumber(0); // Excel behavior
	}

	return makeNumber(Math.max(...numbers));
}

/**
 * COUNT - Count of numeric values
 * COUNT(value1, [value2], ...) or COUNT(range)
 */
function COUNT(args: FunctionArgs): ComputedValue {
	const numbers = flattenNumericArgs(args);
	if (!Array.isArray(numbers)) return numbers;

	return makeNumber(numbers.length);
}

/**
 * COUNTA - Count of non-empty values
 * COUNTA(value1, [value2], ...) or COUNTA(range)
 */
function COUNTA(args: FunctionArgs): ComputedValue {
	let count = 0;

	for (const arg of args) {
		if (isError(arg)) {
			return arg;
		}
		if (!isEmpty(arg)) {
			count++;
		}
	}

	return makeNumber(count);
}

/**
 * PRODUCT - Product of all numeric values
 * PRODUCT(value1, [value2], ...) or PRODUCT(range)
 */
function PRODUCT(args: FunctionArgs): ComputedValue {
	const numbers = flattenNumericArgs(args);
	if (!Array.isArray(numbers)) return numbers;

	if (numbers.length === 0) {
		return makeNumber(0);
	}

	const product = numbers.reduce((acc, n) => acc * n, 1);
	return makeNumber(product);
}

// =============================================================================
// Rounding Functions
// =============================================================================

/**
 * ABS - Absolute value
 * ABS(number)
 */
function ABS(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'ABS');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.abs(nums[0]));
}

/**
 * ROUND - Round to specified decimal places
 * ROUND(number, [decimals])
 */
function ROUND(args: FunctionArgs): ComputedValue {
	// Check for errors first
	for (const arg of args) {
		if (isError(arg)) return arg;
	}

	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'ROUND attend 1 ou 2 arguments');
	}

	const num = toNumber(args[0]);
	if (num === null) {
		return makeError('#VALUE!', 'ROUND : le premier argument doit etre un nombre');
	}

	const decimals = args.length === 2 ? toNumber(args[1]) : 0;
	if (decimals === null) {
		return makeError('#VALUE!', 'ROUND : le deuxieme argument doit etre un nombre');
	}

	const factor = Math.pow(10, decimals);
	return makeNumber(Math.round(num * factor) / factor);
}

/**
 * FLOOR - Round down to nearest integer
 * FLOOR(number)
 */
function FLOOR(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'FLOOR');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.floor(nums[0]));
}

/**
 * CEILING - Round up to nearest integer
 * CEILING(number)
 */
function CEILING(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'CEILING');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.ceil(nums[0]));
}

/**
 * INT - Integer part (truncate toward negative infinity)
 * INT(number)
 */
function INT(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'INT');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.floor(nums[0]));
}

/**
 * TRUNC - Truncate toward zero
 * TRUNC(number, [decimals])
 */
function TRUNC(args: FunctionArgs): ComputedValue {
	// Check for errors first
	for (const arg of args) {
		if (isError(arg)) return arg;
	}

	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'TRUNC attend 1 ou 2 arguments');
	}

	const num = toNumber(args[0]);
	if (num === null) {
		return makeError('#VALUE!', 'TRUNC : le premier argument doit etre un nombre');
	}

	const decimals = args.length === 2 ? toNumber(args[1]) : 0;
	if (decimals === null) {
		return makeError('#VALUE!', 'TRUNC : le deuxieme argument doit etre un nombre');
	}

	const factor = Math.pow(10, decimals);
	return makeNumber(Math.trunc(num * factor) / factor);
}

/**
 * SIGN - Sign of a number (-1, 0, or 1)
 * SIGN(number)
 */
function SIGN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'SIGN');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.sign(nums[0]));
}

// =============================================================================
// Arithmetic Functions
// =============================================================================

/**
 * MOD - Remainder of division
 * MOD(number, divisor)
 */
function MOD(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 2, 'MOD');
	if (!Array.isArray(nums)) return nums;

	const [n, divisor] = nums;

	if (divisor === 0) {
		return makeError('#DIV/0!', 'Division par zero dans MOD');
	}

	// Match Excel behavior: result has same sign as divisor
	const result = n - divisor * Math.floor(n / divisor);
	return makeNumber(result);
}

/**
 * POWER - Raise to power
 * POWER(base, exponent)
 */
function POWER(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 2, 'POWER');
	if (!Array.isArray(nums)) return nums;

	const [base, exp] = nums;

	// Check for domain errors
	if (base === 0 && exp < 0) {
		return makeError('#DIV/0!', 'POWER : division par zero (0 ^ negatif)');
	}

	if (base < 0 && !Number.isInteger(exp)) {
		return makeError('#NUM!', 'POWER : base negative avec exposant non entier');
	}

	return makeNumber(Math.pow(base, exp));
}

/**
 * SQRT - Square root
 * SQRT(number)
 */
function SQRT(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'SQRT');
	if (!Array.isArray(nums)) return nums;

	if (nums[0] < 0) {
		return makeError('#NUM!', "SQRT : impossible de calculer la racine carree d'un nombre negatif");
	}

	return makeNumber(Math.sqrt(nums[0]));
}

// =============================================================================
// Logarithmic and Exponential Functions
// =============================================================================

/**
 * LOG - Logarithm with specified base
 * LOG(number, [base])
 */
function LOG(args: FunctionArgs): ComputedValue {
	// Check for errors first
	for (const arg of args) {
		if (isError(arg)) return arg;
	}

	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'LOG attend 1 ou 2 arguments');
	}

	const num = toNumber(args[0]);
	if (num === null) {
		return makeError('#VALUE!', 'LOG : le premier argument doit etre un nombre');
	}

	const base = args.length === 2 ? toNumber(args[1]) : 10;
	if (base === null) {
		return makeError('#VALUE!', 'LOG : la base doit etre un nombre');
	}

	if (num <= 0) {
		return makeError('#NUM!', 'LOG : le nombre doit etre positif');
	}

	if (base <= 0 || base === 1) {
		return makeError('#NUM!', 'LOG : la base doit etre positive et differente de 1');
	}

	return makeNumber(Math.log(num) / Math.log(base));
}

/**
 * LOG10 - Base-10 logarithm
 * LOG10(number)
 */
function LOG10(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'LOG10');
	if (!Array.isArray(nums)) return nums;

	if (nums[0] <= 0) {
		return makeError('#NUM!', 'LOG10 : le nombre doit etre positif');
	}

	return makeNumber(Math.log10(nums[0]));
}

/**
 * LN - Natural logarithm
 * LN(number)
 */
function LN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'LN');
	if (!Array.isArray(nums)) return nums;

	if (nums[0] <= 0) {
		return makeError('#NUM!', 'LN : le nombre doit etre positif');
	}

	return makeNumber(Math.log(nums[0]));
}

/**
 * EXP - Exponential (e^x)
 * EXP(number)
 */
function EXP(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'EXP');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.exp(nums[0]));
}

// =============================================================================
// Trigonometric Functions
// =============================================================================

/**
 * SIN - Sine (radians)
 * SIN(angle)
 */
function SIN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'SIN');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.sin(nums[0]));
}

/**
 * COS - Cosine (radians)
 * COS(angle)
 */
function COS(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'COS');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.cos(nums[0]));
}

/**
 * TAN - Tangent (radians)
 * TAN(angle)
 */
function TAN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'TAN');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.tan(nums[0]));
}

/**
 * ASIN - Arc sine (returns radians)
 * ASIN(number)
 */
function ASIN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'ASIN');
	if (!Array.isArray(nums)) return nums;

	if (nums[0] < -1 || nums[0] > 1) {
		return makeError('#NUM!', 'ASIN : le nombre doit etre entre -1 et 1');
	}

	return makeNumber(Math.asin(nums[0]));
}

/**
 * ACOS - Arc cosine (returns radians)
 * ACOS(number)
 */
function ACOS(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'ACOS');
	if (!Array.isArray(nums)) return nums;

	if (nums[0] < -1 || nums[0] > 1) {
		return makeError('#NUM!', 'ACOS : le nombre doit etre entre -1 et 1');
	}

	return makeNumber(Math.acos(nums[0]));
}

/**
 * ATAN - Arc tangent (returns radians)
 * ATAN(number)
 */
function ATAN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 1, 'ATAN');
	if (!Array.isArray(nums)) return nums;

	return makeNumber(Math.atan(nums[0]));
}

// =============================================================================
// Constants
// =============================================================================

/**
 * PI - Return the constant Pi
 * PI()
 */
function PI(args: FunctionArgs): ComputedValue {
	if (args.length > 0) {
		return makeError('#VALUE!', "PI n'attend aucun argument");
	}
	return makeNumber(Math.PI);
}

// =============================================================================
// Random Functions
// =============================================================================

/**
 * RAND - Random number between 0 and 1
 * RAND()
 */
function RAND(args: FunctionArgs): ComputedValue {
	if (args.length > 0) {
		return makeError('#VALUE!', "RAND n'attend aucun argument");
	}
	return makeNumber(Math.random());
}

/**
 * RANDBETWEEN - Random integer between two values
 * RANDBETWEEN(min, max)
 */
function RANDBETWEEN(args: FunctionArgs): ComputedValue {
	const nums = requireNumericArgs(args, 2, 'RANDBETWEEN');
	if (!Array.isArray(nums)) return nums;

	let [min, max] = nums;
	min = Math.ceil(min);
	max = Math.floor(max);

	if (min > max) {
		return makeError('#VALUE!', 'RANDBETWEEN : min doit etre inferieur ou egal a max');
	}

	return makeNumber(Math.floor(Math.random() * (max - min + 1)) + min);
}

// =============================================================================
// Export
// =============================================================================

/**
 * All math functions mapped by canonical name
 */
export const mathFunctions: Record<string, SpreadsheetFunction> = {
	// Aggregation
	SUM,
	AVERAGE,
	MIN,
	MAX,
	COUNT,
	COUNTA,
	PRODUCT,

	// Rounding
	ABS,
	ROUND,
	FLOOR,
	CEILING,
	INT,
	TRUNC,
	SIGN,

	// Arithmetic
	MOD,
	POWER,
	SQRT,

	// Logarithmic and Exponential
	LOG,
	LOG10,
	LN,
	EXP,

	// Trigonometric
	SIN,
	COS,
	TAN,
	ASIN,
	ACOS,
	ATAN,

	// Constants
	PI,

	// Random
	RAND,
	RANDBETWEEN
};
