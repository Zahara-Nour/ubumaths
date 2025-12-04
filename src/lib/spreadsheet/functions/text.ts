/**
 * Spreadsheet Text Functions
 *
 * This module provides text manipulation functions for the spreadsheet calculator.
 * All functions follow spreadsheet conventions and handle errors appropriately.
 *
 * @module spreadsheet/functions/text
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
 * Create a string value
 */
function makeString(value: string): ComputedValue {
	return { type: 'string', value };
}

/**
 * Create a number value
 */
function makeNumber(value: number): ComputedValue {
	return { type: 'number', value };
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
function _isEmpty(value: ComputedValue): value is { type: 'empty' } {
	return value.type === 'empty';
}

/**
 * Convert any value to string
 */
function toString(value: ComputedValue): string | null {
	switch (value.type) {
		case 'string':
			return value.value;
		case 'number':
			return String(value.value);
		case 'boolean':
			return value.value ? 'TRUE' : 'FALSE';
		case 'empty':
			return '';
		case 'error':
			return null;
	}
}

/**
 * Convert a value to a number
 */
function toNumber(value: ComputedValue): number | null {
	if (value.type === 'number') return value.value;
	if (value.type === 'boolean') return value.value ? 1 : 0;
	if (value.type === 'string') {
		const parsed = parseInt(value.value, 10);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
}

/**
 * Require a string argument
 */
function requireString(
	arg: ComputedValue,
	funcName: string,
	argNum: number
): string | ComputedValue {
	if (isError(arg)) return arg;

	const str = toString(arg);
	if (str === null) {
		return makeError(
			'#VALUE!',
			`${funcName} : l'argument ${argNum} doit etre convertible en texte`
		);
	}
	return str;
}

/**
 * Require a number argument
 */
function requireNumber(
	arg: ComputedValue,
	funcName: string,
	argNum: number
): number | ComputedValue {
	if (isError(arg)) return arg;

	const num = toNumber(arg);
	if (num === null) {
		return makeError('#VALUE!', `${funcName} : l'argument ${argNum} doit etre un nombre`);
	}
	return num;
}

// =============================================================================
// Concatenation Functions
// =============================================================================

/**
 * CONCAT - Concatenate text values
 * CONCAT(text1, [text2], ...)
 */
function CONCAT(args: FunctionArgs): ComputedValue {
	const parts: string[] = [];

	for (const arg of args) {
		if (isError(arg)) {
			return arg;
		}

		const str = toString(arg);
		if (str !== null) {
			parts.push(str);
		}
	}

	return makeString(parts.join(''));
}

/**
 * CONCATENATE - Concatenate text values (alias for CONCAT)
 * CONCATENATE(text1, [text2], ...)
 */
function CONCATENATE(args: FunctionArgs): ComputedValue {
	return CONCAT(args);
}

// =============================================================================
// Extraction Functions
// =============================================================================

/**
 * LEFT - Extract left characters
 * LEFT(text, [num_chars])
 */
function LEFT(args: FunctionArgs): ComputedValue {
	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'GAUCHE attend 1 ou 2 arguments');
	}

	const textResult = requireString(args[0], 'GAUCHE', 1);
	if (typeof textResult !== 'string') return textResult;

	let numChars = 1; // Default
	if (args.length === 2) {
		const numResult = requireNumber(args[1], 'GAUCHE', 2);
		if (typeof numResult !== 'number') return numResult;
		numChars = numResult;
	}

	if (numChars < 0) {
		return makeError('#VALUE!', 'GAUCHE : le nombre de caracteres doit etre positif');
	}

	return makeString(textResult.substring(0, numChars));
}

/**
 * RIGHT - Extract right characters
 * RIGHT(text, [num_chars])
 */
function RIGHT(args: FunctionArgs): ComputedValue {
	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'DROITE attend 1 ou 2 arguments');
	}

	const textResult = requireString(args[0], 'DROITE', 1);
	if (typeof textResult !== 'string') return textResult;

	let numChars = 1; // Default
	if (args.length === 2) {
		const numResult = requireNumber(args[1], 'DROITE', 2);
		if (typeof numResult !== 'number') return numResult;
		numChars = numResult;
	}

	if (numChars < 0) {
		return makeError('#VALUE!', 'DROITE : le nombre de caracteres doit etre positif');
	}

	const start = Math.max(0, textResult.length - numChars);
	return makeString(textResult.substring(start));
}

/**
 * MID - Extract middle characters
 * MID(text, start_position, num_chars)
 */
function MID(args: FunctionArgs): ComputedValue {
	if (args.length !== 3) {
		return makeError('#VALUE!', 'STXT attend exactement 3 arguments');
	}

	const textResult = requireString(args[0], 'STXT', 1);
	if (typeof textResult !== 'string') return textResult;

	const startResult = requireNumber(args[1], 'STXT', 2);
	if (typeof startResult !== 'number') return startResult;

	const numCharsResult = requireNumber(args[2], 'STXT', 3);
	if (typeof numCharsResult !== 'number') return numCharsResult;

	if (startResult < 1) {
		return makeError('#VALUE!', 'STXT : la position de depart doit etre >= 1');
	}

	if (numCharsResult < 0) {
		return makeError('#VALUE!', 'STXT : le nombre de caracteres doit etre positif');
	}

	// Excel uses 1-indexed positions
	const startIndex = startResult - 1;
	return makeString(textResult.substring(startIndex, startIndex + numCharsResult));
}

// =============================================================================
// Length Function
// =============================================================================

/**
 * LEN - Get text length
 * LEN(text)
 */
function LEN(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'NBCAR attend exactement 1 argument');
	}

	const textResult = requireString(args[0], 'NBCAR', 1);
	if (typeof textResult !== 'string') return textResult;

	return makeNumber(textResult.length);
}

// =============================================================================
// Case Functions
// =============================================================================

/**
 * UPPER - Convert to uppercase
 * UPPER(text)
 */
function UPPER(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'MAJUSCULE attend exactement 1 argument');
	}

	const textResult = requireString(args[0], 'MAJUSCULE', 1);
	if (typeof textResult !== 'string') return textResult;

	return makeString(textResult.toUpperCase());
}

/**
 * LOWER - Convert to lowercase
 * LOWER(text)
 */
function LOWER(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'MINUSCULE attend exactement 1 argument');
	}

	const textResult = requireString(args[0], 'MINUSCULE', 1);
	if (typeof textResult !== 'string') return textResult;

	return makeString(textResult.toLowerCase());
}

/**
 * PROPER - Convert to title case
 * PROPER(text)
 */
function PROPER(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'NOMPROPRE attend exactement 1 argument');
	}

	const textResult = requireString(args[0], 'NOMPROPRE', 1);
	if (typeof textResult !== 'string') return textResult;

	// Title case: capitalize first letter of each word
	const result = textResult.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
	return makeString(result);
}

// =============================================================================
// Trimming Functions
// =============================================================================

/**
 * TRIM - Remove leading/trailing and excess spaces
 * TRIM(text)
 */
function TRIM(args: FunctionArgs): ComputedValue {
	if (args.length !== 1) {
		return makeError('#VALUE!', 'SUPPRESPACE attend exactement 1 argument');
	}

	const textResult = requireString(args[0], 'SUPPRESPACE', 1);
	if (typeof textResult !== 'string') return textResult;

	// Excel's TRIM removes leading, trailing, and reduces multiple spaces to single
	const result = textResult.trim().replace(/\s+/g, ' ');
	return makeString(result);
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * FIND - Find position of text (case-sensitive)
 * FIND(find_text, within_text, [start_num])
 */
function FIND(args: FunctionArgs): ComputedValue {
	if (args.length < 2 || args.length > 3) {
		return makeError('#VALUE!', 'TROUVE attend 2 ou 3 arguments');
	}

	const findTextResult = requireString(args[0], 'TROUVE', 1);
	if (typeof findTextResult !== 'string') return findTextResult;

	const withinTextResult = requireString(args[1], 'TROUVE', 2);
	if (typeof withinTextResult !== 'string') return withinTextResult;

	let startNum = 1; // Default
	if (args.length === 3) {
		const startResult = requireNumber(args[2], 'TROUVE', 3);
		if (typeof startResult !== 'number') return startResult;
		startNum = startResult;
	}

	if (startNum < 1) {
		return makeError('#VALUE!', 'TROUVE : la position de depart doit etre >= 1');
	}

	// Excel uses 1-indexed positions
	const startIndex = startNum - 1;
	const position = withinTextResult.indexOf(findTextResult, startIndex);

	if (position === -1) {
		return makeError('#VALUE!', 'TROUVE : texte non trouve');
	}

	return makeNumber(position + 1); // Return 1-indexed position
}

/**
 * SEARCH - Find position of text (case-insensitive)
 * SEARCH(find_text, within_text, [start_num])
 */
function SEARCH(args: FunctionArgs): ComputedValue {
	if (args.length < 2 || args.length > 3) {
		return makeError('#VALUE!', 'CHERCHE attend 2 ou 3 arguments');
	}

	const findTextResult = requireString(args[0], 'CHERCHE', 1);
	if (typeof findTextResult !== 'string') return findTextResult;

	const withinTextResult = requireString(args[1], 'CHERCHE', 2);
	if (typeof withinTextResult !== 'string') return withinTextResult;

	let startNum = 1; // Default
	if (args.length === 3) {
		const startResult = requireNumber(args[2], 'CHERCHE', 3);
		if (typeof startResult !== 'number') return startResult;
		startNum = startResult;
	}

	if (startNum < 1) {
		return makeError('#VALUE!', 'CHERCHE : la position de depart doit etre >= 1');
	}

	// Excel uses 1-indexed positions
	const startIndex = startNum - 1;
	const position = withinTextResult.toLowerCase().indexOf(findTextResult.toLowerCase(), startIndex);

	if (position === -1) {
		return makeError('#VALUE!', 'CHERCHE : texte non trouve');
	}

	return makeNumber(position + 1); // Return 1-indexed position
}

// =============================================================================
// Replacement Functions
// =============================================================================

/**
 * SUBSTITUTE - Replace occurrences of text
 * SUBSTITUTE(text, old_text, new_text, [instance_num])
 */
function SUBSTITUTE(args: FunctionArgs): ComputedValue {
	if (args.length < 3 || args.length > 4) {
		return makeError('#VALUE!', 'SUBSTITUE attend 3 ou 4 arguments');
	}

	const textResult = requireString(args[0], 'SUBSTITUE', 1);
	if (typeof textResult !== 'string') return textResult;

	const oldTextResult = requireString(args[1], 'SUBSTITUE', 2);
	if (typeof oldTextResult !== 'string') return oldTextResult;

	const newTextResult = requireString(args[2], 'SUBSTITUE', 3);
	if (typeof newTextResult !== 'string') return newTextResult;

	// If instance_num is provided, only replace that occurrence
	if (args.length === 4) {
		const instanceResult = requireNumber(args[3], 'SUBSTITUE', 4);
		if (typeof instanceResult !== 'number') return instanceResult;

		if (instanceResult < 1) {
			return makeError('#VALUE!', "SUBSTITUE : le numero d'occurrence doit etre >= 1");
		}

		// Find and replace the n-th occurrence
		let count = 0;
		let result = textResult;
		let lastIndex = 0;

		while (true) {
			const index = result.indexOf(oldTextResult, lastIndex);
			if (index === -1) break;

			count++;
			if (count === instanceResult) {
				result =
					result.substring(0, index) +
					newTextResult +
					result.substring(index + oldTextResult.length);
				break;
			}
			lastIndex = index + 1;
		}

		return makeString(result);
	}

	// Replace all occurrences
	const result = textResult.split(oldTextResult).join(newTextResult);
	return makeString(result);
}

/**
 * REPLACE - Replace characters at a position
 * REPLACE(old_text, start_num, num_chars, new_text)
 */
function REPLACE(args: FunctionArgs): ComputedValue {
	if (args.length !== 4) {
		return makeError('#VALUE!', 'REMPLACER attend exactement 4 arguments');
	}

	const textResult = requireString(args[0], 'REMPLACER', 1);
	if (typeof textResult !== 'string') return textResult;

	const startResult = requireNumber(args[1], 'REMPLACER', 2);
	if (typeof startResult !== 'number') return startResult;

	const numCharsResult = requireNumber(args[2], 'REMPLACER', 3);
	if (typeof numCharsResult !== 'number') return numCharsResult;

	const newTextResult = requireString(args[3], 'REMPLACER', 4);
	if (typeof newTextResult !== 'string') return newTextResult;

	if (startResult < 1) {
		return makeError('#VALUE!', 'REMPLACER : la position de depart doit etre >= 1');
	}

	if (numCharsResult < 0) {
		return makeError('#VALUE!', 'REMPLACER : le nombre de caracteres doit etre positif');
	}

	// Excel uses 1-indexed positions
	const startIndex = startResult - 1;
	const result =
		textResult.substring(0, startIndex) +
		newTextResult +
		textResult.substring(startIndex + numCharsResult);

	return makeString(result);
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * TEXT - Format a value as text
 * TEXT(value, [format_text])
 * Note: This is a simplified version - full Excel TEXT formatting is complex
 */
function TEXT(args: FunctionArgs): ComputedValue {
	if (args.length < 1 || args.length > 2) {
		return makeError('#VALUE!', 'TEXTE attend 1 ou 2 arguments');
	}

	const [value] = args;

	// Check for errors
	if (isError(value)) {
		return value;
	}

	// Simple conversion to string
	const str = toString(value);
	if (str === null) {
		return makeError('#VALUE!', 'TEXTE : valeur non convertible');
	}

	// If format is provided, try to apply basic formatting
	if (args.length === 2) {
		const formatResult = requireString(args[1], 'TEXTE', 2);
		if (typeof formatResult !== 'string') return formatResult;

		// Basic number formatting
		if (value.type === 'number') {
			const format = formatResult.toLowerCase();

			// Percentage format
			if (format.includes('%')) {
				const decimals = (format.match(/0/g) || []).length - 1;
				return makeString((value.value * 100).toFixed(Math.max(0, decimals)) + '%');
			}

			// Fixed decimal format (e.g., "0.00")
			const decimalMatch = format.match(/0\.(0+)/);
			if (decimalMatch) {
				return makeString(value.value.toFixed(decimalMatch[1].length));
			}
		}
	}

	return makeString(str);
}

/**
 * REPT - Repeat text
 * REPT(text, number_times)
 */
function REPT(args: FunctionArgs): ComputedValue {
	if (args.length !== 2) {
		return makeError('#VALUE!', 'REPT attend exactement 2 arguments');
	}

	const textResult = requireString(args[0], 'REPT', 1);
	if (typeof textResult !== 'string') return textResult;

	const timesResult = requireNumber(args[1], 'REPT', 2);
	if (typeof timesResult !== 'number') return timesResult;

	if (timesResult < 0) {
		return makeError('#VALUE!', 'REPT : le nombre de repetitions doit etre positif');
	}

	// Limit to prevent memory issues
	if (timesResult > 32767) {
		return makeError('#VALUE!', 'REPT : nombre de repetitions trop eleve (max 32767)');
	}

	return makeString(textResult.repeat(timesResult));
}

// =============================================================================
// Export
// =============================================================================

/**
 * All text functions mapped by canonical name
 */
export const textFunctions: Record<string, SpreadsheetFunction> = {
	// Concatenation
	CONCAT,
	CONCATENATE,

	// Extraction
	LEFT,
	RIGHT,
	MID,

	// Length
	LEN,

	// Case
	UPPER,
	LOWER,
	PROPER,

	// Trimming
	TRIM,

	// Search
	FIND,
	SEARCH,

	// Replacement
	SUBSTITUTE,
	REPLACE,

	// Formatting
	TEXT,
	REPT
};
