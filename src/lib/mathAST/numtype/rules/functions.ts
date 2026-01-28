/**
 * Type Inference Rules for Mathematical Functions
 *
 * Handles type inference for:
 * - Trigonometric: sin, cos, tan, etc.
 * - Exponential/Logarithmic: exp, ln, log
 * - Rounding: floor, ceil, round, trunc
 * - Other: abs, sqrt, sign, factorial
 */

import type { MathType, NumericType, SignInfo } from '../types';
import { join, isSubtype } from '../algebra';
import { COMPLEX_TYPE, TRANSCENDENTAL_TYPE, INTEGER_TYPE, UNKNOWN_TYPE } from '../types';
import { inferSqrtType } from './power';

// =============================================================================
// Function Type Categories
// =============================================================================

/**
 * Functions that always produce transcendental output (when input is algebraic).
 *
 * These functions produce transcendental values for almost all algebraic inputs.
 * Exceptions exist (e.g., sin(0) = 0, ln(1) = 0) but we use the general rule.
 */
const TRANSCENDENTAL_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'cot',
	'sec',
	'csc',
	'asin',
	'acos',
	'atan',
	'acot',
	'asec',
	'acsc',
	'sinh',
	'cosh',
	'tanh',
	'coth',
	'sech',
	'csch',
	'asinh',
	'acosh',
	'atanh',
	'acoth',
	'asech',
	'acsch',
	'exp',
	'ln',
	'log'
]);

/**
 * Functions that produce integer output.
 */
const INTEGER_OUTPUT_FUNCTIONS = new Set(['floor', 'ceil', 'round', 'trunc', 'sign', 'factorial']);

/**
 * Functions that preserve the general type (output type depends on input).
 */
const TYPE_PRESERVING_FUNCTIONS = new Set(['abs']);

// =============================================================================
// Main Function Type Inference
// =============================================================================

/**
 * Infers the type of a function application.
 *
 * @param name - Function name
 * @param argTypes - Types of the function arguments
 * @param argValues - Optional known numeric values of arguments
 * @returns Inferred type of the function result
 */
export function inferFunctionType(
	name: string,
	argTypes: readonly MathType[],
	argValues?: readonly (number | undefined)[]
): MathType {
	const lowerName = name.toLowerCase();

	// Special case: sqrt is handled by power rules
	if (lowerName === 'sqrt') {
		if (argTypes.length !== 1) return UNKNOWN_TYPE;
		return inferSqrtType(argTypes[0], argValues?.[0]);
	}

	// Transcendental functions
	if (TRANSCENDENTAL_FUNCTIONS.has(lowerName)) {
		return inferTranscendentalFunctionType(lowerName, argTypes, argValues);
	}

	// Integer output functions
	if (INTEGER_OUTPUT_FUNCTIONS.has(lowerName)) {
		return inferIntegerOutputFunctionType(lowerName, argTypes, argValues);
	}

	// Type preserving functions
	if (TYPE_PRESERVING_FUNCTIONS.has(lowerName)) {
		return inferTypePreservingFunctionType(lowerName, argTypes, argValues);
	}

	// Multi-argument functions
	if (lowerName === 'min' || lowerName === 'max') {
		return inferMinMaxType(argTypes);
	}

	if (lowerName === 'gcd' || lowerName === 'lcm') {
		return inferGcdLcmType(argTypes);
	}

	if (lowerName === 'mod' || lowerName === 'rem') {
		return inferModType(argTypes);
	}

	// Unknown function - return the join of all argument types
	if (argTypes.length === 0) return UNKNOWN_TYPE;
	let result: NumericType = argTypes[0].base;
	for (let i = 1; i < argTypes.length; i++) {
		result = join(result, argTypes[i].base);
	}
	return { base: result };
}

// =============================================================================
// Transcendental Function Rules
// =============================================================================

/**
 * Infers type for transcendental functions (sin, cos, exp, ln, etc.).
 *
 * General rule: transcendental functions produce transcendental output
 * for algebraic input (Lindemann-Weierstrass theorem).
 *
 * Exceptions:
 * - sin(0) = 0, cos(0) = 1 (integer)
 * - ln(1) = 0 (integer)
 * - exp(0) = 1 (integer)
 */
function inferTranscendentalFunctionType(
	name: string,
	argTypes: readonly MathType[],
	argValues?: readonly (number | undefined)[]
): MathType {
	if (argTypes.length === 0) return UNKNOWN_TYPE;

	const argType = argTypes[0];
	const argValue = argValues?.[0];

	// Check for special known values
	if (argValue !== undefined) {
		const specialResult = checkSpecialTranscendentalValues(name, argValue);
		if (specialResult !== null) {
			return specialResult;
		}
	}

	// Complex input yields complex output
	if (argType.base === 'complex') {
		return COMPLEX_TYPE;
	}

	// Domain checks for specific functions
	const domainCheck = checkFunctionDomain(name, argType, argValue);
	if (domainCheck !== null) {
		return domainCheck;
	}

	// General rule: transcendental function of real input is transcendental
	if (isSubtype(argType.base, 'real')) {
		return inferTranscendentalOutputWithSign(name, argType, argValue);
	}

	return TRANSCENDENTAL_TYPE;
}

/**
 * Checks for special values that have known exact results.
 */
function checkSpecialTranscendentalValues(name: string, value: number): MathType | null {
	// sin special values
	if (name === 'sin') {
		if (value === 0) return { base: 'integer', sign: 'zero', finite: true };
	}

	// cos special values
	if (name === 'cos') {
		if (value === 0) return { base: 'integer', sign: 'positive', finite: true };
	}

	// tan special values
	if (name === 'tan') {
		if (value === 0) return { base: 'integer', sign: 'zero', finite: true };
	}

	// exp special values
	if (name === 'exp') {
		if (value === 0) return { base: 'integer', sign: 'positive', finite: true };
	}

	// ln special values
	if (name === 'ln' || name === 'log') {
		if (value === 1) return { base: 'integer', sign: 'zero', finite: true };
	}

	return null;
}

/**
 * Checks function domain and returns complex if input is out of domain.
 */
function checkFunctionDomain(name: string, argType: MathType, argValue?: number): MathType | null {
	// asin, acos: domain [-1, 1]
	if (name === 'asin' || name === 'acos') {
		if (argValue !== undefined && (argValue < -1 || argValue > 1)) {
			return COMPLEX_TYPE;
		}
	}

	// acosh: domain [1, ∞)
	if (name === 'acosh') {
		if (argValue !== undefined && argValue < 1) {
			return COMPLEX_TYPE;
		}
	}

	// sqrt, ln: negative input yields complex
	if (name === 'ln' || name === 'log') {
		if (argType.sign === 'negative' || (argValue !== undefined && argValue < 0)) {
			return COMPLEX_TYPE;
		}
		if (argType.sign === 'zero' || argValue === 0) {
			// ln(0) = -∞
			return { base: 'real', finite: false };
		}
	}

	return null;
}

/**
 * Infers sign for transcendental function output.
 */
function inferTranscendentalOutputWithSign(
	name: string,
	_argType: MathType,
	_argValue?: number
): MathType {
	// exp is always positive
	if (name === 'exp') {
		return { base: 'transcendental', sign: 'positive', finite: true };
	}

	// cosh is always >= 1
	if (name === 'cosh') {
		return { base: 'transcendental', sign: 'positive', finite: true };
	}

	// For most transcendental functions, sign depends on input
	return { base: 'transcendental', finite: true };
}

// =============================================================================
// Integer Output Function Rules
// =============================================================================

/**
 * Infers type for functions that produce integer output (floor, ceil, etc.).
 */
function inferIntegerOutputFunctionType(
	name: string,
	argTypes: readonly MathType[],
	argValues?: readonly (number | undefined)[]
): MathType {
	if (argTypes.length === 0) return UNKNOWN_TYPE;

	const argType = argTypes[0];
	const argValue = argValues?.[0];

	// floor, ceil, round, trunc: real -> integer
	if (name === 'floor' || name === 'ceil' || name === 'round' || name === 'trunc') {
		// Complex input is not valid for these functions
		if (argType.base === 'complex') {
			return UNKNOWN_TYPE;
		}

		// Determine sign
		let sign: SignInfo | undefined;
		if (argValue !== undefined) {
			const result = computeRoundingResult(name, argValue);
			if (result > 0) sign = 'positive';
			else if (result < 0) sign = 'negative';
			else sign = 'zero';
		} else if (argType.sign !== undefined) {
			// Preserve sign knowledge where possible
			if (argType.sign === 'positive' && name !== 'floor') {
				// ceil, round of positive could be positive or zero
			} else if (argType.sign === 'negative' && name !== 'ceil') {
				// floor, round of negative could be negative or zero
			} else if (argType.sign === 'zero') {
				sign = 'zero';
			}
		}

		return { base: 'integer', ...(sign !== undefined && { sign }), finite: argType.finite };
	}

	// sign: returns -1, 0, or 1
	if (name === 'sign') {
		let sign: SignInfo | undefined;
		if (argType.sign === 'positive') sign = 'positive';
		else if (argType.sign === 'negative') sign = 'negative';
		else if (argType.sign === 'zero') sign = 'zero';
		else if (argType.sign === 'nonzero') sign = 'nonzero';

		return { base: 'integer', ...(sign !== undefined && { sign }), finite: true };
	}

	// factorial: requires non-negative integer input
	if (name === 'factorial') {
		if (argType.base !== 'integer') {
			return UNKNOWN_TYPE; // Factorial of non-integer is not standard
		}
		if (argType.sign === 'negative') {
			return UNKNOWN_TYPE; // Factorial of negative is undefined
		}
		return { base: 'integer', sign: 'positive', finite: true };
	}

	return INTEGER_TYPE;
}

/**
 * Computes the result of a rounding function for a known value.
 */
function computeRoundingResult(name: string, value: number): number {
	switch (name) {
		case 'floor':
			return Math.floor(value);
		case 'ceil':
			return Math.ceil(value);
		case 'round':
			return Math.round(value);
		case 'trunc':
			return Math.trunc(value);
		default:
			return value;
	}
}

// =============================================================================
// Type Preserving Function Rules
// =============================================================================

/**
 * Infers type for functions that preserve the input type (abs).
 */
function inferTypePreservingFunctionType(
	name: string,
	argTypes: readonly MathType[],
	_argValues?: readonly (number | undefined)[]
): MathType {
	if (argTypes.length === 0) return UNKNOWN_TYPE;

	const argType = argTypes[0];

	// abs: preserves type but output is always non-negative
	if (name === 'abs') {
		let sign: SignInfo | undefined;
		if (argType.sign === 'zero') {
			sign = 'zero';
		} else if (
			argType.sign === 'nonzero' ||
			argType.sign === 'positive' ||
			argType.sign === 'negative'
		) {
			sign = 'positive'; // abs of nonzero is positive
		}

		// For complex, abs returns a real (the modulus)
		if (argType.base === 'complex') {
			return { base: 'real', sign: 'positive', finite: argType.finite };
		}

		return { base: argType.base, ...(sign !== undefined && { sign }), finite: argType.finite };
	}

	return argType;
}

// =============================================================================
// Multi-argument Function Rules
// =============================================================================

/**
 * Infers type for min/max functions.
 */
function inferMinMaxType(argTypes: readonly MathType[]): MathType {
	if (argTypes.length === 0) return UNKNOWN_TYPE;

	// Result type is the join of all argument types
	let resultBase: NumericType = argTypes[0].base;
	for (let i = 1; i < argTypes.length; i++) {
		resultBase = join(resultBase, argTypes[i].base);
	}

	// Sign: min of all positive is positive, max of all negative is negative, etc.
	// This is complex to track in general, so we leave it undefined unless obvious
	let sign: SignInfo | undefined;
	const allPositive = argTypes.every((t) => t.sign === 'positive');
	const allNegative = argTypes.every((t) => t.sign === 'negative');
	const allZero = argTypes.every((t) => t.sign === 'zero');

	if (allPositive) sign = 'positive';
	else if (allNegative) sign = 'negative';
	else if (allZero) sign = 'zero';

	const allFinite = argTypes.every((t) => t.finite === true);

	return {
		base: resultBase,
		...(sign !== undefined && { sign }),
		...(allFinite && { finite: true })
	};
}

/**
 * Infers type for gcd/lcm functions.
 */
function inferGcdLcmType(argTypes: readonly MathType[]): MathType {
	// gcd and lcm are defined for integers
	// If all inputs are integers, output is integer
	const allInteger = argTypes.every((t) => t.base === 'integer');

	if (allInteger) {
		return { base: 'integer', sign: 'positive', finite: true };
	}

	// For non-integer inputs, gcd/lcm is not standard
	return UNKNOWN_TYPE;
}

/**
 * Infers type for mod/rem functions.
 */
function inferModType(argTypes: readonly MathType[]): MathType {
	if (argTypes.length < 2) return UNKNOWN_TYPE;

	// mod of integers is integer
	if (argTypes[0].base === 'integer' && argTypes[1].base === 'integer') {
		return { base: 'integer', finite: true };
	}

	// mod of reals is real
	return { base: join(argTypes[0].base, argTypes[1].base), finite: true };
}
