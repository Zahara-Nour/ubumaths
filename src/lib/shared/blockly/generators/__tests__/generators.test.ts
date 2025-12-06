/**
 * Code Generation Module Tests
 *
 * Comprehensive test suite for Blockly code generation utilities,
 * covering code wrapping, validation, and detection logic.
 *
 * NOTE: These tests focus on pure functions that don't require DOM.
 * Full workspace integration tests should be added in a browser environment.
 */

import { describe, it, expect } from 'vitest';
import {
	wrapJavaScriptCode,
	wrapPythonCode,
	detectJsInfiniteLoops,
	detectPyInfiniteLoops,
	validateJsCodeLength,
	validatePyCodeLength,
	JS_MATH_HELPERS,
	PYTHON_IMPORTS,
	PYTHON_MATH_HELPERS
} from '../index';

// =============================================================================
// JavaScript Code Wrapping Tests
// =============================================================================

describe('JavaScript Code Wrapping', () => {
	describe('wrapJavaScriptCode', () => {
		it('should wrap code with IIFE', () => {
			const code = 'console.log("test");';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('(function()');
			expect(wrapped).toContain('})()');
			expect(wrapped).toContain("'use strict'");
		});

		it('should include math helper functions', () => {
			const code = 'const x = 5;';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('function gcd(a, b)');
			expect(wrapped).toContain('function lcm(a, b)');
			expect(wrapped).toContain('function isPrime(n)');
		});

		it('should capture console.log output', () => {
			const code = 'console.log("test");';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('const __output__ = []');
			expect(wrapped).toContain('const __console_log__ = console.log');
			expect(wrapped).toContain('console.log = function(...args)');
		});

		it('should include error handling', () => {
			const code = 'throw new Error("test");';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('try {');
			expect(wrapped).toContain('} catch (error) {');
			expect(wrapped).toContain('return {');
			expect(wrapped).toContain('success: false');
		});

		it('should restore console.log in finally block', () => {
			const code = 'const x = 1;';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('} finally {');
			expect(wrapped).toContain('console.log = __console_log__');
		});

		it('should handle empty code', () => {
			const code = '';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('(function()');
			expect(wrapped).toContain('function gcd');
		});

		it('should preserve user code in wrapped output', () => {
			const code = 'const answer = 42;';
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain(code);
		});

		it('should handle multiline code', () => {
			const code = `
let x = 1;
let y = 2;
console.log(x + y);
			`.trim();
			const wrapped = wrapJavaScriptCode(code);

			expect(wrapped).toContain('let x = 1');
			expect(wrapped).toContain('let y = 2');
			expect(wrapped).toContain('console.log(x + y)');
		});
	});

	describe('JS_MATH_HELPERS', () => {
		it('should export GCD function', () => {
			expect(JS_MATH_HELPERS).toContain('function gcd(a, b)');
			expect(JS_MATH_HELPERS).toContain('Math.abs');
		});

		it('should export LCM function', () => {
			expect(JS_MATH_HELPERS).toContain('function lcm(a, b)');
			expect(JS_MATH_HELPERS).toContain('gcd(a, b)');
		});

		it('should export isPrime function', () => {
			expect(JS_MATH_HELPERS).toContain('function isPrime(n)');
			expect(JS_MATH_HELPERS).toContain('if (n <= 1) return false');
		});

		it('should include JSDoc comments', () => {
			expect(JS_MATH_HELPERS).toContain('/**');
			expect(JS_MATH_HELPERS).toContain('Greatest Common Divisor');
			expect(JS_MATH_HELPERS).toContain('Least Common Multiple');
		});
	});
});

// =============================================================================
// Python Code Wrapping Tests
// =============================================================================

describe('Python Code Wrapping', () => {
	describe('wrapPythonCode', () => {
		it('should include required imports', () => {
			const code = 'print("test")';
			const wrapped = wrapPythonCode(code);

			expect(wrapped).toContain('import math');
			expect(wrapped).toContain('import sys');
			expect(wrapped).toContain('from io import StringIO');
		});

		it('should include math helper functions', () => {
			const code = 'x = 5';
			const wrapped = wrapPythonCode(code);

			expect(wrapped).toContain('def gcd(a, b):');
			expect(wrapped).toContain('def lcm(a, b):');
			expect(wrapped).toContain('def is_prime(n):');
		});

		it('should preserve user code', () => {
			const code = 'x = 42\nprint(x)';
			const wrapped = wrapPythonCode(code);

			expect(wrapped).toContain('x = 42');
			expect(wrapped).toContain('print(x)');
		});

		it('should handle empty code', () => {
			const code = '';
			const wrapped = wrapPythonCode(code);

			expect(wrapped).toContain('import math');
			expect(wrapped).toContain('def gcd');
		});

		it('should handle multiline code with proper indentation', () => {
			const code = `
for i in range(10):
    print(i)
			`.trim();
			const wrapped = wrapPythonCode(code);

			expect(wrapped).toContain('for i in range(10):');
			expect(wrapped).toContain('print(i)');
		});
	});

	describe('PYTHON_IMPORTS', () => {
		it('should include math module', () => {
			expect(PYTHON_IMPORTS).toContain('import math');
		});

		it('should include sys module', () => {
			expect(PYTHON_IMPORTS).toContain('import sys');
		});

		it('should include StringIO', () => {
			expect(PYTHON_IMPORTS).toContain('from io import StringIO');
		});
	});

	describe('PYTHON_MATH_HELPERS', () => {
		it('should export GCD function', () => {
			expect(PYTHON_MATH_HELPERS).toContain('def gcd(a, b):');
			expect(PYTHON_MATH_HELPERS).toContain('abs(int(a))');
		});

		it('should export LCM function', () => {
			expect(PYTHON_MATH_HELPERS).toContain('def lcm(a, b):');
			expect(PYTHON_MATH_HELPERS).toContain('gcd(a, b)');
		});

		it('should export is_prime function', () => {
			expect(PYTHON_MATH_HELPERS).toContain('def is_prime(n):');
			expect(PYTHON_MATH_HELPERS).toContain('if n <= 1:');
		});

		it('should include docstrings', () => {
			expect(PYTHON_MATH_HELPERS).toContain('"""');
			expect(PYTHON_MATH_HELPERS).toContain('Greatest Common Divisor');
		});
	});
});

// =============================================================================
// Infinite Loop Detection Tests
// =============================================================================

describe('Infinite Loop Detection', () => {
	describe('detectJsInfiniteLoops', () => {
		it('should detect while(true) without break', () => {
			const code = 'while(true) { console.log("x"); }';
			expect(detectJsInfiniteLoops(code)).toBe(true);
		});

		it('should detect while (true) with spaces', () => {
			const code = 'while (true) { console.log("x"); }';
			expect(detectJsInfiniteLoops(code)).toBe(true);
		});

		it('should detect while( true ) with extra spaces', () => {
			const code = 'while( true ) { console.log("x"); }';
			expect(detectJsInfiniteLoops(code)).toBe(true);
		});

		it('should not flag while(true) with break', () => {
			const code = 'while(true) { if (x > 10) break; x++; }';
			expect(detectJsInfiniteLoops(code)).toBe(false);
		});

		it('should detect for(;;) without break', () => {
			const code = 'for(;;) { console.log("x"); }';
			expect(detectJsInfiniteLoops(code)).toBe(true);
		});

		it('should detect for (;;) with spaces', () => {
			const code = 'for (;;) { console.log("x"); }';
			expect(detectJsInfiniteLoops(code)).toBe(true);
		});

		it('should not flag for(;;) with break', () => {
			const code = 'for(;;) { if (x > 10) break; x++; }';
			expect(detectJsInfiniteLoops(code)).toBe(false);
		});

		it('should not flag normal for loops', () => {
			const code = 'for(let i = 0; i < 10; i++) { console.log(i); }';
			expect(detectJsInfiniteLoops(code)).toBe(false);
		});

		it('should not flag while loops with conditions', () => {
			const code = 'while(x < 10) { x++; }';
			expect(detectJsInfiniteLoops(code)).toBe(false);
		});

		it('should handle empty code', () => {
			expect(detectJsInfiniteLoops('')).toBe(false);
		});

		it('should handle code without loops', () => {
			const code = 'const x = 5; console.log(x);';
			expect(detectJsInfiniteLoops(code)).toBe(false);
		});
	});

	describe('detectPyInfiniteLoops', () => {
		it('should detect while True: without break', () => {
			const code = 'while True:\n    print("x")';
			expect(detectPyInfiniteLoops(code)).toBe(true);
		});

		it('should detect while True : with space before colon', () => {
			const code = 'while True :\n    print("x")';
			expect(detectPyInfiniteLoops(code)).toBe(true);
		});

		it('should not flag while True: with break', () => {
			const code = 'while True:\n    if x > 10:\n        break\n    x += 1';
			expect(detectPyInfiniteLoops(code)).toBe(false);
		});

		it('should not flag normal while loops', () => {
			const code = 'while x < 10:\n    x += 1';
			expect(detectPyInfiniteLoops(code)).toBe(false);
		});

		it('should handle empty code', () => {
			expect(detectPyInfiniteLoops('')).toBe(false);
		});

		it('should handle code without loops', () => {
			const code = 'x = 5\nprint(x)';
			expect(detectPyInfiniteLoops(code)).toBe(false);
		});

		it('should handle for loops', () => {
			const code = 'for i in range(10):\n    print(i)';
			expect(detectPyInfiniteLoops(code)).toBe(false);
		});
	});
});

// =============================================================================
// Code Length Validation Tests
// =============================================================================

describe('Code Length Validation', () => {
	describe('validateJsCodeLength', () => {
		it('should accept code within limit', () => {
			const code = 'const x = 5;';
			expect(validateJsCodeLength(code, 100)).toBe(true);
		});

		it('should reject code exceeding limit', () => {
			const code = 'x'.repeat(1000);
			expect(validateJsCodeLength(code, 100)).toBe(false);
		});

		it('should handle empty code', () => {
			expect(validateJsCodeLength('', 100)).toBe(true);
		});

		it('should handle exact limit', () => {
			const code = 'x'.repeat(100);
			expect(validateJsCodeLength(code, 100)).toBe(true);
		});

		it('should handle code one character over limit', () => {
			const code = 'x'.repeat(101);
			expect(validateJsCodeLength(code, 100)).toBe(false);
		});

		it('should handle very long code', () => {
			const code = 'x'.repeat(100000);
			expect(validateJsCodeLength(code, 1000)).toBe(false);
		});

		it('should accept multiline code within limit', () => {
			const code = 'const x = 1;\nconst y = 2;\n';
			expect(validateJsCodeLength(code, 100)).toBe(true);
		});
	});

	describe('validatePyCodeLength', () => {
		it('should accept code within limit', () => {
			const code = 'x = 5';
			expect(validatePyCodeLength(code, 100)).toBe(true);
		});

		it('should reject code exceeding limit', () => {
			const code = 'x'.repeat(1000);
			expect(validatePyCodeLength(code, 100)).toBe(false);
		});

		it('should handle empty code', () => {
			expect(validatePyCodeLength('', 100)).toBe(true);
		});

		it('should handle exact limit', () => {
			const code = 'x'.repeat(100);
			expect(validatePyCodeLength(code, 100)).toBe(true);
		});

		it('should handle code one character over limit', () => {
			const code = 'x'.repeat(101);
			expect(validatePyCodeLength(code, 100)).toBe(false);
		});

		it('should accept multiline code within limit', () => {
			const code = 'x = 1\ny = 2\n';
			expect(validatePyCodeLength(code, 100)).toBe(true);
		});
	});

	describe('length validation parity', () => {
		it('should have same behavior for both languages', () => {
			const code = 'test code';
			const limit = 50;

			expect(validateJsCodeLength(code, limit)).toBe(validatePyCodeLength(code, limit));
		});

		it('should validate consistently for edge cases', () => {
			expect(validateJsCodeLength('', 0)).toBe(validatePyCodeLength('', 0));
			expect(validateJsCodeLength('x', 1)).toBe(validatePyCodeLength('x', 1));
			expect(validateJsCodeLength('x', 0)).toBe(validatePyCodeLength('x', 0));
		});
	});
});

// =============================================================================
// Integration Tests for Wrapped Code
// =============================================================================

describe('Code Wrapping Integration', () => {
	it('should produce valid JavaScript syntax', () => {
		const code = 'const x = 42; console.log(x);';
		const wrapped = wrapJavaScriptCode(code);

		// Should not throw syntax errors
		expect(() => new Function(wrapped)).not.toThrow();
	});

	it('should include all components in JavaScript wrapper', () => {
		const code = 'console.log("test");';
		const wrapped = wrapJavaScriptCode(code);

		expect(wrapped).toContain('use strict');
		expect(wrapped).toContain('function gcd');
		expect(wrapped).toContain('function lcm');
		expect(wrapped).toContain('function isPrime');
		expect(wrapped).toContain('__output__');
		expect(wrapped).toContain('try {');
		expect(wrapped).toContain('} catch');
		expect(wrapped).toContain('} finally {');
		expect(wrapped).toContain(code);
	});

	it('should include all components in Python wrapper', () => {
		const code = 'print("test")';
		const wrapped = wrapPythonCode(code);

		expect(wrapped).toContain('import math');
		expect(wrapped).toContain('import sys');
		expect(wrapped).toContain('def gcd');
		expect(wrapped).toContain('def lcm');
		expect(wrapped).toContain('def is_prime');
		expect(wrapped).toContain(code);
	});

	it('should handle special characters in code', () => {
		const code = 'console.log("Hello \\"World\\"");';
		const wrapped = wrapJavaScriptCode(code);

		expect(wrapped).toContain(code);
	});

	it('should handle template literals in code', () => {
		const code = 'const msg = `Hello ${name}`;';
		const wrapped = wrapJavaScriptCode(code);

		expect(wrapped).toContain(code);
	});
});
