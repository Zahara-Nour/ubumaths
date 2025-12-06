/**
 * JavaScript Code Generator Helpers
 *
 * Provides JavaScript-specific code generation utilities for Blockly,
 * including helper functions and code wrapping for sandboxed execution.
 */

// =============================================================================
// Math Helper Functions
// =============================================================================

/**
 * Math helper functions to be injected into generated JavaScript code.
 * These functions provide common mathematical operations for student use.
 */
export const MATH_HELPERS = `
/**
 * Calculate the Greatest Common Divisor (GCD) of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} GCD of a and b
 */
function gcd(a, b) {
	a = Math.abs(Math.floor(a));
	b = Math.abs(Math.floor(b));
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/**
 * Calculate the Least Common Multiple (LCM) of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} LCM of a and b
 */
function lcm(a, b) {
	if (a === 0 || b === 0) return 0;
	return Math.abs((a * b) / gcd(a, b));
}

/**
 * Check if a number is prime
 * @param {number} n - Number to check
 * @returns {boolean} True if n is prime
 */
function isPrime(n) {
	n = Math.floor(n);
	if (n <= 1) return false;
	if (n <= 3) return true;
	if (n % 2 === 0 || n % 3 === 0) return false;
	for (let i = 5; i * i <= n; i += 6) {
		if (n % i === 0 || n % (i + 2) === 0) return false;
	}
	return true;
}
`.trim();

// =============================================================================
// Code Wrapping
// =============================================================================

/**
 * Wrap generated JavaScript code for safe sandbox execution.
 * Captures console.log output and provides math helper functions.
 *
 * @param code - Generated JavaScript code from Blockly
 * @returns Wrapped code ready for execution
 */
export function wrapJavaScriptCode(code: string): string {
	return `
(function() {
	'use strict';

	// Output capture
	const __output__ = [];
	const __console_log__ = console.log;

	console.log = function(...args) {
		__output__.push(args.map(arg => {
			if (arg === null) return 'null';
			if (arg === undefined) return 'undefined';
			if (typeof arg === 'object') {
				try {
					return JSON.stringify(arg);
				} catch {
					return String(arg);
				}
			}
			return String(arg);
		}).join(' '));
	};

	${MATH_HELPERS}

	try {
		// Generated code
		${code}

		return { success: true, output: __output__ };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			output: __output__
		};
	} finally {
		console.log = __console_log__;
	}
})();
`.trim();
}

// =============================================================================
// Code Analysis
// =============================================================================

/**
 * Detect potential infinite loops in generated JavaScript code.
 * This is a heuristic check, not a comprehensive analysis.
 *
 * @param code - JavaScript code to analyze
 * @returns True if code might contain infinite loops
 */
export function detectInfiniteLoops(code: string): boolean {
	// Check for while(true) without break
	const whileTruePattern = /while\s*\(\s*true\s*\)/g;
	if (whileTruePattern.test(code)) {
		// Check if there's a break statement in the same block
		const hasBreak = /break\s*;/.test(code);
		if (!hasBreak) {
			return true;
		}
	}

	// Check for for(;;) without break
	const foreverPattern = /for\s*\(\s*;\s*;\s*\)/g;
	if (foreverPattern.test(code)) {
		const hasBreak = /break\s*;/.test(code);
		if (!hasBreak) {
			return true;
		}
	}

	return false;
}

/**
 * Validate JavaScript code length
 *
 * @param code - Generated code
 * @param maxLength - Maximum allowed length
 * @returns True if code is within length limit
 */
export function validateCodeLength(code: string, maxLength: number): boolean {
	return code.length <= maxLength;
}
