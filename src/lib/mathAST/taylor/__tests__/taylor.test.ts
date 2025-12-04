/**
 * Unit tests for Taylor Series Expansion
 *
 * Tests the Taylor/Maclaurin series computation for various functions
 * including polynomials, trigonometric, exponential, and logarithmic functions.
 */

import { describe, it, expect } from 'vitest';
import { taylorExpand, maclaurin, TaylorError, MAX_TAYLOR_TERMS } from '../index';
import {
	variable,
	power,
	add,
	multiply,
	number,
	sin,
	cos,
	exp,
	ln,
	sqrt,
	tan,
	divide
} from '../../factory';
import { toCustom } from '../../custom-generator';
import { evaluate, substitute } from '../../eval';
import type { MathNode } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Evaluate a Taylor expansion at a point and compare with expected value.
 * Currently unused but kept for potential future tests.
 */
function _evaluateTaylor(taylor: MathNode, _x: number): number {
	const result = evaluate(taylor, { mode: 'decimal' });
	if (typeof result.value === 'number') {
		return result.value;
	}
	// Rational
	return Number(result.value.n) / Number(result.value.d);
}

/**
 * Helper to substitute and evaluate
 */
function evalAt(expr: MathNode, varName: string, value: number): number {
	const substituted = substitute(expr, { [varName]: value });
	const result = evaluate(substituted, { mode: 'decimal' });
	if (typeof result.value === 'number') {
		return result.value;
	}
	return Number(result.value.n) / Number(result.value.d);
}

// =============================================================================
// Basic Polynomial Tests
// =============================================================================

describe('Taylor expansion of polynomials', () => {
	it('expands a constant to itself', () => {
		const expr = number('5');
		const taylor = taylorExpand(expr, { terms: 3 });
		const output = toCustom(taylor);
		expect(output).toBe('5');
	});

	it('expands x to x (linear)', () => {
		const expr = variable('x');
		const taylor = taylorExpand(expr, { terms: 3 });
		const output = toCustom(taylor);
		expect(output).toContain('x');
	});

	it('expands x^2 to x^2', () => {
		const expr = power(variable('x'), number('2'));
		const taylor = taylorExpand(expr, { terms: 4 });
		// Result should be equivalent to x^2
		// At x=2: should give 4
		const value = evalAt(taylor, 'x', 2);
		expect(value).toBeCloseTo(4, 10);
	});

	it('expands x^3 to x^3', () => {
		const expr = power(variable('x'), number('3'));
		const taylor = taylorExpand(expr, { terms: 5 });
		// At x=2: should give 8
		const value = evalAt(taylor, 'x', 2);
		expect(value).toBeCloseTo(8, 10);
	});

	it('expands polynomial 2x^2 + 3x + 1', () => {
		// 2x^2 + 3x + 1
		const expr = add(
			add(
				multiply(number('2'), power(variable('x'), number('2')), 'implicit'),
				multiply(number('3'), variable('x'), 'implicit')
			),
			number('1')
		);
		const taylor = taylorExpand(expr, { terms: 4 });
		// At x=1: 2 + 3 + 1 = 6
		const value = evalAt(taylor, 'x', 1);
		expect(value).toBeCloseTo(6, 10);
		// At x=2: 8 + 6 + 1 = 15
		const value2 = evalAt(taylor, 'x', 2);
		expect(value2).toBeCloseTo(15, 10);
	});
});

// =============================================================================
// Exponential Function Tests
// =============================================================================

describe('Taylor expansion of exp(x)', () => {
	it('expands exp(x) around 0, 5 terms', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// exp(x) ~ 1 + x + x^2/2 + x^3/6 + x^4/24
		// At x=0: should give 1
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(1, 10);
		// At x=1: exp(1) ~ 2.718, 5 terms gives ~2.708
		const value1 = evalAt(taylor, 'x', 1);
		expect(value1).toBeCloseTo(2.708333, 3);
	});

	it('expands exp(x) around 0, 8 terms', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 8, center: 0 });
		// More terms = better approximation
		const value1 = evalAt(taylor, 'x', 1);
		expect(value1).toBeCloseTo(Math.exp(1), 4);
	});

	it('maclaurin convenience function works for exp', () => {
		const expr = exp(variable('x'));
		const taylor = maclaurin(expr, 6);
		const value = evalAt(taylor, 'x', 0.5);
		expect(value).toBeCloseTo(Math.exp(0.5), 4);
	});
});

// =============================================================================
// Trigonometric Function Tests
// =============================================================================

describe('Taylor expansion of sin(x)', () => {
	it('expands sin(x) around 0, 5 terms', () => {
		const expr = sin(variable('x'));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// sin(x) ~ x - x^3/6 + x^5/120
		// At x=0: should give 0
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(0, 10);
	});

	it('expands sin(x) around 0, 7 terms', () => {
		const expr = sin(variable('x'));
		const taylor = taylorExpand(expr, { terms: 7, center: 0 });
		// At x=pi/6: sin(pi/6) = 0.5
		const value = evalAt(taylor, 'x', Math.PI / 6);
		expect(value).toBeCloseTo(0.5, 4);
	});

	it('sin(x) taylor is accurate near 0', () => {
		const expr = sin(variable('x'));
		const taylor = taylorExpand(expr, { terms: 9, center: 0 });
		// At x=0.1: sin(0.1) ~ 0.0998334
		const value = evalAt(taylor, 'x', 0.1);
		expect(value).toBeCloseTo(Math.sin(0.1), 10);
	});
});

describe('Taylor expansion of cos(x)', () => {
	it('expands cos(x) around 0, 5 terms', () => {
		const expr = cos(variable('x'));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// cos(x) ~ 1 - x^2/2 + x^4/24
		// At x=0: should give 1
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(1, 10);
	});

	it('expands cos(x) around 0, 8 terms', () => {
		const expr = cos(variable('x'));
		const taylor = taylorExpand(expr, { terms: 8, center: 0 });
		// At x=pi/4: cos(pi/4) = sqrt(2)/2 ~ 0.707
		const value = evalAt(taylor, 'x', Math.PI / 4);
		expect(value).toBeCloseTo(Math.cos(Math.PI / 4), 4);
	});

	it('cos(x) taylor is accurate near 0', () => {
		const expr = cos(variable('x'));
		const taylor = taylorExpand(expr, { terms: 10, center: 0 });
		// At x=0.2: cos(0.2)
		const value = evalAt(taylor, 'x', 0.2);
		expect(value).toBeCloseTo(Math.cos(0.2), 10);
	});
});

// =============================================================================
// Logarithmic Function Tests
// =============================================================================

describe('Taylor expansion of ln(1+x)', () => {
	it('expands ln(1+x) around 0, 5 terms', () => {
		// ln(1+x) ~ x - x^2/2 + x^3/3 - x^4/4 + x^5/5
		const expr = ln(add(number('1'), variable('x')));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// At x=0: should give 0
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(0, 10);
	});

	it('ln(1+x) taylor accurate for small x', () => {
		const expr = ln(add(number('1'), variable('x')));
		const taylor = taylorExpand(expr, { terms: 10, center: 0 });
		// At x=0.1: ln(1.1) ~ 0.0953
		const value = evalAt(taylor, 'x', 0.1);
		expect(value).toBeCloseTo(Math.log(1.1), 6);
	});
});

describe('Taylor expansion of ln(x) around center=1', () => {
	it('expands ln(x) around 1, 5 terms', () => {
		const expr = ln(variable('x'));
		const taylor = taylorExpand(expr, { terms: 5, center: 1 });
		// At x=1: ln(1) = 0
		const value1 = evalAt(taylor, 'x', 1);
		expect(value1).toBeCloseTo(0, 10);
	});

	it('ln(x) around 1 is accurate near 1', () => {
		const expr = ln(variable('x'));
		const taylor = taylorExpand(expr, { terms: 10, center: 1 });
		// At x=1.5: ln(1.5) ~ 0.405
		const value = evalAt(taylor, 'x', 1.5);
		expect(value).toBeCloseTo(Math.log(1.5), 3);
	});
});

// =============================================================================
// Non-zero Center Tests
// =============================================================================

describe('Taylor expansion with non-zero center', () => {
	it('expands x^2 around center=1', () => {
		const expr = power(variable('x'), number('2'));
		const taylor = taylorExpand(expr, { terms: 4, center: 1 });
		// At x=1: should give 1
		const value1 = evalAt(taylor, 'x', 1);
		expect(value1).toBeCloseTo(1, 10);
		// At x=2: should give 4
		const value2 = evalAt(taylor, 'x', 2);
		expect(value2).toBeCloseTo(4, 10);
	});

	it('expands exp(x) around center=1', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 6, center: 1 });
		// At x=1: exp(1) ~ 2.718
		const value1 = evalAt(taylor, 'x', 1);
		expect(value1).toBeCloseTo(Math.exp(1), 8); // Allow for floating point precision
		// At x=1.5: exp(1.5)
		const value15 = evalAt(taylor, 'x', 1.5);
		expect(value15).toBeCloseTo(Math.exp(1.5), 3);
	});

	it('expands sin(x) around center=pi/2', () => {
		const expr = sin(variable('x'));
		const taylor = taylorExpand(expr, { terms: 6, center: Math.PI / 2 });
		// At x=pi/2: sin(pi/2) = 1
		const valueAtCenter = evalAt(taylor, 'x', Math.PI / 2);
		expect(valueAtCenter).toBeCloseTo(1, 10);
	});

	it('expands with negative center', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 5, center: -1 });
		// At x=-1: exp(-1) ~ 0.368
		const value = evalAt(taylor, 'x', -1);
		expect(value).toBeCloseTo(Math.exp(-1), 10);
	});
});

// =============================================================================
// Different Variable Names
// =============================================================================

describe('Taylor expansion with different variables', () => {
	it('expands with variable t', () => {
		const expr = sin(variable('t'));
		const taylor = taylorExpand(expr, { variable: 't', terms: 5 });
		const output = toCustom(taylor);
		expect(output).toContain('t');
		expect(output).not.toContain('x');
	});

	it('expands with variable y', () => {
		const expr = exp(variable('y'));
		const taylor = taylorExpand(expr, { variable: 'y', terms: 4 });
		const output = toCustom(taylor);
		expect(output).toContain('y');
	});
});

// =============================================================================
// Number of Terms Tests
// =============================================================================

describe('Taylor expansion term count', () => {
	it('expands with 1 term (constant only)', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 1 });
		// exp(0) = 1, so just "1"
		const value = evalAt(taylor, 'x', 0);
		expect(value).toBeCloseTo(1, 10);
	});

	it('expands with 2 terms', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 2 });
		// 1 + x
		const value = evalAt(taylor, 'x', 1);
		expect(value).toBeCloseTo(2, 10); // 1 + 1 = 2
	});

	it('expands with maximum allowed terms', () => {
		const expr = exp(variable('x'));
		// Should not throw with MAX_TAYLOR_TERMS
		const taylor = taylorExpand(expr, { terms: MAX_TAYLOR_TERMS });
		expect(taylor).toBeDefined();
	});

	it('throws error if terms > MAX_TAYLOR_TERMS', () => {
		const expr = exp(variable('x'));
		expect(() => {
			taylorExpand(expr, { terms: MAX_TAYLOR_TERMS + 1 });
		}).toThrow(TaylorError);
	});

	it('throws error if terms < 1', () => {
		const expr = exp(variable('x'));
		expect(() => {
			taylorExpand(expr, { terms: 0 });
		}).toThrow(TaylorError);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Taylor expansion edge cases', () => {
	it('handles zero function (all derivatives are zero)', () => {
		const expr = number('0');
		const taylor = taylorExpand(expr, { terms: 5 });
		const output = toCustom(taylor);
		expect(output).toBe('0');
	});

	it('handles constant function', () => {
		const expr = number('42');
		const taylor = taylorExpand(expr, { terms: 5 });
		const output = toCustom(taylor);
		expect(output).toBe('42');
	});

	it('handles linear function at non-zero center', () => {
		// f(x) = x, expanded at center=2
		// f(2) = 2, f'(2) = 1
		// Taylor: 2 + 1*(x-2) = x
		const expr = variable('x');
		const taylor = taylorExpand(expr, { terms: 3, center: 2 });
		const value = evalAt(taylor, 'x', 5);
		expect(value).toBeCloseTo(5, 10);
	});
});

// =============================================================================
// Error Cases
// =============================================================================

describe('Taylor expansion error handling', () => {
	it('throws error when evaluating ln(x) at center=0', () => {
		const expr = ln(variable('x'));
		// ln(0) is undefined
		expect(() => {
			taylorExpand(expr, { terms: 3, center: 0 });
		}).toThrow(TaylorError);
	});

	it('throws error when evaluating 1/x at center=0', () => {
		const expr = divide(number('1'), variable('x'), 'fraction');
		// 1/0 is undefined
		expect(() => {
			taylorExpand(expr, { terms: 3, center: 0 });
		}).toThrow(TaylorError);
	});

	it('tan(x) at center=pi/2 produces Infinity or very large values', () => {
		const expr = tan(variable('x'));
		// tan(pi/2) approaches infinity, so either throws or produces large values
		// Due to floating point, exact pi/2 might give a finite but very large value
		try {
			const taylor = taylorExpand(expr, { terms: 3, center: Math.PI / 2 });
			// If it doesn't throw, the value at center should be very large
			const value = evalAt(taylor, 'x', Math.PI / 2);
			expect(Math.abs(value)).toBeGreaterThan(1e10);
		} catch {
			// Throwing is also acceptable
			expect(true).toBe(true);
		}
	});
});

// =============================================================================
// Square Root Tests
// =============================================================================

describe('Taylor expansion of sqrt(1+x)', () => {
	it('expands sqrt(1+x) around 0', () => {
		const expr = sqrt(add(number('1'), variable('x')));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// sqrt(1+x) ~ 1 + x/2 - x^2/8 + x^3/16 - ...
		// At x=0: should give 1
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(1, 10);
		// At x=0.1: sqrt(1.1) ~ 1.0488
		const value = evalAt(taylor, 'x', 0.1);
		expect(value).toBeCloseTo(Math.sqrt(1.1), 3);
	});
});

// =============================================================================
// Composite Function Tests
// =============================================================================

describe('Taylor expansion of composite functions', () => {
	it('expands exp(sin(x)) around 0', () => {
		const expr = exp(sin(variable('x')));
		const taylor = taylorExpand(expr, { terms: 5, center: 0 });
		// At x=0: exp(sin(0)) = exp(0) = 1
		const value0 = evalAt(taylor, 'x', 0);
		expect(value0).toBeCloseTo(1, 10);
	});

	it('expands sin(x^2) around 0', () => {
		const expr = sin(power(variable('x'), number('2')));
		// sin(x^2) needs more terms for accuracy since the argument grows quickly
		const taylor = taylorExpand(expr, { terms: 10, center: 0 });
		// At x=0.5: sin(0.25) ~ 0.2474
		const value = evalAt(taylor, 'x', 0.5);
		expect(value).toBeCloseTo(Math.sin(0.25), 3);
	});
});

// =============================================================================
// Maclaurin Convenience Function Tests
// =============================================================================

describe('maclaurin convenience function', () => {
	it('uses default 5 terms', () => {
		const expr = exp(variable('x'));
		const taylor = maclaurin(expr);
		// 5 terms: 1 + x + x^2/2 + x^3/6 + x^4/24
		const value = evalAt(taylor, 'x', 1);
		expect(value).toBeCloseTo(2.708333, 3);
	});

	it('uses custom number of terms', () => {
		const expr = exp(variable('x'));
		const taylor = maclaurin(expr, 8);
		const value = evalAt(taylor, 'x', 1);
		expect(value).toBeCloseTo(Math.exp(1), 4);
	});

	it('uses custom variable', () => {
		const expr = sin(variable('t'));
		const taylor = maclaurin(expr, 5, 't');
		const output = toCustom(taylor);
		expect(output).toContain('t');
	});
});

// =============================================================================
// Output Format Tests
// =============================================================================

describe('Taylor expansion output format', () => {
	it('produces readable output for exp(x)', () => {
		const expr = exp(variable('x'));
		const taylor = taylorExpand(expr, { terms: 4 });
		const output = toCustom(taylor);
		// Should contain x terms
		expect(output).toContain('x');
		// Should produce some readable polynomial-like output
		expect(output.length).toBeGreaterThan(0);
	});

	it('produces readable output for sin(x)', () => {
		const expr = sin(variable('x'));
		const taylor = taylorExpand(expr, { terms: 4 });
		const output = toCustom(taylor);
		// sin(x) only has odd powers
		expect(output).toContain('x');
	});

	it('produces readable output for cos(x)', () => {
		const expr = cos(variable('x'));
		const taylor = taylorExpand(expr, { terms: 4 });
		const output = toCustom(taylor);
		// cos(x) starts with 1 (constant term)
		expect(output).toContain('1');
	});
});
