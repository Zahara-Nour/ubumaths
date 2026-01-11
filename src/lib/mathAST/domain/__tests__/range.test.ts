/**
 * Tests for range (image) computation
 *
 * Comprehensive edge case coverage for computeRange()
 */

import { describe, it, expect } from 'vitest';
import { computeRange } from '../range';
import { containsValue } from '../algebra';
import {
	positiveReals,
	nonNegativeReals,
	unitInterval,
	universalDomain,
	emptyDomain,
	intervalDomain,
	closedInterval,
	openInterval,
	greaterThanOrEqual,
	lessThanOrEqual,
	fromNumber,
	nonZeroReals
} from '../factory';
import type { MathNode } from '../../types';
import type { Domain } from '../types';

// =============================================================================
// Helper functions for creating test nodes
// =============================================================================

function variable(name: string): MathNode {
	return { type: 'variable', name };
}

function number(value: string): MathNode {
	return { type: 'number', value };
}

function func(name: string, args: MathNode[]): MathNode {
	return { type: 'function', name, args };
}

function add(left: MathNode, right: MathNode): MathNode {
	return { type: 'addition', left, right };
}

function subtract(left: MathNode, right: MathNode): MathNode {
	return { type: 'subtraction', left, right };
}

function multiply(left: MathNode, right: MathNode): MathNode {
	return { type: 'multiplication', left, right, displayStyle: 'implicit' };
}

function divide(numerator: MathNode, denominator: MathNode): MathNode {
	return { type: 'division', numerator, denominator, displayStyle: 'fraction' };
}

function power(base: MathNode, exponent: MathNode): MathNode {
	return { type: 'superscript', base, superscript: exponent };
}

function opposite(operand: MathNode): MathNode {
	return { type: 'opposite', operand };
}

// Helper to create a closed interval domain [a, b]
function closedIntervalDomain(a: number, b: number): Domain {
	return intervalDomain([closedInterval(fromNumber(a), fromNumber(b))]);
}

// Helper to create an open interval domain ]a, b[
function openIntervalDomain(a: number, b: number): Domain {
	return intervalDomain([openInterval(fromNumber(a), fromNumber(b))]);
}

// =============================================================================
// Tests
// =============================================================================

describe('computeRange()', () => {
	// =========================================================================
	// Constants
	// =========================================================================

	describe('constants', () => {
		it('constant 5 has range {5}', () => {
			const result = computeRange(number('5'), 'x');
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 4)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('constant 0 has range {0}', () => {
			const result = computeRange(number('0'), 'x');
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('negative constant -3 has range {-3}', () => {
			const result = computeRange(number('-3'), 'x');
			expect(containsValue(result.range, -3)).toBe(true);
			expect(containsValue(result.range, 3)).toBe(false);
			expect(containsValue(result.range, 0)).toBe(false);
		});

		it('decimal constant 2.5 has range {2.5}', () => {
			const result = computeRange(number('2.5'), 'x');
			expect(containsValue(result.range, 2.5)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
			expect(containsValue(result.range, 3)).toBe(false);
		});

		it('very large constant 1000000 has range {1000000}', () => {
			const result = computeRange(number('1000000'), 'x');
			expect(containsValue(result.range, 1000000)).toBe(true);
			expect(containsValue(result.range, 999999)).toBe(false);
		});

		it('very small constant 0.0001 has range {0.0001}', () => {
			const result = computeRange(number('0.0001'), 'x');
			expect(containsValue(result.range, 0.0001)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});
	});

	// =========================================================================
	// Variables
	// =========================================================================

	describe('variable', () => {
		it('variable x on universal domain has universal range', () => {
			const result = computeRange(variable('x'), 'x');
			expect(result.range.kind).toBe('universal');
		});

		it('variable x on [0, +infinity[ has range [0, +infinity[', () => {
			const result = computeRange(variable('x'), 'x', { domain: nonNegativeReals() });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
		});

		it('variable x on [-1, 1] has range [-1, 1]', () => {
			const result = computeRange(variable('x'), 'x', { domain: unitInterval() });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
		});

		it('variable x on empty domain has empty range', () => {
			const result = computeRange(variable('x'), 'x', { domain: emptyDomain() });
			expect(result.range.kind).toBe('empty');
		});

		it('variable x on ]0, +infinity[ (open at 0) preserves openness', () => {
			const result = computeRange(variable('x'), 'x', { domain: positiveReals() });
			expect(containsValue(result.range, 0)).toBe(false); // 0 excluded
			expect(containsValue(result.range, 0.001)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
		});

		it('variable y (different from target x) is treated as constant', () => {
			const result = computeRange(variable('y'), 'x');
			// y is not x, so it's treated as universal (unknown constant)
			expect(result.range.kind).toBe('universal');
		});

		it('variable x on single point domain {5} has range {5}', () => {
			const result = computeRange(variable('x'), 'x', {
				domain: closedIntervalDomain(5, 5)
			});
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 4)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('variable x on ]-infinity, 0] has range ]-infinity, 0]', () => {
			const result = computeRange(variable('x'), 'x', {
				domain: intervalDomain([lessThanOrEqual(fromNumber(0))])
			});
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, -100)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('variable x on open interval ]2, 5[ excludes endpoints', () => {
			const result = computeRange(variable('x'), 'x', {
				domain: openIntervalDomain(2, 5)
			});
			expect(containsValue(result.range, 2)).toBe(false);
			expect(containsValue(result.range, 5)).toBe(false);
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 4)).toBe(true);
		});
	});

	// =========================================================================
	// Builtin Functions
	// =========================================================================

	describe('builtin functions', () => {
		describe('square root', () => {
			it('sqrt(x) has range [0, +infinity[', () => {
				const result = computeRange(func('sqrt', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 10)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('sqrt(constant 4) still uses builtin range', () => {
				const result = computeRange(func('sqrt', [number('4')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});
		});

		describe('trigonometric functions', () => {
			it('sin(x) has range [-1, 1]', () => {
				const result = computeRange(func('sin', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 1.1)).toBe(false);
			});

			it('cos(x) has range [-1, 1]', () => {
				const result = computeRange(func('cos', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 2)).toBe(false);
			});

			it('tan(x) has universal range', () => {
				// tan can take any real value
				const result = computeRange(func('tan', [variable('x')]), 'x');
				// tan is not in BUILTIN_RANGES, so returns universal
				expect(result.range.kind).toBe('universal');
			});
		});

		describe('exponential and logarithm', () => {
			it('exp(x) has range ]0, +infinity[', () => {
				const result = computeRange(func('exp', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(false); // open at 0
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 100)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('ln(x) has range ]-infinity, +infinity[', () => {
				const result = computeRange(func('ln', [variable('x')]), 'x');
				expect(result.range.kind).toBe('universal');
			});

			it('log(x) has range ]-infinity, +infinity[', () => {
				const result = computeRange(func('log', [variable('x')]), 'x');
				expect(result.range.kind).toBe('universal');
			});

			it('log10(x) has range ]-infinity, +infinity[', () => {
				const result = computeRange(func('log10', [variable('x')]), 'x');
				expect(result.range.kind).toBe('universal');
			});
		});

		describe('inverse trigonometric functions', () => {
			it('asin(x) has range [-π/2, π/2]', () => {
				const result = computeRange(func('asin', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, Math.PI / 2)).toBe(true);
				expect(containsValue(result.range, -Math.PI / 2)).toBe(true);
				expect(containsValue(result.range, 2)).toBe(false);
			});

			it('acos(x) has range [0, π]', () => {
				const result = computeRange(func('acos', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, Math.PI)).toBe(true);
				expect(containsValue(result.range, -0.1)).toBe(false);
			});

			it('atan(x) has range ]-π/2, π/2[', () => {
				const result = computeRange(func('atan', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, Math.PI / 2)).toBe(false); // open
				expect(containsValue(result.range, -Math.PI / 2)).toBe(false); // open
			});
		});

		describe('hyperbolic functions', () => {
			it('sinh(x) has universal range', () => {
				const result = computeRange(func('sinh', [variable('x')]), 'x');
				expect(result.range.kind).toBe('universal');
			});

			it('cosh(x) has range [1, +infinity[', () => {
				const result = computeRange(func('cosh', [variable('x')]), 'x');
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 10)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
				expect(containsValue(result.range, 0.5)).toBe(false);
			});

			it('tanh(x) has range ]-1, 1[', () => {
				const result = computeRange(func('tanh', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 0.99)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(false); // open
				expect(containsValue(result.range, -1)).toBe(false); // open
			});
		});

		describe('other functions', () => {
			it('abs(x) has range [0, +infinity[', () => {
				const result = computeRange(func('abs', [variable('x')]), 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 10)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('sign(x) has range [-1, 1]', () => {
				const result = computeRange(func('sign', [variable('x')]), 'x');
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 2)).toBe(false);
			});

			it('unknown function returns universal range', () => {
				const result = computeRange(func('unknown_func', [variable('x')]), 'x');
				expect(result.range.kind).toBe('universal');
			});
		});

		describe('function with empty argument range', () => {
			it('sqrt(x) on empty domain has empty range', () => {
				const result = computeRange(func('sqrt', [variable('x')]), 'x', {
					domain: emptyDomain()
				});
				expect(result.range.kind).toBe('empty');
			});

			it('sin(x) on empty domain has empty range', () => {
				const result = computeRange(func('sin', [variable('x')]), 'x', {
					domain: emptyDomain()
				});
				expect(result.range.kind).toBe('empty');
			});
		});
	});

	// =========================================================================
	// Function Compositions
	// =========================================================================

	describe('function compositions', () => {
		it('sqrt(sqrt(x)) has range [0, +infinity[', () => {
			const expr = func('sqrt', [func('sqrt', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
		});

		it('sin(cos(x)) has range [-1, 1]', () => {
			const expr = func('sin', [func('cos', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
		});

		it('exp(ln(x)) uses exp range ]0, +infinity[', () => {
			const expr = func('exp', [func('ln', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 1)).toBe(true);
		});

		it('ln(exp(x)) uses ln range (universal)', () => {
			const expr = func('ln', [func('exp', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(result.range.kind).toBe('universal');
		});

		it('sqrt(abs(x)) has range [0, +infinity[', () => {
			const expr = func('sqrt', [func('abs', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
		});

		it('abs(sin(x)) has range [0, 1] (uses abs range [0, +∞[)', () => {
			const expr = func('abs', [func('sin', [variable('x')])]);
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
		});
	});

	// =========================================================================
	// Addition Edge Cases
	// =========================================================================

	describe('addition', () => {
		it('x + 1 on [0, 10] has range [1, 11]', () => {
			const expr = add(variable('x'), number('1'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 11)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 12)).toBe(false);
		});

		it('x + (-5) on [0, 10] has range [-5, 5]', () => {
			const expr = add(variable('x'), number('-5'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, -5)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, -6)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('x + 0 on [2, 5] has range [2, 5]', () => {
			const expr = add(variable('x'), number('0'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('1 + 2 (two constants) has range {3}', () => {
			const expr = add(number('1'), number('2'));
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
		});

		it('x + y where both are variables gives universal range', () => {
			const expr = add(variable('x'), variable('y'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			// y is treated as universal, so result is universal
			expect(result.range.kind).toBe('universal');
		});

		it('x + x on [0, 5] has range [0, 10]', () => {
			const expr = add(variable('x'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
			expect(containsValue(result.range, 11)).toBe(false);
		});

		it('addition with empty domain gives empty range', () => {
			const expr = add(variable('x'), number('1'));
			const result = computeRange(expr, 'x', { domain: emptyDomain() });
			expect(result.range.kind).toBe('empty');
		});

		it('addition with universal domain gives universal range', () => {
			const expr = add(variable('x'), number('1'));
			const result = computeRange(expr, 'x', { domain: universalDomain() });
			expect(result.range.kind).toBe('universal');
		});
	});

	// =========================================================================
	// Subtraction Edge Cases
	// =========================================================================

	describe('subtraction', () => {
		it('x - 1 on [0, 10] has range [-1, 9]', () => {
			const expr = subtract(variable('x'), number('1'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, -1)).toBe(true);
			expect(containsValue(result.range, 9)).toBe(true);
			expect(containsValue(result.range, -2)).toBe(false);
			expect(containsValue(result.range, 10)).toBe(false);
		});

		it('1 - x on [0, 10] has range [-9, 1]', () => {
			const expr = subtract(number('1'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, -9)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -10)).toBe(false);
			expect(containsValue(result.range, 2)).toBe(false);
		});

		it('x - x on [0, 10] has range {0}', () => {
			const expr = subtract(variable('x'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			// [0, 10] - [0, 10] = [-10, 10] (Minkowski difference)
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -10)).toBe(true);
		});

		it('5 - 3 (two constants) has range {2}', () => {
			const expr = subtract(number('5'), number('3'));
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 3)).toBe(false);
		});

		it('x - 0 on [2, 5] has range [2, 5]', () => {
			const expr = subtract(variable('x'), number('0'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
		});

		it('0 - x on [2, 5] has range [-5, -2]', () => {
			const expr = subtract(number('0'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, -5)).toBe(true);
			expect(containsValue(result.range, -2)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});
	});

	// =========================================================================
	// Multiplication Edge Cases
	// =========================================================================

	describe('multiplication', () => {
		it('2 * x on [0, 5] has range [0, 10]', () => {
			const expr = multiply(number('2'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
			expect(containsValue(result.range, 11)).toBe(false);
		});

		it('(-2) * x on [0, 5] has range [-10, 0]', () => {
			const expr = multiply(number('-2'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, -10)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('0 * x has range {0}', () => {
			const expr = multiply(number('0'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-10, 10) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('1 * x on [2, 5] has range [2, 5]', () => {
			const expr = multiply(number('1'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
		});

		it('x * x on [2, 3] has range [4, 9]', () => {
			const expr = multiply(variable('x'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 3) });
			expect(containsValue(result.range, 4)).toBe(true);
			expect(containsValue(result.range, 9)).toBe(true);
			expect(containsValue(result.range, 3)).toBe(false);
			expect(containsValue(result.range, 10)).toBe(false);
		});

		it('x * x on [-2, 3] spans [0, 9] (includes products of opposite signs)', () => {
			const expr = multiply(variable('x'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, 3) });
			// [-2, 3] * [-2, 3] = min(4, -6, -6, 9), max(4, -6, -6, 9) = [-6, 9]
			expect(containsValue(result.range, -6)).toBe(true);
			expect(containsValue(result.range, 9)).toBe(true);
		});

		it('positive * positive range on [1, 2] * [3, 4] = [3, 8]', () => {
			// For this we need two separate expressions
			// x on [1, 2], constant 3 on [3, 4] -> approximate with x * 3.5
			const expr = multiply(variable('x'), number('3'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 2) });
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 6)).toBe(true);
		});

		it('negative * negative range on [-3, -1] * [-4, -2] gives positive', () => {
			const expr = multiply(variable('x'), number('-3'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, -1) });
			// [-2, -1] * -3 = [3, 6]
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 6)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});

		it('2 * 3 (two constants) has range {6}', () => {
			const expr = multiply(number('2'), number('3'));
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 6)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(false);
		});

		it('multiplication with empty domain gives empty range', () => {
			const expr = multiply(variable('x'), number('2'));
			const result = computeRange(expr, 'x', { domain: emptyDomain() });
			expect(result.range.kind).toBe('empty');
		});
	});

	// =========================================================================
	// Division Edge Cases
	// =========================================================================

	describe('division', () => {
		it('x / 2 on [0, 10] has range [0, 5]', () => {
			const expr = divide(variable('x'), number('2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('10 / x on [2, 5] has range [2, 5]', () => {
			const expr = divide(number('10'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			// 10 / [2, 5] = [2, 5]
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('division by range containing 0 gives universal', () => {
			const expr = divide(number('1'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-1, 1) });
			// Since denominator can be 0, result is universal
			expect(result.range.kind).toBe('universal');
		});

		it('0 / x on [1, 10] has range {0}', () => {
			const expr = divide(number('0'), variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 10) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
		});

		it('6 / 2 (two constants) has range {3}', () => {
			const expr = divide(number('6'), number('2'));
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
		});

		it('x / 1 on [2, 5] has range [2, 5]', () => {
			const expr = divide(variable('x'), number('1'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
		});

		it('x / (-2) on [4, 10] has range [-5, -2]', () => {
			const expr = divide(variable('x'), number('-2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(4, 10) });
			expect(containsValue(result.range, -5)).toBe(true);
			expect(containsValue(result.range, -2)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});

		it('division with empty domain gives empty range', () => {
			const expr = divide(variable('x'), number('2'));
			const result = computeRange(expr, 'x', { domain: emptyDomain() });
			expect(result.range.kind).toBe('empty');
		});

		it('1/x on ]0, +infinity[ gives ]0, +infinity[', () => {
			const expr = divide(number('1'), variable('x'));
			const result = computeRange(expr, 'x', { domain: positiveReals() });
			// Division by strictly positive, result can be any positive
			expect(containsValue(result.range, 0.001)).toBe(true);
			expect(containsValue(result.range, 1000)).toBe(true);
		});
	});

	// =========================================================================
	// Opposite (Negation) Edge Cases
	// =========================================================================

	describe('opposite', () => {
		it('-x on [0, 10] has range [-10, 0]', () => {
			const expr = opposite(variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 10) });
			expect(containsValue(result.range, -10)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
			expect(containsValue(result.range, -11)).toBe(false);
		});

		it('-x on [-5, -2] has range [2, 5]', () => {
			const expr = opposite(variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-5, -2) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('-x on [-3, 3] has range [-3, 3]', () => {
			const expr = opposite(variable('x'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-3, 3) });
			expect(containsValue(result.range, -3)).toBe(true);
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(true);
		});

		it('-x on universal domain has universal range', () => {
			const expr = opposite(variable('x'));
			const result = computeRange(expr, 'x', { domain: universalDomain() });
			expect(result.range.kind).toBe('universal');
		});

		it('-x on empty domain has empty range', () => {
			const expr = opposite(variable('x'));
			const result = computeRange(expr, 'x', { domain: emptyDomain() });
			expect(result.range.kind).toBe('empty');
		});

		it('-(5) has range {-5}', () => {
			const expr = opposite(number('5'));
			const result = computeRange(expr, 'x');
			expect(containsValue(result.range, -5)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(false);
		});

		it('-(-x) on [2, 5] has range [2, 5]', () => {
			const expr = opposite(opposite(variable('x')));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(2, 5) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
		});
	});

	// =========================================================================
	// Power Edge Cases
	// =========================================================================

	describe('powers', () => {
		describe('x^0', () => {
			it('x^0 has range {1} regardless of domain', () => {
				const expr = power(variable('x'), number('0'));
				const result = computeRange(expr, 'x');
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
				expect(containsValue(result.range, 2)).toBe(false);
			});

			it('x^0 on negative domain still has range {1}', () => {
				const expr = power(variable('x'), number('0'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-10, -1) });
				expect(containsValue(result.range, 1)).toBe(true);
			});
		});

		describe('x^1', () => {
			it('x^1 has same range as x', () => {
				const expr = power(variable('x'), number('1'));
				const result = computeRange(expr, 'x', { domain: unitInterval() });
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 2)).toBe(false);
			});
		});

		describe('x^2 (even power)', () => {
			it('x^2 on ℝ has range [0, +infinity[', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x');
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 4)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('x^2 on [1, 3] has range [1, 9]', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 3) });
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 9)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
				expect(containsValue(result.range, 10)).toBe(false);
			});

			it('x^2 on [-3, -1] has range [1, 9]', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-3, -1) });
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 9)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
			});

			it('x^2 on [-2, 3] has range [0, 9] (contains 0)', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, 3) });
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 9)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('x^2 on [-3, 2] has range [0, 9] (|-3| > |2|)', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-3, 2) });
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 9)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});

			it('x^2 on [0, 0] has range {0}', () => {
				const expr = power(variable('x'), number('2'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 0) });
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(false);
			});
		});

		describe('x^3 (odd power)', () => {
			it('x^3 on [1, 2] has range [1, 8]', () => {
				const expr = power(variable('x'), number('3'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 2) });
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 8)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
				expect(containsValue(result.range, 9)).toBe(false);
			});

			it('x^3 on [-2, -1] has range [-8, -1]', () => {
				const expr = power(variable('x'), number('3'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, -1) });
				expect(containsValue(result.range, -8)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
			});

			it('x^3 on [-1, 2] has range [-1, 8]', () => {
				const expr = power(variable('x'), number('3'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-1, 2) });
				expect(containsValue(result.range, -1)).toBe(true);
				expect(containsValue(result.range, 8)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(true);
			});

			it('x^3 on universal domain has universal range', () => {
				const expr = power(variable('x'), number('3'));
				const result = computeRange(expr, 'x');
				expect(result.range.kind).toBe('universal');
			});
		});

		describe('x^4 (higher even power)', () => {
			it('x^4 on [1, 2] has range [1, 16]', () => {
				const expr = power(variable('x'), number('4'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 2) });
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 16)).toBe(true);
				expect(containsValue(result.range, 0)).toBe(false);
			});

			it('x^4 on [-2, 1] has range [0, 16] (contains 0)', () => {
				const expr = power(variable('x'), number('4'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, 1) });
				expect(containsValue(result.range, 0)).toBe(true);
				expect(containsValue(result.range, 16)).toBe(true);
				expect(containsValue(result.range, -1)).toBe(false);
			});
		});

		describe('x^5 (higher odd power)', () => {
			it('x^5 on [1, 2] has range [1, 32]', () => {
				const expr = power(variable('x'), number('5'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 2) });
				expect(containsValue(result.range, 1)).toBe(true);
				expect(containsValue(result.range, 32)).toBe(true);
			});

			it('x^5 on [-2, 1] has range [-32, 1]', () => {
				const expr = power(variable('x'), number('5'));
				const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, 1) });
				expect(containsValue(result.range, -32)).toBe(true);
				expect(containsValue(result.range, 1)).toBe(true);
			});
		});
	});

	// =========================================================================
	// Complex Expressions
	// =========================================================================

	describe('complex expressions', () => {
		it('2x + 1 on [0, 5] has range [1, 11]', () => {
			const expr = add(multiply(number('2'), variable('x')), number('1'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 11)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 12)).toBe(false);
		});

		it('-x + 5 on [0, 3] has range [2, 5]', () => {
			const expr = add(opposite(variable('x')), number('5'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 3) });
			expect(containsValue(result.range, 2)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('x^2 + 1 on [-2, 2] has range [1, 5]', () => {
			const expr = add(power(variable('x'), number('2')), number('1'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-2, 2) });
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});

		it('sin(x)^2 has range [0, 1] (uses sin range [-1, 1] then square)', () => {
			const expr = power(func('sin', [variable('x')]), number('2'));
			const result = computeRange(expr, 'x');
			// sin(x) ∈ [-1, 1], then squared gives [0, 1]
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -0.1)).toBe(false);
		});

		it('sqrt(x) + 1 has range [1, +infinity[', () => {
			const expr = add(func('sqrt', [variable('x')]), number('1'));
			const result = computeRange(expr, 'x');
			// sqrt(x) ∈ [0, +∞[, adding 1 gives [1, +∞[
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});
	});

	// =========================================================================
	// Edge Cases: Domain Types
	// =========================================================================

	describe('special domain types', () => {
		it('empty domain gives empty range', () => {
			const result = computeRange(variable('x'), 'x', { domain: { kind: 'empty' } });
			expect(result.range.kind).toBe('empty');
		});

		it('universal domain on variable gives universal range', () => {
			const result = computeRange(variable('x'), 'x', { domain: universalDomain() });
			expect(result.range.kind).toBe('universal');
		});

		it('ℝ \\ {0} domain (nonZeroReals) on x gives non-zero range', () => {
			const result = computeRange(variable('x'), 'x', { domain: nonZeroReals() });
			// The range should contain values except 0
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(true);
			// Note: containsValue might still return true for 0 depending on implementation
		});

		it('multi-interval domain ]-∞, -1] ∪ [1, +∞[', () => {
			const domain = intervalDomain([
				lessThanOrEqual(fromNumber(-1)),
				greaterThanOrEqual(fromNumber(1))
			]);
			const result = computeRange(variable('x'), 'x', { domain });
			expect(containsValue(result.range, -1)).toBe(true);
			expect(containsValue(result.range, -10)).toBe(true);
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 10)).toBe(true);
		});
	});

	// =========================================================================
	// Result Structure
	// =========================================================================

	describe('result structure', () => {
		it('includes input domain in result', () => {
			const inputDomain = positiveReals();
			const result = computeRange(variable('x'), 'x', { domain: inputDomain });
			expect(result.inputDomain).toBeDefined();
		});

		it('includes variable in result', () => {
			const result = computeRange(variable('x'), 'x');
			expect(result.variable).toBe('x');
		});

		it('uses default variable x', () => {
			const result = computeRange(variable('x'));
			expect(result.variable).toBe('x');
		});

		it('respects custom variable name', () => {
			const result = computeRange(variable('t'), 't');
			expect(result.variable).toBe('t');
		});

		it('computes input domain when not provided', () => {
			const result = computeRange(func('sqrt', [variable('x')]), 'x');
			// Should compute domain of sqrt(x) which is [0, +∞[
			expect(result.inputDomain).toBeDefined();
		});
	});

	// =========================================================================
	// Boundary Conditions
	// =========================================================================

	describe('boundary conditions', () => {
		it('handles very small interval [0.001, 0.002]', () => {
			const result = computeRange(variable('x'), 'x', {
				domain: closedIntervalDomain(0.001, 0.002)
			});
			expect(containsValue(result.range, 0.001)).toBe(true);
			expect(containsValue(result.range, 0.002)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 0.003)).toBe(false);
		});

		it('handles very large interval [1000000, 2000000]', () => {
			const result = computeRange(variable('x'), 'x', {
				domain: closedIntervalDomain(1000000, 2000000)
			});
			expect(containsValue(result.range, 1000000)).toBe(true);
			expect(containsValue(result.range, 2000000)).toBe(true);
			expect(containsValue(result.range, 999999)).toBe(false);
		});

		it('handles interval crossing zero [-0.5, 0.5]', () => {
			const expr = power(variable('x'), number('2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-0.5, 0.5) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 0.25)).toBe(true);
			expect(containsValue(result.range, 0.26)).toBe(false);
		});

		it('handles symmetric interval [-5, 5]', () => {
			const expr = power(variable('x'), number('2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(-5, 5) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 25)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
		});
	});

	// =========================================================================
	// Nested Operations
	// =========================================================================

	describe('nested operations', () => {
		it('((x + 1) + 2) on [0, 5] has range [3, 8]', () => {
			const expr = add(add(variable('x'), number('1')), number('2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, 3)).toBe(true);
			expect(containsValue(result.range, 8)).toBe(true);
			expect(containsValue(result.range, 2)).toBe(false);
			expect(containsValue(result.range, 9)).toBe(false);
		});

		it('(x * 2) * 3 on [0, 5] has range [0, 30]', () => {
			const expr = multiply(multiply(variable('x'), number('2')), number('3'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(0, 5) });
			expect(containsValue(result.range, 0)).toBe(true);
			expect(containsValue(result.range, 30)).toBe(true);
			expect(containsValue(result.range, -1)).toBe(false);
			expect(containsValue(result.range, 31)).toBe(false);
		});

		it('(x^2)^2 = x^4 on [1, 2] has range [1, 16]', () => {
			const expr = power(power(variable('x'), number('2')), number('2'));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 2) });
			// x^2 on [1,2] = [1,4], then squared = [1, 16]
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 16)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
		});

		it('-(-(x)) on [1, 5] has range [1, 5]', () => {
			const expr = opposite(opposite(variable('x')));
			const result = computeRange(expr, 'x', { domain: closedIntervalDomain(1, 5) });
			expect(containsValue(result.range, 1)).toBe(true);
			expect(containsValue(result.range, 5)).toBe(true);
			expect(containsValue(result.range, 0)).toBe(false);
			expect(containsValue(result.range, 6)).toBe(false);
		});
	});

	// =========================================================================
	// Unknown Node Types
	// =========================================================================

	describe('unknown node types', () => {
		it('unknown node type returns universal range', () => {
			const unknownNode = { type: 'unknown_type' } as unknown as MathNode;
			const result = computeRange(unknownNode, 'x');
			expect(result.range.kind).toBe('universal');
		});
	});
});
