/**
 * Python Code Generator Helpers
 *
 * Provides Python-specific code generation utilities for Blockly,
 * including imports and code wrapping for Pyodide execution.
 */

// =============================================================================
// Python Imports
// =============================================================================

/**
 * Standard Python imports for mathematical operations.
 * These imports are added to every generated Python program.
 */
export const PYTHON_IMPORTS = `
import math
import sys
from io import StringIO
`.trim();

// =============================================================================
// Math Helper Functions
// =============================================================================

/**
 * Math helper functions for Python code.
 * Provides GCD, LCM, and prime checking functions.
 */
export const PYTHON_MATH_HELPERS = `
def gcd(a, b):
	"""Calculate the Greatest Common Divisor (GCD) of two numbers"""
	a, b = abs(int(a)), abs(int(b))
	while b != 0:
		a, b = b, a % b
	return a

def lcm(a, b):
	"""Calculate the Least Common Multiple (LCM) of two numbers"""
	if a == 0 or b == 0:
		return 0
	return abs((a * b) // gcd(a, b))

def is_prime(n):
	"""Check if a number is prime"""
	n = int(n)
	if n <= 1:
		return False
	if n <= 3:
		return True
	if n % 2 == 0 or n % 3 == 0:
		return False
	i = 5
	while i * i <= n:
		if n % i == 0 or n % (i + 2) == 0:
			return False
		i += 6
	return True
`.trim();

// =============================================================================
// Code Wrapping
// =============================================================================

/**
 * Wrap generated Python code for Pyodide execution.
 * Adds necessary imports and helper functions.
 *
 * @param code - Generated Python code from Blockly
 * @returns Wrapped code ready for execution
 */
export function wrapPythonCode(code: string): string {
	return `
${PYTHON_IMPORTS}

${PYTHON_MATH_HELPERS}

# Generated code
${code}
`.trim();
}

// =============================================================================
// Code Analysis
// =============================================================================

/**
 * Detect potential infinite loops in generated Python code.
 * This is a heuristic check, not a comprehensive analysis.
 *
 * @param code - Python code to analyze
 * @returns True if code might contain infinite loops
 */
export function detectInfiniteLoops(code: string): boolean {
	// Check for while True: without break
	const whileTruePattern = /while\s+True\s*:/g;
	if (whileTruePattern.test(code)) {
		// Check if there's a break statement
		const hasBreak = /break\s*$/m.test(code);
		if (!hasBreak) {
			return true;
		}
	}

	return false;
}

/**
 * Validate Python code length
 *
 * @param code - Generated code
 * @param maxLength - Maximum allowed length
 * @returns True if code is within length limit
 */
export function validateCodeLength(code: string, maxLength: number): boolean {
	return code.length <= maxLength;
}

/**
 * Check if Python code requires additional imports.
 * Can be used to optimize imports or detect missing dependencies.
 *
 * @param code - Generated Python code
 * @returns Array of detected module references
 */
export function detectRequiredImports(code: string): string[] {
	const imports: string[] = [];

	// Check for common module usage
	if (/\bmath\.\w+/.test(code)) {
		imports.push('math');
	}
	if (/\brandom\.\w+/.test(code)) {
		imports.push('random');
	}
	if (/\bdatetime\.\w+/.test(code)) {
		imports.push('datetime');
	}

	return imports;
}
