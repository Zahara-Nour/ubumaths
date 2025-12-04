/**
 * Spreadsheet Logic Functions
 *
 * This module provides logical functions for the spreadsheet calculator.
 * All functions follow spreadsheet conventions and handle errors appropriately.
 *
 * @module spreadsheet/functions/logic
 */

import type { ComputedValue, ErrorCode } from '../types';
import type { SpreadsheetFunction, FunctionArgs } from './math';

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
 * Create a boolean value
 */
function makeBoolean(value: boolean): ComputedValue {
	return { type: 'boolean', value };
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
 * Convert a value to a boolean
 * - Numbers: 0 is false, non-zero is true
 * - Booleans: as-is
 * - Strings: non-empty is true (like Excel)
 * - Empty: false
 */
function toBoolean(value: ComputedValue): boolean | null {
	switch (value.type) {
		case 'boolean':
			return value.value;
		case 'number':
			return value.value !== 0;
		case 'string':
			return value.value.length > 0;
		case 'empty':
			return false;
		case 'error':
			return null;
	}
}

/**
 * Check if a value is truthy (for conditional logic)
 */
function isTruthy(value: ComputedValue): boolean {
	const bool = toBoolean(value);
	return bool === true;
}

// =============================================================================
// Conditional Functions
// =============================================================================

/**
 * IF - Conditional logic
 * IF(condition, value_if_true, value_if_false)
 */
function IF(args: FunctionArgs): ComputedValue {
	if (args.length < 2 || args.length > 3) {
		return makeError('#VALUE!', 'SI attend 2 ou 3 arguments');
	}

	const [condition, trueValue, falseValue] = args;

	// Propagate errors from condition
	if (isError(condition)) {
		return condition;
	}

	// Evaluate condition
	const conditionResult = toBoolean(condition);
	if (conditionResult === null) {
		return makeError('#VALUE!', 'SI : la condition doit etre evaluable en booleen');
	}

	if (conditionResult) {
		return trueValue;
	} else {
		// If falseValue is not provided, return FALSE
		return falseValue ?? makeBoolean(false);
	}
}

/**
 * AND - Logical AND
 * AND(value1, [value2], ...) - Returns TRUE if all arguments are true
 */
function AND(args: FunctionArgs): ComputedValue {
	if (args.length === 0) {
		return makeError('#VALUE!', 'ET necessite au moins 1 argument');
	}

	for (const arg of args) {
		// Propagate errors
		if (isError(arg)) {
			return arg;
		}

		// Check if any value is false
		if (!isTruthy(arg)) {
			return makeBoolean(false);
		}
	}

	return makeBoolean(true);
}

/**
 * OR - Logical OR
 * OR(value1, [value2], ...) - Returns TRUE if any argument is true
 */
function OR(args: FunctionArgs): ComputedValue {
	if (args.length === 0) {
		return makeError('#VALUE!', 'OU necessite au moins 1 argument');
	}

	for (const arg of args) {
		// Propagate errors
		if (isError(arg)) {
			return arg;
		}

		// Check if any value is true
		if (isTruthy(arg)) {
			return makeBoolean(true);
		}
	}

	return makeBoolean(false);
}

/**
 * NOT - Logical NOT
 * NOT(value) - Returns the inverse of a boolean value
 */
function NOT(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'NON attend exactement 1 argument');
	}

	const [value] = args;

	// Propagate errors
	if (isError(value)) {
		return value;
	}

	return makeBoolean(!isTruthy(value));
}

/**
 * XOR - Logical exclusive OR
 * XOR(value1, [value2], ...) - Returns TRUE if an odd number of arguments are true
 */
function XOR(args: FunctionArgs): ComputedValue {
	if (args.length === 0) {
		return makeError('#VALUE!', 'XOR necessite au moins 1 argument');
	}

	let trueCount = 0;

	for (const arg of args) {
		// Propagate errors
		if (isError(arg)) {
			return arg;
		}

		if (isTruthy(arg)) {
			trueCount++;
		}
	}

	return makeBoolean(trueCount % 2 === 1);
}

// =============================================================================
// Error Handling Functions
// =============================================================================

/**
 * IFERROR - Return alternative value if error
 * IFERROR(value, value_if_error)
 */
function IFERROR(args: FunctionArgs): ComputedValue {
	if (args.length !== 2) {
		return makeError('#VALUE!', 'SIERREUR attend exactement 2 arguments');
	}

	const [value, valueIfError] = args;

	if (isError(value)) {
		return valueIfError;
	}

	return value;
}

/**
 * ISERROR - Check if value is an error
 * ISERROR(value)
 */
function ISERROR(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'ESTERREUR attend exactement 1 argument');
	}

	return makeBoolean(isError(args[0]));
}

// =============================================================================
// Type Check Functions
// =============================================================================

/**
 * ISBLANK - Check if cell is empty
 * ISBLANK(value)
 */
function ISBLANK(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'ESTVIDE attend exactement 1 argument');
	}

	const [value] = args;

	// Propagate errors
	if (isError(value)) {
		return value;
	}

	return makeBoolean(isEmpty(value));
}

/**
 * ISNUMBER - Check if value is a number
 * ISNUMBER(value)
 */
function ISNUMBER(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'ESTNUM attend exactement 1 argument');
	}

	const [value] = args;

	// Propagate errors
	if (isError(value)) {
		return value;
	}

	return makeBoolean(value.type === 'number');
}

/**
 * ISTEXT - Check if value is text
 * ISTEXT(value)
 */
function ISTEXT(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'ESTTEXTE attend exactement 1 argument');
	}

	const [value] = args;

	// Propagate errors
	if (isError(value)) {
		return value;
	}

	return makeBoolean(value.type === 'string');
}

/**
 * ISLOGICAL - Check if value is a boolean
 * ISLOGICAL(value)
 */
function ISLOGICAL(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'ISLOGICAL attend exactement 1 argument');
	}

	const [value] = args;

	// Propagate errors
	if (isError(value)) {
		return value;
	}

	return makeBoolean(value.type === 'boolean');
}

// =============================================================================
// Boolean Constants
// =============================================================================

/**
 * TRUE - Return TRUE constant
 * TRUE()
 */
function TRUE(args: FunctionArgs): ComputedValue {
	if (args.length > 0) {
		return makeError('#VALUE!', "VRAI n'attend aucun argument");
	}
	return makeBoolean(true);
}

/**
 * FALSE - Return FALSE constant
 * FALSE()
 */
function FALSE(args: FunctionArgs): ComputedValue {
	if (args.length > 0) {
		return makeError('#VALUE!', "FAUX n'attend aucun argument");
	}
	return makeBoolean(false);
}

// =============================================================================
// Export
// =============================================================================

/**
 * All logic functions mapped by canonical name
 */
export const logicFunctions: Record<string, SpreadsheetFunction> = {
	// Conditional
	IF,
	AND,
	OR,
	NOT,
	XOR,

	// Error handling
	IFERROR,
	ISERROR,

	// Type checks
	ISBLANK,
	ISNUMBER,
	ISTEXT,
	ISLOGICAL,

	// Constants
	TRUE,
	FALSE
};
