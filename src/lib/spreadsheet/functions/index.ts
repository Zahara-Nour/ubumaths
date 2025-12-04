/**
 * Spreadsheet Functions Module - Central registry and exports
 *
 * This module provides:
 * - A central registry of all spreadsheet functions
 * - Function execution with alias normalization
 * - Function lookup and validation
 *
 * @module spreadsheet/functions
 */

import type { ComputedValue, ErrorCode } from '../types';
import { normalizeFunction } from './aliases';
import { mathFunctions } from './math';
import type { SpreadsheetFunction, FunctionArgs } from './math';
import { logicFunctions } from './logic';
import { textFunctions } from './text';

// =============================================================================
// Re-exports
// =============================================================================

export {
	FUNCTION_ALIASES,
	CANONICAL_FUNCTIONS,
	normalizeFunction,
	isFunctionName,
	getSupportedFunctions,
	getFrenchAliases,
	getFrenchAlias
} from './aliases';

export { mathFunctions } from './math';
export type { SpreadsheetFunction, FunctionArgs } from './math';
export { logicFunctions } from './logic';
export { textFunctions } from './text';

// =============================================================================
// Function Registry
// =============================================================================

/**
 * Combined registry of all spreadsheet functions
 *
 * All functions are stored by their canonical (English) name.
 * French aliases are resolved during function execution.
 */
const FUNCTIONS: Record<string, SpreadsheetFunction> = {
	...mathFunctions,
	...logicFunctions,
	...textFunctions
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an error value
 */
function makeError(code: ErrorCode, message: string): ComputedValue {
	return { type: 'error', code, message };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Execute a spreadsheet function by name
 *
 * This function:
 * 1. Normalizes the function name (French -> English, uppercase)
 * 2. Looks up the function in the registry
 * 3. Executes the function with the provided arguments
 * 4. Returns the result or an error if the function is unknown
 *
 * @param name - The function name (can be French alias or English)
 * @param args - The function arguments
 * @returns The computed result of the function
 *
 * @example
 * executeFunction('SUM', [{ type: 'number', value: 1 }, { type: 'number', value: 2 }])
 * // Returns: { type: 'number', value: 3 }
 *
 * @example
 * executeFunction('SOMME', [{ type: 'number', value: 1 }, { type: 'number', value: 2 }])
 * // Returns: { type: 'number', value: 3 } (French alias resolved)
 *
 * @example
 * executeFunction('UNKNOWN', [])
 * // Returns: { type: 'error', code: '#NAME?', message: '...' }
 */
export function executeFunction(name: string, args: FunctionArgs): ComputedValue {
	// Normalize function name (French -> English, uppercase)
	const normalizedName = normalizeFunction(name);

	// Look up function in registry
	const fn = FUNCTIONS[normalizedName];

	if (!fn) {
		return makeError('#NAME?', `Fonction inconnue : ${name}`);
	}

	// Execute the function
	return fn(args);
}

/**
 * Check if a function exists in the registry
 *
 * @param name - The function name to check (case-insensitive, French or English)
 * @returns true if the function exists, false otherwise
 *
 * @example
 * hasFunction('SUM')    // true
 * hasFunction('SOMME')  // true (French alias)
 * hasFunction('UNKNOWN') // false
 */
export function hasFunction(name: string): boolean {
	const normalizedName = normalizeFunction(name);
	return normalizedName in FUNCTIONS;
}

/**
 * Get all available function names (canonical English names only)
 *
 * @returns Array of all function names, sorted alphabetically
 */
export function getAvailableFunctions(): string[] {
	return Object.keys(FUNCTIONS).sort();
}

/**
 * Get the number of registered functions
 *
 * @returns The total count of available functions
 */
export function getFunctionCount(): number {
	return Object.keys(FUNCTIONS).length;
}
